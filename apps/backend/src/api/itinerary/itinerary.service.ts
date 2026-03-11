import { supabase } from '../../supabase.js';
import type { Route, Stop, Trip, Accommodation, Refuel, Activity } from '@planmyroute/types';
import geocoder from '../../config/geocoder.js';
import * as geolocation from '../../utils/geolocation.js';
import * as TripService from '../trips/trips.service.js';
import { searchPlacePhotoSmart, searchPlacePhotoFoursquare, searchPlacePhotoByQueryFoursquare } from '../../utils/placesPhotos.js';
import { getPlacePrice } from '../../utils/placePrices.js';

const ROUTE_TABLE = 'route';
const STOP_TABLE = 'stop';
const ACTIVITY_TABLE = 'activity';
const ACCOMMODATION_TABLE = 'accommodation';
const REFUEL_TABLE = 'refuel';

// =============== ROUTE SERVICES ===============
export const getRouteById = async (id: string) => {
    const { data, error } = await supabase
        .from(ROUTE_TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        throw new Error(`Error al obtener la ruta: ${error.message}`);
    }

    if (!data) {
        throw new Error(`No se encontró ninguna ruta con el id: ${id}`);
    }

    return data;
};

export const getRoutesByTripId = async (tripId: number) => {
    const { data, error } = await supabase
        .from(ROUTE_TABLE)
        .select('*')
        .eq('trip_id', tripId);

    if (error) {
        throw new Error(`Error al obtener las rutas del viaje: ${error.message}`);
    }

    return data;
};

export const getRouteStops = async (routeId: string) => {
    const { data, error } = await supabase
        .from(ROUTE_TABLE)
        .select('origin_id, destination_id')
        .eq('id', routeId)
        .maybeSingle();

    if (error) {
        throw new Error(`Error al obtener las paradas de la ruta: ${error.message}`);
    }

    if (!data) {
        throw new Error(`No se encontró ninguna ruta con el id: ${routeId}`);
    }

    return data;
};

export const createInitialRoute = async (originStop: Stop, destinationStop: Stop, trip: Trip) => {
    // No incluir start_date y end_date en la ruta inicial
    // Las fechas del viaje están en la tabla trip, no necesitan duplicarse en route
    const routeData: Partial<Route> = {
        trip_id: trip.id,
        origin_id: originStop.id,
        destination_id: destinationStop.id,
        distance: geolocation.calculateDistance(originStop.coordinates, destinationStop.coordinates),
    };

    return createRoute(routeData);
};

export const createRoute = async (routeData: Partial<Route>) => {
    const { data, error } = await supabase
        .from(ROUTE_TABLE)
        .insert(routeData)
        .select()
        .single();

    if (error) {
        throw new Error(`Error al crear la ruta: ${error.message}`);
    }

    return data;
};

export const updateRoute = async (id: string, routeData: Partial<Route>) => {
    const { data, error } = await supabase
        .from(ROUTE_TABLE)
        .update(routeData)
        .eq('id', id)
        .select()
        .maybeSingle();

    if (error) {
        throw new Error(`Error al actualizar la ruta: ${error.message}`);
    }

    if (!data) {
        throw new Error(`No se encontró ninguna ruta con el id: ${id}`);
    }

    return data;
};

export const deleteRoute = async (id: string) => {
    const { error } = await supabase
        .from(ROUTE_TABLE)
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Error al eliminar la ruta: ${error.message}`);
    }

    return id;
};

// Rutas completamente vacías
export const getEmptyRoutes = async (tripId: number) => {
    const { data, error } = await supabase
        .from(ROUTE_TABLE)
        .select('*')
        .eq('trip_id', tripId)
        .is('origin_id', null)
        .is('destination_id', null);

    if (error) {
        throw new Error(`Error al obtener las rutas sin paradas: ${error.message}`);
    }

    return data;
};

export const isThisRouteEmpty = async (tripId: number, routeId: string) => {
    const { data, error } = await supabase
        .from(ROUTE_TABLE)
        .select('*')
        .eq('trip_id', tripId)
        .eq('id', routeId)
        .is('origin_id', null)
        .is('destination_id', null);

    if (error) {
        throw new Error(`Error al obtener las rutas sin paradas: ${error.message}`);
    }

    return data;
};

// Rutas incompletas (falta origen o destino o ambos)
export const getIncompleteRoutes = async (tripId: number) => {
    const { data, error } = await supabase
        .from(ROUTE_TABLE)
        .select('*')
        .eq('trip_id', tripId)
        .or('origin_id.is.null,destination_id.is.null');

    if (error) {
        throw new Error(`Error al obtener las rutas sin paradas: ${error.message}`);
    }

    const routesWithMissingInfo = data.map(route => {
        let missing_stop: 'origin' | 'destination' | 'both' | 'none';

        const missingOrigin = route.origin_id === null;
        const missingDestination = route.destination_id === null;

        if (missingOrigin && missingDestination) {
            missing_stop = 'both';
        } else if (missingOrigin) {
            missing_stop = 'origin';
        } else if (missingDestination) {
            missing_stop = 'destination';
        } else {
            missing_stop = 'none';
        }

        return {
            ...route,
            missing_stop
        };
    });

    return routesWithMissingInfo;
};

// =============== STOP SERVICES ===============

export const getStopById = async (id: string) => {
    const { data, error } = await supabase
        .from(STOP_TABLE)
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        throw new Error(`Error al obtener la parada: ${error.message}`);
    }

    if (!data) {
        throw new Error(`No se encontró ninguna parada con el id: ${id}`);
    }

    return data;
};

// Obtener paradas por un array de ids
export const getStopsByIds = async (ids: string[]) => {
    if (!ids || ids.length === 0) return [];

    const { data, error } = await supabase
        .from(STOP_TABLE)
        .select('*')
        .in('id', ids);

    if (error) {
        throw new Error(`Error al obtener las paradas por ids: ${error.message}`);
    }

    return data;
};

/**
 * Valida que una parada intermedia respete las restricciones de orden
 * - La parada no puede estar en día anterior al origen
 * - La parada no puede estar en día posterior al destino
 * - Si está en el mismo día, valida también la hora
 */
export const validateStopOrderRestrictions = async (
    stopData: Partial<Stop>,
    tripId: number,
    excludeStopId?: number
): Promise<{ valid: boolean; message?: string }> => {
    try {
        // Solo validar para paradas intermedias
        if (stopData.type !== 'intermedia') {
            return { valid: true };
        }

        const intermediaDay = (stopData as any).day ?? 1;
        const intermediaArrival = stopData.estimated_arrival;

        // Obtener TODAS las paradas del viaje (no filtrar por día)
        const { data: allStops, error } = await supabase
            .from(STOP_TABLE)
            .select('*')
            .eq('trip_id', tripId)
            .not('id', 'is', null);

        if (error) {
            console.error('Error validando restricciones de orden:', error);
            return { valid: true }; // Permitir si no se puede validar
        }

        // Filtrar los stops, excluyendo el actual si estamos editando
        const stops = excludeStopId
            ? (allStops || []).filter((s: any) => s.id !== excludeStopId)
            : (allStops || []);

        // Buscar origen y destino (sin filtrar por día)
        const origin = stops.find((s: any) => s.type === 'origen');
        const destination = stops.find((s: any) => s.type === 'destino');

        // Si no hay origen o destino, es válido
        if (!origin || !destination) {
            return { valid: true };
        }

        const originDay = origin.day ?? 1;
        const destDay = destination.day ?? 1;

        // Helper para extraer solo HH:MM de cualquier formato
        const getHourMinute = (timeStr: string | undefined): string | null => {
            if (!timeStr) return null;
            // Si es formato H:MM o HH:MM - acepta 1 o 2 dígitos de hora
            if (timeStr.match(/^\d{1,2}:\d{1,2}/)) {
                const parts = timeStr.split(':');
                if (parts.length >= 2) {
                    const h = String(parseInt(parts[0])).padStart(2, '0');
                    const m = String(parseInt(parts[1])).padStart(2, '0');
                    return `${h}:${m}`;
                }
            }
            // Si es timestamp ISO o similar
            try {
                const date = new Date(timeStr);
                if (!isNaN(date.getTime())) {
                    const h = String(date.getHours()).padStart(2, '0');
                    const m = String(date.getMinutes()).padStart(2, '0');
                    return `${h}:${m}`;
                }
            } catch { }
            return null;
        };

        // Helper para comparar horas (retorna número para comparación)
        const getTimeAsMinutes = (timeStr: string | undefined): number | null => {
            const hm = getHourMinute(timeStr);
            if (!hm) return null;
            const [h, m] = hm.split(':');
            return parseInt(h) * 60 + parseInt(m);
        };

        // VALIDACIÓN 1: Intermedia NO puede estar en día anterior al origen
        if (intermediaDay < originDay) {
            return {
                valid: false,
                message: 'La parada intermedia no puede ser antes que el origen'
            };
        }

        // VALIDACIÓN 2: Intermedia NO puede estar en día posterior al destino
        if (intermediaDay > destDay) {
            return {
                valid: false,
                message: 'La parada intermedia no puede ser después que el destino'
            };
        }

        // VALIDACIÓN 3: Si está en el mismo día que origen, validar hora
        if (intermediaDay === originDay && intermediaArrival && origin.estimated_arrival) {
            const intermediateMinutes = getTimeAsMinutes(intermediaArrival as string);
            const originMinutes = getTimeAsMinutes(origin.estimated_arrival as string);

            if (intermediateMinutes !== null && originMinutes !== null && intermediateMinutes < originMinutes) {
                return {
                    valid: false,
                    message: 'La parada intermedia no puede ser antes que el origen'
                };
            }
        }

        // VALIDACIÓN 4: Si está en el mismo día que destino, validar hora
        if (intermediaDay === destDay && intermediaArrival && destination.estimated_arrival) {
            const intermediateMinutes = getTimeAsMinutes(intermediaArrival as string);
            const destMinutes = getTimeAsMinutes(destination.estimated_arrival as string);

            if (intermediateMinutes !== null && destMinutes !== null && intermediateMinutes > destMinutes) {
                return {
                    valid: false,
                    message: 'La parada intermedia no puede ser después que el destino'
                };
            }
        }

        return { valid: true };
    } catch (error: any) {
        console.error('Error en validateStopOrderRestrictions:', error);
        // Por seguridad, no permitir si hay error en validación
        return {
            valid: false,
            message: 'Error al validar restricciones de orden'
        };
    }
};

//Method to create stops
export const createStop = async (stopData: Partial<Stop>, tripId: number) => {
    try {
        const day = (stopData as any).day ?? 1;
        const stopType = stopData.type ?? 'intermedia';
        const requestedPosition = (stopData as any).position;

        // ✅ VALIDAR RESTRICCIONES DE ORDEN ANTES DE CREAR
        const validation = await validateStopOrderRestrictions(stopData, tripId);
        if (!validation.valid) {
            console.error(`❌ Validación de restricciones fallida: ${validation.message}`);
            throw new Error(validation.message || 'Restricción de orden violada');
        }

        // 📌 PASO 1: SI EL USUARIO ESPECIFICÓ UNA POSICIÓN, HACER ESPACIO PARA ELLA
        if (requestedPosition) {
            console.log(`📌 Usuario seleccionó posición ${requestedPosition} → Incrementando posiciones >= ${requestedPosition}`);

            // Obtener todas las paradas del mismo día (ANTES de hacer cambios)
            const allStopsBeforeIncrement = await getAllStopsInATrip(tripId);
            const stopsInDayBeforeIncrement = allStopsBeforeIncrement.filter((s: any) => s.day === day);

            // VALIDAR RANGO: requestedPosition debe estar entre 1 y stopsInDayBeforeIncrement.length + 1
            const maxPosition = stopsInDayBeforeIncrement.length + 1;
            if (requestedPosition < 1 || requestedPosition > maxPosition) {
                console.error(`❌ Posición ${requestedPosition} inválida para crear. Rango válido: 1-${maxPosition}`);
                throw new Error(`La posición debe estar entre 1 y ${maxPosition}`);
            }

            // Obtener paradas que necesitan incrementar su posición
            const stopsToIncrement = stopsInDayBeforeIncrement.filter((s: any) => (s.position ?? 999) >= requestedPosition);

            // Incrementar la posición de todas estas paradas EN PARALELO
            await Promise.all(
                stopsToIncrement.map((stop: any) =>
                    supabase
                        .from(STOP_TABLE)
                        .update({ position: (stop.position ?? 999) + 1 })
                        .eq('id', stop.id)
                )
            );

            console.log(`✅ Posiciones incrementadas: ${stopsToIncrement.length} paradas (${stopsToIncrement.map((s: any) => s.id).join(', ')})`);
        }
        // 📌 PASO 2: SI NO ESPECIFICÓ POSICIÓN, ASIGNAR AUTOMÁTICA SEGÚN EL TIPO
        else {
            // Obtener todas las paradas del viaje en este día
            const allStops = await getAllStopsInATrip(tripId);
            const stopsInDay = allStops.filter((s: any) => s.day === day);

            if (stopType === 'origen') {
                // Origen SIEMPRE va a posición 1
                console.log(`📌 Nueva parada ORIGEN → Posición 1`);
                (stopData as any).position = 1;
            } else if (stopType === 'destino') {
                // Destino SIEMPRE va a la última posición
                const lastPos = stopsInDay.length + 1;
                console.log(`📌 Nueva parada DESTINO → Posición ${lastPos}`);
                (stopData as any).position = lastPos;
            } else {
                // Intermedia va al final por defecto
                const lastPos = stopsInDay.length + 1;
                console.log(`📌 Nueva parada INTERMEDIA → Posición ${lastPos}`);
                (stopData as any).position = lastPos;
            }
        }

        // 📌 PASO 3: CALCULAR EL ORDER BASADO EN LA POSICIÓN FINAL
        const finalPosition = (stopData as any).position;
        if (day && finalPosition) {
            // Obtener todas las paradas ACTUALIZADAS del día (después de incrementos)
            const allStopsUpdated = await getAllStopsInATrip(tripId);
            const stopsInDayUpdated = allStopsUpdated.filter((s: any) => s.day === day);

            // Ordenar paradas existentes por posición
            stopsInDayUpdated.sort((a: any, b: any) => (a.position ?? a.order ?? 0) - (b.position ?? b.order ?? 0));

            console.log(`🔢 Calculando order para posición ${finalPosition}. Paradas en el día:`, stopsInDayUpdated.map((s: any) => ({ id: s.id, pos: s.position, order: s.order })));

            // Recalcular order para esta posición específica
            if (stopsInDayUpdated.length === 0) {
                // Primera parada del día
                stopData.order = day * 10000;
                console.log(`  → Primera parada: order = ${stopData.order}`);
            } else if (finalPosition <= 1) {
                // Insertar al inicio (antes de todos)
                const firstStopOrder = stopsInDayUpdated[0]?.order ?? 1000;
                stopData.order = firstStopOrder - 100;
                console.log(`  → Al inicio: order = ${stopData.order} (antes de ${firstStopOrder})`);
            } else if (finalPosition > stopsInDayUpdated.length) {
                // Insertar al final (después de todos)
                const lastStopOrder = stopsInDayUpdated[stopsInDayUpdated.length - 1]?.order ?? 1000;
                stopData.order = lastStopOrder + 100;
                console.log(`  → Al final: order = ${stopData.order} (después de ${lastStopOrder})`);
            } else {
                // Insertar en medio: la posición N va entre la parada N-1 y la parada N
                const prevStopIndex = finalPosition - 2;
                const nextStopIndex = finalPosition - 1;
                const prevStop = stopsInDayUpdated[prevStopIndex];
                const nextStop = stopsInDayUpdated[nextStopIndex];
                const prevOrder = prevStop?.order ?? 0;
                const nextOrder = nextStop?.order ?? 0;
                const averageOrder = (prevOrder + nextOrder) / 2;
                stopData.order = Math.round(averageOrder);
                console.log(`  → En medio (pos ${finalPosition}): order = ${stopData.order} (entre ${prevOrder} y ${nextOrder})`);
            }
        }
        // Si no tiene order, calcular uno por defecto
        else if (!stopData.order) {
            stopData.order = await orderStop(tripId);
        }

        // Si no hay coordenadas pero hay dirección, intentar geocodificar
        if (!stopData.coordinates && stopData.address) {
            console.log(`Geocodificando dirección: ${stopData.address}`);
            stopData.coordinates = await getCoordinatesForAddress(stopData.address);
        }

        // Verificar que tengamos coordenadas válidas
        if (!stopData.coordinates ||
            typeof stopData.coordinates.latitude !== 'number' ||
            typeof stopData.coordinates.longitude !== 'number') {
            console.error('No se pudieron obtener coordenadas válidas para la parada');
            throw new Error('No se pudieron obtener coordenadas válidas para la dirección proporcionada. Por favor, verifica la dirección e intenta de nuevo.');
        }

        const stopDataWithPhoto = stopData as Partial<Stop> & { photo_url?: string };

        // Buscar foto del lugar si no se proporcionó una
        if (!stopDataWithPhoto.photo_url && stopData.name) {
            console.log(`🔍 Buscando foto para la parada: ${stopData.name}`);

            // Usar búsqueda inteligente (Google Places)
            const photoUrl = await searchPlacePhotoSmart(
                stopData.name,
                stopData.coordinates,
                stopData.address ?? undefined,
                100 // Radio de 100 metros
            );

            if (photoUrl) {
                stopDataWithPhoto.photo_url = photoUrl;
                console.log(`✅ Foto encontrada y asignada a la parada`);
            } else {
                console.log(`⚠️ No se encontró foto para: ${stopData.name}`);
            }
        }

        // Convertir hora simple a timestamp completo
        if (stopData.estimated_arrival) {
            stopData.estimated_arrival = await convertTimeToTimestamp(
                stopData.estimated_arrival,
                tripId,
                day // Pasar el día de la parada para calcular la fecha correcta
            );
        }

        // Obtener y guardar información de precios desde Google Places
        // Pero solo si no hay un precio manual ingresado
        if (stopData.name && stopData.coordinates && !(stopDataWithPhoto as any).estimated_price) {
            try {
                console.log(`💰 Obteniendo información de precios para: ${stopData.name}`);
                const priceInfo = await getPlacePrice(
                    stopData.name,
                    stopData.coordinates,
                    stopData.address || undefined
                );

                if (priceInfo) {
                    // Guardar información de precio en la parada
                    (stopDataWithPhoto as any).price_level = priceInfo.price_level;
                    (stopDataWithPhoto as any).price_symbol = priceInfo.price_symbol;
                    (stopDataWithPhoto as any).estimated_price = priceInfo.estimated_price;
                    (stopDataWithPhoto as any).place_rating = priceInfo.rating;
                    (stopDataWithPhoto as any).place_reviews_count = priceInfo.reviews_count;
                    (stopDataWithPhoto as any).google_place_id = priceInfo.place_id;
                    console.log(`✅ Información de precio guardada para: ${stopData.name}`);
                } else {
                    console.log(`⚠️ No se encontró información de precio para: ${stopData.name}`);
                }
            } catch (error) {
                console.error(`❌ Error obteniendo precios para ${stopData.name}:`, error);
                // Continuar aunque falle - no bloquear la creación de la parada
            }
        } else if ((stopDataWithPhoto as any).estimated_price) {
            console.log(`✅ Usando precio manual ingresado: ${(stopDataWithPhoto as any).estimated_price}`);
        }

        // Filtrar campos undefined antes de crear el payload
        const payload = removeUndefinedFields(stopDataWithPhoto);

        console.log('Payload a insertar en la base de datos:', JSON.stringify(payload, null, 2));

        const { data: newStop, error } = await supabase
            .from(STOP_TABLE)
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('Error de Supabase al crear parada:', error);
            throw new Error(`Error al crear la parada en la base de datos: ${error.message}`);
        }

        if (stopData.type === 'intermedia') {
            const routesWithoutStops = await getIncompleteRoutes(tripId);
            if (!routesWithoutStops || routesWithoutStops.length === 0) {
                const routeData: Partial<Route> = {
                    trip_id: tripId,
                    origin_id: newStop.id,
                };

                await createRoute(routeData);
            } else {
                const routeToUpdate = routesWithoutStops[0];

                const updatedRouteData: Partial<Route> = {
                    distance: routeToUpdate.distance,
                };
                routeToUpdate.missing_stop === "origin" ? updatedRouteData.origin_id = newStop.id : updatedRouteData.destination_id = newStop.id;

                await updateRoute(routeToUpdate.id!, updatedRouteData);
            }
        }

        // ✅ NO reorganizar después de crear la parada
        // Respetamos la posición que el usuario seleccionó en el formulario
        // Solo reorganizamos en DELETE para rellenar gaps

        return newStop;
    } catch (error) {
        console.error('Error en createStop:', error);
        throw error;
    }
};

export const createStopOrigin = async (origin: string, trip: Trip) => {
    const stopData: Partial<Stop> = {
        name: origin,
        address: origin,
        description: `El origen del viaje es ${origin}`,
        coordinates: await getCoordinatesForAddress(origin),
        type: 'origen' as Stop['type'],
        estimated_arrival: trip.start_date || null,
        order: 1,
    };

    return await createStop(stopData, trip.id!);
};

export const createStopDestination = async (destination: string, trip: Trip) => {
    const stopData: Partial<Stop> = {
        name: destination,
        address: destination,
        description: `El destino del viaje es ${destination}`,
        coordinates: await getCoordinatesForAddress(destination),
        type: 'destino' as Stop['type'],
        estimated_arrival: trip.end_date || null,
        order: 2,
    };

    return await createStop(stopData, trip.id!);
};

// =============== STOP SUBTYPES SERVICES ===============

/**
 * Crea una parada de tipo Activity (actividad)
 * Primero crea la parada base y luego inserta los datos específicos de activity
 */
export const createActivityStop = async (stopData: Partial<Stop>, activityData: Partial<Activity>, tripId: number) => {
    try {
        const newStop = await createStop(stopData, tripId);

        let activityPayload: any = {
            id: newStop.id,
            ...removeUndefinedFields(activityData)
        };

        // Convertir entry_price a número si es string, redondeando si es decimal
        if (activityPayload.entry_price !== undefined && activityPayload.entry_price !== null) {
            const priceValue = parseFloat(String(activityPayload.entry_price));
            activityPayload.entry_price = isNaN(priceValue) ? null : priceValue;
        }

        // No insertar total_cost aquí, la tabla activity no tiene esa columna
        // Solo usar estimated_price que sí existe
        if (activityPayload.estimated_price) {
            console.log(`Total cost de actividad: ${activityPayload.estimated_price}€`);
        }

        const { data: activity, error } = await supabase
            .from(ACTIVITY_TABLE)
            .insert(activityPayload)
            .select()
            .single();

        if (error) {
            console.error('Error al crear activity:', error);
            await deleteStop(newStop.id.toString());
            throw new Error(`Error al crear la actividad: ${error.message}`);
        }

        console.log('Activity creada exitosamente:', activity);

        return {
            stop: newStop,
            activity
        };
    } catch (error) {
        console.error('Error en createActivityStop:', error);
        throw error;
    }
};

/**
 * Crea una parada de tipo Accommodation (alojamiento)
 * Primero crea la parada base y luego inserta los datos específicos de accommodation
 */
export const createAccommodationStop = async (stopData: Partial<Stop>, accommodationData: Partial<Accommodation>, tripId: number) => {
    try {
        const newStop = await createStop(stopData, tripId);

        // Calcular total_cost si se proporcionan nights y price_per_night
        let accommodationPayload: any = {
            id: newStop.id,
            ...removeUndefinedFields(accommodationData)
        };

        // Si existen nights y price_per_night, calcular total_cost
        if (accommodationPayload.nights && accommodationPayload.price_per_night) {
            accommodationPayload.total_cost = accommodationPayload.nights * accommodationPayload.price_per_night;
            console.log(`Total cost calculado: ${accommodationPayload.nights} noches × ${accommodationPayload.price_per_night}€ = ${accommodationPayload.total_cost}€`);
        }

        const { data: accommodation, error } = await supabase
            .from(ACCOMMODATION_TABLE)
            .insert(accommodationPayload)
            .select()
            .single();

        if (error) {
            console.error('Error al crear accommodation:', error);
            // Si falla la creación de accommodation, eliminar la parada creada
            await deleteStop(newStop.id.toString());
            throw new Error(`Error al crear el alojamiento: ${error.message}`);
        }

        console.log('Accommodation creado exitosamente:', accommodation);

        return {
            stop: newStop,
            accommodation
        };
    } catch (error) {
        console.error('Error en createAccommodationStop:', error);
        throw error;
    }
};

/**
 * Crea una parada de tipo Refuel (repostaje)
 * Primero crea la parada base y luego inserta los datos específicos de refuel
 * Calcula automáticamente total_cost = liters * price_per_unit
 */
export const createRefuelStop = async (stopData: Partial<Stop>, refuelData: Partial<Refuel>, tripId: number) => {
    try {
        // 1. Crear la parada base
        const newStop = await createStop(stopData, tripId);

        // 2. Calcular total_cost si se proporcionan liters y price_per_unit
        let refuelPayload: any = {
            id: newStop.id,
            ...removeUndefinedFields(refuelData)
        };

        // Si existen liters y price_per_unit, calcular total_cost
        if (refuelPayload.liters && refuelPayload.price_per_unit) {
            refuelPayload.total_cost = refuelPayload.liters * refuelPayload.price_per_unit;
            console.log(`Total cost calculado: ${refuelPayload.liters} litros × ${refuelPayload.price_per_unit}€ = ${refuelPayload.total_cost}€`);
        }

        const { data: refuel, error } = await supabase
            .from(REFUEL_TABLE)
            .insert(refuelPayload)
            .select()
            .single();

        if (error) {
            console.error('Error al crear refuel:', error);
            // Si falla la creación de refuel, eliminar la parada creada
            await deleteStop(newStop.id.toString());
            throw new Error(`Error al crear el repostaje: ${error.message}`);
        }

        console.log('Refuel creado exitosamente:', refuel);

        return {
            stop: newStop,
            refuel
        };
    } catch (error) {
        console.error('Error en createRefuelStop:', error);
        throw error;
    }
};

/**
 * Obtiene los datos completos de una parada de tipo Refuel
 * @param stopId ID de la parada de repostaje
 * @returns Objeto con la parada base y los detalles del refuel
 */
export const getRefuelStop = async (stopId: string) => {
    try {
        // 1. Obtener la parada base
        const stop = await getStopById(stopId);

        // 2. Obtener los datos específicos de refuel
        const { data: refuel, error } = await supabase
            .from(REFUEL_TABLE)
            .select('*')
            .eq('id', stopId)
            .maybeSingle();

        if (error) {
            console.error('Error al obtener refuel:', error);
            throw new Error(`Error al obtener los datos del repostaje: ${error.message}`);
        }

        if (!refuel) {
            throw new Error(`No se encontró ningún repostaje con el id: ${stopId}`);
        }

        return {
            stop,
            refuel
        };
    } catch (error) {
        console.error('Error en getRefuelStop:', error);
        throw error;
    }
};

/**
 * Actualiza una parada de tipo Activity
 * Actualiza tanto la parada base como los datos específicos de activity
 */
export const updateActivityStop = async (stopId: string, stopData: Partial<Stop>, activityData: Partial<Activity>) => {
    try {
        // 1. Actualizar la parada base si hay datos
        let updatedStop = null;
        if (stopData && Object.keys(stopData).length > 0) {
            updatedStop = await updateStop(stopId, stopData);
        }

        // 2. Actualizar el registro de activity
        let activityPayload: any = removeUndefinedFields(activityData);

        // Convertir entry_price a número si es string
        if (activityPayload.entry_price !== undefined && activityPayload.entry_price !== null) {
            const priceValue = parseFloat(String(activityPayload.entry_price));
            activityPayload.entry_price = isNaN(priceValue) ? null : priceValue;
        }

        // No actualizar total_cost aquí, la tabla activity no tiene esa columna
        // Solo usar estimated_price que sí existe
        if (activityPayload.estimated_price) {
            console.log(`Total cost de actividad actualizado: ${activityPayload.estimated_price}€`);
        }

        const { data: activity, error } = await supabase
            .from(ACTIVITY_TABLE)
            .update(activityPayload)
            .eq('id', stopId)
            .select()
            .maybeSingle();

        if (error) {
            console.error('Error al actualizar activity:', error);
            throw new Error(`Error al actualizar la actividad: ${error.message}`);
        }

        if (!activity) {
            throw new Error(`No se encontró ninguna actividad con el id: ${stopId}`);
        }

        console.log('Activity actualizada exitosamente:', activity);

        return {
            stop: updatedStop || await getStopById(stopId),
            activity
        };
    } catch (error) {
        console.error('Error en updateActivityStop:', error);
        throw error;
    }
};

/**
 * Actualiza una parada de tipo Accommodation
 * Actualiza tanto la parada base como los datos específicos de accommodation
 */
export const updateAccommodationStop = async (stopId: string, stopData: Partial<Stop>, accommodationData: Partial<Accommodation>) => {
    try {
        // 1. Actualizar la parada base si hay datos
        let updatedStop = null;
        if (stopData && Object.keys(stopData).length > 0) {
            updatedStop = await updateStop(stopId, stopData);
        }

        // 2. Actualizar el registro de accommodation
        let accommodationPayload: any = removeUndefinedFields(accommodationData);

        // Si existen nights y price_per_night, calcular total_cost
        if (accommodationPayload.nights && accommodationPayload.price_per_night) {
            accommodationPayload.total_cost = accommodationPayload.nights * accommodationPayload.price_per_night;
            console.log(`Total cost calculado: ${accommodationPayload.nights} noches × ${accommodationPayload.price_per_night}€ = ${accommodationPayload.total_cost}€`);
        }

        const { data: accommodation, error } = await supabase
            .from(ACCOMMODATION_TABLE)
            .update(accommodationPayload)
            .eq('id', stopId)
            .select()
            .maybeSingle();

        if (error) {
            console.error('Error al actualizar accommodation:', error);
            throw new Error(`Error al actualizar el alojamiento: ${error.message}`);
        }

        if (!accommodation) {
            throw new Error(`No se encontró ningún alojamiento con el id: ${stopId}`);
        }

        console.log('Accommodation actualizado exitosamente:', accommodation);

        return {
            stop: updatedStop || await getStopById(stopId),
            accommodation
        };
    } catch (error) {
        console.error('Error en updateAccommodationStop:', error);
        throw error;
    }
};

/**
 * Actualiza una parada de tipo Refuel
 * Actualiza tanto la parada base como los datos específicos de refuel
 */
export const updateRefuelStop = async (stopId: string, stopData: Partial<Stop>, refuelData: Partial<Refuel>) => {
    try {
        // 1. Actualizar la parada base si hay datos
        let updatedStop = null;
        if (stopData && Object.keys(stopData).length > 0) {
            updatedStop = await updateStop(stopId, stopData);
        }

        // 2. Actualizar el registro de refuel
        const refuelPayload = removeUndefinedFields(refuelData);

        const { data: refuel, error } = await supabase
            .from(REFUEL_TABLE)
            .update(refuelPayload)
            .eq('id', stopId)
            .select()
            .maybeSingle();

        if (error) {
            console.error('Error al actualizar refuel:', error);
            throw new Error(`Error al actualizar el repostaje: ${error.message}`);
        }

        if (!refuel) {
            throw new Error(`No se encontró ningún repostaje con el id: ${stopId}`);
        }

        console.log('Refuel actualizado exitosamente:', refuel);

        return {
            stop: updatedStop || await getStopById(stopId),
            refuel
        };
    } catch (error) {
        console.error('Error en updateRefuelStop:', error);
        throw error;
    }
};

/**
 * Valida y repara las posiciones de paradas en un día específico
 * Se asegura de que las posiciones sean secuenciales (1, 2, 3...)
 * sin gaps ni duplicados
 */
const validateAndRepairPositions = async (day: number) => {
    try {
        // Obtener todas las paradas del día ordenadas por posición
        const { data: stopsInDay, error: fetchError } = await supabase
            .from(STOP_TABLE)
            .select('id, position')
            .eq('day', day)
            .order('position', { ascending: true });

        if (fetchError) {
            console.error(`❌ Error al obtener paradas del día ${day}:`, fetchError);
            return;
        }

        if (!stopsInDay || stopsInDay.length === 0) {
            console.log(`✅ No hay paradas en el día ${day}`);
            return;
        }

        // Verificar si hay gaps o posiciones incorrectas
        let needsRepair = false;
        for (let i = 0; i < stopsInDay.length; i++) {
            const expectedPosition = i + 1;
            const actualPosition = stopsInDay[i].position;
            if (actualPosition !== expectedPosition) {
                needsRepair = true;
                // Loguear solo una vez que se necesita reparar
                break;
            }
        }

        if (needsRepair) {
            console.log(`🔧 Reparando ${stopsInDay.length} posiciones en día ${day}...`);
            // Renumerar todas las posiciones secuencialmente
            for (let i = 0; i < stopsInDay.length; i++) {
                const newPosition = i + 1;
                await supabase
                    .from(STOP_TABLE)
                    .update({ position: newPosition })
                    .eq('id', stopsInDay[i].id);
            }
            console.log(`✅ ${stopsInDay.length} posiciones reparadas en día ${day}`);
        }
    } catch (error) {
        console.error(`❌ Error validando posiciones en día ${day}:`, error);
    }
};

export const updateStop = async (id: string, stopData: Partial<Stop>, tripId?: number) => {
    // Crear una copia para incluir datos de precios si es necesario
    const stopDataWithPrice = { ...stopData } as any;

    console.log(`🔄 Actualizando stop ${id} con datos:`, {
        day: stopDataWithPrice.day,
        position: stopDataWithPrice.position,
        name: stopDataWithPrice.name,
        type: stopDataWithPrice.type,
    });

    // Obtener la parada actual PRIMERO (necesario para obtener day y type)
    const { data: currentStop } = await supabase
        .from(STOP_TABLE)
        .select('id, day, position, type, name, trip_id, estimated_arrival')
        .eq('id', id)
        .maybeSingle();

    // ✅ VALIDAR RESTRICCIONES DE ORDEN PARA INTERMEDIAS
    if (currentStop?.type === 'intermedia' && currentStop?.trip_id) {
        const validation = await validateStopOrderRestrictions(stopDataWithPrice, currentStop.trip_id, parseInt(id));
        if (!validation.valid) {
            console.error(`❌ Validación de restricciones fallida: ${validation.message}`);
            throw new Error(validation.message || 'Restricción de orden violada');
        }
    }

    // ✨ VALIDACIÓN ESTRICTA: ORIGEN solo puede estar en día 1
    if (currentStop?.type === 'origen' && stopDataWithPrice.day !== undefined) {
        if (stopDataWithPrice.day !== 1) {
            throw new Error(`El Origen debe estar siempre en el día 1 (intenta cambiar al día ${stopDataWithPrice.day})`);
        }
    }

    // ✨ VALIDACIÓN ESTRICTA: ORIGEN no puede cambiar de posición
    if (currentStop?.type === 'origen' && stopDataWithPrice.position !== undefined) {
        if (stopDataWithPrice.position !== 1) {
            throw new Error(`El Origen debe estar siempre en posición 1 (intenta cambiar a posición ${stopDataWithPrice.position})`);
        }
    }

    // ✨ VALIDACIÓN: Destino no puede estar ANTES que intermedias
    if (currentStop?.type === 'destino' && stopDataWithPrice.day !== undefined) {
        const newDay = stopDataWithPrice.day;
        const tripId = (await supabase.from(ROUTE_TABLE).select('trip_id').or(`origin_id.eq.${id},destination_id.eq.${id}`).maybeSingle()).data?.trip_id;

        if (tripId) {
            // Obtener todas las intermedias del viaje
            const { data: intermediasInTrip } = await supabase
                .from(STOP_TABLE)
                .select('day, position')
                .eq('type', 'intermedia')
                .in('id',
                    (await supabase
                        .from(ROUTE_TABLE)
                        .select('origin_id, destination_id')
                        .eq('trip_id', tripId))
                        .data?.flatMap(r => [r.origin_id, r.destination_id]).filter((id: any) => id) || []
                );

            if (intermediasInTrip && intermediasInTrip.length > 0) {
                // Encontrar el máximo día de las intermedias
                const maxIntermediaDay = Math.max(...intermediasInTrip.map(i => i.day ?? 1));

                if (newDay < maxIntermediaDay) {
                    throw new Error(`El Destino no puede estar en un día anterior a las intermedias (última intermedia está en día ${maxIntermediaDay})`);
                }
            }
        }
    }

    // ✨ VALIDACIÓN ESTRICTA: DESTINO no puede cambiar de posición
    if (currentStop?.type === 'destino' && stopDataWithPrice.position !== undefined) {
        // El destino debe estar en la última posición, pero eso se calculará después
        // Por ahora, solo alertamos si intenta cambiar manualmente
        console.warn(`⚠️ El Destino cambió posición manualmente - se reordenará automáticamente`);
    }

    // ✨ Si NO viene position al editar, calcular automáticamente basándose en el nuevo día
    if (stopDataWithPrice.position === undefined && tripId) {
        console.log(`🔄 Calculando posición automática para stop ${id} en día ${stopDataWithPrice.day || currentStop?.day || 1}...`);

        const targetDay = stopDataWithPrice.day || currentStop?.day || 1;

        // Obtener TODAS las paradas del viaje
        const { data: routes } = await supabase
            .from(ROUTE_TABLE)
            .select('origin_id, destination_id')
            .eq('trip_id', tripId);

        const tripStopIds = new Set<string>();
        routes?.forEach(r => {
            if (r.origin_id) tripStopIds.add(String(r.origin_id));
            if (r.destination_id) tripStopIds.add(String(r.destination_id));
        });

        console.log(`🔍 Trip stop IDs para tripId ${tripId}:`, Array.from(tripStopIds));

        if (tripStopIds.size > 0) {
            const { data: allStopsInTrip } = await supabase
                .from(STOP_TABLE)
                .select('id, type, day, position, estimated_arrival')
                .in('id', Array.from(tripStopIds));

            console.log(`📊 Todos los stops del viaje:`, allStopsInTrip?.map(s => `${s.id}(${s.type}, día ${s.day})`).join(', '));

            if (allStopsInTrip && allStopsInTrip.length > 0) {
                // Filtrar stops del día target (excluyendo la parada que se está editando)
                const stopsInDay = allStopsInTrip
                    .filter(s => (s.day ?? 1) === targetDay && String(s.id) !== id)
                    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

                console.log(`📅 Stops en día ${targetDay} (excluyendo ${id}):`, stopsInDay.map(s => `${s.id}(${s.type}:pos${s.position})`).join(', '));

                // Ordenar por tipo
                const origen = stopsInDay.find(s => s.type === 'origen');
                const destino = stopsInDay.find(s => s.type === 'destino');
                const intermedias = stopsInDay.filter(s => s.type === 'intermedia');

                // Ordenar intermedias por hora
                intermedias.sort((a, b) => {
                    const timeA = a.estimated_arrival ? new Date(a.estimated_arrival).getTime() : Infinity;
                    const timeB = b.estimated_arrival ? new Date(b.estimated_arrival).getTime() : Infinity;
                    return timeA - timeB;
                });

                // Construir orden final para este día
                const orderedStops = [];
                if (origen) orderedStops.push(origen);
                orderedStops.push(...intermedias);
                if (destino) orderedStops.push(destino);

                console.log(`🔀 Orden final en día ${targetDay}:`, orderedStops.map(s => `${s.id}(${s.type})`).join(' → '));

                // Calcular posición correcta según el tipo de la parada que se está editando
                let calculatedPosition = 1;

                if (currentStop?.type === 'origen') {
                    calculatedPosition = 1;
                    console.log(`  → Origen, posición: 1`);
                } else if (currentStop?.type === 'destino') {
                    calculatedPosition = orderedStops.length + 1;
                    console.log(`  → Destino, posición: ${calculatedPosition}`);
                } else if (currentStop?.type === 'intermedia') {
                    // Para intermedias, ponerlas después de origen (si existe) y antes de destino (si existe)
                    if (origen && destino) {
                        // Si hay origen y destino: intermedia va en posición 2..n-1
                        calculatedPosition = Math.min(2, orderedStops.length);
                    } else if (origen) {
                        // Si solo hay origen: intermedia va después
                        calculatedPosition = 2;
                    } else if (destino) {
                        // Si solo hay destino: intermedia va antes (posición 1)
                        calculatedPosition = 1;
                    } else {
                        // Si no hay origen ni destino: primera posición
                        calculatedPosition = 1;
                    }
                    console.log(`  → Intermedia, posición: ${calculatedPosition}`);
                }

                console.log(`📍 Posición calculada final para stop ${id}: ${calculatedPosition}`);
                stopDataWithPrice.position = calculatedPosition;
            }
        }
    }

    // ✨ VALIDACIÓN: Origen no puede estar DESPUÉS del Destino (validación adicional)
    if ((currentStop?.type === 'origen' || currentStop?.type === 'destino') && stopDataWithPrice.day !== undefined) {
        const newDay = stopDataWithPrice.day;
        const tripId = (await supabase.from(ROUTE_TABLE).select('trip_id').or(`origin_id.eq.${id},destination_id.eq.${id}`).maybeSingle()).data?.trip_id;

        if (tripId) {
            // Obtener la otra parada (origen o destino opuesto)
            const { data: routes } = await supabase
                .from(ROUTE_TABLE)
                .select('origin_id, destination_id')
                .eq('trip_id', tripId);

            // Validar que origen NO esté DESPUÉS del destino
            if (routes && routes.length > 0) {
                for (const route of routes) {
                    const oppositeStopId = currentStop.type === 'origen' ? route.destination_id : route.origin_id;
                    const { data: oppositeStop } = await supabase
                        .from(STOP_TABLE)
                        .select('day, type')
                        .eq('id', oppositeStopId)
                        .maybeSingle();

                    if (oppositeStop) {
                        if (currentStop.type === 'origen' && newDay > oppositeStop.day) {
                            throw new Error(`El Origen no puede estar en un día posterior al Destino (Destino está en día ${oppositeStop.day})`);
                        }
                        if (currentStop.type === 'destino' && newDay < oppositeStop.day) {
                            throw new Error(`El Destino no puede estar en un día anterior al Origen (Origen está en día ${oppositeStop.day})`);
                        }
                    }
                }
            }
        }
    }


    // NO buscar precios en update - es lento y no necesario
    // Los precios se obtienen en createStop
    // Si el usuario quiere actualizar precios, que lo haga explícitamente

    // Si se cambió la posición, reordenar todas las paradas del día
    if (stopDataWithPrice.position !== undefined) {
        try {
            const dayToUpdate = stopDataWithPrice.day ?? currentStop?.day ?? 1;
            const newPosition = stopDataWithPrice.position;

            // Usar el tripId que viene como parámetro (del controller que ya lo validó)
            if (!tripId) {
                console.warn(`⚠️ No se pudo obtener trip_id para stop ${id}`);
            } else {
                console.log(`🔄 Reordenando: stop ${id} → posición ${newPosition} en día ${dayToUpdate} (viaje ${tripId})`);
                console.log(`📌 currentStop type: ${currentStop?.type}, id: ${currentStop?.id}`);

                // Obtener TODAS las paradas del viaje (para validación y reordenamiento)
                // Primero obtener los IDs de paradas del viaje desde la tabla route
                const { data: routes } = await supabase
                    .from(ROUTE_TABLE)
                    .select('origin_id, destination_id')
                    .eq('trip_id', tripId);

                const tripStopIds = new Set<string>();
                routes?.forEach(r => {
                    if (r.origin_id) tripStopIds.add(String(r.origin_id));
                    if (r.destination_id) tripStopIds.add(String(r.destination_id));
                });

                console.log(`🔍 IDs de paradas en el viaje ${tripId}: ${tripStopIds.size} paradas`, Array.from(tripStopIds).slice(0, 10));

                // Obtener SOLO las paradas del viaje (no de otros viajes)
                let allStopsInTrip: any[] = [];
                if (tripStopIds.size > 0) {
                    const { data } = await supabase
                        .from(STOP_TABLE)
                        .select('id, type, day, position')
                        .in('id', Array.from(tripStopIds));
                    allStopsInTrip = data || [];
                }

                console.log(`📋 Total de paradas VÁLIDAS del viaje ${tripId}: ${allStopsInTrip.length}`);

                // Obtener solo las paradas del día actual Y del viaje actual, ordenadas por posición actual
                const allStopsForValidation = allStopsInTrip
                    .filter((s: any) => s.day === dayToUpdate)
                    .sort((a: any, b: any) => (a.position ?? 999) - (b.position ?? 999));

                console.log(`📋 Paradas VÁLIDAS en día ${dayToUpdate}: ${allStopsForValidation.length}`, allStopsForValidation.map((s: any) => `${s.id}(${s.type}:${s.position})`).join(', '));

                // ⚠️ VALIDACIÓN PREVIA: Si es intermedia, BLOQUEAR ANTES de hacer cualquier cambio
                if (currentStop?.type === 'intermedia' && allStopsInTrip && allStopsInTrip.length > 0) {
                    console.log(`✓ PRE-VALIDACIÓN intermedia: stop ${id}, nueva posición ${newPosition}, nuevo día ${dayToUpdate}`);

                    // Obtener el VERDADERO destino del viaje (buscar por type, no por routes)
                    const destino = allStopsInTrip.find((s: any) => s.type === 'destino');
                    console.log(`🔍 Destino del viaje ${tripId}:`, destino);

                    if (destino) {
                        // Validación 1: Día posterior al destino
                        if (dayToUpdate > (destino.day ?? 1)) {
                            console.error(`❌ Validación fallida: Intermedia en día ${dayToUpdate} > Destino en día ${destino.day}`);
                            throw new Error(`Una parada intermedia no puede estar en un día posterior al destino (Destino está en día ${destino.day})`);
                        }

                        // Validación 2: En MISMO día, no puede estar DESPUÉS del destino
                        if (dayToUpdate === (destino.day ?? 1)) {
                            // Usar el array ya sorteado para buscar la posición correcta del destino
                            const destinoPosition = allStopsForValidation.findIndex((s: any) => String(s.id) === String(destino.id)) + 1;
                            console.log(`🎯 Destino en posición ${destinoPosition} del día ${dayToUpdate}`);
                            console.log(`🔀 Intermedia solicita posición ${newPosition}`);

                            if (newPosition > destinoPosition) {
                                console.error(`❌ Validación fallida: Intermedia posición ${newPosition} > Destino posición ${destinoPosition}`);
                                throw new Error(`Una parada intermedia no puede estar después del destino en el mismo día (Destino está en posición ${destinoPosition})`);
                            }
                        }
                    } else {
                        console.warn(`⚠️ No se encontró un destino en el viaje ${tripId}`);
                    }
                }

                // Usar la data ya obtenida para reordenar
                let stopsData = allStopsForValidation;
                if (!stopsData || stopsData.length === 0) {
                    console.log(`ℹ️ No hay paradas en el día ${dayToUpdate}`);
                }

                if (stopsData && stopsData.length > 0) {
                    // Crear nueva lista: remover el stop siendo editado, insertar en nueva posición
                    const otherIds: string[] = stopsData
                        .filter((s: any) => String(s.id) !== String(id))
                        .map((s: any) => String(s.id));

                    console.log(`📋 Stop ID siendo editado: ${id}`);
                    console.log(`📋 Otros stops antes de insertar (${otherIds.length}): ${otherIds.join(' → ')}`);

                    // VALIDAR RANGO: newPosition debe estar entre 1 y otherIds.length + 1
                    const maxPosition = otherIds.length + 1;
                    if (newPosition < 1 || newPosition > maxPosition) {
                        console.error(`❌ Posición ${newPosition} inválida. Rango válido: 1-${maxPosition}`);
                        throw new Error(`La posición debe estar entre 1 y ${maxPosition}`);
                    }

                    // Insertar el stop siendo editado en la nueva posición
                    otherIds.splice(newPosition - 1, 0, String(id));

                    console.log(`📋 Orden final después de insertar stop ${id} (${otherIds.length}): ${otherIds.join(' → ')}`);

                    // Renumerar TODAS las paradas secuencialmente
                    console.log(`🔄 INICIANDO RENUMERACIÓN de ${otherIds.length} paradas`);
                    const updatePromises = [];
                    for (let i = 0; i < otherIds.length; i++) {
                        const correctPos = i + 1;
                        const stopId = otherIds[i];
                        console.log(`   ↳ Parada ${stopId}: posición ${correctPos}`);
                        updatePromises.push(
                            supabase
                                .from(STOP_TABLE)
                                .update({ position: correctPos })
                                .eq('id', stopId)
                                .then(({ error }) => {
                                    if (error) {
                                        console.error(`❌ Error actualizando parada ${stopId}:`, error);
                                        throw error;
                                    }
                                    console.log(`✅ Parada ${stopId} actualizada a posición ${correctPos}`);
                                })
                        );
                    }

                    // Esperar a que todos los updates terminen
                    await Promise.all(updatePromises);

                    console.log(`✅ Renumeración completada para ${otherIds.length} paradas`);

                    // NO actualizar position en stopDataWithPrice - ya fue manejado
                    delete (stopDataWithPrice as any).position;
                }
            }
        } catch (error) {
            console.error('❌ Error al reordenar paradas:', error);
            // IMPORTANTE: Relanzar errores de validación (origen/destino/intermedia)
            if (error instanceof Error) {
                if (error.message.includes('intermedia') ||
                    error.message.includes('Origen') ||
                    error.message.includes('Destino')) {
                    throw error; // Relanzar para que llegue al controller
                }
            }
        }
    }

    const { data, error } = await supabase
        .from(STOP_TABLE)
        .update(stopDataWithPrice)
        .eq('id', id)
        .select()
        .maybeSingle();

    console.log(`✅ Stop actualizada. Datos enviados a BD:`, {
        day: stopDataWithPrice.day,
        position: stopDataWithPrice.position,
        name: stopDataWithPrice.name,
        type: stopDataWithPrice.type,
    });
    console.log(`📊 Respuesta de BD - Stop actualizado:`, {
        id: data?.id,
        day: data?.day,
        position: data?.position,
        name: data?.name,
        type: data?.type,
    });

    if (error) {
        throw new Error(`Error al actualizar la parada: ${error.message}`);
    }

    if (!data) {
        throw new Error(`No se encontró ninguna parada con el id: ${id}`);
    }

    // ✅ Solo reorganizar si CAMBIÓ el día o la hora
    // Si el usuario solo cambió nombre, descripción, etc., NO reorganizamos
    const dayChanged = stopDataWithPrice.day !== undefined && stopDataWithPrice.day !== (currentStop?.day ?? 1);
    const timeChanged = stopDataWithPrice.estimated_arrival !== undefined &&
        stopDataWithPrice.estimated_arrival !== currentStop?.estimated_arrival;

    if (tripId && (dayChanged || timeChanged)) {
        console.log(`📝 Día o hora cambió → Reorganizando posiciones (no-bloqueante)`);
        reorganizePositions(tripId).catch(error =>
            console.error(`⚠️ Error reorganizando posiciones en update (no-bloqueante):`, error)
        );
    }

    return data;
};

export const deleteStop = async (id: string) => {
    // Primero verificamos que la parada existe y guardamos su información
    const { data: existingStop } = await supabase
        .from(STOP_TABLE)
        .select('id, order, day, position')
        .eq('id', id)
        .maybeSingle();

    if (!existingStop) {
        throw new Error(`No se encontró ninguna parada con el id: ${id}`);
    }

    // Guardar el orden de la parada antes de borrarla
    const deletedStopOrder = existingStop.order;
    const deletedStopDay = existingStop.day ?? 1;

    const { data: prevRoute } = await supabase
        .from(ROUTE_TABLE)
        .select('*')
        .eq('destination_id', id)
        .maybeSingle();

    const { data: nextRoute } = await supabase
        .from(ROUTE_TABLE)
        .select('*')
        .eq('origin_id', id)
        .maybeSingle();

    // Guardar el tripId para reordenar después
    const tripId = prevRoute?.trip_id || nextRoute?.trip_id;

    //Verificar si se pueden fusionar rutas
    if (prevRoute && nextRoute && prevRoute.trip_id === nextRoute.trip_id) {

        const updatedFields: any = {
            destination_id: nextRoute.destination_id,
            distance: (Number(prevRoute.distance) || 0) + (Number(nextRoute.distance) || 0),
            end_date: nextRoute.end_date || prevRoute.end_date,
        };

        // Borrar la ruta siguiente
        await deleteRoute(nextRoute.id);

        //actualizar ruta previa
        const updatedPrev = await updateRoute(prevRoute.id, updatedFields);

        return updatedPrev;
    }

    const { error } = await supabase
        .from(STOP_TABLE)
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Error al eliminar la parada: ${error.message}`);
    }

    // Reorganizar posiciones después de borrar (no-bloqueante)
    // Esto asegura que origen → intermedias → destino siga siendo válido
    if (tripId) {
        reorganizePositions(tripId).catch(error =>
            console.error(`⚠️ Error reorganizando posiciones en delete (no-bloqueante):`, error)
        );
    }

    return id;
};

// =============== HELPERS ===============
/**
 * Convierte una hora simple (HH:mm) o un timestamp parcial a un timestamp completo
 * usando la fecha de inicio del viaje + el día de la parada
 * @param timeString Hora en formato "HH:mm" o timestamp ISO completo
 * @param tripId ID del viaje
 * @param day Número del día del viaje (1 = primer día, 2 = segundo día, etc.)
 */
const convertTimeToTimestamp = async (timeString: string, tripId: number, day?: number): Promise<string> => {
    try {
        // Si ya es un timestamp completo (contiene fecha), retornarlo
        if (timeString.includes('T') || timeString.includes('-')) {
            return timeString;
        }

        // Si es solo hora (formato HH:mm o H:mm)
        const timeRegex = /^(\d{1,2}):(\d{2})$/;
        const match = timeString.match(timeRegex);

        if (!match) {
            console.warn(`Formato de hora no válido: ${timeString}, usando fecha actual`);
            return new Date().toISOString();
        }

        // Obtener la fecha del viaje
        const trip = await TripService.getById(tripId);
        let baseDate = new Date();

        if (trip.start_date) {
            baseDate = new Date(trip.start_date);

            // Si se proporciona el día, sumar (day - 1) días a la fecha de inicio
            if (day !== undefined && day > 1) {
                baseDate.setDate(baseDate.getDate() + (day - 1));
            }
        }

        // Extraer horas y minutos
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);

        // Crear el timestamp completo
        baseDate.setHours(hours, minutes, 0, 0);

        const timestamp = baseDate.toISOString();
        console.log(`Hora convertida: ${timeString} (Día ${day || 1}) -> ${timestamp}`);

        return timestamp;
    } catch (error) {
        console.error('Error convirtiendo hora a timestamp:', error);
        // En caso de error, usar la fecha actual
        return new Date().toISOString();
    }
};

/**
 * Elimina propiedades con valor undefined de un objeto
 * Útil para limpiar payloads antes de enviar a la base de datos
 * @param obj Objeto a filtrar
 * @returns Nuevo objeto sin propiedades undefined
 */
const removeUndefinedFields = <T extends Record<string, any>>(obj: T): Partial<T> => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => value !== undefined)
    ) as Partial<T>;
};

export const getCoordinatesForAddress = async (address: string): Promise<{ latitude: number; longitude: number }> => {
    try {
        console.log(`Intentando geocodificar dirección: "${address}"`);
        const geocodingResult = await geocoder.geocode(address);

        if (geocodingResult?.length > 0) {
            const { latitude, longitude } = geocodingResult[0];

            // Validar que las coordenadas sean válidas
            if (typeof latitude === 'number' && typeof longitude === 'number' &&
                latitude !== 0 && longitude !== 0) {
                console.log(`Coordenadas obtenidas: lat=${latitude}, lon=${longitude}`);
                return {
                    latitude,
                    longitude,
                };
            }
        }

        console.error(`No se encontraron coordenadas válidas para la dirección: "${address}"`);
        throw new Error(`No se pudo geocodificar la dirección: "${address}". Por favor, verifica que la dirección sea correcta.`);
    } catch (e) {
        console.error(`Error al obtener coordenadas para "${address}":`, e);
        if (e instanceof Error) {
            throw e;
        }
        throw new Error(`Error al geocodificar la dirección: "${address}"`);
    }
};

export const orderStop = async (tripId: number) => {
    const stops = await getAllStopsInATrip(tripId);
    if (!stops || stops.length === 0) return 1;

    const lastStop = stops[stops.length - 1];
    const lastOrder = typeof lastStop.order === 'number' ? lastStop.order : Number(lastStop.order) || 0;

    return lastOrder + 1;
}

/**
 * Reorganiza las posiciones de todas las paradas de un viaje según la lógica:
 * 1. ORIGEN → posición 1
 * 2. INTERMEDIA → ordenadas por day + estimated_arrival
 * 3. DESTINO → última posición
 */
const reorganizePositions = async (tripId: number) => {
    try {
        const stops = await getAllStopsInATrip(tripId);
        if (!stops || stops.length < 2) return; // No hay nada que reorganizar

        console.log(`🔄 Reorganizando posiciones por DÍA para viaje ${tripId}...`);

        // Agrupar stops por day
        const stopsByDay: { [day: number]: any[] } = {};

        stops.forEach(stop => {
            const day = (stop as any).day ?? 1;
            if (!stopsByDay[day]) {
                stopsByDay[day] = [];
            }
            stopsByDay[day].push(stop);
        });

        console.log(`📅 Días encontrados:`, Object.keys(stopsByDay).join(', '));

        // Para cada día, reorganizar posiciones
        const updatePromises: PromiseLike<any>[] = [];

        Object.keys(stopsByDay).forEach(dayStr => {
            const day = parseInt(dayStr);
            const stopsInDay = stopsByDay[day];

            // Separar por tipo en este día
            const origen = stopsInDay.find(s => s.type === 'origen');
            const destino = stopsInDay.find(s => s.type === 'destino');
            const intermedias = stopsInDay.filter(s => s.type === 'intermedia');

            // Ordenar intermedias por hora (estimated_arrival)
            intermedias.sort((a, b) => {
                const timeA = a.estimated_arrival ? new Date(a.estimated_arrival).getTime() : Infinity;
                const timeB = b.estimated_arrival ? new Date(b.estimated_arrival).getTime() : Infinity;
                return timeA - timeB;
            });

            // Construir orden para este día: origen (pos1) + intermedias (pos2..n) + destino (pos n+1)
            const orderedInDay = [];
            if (origen) orderedInDay.push(origen);
            orderedInDay.push(...intermedias);
            if (destino) orderedInDay.push(destino);

            console.log(`📌 Día ${day}: ${orderedInDay.map(s => `${s.name}(${s.type})`).join(' → ')}`);

            // Actualizar posiciones para este día
            orderedInDay.forEach((stop, index) => {
                const newPosition = index + 1;
                console.log(`  ✏️ ${stop.name} (${stop.type}) → posición ${newPosition}`);

                updatePromises.push(
                    supabase
                        .from(STOP_TABLE)
                        .update({ position: newPosition })
                        .eq('id', stop.id)
                        .then(({ error }) => {
                            if (error) console.error(`Error actualizando posición de ${stop.id}:`, error);
                        })
                );
            });
        });

        // Ejecutar todos los updates en paralelo
        await Promise.all(updatePromises);

        console.log(`✅ Posiciones reorganizadas en viaje ${tripId}: ${updatePromises.length} updates completados`);
    } catch (error) {
        console.error(`❌ Error reorganizando posiciones en viaje ${tripId}:`, error);
    }
};

export const orderStopsInTrip = async (tripId: number, deletedStopOrder?: number) => {
    const stops = await getAllStopsInATrip(tripId);
    if (!stops || stops.length === 0) return;

    // Ordenar las paradas por su orden actual
    stops.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Si se proporciona el orden de la parada borrada, solo actualizar las posteriores
    const stopsToUpdate = deletedStopOrder
        ? stops.filter(stop => (stop.order ?? 0) > deletedStopOrder)
        : stops;

    // Actualizar el orden de las paradas en la base de datos
    // ⚠️ NO CAMBIAR EL TIPO - el tipo debe ser independiente del orden
    await Promise.all(
        stopsToUpdate.map((stop) => {
            // Calcular el nuevo orden: si hay parada borrada, decrementar en 1
            const newOrder = deletedStopOrder && (stop.order ?? 0) > deletedStopOrder
                ? (stop.order ?? 0) - 1
                : stop.order ?? 0;

            // Solo actualizar el orden, mantener el tipo existente
            return updateStop(stop.id, {
                order: newOrder,
            });
        })
    );
};

export const isStopInUse = async (stopId: string): Promise<boolean> => {
    // Si no hay un stopId válido, no está en uso
    if (!stopId) return false;

    const { data, error } = await supabase
        .from(ROUTE_TABLE)
        .select('id')
        .or(`origin_id.eq.${stopId},destination_id.eq.${stopId}`)
        .limit(1);

    if (error) {
        throw new Error(`Error al verificar si la parada está en uso: ${error.message}`);
    }

    return Array.isArray(data) && data.length > 0;
};

// =============== COMBINED SERVICES ===============

// Obtener ruta completa con todas sus paradas
export const getRouteWithStops = async (routeId: string) => {
    const route = await getRouteById(routeId);

    // Obtener los ids de origen y destino para la ruta
    const { origin_id, destination_id } = await getRouteStops(routeId);
    const stopIds = [origin_id, destination_id].filter(Boolean) as string[];

    const stops = await getStopsByIds(stopIds);

    return {
        ...route,
        stops
    };
};

// Obtener todas las rutas de un viaje con sus paradas
export const getTripItinerary = async (tripId: number) => {
    const routes = await getRoutesByTripId(tripId);

    const routesWithStops = await Promise.all(
        routes.map(async (route) => {
            return getRouteWithStops(route.id);
        })
    );

    return {
        trip: await TripService.getById(tripId),
        routesWithStops
    };
};

// Obtener todas las paradas únicas de un viaje
export const getAllStopsInATrip = async (tripId: number) => {
    // Obtener las rutas del viaje con sus paradas
    const routesWithStops = (await getTripItinerary(tripId)).routesWithStops;

    // Aplanar todas las paradas de las rutas y eliminar duplicados por id
    const allStops = routesWithStops.flatMap((r: any) => (r.stops ?? []));
    const uniqueStopsMap: Record<string, any> = {};

    for (const stop of allStops) {
        if (stop && stop.id) {
            uniqueStopsMap[stop.id] = stop;
        }
    }

    const uniqueStops = Object.values(uniqueStopsMap);

    uniqueStops.sort((a: any, b: any) => {
        const orderA = a.order ?? a.planned_arrival_time ?? 0;
        const orderB = b.order ?? b.planned_arrival_time ?? 0;

        if (typeof orderA === 'number' && typeof orderB === 'number') {
            return orderA - orderB;
        }

        // Si son fechas, ordenar cronológicamente
        if (orderA instanceof Date && orderB instanceof Date) {
            return orderA.getTime() - orderB.getTime();
        }

        return 0;
    });

    // Enriquecer cada parada con información de precio de sus subtypes
    const enrichedStops = await Promise.all(
        uniqueStops.map(async (stop: any) => {
            try {
                // Buscar en activity, accommodation, y refuel
                const [activityResult, accommodationResult, refuelResult] = await Promise.all([
                    supabase.from(ACTIVITY_TABLE).select('estimated_price').eq('id', stop.id).maybeSingle(),
                    supabase.from(ACCOMMODATION_TABLE).select('estimated_price').eq('id', stop.id).maybeSingle(),
                    supabase.from(REFUEL_TABLE).select('total_price').eq('id', stop.id).maybeSingle(),
                ]);

                // Agregue el precio estimado si existe
                if (activityResult.data?.estimated_price) {
                    stop.estimated_price = activityResult.data.estimated_price;
                } else if (accommodationResult.data?.estimated_price) {
                    stop.estimated_price = accommodationResult.data.estimated_price;
                } else if (refuelResult.data?.total_price) {
                    stop.estimated_price = refuelResult.data.total_price;
                }

                return stop;
            } catch (error) {
                // Si hay error enriqueciendo, devolver la parada sin los datos extras
                console.error(`Error enriqueciendo parada ${stop.id}:`, error);
                return stop;
            }
        })
    );

    // NO validar aquí - getAllStopsInATrip se llama muy frecuentemente
    // La validación se hace en updateStop/deleteStop/createStop

    return enrichedStops;
};

/**
 * Obtiene la suma total de costos de repostaje de todos los viajes de un usuario
 * @param userId ID del usuario
 * @returns Objeto con el total de gasto en repostajes y cantidad de repostajes
 */
export const getTotalRefuelCostByUser = async (userId: string) => {
    try {
        // 1. Obtener todos los viajes del usuario
        const trips = await TripService.getUserTrips(userId);

        if (!trips || trips.length === 0) {
            return {
                user_id: userId,
                total_cost: 0,
                refuel_count: 0,
                trips_count: 0
            };
        }

        let totalCost = 0;
        let refuelCount = 0;

        // 2. Para cada viaje, obtener todas las paradas de refuel
        for (const trip of trips) {
            const allStops = await getAllStopsInATrip(trip.id);

            if (!allStops || allStops.length === 0) {
                continue;
            }

            const stopIds = allStops.map(stop => stop.id);

            // Obtener todos los repostajes de esas paradas
            const { data: refuels, error } = await supabase
                .from(REFUEL_TABLE)
                .select('total_cost')
                .in('id', stopIds);

            if (error) {
                console.error(`Error al obtener repostajes del viaje ${trip.id}:`, error);
                continue;
            }

            if (refuels && refuels.length > 0) {
                refuels.forEach(refuel => {
                    if (refuel.total_cost) {
                        totalCost += refuel.total_cost;
                        refuelCount += 1;
                    }
                });
            }
        }

        return {
            user_id: userId,
            total_cost: totalCost,
            refuel_count: refuelCount,
            trips_count: trips.length
        };
    } catch (error) {
        console.error('Error en getTotalRefuelCostByUser:', error);
        throw error;
    }
};

/**
 * Obtiene la suma total de costos de repostaje de un viaje específico
 * @param tripId ID del viaje
 * @returns Objeto con el total de gasto en repostajes del viaje
 */
export const getTotalRefuelCostByTrip = async (tripId: number) => {
    try {
        // 1. Get all routes for this trip
        const routes = await getRoutesByTripId(tripId);

        if (!routes || routes.length === 0) {
            return {
                trip_id: tripId,
                total_cost: 0,
                refuel_count: 0
            };
        }

        // 2. Collect all stop IDs from routes and create all possible stop IDs
        const stopIds = new Set<string>();
        for (const route of routes) {
            if (route.origin_id) stopIds.add(route.origin_id);
            if (route.destination_id) stopIds.add(route.destination_id);
        }

        // Get intermediate stops from the stop table
        const { data: stops, error: stopsError } = await supabase
            .from(STOP_TABLE)
            .select('id')
            .eq('trip_id', tripId);

        if (!stopsError && stops) {
            for (const stop of stops) {
                stopIds.add(stop.id);
            }
        }

        // 3. Get all refuels for these stops
        const stopIdsArray = Array.from(stopIds);
        if (stopIdsArray.length === 0) {
            return {
                trip_id: tripId,
                total_cost: 0,
                refuel_count: 0
            };
        }

        const { data: refuels, error } = await supabase
            .from(REFUEL_TABLE)
            .select('id, total_cost, liters, price_per_unit')
            .in('id', stopIdsArray);

        if (error) {
            console.error(`Error al obtener repostajes del viaje ${tripId}:`, error);
            throw new Error(`Error al obtener repostajes del viaje: ${error.message}`);
        }

        let totalCost = 0;
        if (refuels && refuels.length > 0) {
            for (const refuel of refuels) {
                // Calcular total_cost si no existe
                let cost = refuel.total_cost;
                if (!cost && refuel.liters && refuel.price_per_unit) {
                    cost = refuel.liters * refuel.price_per_unit;
                }
                totalCost += (cost || 0);
            }
        }

        return {
            trip_id: tripId,
            total_cost: totalCost,
            refuel_count: refuels?.length || 0
        };
    } catch (error) {
        console.error('Error en getTotalRefuelCostByTrip:', error);
        throw error;
    }
};

/**
 * Obtiene el costo total de alojamiento de un viaje
 * @param tripId ID del viaje
 * @returns Objeto con el total de gasto en alojamientos del viaje
 */
export const getTotalAccommodationCostByTrip = async (tripId: number) => {
    try {
        console.log(`[getTotalAccommodationCostByTrip] Iniciando para tripId: ${tripId}`);

        // 1. Get all routes for this trip
        const routes = await getRoutesByTripId(tripId);
        console.log(`[getTotalAccommodationCostByTrip] Rutas encontradas: ${routes?.length || 0}`);

        if (!routes || routes.length === 0) {
            console.log(`[getTotalAccommodationCostByTrip] No hay rutas, retornando 0`);
            return {
                trip_id: tripId,
                total_cost: 0,
                accommodation_count: 0
            };
        }

        // 2. Collect all stop IDs from routes and create all possible stop IDs
        const stopIds = new Set<string>();
        for (const route of routes) {
            if (route.origin_id) stopIds.add(route.origin_id);
            if (route.destination_id) stopIds.add(route.destination_id);
        }

        // Get intermediate stops from the stop table
        const { data: stops, error: stopsError } = await supabase
            .from(STOP_TABLE)
            .select('id')
            .eq('trip_id', tripId);

        if (!stopsError && stops) {
            console.log(`[getTotalAccommodationCostByTrip] Paradas intermedias encontradas: ${stops.length}`);
            for (const stop of stops) {
                stopIds.add(stop.id);
            }
        }

        // 3. Get all accommodations for these stops
        const stopIdsArray = Array.from(stopIds);
        console.log(`[getTotalAccommodationCostByTrip] Total de paradas a buscar: ${stopIdsArray.length}`, stopIdsArray);

        if (stopIdsArray.length === 0) {
            console.log(`[getTotalAccommodationCostByTrip] No hay paradas, retornando 0`);
            return {
                trip_id: tripId,
                total_cost: 0,
                accommodation_count: 0
            };
        }

        const { data: accommodations, error } = await supabase
            .from(ACCOMMODATION_TABLE)
            .select('id, nights, estimated_price')
            .in('id', stopIdsArray);

        console.log(`[getTotalAccommodationCostByTrip] Alojamientos encontrados: ${accommodations?.length || 0}`, accommodations);

        if (error) {
            console.error(`[getTotalAccommodationCostByTrip] Error al obtener alojamientos del viaje ${tripId}:`, error);
            throw new Error(`Error al obtener alojamientos del viaje: ${error.message}`);
        }

        let totalCost = 0;
        if (accommodations && accommodations.length > 0) {
            for (const accommodation of accommodations) {
                // Calculate cost as nights × estimated_price
                if (accommodation.nights && accommodation.estimated_price) {
                    const cost = accommodation.nights * accommodation.estimated_price;
                    console.log(`[getTotalAccommodationCostByTrip] Calculado: ${accommodation.nights} noches × ${accommodation.estimated_price}€ = ${cost}€`);
                    totalCost += cost;
                }
            }
        }

        console.log(`[getTotalAccommodationCostByTrip] Total cost calculado: ${totalCost}€`);

        return {
            trip_id: tripId,
            total_cost: totalCost,
            accommodation_count: accommodations?.length || 0
        };
    } catch (error) {
        console.error('Error en getTotalAccommodationCostByTrip:', error);
        throw error;
    }
};

/**
 * Obtiene el costo total de actividades de un viaje
 * @param tripId ID del viaje
 * @returns Objeto con el total de gasto en actividades del viaje
 */
export const getTotalActivityCostByTrip = async (tripId: number) => {
    try {
        console.log(`[getTotalActivityCostByTrip] Iniciando para tripId: ${tripId}`);

        // 1. Get all routes for this trip
        const routes = await getRoutesByTripId(tripId);
        console.log(`[getTotalActivityCostByTrip] Rutas encontradas: ${routes?.length || 0}`);

        if (!routes || routes.length === 0) {
            console.log(`[getTotalActivityCostByTrip] No hay rutas, retornando 0`);
            return {
                trip_id: tripId,
                total_cost: 0,
                activity_count: 0
            };
        }

        // 2. Collect all stop IDs from routes and create all possible stop IDs
        const stopIds = new Set<string>();
        for (const route of routes) {
            if (route.origin_id) stopIds.add(route.origin_id);
            if (route.destination_id) stopIds.add(route.destination_id);
        }

        // Get intermediate stops from the stop table
        const { data: stops, error: stopsError } = await supabase
            .from(STOP_TABLE)
            .select('id')
            .eq('trip_id', tripId);

        if (!stopsError && stops) {
            console.log(`[getTotalActivityCostByTrip] Paradas intermedias encontradas: ${stops.length}`);
            for (const stop of stops) {
                stopIds.add(stop.id);
            }
        }

        // 3. Get all activities for these stops
        const stopIdsArray = Array.from(stopIds);
        console.log(`[getTotalActivityCostByTrip] Total de paradas a buscar: ${stopIdsArray.length}`, stopIdsArray);

        if (stopIdsArray.length === 0) {
            console.log(`[getTotalActivityCostByTrip] No hay paradas, retornando 0`);
            return {
                trip_id: tripId,
                total_cost: 0,
                activity_count: 0
            };
        }

        const { data: activities, error } = await supabase
            .from(ACTIVITY_TABLE)
            .select('id, estimated_price')
            .in('id', stopIdsArray);

        console.log(`[getTotalActivityCostByTrip] Actividades encontradas: ${activities?.length || 0}`, activities);

        if (error) {
            console.error(`[getTotalActivityCostByTrip] Error al obtener actividades del viaje ${tripId}:`, error);
            throw new Error(`Error al obtener actividades del viaje: ${error.message}`);
        }

        let totalCost = 0;
        if (activities && activities.length > 0) {
            for (const activity of activities) {
                // Usar estimated_price como el costo de la actividad
                totalCost += (activity.estimated_price || 0);
            }
        }

        console.log(`[getTotalActivityCostByTrip] Total cost calculado: ${totalCost}€`);

        return {
            trip_id: tripId,
            total_cost: totalCost,
            activity_count: activities?.length || 0
        };
    } catch (error) {
        console.error('Error en getTotalActivityCostByTrip:', error);
        throw error;
    }
};

// =============== ATTACHMENT SERVICES ===============

/**
 * Subir archivo de reserva a Supabase Storage
 */
export const uploadReservationAttachment = async (
    stopId: string,
    userId: string,
    file: { filepath: string; originalFilename: string; mimetype: string; size: number },
    userToken?: string // Agregar token del usuario
) => {
    console.log('🔍 uploadReservationAttachment iniciado:', { stopId, userId, fileName: file.originalFilename });

    // 1. Verificar que el usuario tiene acceso a esta parada
    const { data: routes, error: routeError } = await supabase
        .from('route')
        .select('trip_id')
        .or(`origin_id.eq.${stopId},destination_id.eq.${stopId}`)
        .limit(1)
        .maybeSingle();

    console.log('📍 Búsqueda de ruta:', { routes, routeError });

    if (routeError || !routes) {
        console.error('❌ Parada no encontrada en ninguna ruta');
        throw new Error('Parada no encontrada');
    }

    const { data: traveler, error: travelerError } = await supabase
        .from('travelers')
        .select('*')
        .eq('trip_id', routes.trip_id)
        .eq('user_id', userId)
        .maybeSingle();

    console.log('👤 Búsqueda de viajero:', { traveler, travelerError, tripId: routes.trip_id });

    if (!traveler) {
        console.error('❌ Usuario no es viajero del viaje');
        throw new Error('No tienes permiso para subir archivos a esta parada');
    }

    // 2. Validar tipo de archivo
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
    ];

    if (!allowedTypes.includes(file.mimetype || '')) {
        throw new Error('Tipo de archivo no permitido. Solo se aceptan PDF e imágenes');
    }

    // 3. Generar nombre único para el archivo
    const fileExt = file.originalFilename?.split('.').pop() || 'bin';
    const fileName = `${stopId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    console.log('📁 Generando nombre de archivo:', { fileName, fileExt });

    // 4. Leer archivo
    const fs = await import('fs');
    const fileBuffer = fs.readFileSync(file.filepath);

    console.log('📄 Archivo leído:', { size: fileBuffer.length, originalSize: file.size });

    // 5. Crear cliente de Supabase con el token del usuario para Storage
    const { createClient } = await import('@supabase/supabase-js');
    const userSupabase = userToken
        ? createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${userToken}`
                    }
                }
            }
        )
        : supabase; // Fallback al cliente normal si no hay token

    console.log('🔑 Cliente de Supabase:', { usingUserToken: !!userToken });

    // 6. Subir a Supabase Storage con el cliente del usuario
    console.log('⬆️ Iniciando subida a Storage:', { fileName, bucket: 'reservation-attachments' });

    const { data: uploadData, error: uploadError } = await userSupabase.storage
        .from('reservation-attachments')
        .upload(fileName, fileBuffer, {
            contentType: file.mimetype || 'application/octet-stream',
            upsert: false,
        });

    console.log('☁️ Resultado de subida a Storage:', {
        uploadData,
        uploadError,
        path: uploadData?.path,
        id: uploadData?.id
    });

    if (uploadError) {
        console.error('❌ Error al subir archivo a Storage:', uploadError);
        throw new Error(`Error al subir archivo: ${uploadError.message}`);
    }

    if (!uploadData?.path) {
        console.error('❌ Upload exitoso pero sin path!');
        throw new Error('Error: archivo subido sin path');
    }

    // Verificar que el archivo realmente exista
    console.log('🔍 Verificando que el archivo existe en Storage...');
    const { data: checkData, error: checkError } = await userSupabase.storage
        .from('reservation-attachments')
        .list(uploadData.path.split('/')[0], {
            search: uploadData.path.split('/')[1]
        });

    console.log('🔍 Verificación de existencia:', {
        found: checkData?.length || 0,
        checkError,
        searchPath: uploadData.path
    });

    // 7. Crear registro en la base de datos
    const insertData = {
        stop_id: parseInt(stopId),
        file_path: uploadData.path,
        file_name: file.originalFilename || 'archivo',
        file_type: file.mimetype || 'application/octet-stream',
        file_size: file.size,
        uploaded_by: userId,
    };

    console.log('💾 Insertando en reservation_attachments:', insertData);

    const { data: attachment, error: dbError } = await supabase
        .from('reservation_attachments')
        .insert(insertData)
        .select()
        .single();

    console.log('💾 Resultado de inserción en DB:', { attachment, dbError });

    if (dbError) {
        // Limpiar archivo subido si falla el registro en DB
        await supabase.storage
            .from('reservation-attachments')
            .remove([fileName]);

        throw new Error(`Error al guardar registro: ${dbError.message}`);
    }

    // 7. Generar URL firmada (válida por 1 hora)
    const { data: urlData } = await supabase.storage
        .from('reservation-attachments')
        .createSignedUrl(uploadData.path, 3600);

    return {
        id: attachment.id,
        path: uploadData.path,
        url: urlData?.signedUrl || '',
    };
};

/**
 * Obtener adjuntos de una parada
 */
export const getStopAttachments = async (stopId: string, userId: string, userToken?: string) => {
    // Verificar acceso
    const { data: routes, error: routeError } = await supabase
        .from('route')
        .select('trip_id')
        .or(`origin_id.eq.${stopId},destination_id.eq.${stopId}`)
        .limit(1)
        .maybeSingle();

    if (routeError) {
        console.error('Error checking route:', routeError);
        throw new Error('Error al verificar permisos');
    }

    if (!routes) {
        // Si no hay ruta, la parada no existe o no está en ningún viaje
        // Devolver array vacío en lugar de error
        return [];
    }

    const { data: traveler } = await supabase
        .from('travelers')
        .select('*')
        .eq('trip_id', routes.trip_id)
        .eq('user_id', userId)
        .maybeSingle();

    if (!traveler) {
        throw new Error('No tienes permiso para ver estos adjuntos');
    }

    // Obtener adjuntos
    const { data: attachments, error } = await supabase
        .from('reservation_attachments')
        .select('*')
        .eq('stop_id', stopId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Error al obtener adjuntos: ${error.message}`);
    }

    // Si no hay adjuntos, devolver array vacío
    if (!attachments || attachments.length === 0) {
        return [];
    }

    // Generar URLs firmadas para cada adjunto
    console.log('🔗 Iniciando generación de URLs firmadas para', attachments.length, 'adjuntos');

    // Crear cliente con token del usuario para Storage (igual que en upload)
    const { createClient } = await import('@supabase/supabase-js');
    const userSupabase = userToken
        ? createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${userToken}`
                    }
                }
            }
        )
        : supabase;

    console.log('🔑 Usando cliente:', { conTokenUsuario: !!userToken });

    const attachmentsWithUrls = await Promise.all(
        (attachments || []).map(async (attachment) => {
            console.log('🔗 Generando URL para:', attachment.file_name, 'Path:', attachment.file_path);

            // Usar el cliente con token de usuario para generar URL firmada
            const { data: urlData, error: urlError } = await userSupabase.storage
                .from('reservation-attachments')
                .createSignedUrl(attachment.file_path, 3600);

            if (urlError) {
                console.error('❌ Error generando URL:', urlError.message);
            } else if (urlData?.signedUrl) {
                console.log('✅ URL generada exitosamente para', attachment.file_name);
            } else {
                console.error('⚠️ URL es null para', attachment.file_name);
            }

            return {
                ...attachment,
                url: urlData?.signedUrl || null,
            };
        })
    );

    console.log('📦 Retornando', attachmentsWithUrls.length, 'attachments -',
        attachmentsWithUrls.filter(a => a.url !== null).length, 'con URL válida');

    return attachmentsWithUrls;
};

/**
 * Eliminar un adjunto
 */
export const deleteAttachment = async (attachmentId: string, userId: string) => {
    // Obtener el adjunto
    const { data: attachment, error } = await supabase
        .from('reservation_attachments')
        .select('*')
        .eq('id', attachmentId)
        .single();

    if (error || !attachment) {
        throw new Error('Adjunto no encontrado');
    }

    // Verificar que el usuario sea el dueño
    if (attachment.uploaded_by !== userId) {
        throw new Error('No tienes permiso para eliminar este adjunto');
    }

    // Eliminar de storage
    const { error: storageError } = await supabase.storage
        .from('reservation-attachments')
        .remove([attachment.file_path]);

    if (storageError) {
        console.error('Error al eliminar archivo de storage:', storageError);
    }

    // Eliminar registro de DB
    const { error: dbError } = await supabase
        .from('reservation_attachments')
        .delete()
        .eq('id', attachmentId);

    if (dbError) {
        throw new Error(`Error al eliminar adjunto: ${dbError.message}`);
    }
};

// =============== STOP PHOTOS SERVICES ===============

/**
 * Actualiza la foto de una parada específica
 */
export const refreshStopPhoto = async (stopId: string) => {
    // Obtener la parada actual
    const stop = await getStopById(stopId);

    if (!stop.name || !stop.coordinates) {
        throw new Error('La parada debe tener nombre y coordenadas para buscar foto');
    }

    // Usar búsqueda inteligente (Foursquare primero, Google Places como fallback)
    const photoUrl = await searchPlacePhotoSmart(
        stop.name,
        stop.coordinates,
        stop.address,
        100
    );

    // Actualizar la parada con la nueva foto
    const { data: updatedStop, error } = await supabase
        .from(STOP_TABLE)
        .update({ photo_url: photoUrl })
        .eq('id', stopId)
        .select()
        .single();

    if (error) {
        throw new Error(`Error al actualizar foto de la parada: ${error.message}`);
    }

    return updatedStop;
};

/**
 * Actualiza las fotos de todas las paradas de un viaje
 */
export const refreshTripStopsPhotos = async (tripId: number) => {
    // Obtener todas las paradas del viaje
    const stops = await getAllStopsInATrip(tripId);

    let updated = 0;
    let failed = 0;
    const results = [];

    for (const stop of stops) {
        try {
            if (stop.name && stop.coordinates) {
                // Usar búsqueda inteligente (Foursquare primero, Google Places como fallback)
                const photoUrl = await searchPlacePhotoSmart(
                    stop.name,
                    stop.coordinates,
                    stop.address,
                    100
                );

                // Actualizar si se encontró foto
                if (photoUrl) {
                    await supabase
                        .from(STOP_TABLE)
                        .update({ photo_url: photoUrl })
                        .eq('id', stop.id);

                    updated++;
                    results.push({ stopId: stop.id, name: stop.name, success: true, photoUrl });
                } else {
                    failed++;
                    results.push({ stopId: stop.id, name: stop.name, success: false, reason: 'No se encontró foto' });
                }
            } else {
                failed++;
                results.push({ stopId: stop.id, name: stop.name || 'Sin nombre', success: false, reason: 'Faltan datos (nombre o coordenadas)' });
            }
        } catch (error) {
            failed++;
            results.push({ stopId: stop.id, name: stop.name, success: false, reason: (error as Error).message });
        }
    }

    return {
        total: stops.length,
        updated,
        failed,
        results,
    };
};
