-- Documentos comunes a cualquier ficha (fase 1 de docs/plan-desarrollo.md). Una sola tabla con su entidad
-- (entity_type + entity_id), tipo (tabla maestra document_type), estado de validación, caducidad y visibilidad en
-- el portal. Los ficheros van al bucket privado `documents` de Supabase Storage con la ruta {tenant_id}/...; la API
-- firma las URL de subida y descarga con la service_role (la web nunca la tiene).
--
-- Borrado: definitivo (fila y fichero), dejando rastro en el historial (activity_log). Por eso no hay deleted_at.
-- Los tipos de documento con retention_required (contratos, CPD, nóminas...) no se pueden borrar.
--
-- Entidades: de momento las fichas que existen (client, client_center). Las siguientes (offer, request, candidate,
-- file...) se añaden con su tabla ampliando el check de entity_type y las funciones private.document_entity_*.

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  entity_type varchar(30) not null check (entity_type in ('client', 'client_center')),
  entity_id uuid not null,
  type_id uuid not null,
  name varchar(250) not null,
  -- Ruta del objeto dentro del bucket: {tenant_id}/{entity_type}/{entity_id}/{uuid}.{ext}
  storage_path text not null,
  mime_type varchar(100) not null,
  size_bytes bigint not null check (size_bytes > 0),
  status varchar(20) not null default 'pending' check (status in ('pending', 'validated', 'draft')),
  expires_on date,
  visible_in_portal boolean not null default false,
  notes text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  validated_by uuid references public.profiles (id) on delete set null,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (storage_path),
  foreign key (tenant_id, type_id) references public.catalog_items (tenant_id, id),
  check (storage_path like tenant_id::text || '/' || entity_type || '/' || entity_id::text || '/%'),
  check ((status = 'validated') = (validated_at is not null))
);

create index documents_tenant_entity_idx on public.documents (tenant_id, entity_type, entity_id);
create index documents_tenant_type_idx on public.documents (tenant_id, type_id);
create index documents_tenant_expires_idx on public.documents (tenant_id, expires_on) where expires_on is not null;

comment on table public.documents is 'Documentos de cualquier ficha; el fichero está en Storage (bucket documents)';
comment on column public.documents.status is 'pending: pendiente de validar (al subir); validated; draft (borrador)';

-- ---------------------------------------------------------------------------
-- Reglas
-- ---------------------------------------------------------------------------
-- ¿Existe la entidad en la ETT? (para entity_id, que no puede tener FK).
create or replace function private.document_entity_exists(p_tenant_id uuid, p_entity_type text, p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_entity_type
    when 'client' then exists (
      select 1 from public.clients where tenant_id = p_tenant_id and id = p_entity_id and deleted_at is null)
    when 'client_center' then exists (
      select 1 from public.client_centers where tenant_id = p_tenant_id and id = p_entity_id and deleted_at is null)
    else false
  end
$$;

-- ¿Puede el usuario escribir en esa entidad? Lo mismo que para editar la ficha: clients.manage y acceso a la
-- sucursal del cliente o del centro.
create or replace function private.document_entity_writable(p_tenant_id uuid, p_entity_type text, p_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_superadmin() or (
    p_tenant_id = private.current_tenant_id()
    and case p_entity_type
      when 'client' then private.has_permission('clients.manage') and exists (
        select 1 from public.clients c
        where c.tenant_id = p_tenant_id and c.id = p_entity_id and private.can_access_branch(c.branch_id))
      when 'client_center' then private.has_permission('clients.manage') and exists (
        select 1 from public.client_centers c
        where c.tenant_id = p_tenant_id and c.id = p_entity_id and private.can_access_branch(c.branch_id))
      else false
    end
  )
$$;

-- ¿Ve el usuario la entidad? SECURITY INVOKER: la consulta pasa por las RLS de la tabla de la entidad.
create or replace function private.document_entity_visible(p_entity_type text, p_entity_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case p_entity_type
    when 'client' then exists (select 1 from public.clients where id = p_entity_id)
    when 'client_center' then exists (select 1 from public.client_centers where id = p_entity_id)
    else false
  end
$$;

grant execute on function
  private.document_entity_exists(uuid, text, uuid),
  private.document_entity_writable(uuid, text, uuid),
  private.document_entity_visible(text, uuid)
to authenticated, service_role;

create or replace function private.documents_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not private.document_entity_exists(new.tenant_id, new.entity_type, new.entity_id) then
      raise exception 'La ficha del documento no existe en la ETT' using errcode = '23503';
    end if;
    new.uploaded_by := (select p.id from public.profiles p where p.id = auth.uid());
    new.uploaded_at := now();
  else
    -- La entidad, el fichero y quién lo subió no cambian: para otro fichero, otro documento.
    if (new.tenant_id, new.entity_type, new.entity_id, new.storage_path, new.mime_type, new.size_bytes, new.uploaded_by, new.uploaded_at)
       is distinct from
       (old.tenant_id, old.entity_type, old.entity_id, old.storage_path, old.mime_type, old.size_bytes, old.uploaded_by, old.uploaded_at) then
      raise exception 'La ficha, el fichero y quién lo subió no se pueden cambiar' using errcode = 'TN422';
    end if;
    -- Un documento de conservación obligatoria no puede pasar a un tipo que no la exige (sería borrable).
    if new.type_id <> old.type_id
       and (select retention_required from public.catalog_items where tenant_id = old.tenant_id and id = old.type_id)
       and not (select retention_required from public.catalog_items where tenant_id = new.tenant_id and id = new.type_id) then
      raise exception 'Este documento es de conservación obligatoria: no puede pasar a un tipo que no lo es'
        using errcode = 'TN409';
    end if;
  end if;

  if not exists (
    select 1 from public.catalog_items
    where tenant_id = new.tenant_id and id = new.type_id and catalog = 'document_type'
  ) then
    raise exception 'El tipo tiene que ser un tipo de documento' using errcode = '23503';
  end if;

  -- Quién valida y cuándo: lo pone la base de datos, no el cliente.
  if new.status = 'validated' and (tg_op = 'INSERT' or old.status <> 'validated') then
    new.validated_by := (select p.id from public.profiles p where p.id = auth.uid());
    new.validated_at := now();
  elsif new.status <> 'validated' then
    new.validated_by := null;
    new.validated_at := null;
  elsif tg_op = 'UPDATE' then
    new.validated_by := old.validated_by;
    new.validated_at := old.validated_at;
  end if;
  return new;
end;
$$;

create trigger trg_documents_before_write before insert or update on public.documents
  for each row execute function private.documents_before_write();

-- Conservación obligatoria: estos documentos no se borran. Al borrar una ETT entera (cascada) sí.
create or replace function private.documents_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.tenants t where t.id = old.tenant_id)
     and (select retention_required from public.catalog_items where tenant_id = old.tenant_id and id = old.type_id) then
    raise exception 'Este tipo de documento es de conservación obligatoria: no se puede eliminar'
      using errcode = 'TN409';
  end if;
  return old;
end;
$$;

create trigger trg_documents_before_delete before delete on public.documents
  for each row execute function private.documents_before_delete();

create trigger trg_documents_updated_at before update on public.documents
  for each row execute function private.touch_updated_at();

create trigger trg_documents_activity after insert or update or delete on public.documents
  for each row execute function private.log_activity('document', 'name', '', '');

-- ---------------------------------------------------------------------------
-- Privilegios y RLS: leer si se ve la entidad; escribir si se puede editar la entidad.
-- ---------------------------------------------------------------------------
revoke all on table public.documents from anon;
revoke truncate, references, trigger on table public.documents from authenticated;

alter table public.documents enable row level security;

create policy documents_select on public.documents for select to authenticated
using (
  ((select private.is_superadmin()) or tenant_id = (select private.current_tenant_id()))
  and private.document_entity_visible(entity_type, entity_id)
);
create policy documents_insert on public.documents for insert to authenticated
with check (private.document_entity_writable(tenant_id, entity_type, entity_id));
create policy documents_update on public.documents for update to authenticated
using (private.document_entity_writable(tenant_id, entity_type, entity_id))
with check (private.document_entity_writable(tenant_id, entity_type, entity_id));
create policy documents_delete on public.documents for delete to authenticated
using (private.document_entity_writable(tenant_id, entity_type, entity_id));

-- ---------------------------------------------------------------------------
-- Bucket privado de Storage. El esquema storage lo crea el servicio de Storage al arrancar: en local, db/local
-- lo levanta antes de migrar; en el NAS ya está.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise exception 'Falta Supabase Storage (storage.buckets). Levántalo antes de migrar (ver db/README.md).';
  end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('documents', 'documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
  on conflict (id) do update
    set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
end;
$$;
