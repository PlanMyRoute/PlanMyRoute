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
            const url = `${process.env.EXPO_PUBLIC_API_URL}/api/user${buildQuery(opts?.query)}`;
            const res = await fetch(url, {
                headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
                signal: opts?.signal,
            });
            if (!res.ok) throw new Error(`Error fetching users: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('UserService.getUsers error', error);
            throw error;
        }
    }

    static async getUserById(id: string, opts?: FetchOptions): Promise<User> {
        try {
            const url = `${process.env.EXPO_PUBLIC_API_URL}/api/user/${id}`;
            const res = await fetch(url, {
                headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
                signal: opts?.signal,
            });
            if (!res.ok) throw new Error(`Error fetching user ${id}: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('UserService.getUserById error', error);
            throw error;
        }
    }

    static async getUserByUsername(username: string, opts?: FetchOptions): Promise<User> {
        try {
            const clean = username.startsWith('@') ? username.slice(1) : username;
            const url = `${process.env.EXPO_PUBLIC_API_URL}/api/user/username/${encodeURIComponent(clean)}`;
            const res = await fetch(url, {
                headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
                signal: opts?.signal,
            });
            if (!res.ok) throw new Error(`Error fetching user ${username}: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('UserService.getUserByUsername error', error);
            throw error;
        }
    }

    static async createUser(user: Partial<User>, token?: string): Promise<User> {
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(user),
            });
            if (!res.ok) throw new Error(`Error creating user: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('UserService.createUser error', error);
            throw error;
        }
    }

    static async updateUser(id: string, user: Partial<User>, token?: string): Promise<User> {
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(user),
            });
            if (!res.ok) throw new Error(`Error updating user ${id}: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('UserService.updateUser error', error);
            throw error;
        }
    }

    static async deleteUser(id: string, token?: string): Promise<void> {
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/${id}`, {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) throw new Error(`Error deleting user ${id}: ${res.status}`);
        } catch (error) {
            console.error('UserService.deleteUser error', error);
            throw error;
        }
    }

    static async getUserProfile(id: string, opts?: FetchOptions): Promise<UseProfileData> {
        try {
            const url = `${process.env.EXPO_PUBLIC_API_URL}/api/user/${id}/profile`;
            const res = await fetch(url, {
                headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
                signal: opts?.signal,
            });
            if (!res.ok) throw new Error(`Error fetching user ${id} profile: ${res.status}`);
            return await res.json();
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

            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error(`Error updating user ${id} interests: ${res.status}`);

            // Devuelve el usuario actualizado
            return await res.json();

        } catch (error) {
            console.error('UserService.updateUserInterests error', error);
            throw error;
        }
    }

    static async searchUsersByUsername(username: string, opts?: FetchOptions): Promise<User[]> {
        try {
            const url = `${process.env.EXPO_PUBLIC_API_URL}/api/user/search/username/${encodeURIComponent(username)}`;
            const res = await fetch(url, {
                headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
                signal: opts?.signal,
            });
            if (!res.ok) throw new Error(`Error searching users by username ${username}: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('UserService.searchUsersByUsername error', error);
            throw error;
        }
    }

    // =============== USER PREFERENCES ===============

    static async getUserPreferences(id: string, token?: string): Promise<{ autoTripStatusUpdate: boolean; timezone: string }> {
        try {
            const url = `${process.env.EXPO_PUBLIC_API_URL}/api/user/${id}/preferences`;
            const res = await fetch(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) throw new Error(`Error fetching user ${id} preferences: ${res.status}`);
            return await res.json();
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
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/${id}/preferences`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(preferences),
            });
            if (!res.ok) throw new Error(`Error updating user ${id} preferences: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('UserService.updateUserPreferences error', error);
            throw error;
        }
    }

}
