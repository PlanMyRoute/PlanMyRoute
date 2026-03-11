import { supabase } from '../../supabase.js';

const TABLE_NAME = 'trip_reviews';
const REVIEW_WINDOW_DAYS = 14;

/**
 * Verifica si el usuario puede crear una reseña para un viaje
 */
export const canUserReviewTrip = async (tripId: string, userId: string): Promise<{ canReview: boolean; reason?: string }> => {
    // Verificar que el usuario es un viajero del viaje (owner o traveler)
    const { data: traveler, error: travelerError } = await supabase
        .from('travelers')
        .select('user_role')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .single();

    if (travelerError || !traveler) {
        return { canReview: false, reason: 'No eres miembro de este viaje' };
    }

    // Cualquier viajero (owner o traveler) puede crear reseñas
    // Se eliminó la restricción de solo owner

    // Verificar que el viaje ha finalizado
    const { data: trip, error: tripError } = await supabase
        .from('trip')
        .select('end_date, status')
        .eq('id', tripId)
        .single();

    if (tripError || !trip) {
        return { canReview: false, reason: 'Viaje no encontrado' };
    }

    // El viaje debe estar completado O tener una fecha de fin que ya pasó
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let tripHasEnded = trip.status === 'completed';

    if (trip.end_date) {
        const endDate = new Date(trip.end_date);
        endDate.setHours(0, 0, 0, 0);
        tripHasEnded = tripHasEnded || endDate < today;
    }

    if (!tripHasEnded) {
        return { canReview: false, reason: 'El viaje aún no ha finalizado' };
    }

    // Verificar que no han pasado más de 14 días desde la finalización
    if (trip.end_date) {
        const endDate = new Date(trip.end_date);
        const daysSinceEnd = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceEnd > REVIEW_WINDOW_DAYS) {
            return { canReview: false, reason: `El plazo de ${REVIEW_WINDOW_DAYS} días para reseñar ha expirado` };
        }
    }

    // Verificar si ya existe una reseña
    const { data: existingReview } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .maybeSingle();

    if (existingReview) {
        return { canReview: false, reason: 'Ya has creado una reseña para este viaje' };
    }

    return { canReview: true };
};

/**
 * Crea una nueva reseña de viaje
 */
export const createReview = async (
    tripId: string,
    userId: string,
    rating: number,
    comment: string | null,
    isPublic: boolean = true
) => {
    // Validar rating
    if (rating < 1 || rating > 5) {
        throw new Error('La calificación debe estar entre 1 y 5');
    }

    // Verificar permisos
    const { canReview, reason } = await canUserReviewTrip(tripId, userId);
    if (!canReview) {
        throw new Error(reason || 'No puedes crear una reseña para este viaje');
    }

    // Crear la reseña
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert({
            trip_id: parseInt(tripId),
            user_id: userId,
            rating,
            comment,
            is_public: isPublic,
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Error al crear la reseña: ${error.message}`);
    }

    return data;
};

/**
 * Actualiza una reseña existente
 */
export const updateReview = async (
    reviewId: string,
    userId: string,
    updates: { rating?: number; comment?: string | null; is_public?: boolean }
) => {
    // Validar rating si se está actualizando
    if (updates.rating !== undefined && (updates.rating < 1 || updates.rating > 5)) {
        throw new Error('La calificación debe estar entre 1 y 5');
    }

    // Verificar que la reseña pertenece al usuario
    const { data: existing, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('user_id')
        .eq('id', reviewId)
        .single();

    if (fetchError || !existing) {
        throw new Error('Reseña no encontrada');
    }

    if (existing.user_id !== userId) {
        throw new Error('No tienes permiso para editar esta reseña');
    }

    // Actualizar
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(updates)
        .eq('id', reviewId)
        .select()
        .single();

    if (error) {
        throw new Error(`Error al actualizar la reseña: ${error.message}`);
    }

    return data;
};

/**
 * Elimina una reseña
 */
export const deleteReview = async (reviewId: string, userId: string) => {
    // Verificar que la reseña pertenece al usuario
    const { data: existing, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('user_id')
        .eq('id', reviewId)
        .single();

    if (fetchError || !existing) {
        throw new Error('Reseña no encontrada');
    }

    if (existing.user_id !== userId) {
        throw new Error('No tienes permiso para eliminar esta reseña');
    }

    // Eliminar
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', reviewId);

    if (error) {
        throw new Error(`Error al eliminar la reseña: ${error.message}`);
    }

    return { success: true };
};

/**
 * Obtiene la reseña de un usuario para un viaje específico
 */
export const getUserReviewForTrip = async (tripId: string, userId: string) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(`
            *,
            trip:trip_id (
                id,
                name,
                cover_image_url,
                start_date,
                end_date
            )
        `)
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        throw new Error(`Error al obtener la reseña: ${error.message}`);
    }

    return data;
};

/**
 * Obtiene todas las reseñas de un usuario
 */
export const getUserReviews = async (userId: string) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(`
            *,
            trip:trip_id (
                id,
                name,
                cover_image_url,
                start_date,
                end_date
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Error al obtener las reseñas: ${error.message}`);
    }

    return data || [];
};

/**
 * Obtiene el feed público de reseñas (red social)
 */
export const getPublicReviewsFeed = async (limit: number = 20, offset: number = 0) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(`
            *,
            trip:trip_id (
                id,
                name,
                cover_image_url,
                start_date,
                end_date,
                description
            ),
            user:user_id (
                id,
                name,
                username,
                img
            )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        throw new Error(`Error al obtener el feed de reseñas: ${error.message}`);
    }

    return data || [];
};

/**
 * Obtiene el feed social de reseñas (filtrado por follows/followers)
 * Muestra reseñas de usuarios que sigues y que te siguen
 */
export const getSocialReviewsFeed = async (userId: string, limit: number = 20, offset: number = 0) => {
    // Primero obtenemos los IDs de los usuarios que sigues
    const { data: following, error: followingError } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('user_id', userId);

    if (followingError) {
        throw new Error(`Error al obtener usuarios seguidos: ${followingError.message}`);
    }

    // Obtenemos los IDs de los usuarios que te siguen
    const { data: followers, error: followersError } = await supabase
        .from('user_follows')
        .select('user_id')
        .eq('following_id', userId);

    if (followersError) {
        throw new Error(`Error al obtener seguidores: ${followersError.message}`);
    }

    // Combinamos ambos arrays y eliminamos duplicados
    const followingIds = following?.map(f => f.following_id) || [];
    const followerIds = followers?.map(f => f.user_id) || [];
    const socialNetworkIds = Array.from(new Set([...followingIds, ...followerIds]));

    // Si no hay red social, devolvemos array vacío
    if (socialNetworkIds.length === 0) {
        return [];
    }

    // Obtenemos las reseñas de estos usuarios
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(`
            *,
            trip:trip_id (
                id,
                name,
                cover_image_url,
                start_date,
                end_date,
                description
            ),
            user:user_id (
                id,
                name,
                username,
                img
            )
        `)
        .eq('is_public', true)
        .in('user_id', socialNetworkIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        throw new Error(`Error al obtener el feed social: ${error.message}`);
    }

    return data || [];
};

/**
 * Obtiene las reseñas de un viaje específico
 */
export const getTripReviews = async (tripId: string) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(`
            *,
            user:user_id (
                id,
                name,
                username,
                img
            )
        `)
        .eq('trip_id', tripId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Error al obtener las reseñas del viaje: ${error.message}`);
    }

    return data || [];
};

/**
 * Obtiene estadísticas de un viaje basadas en reseñas
 */
export const getTripStats = async (tripId: string) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('rating')
        .eq('trip_id', tripId)
        .eq('is_public', true);

    if (error) {
        throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }

    if (!data || data.length === 0) {
        return {
            averageRating: 0,
            totalReviews: 0,
        };
    }

    const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / data.length;

    return {
        averageRating: Math.round(averageRating * 10) / 10, // Redondear a 1 decimal
        totalReviews: data.length,
    };
};
