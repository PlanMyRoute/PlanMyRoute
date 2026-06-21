-- ============================================================
-- Migration: fix_user_delete_cascade_2026_06
-- Description: Completa la cadena de borrado de un usuario. Hoy
--              public.user → auth.users es CASCADE, pero el borrado de
--              public.user lo bloquean varias FK hijas en NO ACTION, lo
--              que hace que la limpieza de invitados (auth.admin.deleteUser)
--              falle silenciosamente.
--
--              Se ajusta cada FK al comportamiento correcto:
--                * CASCADE  → estado/contenido por-usuario que muere con él.
--                * SET NULL → registros que queremos CONSERVAR (logs de
--                             analítica y adjuntos del viaje) pero sin el
--                             vínculo al usuario borrado (columnas nullable).
--
--              NO se tocan subscriptions ni token_transaction (ledger
--              financiero): se dejan en NO ACTION a propósito, como salvaguarda
--              para no borrar historial de pagos automáticamente. Un invitado
--              no tiene filas ahí, así que no bloquean su limpieza. Para el
--              borrado de cuentas reales con pagos, gestionarlo de forma
--              deliberada aparte.
--
-- HOW TO RUN: pega el archivo en el SQL Editor de Supabase y ejecuta.
-- ============================================================

BEGIN;

-- CASCADE: estado/contenido por-usuario
ALTER TABLE user_usage DROP CONSTRAINT IF EXISTS user_usage_user_id_fkey;
ALTER TABLE user_usage
  ADD CONSTRAINT user_usage_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user(id) ON DELETE CASCADE;

ALTER TABLE token_wallet DROP CONSTRAINT IF EXISTS token_wallet_user_id_fkey;
ALTER TABLE token_wallet
  ADD CONSTRAINT token_wallet_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user(id) ON DELETE CASCADE;

ALTER TABLE event_chat_message DROP CONSTRAINT IF EXISTS event_chat_message_user_id_fkey;
ALTER TABLE event_chat_message
  ADD CONSTRAINT event_chat_message_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user(id) ON DELETE CASCADE;

ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;
ALTER TABLE referrals
  ADD CONSTRAINT referrals_referrer_id_fkey
  FOREIGN KEY (referrer_id) REFERENCES public.user(id) ON DELETE CASCADE;

ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referee_id_fkey;
ALTER TABLE referrals
  ADD CONSTRAINT referrals_referee_id_fkey
  FOREIGN KEY (referee_id) REFERENCES public.user(id) ON DELETE CASCADE;

-- SET NULL: conservar el registro, soltar el vínculo (columnas nullable)
ALTER TABLE ai_generation_log DROP CONSTRAINT IF EXISTS ai_generation_log_user_id_fkey;
ALTER TABLE ai_generation_log
  ADD CONSTRAINT ai_generation_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user(id) ON DELETE SET NULL;

ALTER TABLE reservation_attachments DROP CONSTRAINT IF EXISTS reservation_attachments_uploaded_by_fkey;
ALTER TABLE reservation_attachments
  ADD CONSTRAINT reservation_attachments_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES public.user(id) ON DELETE SET NULL;

COMMIT;
