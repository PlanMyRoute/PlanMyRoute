// services/followService.ts

export interface FollowStats {
    followers_count: number;
    following_count: number;
}

export interface UserFollow {
    id: number;
    user_id: string;
    following_id: string;
    created_at: string;
}

export interface FollowerUser {
    id: number;
    created_at: string;
    user: {
        id: string;
        username: string;
        name: string;
        img: string | null;
    };
}

export interface FollowingUser {
    id: number;
    created_at: string;
    following: {
        id: string;
        username: string;
        name: string;
        img: string | null;
    };
}

type FetchOptions = {
    token?: string;
    signal?: AbortSignal;
};

export class FollowService {
    /**
     * Follow a user
     */
    static async followUser(userId: string, followingId: string, opts?: FetchOptions): Promise<UserFollow> {
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/follows/${userId}/follow/${followingId}`, {
                method: 'POST',
                headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
                signal: opts?.signal,
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || `Error siguiendo usuario: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('FollowService.followUser error', error);
            throw error;
        }
    }

    /**
     * Unfollow a user
     */
    static async unfollowUser(userId: string, followingId: string, opts?: FetchOptions): Promise<void> {
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/follows/${userId}/unfollow/${followingId}`, {
                method: 'DELETE',
                headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
                signal: opts?.signal,
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || `Error dejando de seguir usuario: ${res.status}`);
            }
        } catch (error) {
            console.error('FollowService.unfollowUser error', error);
            throw error;
        }
    }

    /**
     * Check if user is following another user
     */
    static async checkIfFollowing(userId: string, followingId: string, opts?: FetchOptions): Promise<boolean> {
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/follows/${userId}/is-following/${followingId}`, {
                headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
                signal: opts?.signal,
            });

            if (!res.ok) {
                throw new Error(`Error verificando seguimiento: ${res.status}`);
            }

            const data = await res.json();
            return data.isFollowing;
        } catch (error) {
            console.error('FollowService.checkIfFollowing error', error);
            throw error;
        }
    }

    /**
     * Get followers of a user
     */
    static async getFollowers(userId: string, opts?: FetchOptions): Promise<FollowerUser[]> {
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/follows/${userId}/followers`, {
                headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
                signal: opts?.signal,
            });

            if (!res.ok) {
                throw new Error(`Error obteniendo seguidores: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('FollowService.getFollowers error', error);
            throw error;
        }
    }

    /**
     * Get users that a user is following
     */
    static async getFollowing(userId: string, opts?: FetchOptions): Promise<FollowingUser[]> {
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/follows/${userId}/following`, {
                headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
                signal: opts?.signal,
            });

            if (!res.ok) {
                throw new Error(`Error obteniendo seguidos: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('FollowService.getFollowing error', error);
            throw error;
        }
    }

    /**
     * Get follow statistics for a user
     */
    static async getFollowStats(userId: string, opts?: FetchOptions): Promise<FollowStats> {
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/follows/${userId}/stats`, {
                headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
                signal: opts?.signal,
            });

            if (!res.ok) {
                throw new Error(`Error obteniendo estadísticas: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('FollowService.getFollowStats error', error);
            throw error;
        }
    }
}
