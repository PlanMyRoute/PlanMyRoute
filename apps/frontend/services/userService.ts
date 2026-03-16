import { apiFetch, buildApiUrl } from '@/constants/api';
import type { UseProfileData } from '@/hooks/useUsers';
import { Interest, User } from '@planmyroute/types';

type FetchOptions = {
    token?: string;
    signal?: AbortSignal;
    query?: Record<string, string | number>;
};

function buildQuery(q?: Record<string, string | number>) {
    if (!q) return '';
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => params.append(k, String(v)));
    return `?${params.toString()}`;
}

export class UserService {
    static async getUsers(opts?: FetchOptions): Promise<User[]> {
        try {
            return await apiFetch<User[]>(buildApiUrl(`/api/user${buildQuery(opts?.query)}`), {
                token: opts?.token,
                signal: opts?.signal,
            });
        } catch (error) {
            console.error('UserService.getUsers error', error);
            throw error;
        }
    }

    static async getUserById(id: string, opts?: FetchOptions): Promise<User> {
        try {
            return await apiFetch<User>(`/api/user/${id}`, {
                token: opts?.token,
                signal: opts?.signal,
            });
        } catch (error) {
            console.error('UserService.getUserById error', error);
            throw error;
        }
    }

    static async getUserByUsername(username: string, opts?: FetchOptions): Promise<User> {
        try {
            const clean = username.startsWith('@') ? username.slice(1) : username;
            return await apiFetch<User>(`/api/user/username/${encodeURIComponent(clean)}`, {
                token: opts?.token,
                signal: opts?.signal,
            });
        } catch (error) {
            console.error('UserService.getUserByUsername error', error);
            throw error;
        }
    }

    static async createUser(user: Partial<User>, token?: string): Promise<User> {
        try {
            return await apiFetch<User>('/api/user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify(user),
            });
        } catch (error) {
            console.error('UserService.createUser error', error);
            throw error;
        }
    }

    static async updateUser(id: string, user: Partial<User>, token?: string): Promise<User> {
        try {
            return await apiFetch<User>(`/api/user/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify(user),
            });
        } catch (error) {
            console.error('UserService.updateUser error', error);
            throw error;
        }
    }

    static async deleteUser(id: string, token?: string): Promise<void> {
        try {
            await apiFetch<void>(`/api/user/${id}`, {
                method: 'DELETE',
                token,
            });
        } catch (error) {
            console.error('UserService.deleteUser error', error);
            throw error;
        }
    }

    static async getUserProfile(id: string, opts?: FetchOptions): Promise<UseProfileData> {
        try {
            return await apiFetch<UseProfileData>(`/api/user/${id}/profile`, {
                token: opts?.token,
                signal: opts?.signal,
            });
        } catch (error) {
            console.error('UserService.getUserProfile error', error);
            throw error;
        }
    }

    static async updateUserInterests(id: string, interests: Interest[], token?: string): Promise<User> {
        try { //Solo mandamos los intereses que actualizamos
            const body: Partial<User> = {
                user_type: interests,
            };

            return await apiFetch<User>(`/api/user/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify(body),
            });

        } catch (error) {
            console.error('UserService.updateUserInterests error', error);
            throw error;
        }
    }

    static async searchUsersByUsername(username: string, opts?: FetchOptions): Promise<User[]> {
        try {
            return await apiFetch<User[]>(`/api/user/search/username/${encodeURIComponent(username)}`, {
                token: opts?.token,
                signal: opts?.signal,
            });
        } catch (error) {
            console.error('UserService.searchUsersByUsername error', error);
            throw error;
        }
    }

    // =============== USER PREFERENCES ===============

    static async getUserPreferences(id: string, token?: string): Promise<{ autoTripStatusUpdate: boolean; timezone: string }> {
        try {
            return await apiFetch<{ autoTripStatusUpdate: boolean; timezone: string }>(`/api/user/${id}/preferences`, {
                token,
            });
        } catch (error) {
            console.error('UserService.getUserPreferences error', error);
            throw error;
        }
    }

    static async updateUserPreferences(
        id: string,
        preferences: { timezone?: string; autoTripStatusUpdate?: boolean },
        token?: string
    ): Promise<{ success: boolean; preferences: any; message: string }> {
        try {
            return await apiFetch<{ success: boolean; preferences: any; message: string }>(`/api/user/${id}/preferences`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify(preferences),
            });
        } catch (error) {
            console.error('UserService.updateUserPreferences error', error);
            throw error;
        }
    }

}

