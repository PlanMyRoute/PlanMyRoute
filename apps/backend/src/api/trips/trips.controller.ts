import { Request, Response } from "express";
import { Trip } from "@planmyroute/types";
import * as TripService from "./trips.service.js";
import { checkPermission } from "../../middleware/permissions.js";
import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from "../../utils/errors.js";
import { asyncHandler } from "../../utils/errors.js";
import { dlog } from "../../utils/debugLog.js";

/**
 * Campos del viaje que el cliente puede establecer/modificar directamente.
 * Todo lo demás (id, status, generation_status, created_at, total_price…)
 * lo controla el servidor. Evita mass assignment: un editor no puede forzar
 * el estado del viaje ni sobreescribir campos gestionados por el sistema.
 */
const EDITABLE_TRIP_FIELDS = [
  "name",
  "description",
  "start_date",
  "end_date",
  "start_time",
  "end_time",
  "circular",
  "n_adults",
  "n_children",
  "n_babies",
  "n_elders",
  "n_pets",
  "type",
  "estimated_price_min",
  "estimated_price_max",
  "additional_comments",
] as const;

/**
 * Devuelve una copia del payload con solo los campos editables por el cliente.
 */
function pickEditableTripFields(body: unknown): Partial<Trip> {
  if (!body || typeof body !== "object") return {};
  const source = body as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of EDITABLE_TRIP_FIELDS) {
    if (source[key] !== undefined) result[key] = source[key];
  }
  return result as Partial<Trip>;
}

/**
 * Obtiene todos los viajes de un usuario específico
 */
export const getUserTrips = asyncHandler(async (req, res) => {
  const { userId } = req.params as Record<string, string>; // userId es un UUID (string)
  const trips = await TripService.getUserTrips(userId);
  res.json(trips);
});

/**
 * Obtiene el historial de viajes completados de un usuario
 */
export const getUserTripHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params as Record<string, string>;
  const trips = await TripService.getUserTripHistory(userId);
  res.json(trips);
});

/**
 * Obtiene un viaje específico por su ID
 */
export const getTripById = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const tripId = parseInt(id, 10);

  dlog("📍 [getTripById] Called with id param:", req.params.id);
  const trip = await TripService.getById(tripId);
  res.json(trip);
});

/**
 * Crea un nuevo viaje con todas sus relaciones (viajeros, paradas, rutas)
 */
export const createTrip = asyncHandler(async (req, res) => {
  // Siempre usamos el userId del JWT verificado, nunca el de la URL,
  // para que nadie pueda crear viajes en nombre de otro usuario.
  const authUserId = req.userId;
  const { userId: paramUserId } = req.params as Record<string, string>;

  if (!authUserId) {
    throw new UnauthorizedError("Usuario no autenticado");
  }

  if (paramUserId && paramUserId !== authUserId) {
    throw new ForbiddenError(
      "No puedes crear un viaje en nombre de otro usuario",
    );
  }

  const { origin, destination, vehicleIds, mandatoryStops } = req.body as any;
  // Solo campos editables + las paradas obligatorias que el service consume aparte.
  const tripPayload = { ...pickEditableTripFields(req.body), mandatoryStops };

  const itinerary = await TripService.createTripWithRelations(
    authUserId,
    vehicleIds,
    tripPayload,
    origin,
    destination,
  );

  res.status(201).json(itinerary);
});

/**
 * Actualiza los datos de un viaje existente
 */
export const updateTrip = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  // Solo permitimos modificar campos editables por el cliente (evita mass assignment:
  // un editor no puede forzar status, generation_status, total_price, etc.).
  const updatedTrip = await TripService.update(
    id,
    pickEditableTripFields(req.body),
  );
  res.json(updatedTrip);
});

/**
 * Elimina un viaje por su ID
 */
export const deleteTrip = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  await TripService.deleteTrip(id);
  res.status(200).json({ message: `Viaje con id ${id} borrado correctamente` });
});

// =============== TRAVELERS CONTROLLERS ===============

/**
 * Obtiene los viajeros asociados a un viaje
 */
export const getTravelersInTrip = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const numId = parseInt(id, 10);
  const travelers = await TripService.getTravelersInTrip(numId);
  res.json(travelers);
});

/**
 * El usuario autenticado sale voluntariamente de un viaje.
 * Fuerza el userId del token: nadie puede usar esta ruta para expulsar a otro
 * viajero (para eso está la ruta /kick, restringida al owner).
 */
export const leaveTrip = asyncHandler(async (req, res) => {
  const { tripId } = req.params as Record<string, string>;
  const authUserId = req.userId;
  const numTripId = parseInt(tripId, 10);

  if (!authUserId) {
    throw new UnauthorizedError("Usuario no autenticado");
  }

  const result = await TripService.removeUserFromTrip(authUserId, numTripId);
  res.json(result);
});

/**
 * Expulsa a un usuario de un viaje (ruta /kick, restringida al owner por el
 * middleware de permisos).
 */
export const removeUserFromTrip = asyncHandler(async (req, res) => {
  const { userId, tripId } = req.params as Record<string, string>;
  const numTripId = parseInt(tripId, 10);
  const result = await TripService.removeUserFromTrip(userId, numTripId);
  res.json(result);
});

/**
 * Cambia el rol de un usuario en un viaje
 */
export const changeUserRole = asyncHandler(async (req, res) => {
  const { userId, tripId } = req.params as Record<string, string>;
  const { role } = req.body;
  const numTripId = parseInt(tripId, 10);

  if (!role || !["owner", "editor", "viewer"].includes(role)) {
    throw new BadRequestError("Rol inválido. Debe ser: owner, editor o viewer");
  }

  const result = await TripService.changeUserRole(userId, numTripId, role);
  res.json(result);
});

// =============== VEHICLE CONTROLLERS ===============

/**
 * Obtiene los vehículos asociados a un viaje
 */
export const getVehiclesInTrip = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const numId = parseInt(id, 10);
  const vehicles = await TripService.getVehiclesInTrip(numId);
  res.json(vehicles);
});

/**
 * Elimina la asociación de un vehículo con un viaje
 */
export const removeVehicleFromTrip = asyncHandler(async (req, res) => {
  const { vehicleId, tripId } = req.params as Record<string, string>;
  const numTripId = parseInt(tripId, 10);
  const result = await TripService.removeVehicleFromTrip(vehicleId, numTripId);
  res.json(result);
});

// =============== TRIP STATUS MANAGEMENT ===============

/**
 * Procesa la respuesta del usuario a una notificación de cambio de estado de viaje
 * POST /trips/:id/status/respond
 * Body: {notificationId: string, started?: boolean, completed?: boolean}
 */
export const respondToTripStatus = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const { notificationId, started, completed } = req.body;
  const tripId = parseInt(id, 10);

  if (isNaN(tripId)) {
    throw new BadRequestError("ID de viaje inválido");
  }
  if (!notificationId) {
    throw new BadRequestError("notificationId es requerido");
  }
  if (started === undefined && completed === undefined) {
    throw new BadRequestError(
      'Debe proporcionar "started" o "completed" en la respuesta',
    );
  }
  if (started !== undefined && completed !== undefined) {
    throw new BadRequestError(
      'Solo puede proporcionar "started" o "completed", no ambos',
    );
  }

  const userId = req.userId;
  if (!userId) {
    throw new UnauthorizedError("Usuario no autenticado");
  }

  const result = await TripService.respondToStatusCheck(
    tripId,
    notificationId,
    userId,
    { started, completed },
  );
  res.json(result);
});

/**
 * Obtiene el nivel de acceso del usuario actual en un viaje
 * GET /trip/:id/access-level
 */
export const getAccessLevel = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const tripId = parseInt(id, 10);
  const userId = req.userId;

  if (!userId) {
    throw new UnauthorizedError("Usuario no autenticado");
  }
  if (isNaN(tripId)) {
    throw new BadRequestError("ID de viaje inválido");
  }

  // Verificar permisos para cada acción
  const viewAccess = await checkPermission(userId, tripId, "view_trip");
  const editAccess = await checkPermission(userId, tripId, "edit_trip");
  const deleteAccess = await checkPermission(userId, tripId, "delete_trip");
  const manageTravelersAccess = await checkPermission(
    userId,
    tripId,
    "remove_travelers",
  );
  const changeRolesAccess = await checkPermission(
    userId,
    tripId,
    "change_roles",
  );
  const leaveAccess = await checkPermission(userId, tripId, "leave_trip");

  res.json({
    role: viewAccess.role,
    tripStatus: viewAccess.tripStatus,
    isGuest: viewAccess.isGuest,
    isCompleted: viewAccess.isCompleted,
    permissions: {
      canView: viewAccess.allowed,
      canEdit: editAccess.allowed,
      canDelete: deleteAccess.allowed,
      canManageTravelers: manageTravelersAccess.allowed,
      canChangeRoles: changeRolesAccess.allowed,
      canLeave: leaveAccess.allowed,
    },
  });
});
