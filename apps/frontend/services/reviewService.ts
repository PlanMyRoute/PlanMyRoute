import { apiFetch } from '@/constants/api';

interface TripReview {
    id: string;
    trip_id: number;
    user_id: string;
    rating: number;
    comment: string | null;
    is_public: boolean;
    created_at: string;
    updated_at: string;
}

interface CreateReviewData {
    trip_id: number;
    rating: number;
    comment?: string;
    is_public?: boolean;
}

interface UpdateReviewData {
    rating?: number;
    comment?: string;
    is_public?: boolean;
}

export class ReviewService {
    /**
     * Verifica si el usuario puede crear una reseña para un viaje
     */
    static async canReviewTrip(tripId: string, token: string): Promise<{ canReview: boolean; reason?: string }> {
        try {
            const result = await apiFetch<{ data: { canReview: boolean; reason?: string } }>(`/api/reviews/trip/${tripId}/check`, {
                token,
            });
            return result.data;
        } catch (error) {
            console.error('Error checking review permission:', error);
            throw error;
        }
    }

    /**
     * Crea una nueva reseña
     */
    static async createReview(data: CreateReviewData, token: string): Promise<TripReview> {
        try {
            const result = await apiFetch<{ data: TripReview }>(`/api/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify(data),
            });
            return result.data;
        } catch (error) {
            console.error('Error creating review:', error);
            throw error;
        }
    }

    /**
     * Actualiza una reseña existente
     */
    static async updateReview(reviewId: string, data: UpdateReviewData, token: string): Promise<TripReview> {
        try {
            const result = await apiFetch<{ data: TripReview }>(`/api/reviews/${reviewId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify(data),
            });
            return result.data;
        } catch (error) {
            console.error('Error updating review:', error);
            throw error;
        }
    }

    /**
     * Elimina una reseña
     */
    static async deleteReview(reviewId: string, token: string): Promise<void> {
        try {
            await apiFetch<void>(`/api/reviews/${reviewId}`, {
                method: 'DELETE',
                token,
            });
        } catch (error) {
            console.error('Error deleting review:', error);
            throw error;
        }
    }

    /**
     * Obtiene la reseña del usuario para un viaje específico
     */
    static async getUserReviewForTrip(tripId: string, token: string): Promise<TripReview | null> {
        try {
            const result = await apiFetch<{ data: TripReview | null }>(`/api/reviews/trip/${tripId}/user`, {
                token,
            });
            return result.data;
        } catch (error) {
            console.error('Error getting user review:', error);
            throw error;
        }
    }

    /**
     * Obtiene todas las reseñas del usuario
     */
    static async getUserReviews(token: string): Promise<TripReview[]> {
        try {
            const result = await apiFetch<{ data: TripReview[] }>(`/api/reviews/user`, {
                token,
            });
            return result.data;
        } catch (error) {
            console.error('Error getting user reviews:', error);
            throw error;
        }
    }

    /**
     * Obtiene el feed público de reseñas
     */
    static async getPublicFeed(limit: number = 20, offset: number = 0): Promise<any[]> {
        try {
            const result = await apiFetch<{ data: any[] }>(`/api/reviews/feed?limit=${limit}&offset=${offset}`);
            return result.data;
        } catch (error) {
            console.error('Error getting public feed:', error);
            throw error;
        }
    }

    /**
     * Obtiene el feed social de reseñas (filtrado por follows/followers)
     */
    static async getSocialFeed(limit: number = 20, offset: number = 0, token: string): Promise<any[]> {
        try {
            const result = await apiFetch<{ data: any[] }>(`/api/reviews/feed/social?limit=${limit}&offset=${offset}`, {
                token,
            });
            return result.data;
        } catch (error) {
            console.error('Error getting social feed:', error);
            throw error;
        }
    }

    /**
     * Obtiene las reseñas de un viaje específico
     */
    static async getTripReviews(tripId: string): Promise<any[]> {
        try {
            const result = await apiFetch<{ data: any[] }>(`/api/reviews/trip/${tripId}`);
            return result.data;
        } catch (error) {
            console.error('Error getting trip reviews:', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de reseñas de un viaje
     */
    static async getTripStats(tripId: string): Promise<{ averageRating: number; totalReviews: number }> {
        try {
            const result = await apiFetch<{ data: { averageRating: number; totalReviews: number } }>(`/api/reviews/trip/${tripId}/stats`);
            return result.data;
        } catch (error) {
            console.error('Error getting trip stats:', error);
            throw error;
        }
    }
}

