import { Router, Request, Response } from 'express';
import { reverseGeocode, searchPlaces } from '../../utils/nominatimClient.js';

const router = Router();

/**
 * GET /api/places/autocomplete
 * Proxy para Nominatim (OpenStreetMap) — sin API key, completamente gratis.
 * Las llamadas salientes pasan por una cola con limitación de tasa (≤1 req/seg,
 * política de Nominatim) y se cachean para reducir la presión sobre el servicio.
 * Query params: input (required), language (optional)
 */
router.get('/autocomplete', async (req: Request, res: Response) => {
    try {
        const { input, language = 'es' } = req.query;

        if (!input) {
            return res.status(400).json({ error: 'El parámetro "input" es requerido' });
        }

        const results = await searchPlaces(String(input), String(language));

        // Encode lat/lon/address into place_id so the /details endpoint
        // can return coordinates without a second Nominatim call.
        const predictions = results.map((r: any) => {
            const encodedId = Buffer.from(
                JSON.stringify({ lat: r.lat, lng: r.lon, address: r.display_name })
            ).toString('base64');

            // Split display_name: first segment → main_text, rest → secondary_text
            const [mainText, ...rest] = r.display_name.split(', ');
            const secondaryText = rest.join(', ');

            return {
                place_id: encodedId,
                description: r.display_name,
                structured_formatting: {
                    main_text: r.name || mainText,
                    secondary_text: secondaryText,
                },
            };
        });

        res.json({ predictions });
    } catch (error) {
        console.error('Error en /api/places/autocomplete:', error);
        res.status(500).json({ error: 'Error fetching autocomplete predictions' });
    }
});

/**
 * GET /api/places/details
 * Decodifica el place_id generado por /autocomplete para devolver coordenadas.
 * No hace ninguna llamada externa — las coordenadas ya viajan en el place_id.
 * Query params: place_id (required)
 */
router.get('/details', async (req: Request, res: Response) => {
    try {
        const { place_id } = req.query;

        if (!place_id) {
            return res.status(400).json({ error: 'El parámetro "place_id" es requerido' });
        }

        const decoded = JSON.parse(
            Buffer.from(String(place_id), 'base64').toString('utf-8')
        );

        const result = {
            formatted_address: decoded.address || '',
            geometry: {
                location: {
                    lat: parseFloat(decoded.lat),
                    lng: parseFloat(decoded.lng),
                },
            },
        };

        res.json({ result });
    } catch (error) {
        console.error('Error en /api/places/details:', error);
        res.status(500).json({ error: 'place_id inválido o corrompido' });
    }
});

/**
 * GET /api/places/reverse?lat=&lng=
 * Reverse geocoding via Nominatim — devuelve dirección legible desde coordenadas GPS.
 * Pasa por la misma cola con limitación de tasa y caché (por coordenadas
 * redondeadas a ~4 decimales) que /autocomplete.
 */
router.get('/reverse', async (req: Request, res: Response) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Parámetros lat y lng requeridos' });
        }
        const latNum = Number(lat);
        const lngNum = Number(lng);
        if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
            return res.status(400).json({ error: 'Parámetros lat y lng deben ser numéricos' });
        }

        const result = await reverseGeocode(latNum, lngNum);
        res.json({ address: result?.display_name ?? null });
    } catch (error) {
        console.error('Error en /api/places/reverse:', error);
        res.status(500).json({ address: null });
    }
});

export default router;
