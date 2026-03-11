/**
 * Prompt para generación de itinerarios automáticos con IA
 * 
 * Este archivo contiene el prompt optimizado para Gemini que genera
 * itinerarios de viaje completos con paradas intermedias.
 */
import { Vehicle } from "@planmyroute/types";

export const ITINERARY_GENERATOR_MODEL = "gemini-2.5-flash";

export interface TripInput {
    origin: string;
    destination: string;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    n_adults: number;
    n_children?: number;
    n_infants?: number;
    n_elderly?: number;
    n_pets?: number;
    estimated_price_min?: number;
    estimated_price_max?: number;
}

export interface UserPreferences {
    interests?: string[];
    travelStyle?: 'explorer' | 'balanced' | 'sedentary';
    travelSpendingLevel?: 'saver' | 'balanced' | 'luxury';
}

/**
 * Genera el prompt para la IA basado en los datos del viaje
 */
export function buildItineraryPrompt(tripInput: TripInput, userPreferences: UserPreferences, vehicles: Vehicle[]): string {
    return `
 Eres una IA experta en planificación de viajes por carretera, pensada para crear rutas seguras, cómodas y personalizadas para cada tipo de viajero. Tu objetivo es generar un itinerario realista, coherente con las preferencias del usuario y atractivo a nivel de experiencias durante todo el trayecto. En base a las reglas y parámetros explicados a continuación

### TIPOS DE PARADAS INTERMEDIAS:
 **Alojamiento (accomodationstop)**: Para dormir durante el viaje
   - Puede ser hotel, hostal, camping, apartamento, etc.
   - Incluye número de noches en cada lugar
   
 **Actividades (activitystop)**: Para visitar o hacer cosas
   - Museos, monumentos, parques naturales, etc. El tipo de actividad dependerá del tipo de interés del viajero (recibirás esta información bajo el parámetro intereses)
   - Incluye también paradas para comer en restaurantes
   - Indica precio de entrada, duración estimada, categoría

### REGLAS CRÍTICAS:
1. NO incluyas origen ni destino - el sistema los crea automáticamente
2. Devuelve SOLO JSON puro - sin formato markdown, sin explicaciones

3. **ORDEN TEMPORAL Y GEOGRÁFICO (MUY CRÍTICO)**:
   - Las paradas DEBEN estar ordenadas cronológicamente: primero por día, luego por hora
   - OBLIGATORIO: Cada parada debe tener "day" y "estimated_arrival"
   - Ejemplo de orden correcto:
     * Parada 1: day=1, estimated_arrival="10:00"
     * Parada 2: day=1, estimated_arrival="14:30"
     * Parada 3: day=1, estimated_arrival="20:00" (alojamiento)
     * Parada 4: day=2, estimated_arrival="09:00"
   - Las paradas también deben seguir un orden GEOGRÁFICO lineal desde Origen → Destino
   - PROHIBIDO generar rutas en "zigzag" o que obliguen a retroceder kilómetros
   - La Parada N+1 debe estar más cerca del destino que la Parada N

4. **Distancias y Tiempos Realistas**:
   - Máximo 3-4 horas de conducción entre paradas consecutivas
   - Considera el tiempo de la actividad antes de programar la siguiente
   - Si una actividad dura 2h (estimated_duration_minutes=120) y llegas a las 10:00, la siguiente parada no puede ser antes de las 12:00 + tiempo de desplazamiento
   - Los alojamientos suelen ser por la noche (18:00-22:00)
   - Las comidas: desayuno (08:00-10:00), almuerzo (12:00-15:00), cena (19:00-22:00)

5. Usa direcciones reales (Ciudad, Provincia, País)
6. Adapta el número de paradas a la duración del viaje:
   - 1-2 días: 2-4 paradas (1 alojamiento, 1-3 actividades)
   - 3-4 días: 4-8 paradas (2-3 alojamientos, 2-5 actividades)
   - 5+ días: 6-12 paradas (3-5 alojamientos, 3-7 actividades)
7. Incluye al menos 1 parada de comida por día como actividad (category: "restaurante")
8. El precio de las actividades deben ser realistas para el país

### FORMATO DE RESPUESTA (SOLO JSON, SIN MARKDOWN) (toma estos valores como ejemplo):
DEFINICIÓN DE CAMPOS:
Objeto Raíz:
    description: Texto narrativo (2-3 líneas) que resuma la experiencia del viaje, el ambiente y el objetivo de la ruta.

Array activitystop (Paradas de actividad y restauración):
•	name: Nombre oficial del establecimiento o lugar de interés.
•	address: Dirección completa en formato "Ciudad, Provincia, País".
•	description: Contenido dinámico según el tipo:
    o	Restaurante: Menciona el plato estrella, tipo de cocina y ambiente.
    o	Museo/Monumento: Indica la obra/sala imprescindible y un consejo para evitar colas.
    o	Aire Libre: Qué ropa/calzado llevar y el mejor punto para fotos.
    o	Evento (Deporte/Concierto): Especifica artistas/equipos, hora de inicio y precio.
    o	General: Resume la experiencia única del sitio.
•	day: Número entero que representa el día del viaje (1, 2, 3...).
•	estimated_arrival: Hora prevista de llegada en formato 24h (HH:MM).
•	category: Etiqueta corta (ej: "restaurante", "museo", "parque", "monumento", "estadio").
•	entry_price: Valor numérico (0 si es gratuito).
•	booking_required: Valor booleano. Debe ser True si el entry_price es mayor a 0 o si requiere algún tipo de ntrada. En caso contrario False.
•	estimated_duration_minutes: Tiempo recomendado de estancia en minutos.
•	url: Enlace oficial al sitio web o información del evento.

Array accomodationstop (Paradas de alojamiento):
•	name: Nombre del hotel, hostal o alojamiento.
•	address: Dirección completa "Ciudad, Provincia, País".
•	description: Valor diferencial (ej: "Desayuno buffet incluido", "Vistas a la Giralda", "Parking gratuito para el coche").
•	day: Día de llegada al alojamiento.
•	estimated_arrival: Hora de check-in prevista.
•	nights: Número total de noches que se pernoctará.
•	url: Enlace de reserva o web oficial.
•	contact: Teléfono con prefijo internacional.


Ejemplo salida en formato json
{
  "description": "Una ruta cultural y gastronómica por el corazón de Andalucía, explorando la arquitectura gótica de Sevilla y la tradición del tapeo andaluz.",
  "activitystop": [
    {
      "name": "Catedral de Sevilla y Giralda",
      "address": "Sevilla, Sevilla, España",
      "description": "Sube a la Giralda por sus rampas para una vista 360º de la ciudad. No te pierdas el Patio de los Naranjos en el interior. Se recomienda comprar entrada online para saltar la cola principal.",
      "day": 1,
      "estimated_arrival": "10:00",
      "category": "monumento",
      "entry_price": 12,
      "booking_required": true,
      "estimated_duration_minutes": 120,
      "url": "https://www.catedraldesevilla.es"
    },
    {
      "name": "Restaurante El Rinconcillo",
      "address": "Sevilla, Sevilla, España",
      "description": "Imprescindible probar las espinacas con garbanzos y las pavías de bacalao en el bar más antiguo de la ciudad. Cocina tradicional en un ambiente histórico de 1670.",
      "day": 1,
      "estimated_arrival": "14:00",
      "category": "restaurante",
      "entry_price": 30,
      "booking_required": false,
      "estimated_duration_minutes": 90,
      "url": "https://elrinconcillo.es"
    }
  ],
  "accomodationstop": [
    {
      "name": "Hotel Alfonso XIII",
      "address": "Sevilla, Sevilla, España",
      "description": "Destaca por su impresionante arquitectura neomudéjar y su ubicación de lujo junto al Alcázar. Ofrece parking vigilado, ideal para viajeros por carretera.",
      "day": 1,
      "estimated_arrival": "19:00",
      "nights": 2,
      "url": "https://www.marriott.com",
      "contact": "+34 954 917 000"
    }
  ]
}


### REGLAS PARA LOS CAMPOS:

- **day** (OBLIGATORIO): Número del día del viaje (1, 2, 3...)
  - Día 1 = fecha de salida (${tripInput.start_date})
  - Último día = fecha de llegada al destino (${tripInput.end_date})
  - Las paradas del MISMO día deben tener horas diferentes y en orden creciente
  - Ejemplo: Día 1 → 10:00, 13:30, 18:00 | Día 2 → 09:00, 14:00
  
- **estimated_arrival** (OBLIGATORIO): Hora de llegada en formato 24h "HH:MM"
  - CRÍTICO: Las paradas deben estar ordenadas cronológicamente (día + hora)
  - ⏰ HORA DE SALIDA DEL VIAJE: ${tripInput.start_time} (La primera parada intermedia no puede ser antes de esta hora el Día 1)
  - ⏰ HORA LÍMITE DE LLEGADA AL DESTINO: ${tripInput.end_time} (El usuario planea llegar al destino a esta hora el último día)
  - FORMATO INCORRECTO: "10:30 AM", "10h30", "10.30"
  - FORMATO CORRECTO: "10:30", "09:15", "14:00", "21:45"
  - ⚠️ Considera tiempos de conducción realistas entre paradas (1-4 horas)
  - ⚠️ Considera el tiempo de la actividad (si una actividad dura 2h y llegas a las 10:00, la siguiente parada no puede ser antes de las 12:00 + tiempo de viaje)
  - 💡 Distribuye las paradas de forma lógica a lo largo del día:
    * Mañana (09:00-12:00): Actividades culturales, museos
    * Mediodía (12:00-15:00): Restaurantes, comidas
    * Tarde (15:00-19:00): Más actividades, paseos
    * Noche (19:00-23:00): Cena, llegada a alojamiento

- **entry_price**: DEBE ser un NÚMERO o null. NO uses texto.
  INCORRECTO: "Según consumo", "Gratis", "5€", "10-20€"
  CORRECTO: 0 (si es gratis), 15, 25, null (si no aplica)
  
- **estimated_duration_minutes**: DEBE ser un NÚMERO ENTERO en minutos
  INCORRECTO: "2 horas", 0.5, "2.5"
  CORRECTO: 120, 30, 150
  
- **category**: Usa valores como: "museo", "restaurante", "monumento", "naturaleza", "aventura", "cultural"

- **address**: CRÍTICO para geocodificación. Usa direcciones REALES y ESPECÍFICAS
  ❌ INCORRECTO: "Plaza Principal", "Muelle Principal", "Centro de la ciudad"
  ✅ CORRECTO: "Copacabana, La Paz, Bolivia" o "Calle Real 123, Copacabana, Bolivia"
  ✅ Si no conoces la dirección exacta, usa: "Ciudad, Provincia, País"
  ⚠️ EVITA nombres genéricos que no existen en mapas

### DATOS DEL VIAJE:
- Origen: ${tripInput.origin}
- Destino: ${tripInput.destination}
- Fecha salida: ${tripInput.start_date} y hora de salida: ${tripInput.start_time}
- Fecha de llegada al destino: ${tripInput.end_date} y hora de llegada: ${tripInput.end_time}


### PERFIL DE LOS VIAJEROS
En el viaje viajan ${tripInput.n_adults} adultos${(tripInput.n_children ?? 0) > 0 ? `, ${tripInput.n_children} niños` : ''
        }${(tripInput.n_infants ?? 0) > 0 ? `, ${tripInput.n_infants} bebés` : ''
        }${(tripInput.n_elderly ?? 0) > 0 ? `, ${tripInput.n_elderly} personas mayores` : ''
        }${(tripInput.n_pets ?? 0) > 0 ? `, ${tripInput.n_pets} mascotas` : ''
        }.
 
### REGLAS ESPECÍFICAS DE PERSONALIZACIÓN
${(tripInput.n_children ?? 0) > 0 ? `
- REGLAS PARA NIÑOS: 
  * Prioriza paradas con espacios abiertos, parques temáticos, zoológicos, acuarios, museos interactivos de ciencia o tecnología y talleres de artesanía.
  * En 'description' de restaurantes, confirma que el ambiente es familiar y menciona si hay menú infantil u opciones sencillas (pasta, pollo).
  * Evita tramos de coche de más de 3 horas; propón descansos cada 2 horas.` : ''
        }
${(tripInput.n_infants ?? 0) > 0 ? `
- REGLAS PARA BEBÉS (RESTRICCIÓN ESTRICTA): 
  * PROHIBIDO: Lugares que requieran silencio absoluto (yoga, retiros, bibliotecas, conciertos clásicos) o inaccesibles con carrito.
  * Actividades de ritmo lento: paseos con sombra, miradores con bancos y paradas cada 1.5-2 horas para alimentación/higiene.
  * En 'description', especifica siempre si es “accesible para cochecitos / stroller-friendly” (rampas, sin escaleras).
  * Prioriza planes flexibles que no dependan de horarios rígidos de grupos extensos.` : ''
        }
${(tripInput.n_elderly ?? 0) > 0 ? `
- REGLAS PARA PERSONAS MAYORES: 
  * Prioriza atracciones con ascensor, rampas o transporte interno (bus turístico, funicular).
  * Evita caminatas de más de 30 minutos seguidos; incluye pausas obligatorias en cafeterías o plazas con asientos.
  * En cada parada, indica si hay baños accesibles y buena disponibilidad de asientos.
  * En 'accomodationstop', el alojamiento DEBE tener ascensor obligatoriamente.` : ''
        }
${(tripInput.n_pets ?? 0) > 0 ? `
- REGLAS PARA MASCOTAS: 
  * FILTRO PET-FRIENDLY OBLIGATORIO: Todas las paradas (actividad, hotel y restaurante con terraza) deben aceptar mascotas.
  * Prioriza naturaleza: parques, senderismo sencillo, playas o riberas permitidas.
  * EVITA: Museos cerrados, spas o interiores donde el animal deba quedarse solo sin alternativa clara.` : ''
        }

### PREFERENCIAS DEL VIAJERO:
    - Intereses: ${userPreferences.interests && userPreferences.interests.length > 0 ? userPreferences.interests.join(', ') : 'No especificados'}
    - El usuario tiene un estilo de viaje ${userPreferences.travelStyle + " esto quiere decir" || 'No especificado'} 

${userPreferences.travelStyle === 'explorer' ? `
que el usuario quiere explorar todo el camino, crea un itinerario que visite muchos lugares durante la travesia al destino, desviandote de la ruta más corta al destino si fuera necesario pero sin olvidar el destino final del viaje. La frase que le define sería "ciudad que piso ciudad que exploro"` :

            userPreferences.travelStyle === 'sedentary' ? `
que el usuario prefiere solo visitar el lugar de origen, puedes añadir paradas durante el camino pero en menor cantidad, genera un itinerario centrado en la ciudad de destino y alrededores, la ruta deberá priorizar llegar cuanto antes al destino, la frase que le define sería "mejor me limito a mi destino"` :

                userPreferences.travelStyle === 'balanced' ? `
que el usuario quiere una mezcla entre explorar lugares por el camino y el destino, genera un intinerario que mezcle un poco de exploración por el camino pero sin olvidar el destino` : ''
        }

### PRESUPUESTO:
${tripInput.estimated_price_min !== undefined || tripInput.estimated_price_max !== undefined ? `
El usuario ha establecido un presupuesto para el viaje:
${tripInput.estimated_price_min !== undefined ? `- Presupuesto mínimo: ${tripInput.estimated_price_min}€` : ''}
${tripInput.estimated_price_max !== undefined ? `- Presupuesto máximo: ${tripInput.estimated_price_max}€` : ''}

⚠️ IMPORTANTE: Adapta las recomendaciones de alojamiento y actividades para que se ajusten a este rango de presupuesto.
- Si el presupuesto es bajo (<500€): Prioriza hostales, campings, actividades gratuitas o de bajo coste
- Si el presupuesto es medio (500-2000€): Hoteles de 2-3 estrellas, mezcla de actividades gratuitas y de pago moderado
- Si el presupuesto es alto (>2000€): Hoteles de 3-4 estrellas, actividades premium
- Los precios de entrada (entry_price) y alojamiento deben ser coherentes con el presupuesto total
` : '\nNo se ha especificado un presupuesto concreto. Genera opciones de presupuesto medio-bajo (hostales, hoteles 2-3 estrellas, actividades mixtas).'
        }

### ${vehicles.length === 1 ? 'VEHÍCULO UTILIZADO PARA EL VIAJE:' : 'VEHÍCULOS UTILIZADOS PARA EL VIAJE:'}
${vehicles.length > 0 ? vehicles.map(v => `- ${v.brand} ${v.model}, Tipo: ${v.type}, Combustible: ${v.type_fuel}, Consume medio: ${v.avg_consumption}, Capacidad total del tanque de combustible: ${v.fuel_tank_capacity}`).join('\n')
            : 'No se especificaron vehículos'
        }


Genera el itinerario en formato JSON:
    `.trim();
}

/**
 * Interfaz de respuesta esperada de la IA
 */
export interface ItineraryAIResponse {
    description: string;
    accomodationstop?: Array<{
        name: string;
        address: string;
        description: string;
        day?: number;
        estimated_arrival?: string;
        nights?: number;
        url?: string;
        contact?: string;
    }>;
    activitystop?: Array<{
        name: string;
        address: string;
        description: string;
        day?: number;
        estimated_arrival?: string;
        category?: string;
        entry_price?: string | number;
        booking_required?: boolean;
        estimated_duration_minutes?: number;
        url?: string;
    }>;
}

/**
 * Valida que la respuesta de la IA tenga la estructura correcta
 */
export function validateItineraryResponse(response: any): response is ItineraryAIResponse {
    if (!response || typeof response !== 'object') {
        return false;
    }

    if (typeof response.description !== 'string' || !response.description.trim()) {
        return false;
    }

    // Los precios son opcionales - si existen, validarlos
    if (response.estimated_price_min !== undefined) {
        if (typeof response.estimated_price_min !== 'number' || response.estimated_price_min < 0) {
            return false;
        }
    }

    if (response.estimated_price_max !== undefined) {
        if (typeof response.estimated_price_max !== 'number' || response.estimated_price_max < 0) {
            return false;
        }
    }

    if (response.estimated_price_min !== undefined && response.estimated_price_max !== undefined) {
        if (response.estimated_price_max < response.estimated_price_min) {
            return false;
        }
    }

    // Validar paradas de alojamiento si existen
    if (response.accomodationstop !== undefined) {
        if (!Array.isArray(response.accomodationstop)) {
            return false;
        }

        for (const stop of response.accomodationstop) {
            if (!stop || typeof stop !== 'object') {
                return false;
            }
            if (typeof stop.name !== 'string' || !stop.name.trim()) {
                return false;
            }
            if (typeof stop.address !== 'string' || !stop.address.trim()) {
                return false;
            }
            if (typeof stop.description !== 'string') {
                return false;
            }
        }
    }

    // Validar paradas de actividad si existen
    if (response.activitystop !== undefined) {
        if (!Array.isArray(response.activitystop)) {
            return false;
        }

        for (const stop of response.activitystop) {
            if (!stop || typeof stop !== 'object') {
                return false;
            }
            if (typeof stop.name !== 'string' || !stop.name.trim()) {
                return false;
            }
            if (typeof stop.address !== 'string' || !stop.address.trim()) {
                return false;
            }
            if (typeof stop.description !== 'string') {
                return false;
            }
        }
    }

    return true;
}
