-- Direcciones con los catálogos oficiales globales (módulo 1) en vez de catalog_items de cada ETT:
-- municipio (INE, 5 dígitos), provincia (INE, 2) y país (ISO alfa-2). Lo que se comunica a SEPE, TGSS
-- o AEAT tiene que ser el código oficial. La zona geográfica sigue siendo un catálogo propio de la ETT.
--
-- `city` se queda como texto libre para direcciones fuera de España (o un núcleo de población que no es
-- municipio); en España manda municipality_code.
--
-- Cuando se escribió no había direcciones con municipio, provincia ni país en ninguna base, así que no se
-- migran datos: las columnas antiguas se borran.

alter table public.addresses
  drop constraint addresses_tenant_id_municipality_id_fkey,
  drop constraint addresses_tenant_id_province_id_fkey,
  drop constraint addresses_tenant_id_country_id_fkey;

drop index public.addresses_tenant_location_idx;
drop index public.addresses_tenant_municipality_idx;

alter table public.addresses
  drop column municipality_id,
  drop column province_id,
  drop column country_id,
  add column municipality_code char(5) references public.municipalities (code),
  add column province_code char(2) references public.provinces (code),
  add column country_code char(2) not null default 'ES' references public.countries (code),
  -- Provincia y municipio solo existen para España, y el municipio tiene que ser de la provincia.
  add constraint addresses_spain_only check (country_code = 'ES' or (province_code is null and municipality_code is null)),
  add constraint addresses_municipality_province check (
    municipality_code is null or (province_code is not null and left(municipality_code, 2) = province_code)
  );

create index addresses_tenant_province_idx on public.addresses (tenant_id, province_code);
create index addresses_tenant_municipality_idx on public.addresses (tenant_id, municipality_code);

comment on column public.addresses.city is 'Texto libre: población fuera de España o núcleo que no es municipio';
comment on column public.addresses.municipality_code is 'Municipio del INE (CPRO+CMUN); de la provincia indicada';
