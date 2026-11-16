-- Historial de actividad común a todas las fichas (fase 1 de docs/plan-desarrollo.md: «dejar rastro de quién y
-- cuándo»). Lo rellenan triggers, nunca la API ni el cliente: authenticated solo puede leerlo.
--
--   entity_type / entity_id   lo que cambió (un centro, un contacto, un documento...)
--   parent_type / parent_id   la ficha a la que pertenece (el cliente de ese centro), para ver en la ficha del
--                             cliente todo lo suyo. NULL si la entidad es una ficha principal.
--
-- Se lee con la misma visibilidad que la entidad (private.activity_visible): si no puedes ver el cliente, no ves su
-- historial; la facturación, solo con clients.billing.manage. Los hijos (centros, contactos, documentos) se ven si
-- se ve su ficha, así que el rastro de algo borrado de verdad sigue visible.
--
-- No se guardan valores de datos especialmente sensibles (IBAN, BIC, DNI/NIE): solo que han cambiado. En el alta
-- y la baja no se copia la fila: solo el resumen.

create table public.activity_log (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  entity_type varchar(40) not null,
  entity_id uuid not null,
  parent_type varchar(40),
  parent_id uuid,
  action varchar(20) not null check (action in ('create', 'update', 'delete')),
  -- Quién (NULL si fue un proceso sin usuario, p. ej. una migración).
  actor_user_id uuid references public.profiles (id) on delete set null,
  occurred_at timestamptz not null default now(),
  summary text not null,
  -- Solo en 'update': { "columna": { "old": ..., "new": ... } } o { "columna": { "masked": true } }.
  changes jsonb not null default '{}'::jsonb,
  unique (tenant_id, id),
  check ((parent_type is null) = (parent_id is null))
);

create index activity_log_entity_idx on public.activity_log (tenant_id, entity_type, entity_id, occurred_at desc);
create index activity_log_parent_idx on public.activity_log (tenant_id, parent_type, parent_id, occurred_at desc)
  where parent_id is not null;

comment on table public.activity_log is 'Historial de actividad (quién, cuándo, qué). Solo lo escriben triggers.';

-- ---------------------------------------------------------------------------
-- Trigger genérico. Argumentos: tipo de entidad, columna con el nombre que se muestra (o ''), tipo de la ficha
-- padre y columna con su id (o '' si no tiene).
-- ---------------------------------------------------------------------------
create or replace function private.activity_label(p_entity_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_entity_type
    when 'client' then 'cliente'
    when 'client_center' then 'centro de trabajo'
    when 'client_contact' then 'contacto'
    when 'client_billing' then 'facturación'
    when 'document' then 'documento'
    else p_entity_type
  end
$$;

-- Columnas cuyo valor no se copia al historial.
create or replace function private.activity_masked_columns()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['iban', 'swift_bic', 'document_number', 'tax_id']
$$;

-- Columnas que no cuentan como cambio.
create or replace function private.activity_ignored_columns()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['id', 'tenant_id', 'created_at', 'updated_at']
$$;

create or replace function private.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity_type text := tg_argv[0];
  v_label_column text := nullif(tg_argv[1], '');
  v_parent_type text := nullif(tg_argv[2], '');
  v_parent_column text := nullif(tg_argv[3], '');
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_action text;
  v_changes jsonb := '{}'::jsonb;
  v_parent_id uuid;
  v_label text;
  v_summary text;
begin
  -- Al borrar una ETT entera (cascada) no queda nada a lo que apuntar.
  if tg_op = 'DELETE' and not exists (select 1 from public.tenants t where t.id = (v_row ->> 'tenant_id')::uuid) then
    return null;
  end if;

  if tg_op = 'INSERT' then
    v_action := 'create';
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
  elsif v_old ? 'deleted_at' and v_old ->> 'deleted_at' is null and v_new ->> 'deleted_at' is not null then
    -- Baja lógica.
    v_action := 'delete';
  else
    v_action := 'update';
    select coalesce(jsonb_object_agg(
             n.key,
             case when n.key = any (private.activity_masked_columns())
                  then jsonb_build_object('masked', true)
                  else jsonb_build_object('old', o.value, 'new', n.value) end),
           '{}'::jsonb)
      into v_changes
    from jsonb_each(v_new) n
    join jsonb_each(v_old) o using (key)
    where n.value is distinct from o.value
      and n.key <> all (private.activity_ignored_columns());
    if v_changes = '{}'::jsonb then
      return null;
    end if;
  end if;

  -- Ficha padre. Los documentos cuelgan de su entidad; si es un centro, de su cliente.
  if v_entity_type = 'document' then
    if v_row ->> 'entity_type' = 'client_center' then
      v_parent_type := 'client';
      select c.client_id into v_parent_id
      from public.client_centers c
      where c.tenant_id = (v_row ->> 'tenant_id')::uuid and c.id = (v_row ->> 'entity_id')::uuid;
    else
      v_parent_type := v_row ->> 'entity_type';
      v_parent_id := (v_row ->> 'entity_id')::uuid;
    end if;
  elsif v_parent_column is not null then
    v_parent_id := (v_row ->> v_parent_column)::uuid;
  end if;
  if v_parent_id is null then
    v_parent_type := null;
  end if;

  v_label := case when v_label_column is not null then v_row ->> v_label_column end;
  v_summary := case
    when v_entity_type = 'document' and v_action = 'update' and v_changes ? 'status'
         and v_new ->> 'status' = 'validated' then 'Validación de documento'
    when v_action = 'create' then 'Alta de ' || private.activity_label(v_entity_type)
    when v_action = 'update' then 'Cambios en ' || private.activity_label(v_entity_type)
    when tg_op = 'DELETE' then 'Eliminación de ' || private.activity_label(v_entity_type)
    else 'Baja de ' || private.activity_label(v_entity_type)
  end || coalesce(' «' || v_label || '»', '');

  insert into public.activity_log (tenant_id, entity_type, entity_id, parent_type, parent_id, action, actor_user_id, summary, changes)
  values (
    (v_row ->> 'tenant_id')::uuid,
    v_entity_type,
    (v_row ->> 'id')::uuid,
    v_parent_type,
    v_parent_id,
    v_action,
    (select p.id from public.profiles p where p.id = auth.uid()),
    v_summary,
    v_changes
  );
  return null;
end;
$$;

create trigger trg_clients_activity after insert or update or delete on public.clients
  for each row execute function private.log_activity('client', 'legal_name', '', '');
create trigger trg_client_centers_activity after insert or update or delete on public.client_centers
  for each row execute function private.log_activity('client_center', 'name', 'client', 'client_id');
create trigger trg_client_contacts_activity after insert or update or delete on public.client_contacts
  for each row execute function private.log_activity('client_contact', 'name', 'client', 'client_id');
create trigger trg_client_billing_profiles_activity after insert or update or delete on public.client_billing_profiles
  for each row execute function private.log_activity('client_billing', '', 'client', 'client_id');

-- ---------------------------------------------------------------------------
-- Visibilidad: la de la entidad. SECURITY INVOKER a propósito: consulta las tablas con las RLS de quien lee.
-- ---------------------------------------------------------------------------
create or replace function private.activity_visible(p_entity_type text, p_entity_id uuid, p_parent_type text, p_parent_id uuid)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
begin
  return case p_entity_type
    when 'client' then exists (select 1 from public.clients c where c.id = p_entity_id)
    when 'client_billing' then
      (private.is_superadmin() or private.has_permission('clients.billing.manage'))
      and private.activity_visible(p_parent_type, p_parent_id, null, null)
    when 'client_center' then private.activity_visible(p_parent_type, p_parent_id, null, null)
    when 'client_contact' then private.activity_visible(p_parent_type, p_parent_id, null, null)
    when 'document' then private.activity_visible(p_parent_type, p_parent_id, null, null)
    else false
  end;
end;
$$;

grant execute on function private.activity_visible(text, uuid, text, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privilegios y RLS: solo lectura.
-- ---------------------------------------------------------------------------
revoke all on table public.activity_log from anon;
revoke insert, update, delete, truncate, references, trigger on table public.activity_log from authenticated;

alter table public.activity_log enable row level security;

create policy activity_log_select on public.activity_log for select to authenticated
using (
  ((select private.is_superadmin()) or tenant_id = (select private.current_tenant_id()))
  and private.activity_visible(entity_type, entity_id, parent_type, parent_id)
);
