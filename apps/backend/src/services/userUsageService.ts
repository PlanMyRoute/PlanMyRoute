import { supabase } from '../supabase.js';

export interface UserUsage {
  user_id: string;
  ai_trips_generated_month: number;
  max_vehicles_allowed: number;
  last_reset_date: string;
}

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
  const lastReset = new Date(data.last_reset_date);
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

/**
 * Incrementa el contador de viajes IA generados
 */
export async function incrementAITripsCount(userId: string): Promise<void> {
  // Primero obtener el valor actual
  const usage = await getUserUsage(userId);
  
  // Incrementar el contador
  const { error } = await supabase
    .from('user_usage')
    .update({
      ai_trips_generated_month: usage.ai_trips_generated_month + 1
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Error incrementando contador de viajes IA: ${error.message}`);
  }
}

/**
 * Verifica si el usuario puede crear un viaje con IA
 * Los usuarios premium tienen acceso ilimitado
 * Los usuarios free están limitados a 1 viaje IA por mes
 */
export async function canCreateAITrip(userId: string): Promise<{
  canCreate: boolean;
  reason?: string;
  usedCount?: number;
  maxCount?: number;
}> {
  // Obtener el tier de suscripción del usuario
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('tier, status, current_period_end')
    .eq('user_id', userId)
    .single();

  console.log('🔍 Verificando suscripción para usuario:', userId);
  console.log('📊 Datos de suscripción:', subscription);
  console.log('❌ Error de suscripción:', subError);

  // Si es premium con status activo o trialing, acceso ilimitado
  const isPremiumTier = subscription?.tier === 'premium';
  const isActiveStatus = subscription?.status === 'active' || subscription?.status === 'trialing';
  
  // Verificar que no haya expirado (si current_period_end es null, significa sin límite de tiempo)
  let isNotExpired = true;
  if (subscription?.current_period_end) {
    const endDate = new Date(subscription.current_period_end);
    const now = new Date();
    isNotExpired = endDate > now;
    console.log('📅 Fecha de expiración:', endDate.toISOString());
    console.log('📅 Fecha actual:', now.toISOString());
  } else {
    console.log('📅 Sin fecha de expiración (acceso ilimitado)');
  }

  console.log('✅ isPremiumTier:', isPremiumTier);
  console.log('✅ isActiveStatus:', isActiveStatus);
  console.log('✅ isNotExpired:', isNotExpired);

  if (isPremiumTier && isActiveStatus && isNotExpired) {
    console.log('🎉 Usuario premium con acceso ilimitado');
    const usage = await getUserUsage(userId);
    return { 
      canCreate: true,
      usedCount: usage.ai_trips_generated_month,
      maxCount: undefined // undefined significa ilimitado
    };
  }
  
  console.log('❌ No cumple los requisitos para premium');
  console.log('❌ Verificando límites de usuario free...');

  // Para usuarios free, verificar el límite mensual
  const usage = await getUserUsage(userId);
  const FREE_LIMIT = 1;

  if (usage.ai_trips_generated_month >= FREE_LIMIT) {
    return {
      canCreate: false,
      reason: 'Has alcanzado el límite de viajes con IA para este mes. Actualiza a Premium para crear viajes ilimitados.',
      usedCount: usage.ai_trips_generated_month,
      maxCount: FREE_LIMIT
    };
  }

  return {
    canCreate: true,
    usedCount: usage.ai_trips_generated_month,
    maxCount: FREE_LIMIT
  };
}
