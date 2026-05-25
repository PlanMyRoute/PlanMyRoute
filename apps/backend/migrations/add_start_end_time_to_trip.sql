-- Migración: añadir start_time y end_time a la tabla trip
-- trip.start_date es tipo DATE (sin hora), por lo que la hora de partida/llegada
-- se perdía al guardar. Estas columnas almacenan la hora en formato "HH:MM".
-- Se usan al crear las paradas de origen y destino para asignar la hora correcta.

ALTER TABLE trip
ADD COLUMN IF NOT EXISTS start_time TEXT DEFAULT NULL;

ALTER TABLE trip
ADD COLUMN IF NOT EXISTS end_time TEXT DEFAULT NULL;
