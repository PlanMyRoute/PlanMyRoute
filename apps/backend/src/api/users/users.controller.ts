// src/api/users/users.controller.ts
import * as UserService from "./users.service.js";
import * as TripService from "../trips/trips.service.js";
import { supabase } from "../../supabase.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  asyncHandler,
} from "../../utils/errors.js";
import { decode } from "base64-arraybuffer";
import { getUserUsage } from "../../services/userUsageService.js";

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 50;

// =============== USER CONTROLLERS ===============
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const user = await UserService.getById(id);
  res.json(user);
});

export const getUserByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params as Record<string, string>;
  const user = await UserService.getByUsername(username);
  res.json(user);
});

export const searchUsersByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params as Record<string, string>;
  const limit = Math.min(
    Math.max(Number(req.query.limit) || DEFAULT_SEARCH_LIMIT, 1),
    MAX_SEARCH_LIMIT,
  );
  const searchPattern = `%${username}%`;
  const users = await UserService.searchByUsername(searchPattern, limit);
  res.json(users);
});

export const createUser = asyncHandler(async (req, res) => {
  // verifyToken garantiza req.userId. Solo puedes crear TU propio perfil:
  // forzamos id = usuario autenticado e ignoramos cualquier id del body.
  const authUserId = req.userId;
  const bodyId = req.body?.id;

  if (!authUserId) {
    throw new UnauthorizedError("Usuario no autenticado");
  }

  if (bodyId && bodyId !== authUserId) {
    throw new ForbiddenError(
      "No puedes crear un usuario con un ID diferente al tuyo",
    );
  }

  const newUser = await UserService.create({ ...req.body, id: authUserId });
  res.status(201).json(newUser);
});

export const updateUser = asyncHandler(async (req, res) => {
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

  const updatedUser = await UserService.update(id, filteredBody);
  res.json(updatedUser);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  await UserService.deleteUser(id);
  res
    .status(200)
    .json({ message: `Usuario con id ${id} borrado correctamente` });
});

// =============== USER'S TRIPS CONTROLLERS ===============
export const getAllUserTrips = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const trips = await UserService.getAllUserTrips(id);
  res.json(trips);
});

export const getUserTripByTripId = asyncHandler(async (req, res) => {
  const { id, tripId } = req.params as Record<string, string>;
  const tripIdNum = Number(tripId);
  const belongsToUser = await UserService.thisTripBelongsToUser(id, tripId);

  if (!belongsToUser) {
    throw new ForbiddenError(
      `El viaje con id ${tripId} no pertenece al usuario con id ${id}`,
    );
  }

  const trip = await TripService.getById(tripIdNum);
  res.json(trip);
});

export const getUserTripsCount = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const count = await UserService.countUserTrips(id);
  res.json({ userId: id, tripCount: count });
});

export const getUserFinishedTripsCount = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const count = await UserService.countUserFinishedTrips(id);
  res.json({ userId: id, finishedTripCount: count });
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const profileData = await UserService.getProfileData(id);
  res.json(profileData);
});

export const uploadProfileImage = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;

  // Verificar que el usuario existe
  const user = await UserService.getById(id);
  if (!user) {
    throw new NotFoundError("Usuario no encontrado");
  }

  // Obtener la imagen del cuerpo de la petición
  const { image } = req.body;

  if (!image) {
    throw new BadRequestError("No se proporcionó ninguna imagen");
  }

  // La imagen viene en formato base64 data URL
  // Formato: data:image/jpeg;base64,/9j/4AAQSkZJRg...
  const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

  if (!matches || matches.length !== 3) {
    throw new BadRequestError("Formato de imagen inválido");
  }

  const contentType = matches[1];
  const base64Data = matches[2];

  // Generar nombre único para el archivo
  const fileName = `profile_${id}_${Date.now()}.jpg`;
  const filePath = `profile-images/${fileName}`;

  // Decodificar base64 a ArrayBuffer
  const arrayBuffer = decode(base64Data);

  // Subir a Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("user-images")
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error("Error al subir la imagen");
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
});

// =============== USER PREFERENCES ===============

/**
 * Actualiza las preferencias del usuario (timezone, auto_trip_status_update)
 * PATCH /user/:id/preferences
 */
export const updateUserPreferences = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const { timezone, autoTripStatusUpdate } = req.body;

  // Validación: al menos un campo debe estar presente
  if (timezone === undefined && autoTripStatusUpdate === undefined) {
    throw new BadRequestError(
      "Debe proporcionar al menos un campo: timezone o autoTripStatusUpdate",
    );
  }

  if (timezone !== undefined && typeof timezone !== "string") {
    throw new BadRequestError("timezone debe ser un string");
  }

  if (
    autoTripStatusUpdate !== undefined &&
    typeof autoTripStatusUpdate !== "boolean"
  ) {
    throw new BadRequestError("autoTripStatusUpdate debe ser un boolean");
  }

  const preferences: { timezone?: string; autoTripStatusUpdate?: boolean } = {};
  if (timezone !== undefined) preferences.timezone = timezone;
  if (autoTripStatusUpdate !== undefined)
    preferences.autoTripStatusUpdate = autoTripStatusUpdate;

  const result = await UserService.updateUserPreferences(id, preferences);

  res.json({
    success: true,
    preferences: result,
    message: "Preferencias actualizadas correctamente",
  });
});

/**
 * Obtiene las preferencias del usuario
 * GET /user/:id/preferences
 */
export const getUserPreferences = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const preferences = await UserService.getUserPreferences(id);
  res.json(preferences);
});

/**
 * Actualiza el token de notificaciones push del usuario
 * PATCH /user/:id/push-token
 * Body: { expoPushToken: string }
 */
export const updatePushToken = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;
  const { expoPushToken } = req.body;

  if (!expoPushToken || typeof expoPushToken !== "string") {
    throw new BadRequestError(
      "expoPushToken es requerido y debe ser una cadena de texto",
    );
  }

  if (
    !expoPushToken.startsWith("ExponentPushToken[") &&
    !expoPushToken.startsWith("ExpoPushToken[")
  ) {
    throw new BadRequestError(
      "Formato de token inválido. Debe ser un Expo Push Token válido",
    );
  }

  await UserService.updatePushToken(id, expoPushToken);

  res.json({
    success: true,
    message: "Token de notificaciones actualizado correctamente",
  });
});

export const getUserUsageStats = asyncHandler(async (req, res) => {
  const { id } = req.params as Record<string, string>;

  // El gating de IA se basa ahora en el saldo de tokens (ver /api/tokens/balance).
  const usage = await getUserUsage(id);

  res.json({
    usage: {
      ai_trips_generated_month: usage.ai_trips_generated_month,
      max_vehicles_allowed: usage.max_vehicles_allowed,
      last_reset_date: usage.last_reset_date,
    },
  });
});
