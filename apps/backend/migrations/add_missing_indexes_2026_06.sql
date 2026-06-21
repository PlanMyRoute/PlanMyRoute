-- ============================================================
-- Migration: add_missing_indexes_2026_06
-- Description: Add indexes for query patterns not covered by
--              db_optimization_2026_05_27. Each index below maps
--              to a concrete filter/order used by the backend.
--
-- HOW TO RUN:
--   Pega todo este archivo en el SQL Editor de Supabase y ejecuta.
--   CREATE INDEX IF NOT EXISTS es idempotente: seguro re-ejecutar.
-- ============================================================

-- road_trip: getVehiclesInTrip filtra por id_trip
-- (trips.service.ts:518). La PK es (id, id_vehicle, id_trip), así que
-- id_trip NO es prefijo usable → sin este índice hace seq scan.
CREATE INDEX IF NOT EXISTS idx_road_trip_id_trip
  ON road_trip(id_trip);

-- event_chat_message: getMessages filtra por ticketmaster_event_id
-- y ordena por created_at DESC (eventChat.service.ts:21-22).
CREATE INDEX IF NOT EXISTS idx_event_chat_event_created
  ON event_chat_message(ticketmaster_event_id, created_at DESC);

-- token_transaction: listado paginado por usuario ordenado por fecha
-- (tokenWalletService.ts:171-172).
CREATE INDEX IF NOT EXISTS idx_token_transaction_user_created
  ON token_transaction(user_id, created_at DESC);

-- referrals: lookup de referido existente por referee_id
-- (subscriptions.service.ts:93).
CREATE INDEX IF NOT EXISTS idx_referrals_referee_id
  ON referrals(referee_id);
