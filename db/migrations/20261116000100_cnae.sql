-- Catálogo global de actividades económicas (CNAE) para el sector de los clientes (fase 2, decisión 4 de Enric:
-- «sector = catálogo común basado en CNAE, como municipios»). Sustituye a la tabla maestra por ETT `sector`, que se
-- retira en 20261116000200_clients_fase2.sql.
--
-- Versión: CNAE-2009 (Real Decreto 475/2007), secciones (letra A-U) y divisiones (2 dígitos), 21 + 88 filas.
-- Por qué la 2009 y no la CNAE-2025 (Real Decreto 10/2025, en vigor desde el 1 de enero de 2025):
--   - client_centers.cnae_code ya guarda la clase CNAE-2009 de 4 dígitos, que es la que piden la cotización por
--     accidentes de trabajo (tarifa de primas de la disposición adicional cuarta de la Ley 42/2006) y Contrat@.
--   - Las secciones y divisiones de la 2009 son las que se conocen con seguridad; la 2025 cambia secciones
--     (de 21 a 22) y divisiones, y no se siembra nada que no se haya comprobado.
--   El paso a la CNAE-2025 queda como decisión pendiente (db/README.md): la columna `version` permite tener las dos.
-- Fuente: INE, «Estructura de la CNAE-2009». [verificar] Los códigos son los oficiales; los literales están
-- transcritos y hay que cotejarlos con la publicación del INE (algunos son versiones abreviadas del título oficial).
--
-- Como el resto de catálogos globales (20261027000100_global_catalogs.sql): sin tenant_id, clave = código oficial,
-- solo lectura para todos los usuarios y sin deleted_at (lo que deja de estar vigente pasa a active = false).

create table public.cnae_activities (
  code varchar(4) primary key,
  name varchar(250) not null,
  level varchar(10) not null check (level in ('section', 'division')),
  parent_code varchar(4) references public.cnae_activities (code),
  version varchar(12) not null default 'CNAE-2009',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((level = 'section') = (parent_code is null)),
  check (level <> 'section' or code ~ '^[A-Z]$'),
  check (level <> 'division' or code ~ '^[0-9]{2}$')
);

create index cnae_activities_parent_idx on public.cnae_activities (parent_code);

comment on table public.cnae_activities is
  'Actividades económicas CNAE-2009: secciones (letra) y divisiones (2 dígitos). Global, solo lectura. Sector del cliente.';

insert into public.cnae_activities (code, level, parent_code, name) values
  ('A', 'section', null, 'Agricultura, ganadería, silvicultura y pesca'),
  ('B', 'section', null, 'Industrias extractivas'),
  ('C', 'section', null, 'Industria manufacturera'),
  ('D', 'section', null, 'Suministro de energía eléctrica, gas, vapor y aire acondicionado'),
  ('E', 'section', null, 'Suministro de agua, actividades de saneamiento, gestión de residuos y descontaminación'),
  ('F', 'section', null, 'Construcción'),
  ('G', 'section', null, 'Comercio al por mayor y al por menor; reparación de vehículos de motor y motocicletas'),
  ('H', 'section', null, 'Transporte y almacenamiento'),
  ('I', 'section', null, 'Hostelería'),
  ('J', 'section', null, 'Información y comunicaciones'),
  ('K', 'section', null, 'Actividades financieras y de seguros'),
  ('L', 'section', null, 'Actividades inmobiliarias'),
  ('M', 'section', null, 'Actividades profesionales, científicas y técnicas'),
  ('N', 'section', null, 'Actividades administrativas y servicios auxiliares'),
  ('O', 'section', null, 'Administración Pública y defensa; Seguridad Social obligatoria'),
  ('P', 'section', null, 'Educación'),
  ('Q', 'section', null, 'Actividades sanitarias y de servicios sociales'),
  ('R', 'section', null, 'Actividades artísticas, recreativas y de entretenimiento'),
  ('S', 'section', null, 'Otros servicios'),
  ('T', 'section', null, 'Actividades de los hogares como empleadores de personal doméstico; actividades de los hogares como productores de bienes y servicios para uso propio'),
  ('U', 'section', null, 'Actividades de organizaciones y organismos extraterritoriales');

insert into public.cnae_activities (code, level, parent_code, name) values
  ('01', 'division', 'A', 'Agricultura, ganadería, caza y servicios relacionados con las mismas'),
  ('02', 'division', 'A', 'Silvicultura y explotación forestal'),
  ('03', 'division', 'A', 'Pesca y acuicultura'),
  ('05', 'division', 'B', 'Extracción de antracita, hulla y lignito'),
  ('06', 'division', 'B', 'Extracción de crudo de petróleo y gas natural'),
  ('07', 'division', 'B', 'Extracción de minerales metálicos'),
  ('08', 'division', 'B', 'Otras industrias extractivas'),
  ('09', 'division', 'B', 'Actividades de apoyo a las industrias extractivas'),
  ('10', 'division', 'C', 'Industria de la alimentación'),
  ('11', 'division', 'C', 'Fabricación de bebidas'),
  ('12', 'division', 'C', 'Industria del tabaco'),
  ('13', 'division', 'C', 'Industria textil'),
  ('14', 'division', 'C', 'Confección de prendas de vestir'),
  ('15', 'division', 'C', 'Industria del cuero y del calzado'),
  ('16', 'division', 'C', 'Industria de la madera y del corcho, excepto muebles; cestería y espartería'),
  ('17', 'division', 'C', 'Industria del papel'),
  ('18', 'division', 'C', 'Artes gráficas y reproducción de soportes grabados'),
  ('19', 'division', 'C', 'Coquerías y refino de petróleo'),
  ('20', 'division', 'C', 'Industria química'),
  ('21', 'division', 'C', 'Fabricación de productos farmacéuticos'),
  ('22', 'division', 'C', 'Fabricación de productos de caucho y plásticos'),
  ('23', 'division', 'C', 'Fabricación de otros productos minerales no metálicos'),
  ('24', 'division', 'C', 'Metalurgia; fabricación de productos de hierro, acero y ferroaleaciones'),
  ('25', 'division', 'C', 'Fabricación de productos metálicos, excepto maquinaria y equipo'),
  ('26', 'division', 'C', 'Fabricación de productos informáticos, electrónicos y ópticos'),
  ('27', 'division', 'C', 'Fabricación de material y equipo eléctrico'),
  ('28', 'division', 'C', 'Fabricación de maquinaria y equipo n.c.o.p.'),
  ('29', 'division', 'C', 'Fabricación de vehículos de motor, remolques y semirremolques'),
  ('30', 'division', 'C', 'Fabricación de otro material de transporte'),
  ('31', 'division', 'C', 'Fabricación de muebles'),
  ('32', 'division', 'C', 'Otras industrias manufactureras'),
  ('33', 'division', 'C', 'Reparación e instalación de maquinaria y equipo'),
  ('35', 'division', 'D', 'Suministro de energía eléctrica, gas, vapor y aire acondicionado'),
  ('36', 'division', 'E', 'Captación, depuración y distribución de agua'),
  ('37', 'division', 'E', 'Recogida y tratamiento de aguas residuales'),
  ('38', 'division', 'E', 'Recogida, tratamiento y eliminación de residuos; valorización'),
  ('39', 'division', 'E', 'Actividades de descontaminación y otros servicios de gestión de residuos'),
  ('41', 'division', 'F', 'Construcción de edificios'),
  ('42', 'division', 'F', 'Ingeniería civil'),
  ('43', 'division', 'F', 'Actividades de construcción especializada'),
  ('45', 'division', 'G', 'Venta y reparación de vehículos de motor y motocicletas'),
  ('46', 'division', 'G', 'Comercio al por mayor e intermediarios del comercio, excepto de vehículos de motor y motocicletas'),
  ('47', 'division', 'G', 'Comercio al por menor, excepto de vehículos de motor y motocicletas'),
  ('49', 'division', 'H', 'Transporte terrestre y por tubería'),
  ('50', 'division', 'H', 'Transporte marítimo y por vías navegables interiores'),
  ('51', 'division', 'H', 'Transporte aéreo'),
  ('52', 'division', 'H', 'Almacenamiento y actividades anexas al transporte'),
  ('53', 'division', 'H', 'Actividades postales y de correos'),
  ('55', 'division', 'I', 'Servicios de alojamiento'),
  ('56', 'division', 'I', 'Servicios de comidas y bebidas'),
  ('58', 'division', 'J', 'Edición'),
  ('59', 'division', 'J', 'Actividades cinematográficas, de vídeo y de programas de televisión, grabación de sonido y edición musical'),
  ('60', 'division', 'J', 'Actividades de programación y emisión de radio y televisión'),
  ('61', 'division', 'J', 'Telecomunicaciones'),
  ('62', 'division', 'J', 'Programación, consultoría y otras actividades relacionadas con la informática'),
  ('63', 'division', 'J', 'Servicios de información'),
  ('64', 'division', 'K', 'Servicios financieros, excepto seguros y fondos de pensiones'),
  ('65', 'division', 'K', 'Seguros, reaseguros y fondos de pensiones, excepto Seguridad Social obligatoria'),
  ('66', 'division', 'K', 'Actividades auxiliares a los servicios financieros y a los seguros'),
  ('68', 'division', 'L', 'Actividades inmobiliarias'),
  ('69', 'division', 'M', 'Actividades jurídicas y de contabilidad'),
  ('70', 'division', 'M', 'Actividades de las sedes centrales; actividades de consultoría de gestión empresarial'),
  ('71', 'division', 'M', 'Servicios técnicos de arquitectura e ingeniería; ensayos y análisis técnicos'),
  ('72', 'division', 'M', 'Investigación y desarrollo'),
  ('73', 'division', 'M', 'Publicidad y estudios de mercado'),
  ('74', 'division', 'M', 'Otras actividades profesionales, científicas y técnicas'),
  ('75', 'division', 'M', 'Actividades veterinarias'),
  ('77', 'division', 'N', 'Actividades de alquiler'),
  ('78', 'division', 'N', 'Actividades relacionadas con el empleo'),
  ('79', 'division', 'N', 'Actividades de agencias de viajes, operadores turísticos, servicios de reservas y actividades relacionadas con los mismos'),
  ('80', 'division', 'N', 'Actividades de seguridad e investigación'),
  ('81', 'division', 'N', 'Servicios a edificios y actividades de jardinería'),
  ('82', 'division', 'N', 'Actividades administrativas de oficina y otras actividades auxiliares a las empresas'),
  ('84', 'division', 'O', 'Administración Pública y defensa; Seguridad Social obligatoria'),
  ('85', 'division', 'P', 'Educación'),
  ('86', 'division', 'Q', 'Actividades sanitarias'),
  ('87', 'division', 'Q', 'Asistencia en establecimientos residenciales'),
  ('88', 'division', 'Q', 'Actividades de servicios sociales sin alojamiento'),
  ('90', 'division', 'R', 'Actividades de creación, artísticas y espectáculos'),
  ('91', 'division', 'R', 'Actividades de bibliotecas, archivos, museos y otras actividades culturales'),
  ('92', 'division', 'R', 'Actividades de juegos de azar y apuestas'),
  ('93', 'division', 'R', 'Actividades deportivas, recreativas y de entretenimiento'),
  ('94', 'division', 'S', 'Actividades asociativas'),
  ('95', 'division', 'S', 'Reparación de ordenadores, efectos personales y artículos de uso doméstico'),
  ('96', 'division', 'S', 'Otros servicios personales'),
  ('97', 'division', 'T', 'Actividades de los hogares como empleadores de personal doméstico'),
  ('98', 'division', 'T', 'Actividades de los hogares como productores de bienes y servicios para uso propio'),
  ('99', 'division', 'U', 'Actividades de organizaciones y organismos extraterritoriales');

create trigger trg_cnae_activities_updated_at before update on public.cnae_activities
  for each row execute function private.touch_updated_at();

revoke all on table public.cnae_activities from anon;
revoke insert, update, delete, truncate, references, trigger on table public.cnae_activities from authenticated;
grant select on table public.cnae_activities to authenticated;
alter table public.cnae_activities enable row level security;
create policy cnae_activities_select on public.cnae_activities for select to authenticated using (true);
