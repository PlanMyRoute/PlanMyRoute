import { User } from '@planmyroute/types';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { UserService } from '../services/userService';

type UseSearchUsersResult = {
    users: User[];
    isLoading: boolean;
    error: string | null;
};

/**
 * Hook para buscar usuarios por username con debounce
 * @param searchTerm - Término de búsqueda (username)
 * @param options - Opciones adicionales como token y delay del debounce
 * @returns Resultado con la lista de usuarios, estado de carga y error
 */
export function useSearchUsers(
    searchTerm: string,
    options?: { token?: string; debounceMs?: number }
): UseSearchUsersResult {
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    const debounceMs = options?.debounceMs ?? 500; // 500ms por defecto

    // Efecto de debounce: actualiza debouncedSearchTerm después del delay
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, debounceMs);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm, debounceMs]);

    // Query de búsqueda de usuarios
    const { data, isLoading, error } = useQuery<User[], Error>({
        queryKey: ['searchUsers', debouncedSearchTerm],
        queryFn: async () => {
            if (!debouncedSearchTerm || debouncedSearchTerm.trim().length < 2) {
                return [];
            }
            // Usamos el nuevo método de búsqueda que devuelve un array
            return UserService.searchUsersByUsername(debouncedSearchTerm, { token: options?.token });
        },
        enabled: debouncedSearchTerm.trim().length >= 2,
        staleTime: 30000, // Cache results for 30 seconds
    });

    return {
        users: data ?? [],
        isLoading,
        error: error?.message ?? null,
    };
}
