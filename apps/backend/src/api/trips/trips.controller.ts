import { Request, Response } from "express";
import * as TripService from "./trips.service.js";
import { checkPermission } from "../../middleware/permissions.js";

/**
 * Obtiene todos los viajes de un usuario específico
 */
export const getUserTrips = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId } = req.params as Record<string, string>; // userId es un UUID (string)
  try {
    const trips = await TripService.getUserTrips(userId);
    res.json(trips);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.message.includes("PREMIUM") || err.message.includes("premium")) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtiene el historial de viajes completados de un usuario
 */
export const getUserTripHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId } = req.params as Record<string, string>; // userId es un UUID (string)
  try {
    const trips = await TripService.getUserTripHistory(userId);
    res.json(trips);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.message.includes("PREMIUM") || err.message.includes("premium")) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtiene un viaje específico por su ID
 * @param req - Request con el parámetro id del viaje
 * @param res - Response con los datos del viaje o error
 */
export const getTripById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const tripId = parseInt(id, 10);

  try {
    console.log("📍 [getTripById] Called with id param:", req.params.id);
    const trip = await TripService.getById(tripId);
    res.json(trip);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.message.includes("PREMIUM") || err.message.includes("premium")) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Crea un nuevo viaje con todas sus relaciones (viajeros, paradas, rutas)
 * @param req - Request con userId en params y datos del viaje en body
 * @param res - Response con el itinerario completo del viaje creado
 */
export const createTrip = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId } = req.params as Record<string, string>; // userId es un UUID (string)
  try {
    const { origin, destination, vehicleIds, ...tripPayload } = req.body as any;

    // El service se encarga de toda la lógica de creación
    const itinerary = await TripService.createTripWithRelations(
      userId,
      vehicleIds,
      tripPayload,
      origin,
      destination,
    );

    res.status(201).json(itinerary);
    return;
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.message.includes("PREMIUM") || err.message.includes("premium")) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Actualiza los datos de un viaje existente
 * @param req - Request con el ID del viaje en params y campos a modificar en body
 * @param res - Response con el viaje actualizado o error
 */
export const updateTrip = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;

  try {
    const updatedTrip = await TripService.update(id, req.body);
    res.json(updatedTrip);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.message.includes("PREMIUM") || err.message.includes("premium")) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Elimina un viaje por su ID
 * @param req - Request con el ID del viaje en params
 * @param res - Response con mensaje de confirmación o error
 */
export const deleteTrip = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  try {
    await TripService.deleteTrip(id);
    res
      .status(200)
      .json({ message: `Viaje con id ${id} borrado correctamente` });
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.message.includes("PREMIUM") || err.message.includes("premium")) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

// =============== TRAVELERS CONTROLLERS ===============
/**
 * Obtiene los viajeros asociados a un viaje
 * @param req - Request con el ID del viaje en params
 * @param res - Response con la lista de viajeros o error
 */
export const getTravelersInTrip = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const numId = parseInt(id, 10);
  try {
    const travelers = await TripService.getTravelersInTrip(numId);
    res.json(travelers);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.message.includes("PREMIUM") || err.message.includes("premium")) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Elimina a un usuario de un viaje (salir del viaje o expulsar)
 */
export const removeUserFromTrip = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId, tripId } = req.params as Record<string, string>;
  const numTripId = parseInt(tripId, 10);

  try {
    const result = await TripService.removeUserFromTrip(userId, numTripId);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.message.includes("PREMIUM") || err.message.includes("premium")) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no es parte") ||
      err.message.includes("único propietario")
    ) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Cambia el rol de un usuario en un viaje
 */
export const changeUserRole = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId, tripId } = req.params as Record<string, string>;
  const { role } = req.body;
  const numTripId = parseInt(tripId, 10);

  if (!role || !["owner", "editor", "viewer"].includes(role)) {
    res.status(400).json({
      error: "Rol inválido. Debe ser: owner, editor o viewer",
    });
    return;
  }

  try {
    const result = await TripService.changeUserRole(userId, numTripId, role);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.message.includes("PREMIUM") || err.message.includes("premium")) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no es parte") ||
      err.message.includes("único propietario")
    ) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

// =============== VEHICLE CONTROLLERS ===============

/**
 * Obtiene los vehículos asociados a un viaje
 * @param req - Request con el ID del viaje en params
 * @param res - Response con la lista de vehículos o error
 */
export const getVehiclesInTrip = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const numId = parseInt(id, 10);
  try {
    const vehicles = await TripService.getVehiclesInTrip(numId);
    res.json(vehicles);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.message.includes("PREMIUM") || err.message.includes("premium")) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Elimina la asociación de un vehículo con un viaje
 * @param req - Request con vehicleId y tripId en params
 * @param res - Response con el resultado o error
 */
export const removeVehicleFromTrip = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { vehicleId, tripId } = req.params as Record<string, string>;
  const numTripId = parseInt(tripId, 10);
  try {
    const result = await TripService.removeVehicleFromTrip(
      vehicleId,
      numTripId,
    );
    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.message.includes("PREMIUM") || err.message.includes("premium")) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (err.message.includes("no está asociado")) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

// =============== TRIP STATUS MANAGEMENT ===============

/**
 * Procesa la respuesta del usuario a una notificación de cambio de estado de viaje
 * POST /trips/:id/status/respond
 * Body: {notificationId: string, started?: boolean, completed?: boolean}
 */
export const respondToTripStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const { notificationId, started, completed } = req.body;
  const tripId = parseInt(id, 10);

  // Validaciones
  if (isNaN(tripId)) {
    res.status(400).json({ error: "ID de viaje inválido" });
    return;
  }

  if (!notificationId) {
    res.status(400).json({ error: "notificationId es requerido" });
    return;
  }

  if (started === undefined && completed === undefined) {
    res.status(400).json({
      error: 'Debe proporcionar "started" o "completed" en la respuesta',
    });
    return;
  }

  if (started !== undefined && completed !== undefined) {
    res.status(400).json({
      error: 'Solo puede proporcionar "started" o "completed", no ambos',
    });
    return;
  }

  // El userId viene del middleware de autenticación
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Usuario no autenticado" });
    return;
  }

  try {
    const result = await TripService.respondToStatusCheck(
      tripId,
      notificationId,
      userId,
      { started, completed },
    );
    res.json(result);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("no está en estado")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.message.includes("PREMIUM") || err.message.includes("premium")) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtiene el nivel de acceso del usuario actual en un viaje
 * GET /trip/:id/access-level
 */
export const getAccessLevel = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const tripId = parseInt(id, 10);
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: "Usuario no autenticado" });
    return;
  }

  if (isNaN(tripId)) {
    res.status(400).json({ error: "ID de viaje inválido" });
    return;
  }

  try {
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
    return;
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err.message.includes("PREMIUM") || err.message.includes("premium")) {
      res.status(403).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};
