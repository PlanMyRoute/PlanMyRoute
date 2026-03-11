import { Request, Response } from 'express';
import * as TripService from './trips.service.js';

/**
 * Obtiene todos los viajes de un usuario específico
 */
export const getUserTrips = async (req: Request, res: Response) => {
    const { userId } = req.params; // userId es un UUID (string)
    try {
        const trips = await TripService.getUserTrips(userId);
        res.json(trips);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

/**
 * Obtiene el historial de viajes completados de un usuario
 */
export const getUserTripHistory = async (req: Request, res: Response) => {
    const { userId } = req.params; // userId es un UUID (string)
    try {
        const trips = await TripService.getUserTripHistory(userId);
        res.json(trips);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const getTripById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const tripId = parseInt(id, 10);

    try {
        console.log('📍 [getTripById] Called with id param:', req.params.id);
        const trip = await TripService.getById(tripId);
        res.json(trip);
    } catch (error) {
        const err = error as Error;
        console.error('🔴 [getTripById] Error:', {
            id: tripId,
            message: err.message,
            stack: err.stack,
        });
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const createTrip = async (req: Request, res: Response) => {
    const { userId } = req.params; // userId es un UUID (string)
    try {
        const { origin, destination, vehicleIds, ...tripPayload } = req.body as any;

        // El service se encarga de toda la lógica de creación
        const itinerary = await TripService.createTripWithRelations(
            userId,
            vehicleIds,
            tripPayload,
            origin,
            destination
        );

        return res.status(201).json(itinerary);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const updateTrip = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const updatedTrip = await TripService.update(id, req.body);
        res.json(updatedTrip);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const deleteTrip = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await TripService.deleteTrip(id);
        res.status(200).json({ message: `Viaje con id ${id} borrado correctamente` });
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

// =============== TRAVELERS CONTROLLERS ===============
export const getTravelersInTrip = async (req: Request, res: Response) => {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    try {
        const travelers = await TripService.getTravelersInTrip(numId);
        res.json(travelers);
    }
    catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

/**
 * Elimina a un usuario de un viaje (salir del viaje o expulsar)
 */
export const removeUserFromTrip = async (req: Request, res: Response) => {
    const { userId, tripId } = req.params;
    const numTripId = parseInt(tripId, 10);

    try {
        const result = await TripService.removeUserFromTrip(userId, numTripId);
        res.json(result);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('no es parte') || err.message.includes('único propietario')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

/**
 * Cambia el rol de un usuario en un viaje
 */
export const changeUserRole = async (req: Request, res: Response) => {
    const { userId, tripId } = req.params;
    const { role } = req.body;
    const numTripId = parseInt(tripId, 10);

    if (!role || !['owner', 'editor', 'viewer'].includes(role)) {
        return res.status(400).json({
            error: 'Rol inválido. Debe ser: owner, editor o viewer'
        });
    }

    try {
        const result = await TripService.changeUserRole(userId, numTripId, role);
        res.json(result);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('no es parte') || err.message.includes('único propietario')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

// =============== VEHICLE CONTROLLERS ===============

export const getVehiclesInTrip = async (req: Request, res: Response) => {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    try {
        const vehicles = await TripService.getVehiclesInTrip(numId);
        res.json(vehicles);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const removeVehicleFromTrip = async (req: Request, res: Response) => {
    const { vehicleId, tripId } = req.params;
    const numTripId = parseInt(tripId, 10);
    try {
        const result = await TripService.removeVehicleFromTrip(vehicleId, numTripId);
        res.json(result);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('no está asociado')) {
            return res.status(400).json({ error: err.message });
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
export const respondToTripStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { notificationId, started, completed } = req.body;
    const tripId = parseInt(id, 10);

    // Validaciones
    if (isNaN(tripId)) {
        return res.status(400).json({ error: 'ID de viaje inválido' });
    }

    if (!notificationId) {
        return res.status(400).json({ error: 'notificationId es requerido' });
    }

    if (started === undefined && completed === undefined) {
        return res.status(400).json({
            error: 'Debe proporcionar "started" o "completed" en la respuesta'
        });
    }

    if (started !== undefined && completed !== undefined) {
        return res.status(400).json({
            error: 'Solo puede proporcionar "started" o "completed", no ambos'
        });
    }

    // El userId viene del middleware de autenticación
    const userId = (req as any).user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    try {
        const result = await TripService.respondToStatusCheck(
            tripId,
            notificationId,
            userId,
            { started, completed }
        );
        res.json(result);
    } catch (error) {
        const err = error as Error;
        console.error('🔴 [respondToTripStatus] Error:', err.message);

        if (err.message.includes('Solo el propietario') ||
            err.message.includes('no está en estado')) {
            return res.status(403).json({ error: err.message });
        }

        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }

        res.status(500).json({ error: err.message });
    }
};

/**
 * Obtiene el nivel de acceso del usuario actual en un viaje
 * GET /trip/:id/access-level
 */
export const getAccessLevel = async (req: Request, res: Response) => {
    const { id } = req.params;
    const tripId = parseInt(id, 10);
    const userId = (req as any).user?.id;

    if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (isNaN(tripId)) {
        return res.status(400).json({ error: 'ID de viaje inválido' });
    }

    try {
        // Usar checkPermission del middleware para obtener el nivel de acceso
        const { checkPermission } = await import('../../middleware/permissions.js');

        // Verificar permisos para cada acción
        const viewAccess = await checkPermission(userId, tripId, 'view_trip');
        const editAccess = await checkPermission(userId, tripId, 'edit_trip');
        const deleteAccess = await checkPermission(userId, tripId, 'delete_trip');
        const manageTravelersAccess = await checkPermission(userId, tripId, 'remove_travelers');
        const changeRolesAccess = await checkPermission(userId, tripId, 'change_roles');
        const leaveAccess = await checkPermission(userId, tripId, 'leave_trip');

        return res.json({
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
                canLeave: leaveAccess.allowed
            }
        });
    } catch (error) {
        const err = error as Error;
        console.error('🔴 [getAccessLevel] Error:', err.message);

        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }

        res.status(500).json({ error: err.message });
    }
};