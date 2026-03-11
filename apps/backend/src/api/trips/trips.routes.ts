import { Router } from 'express';
import * as TripController from './trips.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { requirePermission, requireOwner, requireEditor } from '../../middleware/permissions.js';

const router = Router();
const TRIP_BASE_PATH = '/trip';
const TRAVELERS_BASE_PATH = '/travelers';
const VEHICLE_BASE_PATH = '/vehicle';

// Crear viaje (el usuario se convierte en owner automáticamente)
router.post(`${TRAVELERS_BASE_PATH}/:userId${TRIP_BASE_PATH}`, verifyToken, TripController.createTrip);

// Actualizar viaje (requiere userId en params para permisos)
router.patch(`${TRAVELERS_BASE_PATH}/:userId${TRIP_BASE_PATH}/:id`, verifyToken, requireEditor(), TripController.updateTrip);

// Eliminar viaje (requiere userId en params para permisos)
router.delete(`${TRAVELERS_BASE_PATH}/:userId${TRIP_BASE_PATH}/:id`, verifyToken, requireOwner(), TripController.deleteTrip);

// Obtener viajeros de un viaje
router.get(`${TRAVELERS_BASE_PATH}${TRIP_BASE_PATH}/:id`, verifyToken, requirePermission('view_trip'), TripController.getTravelersInTrip);

// Nueva ruta: Obtener historial de viajes completados de un usuario (debe ir ANTES de la ruta general)
router.get(`${TRAVELERS_BASE_PATH}/:userId${TRIP_BASE_PATH}s/history`, verifyToken, TripController.getUserTripHistory);

// Nueva ruta: Obtener viajes de un usuario específico (no requiere permisos)
router.get(`${TRAVELERS_BASE_PATH}/:userId${TRIP_BASE_PATH}s`, verifyToken, TripController.getUserTrips);

// Gestión de colaboradores
// Salir del viaje - requiere permiso leave_trip (editor/viewer)
router.delete(`${TRAVELERS_BASE_PATH}/:userId${TRIP_BASE_PATH}/:tripId/leave`, verifyToken, requirePermission('leave_trip'), TripController.removeUserFromTrip);

// Cambiar rol - requiere permiso change_roles (solo owner)
router.patch(`${TRAVELERS_BASE_PATH}/:userId${TRIP_BASE_PATH}/:tripId/role`, verifyToken, requirePermission('change_roles'), TripController.changeUserRole);

// Expulsar viajero - requiere permiso remove_travelers (solo owner)
router.delete(`${TRAVELERS_BASE_PATH}/:userId${TRIP_BASE_PATH}/:tripId/kick`, verifyToken, requirePermission('remove_travelers'), TripController.removeUserFromTrip);

// =============== VEHICLE ROUTES ===============
// Obtener vehículos de un viaje
router.get(`${TRIP_BASE_PATH}/:id${VEHICLE_BASE_PATH}s`, verifyToken, requirePermission('view_trip'), TripController.getVehiclesInTrip);

// Eliminar vehículo de un viaje (requiere editor o owner)
router.delete(`${TRAVELERS_BASE_PATH}/:userId${TRIP_BASE_PATH}/:tripId${VEHICLE_BASE_PATH}/:vehicleId`, verifyToken, requireEditor(), TripController.removeVehicleFromTrip);

// =============== TRIP STATUS MANAGEMENT ROUTES ===============
// Responder a notificación de cambio de estado (solo owner puede responder)
router.post(`${TRIP_BASE_PATH}/:id/status/respond`, verifyToken, TripController.respondToTripStatus);

// Obtener nivel de acceso del usuario actual en un viaje
router.get(`${TRIP_BASE_PATH}/:id/access-level`, verifyToken, TripController.getAccessLevel);

router.get(`${TRIP_BASE_PATH}/:id`, verifyToken, requirePermission('view_trip'), TripController.getTripById);

export default router;