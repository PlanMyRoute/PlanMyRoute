// src/api/users/users.routes.ts
import { Router } from 'express';
import * as UserController from './users.controller.js';
import { verifyToken, requireSameUser, optionalAuth } from '../../middleware/auth.js';

const router = Router();
const BASE_PATH = '/user';

// Ruta de búsqueda (debe ir ANTES de /:id para evitar conflictos)
router.get(`${BASE_PATH}/search/username/:username`, UserController.searchUsersByUsername);
// Ruta para obtener usuario por username (debe ir ANTES de /:id)
router.get(`${BASE_PATH}/username/:username`, UserController.getUserByUsername);

// Rutas específicas de usuario
// Profile es público (solo requiere token para ver estadísticas propias)
router.get(`${BASE_PATH}/:id/profile`, optionalAuth, UserController.getUserProfile);
router.post(`${BASE_PATH}/:id/upload-profile-image`, verifyToken, requireSameUser, UserController.uploadProfileImage);
router.get(`${BASE_PATH}/:id/trips`, verifyToken, requireSameUser, UserController.getAllUserTrips);
router.get(`${BASE_PATH}/:id/trips/count`, verifyToken, requireSameUser, UserController.getUserTripsCount);
router.get(`${BASE_PATH}/:id/trips/finished/count`, verifyToken, requireSameUser, UserController.getUserFinishedTripsCount);
router.get(`${BASE_PATH}/:id/trip/:tripId`, verifyToken, requireSameUser, UserController.getUserTripByTripId);

// Preferencias de usuario
router.get(`${BASE_PATH}/:id/preferences`, verifyToken, requireSameUser, UserController.getUserPreferences);
router.patch(`${BASE_PATH}/:id/preferences`, verifyToken, requireSameUser, UserController.updateUserPreferences);

// Token de notificaciones push
router.patch(`${BASE_PATH}/:id/push-token`, verifyToken, requireSameUser, UserController.updatePushToken);

// Estadísticas de uso (viajes IA, vehículos, etc.)
router.get(`${BASE_PATH}/:id/usage`, verifyToken, requireSameUser, UserController.getUserUsageStats);

// Rutas genéricas con :id (requieren autenticación y que sea el mismo usuario)
router.get(`${BASE_PATH}/:id`, verifyToken, requireSameUser, UserController.getUserById);
router.post(`${BASE_PATH}`, optionalAuth, UserController.createUser); // Permitir crear con token opcional
router.patch(`${BASE_PATH}/:id`, verifyToken, requireSameUser, UserController.updateUser);
router.delete(`${BASE_PATH}/:id`, verifyToken, requireSameUser, UserController.deleteUser);

export default router;
