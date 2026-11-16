-- Catálogo global de convenios colectivos (docs/convenios-globales.md, fases 0 y 1).
--
--   platform_content_editors  equipo de contenidos de TramitNOW: rol de plataforma, distinto del superadmin y sin
--                             acceso a los datos de las ETT (no es una membresía). Se escribe por SQL, como
--                             platform_admins.
--   agreements                el convenio (REGCON, ámbito, territorio, CNAE, vigencia general).
--   agreement_publications    cada publicación oficial (boletín, fecha, número, enlace, tipo): la fuente.
--   agreement_versions        una versión de las condiciones económicas, con su estado:
--                               borrador → en_revision → publicada → retirada  (en_revision → borrador = devolver)
--   agreement_categories      grupos, niveles y categorías de cada versión.
--   agreement_salary_items    importes de cada versión por categoría y concepto.
--   agreement_conditions      jornada, vacaciones, pagas... de cada versión (1:1).
--
-- Tablas globales SIN tenant_id (como los municipios). Las ETT (cualquier autenticado) leen solo lo publicado (y lo
-- retirado, que pueden haber usado sus documentos); el equipo de contenidos lo lee y escribe todo.
--
-- Reglas que garantiza la base de datos:
--   - Lo publicado no se edita ni se borra: una versión publicada solo puede pasar a retirada. Sus categorías,
--     importes y condiciones, y las publicaciones que usa, quedan fijos (TN409).
--   - Revisión a cuatro ojos: no se publica sin revisión, ni la revisa quien la extrajo (TN409).
--   - Los valores de ámbito, tipo de publicación, unidad y concepto van en español porque son el formato de carga de
--     db/data/convenios/*.json (ver db/README.md, "Convenios globales").
--
-- Las tablas de seguimiento por ETT (tenant_agreement_settings, tenant_agreement_versions, tenant_salary_overrides)
-- llegarán con los presupuestos (fase 4), que es lo primero que las usa.

-- ---------------------------------------------------------------------------
-- Equipo de contenidos
-- ---------------------------------------------------------------------------
create table public.platform_content_editors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.platform_content_editors is
  'Equipo de contenidos de TramitNOW (catálogo global de convenios). Sin acceso a datos de las ETT. Sin escritura desde el cliente.';

create or replace function private.is_content_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_content_editors ce
    join public.profiles p on p.id = ce.user_id
    where ce.user_id = auth.uid()
      and p.status = 'active' and p.deleted_at is null
  )
$$;

grant execute on function private.is_content_editor() to authenticated, service_role;

revoke all on table public.platform_content_editors from anon;
revoke insert, update, delete, truncate, references, trigger on table public.platform_content_editors from authenticated;
alter table public.platform_content_editors enable row level security;
create policy platform_content_editors_select on public.platform_content_editors for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_superadmin()));

-- ---------------------------------------------------------------------------
-- agreements
-- ---------------------------------------------------------------------------
create table public.agreements (
  id uuid primary key default gen_random_uuid(),
  -- Código del convenio en el REGCON: 14 dígitos.
  regcon varchar(14) not null check (regcon ~ '^[0-9]{14}$'),
  name varchar(300) not null check (length(trim(name)) > 0),
  scope varchar(20) not null check (scope in ('estatal', 'autonomico', 'provincial', 'empresa')),
  autonomous_community_code char(2) references public.autonomous_communities (code),
  province_code char(2) references public.provinces (code),
  -- Códigos CNAE-2009 a los que se aplica (sección, división, grupo o clase: 'H', '52', '522', '5221').
  cnae_codes varchar(4)[] not null default '{}'
    check (array_position(cnae_codes, null) is null),
  valid_from date,
  valid_to date,
  -- Convenio al que sustituye (un convenio nuevo con otro código REGCON).
  replaces_agreement_id uuid references public.agreements (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from),
  -- El territorio va con el ámbito: comunidad si es autonómico, provincia si es provincial, nada si es estatal.
  check (
    case scope
      when 'estatal' then autonomous_community_code is null and province_code is null
      when 'autonomico' then autonomous_community_code is not null and province_code is null
      when 'provincial' then province_code is not null and autonomous_community_code is null
      else autonomous_community_code is null
    end
  )
);

create unique index agreements_regcon_uniq on public.agreements (regcon);
create index agreements_scope_idx on public.agreements (scope, autonomous_community_code, province_code);
create index agreements_cnae_idx on public.agreements using gin (cnae_codes);

comment on table public.agreements is 'Catálogo global de convenios colectivos (sin tenant_id). Lo mantiene el equipo de contenidos.';

-- ---------------------------------------------------------------------------
-- agreement_publications
-- ---------------------------------------------------------------------------
create table public.agreement_publications (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  bulletin varchar(40) not null check (length(trim(bulletin)) > 0),
  published_on date not null,
  -- Identificador de la publicación en el boletín (p. ej. BOE-A-2024-12345). Único por convenio.
  number varchar(80) not null check (length(trim(number)) > 0),
  url text check (url ~ '^https?://'),
  type varchar(30) not null
    check (type in ('texto_inicial', 'revision_salarial', 'tablas_provisionales', 'correccion_errores', 'sentencia', 'anulacion')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agreement_id, id),
  unique (agreement_id, number)
);

comment on table public.agreement_publications is 'Publicaciones oficiales de un convenio: la fuente de cada versión.';

-- ---------------------------------------------------------------------------
-- agreement_versions
-- ---------------------------------------------------------------------------
create table public.agreement_versions (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  publication_id uuid not null,
  effective_from date not null,
  effective_to date,
  provisional boolean not null default false,
  replaces_version_id uuid references public.agreement_versions (id) on delete set null,
  status varchar(20) not null default 'borrador'
    check (status in ('borrador', 'en_revision', 'publicada', 'retirada')),
  -- Dudas del extractor que el revisor tiene que mirar (el "pendingReview" del fichero de carga).
  pending_review text[] not null default '{}',
  -- Notas del revisor al devolverla a borrador.
  review_notes text,
  -- Quién la extrajo (null: carga automática sin persona indicada), quién la revisó y quién la publicó.
  extracted_by uuid references auth.users (id) on delete set null,
  extracted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  withdrawn_by uuid references auth.users (id) on delete set null,
  withdrawn_at timestamptz,
  withdrawal_reason text,
  -- Huella del contenido cargado: el cargador no toca una versión cuyo fichero no ha cambiado.
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agreement_id, id),
  foreign key (agreement_id, publication_id) references public.agreement_publications (agreement_id, id),
  check (effective_to is null or effective_to >= effective_from),
  check (status <> 'publicada' or published_at is not null),
  check (status <> 'retirada' or (withdrawn_at is not null and withdrawal_reason is not null))
);

create unique index agreement_versions_key_uniq on public.agreement_versions (agreement_id, publication_id, effective_from);
create index agreement_versions_status_idx on public.agreement_versions (status, agreement_id);
create index agreement_versions_publication_idx on public.agreement_versions (publication_id);

comment on table public.agreement_versions is
  'Versiones de las condiciones económicas de un convenio. Lo publicado no cambia: se publica otra versión.';

-- ---------------------------------------------------------------------------
-- agreement_categories, agreement_salary_items, agreement_conditions (por versión)
-- ---------------------------------------------------------------------------
create table public.agreement_categories (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.agreement_versions (id) on delete cascade,
  code varchar(40) not null check (length(trim(code)) > 0),
  name varchar(300) not null check (length(trim(name)) > 0),
  group_name varchar(120),
  level varchar(120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (version_id, id),
  unique (version_id, code)
);

create table public.agreement_salary_items (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.agreement_versions (id) on delete cascade,
  -- null: el importe vale para todas las categorías de la versión.
  category_id uuid,
  -- Concepto normalizado (salario_base, plus_convenio, plus_transporte, paga_extra, hora_extra, nocturnidad...).
  concept varchar(40) not null check (concept ~ '^[a-z][a-z0-9_]*$'),
  -- Texto tal como sale en el convenio.
  label varchar(300),
  amount numeric(14, 4) not null,
  unit varchar(20) not null check (unit in ('hora', 'dia', 'mes', 'anio', 'porcentaje')),
  -- Salarial (cotiza y tributa como salario) o extrasalarial.
  salarial boolean not null default true,
  -- Tabla y página del boletín de donde sale.
  source varchar(300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (version_id, category_id) references public.agreement_categories (version_id, id) on delete cascade
);

create index agreement_salary_items_version_idx on public.agreement_salary_items (version_id, category_id);

create table public.agreement_conditions (
  version_id uuid primary key references public.agreement_versions (id) on delete cascade,
  annual_hours numeric(7, 2) check (annual_hours > 0),
  vacation_days smallint check (vacation_days between 0 and 366),
  vacation_days_type varchar(20) check (vacation_days_type in ('naturales', 'laborables')),
  extra_payments smallint check (extra_payments between 0 and 12),
  notes text,
  -- Lo que venga en el fichero y aún no tenga columna (antigüedad, complemento de IT...).
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.agreement_categories is 'Grupos, niveles y categorías de una versión de convenio.';
comment on table public.agreement_salary_items is 'Importes de una versión de convenio, por categoría y concepto.';
comment on table public.agreement_conditions is 'Jornada, vacaciones, pagas y otras condiciones de una versión de convenio.';

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create trigger trg_agreements_updated_at before update on public.agreements
  for each row execute function private.touch_updated_at();
create trigger trg_agreement_publications_updated_at before update on public.agreement_publications
  for each row execute function private.touch_updated_at();
create trigger trg_agreement_versions_updated_at before update on public.agreement_versions
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Inmutabilidad y flujo de estados
-- ---------------------------------------------------------------------------

-- Mantenimiento: borrar del todo un convenio publicado (p. ej. los datos de los tests). Solo como postgres, nunca
-- desde la API (que trabaja como authenticated):  set local tramitnow.purge_agreements = 'on';
create or replace function private.agreement_purge_allowed()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_setting('tramitnow.purge_agreements', true) = 'on'
     and current_user not in ('authenticated', 'anon', 'tramitnow_api')
$$;

create or replace function private.agreement_versions_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_fixed constant text[] := array['status', 'withdrawn_by', 'withdrawn_at', 'withdrawal_reason', 'updated_at'];
  v_people constant text[] := array['extracted_by', 'reviewed_by', 'published_by', 'withdrawn_by', 'updated_at'];
begin
  if tg_op = 'DELETE' then
    if old.status in ('publicada', 'retirada') and not private.agreement_purge_allowed() then
      raise exception 'Una versión publicada no se borra: se retira' using errcode = 'TN409';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('borrador', 'en_revision') then
      raise exception 'Una versión nueva empieza en borrador o en revisión' using errcode = 'TN422';
    end if;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.published_by := null;
    new.published_at := null;
    new.withdrawn_by := null;
    new.withdrawn_at := null;
    return new;
  end if;

  -- UPDATE. Al borrar un usuario, sus referencias pasan a null (FK): se deja, también en lo publicado.
  if (to_jsonb(new) - v_people) = (to_jsonb(old) - v_people)
     and (new.extracted_by is null or new.extracted_by = old.extracted_by)
     and (new.reviewed_by is null or new.reviewed_by = old.reviewed_by)
     and (new.published_by is null or new.published_by = old.published_by)
     and (new.withdrawn_by is null or new.withdrawn_by = old.withdrawn_by)
     and (new.status in ('publicada', 'retirada') or new.reviewed_by is not distinct from old.reviewed_by) then
    return new;
  end if;

  if old.status in ('publicada', 'retirada') then
    if old.status = 'publicada' and new.status = 'retirada'
       and (to_jsonb(new) - v_fixed) = (to_jsonb(old) - v_fixed) then
      if coalesce(trim(new.withdrawal_reason), '') = '' then
        raise exception 'Indica por qué se retira la versión' using errcode = 'TN422';
      end if;
      new.withdrawn_at := now();
      new.withdrawn_by := auth.uid();
      return new;
    end if;
    raise exception 'Una versión publicada no se modifica: publica otra que la sustituya o retírala'
      using errcode = 'TN409';
  end if;

  if new.status = 'retirada' then
    raise exception 'Solo se retira una versión publicada' using errcode = 'TN409';
  end if;

  -- Una persona (la API, con su token) no cambia quién extrajo, ni revisa en nombre de otro.
  if auth.uid() is not null then
    if new.extracted_by is distinct from old.extracted_by or new.extracted_at is distinct from old.extracted_at
       or new.content_hash is distinct from old.content_hash then
      raise exception 'Los datos de extracción los pone el cargador' using errcode = 'TN409';
    end if;
    if new.reviewed_by is distinct from old.reviewed_by and new.reviewed_by is distinct from auth.uid()
       and new.reviewed_by is not null then
      raise exception 'Solo puedes marcar la revisión como tuya' using errcode = 'TN409';
    end if;
  end if;

  if new.status = 'publicada' then
    if old.status <> 'en_revision' then
      raise exception 'Solo se publica una versión en revisión' using errcode = 'TN409';
    end if;
    if new.reviewed_by is distinct from old.reviewed_by then
      raise exception 'Primero se revisa y después se publica, en dos pasos' using errcode = 'TN409';
    end if;
    if new.reviewed_by is null then
      raise exception 'Falta la revisión: otra persona del equipo tiene que revisarla antes de publicarla'
        using errcode = 'TN409';
    end if;
    if new.reviewed_by = new.extracted_by then
      raise exception 'La revisión a cuatro ojos exige que la revise alguien distinto de quien la extrajo'
        using errcode = 'TN409';
    end if;
    new.published_at := now();
    new.published_by := auth.uid();
    return new;
  end if;

  -- borrador ↔ en_revision: cambiar de estado quita la revisión.
  if new.status is distinct from old.status then
    new.reviewed_by := null;
    new.reviewed_at := null;
    return new;
  end if;

  -- Marcar como revisada.
  if new.reviewed_by is distinct from old.reviewed_by then
    if new.reviewed_by is not null then
      if new.status <> 'en_revision' then
        raise exception 'Solo se revisa una versión en revisión' using errcode = 'TN409';
      end if;
      if new.reviewed_by = new.extracted_by then
        raise exception 'No puedes revisar una versión que extrajiste tú: la revisa otra persona del equipo'
          using errcode = 'TN409';
      end if;
      new.reviewed_at := now();
    else
      new.reviewed_at := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_agreement_versions_rules before insert or update or delete on public.agreement_versions
  for each row execute function private.agreement_versions_rules();

-- Contenido de una versión (categorías, importes, condiciones): fijo una vez publicada. Cambiarlo en revisión quita
-- la revisión hecha (hay que volver a revisarlo).
create or replace function private.agreement_content_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_version_id uuid := case when tg_op = 'DELETE' then old.version_id else new.version_id end;
  v_status text;
  v_reviewed uuid;
begin
  if tg_op = 'UPDATE' and new.version_id is distinct from old.version_id then
    raise exception 'No se puede mover a otra versión' using errcode = 'TN409';
  end if;
  select status, reviewed_by into v_status, v_reviewed from public.agreement_versions where id = v_version_id;
  if v_status in ('publicada', 'retirada') and not private.agreement_purge_allowed() then
    raise exception 'Una versión publicada no se modifica: publica otra que la sustituya' using errcode = 'TN409';
  end if;
  if v_status = 'en_revision' and v_reviewed is not null then
    update public.agreement_versions set reviewed_by = null where id = v_version_id;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger trg_agreement_categories_rules before insert or update or delete on public.agreement_categories
  for each row execute function private.agreement_content_rules();
create trigger trg_agreement_salary_items_rules before insert or update or delete on public.agreement_salary_items
  for each row execute function private.agreement_content_rules();
create trigger trg_agreement_conditions_rules before insert or update or delete on public.agreement_conditions
  for each row execute function private.agreement_content_rules();

-- Una publicación que ya es la fuente de una versión publicada no cambia.
create or replace function private.agreement_publications_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.agreement_versions v
    where v.publication_id = old.id and v.status in ('publicada', 'retirada')
  ) and not private.agreement_purge_allowed() then
    raise exception 'La publicación es la fuente de una versión publicada: no se modifica' using errcode = 'TN409';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger trg_agreement_publications_rules before update or delete on public.agreement_publications
  for each row execute function private.agreement_publications_rules();

-- ---------------------------------------------------------------------------
-- Privilegios y RLS
-- ---------------------------------------------------------------------------
revoke all on table public.agreements, public.agreement_publications, public.agreement_versions,
  public.agreement_categories, public.agreement_salary_items, public.agreement_conditions from anon;
revoke truncate, references, trigger on table public.agreements, public.agreement_publications,
  public.agreement_versions, public.agreement_categories, public.agreement_salary_items,
  public.agreement_conditions from authenticated;
grant select, insert, update, delete on table public.agreements, public.agreement_publications,
  public.agreement_versions, public.agreement_categories, public.agreement_salary_items,
  public.agreement_conditions to authenticated;

alter table public.agreements enable row level security;
alter table public.agreement_publications enable row level security;
alter table public.agreement_versions enable row level security;
alter table public.agreement_categories enable row level security;
alter table public.agreement_salary_items enable row level security;
alter table public.agreement_conditions enable row level security;

-- ¿Ven las ETT esta versión? Publicada o retirada (los documentos pueden haberla usado).
create or replace function private.agreement_version_visible(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.agreement_versions v
    where v.id = p_version_id and v.status in ('publicada', 'retirada')
  )
$$;

create or replace function private.agreement_is_published(p_agreement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.agreement_versions v
    where v.agreement_id = p_agreement_id and v.status in ('publicada', 'retirada')
  )
$$;

create or replace function private.agreement_publication_visible(p_publication_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.agreement_versions v
    where v.publication_id = p_publication_id and v.status in ('publicada', 'retirada')
  )
$$;

grant execute on function private.agreement_version_visible(uuid), private.agreement_is_published(uuid),
  private.agreement_publication_visible(uuid) to authenticated, service_role;

create policy agreements_select on public.agreements for select to authenticated
  using ((select private.is_content_editor()) or private.agreement_is_published(id));
create policy agreement_publications_select on public.agreement_publications for select to authenticated
  using ((select private.is_content_editor()) or private.agreement_publication_visible(id));
create policy agreement_versions_select on public.agreement_versions for select to authenticated
  using ((select private.is_content_editor()) or status in ('publicada', 'retirada'));
create policy agreement_categories_select on public.agreement_categories for select to authenticated
  using ((select private.is_content_editor()) or private.agreement_version_visible(version_id));
create policy agreement_salary_items_select on public.agreement_salary_items for select to authenticated
  using ((select private.is_content_editor()) or private.agreement_version_visible(version_id));
create policy agreement_conditions_select on public.agreement_conditions for select to authenticated
  using ((select private.is_content_editor()) or private.agreement_version_visible(version_id));

-- Escritura: solo el equipo de contenidos (ni las ETT ni el superadmin).
do $$
declare
  tbl text;
begin
  foreach tbl in array array['agreements', 'agreement_publications', 'agreement_versions', 'agreement_categories',
                             'agreement_salary_items', 'agreement_conditions'] loop
    execute format('create policy %1$I on public.%2$I for insert to authenticated with check ((select private.is_content_editor()))',
                   tbl || '_insert', tbl);
    execute format('create policy %1$I on public.%2$I for update to authenticated using ((select private.is_content_editor())) with check ((select private.is_content_editor()))',
                   tbl || '_update', tbl);
    execute format('create policy %1$I on public.%2$I for delete to authenticated using ((select private.is_content_editor()))',
                   tbl || '_delete', tbl);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Convenio de la ETT enlazado al catálogo global
-- ---------------------------------------------------------------------------
alter table public.collective_agreements
  add column global_agreement_id uuid references public.agreements (id) on delete set null;

create unique index collective_agreements_tenant_global_uniq
  on public.collective_agreements (tenant_id, global_agreement_id)
  where global_agreement_id is not null and deleted_at is null;

comment on column public.collective_agreements.global_agreement_id is
  'Convenio del catálogo global (agreements) del que salen sus datos. NULL: convenio propio de la ETT (p. ej. de empresa).';

create or replace function private.check_collective_agreement_global()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.global_agreement_id is not null
     and new.global_agreement_id is distinct from (case when tg_op = 'UPDATE' then old.global_agreement_id end)
     and not private.agreement_is_published(new.global_agreement_id) then
    raise exception 'Ese convenio del catálogo no existe o aún no tiene ninguna versión publicada' using errcode = 'TN422';
  end if;
  return new;
end;
$$;

create trigger trg_collective_agreements_global before insert or update of global_agreement_id
  on public.collective_agreements
  for each row execute function private.check_collective_agreement_global();

-- ---------------------------------------------------------------------------
-- Cargador: importa un fichero de db/data/convenios/*.json (formato en db/README.md, "Convenios globales").
-- Lo llama db/scripts/cargar-convenios.sh como postgres. Idempotente:
--   - el convenio se busca por REGCON y sus datos generales se actualizan;
--   - cada publicación, por su número; si ya es la fuente de algo publicado, no se toca (aviso);
--   - cada versión, por (publicación, efectos desde): si no ha cambiado no se toca; si está en borrador o en
--     revisión y ha cambiado, se rehace y vuelve a en_revision sin revisión; si está publicada, no se toca (aviso).
-- Devuelve una línea por cosa hecha. Un error en el fichero lo aborta entero (SQLSTATE 22023, mensaje en español).
-- ---------------------------------------------------------------------------
create or replace function private.load_agreement_file(p_data jsonb, p_extracted_by_email text default null)
returns setof text
language plpgsql
set search_path = ''
as $$
declare
  a jsonb := p_data -> 'agreement';
  v_regcon text := a ->> 'regcon';
  v_scope text := a ->> 'scope';
  v_territory text := nullif(a ->> 'territory', '');
  v_community char(2);
  v_province char(2);
  v_cnae varchar(4)[];
  v_agreement_id uuid;
  v_extracted_by uuid;
  v_pending text[];
  v_pub jsonb;
  v_pub_ids jsonb := '{}'::jsonb;
  v_pub_id uuid;
  v_pub_locked boolean;
  v_ver jsonb;
  v_ver_id uuid;
  v_ver_status text;
  v_ver_hash text;
  v_hash text;
  v_cat jsonb;
  v_item jsonb;
  v_cond jsonb;
  v_cat_id uuid;
  v_ord integer;
  v_where text;
begin
  if jsonb_typeof(a) is distinct from 'object' then
    raise exception 'Falta "agreement"' using errcode = '22023';
  end if;
  v_where := 'Convenio ' || coalesce(v_regcon, '(sin regcon)') || ': ';
  if v_regcon is null or v_regcon !~ '^[0-9]{14}$' then
    raise exception '%agreement.regcon tiene que tener 14 dígitos', v_where using errcode = '22023';
  end if;
  if coalesce(trim(a ->> 'name'), '') = '' then
    raise exception '%falta agreement.name', v_where using errcode = '22023';
  end if;
  if v_scope is null or v_scope not in ('estatal', 'autonomico', 'provincial', 'empresa') then
    raise exception '%agreement.scope tiene que ser estatal, autonomico, provincial o empresa', v_where using errcode = '22023';
  end if;

  -- Territorio: código INE de comunidad (autonómico) o de provincia (provincial; también en los de empresa).
  if v_territory is not null then
    if v_scope = 'estatal' then
      raise exception '%un convenio estatal no lleva territory', v_where using errcode = '22023';
    elsif v_scope = 'autonomico' then
      select code into v_community from public.autonomous_communities where code = v_territory;
      if v_community is null then
        raise exception '%territory "%" no es un código INE de comunidad autónoma', v_where, v_territory using errcode = '22023';
      end if;
    else
      select code into v_province from public.provinces where code = v_territory;
      if v_province is null then
        raise exception '%territory "%" no es un código INE de provincia', v_where, v_territory using errcode = '22023';
      end if;
    end if;
  elsif v_scope in ('autonomico', 'provincial') then
    raise exception '%un convenio % necesita territory', v_where, v_scope using errcode = '22023';
  end if;

  if a ? 'cnae' and jsonb_typeof(a -> 'cnae') <> 'array' then
    raise exception '%agreement.cnae tiene que ser una lista', v_where using errcode = '22023';
  end if;
  select coalesce(array_agg(c), '{}') into v_cnae from jsonb_array_elements_text(coalesce(a -> 'cnae', '[]')) c;
  if exists (select 1 from unnest(v_cnae) c where c !~ '^([A-U]|[0-9]{2,4})$') then
    raise exception '%agreement.cnae: cada código es una letra de sección o 2 a 4 dígitos', v_where using errcode = '22023';
  end if;

  if p_extracted_by_email is not null then
    select u.id into v_extracted_by
    from auth.users u join public.platform_content_editors ce on ce.user_id = u.id
    where lower(u.email) = lower(p_extracted_by_email);
    if v_extracted_by is null then
      raise exception 'EXTRAIDO_POR: % no es del equipo de contenidos', p_extracted_by_email using errcode = '22023';
    end if;
  end if;

  select coalesce(array_agg(x), '{}') into v_pending
  from jsonb_array_elements_text(coalesce(p_data -> 'pendingReview', '[]')) x;

  insert into public.agreements (regcon, name, scope, autonomous_community_code, province_code, cnae_codes, valid_from, valid_to)
  values (v_regcon, trim(a ->> 'name'), v_scope, v_community, v_province, v_cnae,
          (a ->> 'validFrom')::date, (a ->> 'validTo')::date)
  on conflict (regcon) do update set
    name = excluded.name, scope = excluded.scope, autonomous_community_code = excluded.autonomous_community_code,
    province_code = excluded.province_code, cnae_codes = excluded.cnae_codes, valid_from = excluded.valid_from,
    valid_to = excluded.valid_to
  where (agreements.name, agreements.scope, agreements.autonomous_community_code, agreements.province_code,
         agreements.cnae_codes, agreements.valid_from, agreements.valid_to)
        is distinct from (excluded.name, excluded.scope, excluded.autonomous_community_code, excluded.province_code,
                          excluded.cnae_codes, excluded.valid_from, excluded.valid_to);
  select id into v_agreement_id from public.agreements where regcon = v_regcon;
  return next v_where || 'datos generales cargados';

  -- Publicaciones
  for v_pub in select * from jsonb_array_elements(coalesce(p_data -> 'publications', '[]')) loop
    if coalesce(v_pub ->> 'id', '') = '' or coalesce(v_pub ->> 'number', '') = '' then
      raise exception '%cada publicación necesita id y number', v_where using errcode = '22023';
    end if;
    if v_pub_ids ? (v_pub ->> 'id') then
      raise exception '%id de publicación repetido: %', v_where, v_pub ->> 'id' using errcode = '22023';
    end if;
    if coalesce(v_pub ->> 'type', '') not in ('texto_inicial', 'revision_salarial', 'tablas_provisionales',
                                              'correccion_errores', 'sentencia', 'anulacion') then
      raise exception '%publicación %: type no válido (%)', v_where, v_pub ->> 'number', v_pub ->> 'type' using errcode = '22023';
    end if;

    select p.id, private.agreement_publication_visible(p.id) into v_pub_id, v_pub_locked
    from public.agreement_publications p
    where p.agreement_id = v_agreement_id and p.number = v_pub ->> 'number';

    if v_pub_id is null then
      insert into public.agreement_publications (agreement_id, bulletin, published_on, number, url, type)
      values (v_agreement_id, v_pub ->> 'bulletin', (v_pub ->> 'date')::date, v_pub ->> 'number',
              nullif(v_pub ->> 'url', ''), v_pub ->> 'type')
      returning id into v_pub_id;
      return next v_where || 'publicación ' || (v_pub ->> 'number') || ' nueva';
    elsif exists (
      select 1 from public.agreement_publications p
      where p.id = v_pub_id
        and (p.bulletin, p.published_on, p.url, p.type) is distinct from
            (v_pub ->> 'bulletin', (v_pub ->> 'date')::date, nullif(v_pub ->> 'url', ''), v_pub ->> 'type')
    ) then
      if v_pub_locked then
        return next v_where || 'AVISO publicación ' || (v_pub ->> 'number')
          || ' ya es la fuente de una versión publicada: sus cambios no se cargan';
      else
        update public.agreement_publications
           set bulletin = v_pub ->> 'bulletin', published_on = (v_pub ->> 'date')::date,
               url = nullif(v_pub ->> 'url', ''), type = v_pub ->> 'type'
         where id = v_pub_id;
        return next v_where || 'publicación ' || (v_pub ->> 'number') || ' actualizada';
      end if;
    end if;
    v_pub_ids := v_pub_ids || jsonb_build_object(v_pub ->> 'id', v_pub_id);
  end loop;

  -- Versiones
  for v_ver in select * from jsonb_array_elements(coalesce(p_data -> 'versions', '[]')) loop
    if not v_pub_ids ? coalesce(v_ver ->> 'publication', '') then
      raise exception '%versión con publication "%" que no está en publications', v_where, v_ver ->> 'publication'
        using errcode = '22023';
    end if;
    if v_ver ->> 'effectiveFrom' is null then
      raise exception '%cada versión necesita effectiveFrom', v_where using errcode = '22023';
    end if;
    v_pub_id := (v_pub_ids ->> (v_ver ->> 'publication'))::uuid;
    v_hash := md5((v_ver || jsonb_build_object('pendingReview', to_jsonb(v_pending)))::text);

    v_ver_id := null;
    select v.id, v.status, v.content_hash into v_ver_id, v_ver_status, v_ver_hash
    from public.agreement_versions v
    where v.agreement_id = v_agreement_id and v.publication_id = v_pub_id
      and v.effective_from = (v_ver ->> 'effectiveFrom')::date;

    if v_ver_id is not null and v_ver_hash is not distinct from v_hash then
      return next v_where || 'versión desde ' || (v_ver ->> 'effectiveFrom') || ' sin cambios (' || v_ver_status || ')';
      continue;
    end if;
    if v_ver_status in ('publicada', 'retirada') then
      return next v_where || 'AVISO versión desde ' || (v_ver ->> 'effectiveFrom') || ' ya ' || v_ver_status
        || ': los cambios del fichero no se cargan (hay que cargarlos como una versión nueva)';
      continue;
    end if;

    if v_ver_id is null then
      insert into public.agreement_versions
        (agreement_id, publication_id, effective_from, effective_to, provisional, status, pending_review,
         extracted_by, content_hash)
      values (v_agreement_id, v_pub_id, (v_ver ->> 'effectiveFrom')::date, (v_ver ->> 'effectiveTo')::date,
              coalesce((v_ver ->> 'provisional')::boolean, false), 'en_revision', v_pending, v_extracted_by, v_hash)
      returning id into v_ver_id;
      return next v_where || 'versión desde ' || (v_ver ->> 'effectiveFrom') || ' nueva, en revisión';
    else
      delete from public.agreement_salary_items where version_id = v_ver_id;
      delete from public.agreement_categories where version_id = v_ver_id;
      delete from public.agreement_conditions where version_id = v_ver_id;
      update public.agreement_versions
         set effective_to = (v_ver ->> 'effectiveTo')::date,
             provisional = coalesce((v_ver ->> 'provisional')::boolean, false),
             status = 'en_revision', reviewed_by = null, pending_review = v_pending, review_notes = null,
             extracted_by = v_extracted_by, extracted_at = now(), content_hash = v_hash
       where id = v_ver_id;
      return next v_where || 'versión desde ' || (v_ver ->> 'effectiveFrom') || ' actualizada, en revisión';
    end if;

    v_ord := 0;
    for v_cat in select * from jsonb_array_elements(coalesce(v_ver -> 'categories', '[]')) loop
      v_ord := v_ord + 1;
      if coalesce(v_cat ->> 'code', '') = '' or coalesce(v_cat ->> 'name', '') = '' then
        raise exception '%cada categoría necesita code y name', v_where using errcode = '22023';
      end if;
      insert into public.agreement_categories (version_id, code, name, group_name, level, sort_order)
      values (v_ver_id, v_cat ->> 'code', v_cat ->> 'name', nullif(v_cat ->> 'group', ''), nullif(v_cat ->> 'level', ''), v_ord);
    end loop;

    v_ord := 0;
    for v_item in select * from jsonb_array_elements(coalesce(v_ver -> 'salaryItems', '[]')) loop
      v_ord := v_ord + 1;
      v_cat_id := null;
      if v_item ->> 'category' is not null then
        select id into v_cat_id from public.agreement_categories
        where version_id = v_ver_id and code = v_item ->> 'category';
        if v_cat_id is null then
          raise exception '%importe de la categoría "%", que no está en categories', v_where, v_item ->> 'category'
            using errcode = '22023';
        end if;
      end if;
      if coalesce(v_item ->> 'unit', '') not in ('hora', 'dia', 'mes', 'anio', 'porcentaje') then
        raise exception '%importe % de "%": unit no válida (%)', v_where, v_item ->> 'concept', v_item ->> 'category',
          v_item ->> 'unit' using errcode = '22023';
      end if;
      if jsonb_typeof(v_item -> 'amount') is distinct from 'number' then
        raise exception '%importe % de "%": amount tiene que ser un número', v_where, v_item ->> 'concept',
          v_item ->> 'category' using errcode = '22023';
      end if;
      if coalesce(v_item ->> 'concept', '') !~ '^[a-z][a-z0-9_]*$' then
        raise exception '%concept "%" no válido (minúsculas y guiones bajos)', v_where, v_item ->> 'concept'
          using errcode = '22023';
      end if;
      insert into public.agreement_salary_items (version_id, category_id, concept, label, amount, unit, salarial, source, sort_order)
      values (v_ver_id, v_cat_id, v_item ->> 'concept', nullif(v_item ->> 'label', ''), (v_item ->> 'amount')::numeric,
              v_item ->> 'unit', coalesce((v_item ->> 'salarial')::boolean, true), nullif(v_item ->> 'source', ''), v_ord);
    end loop;

    v_cond := v_ver -> 'conditions';
    if jsonb_typeof(v_cond) = 'object' then
      if v_cond ->> 'vacationDaysType' is not null and v_cond ->> 'vacationDaysType' not in ('naturales', 'laborables') then
        raise exception '%conditions.vacationDaysType tiene que ser naturales o laborables', v_where using errcode = '22023';
      end if;
      insert into public.agreement_conditions (version_id, annual_hours, vacation_days, vacation_days_type, extra_payments, notes, extra)
      values (v_ver_id, (v_cond ->> 'annualHours')::numeric, (v_cond ->> 'vacationDays')::smallint,
              v_cond ->> 'vacationDaysType', (v_cond ->> 'extraPayments')::smallint, nullif(v_cond ->> 'notes', ''),
              v_cond - array['annualHours', 'vacationDays', 'vacationDaysType', 'extraPayments', 'notes']);
    end if;
  end loop;
exception
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range
       or check_violation or string_data_right_truncation then
    raise exception '%dato no válido: %', coalesce(v_where, ''), sqlerrm using errcode = '22023';
end;
$$;

revoke execute on function private.load_agreement_file(jsonb, text) from public;
