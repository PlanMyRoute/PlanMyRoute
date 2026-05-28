import { LocationSearchInput } from '@/components/customElements/LocationSearchInput';
import { InterestSelector } from '@/components/interests/InterestSelector';
import { useAuth } from '@/context/AuthContext';
import { TripService } from '@/services/tripService';
import { Interest } from '@planmyroute/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

type Params = {
    eventId: string;
    eventName: string;
    city: string;
    country: string;
    countryCode: string;
    address: string;
    lat: string;
    lng: string;
    date: string;
};

type TravelStyle = 'explorer' | 'balanced' | 'sedentary';

const TRAVEL_STYLES: { key: TravelStyle; label: string; description: string }[] = [
    { key: 'explorer',  label: 'Explorador',  description: 'Ciudad que piso, ciudad que exploro' },
    { key: 'balanced',  label: 'Equilibrado',  description: 'Un poco de todo' },
    { key: 'sedentary', label: 'Sedentario',   description: 'Mejor me limito al destino' },
];

function parseEventDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function formatDisplayDate(d: Date) {
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function CreateFromEventScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, token } = useAuth();
    const params = useLocalSearchParams<Params>();

    const {
        eventName = '',
        city = '',
        country = '',
        address = '',
        date = '',
    } = params;

    const eventDate = parseEventDate(date);
    const dayAfter = new Date(eventDate);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const destinationLabel = [address, city, country].filter(Boolean).join(', ') || city || 'Destino del evento';

    const [isAiMode, setIsAiMode] = useState(false);
    const [tripName, setTripName] = useState(`Viaje a ${eventName}`);
    const [origin, setOrigin] = useState('');
    const [startDate, setStartDate] = useState<Date>(eventDate);
    const [endDate, setEndDate] = useState<Date>(dayAfter);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [creating, setCreating] = useState(false);

    // AI mode fields
    const [selectedInterests, setSelectedInterests] = useState<Interest[]>(['leisure']);
    const [travelStyle, setTravelStyle] = useState<TravelStyle>('balanced');

    const isValid = tripName.trim().length > 0 && origin.trim().length > 0 &&
        (!isAiMode || selectedInterests.length > 0);

    const handleCreate = async () => {
        if (!isValid || creating || !user?.id) return;
        setCreating(true);
        try {
            const payload = {
                name: tripName.trim(),
                description: `Viaje al evento: ${eventName}`,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: 'planning' as const,
                n_adults: 1,
                n_children: 0,
                n_babies: 0,
                n_elders: 0,
                n_pets: 0,
                circular: false,
                estimated_price_min: 0,
                estimated_price_max: 500,
                origin: origin.trim(),
                destination: destinationLabel,
                vehicleIds: [],
                travelStyle: isAiMode ? travelStyle : 'balanced',
                type: isAiMode ? selectedInterests : ['leisure'],
            };

            const response = await TripService.createTrip(payload as any, user.id, isAiMode, token || undefined);
            const tripId = response?.trip?.id;

            if (tripId) {
                router.replace(`/trip/${tripId}`);
            } else {
                router.back();
            }
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'No se pudo crear el viaje. Inténtalo de nuevo.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    className="mr-3"
                >
                    <Ionicons name="chevron-back" size={24} color="#202020" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-base font-bold text-dark-black" numberOfLines={1}>
                        Planear viaje al evento
                    </Text>
                    <Text className="text-xs text-gray-500" numberOfLines={1}>
                        {eventName}
                    </Text>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Resumen del evento */}
                <View className="bg-primary-yellow/10 border border-primary-yellow/30 rounded-2xl p-4 mb-5">
                    <View className="flex-row items-center mb-1">
                        <Ionicons name="musical-notes" size={16} color="#202020" />
                        <Text className="text-dark-black font-semibold text-sm ml-2" numberOfLines={2}>
                            {eventName}
                        </Text>
                    </View>
                    {city ? (
                        <View className="flex-row items-center mt-1">
                            <Ionicons name="location-outline" size={14} color="#555" />
                            <Text className="text-gray-600 text-xs ml-1">{destinationLabel}</Text>
                        </View>
                    ) : null}
                    {date ? (
                        <View className="flex-row items-center mt-1">
                            <Ionicons name="calendar-outline" size={14} color="#555" />
                            <Text className="text-gray-600 text-xs ml-1">{formatDisplayDate(eventDate)}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Toggle Manual / Con IA */}
                <View className="flex-row bg-gray-100 rounded-2xl p-1 mb-5">
                    <TouchableOpacity
                        className={`flex-1 py-2.5 rounded-xl items-center ${!isAiMode ? 'bg-white shadow-sm' : ''}`}
                        onPress={() => setIsAiMode(false)}
                        activeOpacity={0.7}
                    >
                        <Text className={`text-sm font-semibold ${!isAiMode ? 'text-dark-black' : 'text-gray-400'}`}>
                            Manual
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-x-1.5 ${isAiMode ? 'bg-dark-black shadow-sm' : ''}`}
                        onPress={() => setIsAiMode(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="sparkles" size={14} color={isAiMode ? '#FFD54D' : '#aaa'} />
                        <Text className={`text-sm font-semibold ${isAiMode ? 'text-primary-yellow' : 'text-gray-400'}`}>
                            Generar con IA
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Nombre del viaje */}
                <Text className="text-sm font-semibold text-dark-black mb-1.5">Nombre del viaje</Text>
                <View className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4">
                    <TextInput
                        className="text-sm text-dark-black"
                        value={tripName}
                        onChangeText={setTripName}
                        placeholder="Nombre del viaje"
                        placeholderTextColor="#aaa"
                        maxLength={80}
                    />
                </View>

                {/* Origen */}
                <Text className="text-sm font-semibold text-dark-black mb-1.5">¿Desde dónde sales?</Text>
                <View className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
                    <LocationSearchInput
                        value={origin}
                        onLocationSelect={(address) => setOrigin(address)}
                        placeholder="Tu ciudad o dirección de salida"
                        showLocationButton
                    />
                </View>

                {/* Destino (solo lectura) */}
                <Text className="text-sm font-semibold text-dark-black mb-1.5">Destino</Text>
                <View className="bg-gray-100 rounded-xl border border-gray-200 px-4 py-3 mb-4 flex-row items-center">
                    <Ionicons name="location" size={16} color="#888" />
                    <Text className="text-gray-500 text-sm ml-2 flex-1" numberOfLines={2}>
                        {destinationLabel}
                    </Text>
                    <View className="bg-gray-200 rounded-full px-2 py-0.5">
                        <Text className="text-gray-400 text-[10px]">Del evento</Text>
                    </View>
                </View>

                {/* Fechas del viaje */}
                <Text className="text-sm font-semibold text-dark-black mb-1.5">Fechas del viaje</Text>
                <View className="flex-row gap-x-3 mb-5">
                    <TouchableOpacity
                        className="flex-1 bg-white rounded-xl border border-gray-200 px-3 py-3"
                        onPress={() => setShowStartPicker(true)}
                    >
                        <Text className="text-[10px] text-gray-400 mb-0.5">Salida</Text>
                        <View className="flex-row items-center">
                            <Ionicons name="calendar-outline" size={14} color="#555" />
                            <Text className="text-dark-black text-sm ml-1.5">{formatDisplayDate(startDate)}</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-1 bg-white rounded-xl border border-gray-200 px-3 py-3"
                        onPress={() => setShowEndPicker(true)}
                    >
                        <Text className="text-[10px] text-gray-400 mb-0.5">Vuelta</Text>
                        <View className="flex-row items-center">
                            <Ionicons name="calendar-outline" size={14} color="#555" />
                            <Text className="text-dark-black text-sm ml-1.5">{formatDisplayDate(endDate)}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {showStartPicker && (
                    <DateTimePicker
                        value={startDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={new Date()}
                        onChange={(_, d) => {
                            setShowStartPicker(Platform.OS === 'ios');
                            if (d) setStartDate(d);
                        }}
                    />
                )}
                {showEndPicker && (
                    <DateTimePicker
                        value={endDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={startDate}
                        onChange={(_, d) => {
                            setShowEndPicker(Platform.OS === 'ios');
                            if (d) setEndDate(d);
                        }}
                    />
                )}

                {/* Opciones de IA (solo en modo IA) */}
                {isAiMode && (
                    <View className="mb-5">
                        <View className="bg-gray-100 rounded-2xl p-4 mb-4">
                            <View className="flex-row items-center mb-1">
                                <Ionicons name="sparkles" size={14} color="#202020" />
                                <Text className="text-dark-black font-semibold text-sm ml-1.5">
                                    La IA planificará tu viaje
                                </Text>
                            </View>
                            <Text className="text-gray-500 text-xs leading-4">
                                Elige tus intereses y cómo te gusta viajar. La IA buscará alojamiento, actividades y restaurantes adaptados al evento.
                            </Text>
                        </View>

                        {/* Intereses */}
                        <Text className="text-sm font-semibold text-dark-black mb-3">Tus intereses</Text>
                        <InterestSelector
                            selectedInterests={selectedInterests}
                            onInterestsChange={setSelectedInterests}
                            multiple={true}
                        />

                        {/* Estilo de viaje */}
                        <Text className="text-sm font-semibold text-dark-black mt-5 mb-3">¿Cómo te gusta viajar?</Text>
                        <View className="flex-row gap-x-2">
                            {TRAVEL_STYLES.map(({ key, label, description }) => (
                                <TouchableOpacity
                                    key={key}
                                    className={`flex-1 rounded-2xl border-2 py-3 px-2 items-center ${travelStyle === key ? 'bg-primary-yellow border-primary-yellow' : 'bg-white border-gray-200'}`}
                                    onPress={() => setTravelStyle(key)}
                                    activeOpacity={0.7}
                                >
                                    <Text className={`text-xs font-bold text-center ${travelStyle === key ? 'text-dark-black' : 'text-gray-700'}`}>
                                        {label}
                                    </Text>
                                    <Text className={`text-[10px] text-center mt-0.5 leading-3 ${travelStyle === key ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {description}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Botón crear */}
                <TouchableOpacity
                    className={`rounded-2xl py-4 items-center justify-center flex-row ${
                        isValid && !creating ? 'bg-dark-black' : 'bg-gray-300'
                    }`}
                    onPress={handleCreate}
                    disabled={!isValid || creating}
                    activeOpacity={0.85}
                >
                    {creating ? (
                        <ActivityIndicator color="#FFD54D" />
                    ) : (
                        <>
                            <Ionicons
                                name={isAiMode ? 'sparkles' : 'map'}
                                size={18}
                                color={isValid ? '#FFD54D' : '#aaa'}
                            />
                            <Text
                                className={`font-bold text-base ml-2 ${
                                    isValid ? 'text-primary-yellow' : 'text-gray-400'
                                }`}
                            >
                                {isAiMode ? 'Generar viaje con IA' : 'Crear viaje'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
