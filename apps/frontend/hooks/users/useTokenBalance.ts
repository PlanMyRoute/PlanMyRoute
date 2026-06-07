import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TokenTransaction } from '@planmyroute/types';
import { TokenService } from '@/services/tokenService';
import { useAuth } from '@/context/AuthContext';

export const TOKEN_BALANCE_QUERY_KEY = 'tokenBalance';
export const TOKEN_HISTORY_QUERY_KEY = 'tokenHistory';

/**
 * Saldo de tokens del usuario autenticado.
 */
export function useTokenBalance() {
    const { user, session } = useAuth();

    return useQuery<number>({
        queryKey: [TOKEN_BALANCE_QUERY_KEY, user?.id],
        queryFn: async () => {
            if (!user?.id || !session?.access_token) {
                throw new Error('Usuario no autenticado');
            }
            return TokenService.getBalance(session.access_token);
        },
        enabled: !!user?.id && !!session?.access_token,
        staleTime: 1000 * 30, // 30s: el saldo cambia tras generar/comprar
    });
}

/**
 * Historial de movimientos de tokens del usuario autenticado.
 */
export function useTokenHistory(limit = 50) {
    const { user, session } = useAuth();

    return useQuery<TokenTransaction[]>({
        queryKey: [TOKEN_HISTORY_QUERY_KEY, user?.id, limit],
        queryFn: async () => {
            if (!user?.id || !session?.access_token) {
                throw new Error('Usuario no autenticado');
            }
            return TokenService.getHistory(session.access_token, limit);
        },
        enabled: !!user?.id && !!session?.access_token,
        staleTime: 1000 * 30,
    });
}

/**
 * Helper para invalidar saldo e historial tras una acción que los modifica (generar viaje, compra).
 */
export function useInvalidateTokenBalance() {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: [TOKEN_BALANCE_QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: [TOKEN_HISTORY_QUERY_KEY] });
    };
}
