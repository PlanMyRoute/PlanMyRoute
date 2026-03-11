// src/api/follows/follows.service.ts
import { supabase } from '../../supabase.js';

export interface UserFollow {
    id: number;
    user_id: string;
    following_id: string;
    created_at: string;
}

export interface FollowStats {
    followers_count: number;
    following_count: number;
}

/**
 * Follow a user
 */
export const followUser = async (userId: string, followingId: string): Promise<UserFollow> => {
    // Validate that user is not trying to follow themselves
    if (userId === followingId) {
        throw new Error('No puedes seguirte a ti mismo');
    }

    const { data, error } = await supabase
        .from('user_follows')
        .insert({
            user_id: userId,
            following_id: followingId
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') { // Unique constraint violation
            throw new Error('Ya sigues a este usuario');
        }
        throw new Error(`Error al seguir usuario: ${error.message}`);
    }

    if (!data) {
        throw new Error('No se pudo seguir al usuario');
    }

    return data;
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (userId: string, followingId: string): Promise<void> => {
    const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('user_id', userId)
        .eq('following_id', followingId);

    if (error) {
        throw new Error(`Error al dejar de seguir usuario: ${error.message}`);
    }
};

/**
 * Check if a user follows another user
 */
export const checkIfFollowing = async (userId: string, followingId: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('user_id', userId)
        .eq('following_id', followingId)
        .maybeSingle();

    if (error) {
        throw new Error(`Error al verificar seguimiento: ${error.message}`);
    }

    return !!data;
};

/**
 * Get all followers of a user
 */
export const getFollowers = async (userId: string): Promise<any[]> => {
    const { data, error } = await supabase
        .from('user_follows')
        .select(`
            id,
            created_at,
            user:user_id (
                id,
                username,
                name,
                img
            )
        `)
        .eq('following_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Error al obtener seguidores: ${error.message}`);
    }

    return data || [];
};

/**
 * Get all users that a user is following
 */
export const getFollowing = async (userId: string): Promise<any[]> => {
    const { data, error } = await supabase
        .from('user_follows')
        .select(`
            id,
            created_at,
            following:following_id (
                id,
                username,
                name,
                img
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Error al obtener seguidos: ${error.message}`);
    }

    return data || [];
};

/**
 * Get follow statistics for a user
 */
export const getFollowStats = async (userId: string): Promise<FollowStats> => {
    // Get followers count
    const { count: followersCount, error: followersError } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    if (followersError) {
        throw new Error(`Error al obtener estadísticas de seguidores: ${followersError.message}`);
    }

    // Get following count
    const { count: followingCount, error: followingError } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (followingError) {
        throw new Error(`Error al obtener estadísticas de seguidos: ${followingError.message}`);
    }

    return {
        followers_count: followersCount || 0,
        following_count: followingCount || 0
    };
};
