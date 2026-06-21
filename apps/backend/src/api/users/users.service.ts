import { supabase } from "../../supabase.js";
import { User } from "@planmyroute/types";
import { getIsPremium } from "../subscriptions/subscriptions.service.js";

const USER_TABLE_NAME = "user";
const TRAVELERS_TABLE_NAME = "travelers";

// =============== USER SERVICES ===============
/**
 * Obtiene un usuario por su ID
 * @param id - ID del usuario
 * @returns Datos del usuario encontrado
 */
export const getById = async (id: string) => {
  const { data, error } = await supabase
    .from(USER_TABLE_NAME)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al obtener el usuario: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No se encontró ningún usuario con el id: ${id}`);
  }

  return data;
};

/**
 * Obtiene un usuario por su nombre de usuario
 * @param username - Nombre de usuario a buscar
 * @returns Datos del usuario encontrado
 */
export const getByUsername = async (username: string) => {
  const { data, error } = await supabase
    .from(USER_TABLE_NAME)
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al obtener el usuario: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      `No se encontró ningún usuario con el username: ${username}`,
    );
  }

  return data;
};

/**
 * Busca usuarios cuyo nombre de usuario coincida con un patrón
 * @param searchPattern - Patrón de búsqueda (compatible con ILIKE de PostgreSQL)
 * @param limit - Cantidad máxima de resultados (por defecto 20)
 * @returns Lista de usuarios que coinciden con el patrón
 */
export const searchByUsername = async (searchPattern: string, limit = 20) => {
  const { data, error } = await supabase
    .from(USER_TABLE_NAME)
    .select("id, username, name, lastname, img, bio, location")
    .ilike("username", searchPattern)
    .limit(limit);

  if (error) {
    throw new Error(`Error al buscar usuarios: ${error.message}`);
  }

  // Retorna array de usuarios (puede estar vacío)
  return data || [];
};

/**
 * Obtiene los intereses (tipo de usuario) de un usuario
 * @param userId - ID del usuario
 * @returns Lista de intereses del usuario
 */
export const getUserInterests = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from(USER_TABLE_NAME)
    .select("user_type")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(
      `Error al obtener los intereses del usuario: ${error.message}`,
    );
  }
  if (!data || !data.user_type) {
    return [];
  }
  return data.user_type;
};

/**
 * Comprueba si un usuario tiene premium activo.
 * Delega a la función canónica en subscriptions.service.
 */
export const getUserSubscriptionStatus = async (
  userId: string,
): Promise<boolean> => {
  return getIsPremium(userId);
};

/**
 * Obtiene los datos completos del perfil de un usuario, incluyendo estadísticas y suscripción
 * @param userId - ID del usuario
 * @returns Objeto con datos del usuario, estadísticas de viajes, intereses y estado premium
 */
export const getProfileData = async (userId: string) => {
  try {
    // Ejecutamos todas las promesas en paralelo
    const [userData, tripsCount, finishedTripsCount, isPremium] =
      await Promise.all([
        getById(userId), // 1. Obtiene datos del usuario
        countUserTrips(userId), // 2. Cuenta todos sus viajes
        countUserFinishedTrips(userId), // 3. Cuenta sus viajes terminados
        getUserSubscriptionStatus(userId), // 4. Verifica si es premium
      ]);

    return {
      user: {
        ...userData,
      },
      stats: {
        tripsCreated: tripsCount,
        tripsFinished: finishedTripsCount,
      },
      interests: userData.user_type || [],
      is_premium: isPremium,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Error al obtener los datos del perfil: ${error.message}`,
      );
    }
    throw new Error(
      `Error desconocido al obtener los datos del perfil: ${String(error)}`,
    );
  }
};

/**
 * Crea un nuevo usuario en la base de datos
 * @param userData - Datos del usuario a crear
 * @returns Usuario creado
 */
export const create = async (userData: User) => {
  const { data, error } = await supabase
    .from(USER_TABLE_NAME)
    .insert(userData)
    .select()
    .single();

  if (error) {
    if (error.code === "23505" && error.message.includes("username")) {
      throw new Error("USERNAME_ALREADY_TAKEN");
    }
    throw new Error(`Error al crear el usuario: ${error.message}`);
  }

  return data;
};

/**
 * Actualiza los datos de un usuario existente
 * @param id - ID del usuario a actualizar
 * @param userData - Campos del usuario a modificar
 * @returns Usuario actualizado
 */
export const update = async (id: string, userData: Partial<User>) => {
  const { data, error } = await supabase
    .from(USER_TABLE_NAME)
    .update(userData)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === "23505" && error.message.includes("username")) {
      throw new Error("USERNAME_ALREADY_TAKEN");
    }
    throw new Error(`Error al actualizar el usuario: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No se encontró ningún usuario con el id: ${id}`);
  }

  return data;
};

/**
 * Elimina un usuario de la base de datos tras verificar que existe
 * @param id - ID del usuario a eliminar
 * @returns ID del usuario eliminado
 */
export const deleteUser = async (id: string) => {
  // Primero verificamos que el usuario existe
  const { data: existingUser } = await supabase
    .from(USER_TABLE_NAME)
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!existingUser) {
    throw new Error(`No se encontró ningún usuario con el id: ${id}`);
  }

  const { error } = await supabase.from(USER_TABLE_NAME).delete().eq("id", id);

  if (error) {
    throw new Error(`Error al eliminar el usuario: ${error.message}`);
  }

  return id;
};

// =============== USER'S TRIPS SERVICES ===============
/**
 * Obtiene todos los IDs de viajes en los que participa un usuario
 * @param userId - ID del usuario
 * @returns Lista de relaciones usuario-viaje con los IDs de los viajes
 */
export const getAllUserTrips = async (userId: string) => {
  const { data, error } = await supabase
    .from(TRAVELERS_TABLE_NAME)
    .select("trip_id")
    .eq("user_id", userId);
  if (error) {
    throw new Error(
      `Error al obtener los viajes del usuario: ${error.message}`,
    );
  }
  return data;
};

/**
 * Verifica si un viaje pertenece a un usuario (si el usuario es viajero del viaje)
 * @param userId - ID del usuario
 * @param tripId - ID del viaje
 * @returns true si el usuario es parte del viaje, false en caso contrario
 */
export const thisTripBelongsToUser = async (
  userId: string,
  tripId: string,
): Promise<boolean> => {
  const { data, error } = await supabase
    .from(TRAVELERS_TABLE_NAME)
    .select("trip_id")
    .eq("user_id", userId)
    .eq("trip_id", tripId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error al verificar el viaje del usuario: ${error.message}`,
    );
  }

  return data !== null;
};

/**
 * Cuenta el número total de viajes en los que participa un usuario
 * @param userId - ID del usuario
 * @returns Cantidad de viajes del usuario
 */
export const countUserTrips = async (userId: string) => {
  const { count, error } = await supabase
    .from(TRAVELERS_TABLE_NAME)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Error al contar los viajes del usuario: ${error.message}`);
  }

  return count !== null ? count : 0;
};

/**
 * Cuenta el número de viajes completados en los que participó un usuario
 * @param userId - ID del usuario
 * @returns Cantidad de viajes terminados del usuario
 */
export const countUserFinishedTrips = async (userId: string) => {
  const { count, error } = await supabase
    .from(TRAVELERS_TABLE_NAME)
    .select(
      "trip!inner(status)", // ¡Esta es la unión!
      { count: "exact", head: true },
    )
    .eq("user_id", userId)
    .eq("trip.status", "completed"); // Filtramos por el estado 'completed'

  if (error) {
    throw new Error(
      `Error al contar los viajes terminados del usuario: ${error.message}`,
    );
  }

  return count !== null ? count : 0;
};

// =============== USER PREFERENCES ===============

/**
 * Obtiene las preferencias de un usuario relacionadas con la gestión de viajes
 * @param userId - ID del usuario
 * @returns Objeto con las preferencias del usuario
 */
export const getUserPreferences = async (userId: string) => {
  const { data, error } = await supabase
    .from(USER_TABLE_NAME)
    .select("auto_trip_status_update, timezone")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error al obtener las preferencias del usuario: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(`No se encontró ningún usuario con el id: ${userId}`);
  }

  return {
    autoTripStatusUpdate: data.auto_trip_status_update || false,
    timezone: data.timezone || "UTC",
  };
};

/**
 * Actualiza las preferencias de un usuario
 * @param userId - ID del usuario
 * @param preferences - Objeto con las preferencias a actualizar
 * @returns Usuario actualizado
 */
export const updateUserPreferences = async (
  userId: string,
  preferences: {
    autoTripStatusUpdate?: boolean;
    timezone?: string;
  },
) => {
  const updateData: any = {};

  if (preferences.autoTripStatusUpdate !== undefined) {
    updateData.auto_trip_status_update = preferences.autoTripStatusUpdate;
  }

  if (preferences.timezone !== undefined) {
    updateData.timezone = preferences.timezone;
  }

  const { data, error } = await supabase
    .from(USER_TABLE_NAME)
    .update(updateData)
    .eq("id", userId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error al actualizar las preferencias del usuario: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(`No se encontró ningún usuario con el id: ${userId}`);
  }

  return data;
};

/**
 * Actualiza el token de notificaciones push de un usuario
 * @param userId - ID del usuario
 * @param expoPushToken - Token de Expo Push Notifications
 * @returns Usuario actualizado
 */
export const updatePushToken = async (
  userId: string,
  expoPushToken: string,
) => {
  const { data, error } = await supabase
    .from(USER_TABLE_NAME)
    .update({ expo_push_token: expoPushToken })
    .eq("id", userId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Error al actualizar el token de push: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No se encontró ningún usuario con el id: ${userId}`);
  }

  return data;
};
