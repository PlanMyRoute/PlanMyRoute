// src/api/trips/trips.service.ts
import { supabase } from '../../supabase.js';
import { Trip, CollaboratorRole } from '@planmyroute/types';
import * as ItineraryService from '../itinerary/itinerary.service.js';

const TABLE_NAME = 'trip';
const TRAVELERS_TABLE_NAME = 'travelers';
const ROAD_TRIP_TABLE_NAME = 'road_trip';

export const getById = async (id: number) => {
    console.log('🔍 [TripService.getById] Querying trip with id:', id);
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('❌ [TripService.getById] Supabase error:', { id, error });
        throw new Error(`Error al obtener el viaje: ${error.message}`);
    }

    if (!data) {
        console.warn('⚠️ [TripService.getById] No trip found for id:', id);
        throw new Error(`No se encontró ningún viaje con el id: ${id}`);
    }

    console.log('✅ [TripService.getById] Trip found:', { id, tripName: data.name });
    return data;
};

export const getTravelersInTrip = async (tripId: number) => {
    const { data, error } = await supabase
        .from(TRAVELERS_TABLE_NAME)
        .select('*')
        .eq('trip_id', tripId);

    if (error) {
        throw new Error(`Error al obtener los viajeros del viaje: ${error.message}`);
    }

    // Si no hay viajeros, devolvemos un array vacío
    if (!data || data.length === 0) {
        return [];
    }

    // Extraemos los ids de usuario y pedimos todos los usuarios en una sola consulta
    const userIds = Array.from(new Set(data.map((t: any) => t.user_id).filter(Boolean)));

    if (userIds.length === 0) {
        // No hay user_id válidos, devolvemos los datos crudos
        return data;
    }

    const { data: users, error: usersError } = await supabase
        .from('user')
        .select('*')
        .in('id', userIds as any[]);

    if (usersError) {
        throw new Error(`Error al obtener los usuarios relacionados: ${usersError.message}`);
    }

    // Mapear usuarios por id para buscar rápidamente
    const usersById = new Map<string, any>();
    (users || []).forEach((u: any) => usersById.set(String(u.id), u));

    // Devolver la información completa del usuario junto con su rol en el viaje
    // Estructura: { user: { ...userData }, role: traveler.user_role }
    return data.map((traveler: any) => ({
        user: usersById.get(String(traveler.user_id)) || { id: traveler.user_id },
        role: traveler.user_role,
    }));
};

export const createTrip = async (tripData: Trip) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(tripData)
        .select()
        .single();

    if (error) {
        throw new Error(`Error al crear el viaje: ${error.message}`);
    }

    return data;
};

/**
 * Crea un viaje completo con todas sus relaciones:
 * - Crea el viaje en la base de datos
 * - Crea la relación usuario-viaje (traveler)
 * - Crea las paradas de origen y destino
 * - Crea la ruta inicial que une origen y destino
 * - Retorna el itinerario completo del viaje
 */
export const createTripWithRelations = async (
    userId: string,
    vehicleIds: string[],
    tripData: any,
    origin: string,
    destination: string
) => {
    try {
        // 1. Obtener imagen de portada
        const imageUrl = await getCoverImageUrl(destination);

        // 2. Limpiar tripData: eliminar campos que no pertenecen a la tabla trip
        const { origin: _, destination: __, vehicleIds: ___, travelStyle: ____, ...cleanTripData } = tripData;
        cleanTripData.cover_image_url = imageUrl;

        // 3. Crear el viaje
        const newTrip = await createTrip(cleanTripData);

        // 4. Crear la relación usuario-viaje (owner)
        await createUserTripRelation(userId, newTrip.id!, 'owner');

        // 5. Crear relaciones vehículo-viaje si se proporcionan vehicleIds
        if (vehicleIds && Array.isArray(vehicleIds)) {
            for (const vehicleId of vehicleIds) {
                await createVehicleTripRelation(vehicleId, newTrip.id!);
            }
        }

        // 6. Crear paradas de origen y destino
        const originStop = await ItineraryService.createStopOrigin(origin, newTrip);
        const destinationStop = await ItineraryService.createStopDestination(destination, newTrip);

        // 7. Crear la ruta inicial
        await ItineraryService.createInitialRoute(originStop, destinationStop, newTrip);

        // 8. Obtener y retornar el itinerario completo
        return await ItineraryService.getTripItinerary(newTrip.id!);
    } catch (error) {
        const err = error as Error;
        throw new Error(`Error al crear el viaje con sus relaciones: ${err.message}`);
    }
};

export const update = async (id: string, tripData: Partial<Trip>) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(tripData)
        .eq('id', id)
        .select()
        .maybeSingle();

    if (error) {
        throw new Error(`Error al actualizar el viaje: ${error.message}`);
    }

    if (!data) {
        throw new Error(`No se encontró ningún viaje con el id: ${id}`);
    }

    return data;
};

export const deleteTrip = async (id: string) => {
    // Primero verificamos que el viaje existe
    const { data: existingTrip } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .eq('id', id)
        .maybeSingle();

    if (!existingTrip) {
        throw new Error(`No se encontró ningún viaje con el id: ${id}`);
    }

    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Error al eliminar el viaje: ${error.message}`);
    }

    return id;
};

// =============== TRAVELERS SERVICES ===============
export const createUserTripRelation = async (userId: string, tripId: number, role: CollaboratorRole) => {
    const { data, error } = await supabase
        .from(TRAVELERS_TABLE_NAME)
        .insert({ user_id: userId, trip_id: tripId, user_role: role })
        .select()
        .single();

    if (error) {
        throw new Error(`Error al crear la relación usuario-viaje: ${error.message}`);
    }

    return data;
}

/**
 * Obtiene todos los viajes en los que participa un usuario específico
 */
export const getUserTrips = async (userId: string) => {
    // Primero obtenemos los trip_ids en los que participa el usuario
    const { data: travelerData, error: travelerError } = await supabase
        .from(TRAVELERS_TABLE_NAME)
        .select('trip_id')
        .eq('user_id', userId);

    if (travelerError) {
        throw new Error(`Error al obtener los viajes del usuario: ${travelerError.message}`);
    }

    // Si no tiene viajes, devolvemos array vacío
    if (!travelerData || travelerData.length === 0) {
        return [];
    }

    // Extraemos los IDs de los viajes
    const tripIds = travelerData.map(t => t.trip_id);

    // Obtenemos los datos completos de esos viajes
    const { data: trips, error: tripsError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .in('id', tripIds);

    if (tripsError) {
        throw new Error(`Error al obtener los datos de los viajes: ${tripsError.message}`);
    }

    return trips || [];
}

/**
 * Obtiene el historial de viajes completados de un usuario
 */
export const getUserTripHistory = async (userId: string) => {
    // Primero obtenemos los trip_ids en los que participa el usuario
    const { data: travelerData, error: travelerError } = await supabase
        .from(TRAVELERS_TABLE_NAME)
        .select('trip_id')
        .eq('user_id', userId);

    if (travelerError) {
        throw new Error(`Error al obtener los viajes del usuario: ${travelerError.message}`);
    }

    // Si no tiene viajes, devolvemos array vacío
    if (!travelerData || travelerData.length === 0) {
        return [];
    }

    // Extraemos los IDs de los viajes
    const tripIds = travelerData.map(t => t.trip_id);

    // Obtenemos solo los viajes completados, ordenados por fecha de fin (más recientes primero)
    const { data: trips, error: tripsError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .in('id', tripIds)
        .eq('status', 'completed')
        .order('end_date', { ascending: false });

    if (tripsError) {
        throw new Error(`Error al obtener el historial de viajes: ${tripsError.message}`);
    }

    return trips || [];
}

/**
 * Elimina a un usuario de un viaje (para cuando sale del viaje)
 * Solo puede hacerlo el propio usuario (si es editor/viewer) o el owner (para expulsar)
 */
export const removeUserFromTrip = async (userId: string, tripId: number) => {
    // Verificar que la relación existe
    const { data: existing, error: checkError } = await supabase
        .from(TRAVELERS_TABLE_NAME)
        .select('user_role')
        .eq('user_id', userId)
        .eq('trip_id', tripId)
        .maybeSingle();

    if (checkError) {
        throw new Error(`Error al verificar la relación: ${checkError.message}`);
    }

    if (!existing) {
        throw new Error('El usuario no es parte de este viaje');
    }

    // No permitir que el owner se elimine a sí mismo si es el único owner
    if (existing.user_role === 'owner') {
        const { data: owners, error: ownersError } = await supabase
            .from(TRAVELERS_TABLE_NAME)
            .select('user_id')
            .eq('trip_id', tripId)
            .eq('user_role', 'owner');

        if (ownersError) {
            throw new Error(`Error al verificar propietarios: ${ownersError.message}`);
        }

        if (owners && owners.length === 1) {
            throw new Error('No puedes salir del viaje siendo el único propietario. Transfiere la propiedad primero o elimina el viaje.');
        }
    }

    // Eliminar la relación
    const { error: deleteError } = await supabase
        .from(TRAVELERS_TABLE_NAME)
        .delete()
        .eq('user_id', userId)
        .eq('trip_id', tripId);

    if (deleteError) {
        throw new Error(`Error al eliminar al usuario del viaje: ${deleteError.message}`);
    }

    return { success: true, message: 'Usuario eliminado del viaje correctamente' };
}

/**
 * Cambia el rol de un usuario en un viaje
 * Solo puede hacerlo el owner
 */
export const changeUserRole = async (userId: string, tripId: number, newRole: CollaboratorRole) => {
    // Verificar que la relación existe
    const { data: existing, error: checkError } = await supabase
        .from(TRAVELERS_TABLE_NAME)
        .select('user_role')
        .eq('user_id', userId)
        .eq('trip_id', tripId)
        .maybeSingle();

    if (checkError) {
        throw new Error(`Error al verificar la relación: ${checkError.message}`);
    }

    if (!existing) {
        throw new Error('El usuario no es parte de este viaje');
    }

    // No permitir cambiar el rol del único owner
    if (existing.user_role === 'owner' && newRole !== 'owner') {
        const { data: owners, error: ownersError } = await supabase
            .from(TRAVELERS_TABLE_NAME)
            .select('user_id')
            .eq('trip_id', tripId)
            .eq('user_role', 'owner');

        if (ownersError) {
            throw new Error(`Error al verificar propietarios: ${ownersError.message}`);
        }

        if (owners && owners.length === 1) {
            throw new Error('No puedes cambiar el rol del único propietario. Asigna otro propietario primero.');
        }
    }

    // Actualizar el rol
    const { data, error: updateError } = await supabase
        .from(TRAVELERS_TABLE_NAME)
        .update({ user_role: newRole })
        .eq('user_id', userId)
        .eq('trip_id', tripId)
        .select()
        .single();

    if (updateError) {
        throw new Error(`Error al cambiar el rol: ${updateError.message}`);
    }

    return data;
}

// =============== VEHICLE SERVICES ===============
export const createVehicleTripRelation = async (vehicleId: string, tripId: number) => {
    const { data, error } = await supabase
        .from(ROAD_TRIP_TABLE_NAME)
        .insert({ id_vehicle: vehicleId, id_trip: tripId })
        .select()
        .single();

    if (error) {
        throw new Error(`Error al crear la relación vehículo-viaje: ${error.message}`);
    }

    return data;
}

export const getVehiclesInTrip = async (tripId: number) => {
    const { data, error } = await supabase
        .from(ROAD_TRIP_TABLE_NAME)
        .select(`
            id,
            id_vehicle,
            id_trip,
            vehicle:id_vehicle (
                id,
                brand,
                model,
                type,
                avg_consumption,
                fuel_tank_capacity,
                type_fuel,
                user_id
            )
        `)
        .eq('id_trip', tripId);
    if (error) {
        throw new Error(`Error al obtener los vehículos del viaje: ${error.message}`);
    }
    return data || [];
}

export const removeVehicleFromTrip = async (vehicleId: string, tripId: number) => {
    const { error } = await supabase
        .from(ROAD_TRIP_TABLE_NAME)
        .delete()
        .eq('id_vehicle', vehicleId)
        .eq('id_trip', tripId);
    if (error) {
        throw new Error(`Error al eliminar la relación vehículo-viaje: ${error.message}`);
    }
}

// =============== HELPER FUNCTIONS ===============

/**
 * Llama a la API de Unsplash para obtener una URL de imagen basada en el destino.
 * Devuelve una URL de Unsplash o una genérica si falla.
 */
async function getCoverImageUrl(destinationName?: string): Promise<string> {
    const GENERIC_IMAGE_URL = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';
    const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

    // Si no hay API key o no hay destino, devolvemos la genérica
    if (!UNSPLASH_KEY || !destinationName || destinationName.trim().length === 0) {
        return GENERIC_IMAGE_URL;
    }

    // Limpiamos la consulta (ej. "Valencia" de "Valencia, España")
    const query = encodeURIComponent(destinationName.split(',')[0].trim());

    if (!query) {
        return GENERIC_IMAGE_URL;
    }

    // Usamos palabras clave para asegurar que sea una foto de un lugar
    const fullQuery = `${query},city,travel`;
    const API_URL = `https://api.unsplash.com/search/photos?query=${fullQuery}&per_page=1&orientation=landscape&client_id=${UNSPLASH_KEY}`;

    try {
        // Hacemos la llamada a la API de Unsplash
        const response = await fetch(API_URL);

        if (!response.ok) {
            // Si Unsplash falla (límite de API, etc.), devolvemos la genérica
            console.error('Error fetching from Unsplash:', response.statusText);
            return GENERIC_IMAGE_URL;
        }

        const data = await response.json();

        // Si hay resultados, tomamos la URL de la primera foto
        if (data.results && data.results.length > 0) {
            // Usamos 'regular' para un buen balance de tamaño
            return data.results[0].urls.regular;
        } else {
            // Si no hay fotos para esa búsqueda, devolvemos la genérica
            return GENERIC_IMAGE_URL;
        }
    } catch (error) {
        console.error('Error fatal en getCoverImageUrl:', error);
        return GENERIC_IMAGE_URL;
    }
}

// ============================================================================
// TRIP STATUS MANAGEMENT
// ============================================================================

/**
 * Actualiza el estado de un viaje y registra el cambio en el historial
 * @param tripId - ID del viaje
 * @param newStatus - Nuevo estado del viaje
 * @param changedBy - Fuente del cambio: 'user', 'auto', 'system'
 * @param reason - Motivo del cambio (opcional)
 * @param userId - ID del usuario que hace el cambio (opcional)
 * @returns Viaje actualizado
 */
export const updateTripStatus = async (
    tripId: number,
    newStatus: 'planning' | 'going' | 'completed',
    changedBy: 'user' | 'auto' | 'system',
    reason?: string,
    userId?: string
) => {
    console.log('🔄 [TripService.updateTripStatus]', { tripId, newStatus, changedBy });

    // Obtener el estado actual del viaje
    const currentTrip = await getById(tripId);
    const oldStatus = currentTrip.status;

    // Si el estado no ha cambiado, no hacer nada
    if (oldStatus === newStatus) {
        console.log('ℹ️ [TripService.updateTripStatus] Status unchanged, skipping');
        return currentTrip;
    }

    // Actualizar el estado del viaje
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({
            status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq('id', tripId)
        .select()
        .single();

    if (error) {
        console.error('❌ [TripService.updateTripStatus] Error:', error);
        throw new Error(`Error al actualizar el estado del viaje: ${error.message}`);
    }

    console.log('✅ [TripService.updateTripStatus] Trip status updated successfully');

    // Nota: El trigger de base de datos creará automáticamente el registro en trip_status_history
    // Pero si queremos tener más control, podemos crear el registro manualmente aquí
    // importando tripStatusHistory.service y llamando a create()

    return data;
};

/**
 * Obtiene viajes que deberían empezar (estado planning y fecha de inicio <= ahora)
 * @param hoursWindow - Ventana de horas para buscar (por defecto 1 hora)
 * @returns Array de viajes listos para empezar
 */
export const getTripsReadyToStart = async (hoursWindow: number = 1) => {
    console.log('🔍 [TripService.getTripsReadyToStart] Searching trips...');

    const now = new Date();
    const windowStart = new Date(now.getTime() - hoursWindow * 60 * 60 * 1000);

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('status', 'planning')
        .lte('start_date', now.toISOString())
        .gte('start_date', windowStart.toISOString());

    if (error) {
        console.error('❌ [TripService.getTripsReadyToStart] Error:', error);
        throw new Error(`Error al buscar viajes listos para empezar: ${error.message}`);
    }

    console.log(`✅ [TripService.getTripsReadyToStart] Found ${data?.length || 0} trips`);
    return data || [];
};

/**
 * Obtiene viajes que deberían terminar (estado going y fecha de fin + 24h <= ahora)
 * @param hoursWindow - Ventana de horas para buscar (por defecto 1 hora)
 * @param graceHours - Horas de gracia después del fin del viaje (por defecto 24)
 * @returns Array de viajes listos para completar
 */
export const getTripsReadyToComplete = async (
    hoursWindow: number = 1,
    graceHours: number = 24
) => {
    console.log('🔍 [TripService.getTripsReadyToComplete] Searching trips...');

    const now = new Date();
    const targetTime = new Date(now.getTime() - graceHours * 60 * 60 * 1000);
    const windowStart = new Date(targetTime.getTime() - hoursWindow * 60 * 60 * 1000);

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('status', 'going')
        .lte('end_date', targetTime.toISOString())
        .gte('end_date', windowStart.toISOString());

    if (error) {
        console.error('❌ [TripService.getTripsReadyToComplete] Error:', error);
        throw new Error(`Error al buscar viajes listos para completar: ${error.message}`);
    }

    console.log(`✅ [TripService.getTripsReadyToComplete] Found ${data?.length || 0} trips`);
    return data || [];
};

/**
 * Obtiene el owner (propietario) de un viaje
 * @param tripId - ID del viaje
 * @returns Usuario propietario del viaje
 */
export const getTripOwner = async (tripId: number) => {
    const { data, error } = await supabase
        .from(TRAVELERS_TABLE_NAME)
        .select('user_id, user:user_id(*)')
        .eq('trip_id', tripId)
        .eq('user_role', 'owner')
        .single();

    if (error) {
        throw new Error(`Error al obtener el propietario del viaje: ${error.message}`);
    }

    if (!data) {
        throw new Error(`No se encontró el propietario del viaje con id: ${tripId}`);
    }

    // data.user puede ser un array, tomamos el primer elemento si es necesario
    const user = Array.isArray(data.user) ? data.user[0] : data.user;

    if (!user) {
        throw new Error(`No se encontró información del usuario propietario del viaje con id: ${tripId}`);
    }

    return user;
};

/**
 * Procesa la respuesta del usuario a una notificación de cambio de estado de viaje
 * @param tripId - ID del viaje
 * @param notificationId - ID de la notificación que se está respondiendo
 * @param userId - ID del usuario que responde (debe ser el owner)
 * @param response - Objeto con la respuesta: {started?: boolean, completed?: boolean}
 * @returns Resultado de la operación
 */
export const respondToStatusCheck = async (
    tripId: number,
    notificationId: string,
    userId: string,
    response: { started?: boolean; completed?: boolean }
) => {
    console.log(`📋 [respondToStatusCheck] Processing response for trip ${tripId}, notification ${notificationId}`);

    // 1. Verificar que el usuario es el owner del viaje
    const { data: travelerData, error: travelerError } = await supabase
        .from(TRAVELERS_TABLE_NAME)
        .select('user_role')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .single();

    if (travelerError || !travelerData) {
        throw new Error(`No se encontró el usuario en el viaje`);
    }

    if (travelerData.user_role !== 'owner') {
        throw new Error(`Solo el propietario del viaje puede responder a estas notificaciones`);
    }

    // 2. Obtener el viaje actual con trip_status
    const { data: tripData, error: tripError } = await supabase
        .from(TABLE_NAME)
        .select('id, name, status')
        .eq('id', tripId)
        .single();

    console.log(`🔍 [respondToStatusCheck] Query result:`, { tripData, tripError });

    if (tripError || !tripData) {
        throw new Error(`No se encontró el viaje: ${tripError?.message || 'Sin datos'}`);
    }

    const trip = tripData as any;
    console.log(`📊 [respondToStatusCheck] Current trip status: ${trip.status}`);

    // 3. Determinar el nuevo estado basado en la respuesta
    let newStatus: 'planning' | 'going' | 'completed' | null = null;
    let actionStatus: 'accepted' | 'rejected' = 'rejected';

    if (response.started !== undefined) {
        // Respuesta para inicio de viaje
        if (trip.status !== 'planning') {
            throw new Error(`El viaje no está en estado 'planning'. Estado actual: ${trip.status}`);
        }

        if (response.started) {
            newStatus = 'going';
            actionStatus = 'accepted';
            console.log(`✅ User confirmed trip started`);
        } else {
            console.log(`❌ User denied trip started`);
            actionStatus = 'rejected';
        }
    } else if (response.completed !== undefined) {
        // Respuesta para finalización de viaje
        if (trip.status !== 'going') {
            throw new Error(`El viaje no está en estado 'going'. Estado actual: ${trip.status}`);
        }

        if (response.completed) {
            newStatus = 'completed';
            actionStatus = 'accepted';
            console.log(`✅ User confirmed trip completed`);
        } else {
            console.log(`❌ User denied trip completed`);
            actionStatus = 'rejected';
        }
    } else {
        throw new Error(`Respuesta inválida. Debe incluir 'started' o 'completed'`);
    }

    // 4. Actualizar el estado del viaje si el usuario aceptó
    if (newStatus) {
        await updateTripStatus(tripId, newStatus, 'user', 'Usuario respondió a notificación', userId);
    }

    // 5. Marcar la notificación como leída y actualizar action_status
    const { error: notifError } = await supabase
        .from('notifications')
        .update({
            status: 'read',
            action_status: actionStatus,
        })
        .eq('id', notificationId);

    if (notifError) {
        console.error(`❌ Error updating notification:`, notifError);
        throw new Error(`Error al actualizar la notificación: ${notifError.message}`);
    }

    console.log(`✅ [respondToStatusCheck] Response processed successfully`);

    return {
        success: true,
        tripId,
        newStatus: newStatus || trip.trip_status,
        actionStatus,
        message: actionStatus === 'accepted'
            ? 'Estado del viaje actualizado correctamente'
            : 'Respuesta registrada. El estado del viaje no ha cambiado',
    };
};