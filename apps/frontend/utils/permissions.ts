import { CollaboratorRole } from '@planmyroute/types';

/**
 * Definición de todas las acciones posibles en el sistema
 */
export type TripAction =
    // Viaje
    | 'view_trip'
    | 'edit_trip'
    | 'delete_trip'
    | 'leave_trip'
    // Colaboradores
    | 'invite_travelers'
    | 'change_roles'
    | 'remove_travelers'
    // Itinerario
    | 'add_stop'
    | 'edit_stop'
    | 'delete_stop'
    | 'manage_routes'
    // Servicios
    | 'manage_accommodations'
    | 'manage_activities';

/**
 * Matriz de permisos: define qué roles pueden realizar qué acciones
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
 * Verifica si un rol tiene permiso para realizar una acción
 */
export function canPerformAction(
    role: CollaboratorRole | 'pending' | null | undefined,
    action: TripAction
): boolean {
    if (!role || role === 'pending') return false;

    const allowedRoles = PERMISSIONS_MATRIX[action];
    return allowedRoles.includes(role as CollaboratorRole);
}

/**
 * Obtiene todos los permisos de un rol de forma estructurada
 */
export function getRolePermissions(role: CollaboratorRole | 'pending' | null | undefined) {
    return {
        // Viaje
        canView: canPerformAction(role, 'view_trip'),
        canEdit: canPerformAction(role, 'edit_trip'),
        canDelete: canPerformAction(role, 'delete_trip'),
        canLeave: canPerformAction(role, 'leave_trip'),

        // Colaboradores
        canInvite: canPerformAction(role, 'invite_travelers'),
        canChangeRoles: canPerformAction(role, 'change_roles'),
        canRemoveTravelers: canPerformAction(role, 'remove_travelers'),

        // Itinerario
        canAddStop: canPerformAction(role, 'add_stop'),
        canEditStop: canPerformAction(role, 'edit_stop'),
        canDeleteStop: canPerformAction(role, 'delete_stop'),
        canManageRoutes: canPerformAction(role, 'manage_routes'),

        // Servicios
        canManageAccommodations: canPerformAction(role, 'manage_accommodations'),
        canManageActivities: canPerformAction(role, 'manage_activities'),

        // Helpers combinados
        canManageItinerary: canPerformAction(role, 'add_stop') ||
            canPerformAction(role, 'edit_stop') ||
            canPerformAction(role, 'delete_stop'),
        canManageTrip: canPerformAction(role, 'edit_trip') ||
            canPerformAction(role, 'delete_trip'),

        // Rol actual
        role: role,
        isOwner: role === 'owner',
        isEditor: role === 'editor',
        isViewer: role === 'viewer',
        isPending: role === 'pending',
    };
}

/**
 * Verifica si el usuario es propietario del viaje
 */
export function isOwner(role: CollaboratorRole | 'pending' | null | undefined): boolean {
    return role === 'owner';
}

/**
 * Verifica si el usuario puede editar (owner o editor)
 */
export function canEdit(role: CollaboratorRole | 'pending' | null | undefined): boolean {
    return role === 'owner' || role === 'editor';
}

/**
 * Verifica si el usuario solo puede ver (viewer)
 */
export function isViewer(role: CollaboratorRole | 'pending' | null | undefined): boolean {
    return role === 'viewer';
}
