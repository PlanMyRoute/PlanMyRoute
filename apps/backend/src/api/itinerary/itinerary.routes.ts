import { Router } from 'express';
import * as ItineraryController from './itinerary.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { requirePermission, requireEditor } from '../../middleware/permissions.js';

const router = Router();
const TRIP_BASE_PATH = '/trip/:tripId';
const STOP_BASE_PATH = '/stop';

// =============== STOP ROUTES ===============

// Obtener parada por ID (solo requiere autenticación, no tripId)
router.get(`${STOP_BASE_PATH}/:stopId`, verifyToken, ItineraryController.getStopById);

// Obtener precio de una parada
router.get(`${STOP_BASE_PATH}/:stopId/price`, verifyToken, ItineraryController.getStopPrice);
// Crear nueva parada
router.post(`${TRIP_BASE_PATH}${STOP_BASE_PATH}`, verifyToken, requireEditor(), ItineraryController.createStop);
//Crear nueva parada tipo: activity
router.post(`${TRIP_BASE_PATH}${STOP_BASE_PATH}/activity`, verifyToken, requireEditor(), ItineraryController.createActivityStop);
//Crear nueva parada tipo: accommodation
router.post(`${TRIP_BASE_PATH}${STOP_BASE_PATH}/accommodation`, verifyToken, requireEditor(), ItineraryController.createAccommodationStop);
//Crear nueva parada tipo: refuel
router.post(`${TRIP_BASE_PATH}${STOP_BASE_PATH}/refuel`, verifyToken, requireEditor(), ItineraryController.createRefuelStop);

// Obtener parada tipo: refuel
router.get(`${STOP_BASE_PATH}/refuel/:stopId`, verifyToken, requirePermission('view_trip'), ItineraryController.getRefuelStop);

// Actualizar parada
router.patch(`${TRIP_BASE_PATH}${STOP_BASE_PATH}/:stopId`, verifyToken, requireEditor(), ItineraryController.updateStop);
// Actualizar parada tipo: activity
router.patch(`${TRIP_BASE_PATH}${STOP_BASE_PATH}/activity/:stopId`, verifyToken, requireEditor(), ItineraryController.updateActivityStop);
// Actualizar parada tipo: accommodation
router.patch(`${TRIP_BASE_PATH}${STOP_BASE_PATH}/accommodation/:stopId`, verifyToken, requireEditor(), ItineraryController.updateAccommodationStop);
// Actualizar parada tipo: refuel
router.patch(`${TRIP_BASE_PATH}${STOP_BASE_PATH}/refuel/:stopId`, verifyToken, requireEditor(), ItineraryController.updateRefuelStop);

// Eliminar parada
router.delete(`${TRIP_BASE_PATH}${STOP_BASE_PATH}/:stopId`, verifyToken, requireEditor(), ItineraryController.deleteStop);

// =============== ITINERARY ROUTE ===============

// Obtener itinerario completo de un viaje (todas las rutas con sus paradas)
router.get(`/itinerary/trip/:tripId`, verifyToken, requirePermission('view_trip'), ItineraryController.getTripItinerary);

router.get(`/itinerary/trip/:tripId/stops`, verifyToken, requirePermission('view_trip'), ItineraryController.getAllStopsInATrip);

// Obtener suma total de costos de repostaje de un usuario
router.get(`/refuel/user/:userId/total-cost`, verifyToken, ItineraryController.getTotalRefuelCostByUser);

// Obtener suma total de costos de repostaje de un viaje
router.get(`/refuel/trip/:tripId/total-cost`, verifyToken, requirePermission('view_trip'), ItineraryController.getTotalRefuelCostByTrip);

// Obtener suma total de costos de alojamiento de un viaje
router.get(`/accommodation/trip/:tripId/total-cost`, verifyToken, requirePermission('view_trip'), ItineraryController.getTotalAccommodationCostByTrip);

// Obtener suma total de costos de actividades de un viaje
router.get(`/activity/trip/:tripId/total-cost`, verifyToken, requirePermission('view_trip'), ItineraryController.getTotalActivityCostByTrip);

// =============== ATTACHMENT ROUTES ===============

// Subir adjunto a una parada
router.post(`${STOP_BASE_PATH}/:stopId/attachments`, verifyToken, requireEditor(), ItineraryController.uploadAttachment);

// Obtener adjuntos de una parada
router.get(`${STOP_BASE_PATH}/:stopId/attachments`, verifyToken, requirePermission('view_trip'), ItineraryController.getAttachments);

// Eliminar adjunto
router.delete(`/attachments/:attachmentId`, verifyToken, requireEditor(), ItineraryController.deleteAttachmentHandler);

// =============== STOP PHOTOS ROUTES ===============

// Actualizar foto de una parada específica
router.post(`${STOP_BASE_PATH}/:stopId/refresh-photo`, verifyToken, requireEditor(), ItineraryController.refreshStopPhoto);

// Actualizar fotos de todas las paradas de un viaje
router.post(`${TRIP_BASE_PATH}/refresh-stops-photos`, verifyToken, requireEditor(), ItineraryController.refreshTripStopsPhotos);

export default router;
