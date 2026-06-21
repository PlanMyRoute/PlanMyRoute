import { supabase } from "../../supabase.js";
import type {
  Stop,
  Trip,
  Accommodation,
  Refuel,
  Activity,
} from "@planmyroute/types";
import geocoder from "../../config/geocoder.js";
import * as geolocation from "../../utils/geolocation.js";
import * as TripService from "../trips/trips.service.js";
import { searchPlacePhotoSmart } from "../../utils/placesPhotos.js";
import { getPlacePrice } from "../../utils/placePrices.js";
import { dlog } from "../../utils/debugLog.js";

const STOP_TABLE = "stop";
const ACTIVITY_TABLE = "activity";
const ACCOMMODATION_TABLE = "accommodation";
const REFUEL_TABLE = "refuel";
/** Posición de fallback para paradas sin posición asignada (se ordena al final) */
const FALLBACK_POSITION = 999;

// =============== (tabla `route` eliminada) ===============
// El orden del itinerario vive en stop(day, position) y la distancia de cada
// segmento (parada → siguiente) en stop.distance_to_next_meters.
// Ver recalculateTripSegments para el recálculo de distancias/total del viaje.

// =============== STOP SERVICES ===============

/**
 * Obtiene una parada por su ID
 * @param id - ID de la parada
 * @returns Datos de la parada encontrada
 */
export const getStopById = async (id: string) => {
  const { data, error } = await supabase
    .from(STOP_TABLE)
    .select("*")
    .eq("id", id)
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
/**
 * Obtiene múltiples paradas por un array de IDs
 * @param ids - Array de IDs de paradas
 * @returns Lista de paradas encontradas
 */
export const getStopsByIds = async (ids: string[]) => {
  if (!ids || ids.length === 0) return [];

  const { data, error } = await supabase
    .from(STOP_TABLE)
    .select(STOP_SELECT_WITH_SUBTYPES)
    .in("id", ids);

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
  excludeStopId?: number,
): Promise<{ valid: boolean; message?: string }> => {
  try {
    // Solo validar para paradas intermedias
    if (stopData.type !== "intermedia") {
      return { valid: true };
    }

    const intermediaDay = (stopData as any).day ?? 1;
    const intermediaArrival = stopData.estimated_arrival;

    // Obtener TODAS las paradas del viaje (no filtrar por día)
    const { data: allStops, error } = await supabase
      .from(STOP_TABLE)
      .select("id, type, day, estimated_arrival")
      .eq("trip_id", tripId)
      .not("id", "is", null);

    if (error) {
      console.error("Error validando restricciones de orden:", error);
      return { valid: true }; // Permitir si no se puede validar
    }

    // Filtrar los stops, excluyendo el actual si estamos editando
    const stops = excludeStopId
      ? (allStops || []).filter((s: any) => s.id !== excludeStopId)
      : allStops || [];

    // Buscar origen y destino (sin filtrar por día)
    const origin = stops.find((s: any) => s.type === "origen");
    const destination = stops.find((s: any) => s.type === "destino");

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
        const parts = timeStr.split(":");
        if (parts.length >= 2) {
          const h = String(parseInt(parts[0])).padStart(2, "0");
          const m = String(parseInt(parts[1])).padStart(2, "0");
          return `${h}:${m}`;
        }
      }
      // Si es timestamp ISO o similar
      try {
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
          const h = String(date.getHours()).padStart(2, "0");
          const m = String(date.getMinutes()).padStart(2, "0");
          return `${h}:${m}`;
        }
      } catch {}
      return null;
    };

    // Helper para comparar horas (retorna número para comparación)
    const getTimeAsMinutes = (timeStr: string | undefined): number | null => {
      const hm = getHourMinute(timeStr);
      if (!hm) return null;
      const [h, m] = hm.split(":");
      return parseInt(h) * 60 + parseInt(m);
    };

    // VALIDACIÓN 1: Intermedia NO puede estar en día anterior al origen
    if (intermediaDay < originDay) {
      return {
        valid: false,
        message: "La parada intermedia no puede ser antes que el origen",
      };
    }

    // VALIDACIÓN 2: Intermedia NO puede estar en día posterior al destino
    if (intermediaDay > destDay) {
      return {
        valid: false,
        message: "La parada intermedia no puede ser después que el destino",
      };
    }

    // VALIDACIÓN 3: Si está en el mismo día que origen, validar hora
    if (
      intermediaDay === originDay &&
      intermediaArrival &&
      origin.estimated_arrival
    ) {
      const intermediateMinutes = getTimeAsMinutes(intermediaArrival as string);
      const originMinutes = getTimeAsMinutes(
        origin.estimated_arrival as string,
      );

      if (
        intermediateMinutes !== null &&
        originMinutes !== null &&
        intermediateMinutes < originMinutes
      ) {
        return {
          valid: false,
          message: "La parada intermedia no puede ser antes que el origen",
        };
      }
    }

    // VALIDACIÓN 4: Si está en el mismo día que destino, validar hora
    if (
      intermediaDay === destDay &&
      intermediaArrival &&
      destination.estimated_arrival
    ) {
      const intermediateMinutes = getTimeAsMinutes(intermediaArrival as string);
      const destMinutes = getTimeAsMinutes(
        destination.estimated_arrival as string,
      );

      if (
        intermediateMinutes !== null &&
        destMinutes !== null &&
        intermediateMinutes > destMinutes
      ) {
        return {
          valid: false,
          message: "La parada intermedia no puede ser después que el destino",
        };
      }
    }

    return { valid: true };
  } catch (error: unknown) {
    console.error("Error en validateStopOrderRestrictions:", error);
    // Por seguridad, no permitir si hay error en validación
    return {
      valid: false,
      message: "Error al validar restricciones de orden",
    };
  }
};

//Method to create stops
/**
 * Crea una nueva parada en el itinerario de un viaje
 * @param stopData - Datos parciales de la parada a crear
 * @param tripId - ID del viaje al que pertenece la parada
 * @returns Parada creada con su ID asignado
 */
export const createStop = async (stopData: Partial<Stop>, tripId: number) => {
  try {
    const day = (stopData as any).day ?? 1;
    const stopType = stopData.type ?? "intermedia";
    const requestedPosition = (stopData as any).position;

    // ✅ VALIDAR RESTRICCIONES DE ORDEN ANTES DE CREAR
    const validation = await validateStopOrderRestrictions(stopData, tripId);
    if (!validation.valid) {
      console.error(
        `❌ Validación de restricciones fallida: ${validation.message}`,
      );
      throw new Error(validation.message || "Restricción de orden violada");
    }

    // Cargar las paradas del viaje UNA sola vez (versión ligera, sin embeds).
    // Se reutiliza en los pasos 1-3 para evitar 2-3 lecturas redundantes.
    const allStops = await getStopsForOrdering(tripId);

    // 📌 PASO 1: SI EL USUARIO ESPECIFICÓ UNA POSICIÓN, HACER ESPACIO PARA ELLA
    if (requestedPosition) {
      const stopsInDayBeforeIncrement = allStops.filter((s) => s.day === day);

      // VALIDAR RANGO: requestedPosition entre 1 y stopsInDayBeforeIncrement.length + 1
      const maxPosition = stopsInDayBeforeIncrement.length + 1;
      if (requestedPosition < 1 || requestedPosition > maxPosition) {
        throw new Error(`La posición debe estar entre 1 y ${maxPosition}`);
      }

      // Paradas que necesitan incrementar su posición
      const stopsToIncrement = stopsInDayBeforeIncrement.filter(
        (s) => (s.position ?? FALLBACK_POSITION) >= requestedPosition,
      );

      // Incrementar la posición en BD EN PARALELO
      await Promise.all(
        stopsToIncrement.map((stop) =>
          supabase
            .from(STOP_TABLE)
            .update({ position: (stop.position ?? FALLBACK_POSITION) + 1 })
            .eq("id", stop.id),
        ),
      );

      // Reflejar los incrementos en memoria para que el PASO 3 vea el estado actual
      stopsToIncrement.forEach((stop) => {
        stop.position = (stop.position ?? FALLBACK_POSITION) + 1;
      });
    }
    // 📌 PASO 2: SI NO ESPECIFICÓ POSICIÓN, ASIGNAR AUTOMÁTICA SEGÚN EL TIPO
    else {
      const stopsInDay = allStops.filter((s) => s.day === day);
      // Origen → posición 1; destino e intermedia → al final por defecto
      (stopData as any).position =
        stopType === "origen" ? 1 : stopsInDay.length + 1;
    }

    // 📌 PASO 3: CALCULAR EL ORDER BASADO EN LA POSICIÓN FINAL
    const finalPosition = (stopData as any).position;
    if (day && finalPosition) {
      const stopsInDayUpdated = allStops
        .filter((s) => s.day === day)
        .sort(
          (a, b) => (a.position ?? a.order ?? 0) - (b.position ?? b.order ?? 0),
        );

      // Recalcular order para esta posición específica
      if (stopsInDayUpdated.length === 0) {
        // Primera parada del día
        stopData.order = day * 10000;
      } else if (finalPosition <= 1) {
        // Insertar al inicio (antes de todos)
        const firstStopOrder = stopsInDayUpdated[0]?.order ?? 1000;
        stopData.order = firstStopOrder - 100;
      } else if (finalPosition > stopsInDayUpdated.length) {
        // Insertar al final (después de todos)
        const lastStopOrder =
          stopsInDayUpdated[stopsInDayUpdated.length - 1]?.order ?? 1000;
        stopData.order = lastStopOrder + 100;
      } else {
        // Insertar en medio: la posición N va entre la parada N-1 y la parada N
        const prevOrder = stopsInDayUpdated[finalPosition - 2]?.order ?? 0;
        const nextOrder = stopsInDayUpdated[finalPosition - 1]?.order ?? 0;
        stopData.order = Math.round((prevOrder + nextOrder) / 2);
      }
    }
    // Si no tiene order, calcular uno por defecto
    else if (!stopData.order) {
      stopData.order = await orderStop(tripId);
    }

    // Si no hay coordenadas pero hay dirección, intentar geocodificar
    if (!stopData.coordinates && stopData.address) {
      dlog(`Geocodificando dirección: ${stopData.address}`);
      stopData.coordinates = await getCoordinatesForAddress(stopData.address);
    }

    // Verificar que tengamos coordenadas válidas
    if (
      !stopData.coordinates ||
      typeof stopData.coordinates.latitude !== "number" ||
      typeof stopData.coordinates.longitude !== "number"
    ) {
      console.error(
        "No se pudieron obtener coordenadas válidas para la parada",
      );
      throw new Error(
        "No se pudieron obtener coordenadas válidas para la dirección proporcionada. Por favor, verifica la dirección e intenta de nuevo.",
      );
    }

    // Convertir hora simple a timestamp completo
    if (stopData.estimated_arrival) {
      stopData.estimated_arrival = await convertTimeToTimestamp(
        stopData.estimated_arrival,
        tripId,
        day, // Pasar el día de la parada para calcular la fecha correcta
      );
    }

    // Incluir trip_id para que los stops sean directamente consultables por viaje.
    // Foto y precio (Google Places) NO se buscan inline: se enriquecen en
    // background tras insertar para no bloquear la respuesta (mismo patrón que
    // createStopFast + enrichStop). Cualquier photo_url/estimated_price manual
    // que venga en stopData se inserta y enrichStop lo respeta (no lo sobreescribe).
    const payload = removeUndefinedFields({
      ...stopData,
      trip_id: tripId,
    });

    const { data: newStop, error } = await supabase
      .from(STOP_TABLE)
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error de Supabase al crear parada:", error);
      throw new Error(
        `Error al crear la parada en la base de datos: ${error.message}`,
      );
    }

    // Enriquecimiento en background: foto + precio. No bloquea la respuesta.
    enrichStop(newStop.id).catch(() => {});

    return newStop;
  } catch (error) {
    console.error("Error en createStop:", error);
    throw error;
  }
};

/**
 * Crea la parada de origen de un viaje
 * @param origin - Nombre o dirección del origen
 * @param trip - Datos del viaje
 * @param startTime - Hora de inicio opcional (formato HH:mm)
 * @returns Parada de origen creada
 */
export const createStopOrigin = async (
  origin: string,
  trip: Trip,
  startTime?: string,
) => {
  const time = startTime || (trip as any).start_time || "08:00";
  const estimatedArrival = trip.start_date
    ? `${trip.start_date}T${time}:00`
    : null;

  const stopData: any = {
    name: origin,
    address: origin,
    description: `El origen del viaje es ${origin}`,
    coordinates: await getCoordinatesForAddress(origin),
    type: "origen" as Stop["type"],
    estimated_arrival: estimatedArrival,
    order: 1,
    day: 1,
  };

  return await createStop(stopData, trip.id!);
};

/**
 * Crea la parada de destino de un viaje
 * @param destination - Nombre o dirección del destino
 * @param trip - Datos del viaje
 * @param endTime - Hora de llegada opcional (formato HH:mm)
 * @returns Parada de destino creada
 */
export const createStopDestination = async (
  destination: string,
  trip: Trip,
  endTime?: string,
) => {
  const time = endTime || (trip as any).end_time || "18:00";

  let destinationDay = 1;
  if (trip.start_date && trip.end_date) {
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalDays = Math.max(1, diffDays + 1);
    // Circular: destino en el punto de giro (mitad del viaje)
    // No circular: destino en el último día
    destinationDay = (trip as any).circular
      ? Math.ceil(totalDays / 2)
      : totalDays;
  }

  const destinationDate = trip.start_date
    ? (() => {
        const d = new Date(trip.start_date);
        d.setDate(d.getDate() + (destinationDay - 1));
        return d.toISOString().slice(0, 10);
      })()
    : trip.end_date;

  const estimatedArrival = destinationDate
    ? `${destinationDate}T${time}:00`
    : null;

  const stopData: any = {
    name: destination,
    address: destination,
    description: `El destino del viaje es ${destination}`,
    coordinates: await getCoordinatesForAddress(destination),
    type: "destino" as Stop["type"],
    estimated_arrival: estimatedArrival,
    order: 2,
    day: destinationDay,
  };

  return await createStop(stopData, trip.id!);
};

/**
 * Inserts a user-defined mandatory waypoint into the stop table.
 * Coordinates must be in { lat, lng } format (converted from frontend Coord type).
 */
export const createMandatoryStop = async (
  stopInfo: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    expectedArrivalDate: string | null;
  },
  tripId: number,
) => {
  const stopData = {
    name: stopInfo.name || stopInfo.address,
    address: stopInfo.address,
    description: `Parada obligatoria: ${stopInfo.name || stopInfo.address}`,
    coordinates: {
      latitude: stopInfo.coordinates.lat,
      longitude: stopInfo.coordinates.lng,
    },
    type: "parada" as Stop["type"],
    estimated_arrival: stopInfo.expectedArrivalDate || null,
    trip_id: tripId,
  };

  const { data, error } = await supabase
    .from(STOP_TABLE)
    .insert(stopData)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Error al crear parada obligatoria "${stopInfo.name}": ${error.message}`,
    );
  }

  return data as Stop;
};

// =============== STOP SUBTYPES SERVICES ===============

/**
 * Crea una parada de tipo Activity (actividad)
 * Primero crea la parada base y luego inserta los datos específicos de activity
 */
export const createActivityStop = async (
  stopData: Partial<Stop>,
  activityData: Partial<Activity>,
  tripId: number,
) => {
  try {
    const newStop = await createStop(stopData, tripId);

    let activityPayload: any = {
      id: newStop.id,
      ...removeUndefinedFields(activityData),
    };

    // Convertir entry_price a número si es string, redondeando si es decimal
    if (
      activityPayload.entry_price !== undefined &&
      activityPayload.entry_price !== null
    ) {
      const priceValue = parseFloat(String(activityPayload.entry_price));
      activityPayload.entry_price = isNaN(priceValue) ? null : priceValue;
    }

    // No insertar total_cost aquí, la tabla activity no tiene esa columna
    // Solo usar estimated_price que sí existe
    if (activityPayload.estimated_price) {
      dlog(
        `Total cost de actividad: ${activityPayload.estimated_price}€`,
      );
    }

    const { data: activity, error } = await supabase
      .from(ACTIVITY_TABLE)
      .insert(activityPayload)
      .select()
      .single();

    if (error) {
      console.error("Error al crear activity:", error);
      await deleteStop(newStop.id.toString());
      throw new Error(`Error al crear la actividad: ${error.message}`);
    }

    dlog("Activity creada exitosamente:", activity);

    return {
      stop: newStop,
      activity,
    };
  } catch (error) {
    console.error("Error en createActivityStop:", error);
    throw error;
  }
};

/**
 * Crea una parada de tipo Accommodation (alojamiento)
 * Primero crea la parada base y luego inserta los datos específicos de accommodation
 */
export const createAccommodationStop = async (
  stopData: Partial<Stop>,
  accommodationData: Partial<Accommodation>,
  tripId: number,
) => {
  try {
    const newStop = await createStop(stopData, tripId);

    let accommodationPayload: any = {
      id: newStop.id,
      ...removeUndefinedFields(accommodationData),
    };

    // Si existen nights y price_per_night, calcular estimated_price (precio total estimado)
    if (
      accommodationPayload.nights &&
      accommodationPayload.price_per_night &&
      accommodationPayload.estimated_price == null
    ) {
      accommodationPayload.estimated_price =
        accommodationPayload.nights * accommodationPayload.price_per_night;
      dlog(
        `Precio estimado calculado: ${accommodationPayload.nights} noches × ${accommodationPayload.price_per_night}€ = ${accommodationPayload.estimated_price}€`,
      );
    }

    const { data: accommodation, error } = await supabase
      .from(ACCOMMODATION_TABLE)
      .insert(accommodationPayload)
      .select()
      .single();

    if (error) {
      console.error(
        "Error al crear accommodation (la parada base se mantiene):",
        error,
      );
      // Mantenemos la parada base aunque falle el insert de accommodation.
      // Esto evita perder stops por errores de columna o migración pendiente.
      return { stop: newStop, accommodation: null };
    }

    dlog("Accommodation creado exitosamente:", accommodation);

    return {
      stop: newStop,
      accommodation,
    };
  } catch (error) {
    console.error("Error en createAccommodationStop:", error);
    throw error;
  }
};

// =============== FAST INSERT + BACKGROUND ENRICHMENT (Phase 2 "A mejorada") ===============

/**
 * Fast-path stop creation for AI-generated trips.
 * Caller provides position/order — skips DB-based position calculation,
 * photo search, and price lookup. Geocoding is still performed (coordinates NOT NULL).
 */
export const createStopFast = async (
  stopData: Partial<Stop> & { day?: number; position?: number },
  tripId: number,
) => {
  const day = stopData.day ?? 1;

  if (!stopData.coordinates && stopData.address) {
    stopData.coordinates = await getCoordinatesForAddress(stopData.address);
  }

  if (
    !stopData.coordinates ||
    typeof (stopData.coordinates as any).latitude !== "number" ||
    typeof (stopData.coordinates as any).longitude !== "number"
  ) {
    throw new Error(
      `No se pudieron obtener coordenadas para: ${stopData.address}`,
    );
  }

  if (stopData.estimated_arrival) {
    stopData.estimated_arrival = await convertTimeToTimestamp(
      stopData.estimated_arrival,
      tripId,
      day,
    );
  }

  const payload = removeUndefinedFields({
    ...stopData,
    trip_id: tripId,
  });

  const { data: newStop, error } = await supabase
    .from(STOP_TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al crear parada rápida: ${error.message}`);
  }

  return newStop;
};

export const createActivityStopFast = async (
  stopData: Partial<Stop> & { day?: number; position?: number },
  activityData: Partial<Activity>,
  tripId: number,
) => {
  const newStop = await createStopFast(stopData, tripId);

  const activityPayload: any = {
    id: newStop.id,
    ...removeUndefinedFields(activityData),
  };
  if (activityPayload.entry_price != null) {
    const v = parseFloat(String(activityPayload.entry_price));
    activityPayload.entry_price = isNaN(v) ? null : v;
  }

  const { data: activity, error } = await supabase
    .from(ACTIVITY_TABLE)
    .insert(activityPayload)
    .select()
    .single();

  if (error) {
    console.error("Error al crear activity (fast):", error);
    await deleteStop(newStop.id.toString());
    throw new Error(`Error al crear la actividad: ${error.message}`);
  }

  return { stop: newStop, activity };
};

export const createAccommodationStopFast = async (
  stopData: Partial<Stop> & { day?: number; position?: number },
  accommodationData: Partial<Accommodation>,
  tripId: number,
) => {
  const newStop = await createStopFast(stopData, tripId);

  const accommodationPayload: any = {
    id: newStop.id,
    ...removeUndefinedFields(accommodationData),
  };
  if (
    accommodationPayload.nights &&
    accommodationPayload.price_per_night &&
    accommodationPayload.estimated_price == null
  ) {
    accommodationPayload.estimated_price =
      accommodationPayload.nights * accommodationPayload.price_per_night;
  }

  const { data: accommodation, error } = await supabase
    .from(ACCOMMODATION_TABLE)
    .insert(accommodationPayload)
    .select()
    .single();

  if (error) {
    console.error("Error al crear accommodation (fast):", error);
    return { stop: newStop, accommodation: null };
  }

  return { stop: newStop, accommodation };
};

/**
 * Background enrichment: fetch Google Places photo + price for an existing stop, then UPDATE.
 */
export const enrichStop = async (stopId: number): Promise<void> => {
  const { data: stop, error: fetchErr } = await supabase
    .from(STOP_TABLE)
    .select("*")
    .eq("id", stopId)
    .single();
  if (fetchErr || !stop) return;

  const updates: Record<string, any> = {};

  if (!stop.photo_url && stop.name) {
    try {
      const photoUrl = await searchPlacePhotoSmart(
        stop.name,
        stop.coordinates as any,
        stop.address ?? undefined,
        100,
      );
      if (photoUrl) updates.photo_url = photoUrl;
    } catch {}
  }

  if (!stop.estimated_price && stop.name && stop.coordinates) {
    try {
      const priceInfo = await getPlacePrice(
        stop.name,
        stop.coordinates as any,
        stop.address || undefined,
      );
      if (priceInfo) {
        updates.price_level = priceInfo.price_level;
        updates.price_symbol = priceInfo.price_symbol;
        updates.estimated_price = priceInfo.estimated_price;
        updates.place_rating = priceInfo.rating;
        updates.place_reviews_count = priceInfo.reviews_count;
        updates.google_place_id = priceInfo.place_id;
      }
    } catch {}
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from(STOP_TABLE).update(updates).eq("id", stopId);
  }
};

/**
 * Crea una parada de tipo Refuel (repostaje)
 * Primero crea la parada base y luego inserta los datos específicos de refuel
 * Calcula automáticamente total_cost = liters * price_per_unit
 */
export const createRefuelStop = async (
  stopData: Partial<Stop>,
  refuelData: Partial<Refuel>,
  tripId: number,
) => {
  try {
    // 1. Crear la parada base
    const newStop = await createStop(stopData, tripId);

    // 2. Calcular total_cost si se proporcionan liters y price_per_unit
    let refuelPayload: any = {
      id: newStop.id,
      ...removeUndefinedFields(refuelData),
    };

    // Si existen liters y price_per_unit, calcular total_cost
    if (refuelPayload.liters && refuelPayload.price_per_unit) {
      refuelPayload.total_cost =
        refuelPayload.liters * refuelPayload.price_per_unit;
      dlog(
        `Total cost calculado: ${refuelPayload.liters} litros × ${refuelPayload.price_per_unit}€ = ${refuelPayload.total_cost}€`,
      );
    }

    const { data: refuel, error } = await supabase
      .from(REFUEL_TABLE)
      .insert(refuelPayload)
      .select()
      .single();

    if (error) {
      console.error("Error al crear refuel:", error);
      // Si falla la creación de refuel, eliminar la parada creada
      await deleteStop(newStop.id.toString());
      throw new Error(`Error al crear el repostaje: ${error.message}`);
    }

    dlog("Refuel creado exitosamente:", refuel);

    return {
      stop: newStop,
      refuel,
    };
  } catch (error) {
    console.error("Error en createRefuelStop:", error);
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
      .select("*")
      .eq("id", stopId)
      .maybeSingle();

    if (error) {
      console.error("Error al obtener refuel:", error);
      throw new Error(
        `Error al obtener los datos del repostaje: ${error.message}`,
      );
    }

    if (!refuel) {
      throw new Error(`No se encontró ningún repostaje con el id: ${stopId}`);
    }

    return {
      stop,
      refuel,
    };
  } catch (error) {
    console.error("Error en getRefuelStop:", error);
    throw error;
  }
};

/**
 * Actualiza una parada de tipo Activity
 * Actualiza tanto la parada base como los datos específicos de activity
 */
export const updateActivityStop = async (
  stopId: string,
  stopData: Partial<Stop>,
  activityData: Partial<Activity>,
) => {
  try {
    // 1. Actualizar la parada base si hay datos
    let updatedStop = null;
    if (stopData && Object.keys(stopData).length > 0) {
      updatedStop = await updateStop(stopId, stopData);
    }

    // 2. Actualizar el registro de activity
    let activityPayload: any = removeUndefinedFields(activityData);

    // Convertir entry_price a número si es string
    if (
      activityPayload.entry_price !== undefined &&
      activityPayload.entry_price !== null
    ) {
      const priceValue = parseFloat(String(activityPayload.entry_price));
      activityPayload.entry_price = isNaN(priceValue) ? null : priceValue;
    }

    // No actualizar total_cost aquí, la tabla activity no tiene esa columna
    // Solo usar estimated_price que sí existe
    if (activityPayload.estimated_price) {
      dlog(
        `Total cost de actividad actualizado: ${activityPayload.estimated_price}€`,
      );
    }

    const { data: activity, error } = await supabase
      .from(ACTIVITY_TABLE)
      .update(activityPayload)
      .eq("id", stopId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error al actualizar activity:", error);
      throw new Error(`Error al actualizar la actividad: ${error.message}`);
    }

    if (!activity) {
      throw new Error(`No se encontró ninguna actividad con el id: ${stopId}`);
    }

    dlog("Activity actualizada exitosamente:", activity);

    return {
      stop: updatedStop || (await getStopById(stopId)),
      activity,
    };
  } catch (error) {
    console.error("Error en updateActivityStop:", error);
    throw error;
  }
};

/**
 * Actualiza una parada de tipo Accommodation
 * Actualiza tanto la parada base como los datos específicos de accommodation
 */
export const updateAccommodationStop = async (
  stopId: string,
  stopData: Partial<Stop>,
  accommodationData: Partial<Accommodation>,
) => {
  try {
    // 1. Actualizar la parada base si hay datos
    let updatedStop = null;
    if (stopData && Object.keys(stopData).length > 0) {
      updatedStop = await updateStop(stopId, stopData);
    }

    // 2. Actualizar el registro de accommodation
    let accommodationPayload: any = removeUndefinedFields(accommodationData);

    // Si existen nights y price_per_night, calcular estimated_price (precio total estimado)
    if (
      accommodationPayload.nights &&
      accommodationPayload.price_per_night &&
      accommodationPayload.estimated_price == null
    ) {
      accommodationPayload.estimated_price =
        accommodationPayload.nights * accommodationPayload.price_per_night;
      dlog(
        `Precio estimado calculado: ${accommodationPayload.nights} noches × ${accommodationPayload.price_per_night}€ = ${accommodationPayload.estimated_price}€`,
      );
    }

    const { data: accommodation, error } = await supabase
      .from(ACCOMMODATION_TABLE)
      .update(accommodationPayload)
      .eq("id", stopId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error al actualizar accommodation:", error);
      throw new Error(`Error al actualizar el alojamiento: ${error.message}`);
    }

    if (!accommodation) {
      throw new Error(`No se encontró ningún alojamiento con el id: ${stopId}`);
    }

    dlog("Accommodation actualizado exitosamente:", accommodation);

    return {
      stop: updatedStop || (await getStopById(stopId)),
      accommodation,
    };
  } catch (error) {
    console.error("Error en updateAccommodationStop:", error);
    throw error;
  }
};

/**
 * Actualiza una parada de tipo Refuel
 * Actualiza tanto la parada base como los datos específicos de refuel
 */
export const updateRefuelStop = async (
  stopId: string,
  stopData: Partial<Stop>,
  refuelData: Partial<Refuel>,
) => {
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
      .eq("id", stopId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error al actualizar refuel:", error);
      throw new Error(`Error al actualizar el repostaje: ${error.message}`);
    }

    if (!refuel) {
      throw new Error(`No se encontró ningún repostaje con el id: ${stopId}`);
    }

    dlog("Refuel actualizado exitosamente:", refuel);

    return {
      stop: updatedStop || (await getStopById(stopId)),
      refuel,
    };
  } catch (error) {
    console.error("Error en updateRefuelStop:", error);
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
      .select("id, position")
      .eq("day", day)
      .order("position", { ascending: true });

    if (fetchError) {
      console.error(`❌ Error al obtener paradas del día ${day}:`, fetchError);
      return;
    }

    if (!stopsInDay || stopsInDay.length === 0) {
      dlog(`✅ No hay paradas en el día ${day}`);
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
      dlog(
        `🔧 Reparando ${stopsInDay.length} posiciones en día ${day}...`,
      );
      // Renumerar todas las posiciones secuencialmente
      for (let i = 0; i < stopsInDay.length; i++) {
        const newPosition = i + 1;
        await supabase
          .from(STOP_TABLE)
          .update({ position: newPosition })
          .eq("id", stopsInDay[i].id);
      }
      dlog(`✅ ${stopsInDay.length} posiciones reparadas en día ${day}`);
    }
  } catch (error) {
    console.error(`❌ Error validando posiciones en día ${day}:`, error);
  }
};

/**
 * Actualiza una parada existente con validaciones de orden y posición
 * @param id - ID de la parada a actualizar
 * @param stopData - Datos parciales a actualizar
 * @param tripId - ID del viaje (opcional, necesario para reordenar posiciones)
 * @returns Parada actualizada
 */
export const updateStop = async (
  id: string,
  stopData: Partial<Stop>,
  tripId?: number,
) => {
  // Crear una copia para incluir datos de precios si es necesario
  const stopDataWithPrice = { ...stopData } as any;

  dlog(`🔄 Actualizando stop ${id} con datos:`, {
    day: stopDataWithPrice.day,
    position: stopDataWithPrice.position,
    name: stopDataWithPrice.name,
    type: stopDataWithPrice.type,
  });

  // Obtener la parada actual PRIMERO (necesario para obtener day y type)
  const { data: currentStop } = await supabase
    .from(STOP_TABLE)
    .select("id, day, position, type, name, trip_id, estimated_arrival")
    .eq("id", id)
    .maybeSingle();

  // trip_id de la parada: fuente de verdad directa. Ya no navegamos por la
  // tabla `route` (que duplicaba el orden y obligaba a awaits anidados / N+1).
  const resolvedTripId = currentStop?.trip_id ?? tripId;

  // Carga memoizada de las paradas del viaje (versión ligera, sin embeds).
  // Las validaciones de día/posición de abajo son de solo lectura y comparten
  // este único snapshot en lugar de releer por cada bloque.
  let _tripStopsCache:
    | Awaited<ReturnType<typeof getStopsForOrdering>>
    | null = null;
  const loadTripStops = async () => {
    if (_tripStopsCache) return _tripStopsCache;
    _tripStopsCache = resolvedTripId
      ? await getStopsForOrdering(resolvedTripId)
      : [];
    return _tripStopsCache;
  };

  // ✅ VALIDAR RESTRICCIONES DE ORDEN PARA INTERMEDIAS
  if (currentStop?.type === "intermedia" && currentStop?.trip_id) {
    const validation = await validateStopOrderRestrictions(
      stopDataWithPrice,
      currentStop.trip_id,
      parseInt(id),
    );
    if (!validation.valid) {
      console.error(
        `❌ Validación de restricciones fallida: ${validation.message}`,
      );
      throw new Error(validation.message || "Restricción de orden violada");
    }
  }

  // ✨ VALIDACIÓN ESTRICTA: ORIGEN solo puede estar en día 1
  if (currentStop?.type === "origen" && stopDataWithPrice.day !== undefined) {
    if (stopDataWithPrice.day !== 1) {
      throw new Error(
        `El Origen debe estar siempre en el día 1 (intenta cambiar al día ${stopDataWithPrice.day})`,
      );
    }
  }

  // ✨ VALIDACIÓN ESTRICTA: ORIGEN no puede cambiar de posición
  if (
    currentStop?.type === "origen" &&
    stopDataWithPrice.position !== undefined
  ) {
    if (stopDataWithPrice.position !== 1) {
      throw new Error(
        `El Origen debe estar siempre en posición 1 (intenta cambiar a posición ${stopDataWithPrice.position})`,
      );
    }
  }

  // ✨ VALIDACIÓN: Destino no puede estar ANTES que intermedias
  if (currentStop?.type === "destino" && stopDataWithPrice.day !== undefined) {
    const newDay = stopDataWithPrice.day;

    if (resolvedTripId) {
      // Intermedias del viaje (consulta directa por trip_id)
      const intermediasInTrip = (await loadTripStops()).filter(
        (s) => s.type === "intermedia",
      );

      if (intermediasInTrip.length > 0) {
        const maxIntermediaDay = Math.max(
          ...intermediasInTrip.map((i) => i.day ?? 1),
        );

        if (newDay < maxIntermediaDay) {
          throw new Error(
            `El Destino no puede estar en un día anterior a las intermedias (última intermedia está en día ${maxIntermediaDay})`,
          );
        }
      }
    }
  }

  // ✨ VALIDACIÓN ESTRICTA: DESTINO no puede cambiar de posición
  if (
    currentStop?.type === "destino" &&
    stopDataWithPrice.position !== undefined
  ) {
    // El destino debe estar en la última posición, pero eso se calculará después
    // Por ahora, solo alertamos si intenta cambiar manualmente
    console.warn(
      `⚠️ El Destino cambió posición manualmente - se reordenará automáticamente`,
    );
  }

  // ✨ Si NO viene position al editar, calcular automáticamente basándose en el nuevo día
  if (stopDataWithPrice.position === undefined && resolvedTripId) {
    const targetDay = stopDataWithPrice.day || currentStop?.day || 1;

    // Todas las paradas del viaje (consulta directa por trip_id)
    const allStopsInTrip = await loadTripStops();

    {
      if (allStopsInTrip && allStopsInTrip.length > 0) {
        // Filtrar stops del día target (excluyendo la parada que se está editando)
        const stopsInDay = allStopsInTrip
          .filter((s) => (s.day ?? 1) === targetDay && String(s.id) !== id)
          .sort(
            (a, b) =>
              (a.position ?? FALLBACK_POSITION) -
              (b.position ?? FALLBACK_POSITION),
          );

        dlog(
          `📅 Stops en día ${targetDay} (excluyendo ${id}):`,
          stopsInDay
            .map((s) => `${s.id}(${s.type}:pos${s.position})`)
            .join(", "),
        );

        // Ordenar por tipo
        const origen = stopsInDay.find((s) => s.type === "origen");
        const destino = stopsInDay.find((s) => s.type === "destino");
        const intermedias = stopsInDay.filter((s) => s.type === "intermedia");

        // Ordenar intermedias por hora
        intermedias.sort((a, b) => {
          const timeA = a.estimated_arrival
            ? new Date(a.estimated_arrival).getTime()
            : Infinity;
          const timeB = b.estimated_arrival
            ? new Date(b.estimated_arrival).getTime()
            : Infinity;
          return timeA - timeB;
        });

        // Construir orden final para este día
        const orderedStops = [];
        if (origen) orderedStops.push(origen);
        orderedStops.push(...intermedias);
        if (destino) orderedStops.push(destino);

        dlog(
          `🔀 Orden final en día ${targetDay}:`,
          orderedStops.map((s) => `${s.id}(${s.type})`).join(" → "),
        );

        // Calcular posición correcta según el tipo de la parada que se está editando
        let calculatedPosition = 1;

        if (currentStop?.type === "origen") {
          calculatedPosition = 1;
          dlog(`  → Origen, posición: 1`);
        } else if (currentStop?.type === "destino") {
          calculatedPosition = orderedStops.length + 1;
          dlog(`  → Destino, posición: ${calculatedPosition}`);
        } else if (currentStop?.type === "intermedia") {
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
          dlog(`  → Intermedia, posición: ${calculatedPosition}`);
        }

        dlog(
          `📍 Posición calculada final para stop ${id}: ${calculatedPosition}`,
        );
        stopDataWithPrice.position = calculatedPosition;
      }
    }
  }

  // ✨ VALIDACIÓN: Origen no puede estar DESPUÉS del Destino (validación adicional)
  if (
    (currentStop?.type === "origen" || currentStop?.type === "destino") &&
    stopDataWithPrice.day !== undefined
  ) {
    const newDay = stopDataWithPrice.day;

    if (resolvedTripId) {
      // La parada opuesta (origen<->destino) se obtiene del snapshot por type,
      // sin recorrer rutas ni hacer una query por cada una.
      const tripStops = await loadTripStops();
      const oppositeType =
        currentStop.type === "origen" ? "destino" : "origen";
      const oppositeStop = tripStops.find((s) => s.type === oppositeType);

      if (oppositeStop && oppositeStop.day != null) {
        if (currentStop.type === "origen" && newDay > oppositeStop.day) {
          throw new Error(
            `El Origen no puede estar en un día posterior al Destino (Destino está en día ${oppositeStop.day})`,
          );
        }
        if (currentStop.type === "destino" && newDay < oppositeStop.day) {
          throw new Error(
            `El Destino no puede estar en un día anterior al Origen (Origen está en día ${oppositeStop.day})`,
          );
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

      // trip_id resuelto desde la parada (o el param del controller)
      if (!resolvedTripId) {
        console.warn(`⚠️ No se pudo obtener trip_id para stop ${id}`);
      } else {
        dlog(
          `🔄 Reordenando: stop ${id} → posición ${newPosition} en día ${dayToUpdate} (viaje ${resolvedTripId})`,
        );

        // Todas las paradas del viaje (consulta directa por trip_id, snapshot)
        const allStopsInTrip: any[] = await loadTripStops();

        dlog(
          `📋 Total de paradas VÁLIDAS del viaje ${resolvedTripId}: ${allStopsInTrip.length}`,
        );

        // Obtener solo las paradas del día actual Y del viaje actual, ordenadas por posición actual
        const allStopsForValidation = allStopsInTrip
          .filter((s: any) => s.day === dayToUpdate)
          .sort(
            (a: any, b: any) =>
              (a.position ?? FALLBACK_POSITION) -
              (b.position ?? FALLBACK_POSITION),
          );

        dlog(
          `📋 Paradas VÁLIDAS en día ${dayToUpdate}: ${allStopsForValidation.length}`,
          allStopsForValidation
            .map((s: any) => `${s.id}(${s.type}:${s.position})`)
            .join(", "),
        );

        // ⚠️ VALIDACIÓN PREVIA: Si es intermedia, BLOQUEAR ANTES de hacer cualquier cambio
        if (
          currentStop?.type === "intermedia" &&
          allStopsInTrip &&
          allStopsInTrip.length > 0
        ) {
          dlog(
            `✓ PRE-VALIDACIÓN intermedia: stop ${id}, nueva posición ${newPosition}, nuevo día ${dayToUpdate}`,
          );

          // Obtener el VERDADERO destino del viaje (buscar por type, no por routes)
          const destino = allStopsInTrip.find((s: any) => s.type === "destino");
          dlog(`🔍 Destino del viaje ${tripId}:`, destino);

          if (destino) {
            // Validación 1: Día posterior al destino
            if (dayToUpdate > (destino.day ?? 1)) {
              console.error(
                `❌ Validación fallida: Intermedia en día ${dayToUpdate} > Destino en día ${destino.day}`,
              );
              throw new Error(
                `Una parada intermedia no puede estar en un día posterior al destino (Destino está en día ${destino.day})`,
              );
            }

            // Validación 2: En MISMO día, no puede estar DESPUÉS del destino
            if (dayToUpdate === (destino.day ?? 1)) {
              // Usar el array ya sorteado para buscar la posición correcta del destino
              const destinoPosition =
                allStopsForValidation.findIndex(
                  (s: any) => String(s.id) === String(destino.id),
                ) + 1;
              dlog(
                `🎯 Destino en posición ${destinoPosition} del día ${dayToUpdate}`,
              );
              dlog(`🔀 Intermedia solicita posición ${newPosition}`);

              if (newPosition > destinoPosition) {
                console.error(
                  `❌ Validación fallida: Intermedia posición ${newPosition} > Destino posición ${destinoPosition}`,
                );
                throw new Error(
                  `Una parada intermedia no puede estar después del destino en el mismo día (Destino está en posición ${destinoPosition})`,
                );
              }
            }
          } else {
            console.warn(`⚠️ No se encontró un destino en el viaje ${tripId}`);
          }
        }

        // Usar la data ya obtenida para reordenar
        let stopsData = allStopsForValidation;
        if (!stopsData || stopsData.length === 0) {
          dlog(`ℹ️ No hay paradas en el día ${dayToUpdate}`);
        }

        if (stopsData && stopsData.length > 0) {
          // Crear nueva lista: remover el stop siendo editado, insertar en nueva posición
          const otherIds: string[] = stopsData
            .filter((s: any) => String(s.id) !== String(id))
            .map((s: any) => String(s.id));

          dlog(`📋 Stop ID siendo editado: ${id}`);
          dlog(
            `📋 Otros stops antes de insertar (${otherIds.length}): ${otherIds.join(" → ")}`,
          );

          // VALIDAR RANGO: newPosition debe estar entre 1 y otherIds.length + 1
          const maxPosition = otherIds.length + 1;
          if (newPosition < 1 || newPosition > maxPosition) {
            console.error(
              `❌ Posición ${newPosition} inválida. Rango válido: 1-${maxPosition}`,
            );
            throw new Error(`La posición debe estar entre 1 y ${maxPosition}`);
          }

          // Insertar el stop siendo editado en la nueva posición
          otherIds.splice(newPosition - 1, 0, String(id));

          dlog(
            `📋 Orden final después de insertar stop ${id} (${otherIds.length}): ${otherIds.join(" → ")}`,
          );

          // Renumerar TODAS las paradas secuencialmente
          dlog(
            `🔄 INICIANDO RENUMERACIÓN de ${otherIds.length} paradas`,
          );
          const updatePromises = [];
          for (let i = 0; i < otherIds.length; i++) {
            const correctPos = i + 1;
            const stopId = otherIds[i];
            dlog(`   ↳ Parada ${stopId}: posición ${correctPos}`);
            updatePromises.push(
              supabase
                .from(STOP_TABLE)
                .update({ position: correctPos })
                .eq("id", stopId)
                .then(({ error }) => {
                  if (error) {
                    console.error(
                      `❌ Error actualizando parada ${stopId}:`,
                      error,
                    );
                    throw error;
                  }
                  dlog(
                    `✅ Parada ${stopId} actualizada a posición ${correctPos}`,
                  );
                }),
            );
          }

          // Esperar a que todos los updates terminen
          await Promise.all(updatePromises);

          dlog(
            `✅ Renumeración completada para ${otherIds.length} paradas`,
          );

          // NO actualizar position en stopDataWithPrice - ya fue manejado
          delete (stopDataWithPrice as any).position;
        }
      }
    } catch (error) {
      console.error("❌ Error al reordenar paradas:", error);
      // IMPORTANTE: Relanzar errores de validación (origen/destino/intermedia)
      if (error instanceof Error) {
        if (
          error.message.includes("intermedia") ||
          error.message.includes("Origen") ||
          error.message.includes("Destino")
        ) {
          throw error; // Relanzar para que llegue al controller
        }
      }
    }
  }

  const { data, error } = await supabase
    .from(STOP_TABLE)
    .update(stopDataWithPrice)
    .eq("id", id)
    .select()
    .maybeSingle();

  dlog(`✅ Stop actualizada. Datos enviados a BD:`, {
    day: stopDataWithPrice.day,
    position: stopDataWithPrice.position,
    name: stopDataWithPrice.name,
    type: stopDataWithPrice.type,
  });
  dlog(`📊 Respuesta de BD - Stop actualizado:`, {
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
  const dayChanged =
    stopDataWithPrice.day !== undefined &&
    stopDataWithPrice.day !== (currentStop?.day ?? 1);
  const timeChanged =
    stopDataWithPrice.estimated_arrival !== undefined &&
    stopDataWithPrice.estimated_arrival !== currentStop?.estimated_arrival;

  if (tripId && (dayChanged || timeChanged)) {
    dlog(
      `📝 Día o hora cambió → Reorganizando posiciones (no-bloqueante)`,
    );
    reorganizePositions(tripId).catch((error) =>
      console.error(
        `⚠️ Error reorganizando posiciones en update (no-bloqueante):`,
        error,
      ),
    );
  }

  return data;
};

/**
 * Elimina una parada del itinerario.
 * Tras borrar, reordena las posiciones del viaje y recalcula las distancias
 * de segmento (stop.distance_to_next_meters) y el total del viaje.
 * @param id - ID de la parada a eliminar
 * @returns ID de la parada eliminada
 */
export const deleteStop = async (id: string) => {
  // Verificar que la parada existe y obtener su trip_id (fuente de verdad)
  const { data: existingStop } = await supabase
    .from(STOP_TABLE)
    .select("id, trip_id")
    .eq("id", id)
    .maybeSingle();

  if (!existingStop) {
    throw new Error(`No se encontró ninguna parada con el id: ${id}`);
  }

  const tripId = existingStop.trip_id;

  const { error } = await supabase.from(STOP_TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(`Error al eliminar la parada: ${error.message}`);
  }

  // Reordenar posiciones y recalcular segmentos/distancia total (no-bloqueante).
  // Esto asegura que origen → intermedias → destino siga siendo válido.
  if (tripId) {
    reorganizePositions(tripId)
      .then(() => recalculateTripSegments(tripId))
      .catch((error) =>
        console.error(
          `⚠️ Error reorganizando posiciones/segmentos en delete (no-bloqueante):`,
          error,
        ),
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
const convertTimeToTimestamp = async (
  timeString: string,
  tripId: number,
  day?: number,
): Promise<string> => {
  try {
    // Si ya es un timestamp completo (contiene fecha), retornarlo
    if (timeString.includes("T") || timeString.includes("-")) {
      return timeString;
    }

    // Si es solo hora (formato HH:mm o H:mm)
    const timeRegex = /^(\d{1,2}):(\d{2})$/;
    const match = timeString.match(timeRegex);

    if (!match) {
      console.warn(
        `Formato de hora no válido: ${timeString}, usando fecha actual`,
      );
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
    dlog(
      `Hora convertida: ${timeString} (Día ${day || 1}) -> ${timestamp}`,
    );

    return timestamp;
  } catch (error) {
    console.error("Error convirtiendo hora a timestamp:", error);
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
const removeUndefinedFields = <T extends Record<string, any>>(
  obj: T,
): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined),
  ) as Partial<T>;
};

/**
 * Geocodifica una dirección para obtener sus coordenadas geográficas
 * @param address - Dirección a geocodificar
 * @returns Objeto con latitud y longitud
 */
export const getCoordinatesForAddress = async (
  address: string,
): Promise<{ latitude: number; longitude: number }> => {
  dlog(`Intentando geocodificar dirección: "${address}"`);

  // Generar variantes progresivamente menos específicas eliminando el primer segmento
  // (el más específico: nombre de calle, número, etc.). Ejemplo:
  //  "Port de la Conférence, Pont de l'Alma, 75008 París, Francia"
  //  → "Pont de l'Alma, 75008 París, Francia"
  //  → "75008 París, Francia"
  //  → "París, Francia"
  //  → "Francia"
  const segments = address
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const variants =
    segments.length > 0
      ? segments.map((_, i) => segments.slice(i).join(", "))
      : [address];

  for (let i = 0; i < variants.length; i++) {
    const tryAddress = variants[i];
    try {
      const geocodingResult = await geocoder.geocode(tryAddress);
      if (geocodingResult?.length > 0) {
        const { latitude, longitude } = geocodingResult[0];
        if (
          typeof latitude === "number" &&
          typeof longitude === "number" &&
          latitude !== 0 &&
          longitude !== 0
        ) {
          if (i > 0) {
            console.warn(
              `⚠️  Geocoding fallback: "${address}" → "${tryAddress}" (lat=${latitude}, lon=${longitude})`,
            );
          } else {
            dlog(
              `Coordenadas obtenidas: lat=${latitude}, lon=${longitude}`,
            );
          }
          return { latitude, longitude };
        }
      }
    } catch (e) {
      // Continuar al siguiente fallback
    }
  }

  console.error(
    `No se encontraron coordenadas válidas para la dirección: "${address}"`,
  );
  throw new Error(
    `No se pudo geocodificar la dirección: "${address}". Por favor, verifica que la dirección sea correcta.`,
  );
};

/**
 * Calcula el siguiente número de orden para una nueva parada en el viaje
 * @param tripId - ID del viaje
 * @returns Número de orden siguiente
 */
export const orderStop = async (tripId: number) => {
  const stops = await getAllStopsInATrip(tripId);
  if (!stops || stops.length === 0) return 1;

  const lastStop = stops[stops.length - 1];
  const lastOrder =
    typeof lastStop.order === "number"
      ? lastStop.order
      : Number(lastStop.order) || 0;

  return lastOrder + 1;
};

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

    dlog(`🔄 Reorganizando posiciones por DÍA para viaje ${tripId}...`);

    // Agrupar stops por day
    const stopsByDay: { [day: number]: any[] } = {};

    stops.forEach((stop) => {
      const day = (stop as any).day ?? 1;
      if (!stopsByDay[day]) {
        stopsByDay[day] = [];
      }
      stopsByDay[day].push(stop);
    });

    dlog(`📅 Días encontrados:`, Object.keys(stopsByDay).join(", "));

    // Para cada día, reorganizar posiciones
    const updatePromises: PromiseLike<any>[] = [];

    Object.keys(stopsByDay).forEach((dayStr) => {
      const day = parseInt(dayStr);
      const stopsInDay = stopsByDay[day];

      // Separar por tipo en este día
      const origen = stopsInDay.find((s) => s.type === "origen");
      const destino = stopsInDay.find((s) => s.type === "destino");
      const intermedias = stopsInDay.filter((s) => s.type === "intermedia");

      // Ordenar intermedias por hora (estimated_arrival)
      intermedias.sort((a, b) => {
        const timeA = a.estimated_arrival
          ? new Date(a.estimated_arrival).getTime()
          : Infinity;
        const timeB = b.estimated_arrival
          ? new Date(b.estimated_arrival).getTime()
          : Infinity;
        return timeA - timeB;
      });

      // Construir orden para este día: origen (pos1) + intermedias (pos2..n) + destino (pos n+1)
      const orderedInDay = [];
      if (origen) orderedInDay.push(origen);
      orderedInDay.push(...intermedias);
      if (destino) orderedInDay.push(destino);

      dlog(
        `📌 Día ${day}: ${orderedInDay.map((s) => `${s.name}(${s.type})`).join(" → ")}`,
      );

      // Actualizar posiciones para este día
      orderedInDay.forEach((stop, index) => {
        const newPosition = index + 1;
        dlog(
          `  ✏️ ${stop.name} (${stop.type}) → posición ${newPosition}`,
        );

        updatePromises.push(
          supabase
            .from(STOP_TABLE)
            .update({ position: newPosition })
            .eq("id", stop.id)
            .then(({ error }) => {
              if (error)
                console.error(
                  `Error actualizando posición de ${stop.id}:`,
                  error,
                );
            }),
        );
      });
    });

    // Ejecutar todos los updates en paralelo
    await Promise.all(updatePromises);

    dlog(
      `✅ Posiciones reorganizadas en viaje ${tripId}: ${updatePromises.length} updates completados`,
    );
  } catch (error) {
    console.error(
      `❌ Error reorganizando posiciones en viaje ${tripId}:`,
      error,
    );
  }
};

/**
 * Reordena las paradas de un viaje tras la eliminación de una parada
 * @param tripId - ID del viaje
 * @param deletedStopOrder - Orden de la parada eliminada (opcional)
 * @returns void
 */
export const orderStopsInTrip = async (
  tripId: number,
  deletedStopOrder?: number,
) => {
  const stops = await getAllStopsInATrip(tripId);
  if (!stops || stops.length === 0) return;

  // Ordenar las paradas por su orden actual
  stops.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Si se proporciona el orden de la parada borrada, solo actualizar las posteriores
  const stopsToUpdate = deletedStopOrder
    ? stops.filter((stop) => (stop.order ?? 0) > deletedStopOrder)
    : stops;

  // Actualizar el orden de las paradas en la base de datos
  // ⚠️ NO CAMBIAR EL TIPO - el tipo debe ser independiente del orden
  await Promise.all(
    stopsToUpdate.map((stop) => {
      // Calcular el nuevo orden: si hay parada borrada, decrementar en 1
      const newOrder =
        deletedStopOrder && (stop.order ?? 0) > deletedStopOrder
          ? (stop.order ?? 0) - 1
          : (stop.order ?? 0);

      // Solo actualizar el orden, mantener el tipo existente
      return updateStop(stop.id, {
        order: newOrder,
      });
    }),
  );
};

// =============== COMBINED SERVICES ===============

/**
 * Obtiene el itinerario completo de un viaje.
 *
 * La tabla `route` se eliminó: el orden vive en stop(day, position) y los
 * "segmentos" (parada → siguiente) se derivan en memoria a partir de las
 * paradas ya ordenadas. La forma de respuesta `{ trip, routesWithStops }` se
 * mantiene para compatibilidad: cada elemento de routesWithStops representa un
 * tramo entre dos paradas consecutivas, con `distance` (metros) y `stops`.
 * Las paradas incluyen sus subtipos (activity/accommodation/refuel).
 *
 * @param tripId - ID del viaje
 * @returns Objeto con los datos del viaje y sus tramos con paradas
 */
export const getTripItinerary = async (tripId: number) => {
  const [trip, stops] = await Promise.all([
    TripService.getById(tripId),
    getAllStopsInATrip(tripId),
  ]);

  const ordered = orderStopsByDayAndPosition(stops);

  // Derivar tramos entre paradas consecutivas (antes filas de la tabla route)
  const routesWithStops = ordered.slice(0, -1).map((stop: any, i: number) => {
    const next = ordered[i + 1];
    return {
      trip_id: tripId,
      origin_id: stop.id,
      destination_id: next.id,
      distance: stop.distance_to_next_meters ?? null,
      stops: [stop, next],
    };
  });

  return {
    trip,
    routesWithStops,
  };
};

/** Columnas de stop + embed 1:1 de sus subtipos (activity/accommodation/refuel). */
const STOP_SELECT_WITH_SUBTYPES = "*, activity(*), accommodation(*), refuel(*)";

/**
 * Versión ligera de las paradas de un viaje para cálculos de orden/posición.
 * Trae solo las columnas necesarias y SIN embeds de subtipos — los flujos de
 * creación/edición no necesitan activity/accommodation/refuel para ordenar.
 */
const getStopsForOrdering = async (
  tripId: number,
): Promise<
  Array<{
    id: number;
    type: string | null;
    day: number | null;
    position: number | null;
    order: number | null;
    estimated_arrival: string | null;
  }>
> => {
  const { data } = await supabase
    .from(STOP_TABLE)
    .select("id, type, day, position, order, estimated_arrival")
    .eq("trip_id", tripId);
  return (data as any) || [];
};

/** Convierte coordenadas {latitude,longitude} (formato en BD) a {lat,lng}. */
const toLatLng = (c: any): { lat: number; lng: number } => ({
  lat: c?.latitude ?? c?.lat ?? 0,
  lng: c?.longitude ?? c?.lng ?? 0,
});

/** Ordena paradas por (day, position), con fallback a order. */
const orderStopsByDayAndPosition = <
  T extends {
    day?: number | null;
    position?: number | null;
    order?: number | null;
  },
>(
  stops: T[],
): T[] =>
  [...stops].sort((a, b) => {
    if ((a.day || 1) !== (b.day || 1)) return (a.day || 1) - (b.day || 1);
    return (a.position ?? a.order ?? 0) - (b.position ?? b.order ?? 0);
  });

// Obtener todas las paradas de un viaje directamente por trip_id
/**
 * Obtiene todas las paradas de un viaje ordenadas por día y posición,
 * incluyendo los datos de sus subtipos (activity/accommodation/refuel)
 * en una sola query mediante embed.
 * @param tripId - ID del viaje
 * @returns Lista de paradas del viaje
 */
export const getAllStopsInATrip = async (tripId: number) => {
  const { data: stops, error } = await supabase
    .from(STOP_TABLE)
    .select(STOP_SELECT_WITH_SUBTYPES)
    .eq("trip_id", tripId)
    .order("day", { ascending: true })
    .order("position", { ascending: true });

  if (error) console.error("Error obteniendo paradas del viaje:", error);
  return stops || [];
};

/**
 * Recalcula la distancia de cada segmento (parada → siguiente) y la persiste en
 * stop.distance_to_next_meters, además del total en trip.total_distance_meters.
 *
 * Sustituye al antiguo rebuildRoutesForTrip (que borraba y recreaba filas en la
 * tabla `route` en cada cambio). Ahora no hay tabla intermedia: el orden vive en
 * stop(day, position) y la distancia es un atributo de la propia parada.
 * Debe llamarse tras crear/reordenar/eliminar paradas en lote.
 */
export const recalculateTripSegments = async (tripId: number) => {
  const stops = await getAllStopsInATrip(tripId);
  if (!stops || stops.length === 0) return;

  const ordered = orderStopsByDayAndPosition(stops as any[]);

  let totalMeters = 0;
  await Promise.all(
    ordered.map((stop: any, i: number) => {
      const next = ordered[i + 1];
      const meters = next
        ? Math.round(
            geolocation.haversineKm(
              toLatLng(stop.coordinates),
              toLatLng(next.coordinates),
            ) * 1000,
          )
        : null;
      if (meters != null) totalMeters += meters;
      return supabase
        .from(STOP_TABLE)
        .update({ distance_to_next_meters: meters })
        .eq("id", stop.id);
    }),
  );

  await supabase
    .from("trip")
    .update({ total_distance_meters: totalMeters })
    .eq("id", tripId);
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
        trips_count: 0,
      };
    }

    const tripIds = trips.map((trip) => trip.id);

    // 2. Batch: obtener todas las paradas de todos los viajes en una sola query
    const { data: allStops, error: stopsError } = await supabase
      .from(STOP_TABLE)
      .select("id")
      .in("trip_id", tripIds);

    if (stopsError) {
      console.error("Error al obtener paradas del usuario:", stopsError);
      throw new Error(`Error al obtener paradas: ${stopsError.message}`);
    }

    if (!allStops || allStops.length === 0) {
      return {
        user_id: userId,
        total_cost: 0,
        refuel_count: 0,
        trips_count: trips.length,
      };
    }

    const stopIds = allStops.map((stop) => stop.id);

    // 3. Batch: obtener todos los repostajes de esas paradas en una sola query
    const { data: refuels, error: refuelsError } = await supabase
      .from(REFUEL_TABLE)
      .select("total_cost")
      .in("id", stopIds);

    if (refuelsError) {
      console.error("Error al obtener repostajes del usuario:", refuelsError);
      throw new Error(`Error al obtener repostajes: ${refuelsError.message}`);
    }

    let totalCost = 0;
    let refuelCount = 0;

    (refuels || []).forEach((refuel) => {
      if (refuel.total_cost) {
        totalCost += refuel.total_cost;
        refuelCount += 1;
      }
    });

    return {
      user_id: userId,
      total_cost: totalCost,
      refuel_count: refuelCount,
      trips_count: trips.length,
    };
  } catch (error) {
    console.error("Error en getTotalRefuelCostByUser:", error);
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
    // Paradas del viaje (directamente por trip_id)
    const { data: stops, error: stopsError } = await supabase
      .from(STOP_TABLE)
      .select("id")
      .eq("trip_id", tripId);

    if (stopsError) {
      throw new Error(`Error al obtener paradas del viaje: ${stopsError.message}`);
    }

    const stopIdsArray = (stops || []).map((s) => s.id);
    if (stopIdsArray.length === 0) {
      return {
        trip_id: tripId,
        total_cost: 0,
        refuel_count: 0,
      };
    }

    const { data: refuels, error } = await supabase
      .from(REFUEL_TABLE)
      .select("id, total_cost, liters, price_per_unit")
      .in("id", stopIdsArray);

    if (error) {
      console.error(`Error al obtener repostajes del viaje ${tripId}:`, error);
      throw new Error(
        `Error al obtener repostajes del viaje: ${error.message}`,
      );
    }

    let totalCost = 0;
    if (refuels && refuels.length > 0) {
      for (const refuel of refuels) {
        // Calcular total_cost si no existe
        let cost = refuel.total_cost;
        if (!cost && refuel.liters && refuel.price_per_unit) {
          cost = refuel.liters * refuel.price_per_unit;
        }
        totalCost += cost || 0;
      }
    }

    return {
      trip_id: tripId,
      total_cost: totalCost,
      refuel_count: refuels?.length || 0,
    };
  } catch (error) {
    console.error("Error en getTotalRefuelCostByTrip:", error);
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
    dlog(
      `[getTotalAccommodationCostByTrip] Iniciando para tripId: ${tripId}`,
    );

    // Paradas del viaje (directamente por trip_id)
    const { data: stops, error: stopsError } = await supabase
      .from(STOP_TABLE)
      .select("id")
      .eq("trip_id", tripId);

    if (stopsError) {
      throw new Error(
        `Error al obtener paradas del viaje: ${stopsError.message}`,
      );
    }

    const stopIdsArray = (stops || []).map((s) => s.id);
    dlog(
      `[getTotalAccommodationCostByTrip] Total de paradas a buscar: ${stopIdsArray.length}`,
    );

    if (stopIdsArray.length === 0) {
      return {
        trip_id: tripId,
        total_cost: 0,
        accommodation_count: 0,
      };
    }

    const { data: accommodations, error } = await supabase
      .from(ACCOMMODATION_TABLE)
      .select("id, nights, price_per_night")
      .in("id", stopIdsArray);

    dlog(
      `[getTotalAccommodationCostByTrip] Alojamientos encontrados: ${accommodations?.length || 0}`,
      accommodations,
    );

    if (error) {
      console.error(
        `[getTotalAccommodationCostByTrip] Error al obtener alojamientos del viaje ${tripId}:`,
        error,
      );
      throw new Error(
        `Error al obtener alojamientos del viaje: ${error.message}`,
      );
    }

    let totalCost = 0;
    if (accommodations && accommodations.length > 0) {
      for (const accommodation of accommodations) {
        const pricePerNight = (accommodation as any).price_per_night;
        if (accommodation.nights && pricePerNight) {
          const cost = accommodation.nights * pricePerNight;
          dlog(
            `[getTotalAccommodationCostByTrip] Calculado: ${accommodation.nights} noches × ${pricePerNight}€ = ${cost}€`,
          );
          totalCost += cost;
        }
      }
    }

    dlog(
      `[getTotalAccommodationCostByTrip] Total cost calculado: ${totalCost}€`,
    );

    return {
      trip_id: tripId,
      total_cost: totalCost,
      accommodation_count: accommodations?.length || 0,
    };
  } catch (error) {
    console.error("Error en getTotalAccommodationCostByTrip:", error);
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
    dlog(`[getTotalActivityCostByTrip] Iniciando para tripId: ${tripId}`);

    // Paradas del viaje (directamente por trip_id)
    const { data: stops, error: stopsError } = await supabase
      .from(STOP_TABLE)
      .select("id")
      .eq("trip_id", tripId);

    if (stopsError) {
      throw new Error(
        `Error al obtener paradas del viaje: ${stopsError.message}`,
      );
    }

    const stopIdsArray = (stops || []).map((s) => s.id);
    dlog(
      `[getTotalActivityCostByTrip] Total de paradas a buscar: ${stopIdsArray.length}`,
    );

    if (stopIdsArray.length === 0) {
      return {
        trip_id: tripId,
        total_cost: 0,
        activity_count: 0,
      };
    }

    const { data: activities, error } = await supabase
      .from(ACTIVITY_TABLE)
      .select("id, entry_price")
      .in("id", stopIdsArray);

    dlog(
      `[getTotalActivityCostByTrip] Actividades encontradas: ${activities?.length || 0}`,
      activities,
    );

    if (error) {
      console.error(
        `[getTotalActivityCostByTrip] Error al obtener actividades del viaje ${tripId}:`,
        error,
      );
      throw new Error(
        `Error al obtener actividades del viaje: ${error.message}`,
      );
    }

    let totalCost = 0;
    if (activities && activities.length > 0) {
      for (const activity of activities) {
        totalCost += (activity as any).entry_price || 0;
      }
    }

    dlog(
      `[getTotalActivityCostByTrip] Total cost calculado: ${totalCost}€`,
    );

    return {
      trip_id: tripId,
      total_cost: totalCost,
      activity_count: activities?.length || 0,
    };
  } catch (error) {
    console.error("Error en getTotalActivityCostByTrip:", error);
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
  file: {
    filepath: string;
    originalFilename: string;
    mimetype: string;
    size: number;
  },
  userToken?: string, // Agregar token del usuario
) => {
  dlog("🔍 uploadReservationAttachment iniciado:", {
    stopId,
    userId,
    fileName: file.originalFilename,
  });

  // 1. Verificar que el usuario tiene acceso a esta parada
  const { data: routes, error: routeError } = await supabase
    .from("route")
    .select("trip_id")
    .or(`origin_id.eq.${stopId},destination_id.eq.${stopId}`)
    .limit(1)
    .maybeSingle();

  dlog("📍 Búsqueda de ruta:", { routes, routeError });

  if (routeError || !routes) {
    console.error("❌ Parada no encontrada en ninguna ruta");
    throw new Error("Parada no encontrada");
  }

  const { data: traveler, error: travelerError } = await supabase
    .from("travelers")
    .select("*")
    .eq("trip_id", routes.trip_id)
    .eq("user_id", userId)
    .maybeSingle();

  dlog("👤 Búsqueda de viajero:", {
    traveler,
    travelerError,
    tripId: routes.trip_id,
  });

  if (!traveler) {
    console.error("❌ Usuario no es viajero del viaje");
    throw new Error("No tienes permiso para subir archivos a esta parada");
  }

  // 2. Validar tipo de archivo
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
  ];

  if (!allowedTypes.includes(file.mimetype || "")) {
    throw new Error(
      "Tipo de archivo no permitido. Solo se aceptan PDF e imágenes",
    );
  }

  // 3. Generar nombre único para el archivo
  const fileExt = file.originalFilename?.split(".").pop() || "bin";
  const fileName = `${stopId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

  dlog("📁 Generando nombre de archivo:", { fileName, fileExt });

  // 4. Leer archivo
  const fs = await import("fs");
  const fileBuffer = fs.readFileSync(file.filepath);

  dlog("📄 Archivo leído:", {
    size: fileBuffer.length,
    originalSize: file.size,
  });

  // 5. Crear cliente de Supabase con el token del usuario para Storage
  const { createClient } = await import("@supabase/supabase-js");
  const userSupabase = userToken
    ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        global: {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      })
    : supabase; // Fallback al cliente normal si no hay token

  dlog("🔑 Cliente de Supabase:", { usingUserToken: !!userToken });

  // 6. Subir a Supabase Storage con el cliente del usuario
  dlog("⬆️ Iniciando subida a Storage:", {
    fileName,
    bucket: "reservation-attachments",
  });

  const { data: uploadData, error: uploadError } = await userSupabase.storage
    .from("reservation-attachments")
    .upload(fileName, fileBuffer, {
      contentType: file.mimetype || "application/octet-stream",
      upsert: false,
    });

  dlog("☁️ Resultado de subida a Storage:", {
    uploadData,
    uploadError,
    path: uploadData?.path,
    id: uploadData?.id,
  });

  if (uploadError) {
    console.error("❌ Error al subir archivo a Storage:", uploadError);
    throw new Error(`Error al subir archivo: ${uploadError.message}`);
  }

  if (!uploadData?.path) {
    console.error("❌ Upload exitoso pero sin path!");
    throw new Error("Error: archivo subido sin path");
  }

  // Verificar que el archivo realmente exista
  dlog("🔍 Verificando que el archivo existe en Storage...");
  const { data: checkData, error: checkError } = await userSupabase.storage
    .from("reservation-attachments")
    .list(uploadData.path.split("/")[0], {
      search: uploadData.path.split("/")[1],
    });

  dlog("🔍 Verificación de existencia:", {
    found: checkData?.length || 0,
    checkError,
    searchPath: uploadData.path,
  });

  // 7. Crear registro en la base de datos
  const insertData = {
    stop_id: parseInt(stopId),
    file_path: uploadData.path,
    file_name: file.originalFilename || "archivo",
    file_type: file.mimetype || "application/octet-stream",
    file_size: file.size,
    uploaded_by: userId,
  };

  dlog("💾 Insertando en reservation_attachments:", insertData);

  const { data: attachment, error: dbError } = await supabase
    .from("reservation_attachments")
    .insert(insertData)
    .select()
    .single();

  dlog("💾 Resultado de inserción en DB:", { attachment, dbError });

  if (dbError) {
    // Limpiar archivo subido si falla el registro en DB
    await supabase.storage.from("reservation-attachments").remove([fileName]);

    throw new Error(`Error al guardar registro: ${dbError.message}`);
  }

  // 7. Generar URL firmada (válida por 1 hora)
  const { data: urlData } = await supabase.storage
    .from("reservation-attachments")
    .createSignedUrl(uploadData.path, 3600);

  return {
    id: attachment.id,
    path: uploadData.path,
    url: urlData?.signedUrl || "",
  };
};

/**
 * Obtener adjuntos de una parada
 */
export const getStopAttachments = async (
  stopId: string,
  userId: string,
  userToken?: string,
) => {
  // Verificar acceso
  const { data: routes, error: routeError } = await supabase
    .from("route")
    .select("trip_id")
    .or(`origin_id.eq.${stopId},destination_id.eq.${stopId}`)
    .limit(1)
    .maybeSingle();

  if (routeError) {
    console.error("Error checking route:", routeError);
    throw new Error("Error al verificar permisos");
  }

  if (!routes) {
    // Si no hay ruta, la parada no existe o no está en ningún viaje
    // Devolver array vacío en lugar de error
    return [];
  }

  const { data: traveler } = await supabase
    .from("travelers")
    .select("*")
    .eq("trip_id", routes.trip_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!traveler) {
    throw new Error("No tienes permiso para ver estos adjuntos");
  }

  // Obtener adjuntos
  const { data: attachments, error } = await supabase
    .from("reservation_attachments")
    .select("*")
    .eq("stop_id", stopId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error al obtener adjuntos: ${error.message}`);
  }

  // Si no hay adjuntos, devolver array vacío
  if (!attachments || attachments.length === 0) {
    return [];
  }

  // Generar URLs firmadas para cada adjunto
  dlog(
    "🔗 Iniciando generación de URLs firmadas para",
    attachments.length,
    "adjuntos",
  );

  // Crear cliente con token del usuario para Storage (igual que en upload)
  const { createClient } = await import("@supabase/supabase-js");
  const userSupabase = userToken
    ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        global: {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      })
    : supabase;

  dlog("🔑 Usando cliente:", { conTokenUsuario: !!userToken });

  const attachmentsWithUrls = await Promise.all(
    (attachments || []).map(async (attachment) => {
      dlog(
        "🔗 Generando URL para:",
        attachment.file_name,
        "Path:",
        attachment.file_path,
      );

      // Usar el cliente con token de usuario para generar URL firmada
      const { data: urlData, error: urlError } = await userSupabase.storage
        .from("reservation-attachments")
        .createSignedUrl(attachment.file_path, 3600);

      if (urlError) {
        console.error("❌ Error generando URL:", urlError.message);
      } else if (urlData?.signedUrl) {
        dlog("✅ URL generada exitosamente para", attachment.file_name);
      } else {
        console.error("⚠️ URL es null para", attachment.file_name);
      }

      return {
        ...attachment,
        url: urlData?.signedUrl || null,
      };
    }),
  );

  dlog(
    "📦 Retornando",
    attachmentsWithUrls.length,
    "attachments -",
    attachmentsWithUrls.filter((a) => a.url !== null).length,
    "con URL válida",
  );

  return attachmentsWithUrls;
};

/**
 * Eliminar un adjunto
 */
export const deleteAttachment = async (
  attachmentId: string,
  userId: string,
) => {
  // Obtener el adjunto
  const { data: attachment, error } = await supabase
    .from("reservation_attachments")
    .select("*")
    .eq("id", attachmentId)
    .single();

  if (error || !attachment) {
    throw new Error("Adjunto no encontrado");
  }

  // Verificar que el usuario sea el dueño
  if (attachment.uploaded_by !== userId) {
    throw new Error("No tienes permiso para eliminar este adjunto");
  }

  // Eliminar de storage
  const { error: storageError } = await supabase.storage
    .from("reservation-attachments")
    .remove([attachment.file_path]);

  if (storageError) {
    console.error("Error al eliminar archivo de storage:", storageError);
  }

  // Eliminar registro de DB
  const { error: dbError } = await supabase
    .from("reservation_attachments")
    .delete()
    .eq("id", attachmentId);

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
    throw new Error(
      "La parada debe tener nombre y coordenadas para buscar foto",
    );
  }

  // Usar búsqueda inteligente (Foursquare primero, Google Places como fallback)
  const photoUrl = await searchPlacePhotoSmart(
    stop.name,
    stop.coordinates,
    stop.address,
    100,
  );

  // Actualizar la parada con la nueva foto
  const { data: updatedStop, error } = await supabase
    .from(STOP_TABLE)
    .update({ photo_url: photoUrl })
    .eq("id", stopId)
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
          100,
        );

        // Actualizar si se encontró foto
        if (photoUrl) {
          await supabase
            .from(STOP_TABLE)
            .update({ photo_url: photoUrl })
            .eq("id", stop.id);

          updated++;
          results.push({
            stopId: stop.id,
            name: stop.name,
            success: true,
            photoUrl,
          });
        } else {
          failed++;
          results.push({
            stopId: stop.id,
            name: stop.name,
            success: false,
            reason: "No se encontró foto",
          });
        }
      } else {
        failed++;
        results.push({
          stopId: stop.id,
          name: stop.name || "Sin nombre",
          success: false,
          reason: "Faltan datos (nombre o coordenadas)",
        });
      }
    } catch (error) {
      failed++;
      results.push({
        stopId: stop.id,
        name: stop.name,
        success: false,
        reason: (error as Error).message,
      });
    }
  }

  return {
    total: stops.length,
    updated,
    failed,
    results,
  };
};
