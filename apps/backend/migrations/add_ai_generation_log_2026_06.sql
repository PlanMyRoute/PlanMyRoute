-- ============================================================
-- Migration: add_ai_generation_log_2026_06
-- Description: Tabla de telemetría para el motor de generación de
--              itinerarios por IA (TFG — Cap. 6: validación empírica
--              de latencia, coste por token y tasa/tipología de
--              respuestas inválidas o "alucinadas").
--
--              No sustituye ningún sistema de logging existente: es
--              una tabla de medición específica, de bajo acoplamiento,
--              pensada para alimentar análisis agregados (AVG, COUNT
--              GROUP BY outcome, etc.) sin tocar las tablas de negocio.
--
-- HOW TO RUN:
--   1. Pegar el archivo completo en el SQL Editor de Supabase y ejecutar.
--   2. Idempotente: seguro re-ejecutar (IF NOT EXISTS / guards).
--   3. Tras ejecutar, regenerar tipos:
--        cd packages/types && npx supabase gen types typescript ... > supabase.ts
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS ai_generation_log (
    id                 BIGSERIAL PRIMARY KEY,
    trip_id            BIGINT REFERENCES trip(id) ON DELETE SET NULL,
    user_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    model              TEXT NOT NULL,
    latency_ms         INTEGER NOT NULL,

    -- Conteo de tokens devuelto por la propia API de Gemini (usageMetadata).
    -- Se guardan en crudo (no el coste ya calculado) para poder aplicar la
    -- tarifa vigente en el momento de redactar la memoria, citando la fuente.
    prompt_tokens      INTEGER,
    completion_tokens  INTEGER,
    total_tokens       INTEGER,

    -- Resultado de la llamada: éxito o tipo de fallo, para poder cuantificar
    -- la tasa de "alucinación" estructural y clasificarla por causa.
    outcome            TEXT NOT NULL CHECK (outcome IN (
                            'success',           -- JSON válido y estructura correcta
                            'json_parse_error',  -- la IA no devolvió JSON parseable
                            'validation_failed', -- JSON válido pero incumple el contrato (validateItineraryResponse)
                            'api_error'          -- fallo de red/cuota/etc. al llamar a Gemini
                       )),

    -- Anomalías detectadas en respuestas que SÍ pasan la validación estructural
    -- pero contienen datos cuestionables (p. ej. días fuera del rango del viaje).
    -- Formato libre: {"days_out_of_range": [4, 5]}
    quality_flags      JSONB,

    error_message      TEXT,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_log_created_at ON ai_generation_log (created_at);
CREATE INDEX IF NOT EXISTS idx_ai_generation_log_outcome ON ai_generation_log (outcome);

-- RLS: tabla de telemetría interna, no se expone a clientes (el backend usa
-- la service role key y la atraviesa). Se deniega cualquier acceso vía anon/authenticated.
ALTER TABLE ai_generation_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY ai_generation_log_no_client_access ON ai_generation_log
        FOR ALL
        USING (false)
        WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

-- ============================================================
-- Consultas de agregación para el Cap. 6 (ejecutar tras recoger datos):
--
-- Latencia media y tasa de éxito:
--   SELECT outcome, COUNT(*), AVG(latency_ms), AVG(total_tokens)
--   FROM ai_generation_log GROUP BY outcome;
--
-- Desglose temporal de "alucinaciones" (fallos de validación + flags de calidad):
--   SELECT date_trunc('day', created_at) AS day, outcome, COUNT(*)
--   FROM ai_generation_log
--   WHERE outcome <> 'success' OR quality_flags IS NOT NULL
--   GROUP BY 1, 2 ORDER BY 1;
-- ============================================================
