-- Migración: añadir generation_status a la tabla trip
-- Permite que el backend responda inmediatamente al crear viajes con IA
-- y genere las paradas en background.
--
-- generation_status valores:
--   'pending'    - estado inicial (no usado actualmente, reservado)
--   'generating' - paradas IA en generación en background
--   'ready'      - viaje completamente generado
--   'failed'     - error en la generación (el viaje base existe pero sin paradas IA)

ALTER TABLE trip
ADD COLUMN IF NOT EXISTS generation_status TEXT
    CHECK (generation_status IN ('pending', 'generating', 'ready', 'failed'))
    DEFAULT 'ready'
    NOT NULL;

-- Backfill: todos los viajes existentes ya están completos
UPDATE trip SET generation_status = 'ready' WHERE generation_status IS NULL OR generation_status = '';
