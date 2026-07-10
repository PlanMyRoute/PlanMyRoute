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

/**
 * Fusiona quality_flags adicionales en la última generación registrada como
 * 'success' para un viaje concreto. Se usa para anomalías de contenido que
 * solo pueden detectarse DESPUÉS de escribir el log inicial: en particular,
 * los lugares (hoteles/restaurantes) que la IA "alucina" y que Google Places
 * no logra verificar durante el enriquecimiento en background.
 *
 * Preserva los flags ya existentes (p. ej. `days_out_of_range`, detectado en
 * tiempo de generación) haciendo merge en vez de sobrescribir.
 *
 * Fire-and-forget: nunca debe interrumpir el flujo de generación si falla.
 */
export async function mergeQualityFlagsForTrip(
    tripId: number,
    extraFlags: Record<string, unknown>,
): Promise<void> {
    if (!extraFlags || Object.keys(extraFlags).length === 0) return;

    const { data: row, error: selectError } = await supabase
        .from('ai_generation_log')
        .select('id, quality_flags')
        .eq('trip_id', tripId)
        .eq('outcome', 'success')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (selectError) {
        console.warn(
            '⚠️ No se pudo localizar la métrica de generación IA para fusionar quality_flags:',
            selectError.message,
        );
        return;
    }
    if (!row) return;

    const merged: Record<string, unknown> = {
        ...((row.quality_flags as Record<string, unknown> | null) ?? {}),
        ...extraFlags,
    };

    const { error: updateError } = await supabase
        .from('ai_generation_log')
        .update({ quality_flags: merged })
        .eq('id', row.id);

    if (updateError) {
        console.warn(
            '⚠️ No se pudo actualizar quality_flags de la métrica de generación IA:',
            updateError.message,
        );
    }
}
