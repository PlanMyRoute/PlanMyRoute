import { Router } from 'express';
import * as NotificationController from './notifications.controller.js';
import { verifyToken } from '../../middleware/auth.js';

const router = Router();
const BASE_PATH = '/notification';

// Receiver user
router.get(`${BASE_PATH}/receiver/:userId`, verifyToken, NotificationController.getNotificationsByReceiver);

// Trip notifications
router.get(`${BASE_PATH}/trip/:tripId`, verifyToken, NotificationController.getNotificationsByTrip);

// Obtener notificación por id
router.get(`${BASE_PATH}/:id`, verifyToken, NotificationController.getNotificationById);

// Crear notificación
router.post(`${BASE_PATH}`, verifyToken, NotificationController.createNotification);

// Notificaction actions
router.patch(`${BASE_PATH}/:id/read`, verifyToken, NotificationController.markNotificationAsRead);
router.patch(`${BASE_PATH}/:id/accept`, verifyToken, NotificationController.acceptInvitation);
router.patch(`${BASE_PATH}/:id/decline`, verifyToken, NotificationController.declineInvitation);

// Actualizar notificación
router.patch(`${BASE_PATH}/:id`, verifyToken, NotificationController.updateNotification);

// Eliminar
router.delete(`${BASE_PATH}/:id`, verifyToken, NotificationController.deleteNotification);

export default router;
