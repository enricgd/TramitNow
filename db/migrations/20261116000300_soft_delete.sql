-- Fase 2, decisión 3 de Enric: «eliminar» es una baja lógica recuperable (deleted_at) en clientes, centros,
-- contactos y documentos. Lo eliminado no sale en las listas salvo con un filtro propio y se puede restaurar.
--
--   - Solo se elimina lo que no se ha usado (private.entity_in_use → error TNUSE, 409 `en_uso` en la API). Lo usado
--     se desactiva o se suspende (clientes: status/blocked; centros: blocked; contactos: suspended).
--   - Los documentos de conservación obligatoria no se eliminan (error TNRET, 409 `conservacion_obligatoria`).
--   - Eliminar un cliente elimina con él sus centros y contactos (con la misma marca de tiempo); restaurarlo los
--     restaura. Un centro o un contacto no se restaura si su cliente está eliminado (TN409).
--   - Restaurar choca con los únicos de lo activo (código, NIF, contacto principal): 23505, 409 `conflicto`.
--   - Eliminar y restaurar quedan en el historial (activity_log, acciones 'delete' y 'restore').
--
-- Los documentos pasan de borrado definitivo (fase 1) a baja lógica: el fichero se queda en Storage mientras el
-- documento se pueda restaurar. Cuándo se purgan de verdad es una decisión pendiente (db/README.md).
--
-- Códigos de error propios (SQLSTATE de 5 caracteres; apps/api/src/lib/errors.ts los traduce):
--   TN409 conflicto genérico · TN422 validación · TNUSE en uso · TNRET conservación obligatoria.

-- ---------------------------------------------------------------------------
-- ¿Está en uso? Devuelve el motivo (para el mensaje) o NULL. SECURITY DEFINER: mira tablas que quien elimina
-- quizá no puede leer (la facturación de otros clientes).
--
-- Punto de comprobación para los módulos siguientes: cuando existan presupuestos, peticiones, misiones... se añade
-- aquí su consulta (p. ej. «el contacto es destinatario de un presupuesto», «el centro tiene peticiones»).
-- ---------------------------------------------------------------------------
create or replace function private.entity_in_use(p_entity_type text, p_tenant_id uuid, p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  case p_entity_type
    when 'client' then
      if exists (
        select 1 from public.client_billing_profiles b
        join public.clients c on c.tenant_id = b.tenant_id and c.id = b.client_id and c.deleted_at is null
        where b.tenant_id = p_tenant_id and b.invoice_client_id = p_id and b.deleted_at is null
      ) then
        return 'se le facturan los servicios de otro cliente';
      end if;
      -- Pendiente: presupuestos, peticiones y facturas del cliente.
    when 'client_center' then
      null; -- Pendiente: peticiones, misiones y presupuestos del centro.
    when 'client_contact' then
      null; -- Pendiente: presupuestos enviados al contacto, peticiones que solicitó, CPD que firmó.
    else
      null;
  end case;
  return null;
end;
$$;

grant execute on function private.entity_in_use(text, uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Eliminar y restaurar clientes, centros y contactos. Argumento: tipo de entidad.
-- ---------------------------------------------------------------------------
create or replace function private.client_soft_delete_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity_type text := tg_argv[0];
  v_reason text;
begin
  if old.deleted_at is null and new.deleted_at is not null then
    v_reason := private.entity_in_use(v_entity_type, old.tenant_id, old.id);
    if v_reason is not null then
      raise exception 'No se puede eliminar % porque %. Desactívalo o suspéndelo en su lugar.',
        case v_entity_type when 'client' then 'el cliente' when 'client_center' then 'el centro' else 'el contacto' end,
        v_reason
        using errcode = 'TNUSE';
    end if;
  elsif old.deleted_at is not null and new.deleted_at is null and v_entity_type <> 'client' then
    if exists (
      select 1 from public.clients c
      where c.tenant_id = new.tenant_id and c.id = (to_jsonb(new) ->> 'client_id')::uuid and c.deleted_at is not null
    ) then
      raise exception 'Su cliente está eliminado: restaura primero el cliente' using errcode = 'TN409';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_clients_soft_delete before update of deleted_at on public.clients
  for each row execute function private.client_soft_delete_rules('client');
create trigger trg_client_centers_soft_delete before update of deleted_at on public.client_centers
  for each row execute function private.client_soft_delete_rules('client_center');
create trigger trg_client_contacts_soft_delete before update of deleted_at on public.client_contacts
  for each row execute function private.client_soft_delete_rules('client_contact');

-- Los centros y contactos siguen a su cliente. SECURITY DEFINER: quien elimina el cliente puede no tener acceso a
-- la sucursal de alguno de sus centros. Al restaurar, solo vuelve lo que se eliminó con el cliente (misma marca).
create or replace function private.clients_cascade_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    update public.client_centers set deleted_at = new.deleted_at
    where tenant_id = new.tenant_id and client_id = new.id and deleted_at is null;
    update public.client_contacts set deleted_at = new.deleted_at
    where tenant_id = new.tenant_id and client_id = new.id and deleted_at is null;
  elsif old.deleted_at is not null and new.deleted_at is null then
    update public.client_centers set deleted_at = null
    where tenant_id = new.tenant_id and client_id = new.id and deleted_at = old.deleted_at;
    update public.client_contacts set deleted_at = null
    where tenant_id = new.tenant_id and client_id = new.id and deleted_at = old.deleted_at;
  end if;
  return null;
end;
$$;

create trigger trg_clients_cascade_soft_delete after update of deleted_at on public.clients
  for each row execute function private.clients_cascade_soft_delete();

-- ---------------------------------------------------------------------------
-- Documentos: baja lógica, conservación obligatoria con su propio código y restaurar solo si la ficha existe.
-- ---------------------------------------------------------------------------
alter table public.documents add column deleted_at timestamptz;

drop index public.documents_tenant_entity_idx;
create index documents_tenant_entity_idx on public.documents (tenant_id, entity_type, entity_id) where deleted_at is null;

comment on table public.documents is
  'Documentos de cualquier ficha; el fichero está en Storage (bucket documents). Eliminar = baja lógica (deleted_at).';

create or replace function private.document_is_retained(p_tenant_id uuid, p_type_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select retention_required from public.catalog_items where tenant_id = p_tenant_id and id = p_type_id), false)
$$;

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
    new.deleted_at := null;
  else
    -- La entidad, el fichero y quién lo subió no cambian: para otro fichero, otro documento.
    if (new.tenant_id, new.entity_type, new.entity_id, new.storage_path, new.mime_type, new.size_bytes, new.uploaded_by, new.uploaded_at)
       is distinct from
       (old.tenant_id, old.entity_type, old.entity_id, old.storage_path, old.mime_type, old.size_bytes, old.uploaded_by, old.uploaded_at) then
      raise exception 'La ficha, el fichero y quién lo subió no se pueden cambiar' using errcode = 'TN422';
    end if;
    -- Un documento de conservación obligatoria no puede pasar a un tipo que no la exige (sería eliminable).
    if new.type_id <> old.type_id and private.document_is_retained(old.tenant_id, old.type_id)
       and not private.document_is_retained(new.tenant_id, new.type_id) then
      raise exception 'Este documento es de conservación obligatoria: no puede pasar a un tipo que no lo es'
        using errcode = 'TNRET';
    end if;
    -- Eliminar (baja lógica).
    if old.deleted_at is null and new.deleted_at is not null and private.document_is_retained(old.tenant_id, old.type_id) then
      raise exception 'Este tipo de documento es de conservación obligatoria: no se puede eliminar' using errcode = 'TNRET';
    end if;
    -- Restaurar: su ficha tiene que existir.
    if old.deleted_at is not null and new.deleted_at is null
       and not private.document_entity_exists(new.tenant_id, new.entity_type, new.entity_id) then
      raise exception 'La ficha del documento está eliminada: restaura primero la ficha' using errcode = 'TN409';
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

-- Borrado definitivo (la purga, cuando se decida): tampoco para los de conservación obligatoria.
create or replace function private.documents_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.tenants t where t.id = old.tenant_id)
     and private.document_is_retained(old.tenant_id, old.type_id) then
    raise exception 'Este tipo de documento es de conservación obligatoria: no se puede eliminar'
      using errcode = 'TNRET';
  end if;
  return old;
end;
$$;

-- ---------------------------------------------------------------------------
-- Historial: restaurar es una acción propia; «Eliminación» para la baja lógica y «Eliminación definitiva» para el
-- borrado de la fila.
-- ---------------------------------------------------------------------------
alter table public.activity_log
  drop constraint activity_log_action_check,
  add constraint activity_log_action_check check (action in ('create', 'update', 'delete', 'restore'));

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
    v_action := 'delete';
  elsif v_old ? 'deleted_at' and v_old ->> 'deleted_at' is not null and v_new ->> 'deleted_at' is null then
    v_action := 'restore';
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
    when v_entity_type = 'client_contact' and v_action = 'update' and v_changes ? 'suspended' then
      case when (v_new ->> 'suspended')::boolean then 'Suspensión de contacto' else 'Reactivación de contacto' end
    when v_action = 'create' then 'Alta de ' || private.activity_label(v_entity_type)
    when v_action = 'update' then 'Cambios en ' || private.activity_label(v_entity_type)
    when v_action = 'restore' then 'Restauración de ' || private.activity_label(v_entity_type)
    when tg_op = 'DELETE' then 'Eliminación definitiva de ' || private.activity_label(v_entity_type)
    else 'Eliminación de ' || private.activity_label(v_entity_type)
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

-- deleted_at y la suspensión no son «cambios» de datos: ya tienen su resumen.
create or replace function private.activity_ignored_columns()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['id', 'tenant_id', 'created_at', 'updated_at', 'suspended_at', 'suspended_by']
$$;
