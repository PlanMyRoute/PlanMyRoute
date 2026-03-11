import { Request, Response } from 'express';
import * as ItineraryService from './itinerary.service.js';
import type { Route } from '@planmyroute/types';
import { supabase } from '../../supabase.js';

// =============== ROUTE CONTROLLERS ===============
export const getRouteById = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const route = await ItineraryService.getRouteById(id);
        res.json(route);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const getRoutesByTripId = async (req: Request, res: Response) => {
    const { tripId } = req.params;
    const tripIdNum = Number(tripId);
    try {
        const routes = await ItineraryService.getRoutesByTripId(tripIdNum);
        res.json(routes);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const getRouteStops = async (req: Request, res: Response) => {
    const { routeId } = req.params;
    try {
        const stops = await ItineraryService.getRouteStops(routeId);
        res.json(stops);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const getIncompleteRoutes = async (req: Request, res: Response) => {
    const { tripId } = req.params;
    const tripIdNum = Number(tripId);
    try {
        const routes = await ItineraryService.getIncompleteRoutes(tripIdNum);
        res.json(routes);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const createRoute = async (req: Request, res: Response) => {
    try {
        const newRoute = await ItineraryService.createRoute(req.body);
        res.status(201).json(newRoute);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const updateRoute = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const updatedRoute = await ItineraryService.updateRoute(id, req.body);
        res.json(updatedRoute);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const deleteRoute = async (req: Request, res: Response) => {
    const { tripId, routeId } = req.params;

    try {
        if (await ItineraryService.isThisRouteEmpty(Number(tripId), routeId)) {
            await ItineraryService.deleteRoute(routeId);
            res.status(200).json({ message: `Ruta con id ${routeId} borrada correctamente` });
        } else {
            res.status(405).json({ message: `Ruta con id ${routeId} no se puede borrar debido a que tiene paradas asociadas` });
        }
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

// =============== STOP CONTROLLERS ===============

export const getStopById = async (req: Request, res: Response) => {
    const { stopId } = req.params;

    try {
        const stop = await ItineraryService.getStopById(stopId);
        res.json(stop);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

/**
 * Obtiene el precio de una parada específica
 * GET /api/stop/:stopId/price
 */
export const getStopPrice = async (req: Request, res: Response) => {
    const { stopId } = req.params;

    try {
        const stop = await ItineraryService.getStopById(stopId);

        if (!stop.coordinates || typeof stop.coordinates !== 'object') {
            return res.status(400).json({
                error: 'La parada no tiene coordenadas válidas',
                priceInfo: null
            });
        }

        // Importar la función de precio
        const { getPlacePrice } = await import('../../utils/placePrices.js');
        const priceInfo = await getPlacePrice(stop.name, stop.coordinates, stop.address);

        res.json({
            stopId,
            name: stop.name,
            priceInfo
        });
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

//Methods to create stops
export const createStop = async (req: Request, res: Response) => {
    const { tripId } = req.params;
    const tripIdNum = Number(tripId);

    try {
        const newStop = await ItineraryService.createStop(req.body, tripIdNum);
        res.status(201).json(newStop);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const createActivityStop = async (req: Request, res: Response) => {
    const { tripId } = req.params;
    const tripIdNum = Number(tripId);
    const { stopData, activityData } = req.body;

    try {
        const result = await ItineraryService.createActivityStop(stopData, activityData, tripIdNum);
        res.status(201).json(result);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const createAccommodationStop = async (req: Request, res: Response) => {
    const { tripId } = req.params;
    const tripIdNum = Number(tripId);
    const { stopData, accommodationData } = req.body;

    try {
        const result = await ItineraryService.createAccommodationStop(stopData, accommodationData, tripIdNum);
        res.status(201).json(result);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const createRefuelStop = async (req: Request, res: Response) => {
    const { tripId } = req.params;
    const tripIdNum = Number(tripId);
    const { stopData, refuelData } = req.body;

    try {
        const result = await ItineraryService.createRefuelStop(stopData, refuelData, tripIdNum);
        res.status(201).json(result);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const getRefuelStop = async (req: Request, res: Response) => {
    const { stopId } = req.params;

    try {
        const result = await ItineraryService.getRefuelStop(stopId);
        res.json(result);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

//Methods to create stops
export const updateStop = async (req: Request, res: Response) => {
    const { stopId } = req.params;
    const tripIdNum = Number(req.params.tripId);

    console.log(`🔧 updateStop - Parámetros recibidos:`, {
        stopId,
        tripIdParam: req.params.tripId,
        tripIdNum,
        isValidTripId: !isNaN(tripIdNum) && tripIdNum > 0,
    });

    const stopData = req.body;

    // Convertir hora simple a timestamp si es necesario
    if (stopData.estimated_arrival && typeof stopData.estimated_arrival === 'string') {
        // Si es solo hora (HH:mm), la función de servicio la convertirá
        // No hacemos nada aquí, dejamos que el servicio lo maneje
    }

    // ⚠️ NO CAMBIAR EL TIPO AQUÍ - El type ya viene correcto del frontend
    // El type es la propiedad fundamental que define origen/destino/intermedia
    // NO se debe cambiar basándose en order

    try {
        const updatedStop = await ItineraryService.updateStop(stopId, stopData, tripIdNum);
        res.json(updatedStop);
    } catch (error) {
        const err = error as Error;
        // Errores de validación de origen/destino/intermedia - devolver sin loguear
        if (err.message.includes('Origen') || err.message.includes('Destino') || err.message.includes('intermedia')) {
            return res.status(400).json({ error: err.message });
        }
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        console.error('Error en updateStop:', err);
        res.status(500).json({ error: err.message });
    }
};

export const updateActivityStop = async (req: Request, res: Response) => {
    const { stopId } = req.params;
    const { stopData, activityData } = req.body;

    try {
        const result = await ItineraryService.updateActivityStop(stopId, stopData || {}, activityData || {});
        res.json(result);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const updateAccommodationStop = async (req: Request, res: Response) => {
    const { stopId } = req.params;
    const { stopData, accommodationData } = req.body;

    try {
        const result = await ItineraryService.updateAccommodationStop(stopId, stopData || {}, accommodationData || {});
        res.json(result);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const updateRefuelStop = async (req: Request, res: Response) => {
    const { stopId } = req.params;
    const { stopData, refuelData } = req.body;

    try {
        const result = await ItineraryService.updateRefuelStop(stopId, stopData || {}, refuelData || {});
        res.json(result);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const deleteStop = async (req: Request, res: Response) => {
    const { stopId } = req.params;
    try {
        const result = await ItineraryService.deleteStop(stopId);
        if (result && typeof result === 'object' && (result as any).id) {
            return res.status(200).json({ message: `Parada borrada y rutas fusionadas.`, mergedRoute: result });
        }

        res.status(200).json({ message: `Parada con id ${stopId} borrada correctamente` });
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

// =============== COMBINED CONTROLLERS ===============

export const getRouteWithStops = async (req: Request, res: Response) => {
    const { routeId } = req.params;

    try {
        const routeWithStops = await ItineraryService.getRouteWithStops(routeId);
        res.json(routeWithStops);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const getAllStopsInATrip = async (req: Request, res: Response) => {
    const { tripId } = req.params;
    const tripIdNum = Number(tripId);
    try {
        const uniqueStops = await ItineraryService.getAllStopsInATrip(tripIdNum);
        return res.json(uniqueStops);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('No se encontró')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

export const getTripItinerary = async (req: Request, res: Response) => {
    const { tripId } = req.params;
    const tripIdNum = Number(tripId);
    try {
        const itinerary = await ItineraryService.getTripItinerary(tripIdNum);
        res.json(itinerary);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const getTotalRefuelCostByUser = async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const result = await ItineraryService.getTotalRefuelCostByUser(userId);
        res.json(result);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const getTotalRefuelCostByTrip = async (req: Request, res: Response) => {
    const { tripId } = req.params;
    const tripIdNum = Number(tripId);
    try {
        const result = await ItineraryService.getTotalRefuelCostByTrip(tripIdNum);
        res.json(result);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const getTotalAccommodationCostByTrip = async (req: Request, res: Response) => {
    const { tripId } = req.params;
    const tripIdNum = Number(tripId);
    try {
        const result = await ItineraryService.getTotalAccommodationCostByTrip(tripIdNum);
        res.json(result);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

export const getTotalActivityCostByTrip = async (req: Request, res: Response) => {
    const { tripId } = req.params;
    const tripIdNum = Number(tripId);
    try {
        const result = await ItineraryService.getTotalActivityCostByTrip(tripIdNum);
        res.json(result);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

// =============== ATTACHMENT CONTROLLERS ===============

/**
 * POST /api/stops/:stopId/attachments
 */
export const uploadAttachment = async (req: Request, res: Response) => {
    try {
        const formidable = (await import('formidable')).default;
        const { stopId } = req.params;

        console.log('📥 POST /api/stop/:stopId/attachments recibido:', {
            stopId,
            hasAuth: !!req.headers.authorization,
            contentType: req.headers['content-type']
        });

        // Extraer y verificar el token JWT de Supabase
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('❌ No hay header de autorización');
            return res.status(401).json({ error: 'No autenticado' });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('❌ Error verificando token:', error);
            return res.status(401).json({ error: 'Token inválido' });
        }

        const userId = user.id;
        console.log('✅ Usuario autenticado:', { userId });

        // Parsear el archivo con formidable
        const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowEmptyFiles: false,
        });

        console.log('📦 Parseando FormData...');
        const [fields, files] = await form.parse(req);
        const file = files.file?.[0];

        console.log('📎 Archivo recibido:', {
            hasFile: !!file,
            fileName: file?.originalFilename,
            mimeType: file?.mimetype,
            size: file?.size
        });

        if (!file) {
            console.error('❌ No se proporcionó ningún archivo');
            return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
        }

        console.log('🚀 Llamando a uploadReservationAttachment...');
        const result = await ItineraryService.uploadReservationAttachment(
            stopId,
            userId,
            {
                filepath: file.filepath,
                originalFilename: file.originalFilename || 'archivo',
                mimetype: file.mimetype || 'application/octet-stream',
                size: file.size,
            },
            token // Pasar el token del usuario
        );

        console.log('✅ Upload completado:', result);
        res.status(201).json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('Error uploading attachment:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al subir archivo',
        });
    }
};

/**
 * GET /api/stops/:stopId/attachments
 */
export const getAttachments = async (req: Request, res: Response) => {
    try {
        const { stopId } = req.params;

        console.log('📥 GET /api/stop/:stopId/attachments recibido:', {
            stopId,
            hasAuth: !!req.headers.authorization
        });

        // Extraer y verificar el token JWT de Supabase
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('❌ No hay header de autorización');
            return res.status(401).json({ error: 'No autenticado' });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('❌ Error verificando token:', error);
            return res.status(401).json({ error: 'Token inválido' });
        }

        const userId = user.id;
        console.log('✅ Usuario autenticado:', { userId });

        // Pasar el token del usuario al servicio para generar URLs firmadas
        const attachments = await ItineraryService.getStopAttachments(stopId, userId, token);

        console.log('✅ Adjuntos obtenidos del servicio:', { count: attachments.length });

        res.json({
            success: true,
            data: attachments,
        });
    } catch (error: any) {
        console.error('❌ Error getting attachments:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al obtener adjuntos',
        });
    }
};

/**
 * DELETE /api/attachments/:attachmentId
 */
export const deleteAttachmentHandler = async (req: Request, res: Response) => {
    try {
        const { attachmentId } = req.params;

        // Extraer y verificar el token JWT de Supabase
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('❌ Error verificando token:', error);
            return res.status(401).json({ error: 'Token inválido' });
        }

        const userId = user.id;

        await ItineraryService.deleteAttachment(attachmentId, userId);

        res.json({
            success: true,
            message: 'Adjunto eliminado correctamente',
        });
    } catch (error: any) {
        console.error('Error deleting attachment:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al eliminar adjunto',
        });
    }
};

// Endpoint para actualizar la foto de una parada específica
export const refreshStopPhoto = async (req: Request, res: Response) => {
    const { stopId } = req.params;

    try {
        const updatedStop = await ItineraryService.refreshStopPhoto(stopId);
        res.json({
            success: true,
            message: 'Foto de la parada actualizada',
            stop: updatedStop,
        });
    } catch (error: any) {
        console.error('Error refreshing stop photo:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al actualizar foto de la parada',
        });
    }
};

// Endpoint para actualizar fotos de todas las paradas de un viaje
export const refreshTripStopsPhotos = async (req: Request, res: Response) => {
    const { tripId } = req.params;
    const tripIdNum = Number(tripId);

    try {
        const result = await ItineraryService.refreshTripStopsPhotos(tripIdNum);
        res.json({
            success: true,
            message: `Fotos actualizadas para ${result.updated} de ${result.total} paradas`,
            ...result,
        });
    } catch (error: any) {
        console.error('Error refreshing trip stops photos:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Error al actualizar fotos de las paradas',
        });
    }
};