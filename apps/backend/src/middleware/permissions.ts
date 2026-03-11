// src/middleware/permissions.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase.js';
import { CollaboratorRole } from '@planmyroute/types';

/**
 * Definición de acciones que requieren permisos
 */
export type TripAction =
    | 'view_trip'
    | 'edit_trip'
    | 'delete_trip'
    | 'leave_trip'
    | 'invite_travelers'
    | 'change_roles'
    | 'remove_travelers'
    | 'add_stop'
    | 'edit_stop'
    | 'delete_stop'
    | 'manage_routes'
    | 'manage_accommodations'
    | 'manage_activities';

/**
 * Roles extendidos incluyendo 'guest' para usuarios no invitados
 */
export type ExtendedRole = CollaboratorRole | 'guest';

/**
 * Estados de un viaje
 */
export type TripStatus = 'planning' | 'going' | 'completed';

/**
 * Matriz de permisos del lado del servidor (debe coincidir con el frontend)
 */
const PERMISSIONS_MATRIX: Record<TripAction, CollaboratorRole[]> = {
    // Viaje
    view_trip: ['owner', 'editor', 'viewer'],
    edit_trip: ['owner', 'editor'],
    delete_trip: ['owner'],
    leave_trip: ['editor', 'viewer'],

    // Colaboradores
    invite_travelers: ['owner', 'editor'],
    change_roles: ['owner'],
    remove_travelers: ['owner'],

    // Itinerario
    add_stop: ['owner', 'editor'],
    edit_stop: ['owner', 'editor'],
    delete_stop: ['owner', 'editor'],
    manage_routes: ['owner', 'editor'],

    // Servicios
    manage_accommodations: ['owner', 'editor'],
    manage_activities: ['owner', 'editor'],
};

/**
 * Acciones permitidas para usuarios guest (no invitados al viaje)
 */
const GUEST_PERMISSIONS: TripAction[] = ['view_trip'];

/**
 * Acciones permitidas en viajes completados
 */
const COMPLETED_TRIP_PERMISSIONS: TripAction[] = [
    'view_trip',
    'delete_trip', // solo owner
];

/**
 * Obtiene el rol del usuario en un viaje específico
 * Retorna 'guest' si el usuario no está en travelers
 */
async function getUserRoleInTrip(userId: string, tripId: number): Promise<ExtendedRole> {
    const { data, error } = await supabase
        .from('travelers')
        .select('user_role')
        .eq('user_id', userId)
        .eq('trip_id', tripId)
        .maybeSingle();

    // Si no hay error pero no hay data, el usuario no está invitado (es guest)
    if (!error && !data) {
        return 'guest';
    }

    // Si hay error, tratarlo como guest por seguridad
    if (error) {
        console.error('Error obteniendo rol del usuario:', error);
        return 'guest';
    }

    return data!.user_role as CollaboratorRole;
}

/**
 * Obtiene el estado actual del viaje
 */
async function getTripStatus(tripId: number): Promise<TripStatus | null> {
    const { data, error } = await supabase
        .from('trip')
        .select('status')
        .eq('id', tripId)
        .single();

    if (error || !data) {
        console.error('Error obteniendo estado del viaje:', error);
        return null;
    }

    return data.status as TripStatus;
}

/**
 * Verifica si un rol tiene permiso para realizar una acción
 * Considera el rol extendido (incluyendo guest) y el estado del viaje
 */
function hasPermission(
    role: ExtendedRole,
    action: TripAction,
    tripStatus: TripStatus | null = null
): boolean {
    // Si es guest, solo puede realizar acciones de GUEST_PERMISSIONS
    if (role === 'guest') {
        return GUEST_PERMISSIONS.includes(action);
    }

    // Si el viaje está completado, verificar permisos especiales
    if (tripStatus === 'completed') {
        // Solo permitir acciones de COMPLETED_TRIP_PERMISSIONS
        if (!COMPLETED_TRIP_PERMISSIONS.includes(action)) {
            return false;
        }

        // delete_trip solo para owner en viajes completados
        if (action === 'delete_trip') {
            return role === 'owner';
        }

        // view_trip permitido para todos los roles (owner, editor, viewer)
        return true;
    }

    // Flujo normal de permisos para viajes en planning o going
    const allowedRoles = PERMISSIONS_MATRIX[action];
    return allowedRoles.includes(role as CollaboratorRole);
}

/**
 * Middleware para verificar permisos en rutas protegidas
 * Considera el estado del viaje y si el usuario es guest
 */
export function requirePermission(action: TripAction) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Obtener el tripId de los parámetros de la ruta
            const tripId = req.params.tripId || req.params.id;

            if (!tripId) {
                return res.status(400).json({
                    error: 'No se proporcionó el ID del viaje'
                });
            }

            let userId: string;

            if (action === 'change_roles') {
                // Para cambiar roles, buscar el actorUserId en el body
                userId = req.body.actorUserId || (req as any).user?.id;
            } else if (action === 'remove_travelers') {
                // Para expulsar, buscar el actorUserId en query params (DELETE no acepta body)
                userId = (req.query.actorUserId as string) || (req as any).user?.id;
            } else {
                // Para otras acciones, el userId está en los params
                userId = req.params.userId || (req as any).user?.id;
            }

            if (!userId) {
                return res.status(401).json({
                    error: 'Usuario no autenticado'
                });
            }

            // Obtener el rol del usuario en el viaje (puede ser 'guest')
            const role = await getUserRoleInTrip(userId, Number(tripId));

            // Obtener el estado del viaje
            const tripStatus = await getTripStatus(Number(tripId));

            // Verificar si tiene permiso considerando el rol y el estado del viaje
            if (!hasPermission(role, action, tripStatus)) {
                // Mensaje personalizado según el motivo
                let errorMessage = `No tienes permiso para realizar esta acción (${action})`;

                if (role === 'guest') {
                    errorMessage = 'No tienes acceso a este viaje. Solo puedes visualizarlo.';
                } else if (tripStatus === 'completed') {
                    errorMessage = 'Este viaje ha finalizado y no puede ser editado.';
                }

                return res.status(403).json({
                    error: errorMessage,
                    userRole: role,
                    tripStatus: tripStatus,
                    requiredRoles: role === 'guest' ? [] : PERMISSIONS_MATRIX[action]
                });
            }

            // Adjuntar el rol y estado al request para usarlo en el controlador si es necesario
            (req as any).userRole = role;
            (req as any).tripStatus = tripStatus;

            next();
        } catch (error) {
            console.error('Error verificando permisos:', error);
            return res.status(500).json({
                error: 'Error al verificar permisos'
            });
        }
    };
}

/**
 * Middleware para verificar que el usuario es propietario del viaje
 * Atajo para acciones que solo puede hacer el owner
 */
export function requireOwner() {
    return requirePermission('delete_trip'); // delete_trip solo lo puede hacer owner
}

/**
 * Middleware para verificar que el usuario puede editar (owner o editor)
 */
export function requireEditor() {
    return requirePermission('edit_trip'); // edit_trip lo pueden hacer owner y editor
}

/**
 * Verifica permisos directamente en un controlador (sin middleware)
 * Útil cuando necesitas hacer validaciones más complejas
 */
export async function checkPermission(
    userId: string,
    tripId: number,
    action: TripAction
): Promise<{
    allowed: boolean;
    role: ExtendedRole;
    tripStatus: TripStatus | null;
    isGuest: boolean;
    isCompleted: boolean;
}> {
    const role = await getUserRoleInTrip(userId, tripId);
    const tripStatus = await getTripStatus(tripId);
    const allowed = hasPermission(role, action, tripStatus);

    return {
        allowed,
        role,
        tripStatus,
        isGuest: role === 'guest',
        isCompleted: tripStatus === 'completed'
    };
}
