import { apiFetch } from '@/constants/api';
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
            return await apiFetch<UserFollow>(`/api/follows/${userId}/follow/${followingId}`, {
                method: 'POST',
                token: opts?.token,
                signal: opts?.signal,
            });
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
            await apiFetch<void>(`/api/follows/${userId}/unfollow/${followingId}`, {
                method: 'DELETE',
                token: opts?.token,
                signal: opts?.signal,
            });
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
            const data = await apiFetch<{ isFollowing: boolean }>(`/api/follows/${userId}/is-following/${followingId}`, {
                token: opts?.token,
                signal: opts?.signal,
            });
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
            return await apiFetch<FollowerUser[]>(`/api/follows/${userId}/followers`, {
                token: opts?.token,
                signal: opts?.signal,
            });
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
            return await apiFetch<FollowingUser[]>(`/api/follows/${userId}/following`, {
                token: opts?.token,
                signal: opts?.signal,
            });
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
            return await apiFetch<FollowStats>(`/api/follows/${userId}/stats`, {
                token: opts?.token,
                signal: opts?.signal,
            });
        } catch (error) {
            console.error('FollowService.getFollowStats error', error);
            throw error;
        }
    }
}

