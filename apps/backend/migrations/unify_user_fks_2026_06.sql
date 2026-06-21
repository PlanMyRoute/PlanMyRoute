-- ============================================================
-- Migration: unify_user_fks_2026_06
-- Description: Estandariza TODAS las FK de usuario para que apunten a
--              public.user(id) en lugar de a auth.users(id).
--
--              public.user ya referencia auth.users(id) (1 fila por usuario,
--              creada por trigger en el signup), así que la cadena queda
--              tabla → public.user → auth.users. Esto unifica el modelo y
--              permite joins/embeds de PostgREST de forma homogénea.
--
--              Tablas afectadas (hoy → auth.users):
--                subscriptions, user_usage, referrals (x2),
--                token_wallet, token_transaction, event_chat_message,
--                ai_generation_log.
--
-- HOW TO RUN:
--   1. Ejecuta primero la SECCIÓN 0 (diagnóstico). Debe devolver 0 en todas
--      las filas. Si alguna columna tiene huérfanos (>0), resuélvelos antes
--      (falta su fila en public.user) o la SECCIÓN 1 hará rollback.
--   2. Ejecuta la SECCIÓN 1 (transaccional). Es atómica: si algún ADD
--      CONSTRAINT falla por huérfanos, revierte todo y la BD queda intacta.
-- ============================================================

-- ============================================================
-- SECCIÓN 0 — Diagnóstico de huérfanos (ejecutar y revisar; todo a 0)
-- Cuenta filas cuyo user_id NO existe en public.user.
-- ============================================================
SELECT 'subscriptions'      AS tabla, 'user_id'      AS columna, count(*) AS huerfanos FROM subscriptions      s  WHERE s.user_id      IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user u WHERE u.id = s.user_id)
UNION ALL
SELECT 'user_usage',        'user_id',       count(*) FROM user_usage        uu WHERE uu.user_id     IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user u WHERE u.id = uu.user_id)
UNION ALL
SELECT 'referrals',         'referrer_id',   count(*) FROM referrals         r  WHERE r.referrer_id  IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user u WHERE u.id = r.referrer_id)
UNION ALL
SELECT 'referrals',         'referee_id',    count(*) FROM referrals         r  WHERE r.referee_id   IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user u WHERE u.id = r.referee_id)
UNION ALL
SELECT 'token_wallet',      'user_id',       count(*) FROM token_wallet      tw WHERE tw.user_id     IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user u WHERE u.id = tw.user_id)
UNION ALL
SELECT 'token_transaction', 'user_id',       count(*) FROM token_transaction tt WHERE tt.user_id     IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user u WHERE u.id = tt.user_id)
UNION ALL
SELECT 'event_chat_message','user_id',       count(*) FROM event_chat_message ec WHERE ec.user_id    IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user u WHERE u.id = ec.user_id)
UNION ALL
SELECT 'ai_generation_log', 'user_id',       count(*) FROM ai_generation_log ag WHERE ag.user_id     IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user u WHERE u.id = ag.user_id);

-- ============================================================
-- SECCIÓN 1 — Reapuntar las FK a public.user(id) (transaccional)
-- Se conservan los nombres de constraint y el comportamiento ON DELETE
-- por defecto (NO ACTION), para no alterar la semántica existente.
-- ============================================================
BEGIN;

-- subscriptions.user_id
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user(id);

-- user_usage.user_id
ALTER TABLE user_usage DROP CONSTRAINT IF EXISTS user_usage_user_id_fkey;
ALTER TABLE user_usage
  ADD CONSTRAINT user_usage_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user(id);

-- referrals.referrer_id / referrals.referee_id
ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;
ALTER TABLE referrals
  ADD CONSTRAINT referrals_referrer_id_fkey
  FOREIGN KEY (referrer_id) REFERENCES public.user(id);

ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referee_id_fkey;
ALTER TABLE referrals
  ADD CONSTRAINT referrals_referee_id_fkey
  FOREIGN KEY (referee_id) REFERENCES public.user(id);

-- token_wallet.user_id
ALTER TABLE token_wallet DROP CONSTRAINT IF EXISTS token_wallet_user_id_fkey;
ALTER TABLE token_wallet
  ADD CONSTRAINT token_wallet_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user(id);

-- token_transaction.user_id
ALTER TABLE token_transaction DROP CONSTRAINT IF EXISTS token_transaction_user_id_fkey;
ALTER TABLE token_transaction
  ADD CONSTRAINT token_transaction_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user(id);

-- event_chat_message.user_id
ALTER TABLE event_chat_message DROP CONSTRAINT IF EXISTS event_chat_message_user_id_fkey;
ALTER TABLE event_chat_message
  ADD CONSTRAINT event_chat_message_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user(id);

-- ai_generation_log.user_id (trip_id se mantiene igual)
ALTER TABLE ai_generation_log DROP CONSTRAINT IF EXISTS ai_generation_log_user_id_fkey;
ALTER TABLE ai_generation_log
  ADD CONSTRAINT ai_generation_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user(id);

COMMIT;
