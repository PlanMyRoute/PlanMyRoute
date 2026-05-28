-- ============================================================
-- Migration: db_optimization_2026_05_27
-- Description: Fix type mismatches, add missing constraints,
--              add performance indexes, clean up schema
--
-- HOW TO RUN:
--   Pega todo este archivo en el SQL Editor de Supabase y ejecuta.
--   No hay nada que hacer por separado.
-- ============================================================

BEGIN;

-- ============================================================
-- SECTION 1: Fix column type mismatches
-- ============================================================

-- 1a. trip_photos.trip_id: text → bigint + add missing FK
-- Paso 1: eliminar valores no numéricos (ej. el texto literal "null")
DELETE FROM trip_photos WHERE trip_id IS NULL OR trip_id !~ '^\d+$';

ALTER TABLE trip_photos
  ALTER COLUMN trip_id TYPE bigint USING trip_id::bigint;

-- Paso 2: eliminar fotos huérfanas que apuntan a viajes que ya no existen
DELETE FROM trip_photos WHERE trip_id NOT IN (SELECT id FROM public.trip);

ALTER TABLE trip_photos
  ADD CONSTRAINT trip_photos_trip_id_fkey
  FOREIGN KEY (trip_id) REFERENCES public.trip(id) ON DELETE CASCADE;

-- 1b. stop.trip_id: integer → bigint, add CASCADE, enforce NOT NULL
ALTER TABLE stop DROP CONSTRAINT stop_trip_id_fkey;

ALTER TABLE stop
  ALTER COLUMN trip_id TYPE bigint USING trip_id::bigint;

ALTER TABLE stop
  ADD CONSTRAINT stop_trip_id_fkey
  FOREIGN KEY (trip_id) REFERENCES public.trip(id) ON DELETE CASCADE;

DELETE FROM stop WHERE trip_id IS NULL;
ALTER TABLE stop ALTER COLUMN trip_id SET NOT NULL;

-- OMITIDO: trip_reviews.trip_id integer → bigint
-- Una RLS policy depende de esta columna y PostgreSQL impide el cambio.
-- El riesgo de overflow (>2.100M reviews) es inexistente en la práctica.

-- OMITIDO: reservation_attachments.stop_id integer → bigint
-- Misma razón. La FK funciona correctamente con cast implícito.

-- ============================================================
-- SECTION 2: Fix nullable columns that carry implicit NOT NULL semantics
-- ============================================================

ALTER TABLE trip ALTER COLUMN status SET DEFAULT 'planning';
UPDATE trip SET status = 'planning' WHERE status IS NULL;
ALTER TABLE trip ALTER COLUMN status SET NOT NULL;

ALTER TABLE trip ALTER COLUMN name SET DEFAULT '';
UPDATE trip SET name = '' WHERE name IS NULL;
ALTER TABLE trip ALTER COLUMN name SET NOT NULL;

DELETE FROM vehicle WHERE user_id IS NULL;
ALTER TABLE vehicle ALTER COLUMN user_id SET NOT NULL;

-- ============================================================
-- SECTION 3: Fix route date column types (time → timestamptz)
-- Estas columnas nunca se rellenan en la app (createInitialRoute las omite),
-- así que el cast a NULL no pierde datos reales.
-- ============================================================
ALTER TABLE route
  ALTER COLUMN start_date TYPE timestamptz USING NULL,
  ALTER COLUMN end_date   TYPE timestamptz USING NULL;

-- ============================================================
-- SECTION 4: Add missing constraints
-- ============================================================

ALTER TABLE user_follows
  ADD CONSTRAINT user_follows_unique UNIQUE (user_id, following_id);

ALTER TABLE promo_code_usages
  ADD CONSTRAINT promo_code_usages_unique UNIQUE (user_id, code);

ALTER TABLE promo_code_usages
  ADD CONSTRAINT promo_code_usages_code_fkey
    FOREIGN KEY (code) REFERENCES public.promo_codes(code) ON DELETE CASCADE,
  ADD CONSTRAINT promo_code_usages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.user(id) ON DELETE CASCADE;

-- ============================================================
-- SECTION 5: Drop orphaned / unused structures
-- ============================================================

DROP TABLE IF EXISTS public.trip_photos_backup;

COMMIT;

-- ============================================================
-- SECTION 6: Índices de rendimiento
-- CREATE INDEX (sin CONCURRENTLY) no puede ir dentro de BEGIN/COMMIT,
-- pero sí puede ejecutarse en el mismo script después del COMMIT.
-- En Supabase SQL Editor, ejecuta todo el archivo de una vez: funciona.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_travelers_user_id
  ON travelers(user_id);

CREATE INDEX IF NOT EXISTS idx_stop_trip_day_position
  ON stop(trip_id, day, position);

CREATE INDEX IF NOT EXISTS idx_notifications_receiver_created
  ON notifications(user_receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id
  ON trip_photos(trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_reviews_trip_id
  ON trip_reviews(trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_status_history_trip_id
  ON trip_status_history(trip_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_user_id
  ON vehicle(user_id);

CREATE INDEX IF NOT EXISTS idx_route_trip_id
  ON route(trip_id);

CREATE INDEX IF NOT EXISTS idx_user_follows_following_id
  ON user_follows(following_id);

CREATE INDEX IF NOT EXISTS idx_trip_status_active
  ON trip(status) WHERE status IN ('planning', 'going');

CREATE INDEX IF NOT EXISTS idx_promo_code_usages_code
  ON promo_code_usages(code);
