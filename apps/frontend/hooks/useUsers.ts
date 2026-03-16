import { useAuth } from '@/context/AuthContext';
import { User } from '@planmyroute/types';
import { useQuery } from '@tanstack/react-query';
import { UserService } from '../services/userService';

const USER_STALE_TIME = 60_000;

type UseUsersResult = {
    data: User | User[] | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
};

export type UseProfileData = {
    user: User;
    stats: {
        tripsCreated: number;
        tripsFinished: number;
    };
    interests: string[];
    is_premium: boolean;
};

type UseProfileResult = {
    data: UseProfileData | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
};

export function useUser(
    userId?: string | null,
    username?: string | null,
    options?: { token?: string; enabled?: boolean }
): UseUsersResult {
    const { token } = useAuth();
    const enabled = options?.enabled !== false;

    // Usar el token del AuthContext si no se proporciona uno
    const finalToken = options?.token || token;

    // Get user by id or username
    const queryUser = useQuery<User, Error>({
        queryKey: userId ? ['userById', userId] : ['userByUsername', username ?? ''],
        queryFn: userId ?
            () => UserService.getUserById(userId, { token: finalToken || undefined }) :
            () => UserService.getUserByUsername(username as string, { token: finalToken || undefined }),
        enabled: enabled && (Boolean(userId) || Boolean(username)),
        staleTime: USER_STALE_TIME,
        retry: 1,
    });

    const data = queryUser.data ?? null;
    const isLoading = queryUser.isLoading;
    const error = queryUser.error ? queryUser.error.message : null;
    const refetch = () => queryUser.refetch();

    return { data: data as User | User[] | null, isLoading, error, refetch };
}

export function useProfile(
    userId?: string | null,
    username?: string | null,
    options?: { token?: string; enabled?: boolean }
): UseProfileResult {
    const { token } = useAuth();
    const enabled = options?.enabled !== false;

    // Usar el token del AuthContext si no se proporciona uno
    const finalToken = options?.token || token;

    // Priorizar username sobre userId si ambos están presentes
    const identifier = username || userId;
    const isUsername = !!username;

    // Get user profile
    const queryProfile = useQuery<UseProfileData, Error>({
        queryKey: ['userProfile', identifier ?? '', isUsername ? 'username' : 'id'],
        queryFn: async () => {
            if (!identifier) throw new Error('No identifier provided');

            if (isUsername) {
                // Buscar por username
                const user = await UserService.getUserByUsername(identifier, { token: finalToken || undefined });
                return UserService.getUserProfile(user.id, { token: finalToken || undefined });
            } else {
                // Buscar por ID (comportamiento original)
                return UserService.getUserProfile(identifier, { token: finalToken || undefined });
            }
        },
        enabled: enabled && Boolean(identifier),
        staleTime: USER_STALE_TIME,
        retry: (failureCount, error) => failureCount < 2 && !error.message.includes('No identifier provided'),
    });

    const data = queryProfile.data ?? null;
    const isLoading = queryProfile.isLoading;
    const error = queryProfile.error ? queryProfile.error.message : null;
    const refetch = () => queryProfile.refetch();

    return { data, isLoading, error, refetch };
}

/**
 * Hook to search users by username
 * Returns list of users matching the search query
 */
export function useSearchUsers(
    searchQuery?: string,
    options?: { token?: string; enabled?: boolean }
): UseUsersResult {
    const enabled = options?.enabled !== false;
    const trimmedQuery = searchQuery?.trim() || '';

    const querySearchUsers = useQuery<User[], Error>({
        queryKey: ['searchUsers', trimmedQuery],
        queryFn: () => UserService.searchUsersByUsername(trimmedQuery, { token: options?.token }),
        enabled: enabled && trimmedQuery.length > 0,
        staleTime: 1000 * 30, // Cache for 30 seconds
        retry: 1,
    });

    const data = querySearchUsers.data ?? null;
    const isLoading = querySearchUsers.isLoading;
    const error = querySearchUsers.error ? querySearchUsers.error.message : null;
    const refetch = () => querySearchUsers.refetch();

    return { data, isLoading, error, refetch };
}

export default useUser;