-- Candidatos, segunda parte (fase 6): decisiones de arquitectura (17/11/2026) y lo que pidió la pantalla.
--
--   - Aceptación de la candidatura: si la ETT saca a alguien de la bolsa sin consentimiento vigente, la contacta y la
--     persona acepta presentarse a esa petición, se anota (cuándo, canal y quién). Es base precontractual: con ella se
--     puede añadir y proponer al cliente; sin ella ni consentimiento de la bolsa, TN409.
--   - Historial de contactos del candidato (canal, resultado, nota, próxima acción); actualiza el último contacto.
--   - Anonimizar: punto previsto para la fase 7 (private.candidate_legal_retention): quien haya tenido contrato conserva
--     lo que obligan la ley laboral y la de la Seguridad Social. Hoy no devuelve nada.

alter table public.applications
  add column candidate_accepted_at timestamptz,
  add column candidate_accepted_channel varchar(10) check (candidate_accepted_channel in ('phone', 'email', 'whatsapp', 'sms', 'in_person', 'other')),
  add column candidate_accepted_by uuid references public.profiles (id) on delete set null,
  add constraint applications_acceptance_check check ((candidate_accepted_at is null) = (candidate_accepted_channel is null));

comment on column public.applications.candidate_accepted_at is
  'La persona aceptó presentarse a esta petición (contactada por la ETT): base precontractual sin consentimiento de la bolsa';

create or replace function private.applications_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select p.id from public.profiles p where p.id = auth.uid());
  v_slot record;
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.candidates c where c.tenant_id = new.tenant_id and c.id = new.candidate_id
               and c.anonymized_at is not null) then
      raise exception 'La persona está anonimizada' using errcode = 'TN409';
    end if;
    if not exists (select 1 from public.requests r where r.tenant_id = new.tenant_id and r.id = new.request_id
                   and r.status not in ('closed', 'cancelled')) then
      raise exception 'La petición está cerrada o cancelada' using errcode = 'TN409';
    end if;
    -- Sacarla de la bolsa exige su consentimiento vigente o que haya aceptado presentarse a esta petición (medidas
    -- precontractuales); si se inscribió ella, también son medidas precontractuales.
    if new.candidate_accepted_at is not null then
      new.candidate_accepted_by := v_me;
    else
      new.candidate_accepted_channel := null;
      new.candidate_accepted_by := null;
    end if;
    if new.origin = 'sourced' and new.candidate_accepted_at is null
       and not private.candidate_has_consent(new.tenant_id, new.candidate_id, 'talent_pool') then
      raise exception 'La persona no tiene el consentimiento de la bolsa vigente: anota que ha aceptado presentarse a esta petición o que se inscriba ella'
        using errcode = 'TN409';
    end if;
    new.legal_basis := case when new.origin = 'applied' or new.candidate_accepted_at is not null then 'precontractual' else 'consent' end;
    if new.stage not in ('registered', 'preselected', 'interview') then
      raise exception 'Una candidatura empieza en selección' using errcode = 'TN422';
    end if;
    new.slot_id := null;
    new.stage_changed_at := now();
    new.stage_changed_by := v_me;
    new.created_by := v_me;
    return new;
  end if;

  if (new.tenant_id, new.candidate_id, new.request_id, new.origin, new.created_by)
     is distinct from (old.tenant_id, old.candidate_id, old.request_id, old.origin, old.created_by) then
    raise exception 'La persona, la petición y el origen de la candidatura no cambian' using errcode = 'TN422';
  end if;
  -- La aceptación de la candidatura se anota una vez (quién lo pone la base de datos) y cambia la base legal.
  if old.candidate_accepted_at is not null and (new.candidate_accepted_at, new.candidate_accepted_channel, new.candidate_accepted_by)
     is distinct from (old.candidate_accepted_at, old.candidate_accepted_channel, old.candidate_accepted_by) then
    raise exception 'La aceptación de la candidatura ya está anotada' using errcode = 'TN409';
  end if;
  if old.candidate_accepted_at is null and new.candidate_accepted_at is not null then
    new.candidate_accepted_by := v_me;
  end if;
  new.legal_basis := case when new.origin = 'applied' or new.candidate_accepted_at is not null then 'precontractual' else 'consent' end;
  if new.stage in ('on_mission', 'finished', 'left') and new.stage is distinct from old.stage then
    raise exception 'Las etapas de la misión llegan con Contratos y altas (fase 7)' using errcode = 'TN422';
  end if;
  if old.stage in ('on_mission', 'finished', 'left') then
    raise exception 'La candidatura ya está en la misión' using errcode = 'TN409';
  end if;

  if new.stage is distinct from old.stage then
    new.stage_changed_at := now();
    new.stage_changed_by := v_me;
    if new.stage = 'proposed' and old.stage not in ('registered', 'preselected', 'interview') then
      raise exception 'Solo se propone al cliente desde la selección' using errcode = 'TN409';
    end if;
    -- Proponer al cliente necesita una base legal vigente.
    if new.stage = 'proposed' and new.legal_basis = 'consent'
       and not private.candidate_has_consent(new.tenant_id, new.candidate_id, 'talent_pool') then
      raise exception 'Sin consentimiento de la bolsa vigente ni aceptación de la candidatura no se puede proponer al cliente'
        using errcode = 'TN409';
    end if;
    if new.stage = 'confirmed' and old.stage <> 'proposed' then
      raise exception 'Solo se confirma una candidatura propuesta al cliente' using errcode = 'TN409';
    end if;
    -- Plaza: al proponer se reserva una por cubrir de la misma petición.
    if new.stage = 'proposed' then
      select s.id, s.status, s.request_id into v_slot from public.request_slots s
      where s.tenant_id = new.tenant_id and s.id = new.slot_id;
      if v_slot.id is null or v_slot.request_id <> new.request_id or v_slot.status <> 'open' then
        raise exception 'La plaza tiene que ser de la petición y estar por cubrir' using errcode = 'TN409';
      end if;
    elsif new.stage = 'confirmed' then
      new.slot_id := old.slot_id;
    elsif new.stage not in ('proposed', 'confirmed') then
      new.slot_id := null;
    end if;
  elsif new.slot_id is distinct from old.slot_id then
    raise exception 'La plaza cambia al proponer, confirmar o liberar' using errcode = 'TN422';
  end if;
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- Historial de contactos
-- ---------------------------------------------------------------------------
create table public.candidate_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  candidate_id uuid not null,
  contacted_at timestamptz not null default now(),
  channel varchar(10) not null check (channel in ('phone', 'email', 'whatsapp', 'sms', 'in_person', 'other')),
  result varchar(120),
  note text,
  next_action varchar(250),
  request_id uuid,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, candidate_id) references public.candidates (tenant_id, id) on delete cascade,
  foreign key (tenant_id, request_id) references public.requests (tenant_id, id) on delete set null (request_id)
);

create index candidate_contacts_candidate_idx on public.candidate_contacts (tenant_id, candidate_id, contacted_at desc);

create or replace function private.candidate_contacts_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.candidates set last_contact_at = greatest(coalesce(last_contact_at, new.contacted_at), new.contacted_at)
  where tenant_id = new.tenant_id and id = new.candidate_id and anonymized_at is null;
  return null;
end;
$$;

create or replace function private.candidate_contacts_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.candidates c where c.tenant_id = new.tenant_id and c.id = new.candidate_id and c.anonymized_at is not null) then
    raise exception 'La persona está anonimizada' using errcode = 'TN409';
  end if;
  new.created_by := (select p.id from public.profiles p where p.id = auth.uid());
  return new;
end;
$$;

create trigger trg_candidate_contacts_before_insert before insert on public.candidate_contacts
  for each row execute function private.candidate_contacts_before_insert();
create trigger trg_candidate_contacts_after_insert after insert on public.candidate_contacts
  for each row execute function private.candidate_contacts_after_insert();

revoke all on table public.candidate_contacts from anon;
revoke update, delete, truncate, references, trigger on table public.candidate_contacts from authenticated;
alter table public.candidate_contacts enable row level security;
create policy candidate_contacts_select on public.candidate_contacts for select to authenticated
using (exists (select 1 from public.candidates c where c.tenant_id = candidate_contacts.tenant_id and c.id = candidate_contacts.candidate_id));
create policy candidate_contacts_insert on public.candidate_contacts for insert to authenticated
with check (private.candidate_writable(tenant_id));

-- ---------------------------------------------------------------------------
-- Conservación legal al anonimizar (fase 7). Devuelve los motivos para conservar datos; hoy, ninguno.
-- Cuando haya contratos: contratos y nóminas (4 años, art. 21 LISOS; Seguridad Social, art. 21 TRLGSS) [verificar],
-- y entonces anonimizar conservará esos datos en vez de negarse.
-- ---------------------------------------------------------------------------
create or replace function private.candidate_legal_retention(p_tenant_id uuid, p_candidate_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select '{}'::text[]
$$;

create or replace function private.anonymize_candidate(p_tenant_id uuid, p_candidate_id uuid, p_reason text)
returns table (storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select p.id from public.profiles p where p.id = auth.uid());
begin
  if not (private.is_superadmin() or (p_tenant_id = private.current_tenant_id() and private.has_permission('privacy.manage'))) then
    raise exception 'No tienes permiso para anonimizar (privacy.manage)' using errcode = '42501';
  end if;
  if not exists (select 1 from public.candidates c where c.tenant_id = p_tenant_id and c.id = p_candidate_id
                 and c.anonymized_at is null) then
    raise exception 'La persona no existe o ya está anonimizada' using errcode = 'TN409';
  end if;
  if exists (select 1 from public.applications a where a.tenant_id = p_tenant_id and a.candidate_id = p_candidate_id
             and a.stage in ('confirmed', 'on_mission')) then
    raise exception 'Tiene una plaza confirmada o está en misión: termina antes la misión' using errcode = 'TN409';
  end if;
  -- Fase 7: quien haya tenido contrato conserva lo que obligan la ley laboral y la de la Seguridad Social.
  if cardinality(private.candidate_legal_retention(p_tenant_id, p_candidate_id)) > 0 then
    raise exception 'Hay datos que la ley obliga a conservar: %', array_to_string(private.candidate_legal_retention(p_tenant_id, p_candidate_id), ', ')
      using errcode = 'TN409';
  end if;

  -- Candidaturas: fuera de los procesos abiertos y sin notas.
  update public.applications set stage = 'withdrawn'
  where tenant_id = p_tenant_id and candidate_id = p_candidate_id and stage in ('registered', 'preselected', 'interview', 'proposed');
  update public.applications set notes = null, discard_reason = null
  where tenant_id = p_tenant_id and candidate_id = p_candidate_id;

  delete from public.candidate_attributes where tenant_id = p_tenant_id and candidate_id = p_candidate_id;
  delete from public.candidate_contacts where tenant_id = p_tenant_id and candidate_id = p_candidate_id;


  -- Documentos (salvo los de conservación obligatoria). Los consentimientos se quedan como prueba, sin documento.
  return query
    delete from public.documents d
    using public.catalog_items t
    where d.tenant_id = p_tenant_id and d.entity_type = 'candidate' and d.entity_id = p_candidate_id
      and t.tenant_id = d.tenant_id and t.id = d.type_id and not t.retention_required
    returning d.storage_path;

  perform set_config('tramitnow.anonymizing', 'on', true);
  update public.candidates
     set first_name = 'Persona anonimizada', last_name = null, id_document_type = null, id_document_number_enc = null,
         id_document_fingerprint = null, id_document_hint = null, id_document_expires_on = null, ss_number_enc = null,
         ss_number_hint = null, iban_enc = null, iban_hint = null, health_enc = null, health_legal_basis = null,
         birth_date = null, nationality = null, phone = null, email = null, address = null, postal_code = null,
         city = null, province_code = null, source_ref = null, main_profile_id = null, experience_years = null,
         has_car = null, other_licenses_text = null, experiences = '[]', education = '[]', shifts = '{}',
         availability = null, available_from = null, max_distance_km = null, availability_notes = null,
         status = 'discarded', anonymized_at = now(), anonymized_by = v_me, anonymization_reason = p_reason
   where tenant_id = p_tenant_id and id = p_candidate_id;
  perform set_config('tramitnow.anonymizing', '', true);

  -- Historial: sin los valores que había (se queda quién y cuándo).
  update public.activity_log set changes = '{}'::jsonb
  where tenant_id = p_tenant_id
    and ((entity_type = 'candidate' and entity_id = p_candidate_id) or (parent_type = 'candidate' and parent_id = p_candidate_id));

  perform private.log_access('anonymize', p_candidate_id, jsonb_build_object('reason', p_reason));
end;
$$;

