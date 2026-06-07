-- ============================================================
-- Migration: add_token_system_2026_06
-- Description: Hybrid monetization — AI token wallet + ledger.
--              Adds token_wallet (cached balance), token_transaction
--              (audit ledger), atomic grant/spend RPCs, a welcome-bonus
--              trigger on user creation, backfill, and RLS.
--
-- HOW TO RUN:
--   1. Paste the whole file in the Supabase SQL Editor and run.
--   2. Idempotent: safe to re-run (IF NOT EXISTS / ON CONFLICT / guards).
--   3. After running, regenerate types:
--        cd packages/types && npx supabase gen types typescript ... > supabase.ts
-- ============================================================

BEGIN;

-- ============================================================
-- SECTION 1: Enum de tipos de transacción (sources + sinks)
-- ============================================================
DO $$ BEGIN
    CREATE TYPE token_transaction_type AS ENUM (
        -- Sources
        'WELCOME_BONUS',
        'PURCHASE_BASIC',
        'PURCHASE_STANDARD',
        'PURCHASE_TRAVELER',
        'REMOVE_ADS_BONUS',
        'PREMIUM_ANNUAL_GRANT',
        'ADMIN_GRANT',
        'REFUND',
        -- Sinks
        'GENERATE_TRIP',
        'ADDON_ROUNDTRIP',
        'ADDON_REFUEL',
        'MODIFY_TRIP',
        'POI_RECOMMENDATION'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SECTION 2: Tablas
-- ============================================================

-- Wallet: saldo cacheado (1 fila por usuario). Fuente de verdad auditable = ledger.
CREATE TABLE IF NOT EXISTS token_wallet (
    user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance    INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ledger: histórico inmutable de movimientos (amount con signo).
CREATE TABLE IF NOT EXISTS token_transaction (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type          token_transaction_type NOT NULL,
    amount        INTEGER NOT NULL,          -- positivo = ingreso, negativo = gasto
    balance_after INTEGER NOT NULL,
    reference     JSONB,                     -- p.ej. {"trip_id":1}, {"payment_intent":"pi_.."}, {"invoice_id":"in_.."}
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_transaction_user      ON token_transaction(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transaction_created   ON token_transaction(user_id, created_at DESC);

-- ============================================================
-- SECTION 3: RPC grant_tokens — suma atómica + ledger (idempotente por reference)
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_tokens(
    p_user_id   UUID,
    p_amount    INTEGER,
    p_type      token_transaction_type,
    p_reference JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'grant_tokens: p_amount debe ser positivo (recibido %)', p_amount;
    END IF;

    -- Idempotencia: si ya existe un movimiento de este tipo con la misma referencia, no duplicar.
    IF p_reference IS NOT NULL AND EXISTS (
        SELECT 1 FROM token_transaction
        WHERE type = p_type AND reference = p_reference
    ) THEN
        SELECT balance INTO v_balance FROM token_wallet WHERE user_id = p_user_id;
        RETURN COALESCE(v_balance, 0);
    END IF;

    -- Asegurar wallet y bloquear la fila.
    INSERT INTO token_wallet (user_id, balance) VALUES (p_user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;

    SELECT balance INTO v_balance FROM token_wallet WHERE user_id = p_user_id FOR UPDATE;

    v_balance := v_balance + p_amount;

    UPDATE token_wallet SET balance = v_balance, updated_at = NOW() WHERE user_id = p_user_id;

    INSERT INTO token_transaction (user_id, type, amount, balance_after, reference)
        VALUES (p_user_id, p_type, p_amount, v_balance, p_reference);

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SECTION 4: RPC spend_tokens — descuento atómico con validación de saldo
-- Lanza 'INSUFFICIENT_TOKENS' si no hay saldo. El backend lo captura.
-- ============================================================
CREATE OR REPLACE FUNCTION public.spend_tokens(
    p_user_id   UUID,
    p_amount    INTEGER,
    p_type      token_transaction_type,
    p_reference JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'spend_tokens: p_amount debe ser positivo (recibido %)', p_amount;
    END IF;

    INSERT INTO token_wallet (user_id, balance) VALUES (p_user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;

    SELECT balance INTO v_balance FROM token_wallet WHERE user_id = p_user_id FOR UPDATE;

    IF v_balance < p_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_TOKENS' USING DETAIL = format('balance=%s required=%s', v_balance, p_amount);
    END IF;

    v_balance := v_balance - p_amount;

    UPDATE token_wallet SET balance = v_balance, updated_at = NOW() WHERE user_id = p_user_id;

    INSERT INTO token_transaction (user_id, type, amount, balance_after, reference)
        VALUES (p_user_id, p_type, -p_amount, v_balance, p_reference);

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SECTION 5: Trigger — wallet + WELCOME_BONUS al crear usuario
-- (análogo a on_user_created_subscription)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_token_wallet()
RETURNS TRIGGER AS $$
BEGIN
    -- 20 tokens de bienvenida. grant_tokens crea el wallet si no existe.
    PERFORM public.grant_tokens(NEW.id, 20, 'WELCOME_BONUS', NULL);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created_token_wallet ON public.user;
CREATE TRIGGER on_user_created_token_wallet
    AFTER INSERT ON public.user
    FOR EACH ROW
    EXECUTE FUNCTION public.create_token_wallet();

-- ============================================================
-- SECTION 6: Backfill
-- ============================================================

-- 6a. Welcome bonus para usuarios existentes sin wallet.
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT u.id FROM public.user u
        LEFT JOIN token_wallet w ON w.user_id = u.id
        WHERE w.user_id IS NULL
    LOOP
        PERFORM public.grant_tokens(r.id, 20, 'WELCOME_BONUS', NULL);
    END LOOP;
END $$;

-- 6b. Grant anual (1000) a suscriptores premium activos actuales (una sola vez).
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT user_id FROM subscriptions
        WHERE tier = 'premium'
          AND status IN ('active', 'trialing')
    LOOP
        PERFORM public.grant_tokens(r.user_id, 1000, 'PREMIUM_ANNUAL_GRANT',
            jsonb_build_object('backfill', true, 'user_id', r.user_id));
    END LOOP;
END $$;

-- ============================================================
-- SECTION 7: RLS — cada usuario ve solo su wallet y sus movimientos.
-- Las escrituras van por las RPC (SECURITY DEFINER) y el service role.
-- ============================================================
ALTER TABLE token_wallet      ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transaction ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "token_wallet_select_own" ON token_wallet;
CREATE POLICY "token_wallet_select_own"
    ON token_wallet FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "token_transaction_select_own" ON token_transaction;
CREATE POLICY "token_transaction_select_own"
    ON token_transaction FOR SELECT
    USING (user_id = auth.uid());

-- ============================================================
-- SECTION 8: Permisos
-- ============================================================
GRANT SELECT ON token_wallet      TO authenticated;
GRANT SELECT ON token_transaction TO authenticated;

COMMENT ON TABLE  token_wallet      IS 'Saldo de tokens de IA por usuario (cache). Ledger = token_transaction.';
COMMENT ON TABLE  token_transaction IS 'Histórico inmutable de movimientos de tokens (auditoría).';
COMMENT ON FUNCTION public.spend_tokens IS 'Descuenta tokens de forma atómica; lanza INSUFFICIENT_TOKENS si no hay saldo.';
COMMENT ON FUNCTION public.grant_tokens IS 'Concede tokens de forma atómica; idempotente por (type, reference).';

COMMIT;
