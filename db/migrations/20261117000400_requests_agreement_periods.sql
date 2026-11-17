-- Peticiones: el convenio se compara en las FECHAS de la petición y marca de trabajo especialmente peligroso.
--
-- Art. 11 de la Ley 14/1994 con tablas nuevas (decisión de arquitectura, 17/11/2026): la petición conserva el salario
-- del presupuesto, pero se compara con cada versión PUBLICADA del convenio que esté vigente en algún momento entre el
-- inicio y el fin de la petición (sin inicio, desde hoy; sin fin, sin límite). Si alguna pide más para la misma
-- categoría (por código), la API avisa del tramo afectado y no deja generar el CPD previo. Unas tablas con efectos
-- después del fin no cuentan. Si la categoría no está en esa versión, se avisa pero no se bloquea.
--
-- Trabajo especialmente peligroso: solo se guarda (sin control). El control es parte de la decisión pendiente del
-- art. 8 de la Ley 14/1994 y del RD 216/1999 (anexo).

alter table public.requests
  add column hazardous_work boolean not null default false;

comment on column public.requests.hazardous_work is
  'El puesto está en la lista de trabajos especialmente peligrosos (art. 8 Ley 14/1994, RD 216/1999). Solo se guarda: el control está pendiente de decidir';

drop function private.request_current_agreement(uuid, uuid);

-- Versiones publicadas del convenio vigentes en las fechas de la petición. Cada versión rige desde su inicio hasta el
-- día antes de la siguiente (o hasta su fin, si es antes). minimum_salary_hour es null si la categoría no está.
create or replace function private.request_agreement_periods(p_tenant_id uuid, p_request_id uuid)
returns table (version_id uuid, effective_from date, effective_to date, category_matched boolean, minimum_salary_hour numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with r as (
    select rq.agreement_category_code, ca.global_agreement_id,
           coalesce(rq.start_date, current_date) as date_from, coalesce(rq.end_date, 'infinity'::date) as date_to
    from public.requests rq
    join public.collective_agreements ca on ca.tenant_id = rq.tenant_id and ca.id = rq.collective_agreement_id
    where rq.tenant_id = p_tenant_id and rq.id = p_request_id and ca.global_agreement_id is not null
  ),
  v as (
    select av.id, av.effective_from,
           least(av.effective_to, lead(av.effective_from) over (order by av.effective_from) - 1) as effective_to
    from public.agreement_versions av, r
    where av.agreement_id = r.global_agreement_id and av.status = 'publicada'
  )
  select v.id, v.effective_from, v.effective_to, ac.id is not null,
         case when ac.id is not null and r.agreement_category_code is not null
              then private.agreement_minimum_salary_hour(v.id, ac.id) end
  from v cross join r
  left join public.agreement_categories ac on ac.version_id = v.id and ac.code = r.agreement_category_code
  where v.effective_from <= r.date_to and coalesce(v.effective_to, 'infinity'::date) >= r.date_from
  order by v.effective_from
$$;

grant execute on function private.request_agreement_periods(uuid, uuid) to authenticated, service_role;
