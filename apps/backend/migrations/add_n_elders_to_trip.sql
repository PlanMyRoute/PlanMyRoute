-- Migración (opcional): añadir n_elders a la tabla trip
-- El wizard recoge el número de mayores pero la tabla trip no tenía esta columna,
-- por lo que el valor se perdía silenciosamente en el INSERT.

ALTER TABLE trip
ADD COLUMN IF NOT EXISTS n_elders INTEGER DEFAULT 0;
