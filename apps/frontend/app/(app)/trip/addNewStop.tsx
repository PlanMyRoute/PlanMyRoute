import CustomAlert from '@/components/customElements/CustomAlert';
import CustomDateTimePicker from '@/components/customElements/CustomDateTimePicker';
import { LocationSearchInput } from '@/components/customElements/LocationSearchInput';
import { TimePickerInput } from '@/components/modals/TimePickerInput';
import { AccommodationStopForm, ActivityStopForm, RefuelStopForm } from '@/components/newStopForms';
import { FileInfo } from '@/components/trip/FilePicker';
import { useTripContext } from '@/context/TripContext';
import { useCreateAccommodationStop, useCreateActivityStop, useCreateRefuelStop, useStops, useUpdateAccommodationStop, useUpdateActivityStop, useUpdateRefuelStop, useUpdateStop } from '@/hooks/useItinerary';
import { supabase } from '@/lib/supabase';
import { ItineraryService } from '@/services/itineraryService';
import { Ionicons } from '@expo/vector-icons';
import { Accommodation, Activity, Refuel, Stop } from '@planmyroute/types';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Tipo para identificar el subtipo de parada que se está creando
type StopSubtype = 'activity' | 'accommodation' | 'refuel';

// Usamos los tipos del shared package (sin id ya que aún no existe el stop) + reservationFile
type ActivityData = Partial<Omit<Activity, 'id'>> & { reservationFile?: FileInfo | null };
type AccommodationData = Partial<Omit<Accommodation, 'id'>> & { reservationFile?: FileInfo | null };
type RefuelData = Partial<Omit<Refuel, 'id'>>;

// Estado del formulario usando los tipos del shared
type StopFormState = {
    // Datos de la parada base
    stopData: Partial<Stop>;
    // Subtipo seleccionado
    subtype: StopSubtype;
    // Datos específicos de cada subtipo
    activityData: ActivityData;
    accommodationData: AccommodationData;
    refuelData: RefuelData;
};

const initialFormState: StopFormState = {
    stopData: {
        name: '',
        description: '',
        address: '',
        order: undefined,
        estimated_arrival: undefined,
        type: 'intermedia',
        day: 1, // Nuevo campo para seleccionar el día
        position: 1, // Nuevo campo para seleccionar la posición dentro del día
    },
    subtype: 'activity',
    activityData: {} as any,
    accommodationData: {} as any,
    refuelData: {} as any,
};

export default function AddNewStopScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { currentTrip, tripId } = useTripContext();

    // Obtener stopId directamente de params (más fiable)
    const stopId = params?.stopId as string | undefined;
    const fromStopId = params?.fromStopId as string | undefined;

    // Hook para obtener las paradas del viaje
    const { stops } = useStops(tripId as string, { enabled: !!tripId });

    const [formData, setFormData] = useState<StopFormState>(initialFormState);
    const [originalAddress, setOriginalAddress] = useState<string>('');
    const [alertState, setAlertState] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' }>({
        visible: false,
        title: '',
        message: '',
        type: 'error'
    });

    // Estado para el picker de fecha
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        // Inicializar con la fecha de inicio del viaje
        if (currentTrip?.start_date) {
            return new Date(currentTrip.start_date);
        }
        return new Date();
    });

    // Define isEditing early so it can be used in memoized functions
    const isEditing = Boolean(formData.stopData?.id);

    // Actualizar selectedDate cuando se carga una parada para editar
    // ⚠️ IMPORTANTE: Esta función calcula la fecha basada en el día del viaje
    useEffect(() => {
        if (currentTrip?.start_date && formData.stopData.day !== undefined) {
            const startDate = new Date(currentTrip.start_date);
            const newDate = new Date(startDate);
            newDate.setDate(newDate.getDate() + (formData.stopData.day - 1));
            console.log(`📅 Sincronizando selectedDate: day=${formData.stopData.day} → ${newDate.toLocaleDateString('es-ES')}`);
            setSelectedDate(newDate);
        }
    }, [formData.stopData.day, currentTrip?.start_date, isEditing]);

    // Estado para el modal de posición
    const [showPositionModal, setShowPositionModal] = useState(false);

    // Calcular número de días del viaje
    const getTripDays = () => {
        if (!currentTrip?.start_date || !currentTrip?.end_date) return 1;
        const startDate = new Date(currentTrip.start_date);
        const endDate = new Date(currentTrip.end_date);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir el día inicio y fin
        return Math.max(1, diffDays);
    };

    const tripDays = getTripDays();

    // Obtener paradas del día seleccionado (excluyendo la que se está editando)
    const getStopsInSelectedDay = () => {
        if (!stops || !formData.stopData.day) return [];
        // Mostrar paradas del día seleccionado, PERO EXCLUIR la que se está editando
        return stops
            .filter((stop: any) =>
                stop &&
                stop.id &&
                stop.id !== formData.stopData.id && // ← EXCLUIR el stop que se está editando
                (stop.day === formData.stopData.day || (!stop.day && formData.stopData.day === 1)) // Solo del día seleccionado
            );
    };

    const stopsInSelectedDay = useMemo(() => getStopsInSelectedDay(), [stops, formData.stopData.day, formData.stopData.id]);

    // Calcular días permitidos según el tipo de parada
    const getAllowedDays = () => {
        const days = [];

        // Si estamos editando, permitir cualquier día (el backend validará)
        if (isEditing) {
            for (let i = 1; i <= tripDays; i++) {
                days.push(i);
            }
            return days;
        }

        if (formData.stopData.type === 'origen') {
            // Origen solo puede estar en día 1
            days.push(1);
        } else if (formData.stopData.type === 'destino') {
            // Destino puede estar en día 1 hasta el último día, pero no antes que las intermedias
            if (stops && stops.length > 0) {
                const intermedias = stops.filter((s: any) => s.type === 'intermedia' && s.id !== formData.stopData.id);
                const maxIntermediaDay = intermedias.length > 0
                    ? Math.max(...intermedias.map((s: any) => s.day ?? 1))
                    : 1;

                for (let i = maxIntermediaDay; i <= tripDays; i++) {
                    days.push(i);
                }
            } else {
                for (let i = 1; i <= tripDays; i++) {
                    days.push(i);
                }
            }
        } else {
            // Intermedia puede estar en cualquier día
            for (let i = 1; i <= tripDays; i++) {
                days.push(i);
            }
        }

        return days.length > 0 ? days : [1]; // Fallback a día 1 si está vacío
    };

    const allowedDays = useMemo(() => getAllowedDays(), [formData.stopData.type, stops, tripDays, formData.stopData.id, isEditing]);

    // Calcular el nuevo orden de las paradas intermedias (solo para intermedias)
    const getIntermediateOrderPreview = () => {
        if (formData.stopData.type !== 'intermedia' || !stops) {
            return { currentPosition: 0, newPosition: 0, totalIntermediates: 0, orderedList: [] };
        }

        // Filtrar intermedias del mismo día
        const intermediatesInDay = stops.filter((s: any) =>
            s.type === 'intermedia' &&
            (s.day ?? 1) === (formData.stopData.day ?? 1) &&
            s.id !== formData.stopData.id // Excluir la que se está editando
        );

        // Crear array con la parada actual
        const allIntermediates = [
            ...intermediatesInDay,
            {
                id: formData.stopData.id || 'new',
                name: formData.stopData.name,
                estimated_arrival: formData.stopData.estimated_arrival,
                type: 'intermedia'
            }
        ];

        // Ordenar por fecha estimada
        const sortedIntermediates = allIntermediates.sort((a: any, b: any) => {
            const dateA = a.estimated_arrival ? new Date(a.estimated_arrival).getTime() : null;
            const dateB = b.estimated_arrival ? new Date(b.estimated_arrival).getTime() : null;

            if (dateA !== null && dateB !== null) {
                return dateA - dateB;
            }
            if (dateA !== null) return -1;
            if (dateB !== null) return 1;
            return Math.random() - 0.5;
        });

        const newPosition = sortedIntermediates.findIndex(s => s.id === (formData.stopData.id || 'new')) + 1;
        const currentPosition = intermediatesInDay.findIndex(s => s.id === formData.stopData.id) + 1 || 0;

        return {
            currentPosition,
            newPosition,
            totalIntermediates: intermediatesInDay.length + 1,
            orderedList: sortedIntermediates.map((s: any, idx: number) => ({
                name: s.name,
                position: idx + 1,
                isCurrent: s.id === (formData.stopData.id || 'new')
            }))
        };
    };

    const orderPreview = useMemo(() => getIntermediateOrderPreview(), [
        formData.stopData.estimated_arrival,
        formData.stopData.day,
        formData.stopData.type,
        stops,
        formData.stopData.id
    ]);

    // Función para validar restricciones de orden
    const validateOrderRestrictions = (): { valid: boolean; message?: string } => {
        // Si stops no está cargado aún, permitir (se validará al guardar en backend)
        if (!stops || stops.length === 0) {
            return { valid: true };
        }

        // Solo validar para paradas intermedias
        if (formData.stopData.type !== 'intermedia') {
            return { valid: true };
        }

        // IMPORTANTE: Forzar conversión a número para evitar problemas de comparación string vs number
        const intermediaDay = Number(formData.stopData.day) || 1;
        const intermediaArrival = formData.stopData.estimated_arrival;

        // Obtener origen y destino (sin importar el día)
        const origin = stops.find(s => s.type === 'origen');
        const destination = stops.find(s => s.type === 'destino');

        // Si no hay origen o destino, es válido (el usuario puede crear la primera parada)
        if (!origin || !destination) {
            return { valid: true };
        }

        // Verificar si el origen tiene day definido - si no, no podemos validar correctamente
        const originRawDay = (origin as any).day;
        const destRawDay = (destination as any).day;

        // Si el origen no tiene day definido, no validar (los datos no están completos)
        if (originRawDay === undefined || originRawDay === null) {
            return { valid: true };
        }

        // IMPORTANTE: Forzar conversión a número
        const originDay = Number(originRawDay);
        const destDay = Number(destRawDay) || tripDays; // Si destino no tiene día, usar el último del viaje

        // Helper para extraer solo HH:MM de cualquier formato
        const getHourMinute = (timeStr: string | undefined): string | null => {
            if (!timeStr) return null;
            // Si es formato H:MM o HH:MM (del form) - acepta 1 o 2 dígitos de hora
            if (timeStr.match(/^\d{1,2}:\d{1,2}/)) {
                const parts = timeStr.split(':');
                if (parts.length >= 2) {
                    const h = String(parseInt(parts[0])).padStart(2, '0');
                    const m = String(parseInt(parts[1])).padStart(2, '0');
                    return `${h}:${m}`;
                }
            }
            // Si es timestamp ISO
            try {
                const date = new Date(timeStr);
                if (!isNaN(date.getTime())) {
                    const h = String(date.getHours()).padStart(2, '0');
                    const m = String(date.getMinutes()).padStart(2, '0');
                    return `${h}:${m}`;
                }
            } catch { }
            return null;
        };

        // Helper para convertir HH:MM a minutos desde medianoche (comparación numérica)
        const getTimeAsMinutes = (timeStr: string | undefined): number | null => {
            const hm = getHourMinute(timeStr);
            if (!hm) return null;
            const [h, m] = hm.split(':');
            return parseInt(h) * 60 + parseInt(m);
        };

        // VALIDACIÓN 1: Intermedia NO puede estar en día anterior al origen
        if (intermediaDay < originDay) {
            return {
                valid: false,
                message: '⚠️ La parada intermedia no puede ser antes que el origen'
            };
        }

        // VALIDACIÓN 2: Intermedia NO puede estar en día posterior al destino
        if (intermediaDay > destDay) {
            return {
                valid: false,
                message: '⚠️ La parada intermedia no puede ser después que el destino'
            };
        }

        // VALIDACIÓN 3: Si está en el mismo día que origen, validar hora
        if (intermediaDay === originDay && intermediaArrival && origin.estimated_arrival) {
            const intermediateMinutes = getTimeAsMinutes(intermediaArrival);
            const originMinutes = getTimeAsMinutes(origin.estimated_arrival);

            if (intermediateMinutes !== null && originMinutes !== null && intermediateMinutes < originMinutes) {
                return {
                    valid: false,
                    message: '⚠️ La parada intermedia no puede ser antes que el origen en este día'
                };
            }
        }

        // VALIDACIÓN 4: Si está en el mismo día que destino, validar hora
        if (intermediaDay === destDay && intermediaArrival && destination.estimated_arrival) {
            const intermediateMinutes = getTimeAsMinutes(intermediaArrival);
            const destMinutes = getTimeAsMinutes(destination.estimated_arrival);

            if (intermediateMinutes !== null && destMinutes !== null && intermediateMinutes > destMinutes) {
                return {
                    valid: false,
                    message: '⚠️ La parada intermedia no puede ser después que el destino en este día'
                };
            }
        }

        return { valid: true };
    };

    const orderValidation = useMemo(() => validateOrderRestrictions(), [
        formData.stopData.estimated_arrival,
        formData.stopData.day,
        formData.stopData.type,
        stops,
        tripDays
    ]);

    // Helper function to extract HH:mm from timestamp
    const extractTimeFromTimestamp = (timestamp: string | undefined): string | undefined => {
        if (!timestamp) return undefined;
        try {
            // Si es ya HH:mm, retorna como está
            if (/^\d{2}:\d{2}$/.test(timestamp)) return timestamp;

            // Si es HH:MM:SS
            if (/^\d{2}:\d{2}:\d{2}$/.test(timestamp)) {
                return timestamp.substring(0, 5); // Retorna HH:MM
            }

            // Para timestamp ISO, CONVIERTE a zona horaria local (igual que toLocaleTimeString)
            try {
                const date = new Date(timestamp);
                if (!isNaN(date.getTime())) {
                    // Usa toLocaleTimeString para asegurar misma zona horaria que en la tarjeta
                    const timeString = date.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                    return timeString;
                }
            } catch { }

            return undefined;
        } catch (error) {
            console.warn('Error extracting time from timestamp:', timestamp, error);
            return undefined;
        }
    };

    // Helper function to convert HH:mm to full ISO timestamp
    const timeToTimestamp = (time: string | undefined, dayOfTrip?: number): string | undefined => {
        if (!time) return undefined;
        try {
            // If it's already a full timestamp, return as-is
            if (time.includes('T')) return time;

            // If it's HH:mm or H:mm, convert to ISO timestamp
            if (/^\d{1,2}:\d{2}$/.test(time)) {
                // Calcular la fecha basada en el día del viaje
                const baseDate = currentTrip?.start_date
                    ? new Date(currentTrip.start_date)
                    : new Date();

                // Si se especifica un día, ajustar la fecha
                if (dayOfTrip && dayOfTrip > 1) {
                    baseDate.setDate(baseDate.getDate() + (dayOfTrip - 1));
                }

                // Parsear la hora - maneja tanto "3:00" como "03:00"
                const [hoursStr, minutesStr] = time.split(':');
                const hours = parseInt(hoursStr, 10);
                const minutes = parseInt(minutesStr, 10);

                baseDate.setHours(hours, minutes, 0, 0);

                const isoString = baseDate.toISOString();
                console.log(`⏰ Convertido: ${time} (día ${dayOfTrip || 1}) → ${isoString}`);
                return isoString;
            }

            return time;
        } catch (error) {
            console.error('Error converting time to timestamp:', error);
            return undefined;
        }
    };

    // If opened with a stopId param, prefill basic stop data for editing
    // Also support `fromStopId` to prefill create-form fields from an existing stop
    useEffect(() => {
        // If editing (stopId), priority: load full stop and subtype data
        if (stopId) {
            let mounted = true;
            (async () => {
                try {
                    // Attach session token to avoid 401s on protected endpoints
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;
                    const stop = await ItineraryService.getStopById(stopId, { token });
                    if (!mounted) return;

                    let detectedSubtype: StopSubtype = 'activity';
                    let subtypeData: any = {};

                    try {
                        // Query all three subtype tables in parallel
                        const [activityResult, accommodationResult, refuelResult] = await Promise.all([
                            supabase.from('activity').select('*').eq('id', stopId).maybeSingle(),
                            supabase.from('accommodation').select('*').eq('id', stopId).maybeSingle(),
                            supabase.from('refuel').select('*').eq('id', stopId).maybeSingle(),
                        ]);

                        // Check which table has data for this stop
                        if (activityResult.data) {
                            detectedSubtype = 'activity';
                            subtypeData = {
                                category: activityResult.data.category,
                                entry_price: activityResult.data.entry_price,
                                estimated_duration_minutes: activityResult.data.estimated_duration_minutes,
                                booking_required: activityResult.data.booking_required,
                                url: activityResult.data.url,
                                estimated_price: activityResult.data.estimated_price,
                            };
                            console.log('Detected activity stop:', subtypeData);
                        } else if (accommodationResult.data) {
                            detectedSubtype = 'accommodation';
                            subtypeData = {
                                url: accommodationResult.data.url,
                                check_in_time: accommodationResult.data.check_in_time,
                                check_out_time: accommodationResult.data.check_out_time,
                                reservation_code: accommodationResult.data.reservation_code,
                                contact: accommodationResult.data.contact,
                                nights: accommodationResult.data.nights,
                                estimated_price: accommodationResult.data.estimated_price,
                            };
                            console.log('Detected accommodation stop:', subtypeData);
                        } else if (refuelResult.data) {
                            detectedSubtype = 'refuel';
                            subtypeData = {
                                liters: refuelResult.data.liters,
                                fuel_type: refuelResult.data.fuel_type,
                                total_cost: refuelResult.data.total_cost,
                                price_per_unit: refuelResult.data.price_per_unit,
                                station_brand: refuelResult.data.station_brand,
                                total_price: refuelResult.data.total_price,
                            };
                            console.log('Detected refuel stop:', subtypeData);
                        } else {
                            console.warn('No subtype data found for stop - this is a simple intermedia stop with no activity/accommodation/refuel');
                            detectedSubtype = undefined as any;
                        }
                    } catch (subtypeError) {
                        console.error('Error detecting subtype:', subtypeError);
                        console.warn('Defaulting to activity subtype');
                    }

                    // Cargar adjuntos si es activity o accommodation
                    if (detectedSubtype === 'activity' || detectedSubtype === 'accommodation') {
                        try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (session) {
                                const attachments = await ItineraryService.getStopAttachments(stopId, session.access_token);
                                console.log('📎 Adjuntos cargados:', attachments);

                                // Si hay adjuntos, tomar el primero (asumimos uno por ahora)
                                if (attachments && attachments.length > 0) {
                                    const firstAttachment = attachments[0];
                                    const fileInfo: FileInfo = {
                                        uri: firstAttachment.url,
                                        name: firstAttachment.file_name,
                                        mimeType: firstAttachment.file_type,
                                        size: firstAttachment.file_size
                                    };

                                    if (detectedSubtype === 'activity') {
                                        subtypeData.reservationFile = fileInfo;
                                    } else if (detectedSubtype === 'accommodation') {
                                        subtypeData.reservationFile = fileInfo;
                                    }
                                }
                            }
                        } catch (attachmentError: any) {
                            console.log('📎 No se pudieron cargar adjuntos (puede que no haya ninguno):', attachmentError.message);
                            // No lanzar error, simplemente no hay adjuntos
                        }
                    }

                    // Store original address to detect changes
                    setOriginalAddress(stop.address ?? '');

                    setFormData({
                        stopData: {
                            id: stop.id,
                            name: stop.name,
                            description: stop.description ?? '',
                            address: stop.address ?? '',
                            order: stop.order,
                            estimated_arrival: extractTimeFromTimestamp(stop.estimated_arrival ?? undefined),
                            type: stop.type ?? 'intermedia',
                            coordinates: stop.coordinates,
                            day: (stop as any).day ?? 1,
                            position: 1, // No se usa, pero se mantiene para compatibilidad de tipo
                        },
                        subtype: detectedSubtype,
                        activityData: detectedSubtype === 'activity' ? subtypeData : {},
                        accommodationData: detectedSubtype === 'accommodation' ? subtypeData : {},
                        refuelData: detectedSubtype === 'refuel' ? subtypeData : {},
                    });

                    // Log para debugging
                    console.log('✏️ Stop cargado para editar:', {
                        original_estimated_arrival: stop.estimated_arrival,
                        extracted_time: extractTimeFromTimestamp(stop.estimated_arrival ?? undefined),
                        day: (stop as any).day
                    });
                } catch (error) {
                    console.error('Error fetching stop for edit:', error);
                }
            })();

            return () => { /* mounted flag handled above */ };
        }

        // If creating from an existing stop, prefill base fields but do NOT set id
        if (fromStopId) {
            let mounted = true;
            (async () => {
                try {
                    // Use session token when pre-filling from an existing stop
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;
                    const stop = await ItineraryService.getStopById(fromStopId, { token });
                    if (!mounted) return;

                    // Prefill only base stop fields (name/address/coordinates) for convenience
                    setFormData(prev => ({
                        ...prev,
                        stopData: {
                            ...prev.stopData,
                            name: stop.name ?? prev.stopData.name,
                            description: stop.description ?? prev.stopData.description,
                            address: stop.address ?? prev.stopData.address,
                            coordinates: stop.coordinates ?? prev.stopData.coordinates,
                            // do not copy id or estimated_arrival/order by default
                        }
                    }));

                    setOriginalAddress(stop.address ?? '');
                } catch (error) {
                    console.error('Error fetching stop for prefill (fromStopId):', error);
                }
            })();

            return () => { /* mounted flag handled above */ };
        } else if (fromStopId) {
            // If creating from an existing stop, prefill base fields but do NOT set id
            let mounted = true;
            (async () => {
                try {
                    // Use session token when pre-filling from an existing stop
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;
                    const stop = await ItineraryService.getStopById(fromStopId, { token });
                    if (!mounted) return;

                    // Prefill only base stop fields (name/address/coordinates) for convenience
                    setFormData(prev => ({
                        ...prev,
                        stopData: {
                            ...prev.stopData,
                            name: stop.name ?? prev.stopData.name,
                            description: stop.description ?? prev.stopData.description,
                            address: stop.address ?? prev.stopData.address,
                            coordinates: stop.coordinates ?? prev.stopData.coordinates,
                            // do not copy id or estimated_arrival/order by default
                        }
                    }));

                    setOriginalAddress(stop.address ?? '');
                } catch (error) {
                    console.error('Error fetching stop for prefill (fromStopId):', error);
                }
            })();

            return () => { /* mounted flag handled above */ };
        } else {
            // Default: reset to blank form when no stopId or fromStopId
            setFormData(initialFormState);
            setOriginalAddress('');
        }
    }, [stopId, fromStopId]);

    // Hooks para crear diferentes tipos de paradas
    const createActivityMutation = useCreateActivityStop(tripId as string);
    const createAccommodationMutation = useCreateAccommodationStop(tripId as string);
    const createRefuelMutation = useCreateRefuelStop(tripId as string);

    // Hooks para actualizar paradas (modo edición)
    const updateStopMutation = useUpdateStop(tripId as string);
    const updateActivityMutation = useUpdateActivityStop(tripId as string);
    const updateAccommodationMutation = useUpdateAccommodationStop(tripId as string);
    const updateRefuelMutation = useUpdateRefuelStop(tripId as string);

    // Validación del formulario - solo nombre y dirección son obligatorios
    // isEditing is already defined earlier in the component
    const isDisabled =
        !formData.stopData.name?.trim() ||
        !formData.stopData.address?.trim() ||
        createActivityMutation.isPending ||
        createAccommodationMutation.isPending ||
        createRefuelMutation.isPending ||
        updateStopMutation.isPending ||
        updateActivityMutation.isPending ||
        updateAccommodationMutation.isPending ||
        updateRefuelMutation.isPending;

    // Actualizar campos de la parada base
    const updateStopField = (field: keyof Stop, value: any) => {
        setFormData(prev => ({
            ...prev,
            stopData: { ...prev.stopData, [field]: value }
        }));
    };

    // Actualizar subtipo de parada
    const updateSubtype = (subtype: StopSubtype) => {
        // Prevent changing subtype when editing an existing stop
        setFormData(prev => ({ ...prev, subtype: prev.stopData?.id ? prev.subtype : subtype }));
    };

    // Actualizar campos específicos del subtipo
    const updateActivityField = (field: keyof ActivityData, value: any) => {
        setFormData(prev => ({
            ...prev,
            activityData: { ...prev.activityData, [field]: value }
        }));
    };

    const updateAccommodationField = (field: keyof AccommodationData, value: any) => {
        setFormData(prev => ({
            ...prev,
            accommodationData: { ...prev.accommodationData, [field]: value }
        }));
    };

    const updateRefuelField = (field: keyof RefuelData, value: any) => {
        setFormData(prev => ({
            ...prev,
            refuelData: { ...prev.refuelData, [field]: value }
        }));
    };

    /**
     * Geocodifica una dirección y retorna las coordenadas
     * @param address Dirección a geocodificar
     * @returns Coordenadas o undefined si falla
     */
    const geocodeStop = async (address: string): Promise<{ latitude: number; longitude: number } | undefined> => {
        try {
            console.log('Geocodificando dirección:', address);
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
                {
                    headers: {
                        'User-Agent': 'PlanMyRoute/1.0',
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.length > 0) {
                    const coordinates = {
                        latitude: parseFloat(data[0].lat),
                        longitude: parseFloat(data[0].lon),
                    };
                    console.log('Coordenadas obtenidas:', coordinates);
                    return coordinates;
                } else {
                    console.warn('No se encontraron resultados para la dirección');
                }
            }
        } catch (geocodeError) {
            console.error('Error geocodificando dirección:', geocodeError);
        }
        return undefined;
    };

    /**
     * Maneja el envío de la parada (crear o actualizar)
     * Determina si necesita geocodificar y orquesta todo el flujo
     */
    const handleSubmitStop = async () => {
        try {
            // Validar restricciones de orden ANTES de intentar guardar
            const validation = validateOrderRestrictions();
            if (!validation.valid) {
                Alert.alert('Restricción de orden', validation.message || 'No se puede guardar esta parada');
                return;
            }

            let coordinates = formData.stopData.coordinates;

            // Determinar si necesita geocodificar
            // Solo si: 1. Creando nueva parada O 2. Dirección cambió al editar
            const addressChanged = isEditing && formData.stopData.address !== originalAddress;
            const needsGeocoding = !isEditing || addressChanged;

            // Geocodificar si es necesario
            if (needsGeocoding && formData.stopData.address) {
                const newCoordinates = await geocodeStop(formData.stopData.address);

                if (newCoordinates) {
                    coordinates = newCoordinates;
                } else {
                    // No se pudieron obtener coordenadas, preguntar al usuario
                    Alert.alert(
                        'Advertencia',
                        'No se pudieron obtener las coordenadas para esta dirección. El sistema intentará geocodificarla en el servidor. ¿Deseas continuar?',
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                                text: 'Continuar',
                                onPress: async () => {
                                    await submitStopData(undefined);
                                }
                            }
                        ]
                    );
                    return;
                }
            }

            // Si llegamos aquí, tenemos coordenadas o no las necesitamos
            await submitStopData(coordinates);
        } catch (error: any) {
            console.error('Error al preparar parada:', error);
            const errorMessage = error?.message || error?.toString() || 'Error desconocido';
            Alert.alert('Error', `No se pudo ${isEditing ? 'actualizar' : 'crear'} la parada: ${errorMessage}`);
        }
    };

    /**
     * Envía los datos de la parada al servidor (crear o actualizar)
     */
    const submitStopData = async (coordinates: { latitude: number; longitude: number } | undefined) => {
        try {
            // Preparar datos de la parada base
            const stopData: Partial<Stop> = {
                name: formData.stopData.name,
                description: formData.stopData.description,
                address: formData.stopData.address,
                // Convert HH:mm to full timestamp if needed, pasando el día de la parada
                estimated_arrival: timeToTimestamp(
                    formData.stopData.estimated_arrival ?? undefined,
                    formData.stopData.day
                ),
                type: formData.stopData.type,
                order: formData.stopData.order,
                day: formData.stopData.day,
                // NO enviar position - el backend la calculará automáticamente basado en tipo, fecha y día
                // Only include coordinates if provided or if already exist
                coordinates: coordinates ?? formData.stopData.coordinates,
            };

            let createdOrUpdatedStopId: string | undefined;

            // Si estamos editando una parada existente, usar las mutaciones de actualización
            if (isEditing && formData.stopData.id) {
                const stopId = String(formData.stopData.id);
                createdOrUpdatedStopId = stopId;

                // Primero actualizamos la entidad base (stop)
                await updateStopMutation.mutateAsync({ stopId, stopData });

                // Luego actualizamos los datos del subtipo SOLO si existe (formData.subtype no es undefined/null)
                if (formData.subtype && formData.stopData.type === 'intermedia') {
                    if (formData.subtype === 'activity') {
                        // Excluir reservationFile antes de enviar al backend
                        const { reservationFile, ...activityDataWithoutFile } = formData.activityData;
                        await updateActivityMutation.mutateAsync({ stopId, activityData: activityDataWithoutFile as any });
                    } else if (formData.subtype === 'accommodation') {
                        // Excluir reservationFile antes de enviar al backend
                        const { reservationFile, ...accommodationDataWithoutFile } = formData.accommodationData;
                        await updateAccommodationMutation.mutateAsync({ stopId, accommodationData: accommodationDataWithoutFile as any });
                    } else if (formData.subtype === 'refuel') {
                        await updateRefuelMutation.mutateAsync({ stopId, refuelData: formData.refuelData as any });
                    }
                }
            } else {
                // Crear según el subtipo seleccionado
                let createdStop;
                if (formData.subtype === 'activity') {
                    console.log('🎯 Creando activity con datos:', {
                        hasReservationFile: !!formData.activityData.reservationFile,
                        reservationFileInfo: formData.activityData.reservationFile
                    });
                    console.log('📊 Activity data COMPLETO:', formData.activityData);
                    // Excluir reservationFile antes de enviar al backend
                    const { reservationFile, ...activityDataWithoutFile } = formData.activityData;
                    console.log('📤 Datos que se envían al backend:', activityDataWithoutFile);
                    createdStop = await createActivityMutation.mutateAsync({
                        stopData,
                        activityData: activityDataWithoutFile as any
                    });
                    console.log('✅ Activity creada:', createdStop);
                } else if (formData.subtype === 'accommodation') {
                    console.log('🏨 Creando accommodation con datos:', {
                        hasReservationFile: !!formData.accommodationData.reservationFile,
                        reservationFileInfo: formData.accommodationData.reservationFile
                    });
                    // Excluir reservationFile antes de enviar al backend
                    const { reservationFile, ...accommodationDataWithoutFile } = formData.accommodationData;
                    createdStop = await createAccommodationMutation.mutateAsync({
                        stopData,
                        accommodationData: accommodationDataWithoutFile as any
                    });
                    console.log('✅ Accommodation creada:', createdStop);
                } else if (formData.subtype === 'refuel') {
                    createdStop = await createRefuelMutation.mutateAsync({
                        stopData,
                        refuelData: formData.refuelData as any
                    });
                }

                // Obtener el ID de la parada creada
                if (createdStop) {
                    // La respuesta tiene formato {stop: {...}, activity/accommodation: {...}}
                    const stopId = createdStop.stop?.id || createdStop.id;
                    if (stopId) {
                        createdOrUpdatedStopId = String(stopId);
                        console.log('🆔 Stop ID obtenido:', createdOrUpdatedStopId);
                    } else {
                        console.error('❌ No se pudo obtener el ID de la parada:', createdStop);
                    }
                }
            }

            // Subir archivo de reserva si existe (solo para activity y accommodation)
            if (createdOrUpdatedStopId && (formData.subtype === 'activity' || formData.subtype === 'accommodation')) {
                const reservationFile = formData.subtype === 'activity'
                    ? formData.activityData.reservationFile
                    : formData.accommodationData.reservationFile;

                console.log('🔍 Verificando archivo de reserva:', {
                    stopId: createdOrUpdatedStopId,
                    subtype: formData.subtype,
                    hasFile: !!reservationFile,
                    fileInfo: reservationFile ? { uri: reservationFile.uri, name: reservationFile.name } : null
                });

                if (reservationFile) {
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) {
                            throw new Error('No hay sesión activa');
                        }

                        console.log('📤 Iniciando subida de archivo...');
                        const result = await ItineraryService.uploadReservationFile(
                            createdOrUpdatedStopId,
                            reservationFile,
                            session.access_token
                        );
                        console.log('✅ Archivo subido exitosamente:', result);
                    } catch (uploadError: any) {
                        console.error('❌ Error al subir archivo de reserva:', uploadError);
                        console.error('Error details:', {
                            message: uploadError?.message,
                            stack: uploadError?.stack
                        });
                        // Mostrar el error específico al usuario
                        Alert.alert(
                            'Error al subir archivo',
                            `La parada se creó correctamente pero hubo un error al subir el archivo de reserva:\n\n${uploadError?.message || 'Error desconocido'}\n\nPuedes intentar subirlo más tarde.`,
                            [{ text: 'OK' }]
                        );
                    }
                }
            }

            setAlertState({
                visible: true,
                title: 'Éxito',
                message: isEditing ? 'Parada actualizada correctamente' : 'Parada creada correctamente',
                type: 'success'
            });

            // Navegar después de 2 segundos (esperar a que el backend procese)
            setTimeout(() => {
                router.back();
            }, 2000);
        } catch (error: any) {
            const errorMessage = error?.message || error?.toString() || 'Error desconocido';

            // Mensajes amigables para errores comunes
            let userMessage = errorMessage;

            if (errorMessage.includes('invalid input syntax for type timestamp')) {
                userMessage = 'Error al procesar la hora. Asegúrate de seleccionar una hora válida.';
            } else if (errorMessage.includes('Restricción de orden')) {
                userMessage = errorMessage; // Mantener mensaje de restricción
            } else if (errorMessage.includes('Origen') ||
                errorMessage.includes('Destino') ||
                errorMessage.includes('intermedia')) {
                userMessage = errorMessage; // Mantener mensajes de validación
            } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
                userMessage = 'No se encontró la parada. Intenta recargar la página.';
            } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNRESET')) {
                userMessage = 'Problema de conexión. Por favor intenta de nuevo.';
            }

            console.error('Error al enviar parada:', {
                original: errorMessage,
                friendly: userMessage,
                fullError: error
            });

            setAlertState({
                visible: true,
                title: 'Error',
                message: `No se pudo ${isEditing ? 'actualizar' : 'crear'} la parada:\n\n${userMessage}`,
                type: 'error'
            });
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50" edges={["bottom"]}>
            {/* Header */}
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} className="px-3">
                            <Ionicons name="arrow-back" size={24} color="#374151" />
                        </TouchableOpacity>
                    ),
                    headerTitle: () => (
                        <View className="flex-1">
                            <Text className="text-2xl font-bold text-gray-800">
                                {stopId ? 'Editar Parada' : 'Nueva Parada'}
                            </Text>
                            {currentTrip?.name && (
                                <Text className="text-sm text-gray-500 mt-0.5">
                                    {currentTrip.name}
                                </Text>
                            )}
                        </View>
                    )
                }}
            />
            <KeyboardAvoidingView
                behavior="padding"
                className="flex-1"
                keyboardVerticalOffset={120}
            >

                {/* Formulario */}
                <ScrollView
                    className="flex-1 px-4 py-5"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    contentContainerStyle={{ paddingBottom: insets.bottom + 8 }}
                >
                    <View className="gap-4">
                        {/* Nombre (obligatorio) */}
                        <View>
                            <Text className="text-sm font-semibold text-gray-700 mb-2">
                                Nombre <Text className="text-red-500">*</Text>
                            </Text>
                            <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm">
                                <Ionicons name="location" size={20} color="#6B7280" className="mr-3" />
                                <TextInput
                                    placeholder="Ej: Hotel Barcelona"
                                    className="flex-1 text-base text-gray-800"
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.stopData.name || ''}
                                    onChangeText={(value) => updateStopField('name', value)}
                                />
                            </View>
                        </View>

                        {/* Dirección (obligatorio) */}
                        <View>
                            <Text className="text-sm font-semibold text-gray-700 mb-2">
                                Dirección <Text className="text-red-500">*</Text>
                            </Text>
                            <LocationSearchInput
                                value={formData.stopData.address || ''}
                                onLocationSelect={(address, coordinates) => {
                                    updateStopField('address', address);
                                    updateStopField('coordinates', coordinates);
                                }}
                                placeholder="Calle, ciudad o lugar"
                            />
                        </View>

                        {/* Descripción (opcional) */}
                        <View>
                            <Text className="text-sm font-semibold text-gray-700 mb-2">
                                Descripción
                            </Text>
                            <View className="bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm">
                                <TextInput
                                    placeholder="Notas adicionales sobre esta parada..."
                                    className="text-base text-gray-800 min-h-[80px]"
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.stopData.description || ''}
                                    onChangeText={(value) => updateStopField('description', value)}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        {/* Hora estimada de llegada (opcional) */}
                        {formData.stopData.type === 'intermedia' && (
                            <View>
                                <Text className="text-sm font-semibold text-gray-700 mb-2">
                                    Hora estimada de llegada <Text className="text-blue-500">(Controla el orden)</Text>
                                </Text>
                                <TimePickerInput
                                    value={formData.stopData.estimated_arrival || ''}
                                    onChangeTime={(time) => updateStopField('estimated_arrival', time)}
                                    placeholder="Seleccionar hora"
                                    iconName="time"
                                />
                                <Text className="text-xs text-gray-500 mt-2 italic">
                                    💡 Cambiar la hora reorganizará esta parada entre el origen y destino
                                </Text>

                                {/* Advertencia si hay restricción violada */}
                                {!orderValidation.valid && (
                                    <View className="mt-4 p-3 bg-red-50 rounded-lg border border-red-300">
                                        <Text className="text-xs font-semibold text-red-700">
                                            ⚠️ {orderValidation.message}
                                        </Text>
                                    </View>
                                )}

                                {/* Preview del nuevo orden */}
                                {orderPreview.totalIntermediates > 0 && (
                                    <View className={`mt-4 p-3 rounded-lg border ${!orderValidation.valid
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-blue-50 border-blue-200'
                                        }`}>
                                        <Text className={`text-xs font-semibold mb-2 ${!orderValidation.valid ? 'text-red-700' : 'text-blue-700'
                                            }`}>
                                            📍 Nueva posición: {orderPreview.newPosition} de {orderPreview.totalIntermediates}
                                        </Text>
                                        <View className="space-y-1">
                                            {orderPreview.orderedList.map((item: any, idx: number) => (
                                                <View
                                                    key={idx}
                                                    className={`flex-row items-center px-2 py-1 rounded ${item.isCurrent
                                                        ? !orderValidation.valid ? 'bg-red-200' : 'bg-blue-200'
                                                        : 'bg-white'
                                                        }`}
                                                >
                                                    <Text className={`font-bold text-xs w-6 ${item.isCurrent
                                                        ? !orderValidation.valid ? 'text-red-700' : 'text-blue-700'
                                                        : 'text-gray-600'
                                                        }`}>
                                                        {item.position}.
                                                    </Text>
                                                    <Text className={`text-xs flex-1 ${item.isCurrent
                                                        ? (!orderValidation.valid ? 'text-red-700' : 'text-blue-700') + ' font-semibold'
                                                        : 'text-gray-600'
                                                        }`}>
                                                        {item.name}
                                                    </Text>
                                                    {item.isCurrent && (
                                                        <Text className={`text-xs font-semibold ${!orderValidation.valid ? 'text-red-700' : 'text-blue-700'
                                                            }`}>← Tú</Text>
                                                    )}
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {formData.stopData.type !== 'intermedia' && (
                            <View>
                                <Text className="text-sm font-semibold text-gray-700 mb-2">
                                    {`${formData.stopData.type === 'origen' ? 'Hora estimada de partida' : 'Hora estimada de llegada'}`}
                                </Text>
                                <TimePickerInput
                                    value={formData.stopData.estimated_arrival || ''}
                                    onChangeTime={(time) => updateStopField('estimated_arrival', time)}
                                    placeholder="Seleccionar hora"
                                    iconName="time"
                                />
                            </View>
                        )}

                        {/* Selector de Día del Viaje */}
                        <View>
                            <Text className="text-sm font-semibold text-gray-700 mb-2">
                                Fecha de la parada
                            </Text>

                            <TouchableOpacity
                                onPress={() => setShowDatePicker(true)}
                                className="bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm flex-row items-center"
                            >
                                <Ionicons name="calendar" size={20} color="#6B7280" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-base text-gray-800">
                                        {selectedDate.toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </Text>
                                    <Text className="text-xs text-gray-500">
                                        Día {formData.stopData.day} del viaje
                                    </Text>
                                </View>
                                <Ionicons name="chevron-down" size={20} color="#6B7280" />
                            </TouchableOpacity>

                            {formData.stopData.type === 'origen' && (
                                <Text className="text-blue-600 text-xs mt-2">
                                    🔒 El Origen debe estar siempre en el Día 1
                                </Text>
                            )}
                            {formData.stopData.type === 'destino' && (
                                <Text className="text-blue-600 text-xs mt-2">
                                    🔒 El Destino debe estar en o DESPUÉS de las intermedias
                                </Text>
                            )}
                        </View>

                        {/* Selector de tipo de parada y campos específicos - solo para paradas intermedias */}
                        {formData.stopData.type === 'intermedia' && (
                            <>
                                {/* Selector de tipo de parada */}
                                <View>
                                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                                        Tipo de parada <Text className="text-red-500">*</Text>
                                    </Text>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            onPress={() => updateSubtype('activity')}
                                            disabled={isEditing}
                                            className={`flex-1 py-3 px-3 rounded-xl border-2 ${formData.subtype === 'activity' ? 'bg-indigo-50 border-indigo-600' : isEditing ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-white border-gray-200'}`}
                                        >
                                            <View className="items-center">
                                                <Ionicons
                                                    name="star"
                                                    size={24}
                                                    color={formData.subtype === 'activity' ? '#4F46E5' : '#6B7280'}
                                                />
                                                <Text className={`text-xs font-semibold mt-1 ${formData.subtype === 'activity' ? 'text-indigo-600' : 'text-gray-600'}`}>
                                                    Actividad
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => updateSubtype('accommodation')}
                                            disabled={isEditing}
                                            className={`flex-1 py-3 px-3 rounded-xl border-2 ${formData.subtype === 'accommodation' ? 'bg-indigo-50 border-indigo-600' : isEditing ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-white border-gray-200'}`}
                                        >
                                            <View className="items-center">
                                                <Ionicons
                                                    name="bed"
                                                    size={24}
                                                    color={formData.subtype === 'accommodation' ? '#4F46E5' : '#6B7280'}
                                                />
                                                <Text className={`text-xs font-semibold mt-1 ${formData.subtype === 'accommodation' ? 'text-indigo-600' : 'text-gray-600'}`}>
                                                    Alojamiento
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => updateSubtype('refuel')}
                                            disabled={isEditing}
                                            className={`flex-1 py-3 px-3 rounded-xl border-2 ${formData.subtype === 'refuel' ? 'bg-indigo-50 border-indigo-600' : isEditing ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-white border-gray-200'}`}
                                        >
                                            <View className="items-center">
                                                <Ionicons
                                                    name="water"
                                                    size={24}
                                                    color={formData.subtype === 'refuel' ? '#4F46E5' : '#6B7280'}
                                                />
                                                <Text className={`text-xs font-semibold mt-1 ${formData.subtype === 'refuel' ? 'text-indigo-600' : 'text-gray-600'}`}>
                                                    Repostaje
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Campos específicos según el tipo seleccionado */}
                                {formData.subtype === 'activity' && (
                                    <ActivityStopForm
                                        activityData={formData.activityData}
                                        onUpdateField={updateActivityField}
                                    />
                                )}

                                {formData.subtype === 'accommodation' && (
                                    <AccommodationStopForm
                                        accommodationData={formData.accommodationData}
                                        onUpdateField={updateAccommodationField}
                                    />
                                )}

                                {formData.subtype === 'refuel' && (
                                    <RefuelStopForm
                                        refuelData={formData.refuelData}
                                        onUpdateField={updateRefuelField}
                                    />
                                )}
                            </>
                        )}

                        {/* Botón de crear parada */}
                        <TouchableOpacity
                            className={`bg-indigo-600 py-4 rounded-xl flex-row items-center justify-center gap-2 shadow-lg mt-2 mb-2 ${(isDisabled || !orderValidation.valid) ? 'opacity-50' : ''}`}
                            style={{
                                shadowColor: '#4F46E5',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                            }}
                            onPress={handleSubmitStop}
                            disabled={isDisabled || !orderValidation.valid}
                        >
                            {isDisabled && (createActivityMutation.isPending || createAccommodationMutation.isPending || createRefuelMutation.isPending) ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                                    <Text className="text-white text-base font-bold">
                                        {isEditing ? 'Actualizar Parada' : 'Crear Parada'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <CustomAlert
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                onClose={() => setAlertState({ ...alertState, visible: false })}
            />

            {/* Date Picker Modal */}
            <CustomDateTimePicker
                value={selectedDate}
                mode="date"
                isVisible={showDatePicker}
                onConfirm={(date) => {
                    setSelectedDate(date);
                    setShowDatePicker(false);

                    // Calcular el número de día basándose en la fecha de inicio del viaje
                    if (currentTrip?.start_date) {
                        const startDate = new Date(currentTrip.start_date);

                        // IMPORTANTE: Normalizar ambas fechas a medianoche UTC para evitar problemas de zona horaria
                        const normalizeToDate = (d: Date) => {
                            return new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        };

                        const normalizedSelected = normalizeToDate(date);
                        const normalizedStart = normalizeToDate(startDate);

                        const diffTime = normalizedSelected.getTime() - normalizedStart.getTime();
                        let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        diffDays = Math.max(1, diffDays);

                        // VALIDACIÓN: Verificar si el día es permitido (solo al crear, no al editar)
                        if (!isEditing && !allowedDays.includes(diffDays)) {
                            setAlertState({
                                visible: true,
                                title: 'Fecha no permitida',
                                message: formData.stopData.type === 'origen'
                                    ? 'El Origen debe estar en el Día 1'
                                    : formData.stopData.type === 'destino'
                                        ? `El Destino debe estar en el Día ${Math.min(...allowedDays)} o posterior`
                                        : 'Selecciona una fecha válida',
                                type: 'error'
                            });
                            return; // No cambiar el día
                        }

                        updateStopField('day', diffDays);
                    }
                }}
                onCancel={() => setShowDatePicker(false)}
                minimumDate={currentTrip?.start_date ? new Date(currentTrip.start_date) : undefined}
            />
        </SafeAreaView>
    );
}
