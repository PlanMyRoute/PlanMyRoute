import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

const router = Router();

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
    console.warn('⚠️ GOOGLE_PLACES_API_KEY no está configurada');
}

/**
 * GET /api/places/autocomplete
 * Proxy para Google Places Autocomplete API
 * Query params: input (required), language (optional), components (optional)
 */
router.get('/autocomplete', async (req: Request, res: Response) => {
    try {
        const { input, language = 'es', components } = req.query;

        if (!input) {
            return res.status(400).json({ error: 'El parámetro "input" es requerido' });
        }

        if (!GOOGLE_PLACES_API_KEY) {
            return res.status(500).json({ error: 'Google Places API key no configurada' });
        }

        const params = new URLSearchParams({
            input: String(input),
            key: GOOGLE_PLACES_API_KEY,
            language: String(language),
        });

        if (components) {
            params.append('components', String(components));
        }

        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;

        const response = await fetch(url, {
            method: 'GET',
        });

        const data = await response.json() as any;

        if (!response.ok) {
            console.error('Google Places error:', data);
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error('Error en /api/places/autocomplete:', error);
        res.status(500).json({ error: 'Error fetching autocomplete predictions' });
    }
});

/**
 * GET /api/places/details
 * Proxy para Google Places Details API
 * Query params: place_id (required), fields (optional)
 */
router.get('/details', async (req: Request, res: Response) => {
    try {
        const { place_id, fields = 'geometry,formatted_address' } = req.query;

        if (!place_id) {
            return res.status(400).json({ error: 'El parámetro "place_id" es requerido' });
        }

        if (!GOOGLE_PLACES_API_KEY) {
            return res.status(500).json({ error: 'Google Places API key no configurada' });
        }

        const params = new URLSearchParams({
            place_id: String(place_id),
            key: GOOGLE_PLACES_API_KEY,
            fields: String(fields),
            language: 'es',
        });

        const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;

        const response = await fetch(url, {
            method: 'GET',
        });

        const data = await response.json() as any;

        if (!response.ok) {
            console.error('Google Places details error:', data);
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error('Error en /api/places/details:', error);
        res.status(500).json({ error: 'Error fetching place details' });
    }
});

export default router;
