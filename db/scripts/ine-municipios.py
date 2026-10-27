#!/usr/bin/env python3
"""Genera db/seeds/ine-municipios.sql a partir de la relación de municipios del INE.

La relación (a 1 de enero de cada año) se descarga de https://www.ine.es/daco/daco42/codmun/AAcodmun.xlsx
(AA = año con dos dígitos; por ejemplo 26codmun.xlsx). Tiene una hoja por provincia con las columnas
CPRO, CMUN, DC y NOMBRE. Solo usa la biblioteca estándar de Python.

    curl -fsSLO https://www.ine.es/daco/daco42/codmun/26codmun.xlsx
    python3 -I db/scripts/ine-municipios.py 26codmun.xlsx 2026 > db/seeds/ine-municipios.sql
"""
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'


def rows(path):
    book = zipfile.ZipFile(path)
    shared = []
    if 'xl/sharedStrings.xml' in book.namelist():
        for si in ET.fromstring(book.read('xl/sharedStrings.xml')).iter(NS + 'si'):
            shared.append(''.join(t.text or '' for t in si.iter(NS + 't')))
    sheets = [n for n in book.namelist() if re.fullmatch(r'xl/worksheets/sheet\d+\.xml', n)]
    for name in sorted(sheets, key=lambda n: int(re.search(r'sheet(\d+)', n).group(1))):
        for row in ET.fromstring(book.read(name)).iter(NS + 'row'):
            values = []
            for cell in row.iter(NS + 'c'):
                v = cell.find(NS + 'v')
                if cell.get('t') == 'inlineStr':
                    values.append(''.join(t.text or '' for t in cell.iter(NS + 't')))
                elif v is None:
                    values.append('')
                elif cell.get('t') == 's':
                    values.append(shared[int(v.text)])
                else:
                    values.append(v.text)
            yield values


def main():
    if len(sys.argv) != 3 or not re.fullmatch(r'20\d\d', sys.argv[2]):
        sys.exit('Uso: ine-municipios.py AAcodmun.xlsx AÑO')
    path, year = sys.argv[1], sys.argv[2]

    municipalities = {}
    for r in rows(path):
        if len(r) >= 4 and re.fullmatch(r'\d\d', r[0]) and re.fullmatch(r'\d{3}', r[1]):
            assert re.fullmatch(r'\d', r[2]), r
            municipalities[r[0] + r[1]] = (r[2], r[3].strip())
    provinces = {code[:2] for code in municipalities}
    if len(provinces) != 52 or len(municipalities) < 8000:
        sys.exit(f'Relación incompleta: {len(provinces)} provincias, {len(municipalities)} municipios')

    q = lambda s: "'" + s.replace("'", "''") + "'"
    print(f"""-- Municipios del INE: relación a 1 de enero de {year}.
-- Fuente: INE, "Relación de municipios y sus códigos por provincias"
-- (https://www.ine.es/daco/daco42/codmun/{year[2:]}codmun.xlsx). Generado con db/scripts/ine-municipios.py.
--
-- Idempotente: inserta o actualiza los municipios de la relación y marca como inactivos los que ya no
-- figuran (no se borran: direcciones y contratos antiguos los siguen referenciando).
-- Requiere las migraciones de catálogos globales (provincias). {len(municipalities)} municipios.
--
--   docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < db/seeds/ine-municipios.sql

begin;

create temporary table ine_municipalities (
  code char(5) primary key,
  check_digit char(1) not null,
  name varchar(120) not null
) on commit drop;

insert into ine_municipalities (code, check_digit, name) values""")
    print(',\n'.join(f'  ({q(c)}, {q(dc)}, {q(n)})' for c, (dc, n) in sorted(municipalities.items())) + ';')
    print(f"""
insert into public.municipalities (code, province_code, check_digit, name, active, ine_year)
select code, left(code, 2), check_digit, name, true, {year}
from ine_municipalities
on conflict (code) do update
  set check_digit = excluded.check_digit, name = excluded.name, active = true, ine_year = excluded.ine_year
  where (municipalities.check_digit, municipalities.name, municipalities.active, municipalities.ine_year)
    is distinct from (excluded.check_digit, excluded.name, true, excluded.ine_year);

update public.municipalities m set active = false
where m.active and not exists (select 1 from ine_municipalities i where i.code = m.code);

commit;""")


if __name__ == '__main__':
    main()
