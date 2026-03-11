import { Request, Response } from 'express';
import { supabase } from '../../supabase.js';
import * as ReviewService from './reviews.service.js';

/**
 * POST /api/reviews
 * Crea una nueva reseña
 */
export const createReview = async (req: Request, res: Response) => {
    try {
        const { trip_id, rating, comment, is_public } = req.body;

        // Verificar autenticación
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        if (!trip_id || !rating) {
            return res.status(400).json({ error: 'trip_id y rating son requeridos' });
        }

        const review = await ReviewService.createReview(
            trip_id.toString(),
            user.id,
            rating,
            comment || null,
            is_public !== false // Por defecto true
        );

        res.status(201).json({
            success: true,
            data: review,
        });
    } catch (error: any) {
        console.error('Error creating review:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al crear la reseña',
        });
    }
};

/**
 * PUT /api/reviews/:reviewId
 * Actualiza una reseña existente
 */
export const updateReview = async (req: Request, res: Response) => {
    try {
        const { reviewId } = req.params;
        const { rating, comment, is_public } = req.body;

        // Verificar autenticación
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        const updates: any = {};
        if (rating !== undefined) updates.rating = rating;
        if (comment !== undefined) updates.comment = comment;
        if (is_public !== undefined) updates.is_public = is_public;

        const review = await ReviewService.updateReview(reviewId, user.id, updates);

        res.json({
            success: true,
            data: review,
        });
    } catch (error: any) {
        console.error('Error updating review:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al actualizar la reseña',
        });
    }
};

/**
 * DELETE /api/reviews/:reviewId
 * Elimina una reseña
 */
export const deleteReview = async (req: Request, res: Response) => {
    try {
        const { reviewId } = req.params;

        // Verificar autenticación
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        await ReviewService.deleteReview(reviewId, user.id);

        res.json({
            success: true,
            message: 'Reseña eliminada correctamente',
        });
    } catch (error: any) {
        console.error('Error deleting review:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al eliminar la reseña',
        });
    }
};

/**
 * GET /api/reviews/trip/:tripId/check
 * Verifica si el usuario puede crear una reseña para un viaje
 */
export const checkCanReview = async (req: Request, res: Response) => {
    try {
        const { tripId } = req.params;

        // Verificar autenticación
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        const result = await ReviewService.canUserReviewTrip(tripId, user.id);

        res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('Error checking review permission:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al verificar permisos',
        });
    }
};

/**
 * GET /api/reviews/trip/:tripId/user
 * Obtiene la reseña del usuario para un viaje específico
 */
export const getUserReviewForTrip = async (req: Request, res: Response) => {
    try {
        const { tripId } = req.params;

        // Verificar autenticación
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        const review = await ReviewService.getUserReviewForTrip(tripId, user.id);

        res.json({
            success: true,
            data: review,
        });
    } catch (error: any) {
        console.error('Error getting user review:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al obtener la reseña',
        });
    }
};

/**
 * GET /api/reviews/user
 * Obtiene todas las reseñas del usuario autenticado
 */
export const getUserReviews = async (req: Request, res: Response) => {
    try {
        // Verificar autenticación
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        const reviews = await ReviewService.getUserReviews(user.id);

        res.json({
            success: true,
            data: reviews,
        });
    } catch (error: any) {
        console.error('Error getting user reviews:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al obtener las reseñas',
        });
    }
};

/**
 * GET /api/reviews/feed
 * Obtiene el feed público de reseñas
 */
export const getPublicFeed = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        const reviews = await ReviewService.getPublicReviewsFeed(limit, offset);

        res.json({
            success: true,
            data: reviews,
        });
    } catch (error: any) {
        console.error('Error getting public feed:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al obtener el feed',
        });
    }
};

/**
 * GET /api/reviews/feed/social
 * Obtiene el feed social de reseñas (filtrado por follows/followers)
 */
export const getSocialFeed = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        // Verificar autenticación
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        const reviews = await ReviewService.getSocialReviewsFeed(user.id, limit, offset);

        res.json({
            success: true,
            data: reviews,
        });
    } catch (error: any) {
        console.error('Error getting social feed:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al obtener el feed social',
        });
    }
};

/**
 * GET /api/reviews/trip/:tripId
 * Obtiene todas las reseñas públicas de un viaje
 */
export const getTripReviews = async (req: Request, res: Response) => {
    try {
        const { tripId } = req.params;

        const reviews = await ReviewService.getTripReviews(tripId);

        res.json({
            success: true,
            data: reviews,
        });
    } catch (error: any) {
        console.error('Error getting trip reviews:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al obtener las reseñas del viaje',
        });
    }
};

/**
 * GET /api/reviews/trip/:tripId/stats
 * Obtiene estadísticas de reseñas de un viaje
 */
export const getTripStats = async (req: Request, res: Response) => {
    try {
        const { tripId } = req.params;

        const stats = await ReviewService.getTripStats(tripId);

        res.json({
            success: true,
            data: stats,
        });
    } catch (error: any) {
        console.error('Error getting trip stats:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al obtener estadísticas',
        });
    }
};
