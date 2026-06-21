-- ============================================================
-- Migration: rewrite_route_policies_and_drop_2026_06
-- Description: Reescribe las 5 políticas RLS que aún dependían de la
--              tabla `route` para que usen stop.trip_id directamente, y
--              después elimina `route`.
--
--              Sustituye a la SECCIÓN 2 de remove_route_table_2026_06.sql
--              (no ejecutes aquel DROP suelto; usa este archivo).
--
-- CONTEXTO: las políticas comprobaban la pertenencia al viaje vía
--   travelers ⋈ route WHERE route.origin_id/destination_id = <stop_id>.
--   Como stop.trip_id ya es la fuente de verdad, se cambia a
--   travelers ⋈ stop WHERE stop.id = <stop_id> (equivalente y más simple).
--
-- IMPORTANTE:
--   * Ejecutar SOLO tras desplegar el backend que ya no usa `route`.
--   * En storage.objects el primer folder del path es el STOP_ID, y
--     `objects.name` va cualificado a propósito (stop también tiene `name`).
-- ============================================================

BEGIN;

-- ============================================================
-- reservation_attachments
-- ============================================================

DROP POLICY IF EXISTS "Los usuarios pueden ver adjuntos de sus viajes"
  ON public.reservation_attachments;
CREATE POLICY "Los usuarios pueden ver adjuntos de sus viajes"
  ON public.reservation_attachments FOR SELECT
  USING (
    auth.uid() IN (
      SELECT t.user_id
      FROM travelers t
      JOIN stop s ON s.trip_id = t.trip_id
      WHERE s.id = reservation_attachments.stop_id
    )
  );

DROP POLICY IF EXISTS "Los usuarios pueden crear adjuntos en sus viajes"
  ON public.reservation_attachments;
CREATE POLICY "Los usuarios pueden crear adjuntos en sus viajes"
  ON public.reservation_attachments FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND auth.uid() IN (
      SELECT t.user_id
      FROM travelers t
      JOIN stop s ON s.trip_id = t.trip_id
      WHERE s.id = reservation_attachments.stop_id
    )
  );

-- ============================================================
-- storage.objects (bucket 'reservation-attachments')
-- El path tiene la forma {stopId}/...  → folder[1] = stop_id.
-- ============================================================

DROP POLICY IF EXISTS "Los usuarios pueden subir archivos de sus propios viajes"
  ON storage.objects;
CREATE POLICY "Los usuarios pueden subir archivos de sus propios viajes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reservation-attachments'
    AND auth.uid() IN (
      SELECT t.user_id
      FROM travelers t
      JOIN stop s ON s.trip_id = t.trip_id
      WHERE s.id::text = (storage.foldername(objects.name))[1]
    )
  );

DROP POLICY IF EXISTS "Los usuarios pueden ver archivos de sus viajes"
  ON storage.objects;
CREATE POLICY "Los usuarios pueden ver archivos de sus viajes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reservation-attachments'
    AND auth.uid() IN (
      SELECT t.user_id
      FROM travelers t
      JOIN stop s ON s.trip_id = t.trip_id
      WHERE s.id::text = (storage.foldername(objects.name))[1]
    )
  );

DROP POLICY IF EXISTS "Los usuarios pueden eliminar archivos de sus viajes"
  ON storage.objects;
CREATE POLICY "Los usuarios pueden eliminar archivos de sus viajes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'reservation-attachments'
    AND auth.uid() IN (
      SELECT t.user_id
      FROM travelers t
      JOIN stop s ON s.trip_id = t.trip_id
      WHERE s.id::text = (storage.foldername(objects.name))[1]
    )
  );

COMMIT;

-- ============================================================
-- Ahora sí, sin dependencias: eliminar la tabla route.
-- ============================================================
DROP TABLE IF EXISTS public.route;
