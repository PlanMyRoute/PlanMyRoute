-- Migración CRÍTICA: añadir trip_id a la tabla stop
-- Sin esta columna, los stops solo son detectables atravesando la tabla route,
-- lo que causa que stops sin ruta (por race conditions en creación paralela)
-- sean invisibles en la interfaz.
-- Con trip_id, todos los stops son directamente consultables por viaje.

ALTER TABLE stop
ADD COLUMN IF NOT EXISTS trip_id INTEGER REFERENCES trip(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_stop_trip_id ON stop(trip_id);
