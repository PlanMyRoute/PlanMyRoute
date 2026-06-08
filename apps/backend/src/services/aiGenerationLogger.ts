import { supabase } from '../supabase.js';

export type AiGenerationOutcome =
    | 'success'
    | 'json_parse_error'
    | 'validation_failed'
    | 'api_error';

export interface AiGenerationLogEntry {
    tripId?: number | null;
    userId?: string | null;
    model: string;
    latencyMs: number;
    promptTokens?: number | null;
    completionTokens?: number | null;
    totalTokens?: number | null;
    outcome: AiGenerationOutcome;
    qualityFlags?: Record<string, unknown> | null;
    errorMessage?: string | null;
}

/**
 * Registra una llamada al motor de generación de itinerarios para alimentar
 * el análisis empírico del Cap. 6 del TFG (latencia, coste por token, tasa
 * y tipología de respuestas inválidas/"alucinadas").
 *
 * Fire-and-forget: nunca debe interrumpir el flujo de generación si falla
 * la propia escritura del log (mismo patrón que TokenWalletService.refund).
 */
export async function logAiGeneration(entry: AiGenerationLogEntry): Promise<void> {
    const { error } = await supabase.from('ai_generation_log').insert({
        trip_id: entry.tripId ?? null,
        user_id: entry.userId ?? null,
        model: entry.model,
        latency_ms: entry.latencyMs,
        prompt_tokens: entry.promptTokens ?? null,
        completion_tokens: entry.completionTokens ?? null,
        total_tokens: entry.totalTokens ?? null,
        outcome: entry.outcome,
        quality_flags: entry.qualityFlags ?? null,
        error_message: entry.errorMessage ?? null,
    });

    if (error) {
        console.warn('⚠️ No se pudo registrar la métrica de generación IA:', error.message);
    }
}
