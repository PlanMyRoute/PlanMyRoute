import React, { createContext, useContext, useEffect, useState } from 'react';
import { SubscriptionService } from '../services/subscriptionService'; // Importamos el servicio
import { useAuth } from './AuthContext';

// Tipos
export interface Subscription {
    id: string;
    user_id: string;
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'unpaid';
    tier: 'free' | 'premium';
    current_period_end: string | null;
    current_period_start?: string | null;
    is_trial: boolean;
    trial_end?: string | null;
    provider_subscription_id?: string | null;
    cancel_at_period_end?: boolean;
}

interface SubscriptionContextType {
    subscription: Subscription | null;
    isPremium: boolean;
    isLoading: boolean;
    refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, token } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchSubscription = async () => {
        if (!user || !token) {
            setSubscription(null);
            setIsLoading(false);
            return;
        }

        try {
            // USAMOS EL SERVICIO
            const data = await SubscriptionService.getMySubscription(token);
            setSubscription(data);
        } catch (error: any) {
            // Manejo silencioso: Si falla, asumimos que es Free
            // Esto evita pantallazos rojos si no hay internet o falla el server
            console.log('⚠️ [SubscriptionContext] Fallback to Free:', error.message);

            setSubscription({
                id: 'fallback-free',
                user_id: user.id,
                status: 'active',
                tier: 'free',
                current_period_end: null,
                is_trial: false
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscription();
    }, [user, token]);

    const isPremium =
        subscription?.tier === 'premium' &&
        (subscription?.status === 'active' || subscription?.status === 'trialing');

    return (
        <SubscriptionContext.Provider value={{
            subscription,
            isPremium,
            isLoading,
            refreshSubscription: fetchSubscription
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription debe ser usado dentro de un SubscriptionProvider');
    }
    return context;
};