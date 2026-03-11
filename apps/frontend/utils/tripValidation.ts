/**
 * Utilidades para validación de viajes en el frontend
 * Portado desde el backend para cálculos locales sin API
 */

export type Coord = { lat: number; lng: number };

export interface LocationData {
    coords: Coord;
    country_code?: string;
    country?: string;
    display_name?: string;
}

// Constantes de estimación
const ROAD_FACTOR = 1.25; // Factor de corrección para distancia por carretera
const AVG_SPEED_KMH = 90; // Velocidad promedio en autopista
const MAX_CONTINUOUS_HOURS = 8; // Horas máximas de conducción continua recomendadas
const DEFAULT_FUEL_PRICE = 1.6; // €/L
const DEFAULT_CONSUMPTION_L_PER_100 = 8; // l/100km

// Mapa de continentes por código de país (ISO 3166-1 alpha-2)
const COUNTRY_TO_CONTINENT: { [key: string]: string } = {
    // Europa
    'es': 'europe', 'fr': 'europe', 'de': 'europe', 'it': 'europe', 'pt': 'europe', 'gb': 'europe',
    'ie': 'europe', 'nl': 'europe', 'be': 'europe', 'ch': 'europe', 'at': 'europe', 'pl': 'europe',
    'cz': 'europe', 'hu': 'europe', 'ro': 'europe', 'gr': 'europe', 'se': 'europe', 'no': 'europe',
    'dk': 'europe', 'fi': 'europe', 'bg': 'europe', 'hr': 'europe', 'rs': 'europe', 'sk': 'europe',
    'si': 'europe', 'ee': 'europe', 'lv': 'europe', 'lt': 'europe', 'lu': 'europe', 'mt': 'europe',
    'cy': 'europe', 'ua': 'europe', 'by': 'europe', 'md': 'europe', 'al': 'europe', 'mk': 'europe',
    'ba': 'europe', 'me': 'europe', 'xk': 'europe', 'is': 'europe',

    // Asia
    'tr': 'asia', 'ru': 'eurasia', 'cn': 'asia', 'jp': 'asia', 'kr': 'asia', 'in': 'asia',
    'th': 'asia', 'vn': 'asia', 'my': 'asia', 'sg': 'asia', 'id': 'asia', 'ph': 'asia',
    'kz': 'asia', 'uz': 'asia', 'sa': 'asia', 'ae': 'asia', 'il': 'asia', 'jo': 'asia',
    'lb': 'asia', 'sy': 'asia', 'iq': 'asia', 'ir': 'asia', 'af': 'asia', 'pk': 'asia',
    'bd': 'asia', 'np': 'asia', 'lk': 'asia', 'mm': 'asia', 'kh': 'asia', 'la': 'asia',

    // África
    'ma': 'africa', 'dz': 'africa', 'tn': 'africa', 'eg': 'africa', 'ly': 'africa', 'sd': 'africa',
    'za': 'africa', 'ng': 'africa', 'ke': 'africa', 'et': 'africa', 'gh': 'africa', 'ug': 'africa',
    'tz': 'africa', 'ao': 'africa', 'mz': 'africa', 'mg': 'africa', 'cm': 'africa', 'ci': 'africa',
    'ne': 'africa', 'bf': 'africa', 'ml': 'africa', 'mw': 'africa', 'zm': 'africa', 'sn': 'africa',

    // América del Norte
    'us': 'north_america', 'ca': 'north_america', 'mx': 'north_america', 'gt': 'central_america',
    'bz': 'central_america', 'sv': 'central_america', 'hn': 'central_america', 'ni': 'central_america',
    'cr': 'central_america', 'pa': 'central_america', 'cu': 'caribbean', 'do': 'caribbean',
    'jm': 'caribbean', 'ht': 'caribbean', 'tt': 'caribbean',

    // América del Sur
    'br': 'south_america', 'ar': 'south_america', 'co': 'south_america', 've': 'south_america',
    'cl': 'south_america', 'pe': 'south_america', 'ec': 'south_america', 'bo': 'south_america',
    'py': 'south_america', 'uy': 'south_america', 'gy': 'south_america', 'sr': 'south_america',

    // Oceanía
    'au': 'oceania', 'nz': 'oceania', 'pg': 'oceania', 'fj': 'oceania'
};

// Conexiones terrestres posibles entre continentes/regiones
const CONNECTED_REGIONS = [
    ['europe', 'asia'],
    ['europe', 'eurasia'],
    ['eurasia', 'asia'],
    ['africa', 'asia'], // Vía Sinaí (Egipto)
    ['north_america', 'central_america'],
    ['central_america', 'south_america'],
    ['north_america', 'south_america'], // Vía Centroamérica
];

// Países con conexiones especiales (túneles, puentes) a pesar de estar separados por agua
const SPECIAL_CONNECTIONS = [
    ['gb', 'fr'], // Eurotúnel
    ['dk', 'se'], // Puente de Øresund
];

/**
 * Verifica si dos países/regiones están conectados por carretera basándose en continentes
 */
function areRegionsConnectedByLand(countryCodeA: string, countryCodeB: string): boolean {
    const continentA = COUNTRY_TO_CONTINENT[countryCodeA.toLowerCase()];
    const continentB = COUNTRY_TO_CONTINENT[countryCodeB.toLowerCase()];

    if (!continentA || !continentB) {
        // Si no conocemos el país, asumimos que puede estar conectado
        return true;
    }

    // Mismo continente/región
    if (continentA === continentB) {
        return true;
    }

    // Verificar conexiones especiales (túneles, puentes)
    const lowerA = countryCodeA.toLowerCase();
    const lowerB = countryCodeB.toLowerCase();
    for (const [c1, c2] of SPECIAL_CONNECTIONS) {
        if ((lowerA === c1 && lowerB === c2) || (lowerA === c2 && lowerB === c1)) {
            return true;
        }
    }

    // Verificar conexiones entre continentes
    for (const [region1, region2] of CONNECTED_REGIONS) {
        if ((continentA === region1 && continentB === region2) ||
            (continentA === region2 && continentB === region1)) {
            return true;
        }
    }

    return false;
}

/**
 * Verifica si existe una ruta real por carretera usando OpenRouteService
 */
async function verifyRouteWithORS(origin: Coord, destination: Coord): Promise<{
    exists: boolean;
    distance_km?: number;
    duration_hours?: number;
    error?: string;
}> {
    try {
        // Usar OpenRouteService API (gratuita, 2000 requests/día)
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${origin.lng},${origin.lat}&end=${destination.lng},${destination.lat}`;

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            // Si es 404 o error de routing, significa que no hay ruta
            if (response.status === 404) {
                return { exists: false, error: 'No se encontró ruta terrestre' };
            }
            throw new Error(`OpenRouteService error: ${response.status}`);
        }

        const data = await response.json();

        if (data.features && data.features[0]) {
            const route = data.features[0];
            const distance_km = route.properties.segments[0].distance / 1000;
            const duration_hours = route.properties.segments[0].duration / 3600;

            return {
                exists: true,
                distance_km,
                duration_hours
            };
        }

        return { exists: false, error: 'No se encontró ruta' };
    } catch (error) {
        // En caso de error de red o API, asumimos que puede existir (fail-safe)
        console.warn('Error verificando ruta con ORS:', error);
        return { exists: true, error: 'No se pudo verificar' };
    }
}

/**
 * Calcula la distancia en línea recta entre dos coordenadas usando fórmula de Haversine
 */
export function haversineKm(a: Coord, b: Coord): number {
    const R = 6371; // Radio de la Tierra en km
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const A = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    const C = 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));
    return R * C;
}

/**
 * Estima la distancia por carretera aplicando un factor de corrección
 */
export function estimateRoadDistanceKm(a: Coord, b: Coord): number {
    const flat = haversineKm(a, b);
    return flat * ROAD_FACTOR;
}

/**
 * Estima las horas de conducción basado en la distancia
 */
export function estimateDrivingHours(distanceKm: number): number {
    return distanceKm / AVG_SPEED_KMH;
}

/**
 * Estima el presupuesto necesario para el viaje
 */
export function estimateBudget(params: {
    distance_km: number;
    days: number;
    n_adults: number;
    vehicle_consumption_l_per_100?: number;
    fuel_price_per_l?: number;
    spending_level?: 'saver' | 'balanced' | 'luxury';
}) {
    const { distance_km, days, n_adults, vehicle_consumption_l_per_100, fuel_price_per_l, spending_level = 'balanced' } = params;
    const nights = Math.max(0, days - 1);

    // Valores base por persona
    const base_aloj_per_noche_person = 40;
    const base_comida_per_day_person = 20;
    const base_activities_per_day_person = 10;

    // Multiplicadores según el nivel de gasto
    const spendingMultipliers = {
        saver: 0.7,      // 30% más barato
        balanced: 1.0,   // Precio base
        luxury: 1.4      // 40% más caro
    };

    const multiplier = spendingMultipliers[spending_level];

    // Aplicar multiplicador a los costes
    const aloj_per_noche_person = base_aloj_per_noche_person * multiplier;
    const comida_per_day_person = base_comida_per_day_person * multiplier;
    const activities_per_day_person = base_activities_per_day_person * multiplier;

    const alojamiento = aloj_per_noche_person * nights * Math.max(1, n_adults);
    const comida = comida_per_day_person * days * Math.max(1, n_adults);
    const activities = activities_per_day_person * days * Math.max(1, n_adults);

    const consumption = vehicle_consumption_l_per_100 ?? DEFAULT_CONSUMPTION_L_PER_100;
    const fuel_price = fuel_price_per_l ?? DEFAULT_FUEL_PRICE;
    const fuel_l = (distance_km / 100) * consumption;
    const fuel_cost = fuel_l * fuel_price;

    const estimate_min = Math.round(alojamiento + comida + activities + fuel_cost);
    const estimate_max = Math.round(estimate_min * 1.8);

    return {
        estimate_min,
        estimate_max,
        fuel_l: Number(fuel_l.toFixed(2)),
        fuel_cost: Number(fuel_cost.toFixed(2))
    };
}

export interface TripValidationResult {
    ok: boolean;
    distance_km?: number;
    driving_hours?: number;
    days?: number;
    min_recommended_days?: number;
    budgetEst?: {
        estimate_min: number;
        estimate_max: number;
        fuel_l: number;
        fuel_cost: number;
    };
    warnings: string[];
    errors: string[];
    routeCheckNeeded?: boolean; // Indica si se necesita verificación con ORS
}

/**
 * Valida un viaje y retorna advertencias y errores (versión síncrona básica)
 */
export function validateTripBasic(params: {
    origin?: Coord | null;
    destination?: Coord | null;
    start_date?: Date | null;
    end_date?: Date | null;
    n_adults?: number;
    budget_total?: number;
    vehicle_consumption_l_per_100?: number;
    spending_level?: 'saver' | 'balanced' | 'luxury';
}): TripValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validar que existan origen y destino
    if (!params.origin || !params.destination) {
        return {
            ok: false,
            warnings: [],
            errors: []
        };
    }

    // Validar que existan fechas
    if (!params.start_date || !params.end_date) {
        return {
            ok: true,
            warnings: [],
            errors: []
        };
    }

    // Calcular distancia y tiempo de conducción
    const distance_km = estimateRoadDistanceKm(params.origin, params.destination);
    const driving_hours = estimateDrivingHours(distance_km);

    // Calcular días del viaje
    const msPerDay = 24 * 3600 * 1000;
    const days = Math.max(1, Math.round((params.end_date.getTime() - params.start_date.getTime()) / msPerDay) + 1);

    // Validar días mínimos necesarios por la conducción
    const min_days_by_drive = Math.ceil(driving_hours / MAX_CONTINUOUS_HOURS);

    // Validaciones críticas (errores)
    if (driving_hours > days * 12) {
        errors.push(`⚠️ El viaje requiere ~${Math.round(driving_hours)}h de conducción para ${days} día${days > 1 ? 's' : ''}. Se necesitan al menos ${min_days_by_drive} días solo para conducir.`);
    }

    // Validaciones de advertencia
    if (driving_hours > days * 8 && driving_hours <= days * 12) {
        warnings.push(`⏱️ El itinerario requiere ~${Math.round(driving_hours)}h de conducción. Considera añadir ${Math.ceil((driving_hours / 8) - days)} día${Math.ceil((driving_hours / 8) - days) > 1 ? 's' : ''} más para mayor comodidad.`);
    }

    if (driving_hours > 10 && days === 1) {
        warnings.push('🚗 Para viajes largos de un día, planifica paradas cada 2-3 horas.');
    }

    // Estimación de presupuesto
    const budgetEst = estimateBudget({
        distance_km,
        days,
        n_adults: params.n_adults ?? 1,
        vehicle_consumption_l_per_100: params.vehicle_consumption_l_per_100,
        spending_level: params.spending_level ?? 'balanced'
    });

    // Validación de presupuesto
    if (params.budget_total) {
        if (params.budget_total < budgetEst.estimate_min * 0.6) {
            errors.push(`💰 El presupuesto de ${params.budget_total}€ es insuficiente. Se estima un mínimo de ${budgetEst.estimate_min}€.`);
        } else if (params.budget_total < budgetEst.estimate_min) {
            warnings.push(`💰 El presupuesto podría ser ajustado. Se recomienda entre ${budgetEst.estimate_min}€ y ${budgetEst.estimate_max}€.`);
        }
    }

    return {
        ok: errors.length === 0,
        distance_km: Math.round(distance_km),
        driving_hours: Number(driving_hours.toFixed(1)),
        days,
        min_recommended_days: min_days_by_drive,
        budgetEst,
        warnings,
        errors
    };
}

/**
 * Valida un viaje incluyendo verificación de conectividad por carretera (versión asíncrona completa)
 */
export async function validateTripComplete(params: {
    origin?: LocationData | null;
    destination?: LocationData | null;
    start_date?: Date | null;
    end_date?: Date | null;
    n_adults?: number;
    budget_total?: number;
    vehicle_consumption_l_per_100?: number;
    spending_level?: 'saver' | 'balanced' | 'luxury';
}): Promise<TripValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validar que existan origen y destino
    if (!params.origin || !params.destination) {
        return {
            ok: false,
            warnings: [],
            errors: []
        };
    }

    const originCoords = params.origin.coords;
    const destinationCoords = params.destination.coords;

    // Validar que existan fechas
    if (!params.start_date || !params.end_date) {
        return {
            ok: true,
            warnings: [],
            errors: []
        };
    }

    // PASO 1: Verificación rápida por continentes
    const originCountryCode = params.origin.country_code;
    const destCountryCode = params.destination.country_code;

    let routeExists = true;
    let actualDistance: number | undefined;
    let actualDuration: number | undefined;

    if (originCountryCode && destCountryCode) {
        const connectedByLand = areRegionsConnectedByLand(originCountryCode, destCountryCode);

        if (!connectedByLand) {
            // Continentes claramente no conectados
            errors.push(`🌍 No existe conexión terrestre entre ${params.origin.country || 'origen'} y ${params.destination.country || 'destino'}. Este viaje no es posible por carretera.`);
            routeExists = false;
        } else {
            // PASO 2: Verificación precisa con OpenRouteService
            // Solo si los continentes están conectados o son dudosos
            const routeCheck = await verifyRouteWithORS(originCoords, destinationCoords);

            if (!routeCheck.exists) {
                errors.push(`🚫 No se encontró una ruta terrestre viable entre estos puntos. Verifica las ubicaciones o considera otra forma de transporte.`);
                routeExists = false;
            } else if (routeCheck.distance_km && routeCheck.duration_hours) {
                // Usar distancia real de ORS en lugar de estimación
                actualDistance = routeCheck.distance_km;
                actualDuration = routeCheck.duration_hours;
            }
        }
    }

    // Si no hay ruta, devolver error inmediatamente
    if (!routeExists) {
        return {
            ok: false,
            warnings,
            errors
        };
    }

    // Calcular distancia y tiempo (usar datos reales de ORS si están disponibles, si no, estimación)
    const distance_km = actualDistance ?? estimateRoadDistanceKm(originCoords, destinationCoords);
    const driving_hours = actualDuration ?? estimateDrivingHours(distance_km);

    // Calcular días del viaje
    const msPerDay = 24 * 3600 * 1000;
    const days = Math.max(1, Math.round((params.end_date.getTime() - params.start_date.getTime()) / msPerDay) + 1);

    // Validar días mínimos necesarios por la conducción
    const min_days_by_drive = Math.ceil(driving_hours / MAX_CONTINUOUS_HOURS);

    // Validaciones críticas (errores)
    if (driving_hours > days * 12) {
        errors.push(`⚠️ El viaje requiere ~${Math.round(driving_hours)}h de conducción para ${days} día${days > 1 ? 's' : ''}. Se necesitan al menos ${min_days_by_drive} días solo para conducir.`);
    }

    // Validaciones de advertencia
    if (driving_hours > days * 8 && driving_hours <= days * 12) {
        warnings.push(`⏱️ El itinerario requiere ~${Math.round(driving_hours)}h de conducción. Considera añadir ${Math.ceil((driving_hours / 8) - days)} día${Math.ceil((driving_hours / 8) - days) > 1 ? 's' : ''} más para mayor comodidad.`);
    }

    if (driving_hours > 10 && days === 1) {
        warnings.push('🚗 Para viajes largos de un día, planifica paradas cada 2-3 horas.');
    }

    // Estimación de presupuesto
    const budgetEst = estimateBudget({
        distance_km,
        days,
        n_adults: params.n_adults ?? 1,
        vehicle_consumption_l_per_100: params.vehicle_consumption_l_per_100,
        spending_level: params.spending_level ?? 'balanced'
    });

    // Validación de presupuesto
    if (params.budget_total) {
        if (params.budget_total < budgetEst.estimate_min * 0.6) {
            errors.push(`💰 El presupuesto de ${params.budget_total}€ es insuficiente. Se estima un mínimo de ${budgetEst.estimate_min}€.`);
        } else if (params.budget_total < budgetEst.estimate_min) {
            warnings.push(`💰 El presupuesto podría ser ajustado. Se recomienda entre ${budgetEst.estimate_min}€ y ${budgetEst.estimate_max}€.`);
        }
    }

    // Información útil adicional
    if (distance_km > 500) {
        warnings.push(`📍 Distancia estimada: ${Math.round(distance_km)}km (~${Math.round(driving_hours)}h de conducción).`);
    }

    return {
        ok: errors.length === 0,
        distance_km: Math.round(distance_km),
        driving_hours: Number(driving_hours.toFixed(1)),
        days,
        min_recommended_days: min_days_by_drive,
        budgetEst,
        warnings,
        errors
    };
}
