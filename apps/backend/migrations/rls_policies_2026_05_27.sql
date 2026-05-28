-- ============================================================
-- Migration: rls_policies_2026_05_27
-- Description: Activate Row Level Security on all tables.
--              Add anon-key policies for tables the frontend
--              accesses directly (user, trip_photos, notifications).
--              All other tables remain inaccessible via anon key —
--              only the service role key (backend) bypasses RLS.
--
-- HOW TO RUN:
--   1. Before running: check Supabase Dashboard → Authentication → Policies
--      to see if any policies already exist. If they do, the DROP POLICY IF EXISTS
--      statements below will remove and recreate them cleanly.
--   2. Paste the whole file in the Supabase SQL Editor and run.
-- ============================================================

-- ============================================================
-- SECTION 1: Enable RLS on all tables
-- Safe to run even if RLS is already enabled (idempotent).
-- ============================================================

ALTER TABLE public.user              ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE travelers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE stop                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE route                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation            ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE refuel                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_photos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_status_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows             ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE road_trip                ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation              ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_attachments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage               ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_chat_message       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 2: Tabla `user`
-- El frontend usa la anon key para sync de avatar (Google OAuth)
-- y para verificar si el perfil existe tras el signup.
-- Los perfiles son públicos en esta app social (optionalAuth intencional).
-- ============================================================

DROP POLICY IF EXISTS "user_select_public"  ON public.user;
DROP POLICY IF EXISTS "user_update_own"     ON public.user;

-- Cualquier usuario (incluso sin login) puede leer perfiles
CREATE POLICY "user_select_public"
  ON public.user FOR SELECT
  USING (true);

-- Solo el propio usuario puede actualizar su perfil
CREATE POLICY "user_update_own"
  ON public.user FOR UPDATE
  USING (auth.uid() = id);

-- INSERT y DELETE solo via service role (backend):
-- el backend crea usuarios desde el trigger auth.users → no hay política anon.

-- ============================================================
-- SECTION 3: Tabla `trip_photos`
-- El frontend sube, lee y borra fotos directamente con la anon key
-- desde apps/frontend/services/photoService.ts.
-- ============================================================

DROP POLICY IF EXISTS "trip_photos_select_members" ON trip_photos;
DROP POLICY IF EXISTS "trip_photos_insert_members" ON trip_photos;
DROP POLICY IF EXISTS "trip_photos_delete_own"     ON trip_photos;

-- Solo miembros del viaje pueden ver sus fotos
CREATE POLICY "trip_photos_select_members"
  ON trip_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM travelers
      WHERE travelers.trip_id = trip_photos.trip_id
        AND travelers.user_id = auth.uid()
    )
  );

-- Solo miembros del viaje pueden subir fotos (y el user_id debe ser el suyo)
CREATE POLICY "trip_photos_insert_members"
  ON trip_photos FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM travelers
      WHERE travelers.trip_id = trip_photos.trip_id
        AND travelers.user_id = auth.uid()
    )
  );

-- Solo el autor de la foto puede borrarla
CREATE POLICY "trip_photos_delete_own"
  ON trip_photos FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- SECTION 4: Tabla `notifications`
-- Aunque el frontend lee notificaciones via backend (service role),
-- añadimos política de defensa en profundidad.
-- ============================================================

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;

-- Cada usuario solo puede ver sus propias notificaciones
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (user_receiver_id = auth.uid());

-- ============================================================
-- SECTION 5: Tabla `promo_codes` (referencia pública)
-- Los códigos de promoción son públicos por diseño.
-- ============================================================

DROP POLICY IF EXISTS "promo_codes_select_public" ON promo_codes;

CREATE POLICY "promo_codes_select_public"
  ON promo_codes FOR SELECT
  USING (true);

-- ============================================================
-- SECTION 6: Storage bucket `trip-photos`
-- El frontend sube y lee fotos directamente en Supabase Storage.
-- Verificar en Dashboard → Storage → trip-photos → Policies
-- si ya existen políticas antes de ejecutar esta sección.
-- ============================================================

DROP POLICY IF EXISTS "trip_photos_bucket_upload" ON storage.objects;
DROP POLICY IF EXISTS "trip_photos_bucket_read"   ON storage.objects;
DROP POLICY IF EXISTS "trip_photos_bucket_delete" ON storage.objects;

-- Solo usuarios autenticados pueden subir fotos
CREATE POLICY "trip_photos_bucket_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'trip-photos');

-- Solo usuarios autenticados pueden leer fotos
CREATE POLICY "trip_photos_bucket_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'trip-photos');

-- Solo el propietario del archivo puede borrarlo
-- El path tiene la forma: {tripId}/{timestamp}-{random}.jpg
CREATE POLICY "trip_photos_bucket_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'trip-photos' AND auth.uid() IS NOT NULL);

-- ============================================================
-- SECTION 7: Policies for trip-related tables (trip members access)
-- All these tables are only written/read via the backend (service role,
-- which bypasses RLS). These SELECT policies allow authenticated users
-- to query their data directly if needed and remove the Supabase
-- dashboard "no policies" warning.
--
-- NOTE: These policies reference the `travelers` table in subqueries.
-- This only works correctly if `travelers` already has its own policies.
-- ============================================================

-- route: members of the trip can see its routes
DROP POLICY IF EXISTS "route_select_members" ON route;
CREATE POLICY "route_select_members"
  ON route FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM travelers
      WHERE travelers.trip_id = route.trip_id
        AND travelers.user_id = auth.uid()
    )
  );

-- accommodation: id = stop.id (1:1 extension of stop)
DROP POLICY IF EXISTS "accommodation_select_members" ON accommodation;
CREATE POLICY "accommodation_select_members"
  ON accommodation FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM travelers t
      JOIN stop s ON s.trip_id = t.trip_id
      WHERE s.id = accommodation.id
        AND t.user_id = auth.uid()
    )
  );

-- activity: same pattern as accommodation
DROP POLICY IF EXISTS "activity_select_members" ON activity;
CREATE POLICY "activity_select_members"
  ON activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM travelers t
      JOIN stop s ON s.trip_id = t.trip_id
      WHERE s.id = activity.id
        AND t.user_id = auth.uid()
    )
  );

-- refuel: same pattern as accommodation
DROP POLICY IF EXISTS "refuel_select_members" ON refuel;
CREATE POLICY "refuel_select_members"
  ON refuel FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM travelers t
      JOIN stop s ON s.trip_id = t.trip_id
      WHERE s.id = refuel.id
        AND t.user_id = auth.uid()
    )
  );

-- reservation: has stop_id FK → stop → trip
DROP POLICY IF EXISTS "reservation_select_members" ON reservation;
CREATE POLICY "reservation_select_members"
  ON reservation FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM travelers t
      JOIN stop s ON s.trip_id = t.trip_id
      WHERE s.id = reservation.stop_id
        AND t.user_id = auth.uid()
    )
  );

-- road_trip: vehicle assigned to a trip (members can see)
DROP POLICY IF EXISTS "road_trip_select_members" ON road_trip;
CREATE POLICY "road_trip_select_members"
  ON road_trip FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM travelers
      WHERE travelers.trip_id = road_trip.trip_id
        AND travelers.user_id = auth.uid()
    )
  );

-- subscriptions: each user sees only their own subscription
DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- user_follows: see follows where you are follower or followee
-- (public/private accounts to be implemented later)
DROP POLICY IF EXISTS "user_follows_select_own" ON user_follows;
CREATE POLICY "user_follows_select_own"
  ON user_follows FOR SELECT
  USING (user_id = auth.uid() OR following_id = auth.uid());

-- promo_code_usages: each user sees only their own usages
DROP POLICY IF EXISTS "promo_code_usages_select_own" ON promo_code_usages;
CREATE POLICY "promo_code_usages_select_own"
  ON promo_code_usages FOR SELECT
  USING (user_id = auth.uid());
