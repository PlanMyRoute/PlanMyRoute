import { useAlert } from '@/context/AlertContext';
import CustomDateTimePicker from '@/components/customElements/CustomDateTimePicker';
import { LocationSearchInput } from '@/components/customElements/LocationSearchInput';
import { AccommodationStopForm, ActivityStopForm, RefuelStopForm } from '@/components/newStopForms';
import { FileInfo } from '@/components/trip/FilePicker';
import { useTripContext } from '@/context/TripContext';
import { useCreateAccommodationStop, useCreateActivityStop, useCreateRefuelStop, useStops, useUpdateAccommodationStop, useUpdateActivityStop, useUpdateRefuelStop, useUpdateStop } from '@/hooks/useItinerary';
import { API_URL } from '@/lib/apiClient';
import { supabase } from '@/lib/supabase';
import { ItineraryService } from '@/services/itineraryService';
import { Ionicons } from '@expo/vector-icons';
import { Accommodation, Activity, Refuel, Stop } from '@planmyroute/types';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type StopSubtype = 'activity' | 'accommodation' | 'refuel';

type ActivityData = Partial<Omit<Activity, 'id'>> & { reservationFile?: FileInfo | null; estimated_price?: number };
type AccommodationData = Partial<Omit<Accommodation, 'id'>> & { reservationFile?: FileInfo | null; estimated_price?: number };
type RefuelData = Partial<Omit<Refuel, 'id'>>;

// Extiende Stop con los campos extra que el backend soporta pero el tipo compartido no declara
type StopFormData = Partial<Stop> & {
    day?: number;
    position?: number;
};

type StopFormState = {
    stopData: StopFormData;
    subtype: StopSubtype;
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
        day: 1,
        position: 1,
    },
    subtype: 'activity',
    activityData: {} as any,
    accommodationData: {} as any,
    refuelData: {} as any,
};

// ─── Subtype config ────────────────────────────────────────────────────────────
const SUBTYPES: { key: StopSubtype; label: string; icon: string; desc: string }[] = [
    { key: 'activity', label: 'Actividad', icon: 'star', desc: 'Museo, excursión…' },
    { key: 'accommodation', label: 'Alojamiento', icon: 'bed', desc: 'Hotel, camping…' },
    { key: 'refuel', label: 'Repostaje', icon: 'water', desc: 'Gasolinera…' },
];

// ─── Reusable Section Card ──────────────────────────────────────────────────────
function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
    return (
        <View className="bg-white rounded-3xl overflow-hidden border border-neutral-gray/10 mb-4">
            <View className="flex-row items-center gap-3 px-5 pt-5 pb-3">
                <View className="w-8 h-8 bg-primary-yellow rounded-full items-center justify-center">
                    <Ionicons name={icon as any} size={16} color="#202020" />
                </View>
                <Text className="text-sm font-bold text-dark-black uppercase tracking-widest">{title}</Text>
            </View>
            <View className="px-5 pb-5">{children}</View>
        </View>
    );
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
    return (
        <View className="mb-4">
            <View className="flex-row items-center mb-2 gap-1">
                <Text className="text-xs font-bold text-dark-black uppercase tracking-widest">{label}</Text>
                {required && <Text className="text-xs font-bold text-red-500">*</Text>}
            </View>
            {children}
            {hint && <Text className="text-xs text-neutral-gray mt-1.5 italic">{hint}</Text>}
        </View>
    );
}

export default function AddNewStopScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { currentTrip, tripId } = useTripContext();

    const stopId = params?.stopId as string | undefined;
    const fromStopId = params?.fromStopId as string | undefined;

    const { stops } = useStops(tripId as string, { enabled: !!tripId });
    const [formData, setFormData] = useState<StopFormState>(initialFormState);
    const [originalAddress, setOriginalAddress] = useState<string>('');
    const { showAlert } = useAlert();
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        if (currentTrip?.start_date) return new Date(currentTrip.start_date);
        return new Date();
    });
    const [showTimePicker, setShowTimePicker] = useState(false);

    const isEditing = Boolean(formData.stopData?.id);

    useEffect(() => {
        if (currentTrip?.start_date && formData.stopData.day !== undefined) {
            const startDate = new Date(currentTrip.start_date);
            const newDate = new Date(startDate);
            newDate.setDate(newDate.getDate() + (formData.stopData.day - 1));
            setSelectedDate(newDate);
        }
    }, [formData.stopData.day, currentTrip?.start_date, isEditing]);

    const getTripDays = () => {
        if (!currentTrip?.start_date || !currentTrip?.end_date) return 1;
        const startDate = new Date(currentTrip.start_date);
        const endDate = new Date(currentTrip.end_date);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(1, diffDays);
    };

    const tripDays = getTripDays();

    const getAllowedDays = () => {
        const days = [];
        if (isEditing) { for (let i = 1; i <= tripDays; i++) days.push(i); return days; }
        if (formData.stopData.type === 'origen') { days.push(1); }
        else if (formData.stopData.type === 'destino') {
            if (stops && stops.length > 0) {
                const intermedias = stops.filter((s: any) => s.type === 'intermedia' && s.id !== formData.stopData.id);
                const maxIntermediaDay = intermedias.length > 0 ? Math.max(...intermedias.map((s: any) => s.day ?? 1)) : 1;
                for (let i = maxIntermediaDay; i <= tripDays; i++) days.push(i);
            } else { for (let i = 1; i <= tripDays; i++) days.push(i); }
        } else { for (let i = 1; i <= tripDays; i++) days.push(i); }
        return days.length > 0 ? days : [1];
    };

    const allowedDays = useMemo(() => getAllowedDays(), [formData.stopData.type, stops, tripDays, formData.stopData.id, isEditing]);

    const getIntermediateOrderPreview = () => {
        if (formData.stopData.type !== 'intermedia' || !stops) {
            return { currentPosition: 0, newPosition: 0, totalIntermediates: 0, orderedList: [] };
        }
        const intermediatesInDay = stops.filter((s: any) =>
            s.type === 'intermedia' && (s.day ?? 1) === (formData.stopData.day ?? 1) && s.id !== formData.stopData.id
        );
        const allIntermediates = [
            ...intermediatesInDay,
            { id: formData.stopData.id || 'new', name: formData.stopData.name, estimated_arrival: formData.stopData.estimated_arrival, type: 'intermedia' }
        ];
        const sortedIntermediates = allIntermediates.sort((a: any, b: any) => {
            const dateA = a.estimated_arrival ? new Date(a.estimated_arrival).getTime() : null;
            const dateB = b.estimated_arrival ? new Date(b.estimated_arrival).getTime() : null;
            if (dateA !== null && dateB !== null) return dateA - dateB;
            if (dateA !== null) return -1;
            if (dateB !== null) return 1;
            return Math.random() - 0.5;
        });
        const newPosition = sortedIntermediates.findIndex(s => s.id === (formData.stopData.id || 'new')) + 1;
        const currentPosition = intermediatesInDay.findIndex(s => s.id === formData.stopData.id) + 1 || 0;
        return {
            currentPosition, newPosition,
            totalIntermediates: intermediatesInDay.length + 1,
            orderedList: sortedIntermediates.map((s: any, idx: number) => ({
                name: s.name, position: idx + 1, isCurrent: s.id === (formData.stopData.id || 'new')
            }))
        };
    };

    const orderPreview = useMemo(() => getIntermediateOrderPreview(), [
        formData.stopData.estimated_arrival, formData.stopData.day, formData.stopData.type, stops, formData.stopData.id
    ]);

    const validateOrderRestrictions = (): { valid: boolean; message?: string } => {
        if (!stops || stops.length === 0) return { valid: true };
        if (formData.stopData.type !== 'intermedia') return { valid: true };
        const intermediaDay = Number(formData.stopData.day) || 1;
        const intermediaArrival = formData.stopData.estimated_arrival;
        const origin = stops.find(s => s.type === 'origen');
        const destination = stops.find(s => s.type === 'destino');
        if (!origin || !destination) return { valid: true };
        const originRawDay = (origin as any).day;
        const destRawDay = (destination as any).day;
        if (originRawDay === undefined || originRawDay === null) return { valid: true };
        const originDay = Number(originRawDay);
        const destDay = Number(destRawDay) || tripDays;
        const getHourMinute = (timeStr: string | undefined): string | null => {
            if (!timeStr) return null;
            if (timeStr.match(/^\d{1,2}:\d{1,2}/)) {
                const parts = timeStr.split(':');
                if (parts.length >= 2) {
                    const h = String(parseInt(parts[0])).padStart(2, '0');
                    const m = String(parseInt(parts[1])).padStart(2, '0');
                    return `${h}:${m}`;
                }
            }
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
        const getTimeAsMinutes = (timeStr: string | undefined): number | null => {
            const hm = getHourMinute(timeStr);
            if (!hm) return null;
            const [h, m] = hm.split(':');
            return parseInt(h) * 60 + parseInt(m);
        };
        if (intermediaDay < originDay) return { valid: false, message: 'La parada no puede ser antes que el origen' };
        if (intermediaDay > destDay) return { valid: false, message: 'La parada no puede ser después que el destino' };
        if (intermediaDay === originDay && intermediaArrival && origin.estimated_arrival) {
            const im = getTimeAsMinutes(intermediaArrival);
            const om = getTimeAsMinutes(origin.estimated_arrival);
            if (im !== null && om !== null && im < om) return { valid: false, message: 'La parada no puede ser antes que el origen en este día' };
        }
        if (intermediaDay === destDay && intermediaArrival && destination.estimated_arrival) {
            const im = getTimeAsMinutes(intermediaArrival);
            const dm = getTimeAsMinutes(destination.estimated_arrival);
            if (im !== null && dm !== null && im > dm) return { valid: false, message: 'La parada no puede ser después que el destino en este día' };
        }
        return { valid: true };
    };

    const orderValidation = useMemo(() => validateOrderRestrictions(), [
        formData.stopData.estimated_arrival, formData.stopData.day, formData.stopData.type, stops, tripDays
    ]);

    const extractTimeFromTimestamp = (timestamp: string | undefined): string | undefined => {
        if (!timestamp) return undefined;
        try {
            if (/^\d{2}:\d{2}$/.test(timestamp)) return timestamp;
            if (/^\d{2}:\d{2}:\d{2}$/.test(timestamp)) return timestamp.substring(0, 5);
            try {
                const date = new Date(timestamp);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
                }
            } catch { }
            return undefined;
        } catch (error) {
            return undefined;
        }
    };

    const timeToTimestamp = (time: string | undefined, dayOfTrip?: number): string | undefined => {
        if (!time) return undefined;
        try {
            if (time.includes('T')) return time;
            if (/^\d{1,2}:\d{2}$/.test(time)) {
                const baseDate = currentTrip?.start_date ? new Date(currentTrip.start_date) : new Date();
                if (dayOfTrip && dayOfTrip > 1) baseDate.setDate(baseDate.getDate() + (dayOfTrip - 1));
                const [hoursStr, minutesStr] = time.split(':');
                baseDate.setHours(parseInt(hoursStr, 10), parseInt(minutesStr, 10), 0, 0);
                return baseDate.toISOString();
            }
            return time;
        } catch (error) {
            return undefined;
        }
    };

    useEffect(() => {
        if (stopId) {
            let mounted = true;
            (async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;
                    const stop = await ItineraryService.getStopById(stopId, { token });
                    if (!mounted) return;
                    let detectedSubtype: StopSubtype = 'activity';
                    let subtypeData: any = {};
                    try {
                        const [activityResult, accommodationResult, refuelResult] = await Promise.all([
                            supabase.from('activity').select('*').eq('id', stopId).maybeSingle(),
                            supabase.from('accommodation').select('*').eq('id', stopId).maybeSingle(),
                            supabase.from('refuel').select('*').eq('id', stopId).maybeSingle(),
                        ]);
                        if (activityResult.data) {
                            detectedSubtype = 'activity';
                            subtypeData = { category: activityResult.data.category, entry_price: activityResult.data.entry_price, estimated_duration_minutes: activityResult.data.estimated_duration_minutes, booking_required: activityResult.data.booking_required, url: activityResult.data.url, estimated_price: activityResult.data.estimated_price };
                        } else if (accommodationResult.data) {
                            detectedSubtype = 'accommodation';
                            subtypeData = { url: accommodationResult.data.url, check_in_time: accommodationResult.data.check_in_time, check_out_time: accommodationResult.data.check_out_time, reservation_code: accommodationResult.data.reservation_code, contact: accommodationResult.data.contact, nights: accommodationResult.data.nights, estimated_price: accommodationResult.data.estimated_price };
                        } else if (refuelResult.data) {
                            detectedSubtype = 'refuel';
                            subtypeData = { liters: refuelResult.data.liters, fuel_type: refuelResult.data.fuel_type, total_cost: refuelResult.data.total_cost, price_per_unit: refuelResult.data.price_per_unit, station_brand: refuelResult.data.station_brand, total_price: refuelResult.data.total_price };
                        } else {
                            detectedSubtype = undefined as any;
                        }
                    } catch (subtypeError) { }
                    if (detectedSubtype === 'activity' || detectedSubtype === 'accommodation') {
                        try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (session) {
                                const attachments = await ItineraryService.getStopAttachments(stopId, session.access_token);
                                if (attachments && attachments.length > 0) {
                                    const firstAttachment = attachments[0];
                                    const fileInfo: FileInfo = { uri: firstAttachment.url, name: firstAttachment.file_name, mimeType: firstAttachment.file_type, size: firstAttachment.file_size };
                                    if (detectedSubtype === 'activity') subtypeData.reservationFile = fileInfo;
                                    else if (detectedSubtype === 'accommodation') subtypeData.reservationFile = fileInfo;
                                }
                            }
                        } catch (attachmentError: any) { }
                    }
                    setOriginalAddress(stop.address ?? '');
                    setFormData({
                        stopData: { id: stop.id, name: stop.name, description: stop.description ?? '', address: stop.address ?? '', order: stop.order, estimated_arrival: extractTimeFromTimestamp(stop.estimated_arrival ?? undefined), type: stop.type ?? 'intermedia', coordinates: stop.coordinates, day: (stop as any).day ?? 1, position: 1 },
                        subtype: detectedSubtype,
                        activityData: detectedSubtype === 'activity' ? subtypeData : {},
                        accommodationData: detectedSubtype === 'accommodation' ? subtypeData : {},
                        refuelData: detectedSubtype === 'refuel' ? subtypeData : {},
                    });
                } catch (error) { }
            })();
            return () => { };
        }
        if (fromStopId) {
            let mounted = true;
            (async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;
                    const stop = await ItineraryService.getStopById(fromStopId, { token });
                    if (!mounted) return;
                    setFormData(prev => ({ ...prev, stopData: { ...prev.stopData, name: stop.name ?? prev.stopData.name, description: stop.description ?? prev.stopData.description, address: stop.address ?? prev.stopData.address, coordinates: stop.coordinates ?? prev.stopData.coordinates } }));
                    setOriginalAddress(stop.address ?? '');
                } catch (error) { }
            })();
            return () => { };
        } else {
            setFormData(initialFormState);
            setOriginalAddress('');
        }
    }, [stopId, fromStopId]);

    const createActivityMutation = useCreateActivityStop(tripId as string);
    const createAccommodationMutation = useCreateAccommodationStop(tripId as string);
    const createRefuelMutation = useCreateRefuelStop(tripId as string);
    const updateStopMutation = useUpdateStop(tripId as string);
    const updateActivityMutation = useUpdateActivityStop(tripId as string);
    const updateAccommodationMutation = useUpdateAccommodationStop(tripId as string);
    const updateRefuelMutation = useUpdateRefuelStop(tripId as string);

    const isPending = createActivityMutation.isPending || createAccommodationMutation.isPending || createRefuelMutation.isPending || updateStopMutation.isPending || updateActivityMutation.isPending || updateAccommodationMutation.isPending || updateRefuelMutation.isPending;

    const isDisabled = !formData.stopData.name?.trim() || !formData.stopData.address?.trim() || isPending;

    const updateStopField = (field: keyof StopFormData, value: any) => {
        setFormData(prev => ({ ...prev, stopData: { ...prev.stopData, [field]: value } }));
    };
    const updateSubtype = (subtype: StopSubtype) => {
        setFormData(prev => ({ ...prev, subtype: prev.stopData?.id ? prev.subtype : subtype }));
    };
    const updateActivityField = (field: keyof ActivityData, value: any) => {
        setFormData(prev => ({ ...prev, activityData: { ...prev.activityData, [field]: value } }));
    };
    const updateAccommodationField = (field: keyof AccommodationData, value: any) => {
        setFormData(prev => ({ ...prev, accommodationData: { ...prev.accommodationData, [field]: value } }));
    };
    const updateRefuelField = (field: keyof RefuelData, value: any) => {
        setFormData(prev => ({ ...prev, refuelData: { ...prev.refuelData, [field]: value } }));
    };

    const geocodeStop = async (address: string): Promise<{ latitude: number; longitude: number } | undefined> => {
        try {
            const response = await fetch(`${API_URL}/api/places/autocomplete?input=${encodeURIComponent(address)}&language=es`);
            if (response.ok) {
                const data = await response.json();
                const prediction = data.predictions?.[0];
                if (prediction?.place_id) {
                    const decoded = JSON.parse(atob(prediction.place_id));
                    return { latitude: parseFloat(decoded.lat), longitude: parseFloat(decoded.lng) };
                }
            }
        } catch { }
        return undefined;
    };

    const handleSubmitStop = async () => {
        try {
            const validation = validateOrderRestrictions();
            if (!validation.valid) { showAlert({ title: 'Restricción de orden', message: validation.message || 'No se puede guardar esta parada', type: 'warning' }); return; }
            let coordinates = formData.stopData.coordinates;
            const addressChanged = isEditing && formData.stopData.address !== originalAddress;
            const needsGeocoding = !formData.stopData.coordinates;
            if (needsGeocoding && formData.stopData.address) {
                const newCoordinates = await geocodeStop(formData.stopData.address);
                if (newCoordinates) { coordinates = newCoordinates; }
                else {
                    showAlert({ title: 'Advertencia', message: 'No se pudieron obtener las coordenadas. ¿Deseas continuar?', type: 'warning', actions: [{ text: 'Cancelar', onPress: () => {}, variant: 'outline' }, { text: 'Continuar', onPress: async () => await submitStopData(undefined), variant: 'primary' }] });
                    return;
                }
            }
            await submitStopData(coordinates);
        } catch (error: unknown) {
            showAlert({ title: 'Error', message: `No se pudo ${isEditing ? 'actualizar' : 'crear'} la parada: ${error instanceof Error ? error.message : 'Error desconocido'}`, type: 'error' });
        }
    };

    const submitStopData = async (coordinates: { latitude: number; longitude: number } | undefined) => {
        try {
            // `day` no existe en el tipo Stop del shared package pero el backend sí lo acepta
            const stopData = {
                name: formData.stopData.name,
                description: formData.stopData.description,
                address: formData.stopData.address,
                estimated_arrival: timeToTimestamp(formData.stopData.estimated_arrival ?? undefined, formData.stopData.day),
                type: formData.stopData.type,
                order: formData.stopData.order,
                day: formData.stopData.day,
                coordinates: coordinates ?? formData.stopData.coordinates,
            } as (Partial<Stop> & { day?: number });
            let createdOrUpdatedStopId: string | undefined;
            if (isEditing && formData.stopData.id) {
                const stopId = String(formData.stopData.id);
                createdOrUpdatedStopId = stopId;
                await updateStopMutation.mutateAsync({ stopId, stopData: stopData as Partial<Stop> });
                if (formData.subtype && formData.stopData.type === 'intermedia') {
                    if (formData.subtype === 'activity') { const { reservationFile, ...d } = formData.activityData; await updateActivityMutation.mutateAsync({ stopId, activityData: d as any }); }
                    else if (formData.subtype === 'accommodation') { const { reservationFile, ...d } = formData.accommodationData; await updateAccommodationMutation.mutateAsync({ stopId, accommodationData: d as any }); }
                    else if (formData.subtype === 'refuel') { await updateRefuelMutation.mutateAsync({ stopId, refuelData: formData.refuelData as any }); }
                }
            } else {
                let createdStop;
                if (formData.subtype === 'activity') { const { reservationFile, ...d } = formData.activityData; createdStop = await createActivityMutation.mutateAsync({ stopData: stopData as Partial<Stop>, activityData: d as any }); }
                else if (formData.subtype === 'accommodation') { const { reservationFile, ...d } = formData.accommodationData; createdStop = await createAccommodationMutation.mutateAsync({ stopData: stopData as Partial<Stop>, accommodationData: d as any }); }
                else if (formData.subtype === 'refuel') { createdStop = await createRefuelMutation.mutateAsync({ stopData: stopData as Partial<Stop>, refuelData: formData.refuelData as any }); }
                if (createdStop) {
                    const sid = createdStop.id;
                    if (sid) createdOrUpdatedStopId = String(sid);
                }
            }
            if (createdOrUpdatedStopId && (formData.subtype === 'activity' || formData.subtype === 'accommodation')) {
                const reservationFile = formData.subtype === 'activity' ? formData.activityData.reservationFile : formData.accommodationData.reservationFile;
                if (reservationFile) {
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) throw new Error('No hay sesión activa');
                        await ItineraryService.uploadReservationFile(createdOrUpdatedStopId, reservationFile, session.access_token);
                    } catch (uploadError: unknown) {
                        showAlert({ title: 'Error al subir archivo', message: `La parada se guardó pero hubo un error al subir el archivo: ${uploadError instanceof Error ? uploadError.message : 'Error desconocido'}`, type: 'error' });
                    }
                }
            }
            showAlert({ title: '¡Listo!', message: isEditing ? 'Parada actualizada correctamente' : 'Parada creada correctamente', type: 'success' });
            setTimeout(() => router.back(), 2000);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            let userMessage = errorMessage;
            if (errorMessage.includes('invalid input syntax for type timestamp')) userMessage = 'Error al procesar la hora. Asegúrate de seleccionar una hora válida.';
            showAlert({ title: 'Error', message: `No se pudo ${isEditing ? 'actualizar' : 'crear'} la parada: ${userMessage}`, type: 'error' });
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
            {/* ── Header ── */}
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: '#FFFFFF' },
                    headerShadowVisible: false,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center ml-1">
                            <Ionicons name="arrow-back" size={22} color="#202020" />
                        </TouchableOpacity>
                    ),
                    headerTitle: () => (
                        <View>
                            <Text className="text-lg font-bold text-dark-black">
                                {stopId ? 'Editar parada' : 'Nueva parada'}
                            </Text>
                            {currentTrip?.name && (
                                <Text className="text-xs text-neutral-gray">{currentTrip.name}</Text>
                            )}
                        </View>
                    ),
                }}
            />

            <KeyboardAvoidingView behavior="padding" className="flex-1" keyboardVerticalOffset={120}>
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
                >

                    {/* ── Información básica ── */}
                    <SectionCard title="Información básica" icon="information-circle">
                        <Field label="Nombre" required>
                            <View className="flex-row items-center bg-gray-50 border border-neutral-gray/20 rounded-2xl px-4 py-3.5">
                                <Ionicons name="location-outline" size={18} color="#999999" />
                                <TextInput
                                    placeholder="Ej: Hotel Bielsa"
                                    className="flex-1 text-sm text-dark-black ml-3"
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.stopData.name || ''}
                                    onChangeText={(value) => updateStopField('name', value)}
                                />
                            </View>
                        </Field>

                        <Field label="Dirección" required>
                            <LocationSearchInput
                                value={formData.stopData.address || ''}
                                onLocationSelect={(address, coordinates) => {
                                    updateStopField('address', address);
                                    updateStopField('coordinates', coordinates);
                                }}
                                placeholder="Calle, ciudad o lugar"
                            />
                        </Field>

                        <Field label="Descripción">
                            <View className="bg-gray-50 border border-neutral-gray/20 rounded-2xl px-4 py-3.5">
                                <TextInput
                                    placeholder="Notas adicionales sobre esta parada…"
                                    className="text-sm text-dark-black min-h-[72px]"
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.stopData.description || ''}
                                    onChangeText={(value) => updateStopField('description', value)}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                />
                            </View>
                        </Field>
                    </SectionCard>

                    {/* ── Fecha y hora ── */}
                    <SectionCard title="Fecha y hora" icon="calendar">
                        {/* Fecha */}
                        <Field label="Fecha de la parada">
                            <TouchableOpacity
                                onPress={() => setShowDatePicker(true)}
                                className="flex-row items-center bg-gray-50 border border-neutral-gray/20 rounded-2xl px-4 py-3.5"
                            >
                                <Ionicons name="calendar-outline" size={18} color="#999999" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-sm text-dark-black font-medium">
                                        {selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </Text>
                                    <Text className="text-xs text-neutral-gray mt-0.5">
                                        Día {formData.stopData.day} del viaje
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#999999" />
                            </TouchableOpacity>
                            {formData.stopData.type === 'origen' && (
                                <View className="flex-row items-center mt-2 gap-1.5">
                                    <Ionicons name="lock-closed" size={12} color="#FFD54D" />
                                    <Text className="text-xs text-neutral-gray">El origen siempre está en el Día 1</Text>
                                </View>
                            )}
                            {formData.stopData.type === 'destino' && (
                                <View className="flex-row items-center mt-2 gap-1.5">
                                    <Ionicons name="lock-closed" size={12} color="#FFD54D" />
                                    <Text className="text-xs text-neutral-gray">El destino debe estar después de las intermedias</Text>
                                </View>
                            )}
                        </Field>

                        {/* Hora estimada */}
                        <Field
                            label={formData.stopData.type === 'origen' ? 'Hora de partida' : 'Hora estimada de llegada'}
                            hint={formData.stopData.type === 'intermedia' ? '💡 La hora determina el orden de las paradas intermedias' : undefined}
                        >
                            <TouchableOpacity
                                onPress={() => setShowTimePicker(true)}
                                className="flex-row items-center bg-gray-50 border border-neutral-gray/20 rounded-2xl px-4 py-3.5"
                            >
                                <Ionicons name="time-outline" size={18} color="#999999" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-sm text-dark-black font-medium">
                                        {formData.stopData.estimated_arrival || 'Seleccionar hora'}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#999999" />
                            </TouchableOpacity>
                        </Field>

                        {/* Alerta de restricción */}
                        {!orderValidation.valid && (
                            <View className="flex-row items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 mt-1">
                                <Ionicons name="warning" size={16} color="#EF4444" />
                                <Text className="text-xs text-red-600 font-medium flex-1">{orderValidation.message}</Text>
                            </View>
                        )}

                        {/* Preview de orden */}
                        {formData.stopData.type === 'intermedia' && orderPreview.totalIntermediates > 0 && (
                            <View className={`mt-3 p-4 rounded-2xl border ${!orderValidation.valid ? 'bg-red-50 border-red-200' : 'bg-primary-yellow/10 border-primary-yellow/30'}`}>
                                <Text className={`text-xs font-bold mb-3 ${!orderValidation.valid ? 'text-red-700' : 'text-dark-black'}`}>
                                    Posición {orderPreview.newPosition} de {orderPreview.totalIntermediates}
                                </Text>
                                <View className="gap-1.5">
                                    {orderPreview.orderedList.map((item: any, idx: number) => (
                                        <View
                                            key={idx}
                                            className={`flex-row items-center gap-2 px-3 py-2 rounded-xl ${item.isCurrent ? (!orderValidation.valid ? 'bg-red-200' : 'bg-primary-yellow') : 'bg-white'}`}
                                        >
                                            <Text className={`text-xs font-bold w-5 ${item.isCurrent ? 'text-dark-black' : 'text-neutral-gray'}`}>{item.position}.</Text>
                                            <Text className={`text-xs flex-1 font-medium ${item.isCurrent ? 'text-dark-black' : 'text-neutral-gray'}`}>{item.name}</Text>
                                            {item.isCurrent && (
                                                <View className="bg-dark-black/10 rounded-full px-2 py-0.5">
                                                    <Text className="text-[10px] font-bold text-dark-black">Tú</Text>
                                                </View>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </SectionCard>

                    {/* ── Tipo de parada (solo intermedias) ── */}
                    {formData.stopData.type === 'intermedia' && (
                        <SectionCard title="Tipo de parada" icon="options">
                            <View className="flex-row gap-2 mb-4">
                                {SUBTYPES.map(({ key, label, icon, desc }) => {
                                    const isSelected = formData.subtype === key;
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            onPress={() => updateSubtype(key)}
                                            disabled={isEditing}
                                            className={`flex-1 py-4 rounded-2xl border-2 items-center ${
                                                isSelected
                                                    ? 'bg-primary-yellow border-primary-yellow'
                                                    : isEditing
                                                        ? 'bg-gray-100 border-neutral-gray/20 opacity-50'
                                                        : 'bg-white border-neutral-gray/20'
                                            }`}
                                        >
                                            <Ionicons
                                                name={icon as any}
                                                size={22}
                                                color={isSelected ? '#202020' : '#999999'}
                                            />
                                            <Text className={`text-xs font-bold mt-2 ${isSelected ? 'text-dark-black' : 'text-neutral-gray'}`}>
                                                {label}
                                            </Text>
                                            <Text className={`text-[10px] mt-0.5 text-center px-1 ${isSelected ? 'text-dark-black/70' : 'text-neutral-gray'}`}>
                                                {desc}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {formData.subtype === 'activity' && (
                                <ActivityStopForm activityData={formData.activityData} onUpdateField={updateActivityField} />
                            )}
                            {formData.subtype === 'accommodation' && (
                                <AccommodationStopForm accommodationData={formData.accommodationData} onUpdateField={updateAccommodationField} />
                            )}
                            {formData.subtype === 'refuel' && (
                                <RefuelStopForm refuelData={formData.refuelData} onUpdateField={updateRefuelField} />
                            )}
                        </SectionCard>
                    )}

                    {/* ── Botón de guardar ── */}
                    <TouchableOpacity
                        className={`flex-row items-center justify-center gap-2 py-4 rounded-2xl mt-2 ${(isDisabled || !orderValidation.valid) ? 'bg-neutral-gray/30' : 'bg-dark-black'}`}
                        onPress={handleSubmitStop}
                        disabled={isDisabled || !orderValidation.valid}
                        activeOpacity={0.85}
                    >
                        {isPending ? (
                            <ActivityIndicator color="#FFD54D" />
                        ) : (
                            <>
                                <Ionicons
                                    name={isEditing ? 'checkmark-circle' : 'add-circle'}
                                    size={20}
                                    color={(isDisabled || !orderValidation.valid) ? '#999' : '#FFD54D'}
                                />
                                <Text className={`text-base font-bold ${(isDisabled || !orderValidation.valid) ? 'text-neutral-gray' : 'text-primary-yellow'}`}>
                                    {isEditing ? 'Guardar cambios' : 'Crear parada'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            <CustomDateTimePicker
                value={selectedDate}
                mode="date"
                isVisible={showDatePicker}
                onConfirm={(date) => {
                    setSelectedDate(date);
                    setShowDatePicker(false);
                    if (currentTrip?.start_date) {
                        const startDate = new Date(currentTrip.start_date);
                        const normalizeToDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        const normalizedSelected = normalizeToDate(date);
                        const normalizedStart = normalizeToDate(startDate);
                        const diffTime = normalizedSelected.getTime() - normalizedStart.getTime();
                        let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        diffDays = Math.max(1, diffDays);
                        if (!isEditing && !allowedDays.includes(diffDays)) {
                            showAlert({
                                title: 'Fecha no permitida',
                                message: formData.stopData.type === 'origen' ? 'El Origen debe estar en el Día 1' : formData.stopData.type === 'destino' ? `El Destino debe estar en el Día ${Math.min(...allowedDays)} o posterior` : 'Selecciona una fecha válida',
                                type: 'error',
                            });
                            return;
                        }
                        updateStopField('day', diffDays);
                    }
                }}
                onCancel={() => setShowDatePicker(false)}
                minimumDate={currentTrip?.start_date ? new Date(currentTrip.start_date) : undefined}
            />

            <CustomDateTimePicker
                value={(() => {
                    const time = formData.stopData.estimated_arrival;
                    const date = new Date();
                    if (time) {
                        const [hours, minutes] = time.split(':').map(Number);
                        date.setHours(hours || 0, minutes || 0, 0, 0);
                    } else {
                        date.setHours(12, 0, 0, 0);
                    }
                    return date;
                })()}
                mode="time"
                isVisible={showTimePicker}
                onConfirm={(date) => {
                    setShowTimePicker(false);
                    const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                    updateStopField('estimated_arrival', timeString);
                }}
                onCancel={() => setShowTimePicker(false)}
            />
        </SafeAreaView>
    );
}