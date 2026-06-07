import { supabase } from '../supabase.js';
import { UserUsage } from '@planmyroute/types';

/**
 * Obtiene o crea el registro de uso del usuario
 */
export async function getUserUsage(userId: string): Promise<UserUsage> {
  // Primero intentar obtener el registro existente
  const { data, error } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Error obteniendo uso del usuario: ${error.message}`);
  }

  // Si no existe, crear uno nuevo
  if (!data) {
    const { data: newUsage, error: insertError } = await supabase
      .from('user_usage')
      .insert({
        user_id: userId,
        ai_trips_generated_month: 0,
        max_vehicles_allowed: 1,
        last_reset_date: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Error creando registro de uso: ${insertError.message}`);
    }

    return newUsage;
  }

  // Verificar si necesitamos resetear el contador mensual
  const lastReset = new Date(data.last_reset_date ?? new Date().toISOString());
  const now = new Date();
  
  // Si estamos en un mes diferente, resetear
  if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
    const { data: updatedUsage, error: updateError } = await supabase
      .from('user_usage')
      .update({
        ai_trips_generated_month: 0,
        last_reset_date: now.toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Error reseteando contador mensual: ${updateError.message}`);
    }

    return updatedUsage;
  }

  return data;
}

// NOTA: El gating de IA ya NO se basa en un contador mensual.
// Ahora cada acción de IA se cobra en tokens (ver tokenWalletService.ts).
// `getUserUsage` se conserva para otros límites de uso (p.ej. vehículos).
