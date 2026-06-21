-- ============================================================
-- Migration: remove_route_table_2026_06
-- Description: Elimina la tabla `route` como entidad. El orden del
--              itinerario ya vive en stop(day, position); la distancia
--              de cada segmento pasa a stop.distance_to_next_meters.
--
--              La tabla `route` no la consume el frontend (sus métodos
--              de servicio estaban muertos) y su `distance` estaba mal
--              calculada (coordenadas {latitude,longitude} vs {lat,lng}),
--              así que no hay datos útiles que migrar.
--
-- HOW TO RUN (en DOS pasos):
--   PASO 1 (AHORA): ejecuta la SECCIÓN 1. Añade la columna; el backend
--          nuevo empieza a rellenarla y deja de leer/escribir `route`.
--   PASO 2 (TRAS DESPLEGAR el backend que ya no usa `route`): ejecuta la
--          SECCIÓN 2 para eliminar la tabla. Hacerlo antes rompería el
--          backend antiguo aún en ejecución.
-- ============================================================

-- ============================================================
-- SECCIÓN 1 — Ejecutar AHORA (antes/junto con el deploy)
-- ============================================================
ALTER TABLE stop
  ADD COLUMN IF NOT EXISTS distance_to_next_meters double precision;

-- ============================================================
-- SECCIÓN 2 — Ejecutar SOLO tras desplegar el backend nuevo
-- ============================================================
-- NO ejecutes un DROP suelto: la tabla `route` aún tiene 5 políticas RLS
-- que dependen de ella (reservation_attachments y storage.objects).
-- Usa la migración rewrite_route_policies_and_drop_2026_06.sql, que primero
-- reescribe esas políticas para usar stop.trip_id y luego dropea `route`.
-- DROP TABLE IF EXISTS public.route;  -- ← obsoleto, ver migración mencionada
