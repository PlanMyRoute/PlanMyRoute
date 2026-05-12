import { Router, Request, Response } from 'express';

const router = Router();

// Nominatim usage policy requires a descriptive User-Agent with contact info
const NOMINATIM_USER_AGENT = 'PlanMyRoute/1.0 (dev.planmyroute@gmail.com)';

/**
 * GET /api/places/autocomplete
 * Proxy para Nominatim (OpenStreetMap) — sin API key, completamente gratis.
 * Query params: input (required), language (optional)
 */
router.get('/autocomplete', async (req: Request, res: Response) => {
    try {
        const { input, language = 'es' } = req.query;

        if (!input) {
            return res.status(400).json({ error: 'El parámetro "input" es requerido' });
        }

        const params = new URLSearchParams({
            q: String(input),
            format: 'json',
            addressdetails: '1',
            limit: '6',
            'accept-language': String(language),
        });

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?${params}`,
            {
                headers: {
                    'User-Agent': NOMINATIM_USER_AGENT,
                    'Accept-Language': String(language),
                },
            }
        );

        if (!response.ok) {
            console.error('Nominatim autocomplete error:', response.status);
            return res.status(response.status).json({ predictions: [] });
        }

        const results = await response.json() as any[];

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

export default router;
