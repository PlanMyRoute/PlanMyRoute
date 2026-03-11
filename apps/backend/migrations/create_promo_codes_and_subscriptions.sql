-- ============================================
-- MIGRACIÓN: Auto-creación de suscripción FREE y códigos promocionales
-- ============================================

-- 1. Verificar que exista la tabla subscriptions (debería existir)
-- Si no existe, crearla
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL DEFAULT 'free',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    is_trial BOOLEAN DEFAULT false,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);

-- 4. Función para crear suscripción FREE automáticamente
CREATE OR REPLACE FUNCTION public.create_free_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Insertar suscripción FREE si no existe
    INSERT INTO subscriptions (
        user_id,
        tier,
        status,
        current_period_start,
        current_period_end,
        stripe_subscription_id,
        stripe_customer_id
    ) VALUES (
        NEW.id,
        'free',
        'active',
        NOW(),
        NULL, -- Sin fecha de expiración para free
        NULL,
        NULL
    )
    ON CONFLICT (user_id) DO NOTHING; -- Si ya existe, no hacer nada
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger para crear suscripción FREE automáticamente
DROP TRIGGER IF EXISTS on_user_created_subscription ON public.user;
CREATE TRIGGER on_user_created_subscription
    AFTER INSERT ON public.user
    FOR EACH ROW
    EXECUTE FUNCTION public.create_free_subscription();

-- 6. La función de canjear códigos ya existe en subscriptions.service.ts
-- Solo necesitamos asegurarnos de que la lógica del backend funcione

-- 7. Insertar códigos promocionales de ejemplo (compatible con estructura existente)
-- Verificar primero si existe la tabla promo_codes, si no, los códigos se agregarán manualmente
INSERT INTO promo_codes (code, duration_days, max_uses, is_active, expiration_date) VALUES
    ('PREMIUM2025', 365, 100, true, NOW() + INTERVAL '1 year'),  -- 1 año de premium, 100 usos
    ('WELCOME30', 30, NULL, true, NULL),    -- 30 días de premium, ilimitado
    ('FOREVER365', 365, 10, true, NULL),    -- 365 días premium, 10 usos
    ('DEV2025', 730, NULL, true, NULL)      -- 2 años premium, usos ilimitados (para desarrollo)
ON CONFLICT (code) DO NOTHING;

-- 8. Dar permisos
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON promo_codes TO authenticated;
GRANT ALL ON promo_code_usages TO authenticated;

-- 9. Crear suscripciones FREE para usuarios existentes que no la tengan
INSERT INTO subscriptions (user_id, tier, status, current_period_start, current_period_end)
SELECT 
    u.id,
    'free',
    'active',
    NOW(),
    NULL
FROM public.user u
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE s.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE promo_codes IS 'Códigos promocionales para activar premium u otras suscripciones';
COMMENT ON TABLE promo_code_redemptions IS 'Registro de códigos canjeados por usuarios';
COMMENT ON FUNCTION redeem_promo_code IS 'Función para canjear códigos promocionales';
