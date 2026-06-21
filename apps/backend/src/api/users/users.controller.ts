// src/api/users/users.controller.ts
import { Request, Response } from "express";
import * as UserService from "./users.service.js";
import * as TripService from "../trips/trips.service.js";
import { supabase } from "../../supabase.js";

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 50;
import { decode } from "base64-arraybuffer";
import { getUserUsage } from "../../services/userUsageService.js";

// =============== USER CONTROLLERS ===============
export const getUserById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;

  try {
    const user = await UserService.getById(id);
    res.json(user);
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

export const getUserByUsername = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { username } = req.params as Record<string, string>;
  try {
    const user = await UserService.getByUsername(username);
    res.json(user);
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

export const searchUsersByUsername = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { username } = req.params as Record<string, string>;
  const limit = Math.min(
    Math.max(Number(req.query.limit) || DEFAULT_SEARCH_LIMIT, 1),
    MAX_SEARCH_LIMIT,
  );
  try {
    const searchPattern = `%${username}%`;
    const users = await UserService.searchByUsername(searchPattern, limit);
    res.json(users);
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

export const createUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // verifyToken garantiza req.userId. Solo puedes crear TU propio perfil:
    // forzamos id = usuario autenticado e ignoramos cualquier id del body.
    const authUserId = req.userId;
    const bodyId = req.body?.id;

    if (!authUserId) {
      res.status(401).json({ error: "Usuario no autenticado" });
      return;
    }

    if (bodyId && bodyId !== authUserId) {
      res.status(403).json({
        error: "No puedes crear un usuario con un ID diferente al tuyo",
      });
      return;
    }

    const newUser = await UserService.create({ ...req.body, id: authUserId });
    res.status(201).json(newUser);
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: "El nombre de usuario ya está en uso" });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const ALLOWED_FIELDS = [
    "name",
    "lastname",
    "username",
    "img",
    "user_type",
    "timezone",
    "auto_trip_status_update",
  ];
  const filteredBody = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => ALLOWED_FIELDS.includes(key)),
  );

  try {
    const updatedUser = await UserService.update(id, filteredBody);
    res.json(updatedUser);
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: "El nombre de usuario ya está en uso" });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  try {
    await UserService.deleteUser(id);
    res
      .status(200)
      .json({ message: `Usuario con id ${id} borrado correctamente` });
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

// =============== USER'S TRIPS CONTROLLERS ===============
export const getAllUserTrips = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  try {
    const trips = await UserService.getAllUserTrips(id);
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

export const getUserTripByTripId = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id, tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  try {
    const belongsToUser = await UserService.thisTripBelongsToUser(id, tripId);

    if (!belongsToUser) {
      res.status(403).json({
        error: `El viaje con id ${tripId} no pertenece al usuario con id ${id}`,
      });
      return;
    }

    const trip = await TripService.getById(tripIdNum);
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

export const getUserTripsCount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  try {
    const count = await UserService.countUserTrips(id);
    res.json({ userId: id, tripCount: count });
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

export const getUserFinishedTripsCount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  try {
    // Llamamos a la nueva función de servicio
    const count = await UserService.countUserFinishedTrips(id);
    // Devolvemos una respuesta clara
    res.json({ userId: id, finishedTripCount: count });
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

export const getUserProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  try {
    const profileData = await UserService.getProfileData(id);
    res.json(profileData);
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

export const uploadProfileImage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;

  try {
    // Verificar que el usuario existe
    const user = await UserService.getById(id);
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    // Obtener la imagen del cuerpo de la petición
    const { image } = req.body;

    if (!image) {
      res.status(400).json({ error: "No se proporcionó ninguna imagen" });
      return;
    }

    // La imagen viene en formato base64 data URL
    // Formato: data:image/jpeg;base64,/9j/4AAQSkZJRg...
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      res.status(400).json({ error: "Formato de imagen inválido" });
      return;
    }

    const contentType = matches[1];
    const base64Data = matches[2];

    // Generar nombre único para el archivo
    const fileName = `profile_${id}_${Date.now()}.jpg`;
    const filePath = `profile-images/${fileName}`;

    // Decodificar base64 a ArrayBuffer
    const arrayBuffer = decode(base64Data);

    // Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("user-images")
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      res.status(500).json({ error: "Error al subir la imagen" });
      return;
    }

    // Obtener URL pública de la imagen
    const { data: urlData } = supabase.storage
      .from("user-images")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Actualizar el usuario con la nueva URL de imagen
    await UserService.update(id, { img: publicUrl });

    res.json({
      success: true,
      imageUrl: publicUrl,
      message: "Imagen de perfil actualizada correctamente",
    });
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

// =============== USER PREFERENCES ===============

/**
 * Actualiza las preferencias del usuario (timezone, auto_trip_status_update)
 * PATCH /user/:id/preferences
 */
export const updateUserPreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const { timezone, autoTripStatusUpdate } = req.body;

  // Validación: al menos un campo debe estar presente
  if (timezone === undefined && autoTripStatusUpdate === undefined) {
    res.status(400).json({
      error:
        "Debe proporcionar al menos un campo: timezone o autoTripStatusUpdate",
    });
    return;
  }

  // Validar timezone si se proporciona
  if (timezone !== undefined && typeof timezone !== "string") {
    res.status(400).json({ error: "timezone debe ser un string" });
    return;
  }

  // Validar autoTripStatusUpdate si se proporciona
  if (
    autoTripStatusUpdate !== undefined &&
    typeof autoTripStatusUpdate !== "boolean"
  ) {
    res.status(400).json({ error: "autoTripStatusUpdate debe ser un boolean" });
    return;
  }

  try {
    const preferences: any = {};

    if (timezone !== undefined) {
      preferences.timezone = timezone;
    }

    if (autoTripStatusUpdate !== undefined) {
      preferences.autoTripStatusUpdate = autoTripStatusUpdate;
    }

    const result = await UserService.updateUserPreferences(id, preferences);

    res.json({
      success: true,
      preferences: result,
      message: "Preferencias actualizadas correctamente",
    });
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Obtiene las preferencias del usuario
 * GET /user/:id/preferences
 */
export const getUserPreferences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;

  try {
    const preferences = await UserService.getUserPreferences(id);
    res.json(preferences);
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * Actualiza el token de notificaciones push del usuario
 * PATCH /user/:id/push-token
 * Body: { expoPushToken: string }
 */
export const updatePushToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;
  const { expoPushToken } = req.body;

  // Validación básica
  if (!expoPushToken || typeof expoPushToken !== "string") {
    res.status(400).json({
      error: "expoPushToken es requerido y debe ser una cadena de texto",
    });
    return;
  }

  // Validar formato del token (opcional pero recomendado)
  if (
    !expoPushToken.startsWith("ExponentPushToken[") &&
    !expoPushToken.startsWith("ExpoPushToken[")
  ) {
    res.status(400).json({
      error: "Formato de token inválido. Debe ser un Expo Push Token válido",
    });
    return;
  }

  try {
    console.log(`📲 [updatePushToken] Updating push token for user ${id}`);

    await UserService.updatePushToken(id, expoPushToken);

    console.log(`✅ [updatePushToken] Push token updated successfully`);

    res.json({
      success: true,
      message: "Token de notificaciones actualizado correctamente",
    });
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};

export const getUserUsageStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params as Record<string, string>;

  try {
    // Obtener información de uso del usuario.
    // El gating de IA se basa ahora en el saldo de tokens (ver /api/tokens/balance).
    const usage = await getUserUsage(id);

    res.json({
      usage: {
        ai_trips_generated_month: usage.ai_trips_generated_month,
        max_vehicles_allowed: usage.max_vehicles_allowed,
        last_reset_date: usage.last_reset_date,
      },
    });
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
    if (err.message.includes("USERNAME_ALREADY_TAKEN")) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (
      err.message.includes("Ya existe") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
};
