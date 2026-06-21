-- ============================================================
-- Migration: add_updated_at_triggers_2026_06
-- Description: Mantener updated_at automáticamente vía trigger en lugar
--              de depender de que cada UPDATE del backend lo setee a mano
--              (hoy es inconsistente: algunos updates lo omiten).
--
-- HOW TO RUN:
--   Pega todo este archivo en el SQL Editor de Supabase y ejecuta.
--   Idempotente: CREATE OR REPLACE + DROP TRIGGER IF EXISTS.
-- ============================================================

BEGIN;

-- Función genérica: pone updated_at = now() en cada UPDATE.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tablas con columna updated_at. El BEFORE UPDATE sobreescribe cualquier
-- valor manual, así que los set_updated_at del backend quedan redundantes
-- (no hace falta eliminarlos: son inofensivos).

DROP TRIGGER IF EXISTS trg_set_updated_at ON trip;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON trip
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at ON stop;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON stop
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at ON subscriptions;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at ON trip_reviews;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON trip_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at ON reservation_attachments;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON reservation_attachments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
