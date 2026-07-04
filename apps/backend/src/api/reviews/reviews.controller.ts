import * as ReviewService from "./reviews.service.js";
import { BadRequestError, asyncHandler } from "../../utils/errors.js";

/**
 * POST /api/reviews
 * Crea una nueva reseña
 */
export const createReview = asyncHandler(async (req, res) => {
  const { trip_id, rating, comment, is_public } = req.body;
  const userId = req.userId!;

  if (!trip_id || !rating) {
    throw new BadRequestError("trip_id y rating son requeridos");
  }

  const review = await ReviewService.createReview(
    trip_id.toString(),
    userId,
    rating,
    comment || null,
    is_public !== false, // Por defecto true
  );

  res.status(201).json({ success: true, data: review });
});

/**
 * PUT /api/reviews/:reviewId
 * Actualiza una reseña existente
 */
export const updateReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params as Record<string, string>;
  const { rating, comment, is_public } = req.body;
  const userId = req.userId!;

  const updates: {
    rating?: number;
    comment?: string | null;
    is_public?: boolean;
  } = {};
  if (rating !== undefined) updates.rating = rating;
  if (comment !== undefined) updates.comment = comment;
  if (is_public !== undefined) updates.is_public = is_public;

  const review = await ReviewService.updateReview(reviewId, userId, updates);
  res.json({ success: true, data: review });
});

/**
 * DELETE /api/reviews/:reviewId
 * Elimina una reseña
 */
export const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params as Record<string, string>;
  const userId = req.userId!;

  await ReviewService.deleteReview(reviewId, userId);
  res.json({ success: true, message: "Reseña eliminada correctamente" });
});

/**
 * GET /api/reviews/trip/:tripId/check
 * Verifica si el usuario puede crear una reseña para un viaje
 */
export const checkCanReview = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const userId = req.userId!;
  const result = await ReviewService.canUserReviewTrip(tripId, userId);
  res.json({ success: true, data: result });
});

/**
 * GET /api/reviews/trip/:tripId/user
 * Obtiene la reseña del usuario para un viaje específico
 */
export const getUserReviewForTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const userId = req.userId!;
  const review = await ReviewService.getUserReviewForTrip(tripId, userId);
  res.json({ success: true, data: review });
});

/**
 * GET /api/reviews/user
 * Obtiene todas las reseñas del usuario autenticado
 */
export const getUserReviews = asyncHandler(async (req, res) => {
  const userId = req.userId!;
  const reviews = await ReviewService.getUserReviews(userId);
  res.json({ success: true, data: reviews });
});

/**
 * GET /api/reviews/feed
 * Obtiene el feed público de reseñas
 */
export const getPublicFeed = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const reviews = await ReviewService.getPublicReviewsFeed(limit, offset);
  res.json({ success: true, data: reviews });
});

/**
 * GET /api/reviews/feed/social
 * Obtiene el feed social de reseñas (filtrado por follows/followers)
 */
export const getSocialFeed = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const userId = req.userId!;
  const reviews = await ReviewService.getSocialReviewsFeed(
    userId,
    limit,
    offset,
  );
  res.json({ success: true, data: reviews });
});

/**
 * GET /api/reviews/trip/:tripId
 * Obtiene todas las reseñas públicas de un viaje
 */
export const getTripReviews = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const reviews = await ReviewService.getTripReviews(tripId);
  res.json({ success: true, data: reviews });
});

/**
 * GET /api/reviews/trip/:tripId/stats
 * Obtiene estadísticas de reseñas de un viaje
 */
export const getTripStats = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const stats = await ReviewService.getTripStats(tripId);
  res.json({ success: true, data: stats });
});
