-- Numeración por series sin huecos (fase 1 de docs/plan-desarrollo.md) para presupuestos, peticiones y facturas.
--
-- Una serie es (ETT, clase de documento, sociedad opcional, sucursal opcional, año). private.next_number() toma el
-- siguiente número con un UPDATE de la fila de la serie: el bloqueo de fila hace que dos transacciones a la vez
-- esperen una a la otra, y si la transacción que lo pidió se deshace, el número se deshace con ella. Así no hay
-- huecos siempre que el número se pida en la misma transacción que crea el documento (y nunca antes, «por si acaso»).
--
-- Pendiente de decidir (db/README.md): si las facturas llevan serie por sucursal o por sociedad, el formato del
-- número y si las series de facturas se dan de alta a mano. De momento, si la serie no existe se crea al pedir el
-- primer número con el prefijo por defecto.

create table public.number_series (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  document_kind varchar(20) not null check (document_kind in ('quote', 'request', 'invoice')),
  company_id uuid,
  branch_id uuid,
  year smallint not null check (year between 2000 and 2100),
  -- Número = prefix || número con ceros a la izquierda hasta `padding` cifras. Ej.: PRE2026-00001.
  prefix varchar(20) not null default '',
  padding smallint not null default 5 check (padding between 1 and 10),
  last_number integer not null default 0 check (last_number >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, company_id) references public.companies (tenant_id, id) on delete cascade,
  foreign key (tenant_id, branch_id) references public.branches (tenant_id, id) on delete cascade,
  check (branch_id is null or company_id is not null)
);

create unique index number_series_key_uniq
  on public.number_series (tenant_id, document_kind, company_id, branch_id, year) nulls not distinct;

comment on table public.number_series is 'Series de numeración sin huecos por ETT, clase de documento, ámbito y año';

create trigger trg_number_series_updated_at before update on public.number_series
  for each row execute function private.touch_updated_at();

-- La sucursal tiene que ser de la sociedad.
create or replace function private.check_number_series_branch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.branch_id is not null and not exists (
    select 1 from public.branches b
    where b.tenant_id = new.tenant_id and b.id = new.branch_id and b.company_id = new.company_id
  ) then
    raise exception 'La sucursal de la serie tiene que ser de su sociedad' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_number_series_branch before insert or update of company_id, branch_id on public.number_series
  for each row execute function private.check_number_series_branch();

-- ---------------------------------------------------------------------------
-- private.next_number: siguiente número de la serie, en la transacción de quien lo pide.
-- ---------------------------------------------------------------------------
create or replace function private.next_number(
  p_tenant_id uuid,
  p_document_kind text,
  p_year integer,
  p_company_id uuid default null,
  p_branch_id uuid default null
)
returns table (series_id uuid, number integer, formatted text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_series public.number_series;
begin
  if not (private.is_superadmin() or p_tenant_id = private.current_tenant_id()) then
    raise exception 'Sin acceso a la ETT' using errcode = '42501';
  end if;

  update public.number_series s
     set last_number = s.last_number + 1
   where s.tenant_id = p_tenant_id and s.document_kind = p_document_kind and s.year = p_year
     and s.company_id is not distinct from p_company_id and s.branch_id is not distinct from p_branch_id
  returning s.* into v_series;

  if not found then
    -- Primera vez: se crea la serie. Si otra transacción la crea a la vez, on conflict espera a que termine y el
    -- update de después sigue la cola del bloqueo de fila.
    insert into public.number_series (tenant_id, document_kind, company_id, branch_id, year, prefix)
    values (
      p_tenant_id, p_document_kind, p_company_id, p_branch_id, p_year,
      case p_document_kind when 'quote' then 'PRE' when 'request' then 'PET' when 'invoice' then 'FAC' end || p_year || '-'
    )
    on conflict (tenant_id, document_kind, company_id, branch_id, year) do nothing;

    update public.number_series s
       set last_number = s.last_number + 1
     where s.tenant_id = p_tenant_id and s.document_kind = p_document_kind and s.year = p_year
       and s.company_id is not distinct from p_company_id and s.branch_id is not distinct from p_branch_id
    returning s.* into v_series;
  end if;

  series_id := v_series.id;
  number := v_series.last_number;
  formatted := v_series.prefix || lpad(v_series.last_number::text, greatest(v_series.padding, length(v_series.last_number::text)), '0');
  return next;
end;
$$;

revoke execute on function private.next_number(uuid, text, integer, uuid, uuid) from public;
grant execute on function private.next_number(uuid, text, integer, uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Privilegios y RLS: los miembros leen las series de su ETT; solo next_number() las cambia.
-- El prefijo y el formato los configurará administración cuando se decidan (pendiente).
-- ---------------------------------------------------------------------------
revoke all on table public.number_series from anon;
revoke insert, update, delete, truncate, references, trigger on table public.number_series from authenticated;

alter table public.number_series enable row level security;

create policy number_series_select on public.number_series for select to authenticated
  using ((select private.is_superadmin()) or tenant_id = (select private.current_tenant_id()));
