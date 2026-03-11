import express from 'express';
import * as ReviewController from './reviews.controller.js';
import { verifyToken, optionalAuth } from '../../middleware/auth.js';

const router = express.Router();

// Crear nueva reseña
router.post('/', verifyToken, ReviewController.createReview);

// Actualizar reseña
router.put('/:reviewId', verifyToken, ReviewController.updateReview);

// Eliminar reseña
router.delete('/:reviewId', verifyToken, ReviewController.deleteReview);

// Verificar si puede crear reseña para un viaje
router.get('/trip/:tripId/check', verifyToken, ReviewController.checkCanReview);

// Obtener reseña del usuario para un viaje
router.get('/trip/:tripId/user', verifyToken, ReviewController.getUserReviewForTrip);

// Obtener todas las reseñas del usuario
router.get('/user', verifyToken, ReviewController.getUserReviews);

// Obtener feed público de reseñas (sin autenticación)
router.get('/feed', optionalAuth, ReviewController.getPublicFeed);

// Obtener feed social de reseñas (filtrado por follows/followers)
router.get('/feed/social', verifyToken, ReviewController.getSocialFeed);

// Obtener reseñas de un viaje
router.get('/trip/:tripId', optionalAuth, ReviewController.getTripReviews);

// Obtener estadísticas de un viaje
router.get('/trip/:tripId/stats', optionalAuth, ReviewController.getTripStats);

export default router;
