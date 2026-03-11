import { supabase } from '../../supabase.js';
import { SUB_CONFIG } from '../../config/subscription.constants.js';

export class SubscriptionService {

    /**
     * Obtiene la suscripción de un usuario
     */
    async getSubscription(userId: string) {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw new Error('No se pudo obtener la suscripción');
        return data;
    }

    /**
     * Activa el Trial de 14 días (Requiere validación de pago previa en frontend)
     */
    async activateTrial(userId: string) {
        // 1. Verificar si ya usó el trial
        const currentSub = await this.getSubscription(userId);

        // Si ya fue trial alguna vez o es premium, no dejamos (opcional)
        if (currentSub.is_trial && currentSub.status !== 'active') {
            throw new Error('El periodo de prueba ya fue utilizado.');
        }

        const endDate = this.calculateNewEndDate(currentSub.current_period_end, SUB_CONFIG.TRIAL_DAYS);

        const { error } = await supabase
            .from('subscriptions')
            .update({
                status: 'trialing',
                tier: 'premium',
                is_trial: true,
                trial_end: endDate.toISOString(),
                current_period_end: endDate.toISOString(),
            })
            .eq('user_id', userId);

        if (error) throw new Error('Error al activar el periodo de prueba');
        return { success: true, newEndDate: endDate };
    }

    /**
     * Canjea un código de referido
     * Lógica: Si Referrer es Premium -> 30 días. Si es Free -> 14 días.
     */
    async redeemReferral(refereeId: string, referralCode: string) {
        // 1. Buscar al dueño del código (Referrer)
        const { data: referrerUser, error: userError } = await supabase
            .from('user') // Tu tabla se llama 'user' en singular
            .select('id')
            .eq('referral_code', referralCode)
            .single();

        if (userError || !referrerUser) throw new Error('Código de referido inválido');
        if (referrerUser.id === refereeId) throw new Error('No puedes invitarte a ti mismo');

        // 2. Verificar si ya se usó un código antes (evitar abusos)
        const { data: existingReferral } = await supabase
            .from('referrals')
            .select('id')
            .eq('referee_id', refereeId)
            .single();

        if (existingReferral) throw new Error('Ya has canjeado un código de invitación anteriormente');

        // 3. Determinar el estatus del Referrer para saber el premio
        const referrerSub = await this.getSubscription(referrerUser.id);

        // SI el referrer es Premium (y está activo), damos el premio gordo (30 días)
        // SI NO, damos el premio estándar (14 días)
        const isReferrerPremium = referrerSub.tier === 'premium' &&
            (referrerSub.status === 'active' || referrerSub.status === 'trialing');

        const daysToReward = isReferrerPremium
            ? SUB_CONFIG.REFERRAL_REWARD_FROM_PREMIUM
            : SUB_CONFIG.REFERRAL_REWARD_FROM_FREE;

        // 4. Registrar la transacción en la tabla referrals
        const { error: insertError } = await supabase
            .from('referrals')
            .insert({
                referrer_id: referrerUser.id,
                referee_id: refereeId,
                status: 'completed',
                reward_granted: true
            });

        if (insertError) throw new Error('Error al registrar el referido');

        // 5. Aplicar recompensa a AMBOS (Win-Win)
        await this.addPremiumDays(referrerUser.id, daysToReward); // Al que invitó
        await this.addPremiumDays(refereeId, daysToReward);       // Al invitado

        return {
            success: true,
            daysAwarded: daysToReward,
            message: `¡Código canjeado! Ambos habéis ganado ${daysToReward} días de Premium.`
        };
    }

    /**
     * Canjea códigos promocionales (ej: FERIAPIN)
     */
    async redeemPromoCode(userId: string, codeInput: string) {
        // Verificar si el usuario ya usó este código
        const { data: existingUsage } = await supabase
            .from('promo_code_usages')
            .select('id')
            .eq('user_id', userId)
            .eq('code', codeInput)
            .single();

        if (existingUsage) throw new Error('Ya has canjeado este código anteriormente');

        const { data: promo, error } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', codeInput)
            .single();

        if (error || !promo) throw new Error('Código promocional no válido');
        if (!promo.is_active) throw new Error('Este código ha sido desactivado');
        if (promo.expiration_date && new Date(promo.expiration_date) < new Date()) throw new Error('El código ha caducado');
        if (promo.max_uses && promo.used_count >= promo.max_uses) throw new Error('El código se ha agotado');

        // Aplicar días
        await this.addPremiumDays(userId, promo.duration_days);

        // Registrar el uso del código
        await supabase
            .from('promo_code_usages')
            .insert({ user_id: userId, code: codeInput });

        // Actualizar uso (Incrementar contador)
        await supabase
            .from('promo_codes')
            .update({ used_count: promo.used_count + 1 })
            .eq('code', codeInput);

        return { success: true, daysAwarded: promo.duration_days };
    }

    // --- MÉTODOS AUXILIARES ---

    /**
     * Añade días de premium a un usuario, extendiendo su fecha actual o empezando desde hoy.
     */
    private async addPremiumDays(userId: string, days: number) {
        const sub = await this.getSubscription(userId);
        const newEndDate = this.calculateNewEndDate(sub.current_period_end, days);

        await supabase
            .from('subscriptions')
            .update({
                tier: 'premium',
                status: 'active', // Forzamos activo si estaba caducado
                current_period_end: newEndDate.toISOString()
            })
            .eq('user_id', userId);
    }

    /**
     * Calcula la nueva fecha de fin.
     * Si la fecha actual es futuro -> Suma días a esa fecha.
     * Si la fecha actual es pasado (o null) -> Suma días a HOY.
     */
    private calculateNewEndDate(currentDateStr: string | null, daysToAdd: number): Date {
        const now = new Date();
        let baseDate = now;

        if (currentDateStr) {
            const currentEnd = new Date(currentDateStr);
            // Si aún no ha caducado, sumamos al final. Si ya caducó, sumamos a hoy.
            if (currentEnd > now) {
                baseDate = currentEnd;
            }
        }

        const newDate = new Date(baseDate);
        newDate.setDate(newDate.getDate() + daysToAdd);
        return newDate;
    }
}