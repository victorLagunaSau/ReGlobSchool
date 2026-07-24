-- Seed real extraído de tu Firestore (backendpathbooks) el día de la migración.
-- Corre esto DESPUÉS de supabase/migrations/002_profile_location.sql

insert into public.countries (id, name) values
  ('MX', 'México')
on conflict (id) do nothing;

insert into public.states (id, country_id, cve_estado, cod_estado, name) values
  ('MX-AGS', 'MX', 1, 'AGS', 'Aguascalientes'),
  ('MX-BCN', 'MX', 2, 'BCN', 'Baja California'),
  ('MX-BCS', 'MX', 3, 'BCS', 'Baja California Sur'),
  ('MX-CAM', 'MX', 4, 'CAM', 'Campeche'),
  ('MX-COA', 'MX', 5, 'COA', 'Coahuila de Zaragoza'),
  ('MX-COL', 'MX', 6, 'COL', 'Colima'),
  ('MX-CHP', 'MX', 7, 'CHP', 'Chiapas'),
  ('MX-CHH', 'MX', 8, 'CHH', 'Chihuahua'),
  ('MX-CMX', 'MX', 9, 'CMX', 'Ciudad de México'),
  ('MX-DUR', 'MX', 10, 'DUR', 'Durango'),
  ('MX-GUA', 'MX', 11, 'GUA', 'Guanajuato'),
  ('MX-GRO', 'MX', 12, 'GRO', 'Guerrero'),
  ('MX-HID', 'MX', 13, 'HID', 'Hidalgo'),
  ('MX-JAL', 'MX', 14, 'JAL', 'Jalisco'),
  ('MX-MEX', 'MX', 15, 'MEX', 'México'),
  ('MX-MIC', 'MX', 16, 'MIC', 'Michoacán de Ocampo'),
  ('MX-MOR', 'MX', 17, 'MOR', 'Morelos'),
  ('MX-NAY', 'MX', 18, 'NAY', 'Nayarit'),
  ('MX-NLE', 'MX', 19, 'NLE', 'Nuevo León'),
  ('MX-OAX', 'MX', 20, 'OAX', 'Oaxaca'),
  ('MX-PUE', 'MX', 21, 'PUE', 'Puebla'),
  ('MX-QUE', 'MX', 22, 'QUE', 'Querétaro'),
  ('MX-ROO', 'MX', 23, 'ROO', 'Quintana Roo'),
  ('MX-SLP', 'MX', 24, 'SLP', 'San Luis Potosí'),
  ('MX-SIN', 'MX', 25, 'SIN', 'Sinaloa'),
  ('MX-SON', 'MX', 26, 'SON', 'Sonora'),
  ('MX-TAB', 'MX', 27, 'TAB', 'Tabasco'),
  ('MX-TAM', 'MX', 28, 'TAM', 'Tamaulipas'),
  ('MX-TLA', 'MX', 29, 'TLA', 'Tlaxcala'),
  ('MX-VER', 'MX', 30, 'VER', 'Veracruz de Ignacio de la Llave'),
  ('MX-YUC', 'MX', 31, 'YUC', 'Yucatán'),
  ('MX-ZAC', 'MX', 32, 'ZAC', 'Zacatecas')
on conflict (id) do nothing;
