// src/api/users/users.controller.ts
import { Request, Response } from 'express';
import * as UserService from './users.service.js';
import * as TripService from '../trips/trips.service.js';
import { supabase } from '../../supabase.js';
import { decode } from 'base64-arraybuffer';

// =============== USER CONTROLLERS ===============
export const getUserById = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const user = await UserService.getById(id);
        res.json(user);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const getUserByUsername = async (req: Request, res: Response) => {
    const { username } = req.params;
    try {
        const user = await UserService.getByUsername(username);
        res.json(user);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const searchUsersByUsername = async (req: Request, res: Response) => {
    const { username } = req.params;
    try {
        // Hacemos búsqueda parcial añadiendo %
        const searchPattern = `%${username}%`;
        const users = await UserService.searchByUsername(searchPattern);
        res.json(users);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        // Verificar que el usuario autenticado coincide con el ID que se está creando
        const userId = (req as any).user?.id;
        const bodyId = req.body.id;

        if (userId && bodyId && userId !== bodyId) {
            return res.status(403).json({ error: 'No puedes crear un usuario con un ID diferente al tuyo' });
        }

        const newUser = await UserService.create(req.body);
        res.status(201).json(newUser);

    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const updatedUser = await UserService.update(id, req.body);
        res.json(updatedUser);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await UserService.deleteUser(id);
        res.status(200).json({ message: `Usuario con id ${id} borrado correctamente` });
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

// =============== USER'S TRIPS CONTROLLERS ===============
export const getAllUserTrips = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const trips = await UserService.getAllUserTrips(id);
        res.json(trips);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const getUserTripByTripId = async (req: Request, res: Response) => {
    const { id, tripId } = req.params;
    const tripIdNum = Number(tripId);
    try {
        const belongsToUser = await UserService.thisTripBelongsToUser(id, tripId);

        if (!belongsToUser) {
            return res.status(403).json({ error: `El viaje con id ${tripId} no pertenece al usuario con id ${id}` });
        }

        const trip = await TripService.getById(tripIdNum);
        res.json(trip);

    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const getUserTripsCount = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const count = await UserService.countUserTrips(id);
        res.json({ userId: id, tripCount: count });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const getUserFinishedTripsCount = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Llamamos a la nueva función de servicio
        const count = await UserService.countUserFinishedTrips(id);
        // Devolvemos una respuesta clara
        res.json({ userId: id, finishedTripCount: count });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const getUserProfile = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const profileData = await UserService.getProfileData(id);
        res.json(profileData);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const uploadProfileImage = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Verificar que el usuario existe
        const user = await UserService.getById(id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Obtener la imagen del cuerpo de la petición
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
        }

        // La imagen viene en formato base64 data URL
        // Formato: data:image/jpeg;base64,/9j/4AAQSkZJRg...
        const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: 'Formato de imagen inválido' });
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
            .from('user-images')
            .upload(filePath, arrayBuffer, {
                contentType,
                upsert: true
            });

        if (uploadError) {
            console.error('Error uploading to Supabase Storage:', uploadError);
            return res.status(500).json({ error: 'Error al subir la imagen' });
        }

        // Obtener URL pública de la imagen
        const { data: urlData } = supabase.storage
            .from('user-images')
            .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        // Actualizar el usuario con la nueva URL de imagen
        await UserService.update(id, { img: publicUrl });

        res.json({
            success: true,
            imageUrl: publicUrl,
            message: 'Imagen de perfil actualizada correctamente'
        });

    } catch (error) {
        const err = error as Error;
        console.error('Error in uploadProfileImage:', err);
        res.status(500).json({ error: err.message });
    }
};

// =============== USER PREFERENCES ===============

/**
 * Actualiza las preferencias del usuario (timezone, auto_trip_status_update)
 * PATCH /user/:id/preferences
 */
export const updateUserPreferences = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { timezone, autoTripStatusUpdate } = req.body;

    // Validación: al menos un campo debe estar presente
    if (timezone === undefined && autoTripStatusUpdate === undefined) {
        return res.status(400).json({
            error: 'Debe proporcionar al menos un campo: timezone o autoTripStatusUpdate'
        });
    }

    // Validar timezone si se proporciona
    if (timezone !== undefined && typeof timezone !== 'string') {
        return res.status(400).json({ error: 'timezone debe ser un string' });
    }

    // Validar autoTripStatusUpdate si se proporciona
    if (autoTripStatusUpdate !== undefined && typeof autoTripStatusUpdate !== 'boolean') {
        return res.status(400).json({ error: 'autoTripStatusUpdate debe ser un boolean' });
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
            message: 'Preferencias actualizadas correctamente'
        });

    } catch (error) {
        const err = error as Error;
        console.error('Error in updateUserPreferences:', err);

        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }

        res.status(500).json({ error: err.message });
    }
};

/**
 * Obtiene las preferencias del usuario
 * GET /user/:id/preferences
 */
export const getUserPreferences = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const preferences = await UserService.getUserPreferences(id);
        res.json(preferences);
    } catch (error) {
        const err = error as Error;
        console.error('Error in getUserPreferences:', err);

        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }

        res.status(500).json({ error: err.message });
    }
};

/**
 * Actualiza el token de notificaciones push del usuario
 * PATCH /user/:id/push-token
 * Body: { expoPushToken: string }
 */
export const updatePushToken = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { expoPushToken } = req.body;

    // Validación básica
    if (!expoPushToken || typeof expoPushToken !== 'string') {
        return res.status(400).json({
            error: 'expoPushToken es requerido y debe ser una cadena de texto'
        });
    }

    // Validar formato del token (opcional pero recomendado)
    if (!expoPushToken.startsWith('ExponentPushToken[') &&
        !expoPushToken.startsWith('ExpoPushToken[')) {
        return res.status(400).json({
            error: 'Formato de token inválido. Debe ser un Expo Push Token válido'
        });
    }

    try {
        console.log(`📲 [updatePushToken] Updating push token for user ${id}`);

        await UserService.updatePushToken(id, expoPushToken);

        console.log(`✅ [updatePushToken] Push token updated successfully`);

        res.json({
            success: true,
            message: 'Token de notificaciones actualizado correctamente'
        });
    } catch (error) {
        const err = error as Error;
        console.error('❌ [updatePushToken] Error:', err);

        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }

        res.status(500).json({ error: err.message });
    }
};

export const getUserUsageStats = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Obtener información de uso del usuario
        const { getUserUsage, canCreateAITrip } = await import('../../services/userUsageService.js');
        
        const usage = await getUserUsage(id);
        const aiTripStatus = await canCreateAITrip(id);

        res.json({
            usage: {
                ai_trips_generated_month: usage.ai_trips_generated_month,
                max_vehicles_allowed: usage.max_vehicles_allowed,
                last_reset_date: usage.last_reset_date
            },
            ai_trip_creation: {
                can_create: aiTripStatus.canCreate,
                used_count: aiTripStatus.usedCount,
                max_count: aiTripStatus.maxCount,
                reason: aiTripStatus.reason
            }
        });
    } catch (error) {
        const err = error as Error;
        console.error('❌ [getUserUsageStats] Error:', err);
        res.status(500).json({ error: err.message });
    }
};
