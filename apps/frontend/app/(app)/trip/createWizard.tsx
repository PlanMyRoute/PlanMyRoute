import { BalancedBudgetIcon, BalancedIcon, ExploreIcon, LuxuryIcon, SaverIcon, SedentaryIcon } from '@/components/assets/Icons';
import CustomAlert from '@/components/customElements/CustomAlert';
import CustomButton from '@/components/customElements/CustomButton';
import CustomCalendar, { TripDateRange } from '@/components/customElements/CustomCalendar';
import CustomInput from '@/components/customElements/CustomInput';
import { MicrotextDark, SubtitleSemibold, TextRegular, Title1 } from '@/components/customElements/CustomText';
import DateTimePickerWeb from '@/components/customElements/DateTimePickerWeb';
import { LocationSearchInput } from '@/components/customElements/LocationSearchInput';
import { InterestSelector } from '@/components/interests/InterestSelector';
import { VehicleCard } from '@/components/profile/VehicleCard';
import { VehiclesSection } from '@/components/profile/VehiclesSection';
import Travelers from '@/components/travelers/Travelers';
import { AiTripLoader } from '@/components/trip/AiTripLoader';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useCreateTripWizard } from '@/hooks/trip/useCreateTripWizard';
import useTrips from '@/hooks/useTrips';
import { loadDraftAsync } from '@/hooks/trip/useWizardDraft';
import { toISODate } from '@/utils/formatDate';
import { getActionCost } from '@planmyroute/types';
import '@/index.css';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Platform,
    ScrollView,
    Switch,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Barra de progreso lineal
const ProgressBar = ({ step, totalSteps }: { step: number; totalSteps: number }) => (
    <View className="flex-row px-6 pb-3 gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <View
                key={s}
                className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-primary-yellow' : 'bg-neutral-gray/20'}`}
            />
        ))}
    </View>
);

// Etiquetas descriptivas por paso
const STEP_TITLES: Record<number, { title: string; subtitle: string }> = {
    1: { title: '¿Cuándo y adónde?', subtitle: 'Elige el origen, destino y fechas de tu viaje.' },
    2: { title: '¿Quién viene?', subtitle: 'Indica cuántos viajeros sois e invita a quienes quieras.' },
    3: { title: 'Elige el vehículo', subtitle: 'Selecciona el vehículo con el que vais a viajar.' },
    4: { title: '¿Qué tipo de experiencia buscas?', subtitle: 'La IA usará esto para personalizar tu itinerario.' },
    5: { title: '¿Cuánto te quieres gastar?', subtitle: 'Ajusta el presupuesto y tu perfil de gasto.' },
};

export default function CreateWizardScreen() {
    const router = useRouter();
    const buttonRef = useRef<View>(null);
    const { tripName: paramName, isAi } = useLocalSearchParams<{ tripName: string; isAi: string }>();

    // Local state for intermediate stop date picker
    const [stopDatePickerId, setStopDatePickerId] = useState<string | null>(null);
    const { isPremium } = useSubscription();
    const { user } = useAuth();

    // Fetch user's existing trips for calendar overlap detection
    const { data: allTrips } = useTrips();
    const existingTripRanges = useMemo((): TripDateRange[] => {
        if (!Array.isArray(allTrips)) return [];
        return allTrips
            .filter((t: any) => t.start_date && t.end_date)
            .map((t: any) => ({
                startDate: t.start_date!.slice(0, 10),
                endDate: t.end_date!.slice(0, 10),
                name: t.name || 'Viaje',
            }));
    }, [allTrips]);

    // Restore draft when user taps "Continuar" from the draft banner
    const { continueDraft } = useLocalSearchParams<{ tripName: string; isAi: string; continueDraft?: string }>();
    useEffect(() => {
        if (continueDraft !== 'true' || !user?.id) return;
        loadDraftAsync(user.id).then((draft) => {
            if (draft) wizard.applyDraft(draft);
        });
        // Only run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Coste en tokens del addon ida/vuelta para viajes con IA (0 para premium en acciones gratuitas).
    const roundTripTokenCost = getActionCost('ADDON_ROUNDTRIP', isPremium);

    // La opción circular ya no es Premium: en viajes con IA cuesta tokens (ADDON_ROUNDTRIP),
    // en viajes manuales es gratis. El cobro lo realiza el backend al generar.
    const handleRoundTripToggle = (val: boolean) => {
        basics.setRoundTrip(val);
    };

    const wizard = useCreateTripWizard({
        initialTripName: paramName || '',
        initialIsAi: isAi !== 'false',
        initialStep: 1,
    });

    const refuelTokenCost = getActionCost('ADDON_REFUEL', isPremium);

    const {
        step, totalSteps,
        isAiTrip,
        goNext, goBack,
        isStepValid, isValidating,
        basics,
        travelers,
        travelersList,
        vehicles, vehiclesLoading, selectedVehicles, toggleVehicle, maxVehicles,
        handleAddVehicle, handleEditVehicle, handleDeleteVehicle,
        enableAutoRefuel, setEnableAutoRefuel,
        preferences,
        budget,
        intermediateStops,
        showAiLoader, setButtonCoords,
        showAlert, alertConfig, hideAlert,
    } = wizard;

    const stepInfo = STEP_TITLES[step];

    const handleGoBack = () => {
        if (step === 1) {
            router.navigate(ROUTES.tabsCreateTrip);
        } else {
            goBack();
        }
    };

    const handleButtonPress = () => {
        if (step === totalSteps) {
            buttonRef.current?.measureInWindow((x, y, width, height) => {
                setButtonCoords({ x, y, width, height });
                setTimeout(() => goNext(), 100);
            });
        } else {
            goNext();
        }
    };

    return (
        // edges={['bottom']} only — the Stack header already handles top safe area
        <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: '',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="pr-4">
                            <TextRegular className="text-neutral-gray text-base">Cancelar</TextRegular>
                        </TouchableOpacity>
                    ),
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#FFFFFF' },
                }}
            />

            {/* Barra de progreso */}
            <ProgressBar step={step} totalSteps={totalSteps} />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View className="px-6 pb-6">
                    {/* Título del paso */}
                    {stepInfo && (
                        <View className="mb-6">
                            <Title1 className="mb-1">{stepInfo.title}</Title1>
                            <TextRegular className="text-neutral-gray">{stepInfo.subtitle}</TextRegular>
                        </View>
                    )}

                    {/* --- PASO 1: Origen, Destino, Paradas intermedias, Fechas --- */}
                    {step === 1 && (
                        <View className="gap-5">

                            {/* Route visualization: Origen → Paradas → Destino */}
                            <View>
                                {/* ORIGEN */}
                                <View className="flex-row items-start">
                                    <View style={{ width: 20, alignItems: 'center', paddingTop: 13 }}>
                                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFD54D' }} />
                                    </View>
                                    <View className="flex-1 ml-3">
                                        <SubtitleSemibold className="mb-2">Origen *</SubtitleSemibold>
                                        <LocationSearchInput
                                            placeholder="¿De dónde sales?"
                                            value={basics.origin}
                                            onLocationSelect={(address, coords) => {
                                                basics.setOrigin(address);
                                                basics.setOriginData({
                                                    display_name: address,
                                                    coords: { lat: coords.latitude, lng: coords.longitude },
                                                });
                                            }}
                                            currentCoordinates={basics.originData
                                                ? { latitude: basics.originData.coords.lat, longitude: basics.originData.coords.lng }
                                                : null
                                            }
                                            showLocationButton={true}
                                        />
                                    </View>
                                </View>

                                {/* CONNECTOR LINE + PARADAS INTERMEDIAS */}
                                <View className="flex-row" style={{ alignItems: 'stretch' }}>
                                    <View style={{ width: 20, alignItems: 'center' }}>
                                        <View style={{ width: 2, flex: 1, backgroundColor: '#E0E0E0', marginVertical: 4 }} />
                                    </View>
                                    <View className="flex-1 ml-3 py-3">

                                        {intermediateStops.list.map((stop, idx) => (
                                            <View key={stop.id} className="mb-4">
                                                {/* Stop header */}
                                                <View className="flex-row items-center justify-between mb-2">
                                                    <MicrotextDark className="text-neutral-gray font-medium">
                                                        Parada {idx + 1}
                                                    </MicrotextDark>
                                                    <View className="flex-row items-center gap-1">
                                                        {idx > 0 && (
                                                            <TouchableOpacity
                                                                onPress={() => intermediateStops.moveStop(stop.id, 'up')}
                                                                className="p-1"
                                                                activeOpacity={0.7}
                                                            >
                                                                <Ionicons name="chevron-up" size={16} color="#999999" />
                                                            </TouchableOpacity>
                                                        )}
                                                        {idx < intermediateStops.list.length - 1 && (
                                                            <TouchableOpacity
                                                                onPress={() => intermediateStops.moveStop(stop.id, 'down')}
                                                                className="p-1"
                                                                activeOpacity={0.7}
                                                            >
                                                                <Ionicons name="chevron-down" size={16} color="#999999" />
                                                            </TouchableOpacity>
                                                        )}
                                                        <TouchableOpacity
                                                            onPress={() => intermediateStops.removeStop(stop.id)}
                                                            className="p-1"
                                                            activeOpacity={0.7}
                                                        >
                                                            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>

                                                <LocationSearchInput
                                                    placeholder="¿Dónde paras?"
                                                    value={stop.address}
                                                    onLocationSelect={(address, coords) => {
                                                        intermediateStops.updateStop(stop.id, {
                                                            address,
                                                            name: address,
                                                            coordinates: { lat: coords.latitude, lng: coords.longitude },
                                                        });
                                                    }}
                                                    showLocationButton={true}
                                                />

                                                {/* Optional arrival date */}
                                                <TouchableOpacity
                                                    className="mt-2 pl-1"
                                                    onPress={() => setStopDatePickerId(stop.id)}
                                                    activeOpacity={0.7}
                                                >
                                                    <MicrotextDark
                                                        className={stop.expectedArrivalDate ? 'text-dark-black' : 'text-primary-yellow'}
                                                    >
                                                        {stop.expectedArrivalDate
                                                            ? `Llegada estimada: ${basics.formatDate(stop.expectedArrivalDate)}`
                                                            : '+ Añadir fecha de llegada estimada (opcional)'}
                                                    </MicrotextDark>
                                                </TouchableOpacity>
                                            </View>
                                        ))}

                                        {/* Add stop button */}
                                        <TouchableOpacity
                                            onPress={() => intermediateStops.addStop()}
                                            activeOpacity={0.7}
                                        >
                                            <View className="flex-row items-center gap-2">
                                                <View style={{
                                                    width: 28, height: 28, borderRadius: 14,
                                                    borderWidth: 2, borderColor: 'rgba(153,153,153,0.3)',
                                                    backgroundColor: 'white',
                                                    alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <Ionicons name="add" size={16} color="#666666" />
                                                </View>
                                                <MicrotextDark className="text-neutral-gray">
                                                    Añadir parada obligatoria
                                                </MicrotextDark>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* DESTINO */}
                                <View className="flex-row items-start">
                                    <View style={{ width: 20, alignItems: 'center', paddingTop: 13 }}>
                                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#202020' }} />
                                    </View>
                                    <View className="flex-1 ml-3">
                                        <SubtitleSemibold className="mb-2">Destino *</SubtitleSemibold>
                                        <LocationSearchInput
                                            placeholder="¿A dónde vas?"
                                            value={basics.destination}
                                            onLocationSelect={(address, coords) => {
                                                basics.setDestination(address);
                                                basics.setDestinationData({
                                                    display_name: address,
                                                    coords: { lat: coords.latitude, lng: coords.longitude },
                                                });
                                            }}
                                            currentCoordinates={basics.destinationData
                                                ? { latitude: basics.destinationData.coords.lat, longitude: basics.destinationData.coords.lng }
                                                : null
                                            }
                                            showLocationButton={true}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Helper text when step is incomplete */}
                            {!isStepValid && (basics.origin.length > 0 || basics.destination.length > 0) && (
                                <View className="bg-amber-50 rounded-2xl px-4 py-3">
                                    <MicrotextDark className="text-amber-700">
                                        {intermediateStops.list.some(s => !s.coordinates)
                                            ? 'Selecciona una ubicación para cada parada añadida antes de continuar.'
                                            : 'Selecciona origen y destino de las sugerencias y elige las fechas del viaje.'}
                                    </MicrotextDark>
                                </View>
                            )}

                            {/* Ida y vuelta */}
                            <View className="flex-row items-center justify-between px-4 py-3 bg-white border border-neutral-gray/20 rounded-2xl">
                                <View className="flex-1 mr-4">
                                    <View className="flex-row items-center gap-2 mb-0.5">
                                        <SubtitleSemibold>Ida y vuelta</SubtitleSemibold>
                                        {isAiTrip && roundTripTokenCost > 0 && (
                                            <View className="bg-primary-yellow/20 px-2 py-0.5 rounded-full">
                                                <MicrotextDark className="text-xs font-bold">💎 +{roundTripTokenCost}</MicrotextDark>
                                            </View>
                                        )}
                                    </View>
                                    <MicrotextDark className="text-neutral-gray">
                                        El viaje regresará al punto de partida
                                    </MicrotextDark>
                                </View>
                                <Switch
                                    value={basics.roundTrip}
                                    onValueChange={handleRoundTripToggle}
                                    trackColor={{ false: '#E0E0E0', true: '#FFD54D' }}
                                    thumbColor={basics.roundTrip ? '#202020' : '#FFFFFF'}
                                />
                            </View>

                            {/* Fechas — Calendario de rango */}
                            <View>
                                <SubtitleSemibold className="mb-1">Fechas *</SubtitleSemibold>
                                <MicrotextDark className="text-neutral-gray mb-2">
                                    {!basics.startDate
                                        ? 'Toca el día de salida'
                                        : !basics.endDate
                                            ? 'Ahora toca el día de llegada'
                                            : `${basics.formatDate(basics.startDate)} → ${basics.formatDate(basics.endDate)}`
                                    }
                                </MicrotextDark>
                                <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                    <CustomCalendar
                                        startDate={basics.startDate}
                                        endDate={basics.endDate}
                                        onRangeSelect={(start, end) => {
                                            basics.setStartDate(start);
                                            basics.setEndDate(end);
                                        }}
                                        minDate={new Date()}
                                        existingTrips={existingTripRanges}
                                    />
                                </View>
                            </View>

                            {/* Horas (opcionales) */}
                            <View>
                                <SubtitleSemibold className="mb-1">Hora de salida / llegada al destino</SubtitleSemibold>
                                <MicrotextDark className="text-neutral-gray mb-3">
                                    Opcional — déjalo en blanco si no tienes hora fija
                                </MicrotextDark>
                                <View className="flex-row gap-3">
                                    {Platform.OS === 'web' ? (
                                        <>
                                            <DateTimePickerWeb
                                                value={basics.startTime}
                                                mode="time"
                                                onChange={(t) => basics.setStartTime(t)}
                                                label="Hora salida"
                                                containerClassName="flex-1"
                                            />
                                            <DateTimePickerWeb
                                                value={basics.endTime}
                                                mode="time"
                                                onChange={(t) => basics.setEndTime(t)}
                                                label="Hora llegada al destino"
                                                containerClassName="flex-1"
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <View className="flex-1">
                                                <CustomInput
                                                    label="Hora salida"
                                                    placeholder="HH:MM"
                                                    value={basics.startTime ? basics.formatTime(basics.startTime) : ''}
                                                    onPress={() => basics.setShowStartTimePicker(true)}
                                                    editable={false}
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <CustomInput
                                                    label="Hora llegada al destino"
                                                    placeholder="HH:MM"
                                                    value={basics.endTime ? basics.formatTime(basics.endTime) : ''}
                                                    onPress={() => basics.setShowEndTimePicker(true)}
                                                    editable={false}
                                                />
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* --- PASO 2: Viajeros --- */}
                    {step === 2 && (
                        <View className="gap-6">
                            <View className="gap-3">
                                {[
                                    { key: 'adults' as const, label: 'Adultos', description: 'Mayores de 14 años' },
                                    { key: 'children' as const, label: 'Niños', description: 'De 2 a 14 años' },
                                    { key: 'infants' as const, label: 'Bebés', description: 'Menos de 2 años' },
                                    { key: 'elders' as const, label: 'Mayores', description: 'Más de 65 años' },
                                    { key: 'pets' as const, label: 'Mascotas', description: 'Animales de compañía' },
                                ].map(({ key, label, description }) => {
                                    const count = travelers.travelerCounts[key];
                                    const isMin = count === 0 || (key === 'adults' && count === 1);
                                    return (
                                        <View key={key} className="flex-row items-center justify-between py-1">
                                            <View className="flex-1">
                                                <TextRegular className="text-dark-black mb-0.5">{label}</TextRegular>
                                                <MicrotextDark className="text-neutral-gray">{description}</MicrotextDark>
                                            </View>
                                            <View className="flex-row items-center rounded-full border border-neutral-gray/30 bg-white h-12">
                                                <TouchableOpacity
                                                    onPress={() => travelers.updateTravelerCount(key, -1)}
                                                    disabled={isMin}
                                                    className={`w-12 h-12 items-center justify-center ${isMin ? 'opacity-30' : ''}`}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="remove" size={20} color="#202020" />
                                                </TouchableOpacity>
                                                <View className="w-12 items-center justify-center">
                                                    <TextRegular className="text-dark-black text-center">{count}</TextRegular>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => travelers.updateTravelerCount(key, 1)}
                                                    className="w-12 h-12 items-center justify-center"
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="add" size={20} color="#202020" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Resumen de viajeros */}
                            {(() => {
                                const total = travelers.travelerCounts.adults + travelers.travelerCounts.children + travelers.travelerCounts.infants + travelers.travelerCounts.elders;
                                const pets = travelers.travelerCounts.pets;
                                return total > 0 && (
                                    <View className="bg-primary-yellow/10 rounded-2xl px-4 py-3">
                                        <MicrotextDark className="text-dark-black">
                                            {total} viajero{total !== 1 ? 's' : ''}{pets > 0 ? ` + ${pets} mascota${pets !== 1 ? 's' : ''}` : ''}
                                        </MicrotextDark>
                                    </View>
                                );
                            })()}

                            <Travelers
                                travelers={travelersList}
                                isCreatingTrip
                                onInviteBeforeCreate={(user, role) => travelers.addInvitedUser(user, role)}
                            />
                        </View>
                    )}

                    {/* --- PASO 3: Vehículo --- */}
                    {step === 3 && (
                        <View className="gap-4">
                            {/* Alerta ecológica: demasiados vehículos para los viajeros */}
                            {(() => {
                                const totalTravelers = travelers.travelerCounts.adults + travelers.travelerCounts.children + travelers.travelerCounts.infants + travelers.travelerCounts.elders;
                                const estimatedSeats = selectedVehicles.length * 5;
                                if (selectedVehicles.length > 1 && estimatedSeats > totalTravelers * 2) {
                                    return (
                                        <View className="bg-green-50 border border-green-200 rounded-2xl p-4 flex-row items-start gap-3">
                                            <Ionicons name="leaf-outline" size={20} color="#16A34A" style={{ marginTop: 2 }} />
                                            <View className="flex-1">
                                                <TextRegular className="text-green-800 font-semibold text-sm">
                                                    Sois {totalTravelers} viajeros con {selectedVehicles.length} vehículos
                                                </TextRegular>
                                                <MicrotextDark className="text-green-700 mt-0.5">
                                                    Podríais ir en menos coches y reducir costes y emisiones.
                                                </MicrotextDark>
                                            </View>
                                        </View>
                                    );
                                }
                                return null;
                            })()}
                            <VehiclesSection
                                vehicles={vehicles}
                                loading={vehiclesLoading}
                                maxVehicles={maxVehicles}
                                onAddVehicle={handleAddVehicle}
                                onEditVehicle={handleEditVehicle}
                                onDeleteVehicle={handleDeleteVehicle}
                                onSelectVehicle={toggleVehicle}
                                selectedVehicles={selectedVehicles}
                                isCreatingTrip={true}
                            />

                            {/* Refuel toggle — only for AI trips */}
                            {isAiTrip && (
                                <View className="flex-row items-center justify-between px-4 py-3 bg-white border border-neutral-gray/20 rounded-2xl">
                                    <View className="flex-1 mr-4">
                                        <View className="flex-row items-center gap-2 mb-0.5">
                                            <SubtitleSemibold>Planificador de repostaje</SubtitleSemibold>
                                            {isPremium ? (
                                                <View className="bg-primary-yellow/20 px-2 py-0.5 rounded-full">
                                                    <MicrotextDark className="text-xs font-bold">GRATIS</MicrotextDark>
                                                </View>
                                            ) : refuelTokenCost > 0 ? (
                                                <View className="bg-primary-yellow/20 px-2 py-0.5 rounded-full">
                                                    <MicrotextDark className="text-xs font-bold">+{refuelTokenCost}</MicrotextDark>
                                                </View>
                                            ) : null}
                                        </View>
                                        <MicrotextDark className="text-neutral-gray">
                                            La IA añadirá paradas de repostaje optimizadas en tu ruta
                                        </MicrotextDark>
                                    </View>
                                    <Switch
                                        value={enableAutoRefuel}
                                        onValueChange={setEnableAutoRefuel}
                                        trackColor={{ false: '#E0E0E0', true: '#FFD54D' }}
                                        thumbColor={enableAutoRefuel ? '#202020' : '#FFFFFF'}
                                    />
                                </View>
                            )}

                            {/* Missing vehicle data warning for refuel */}
                            {isAiTrip && enableAutoRefuel && selectedVehicles.length > 0 && (() => {
                                const incomplete = selectedVehicles.filter(
                                    (v) => !v.type_fuel || !v.avg_consumption || !v.fuel_tank_capacity
                                );
                                if (incomplete.length === 0) return null;
                                return (
                                    <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-start gap-3">
                                        <Ionicons name="warning-outline" size={20} color="#D97706" style={{ marginTop: 2 }} />
                                        <View className="flex-1">
                                            <TextRegular className="text-amber-800 font-semibold text-sm">
                                                Datos de vehículo incompletos
                                            </TextRegular>
                                            <MicrotextDark className="text-amber-700 mt-0.5">
                                                {incomplete.map((v) => v.brand ? `${v.brand} ${v.model || ''}`.trim() : 'Vehículo').join(', ')}
                                                {' '}no tiene{incomplete.length === 1 ? '' : 'n'} tipo de combustible, consumo o capacidad del depósito. El planificador de repostaje podría no funcionar correctamente.
                                            </MicrotextDark>
                                        </View>
                                    </View>
                                );
                            })()}

                            {/* Missing vehicle warning when refuel enabled but no vehicle selected */}
                            {isAiTrip && enableAutoRefuel && selectedVehicles.length === 0 && (
                                <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-start gap-3">
                                    <Ionicons name="car-outline" size={20} color="#D97706" style={{ marginTop: 2 }} />
                                    <View className="flex-1">
                                        <MicrotextDark className="text-amber-700">
                                            Selecciona al menos un vehículo para que el planificador de repostaje funcione.
                                        </MicrotextDark>
                                    </View>
                                </View>
                            )}

                            {travelers.invitedUsers.length > 0 && (
                                <View>
                                    <SubtitleSemibold className="mb-3">Vehículos de viajeros invitados</SubtitleSemibold>
                                    {travelers.loadingTravelersVehicles ? (
                                        <View className="bg-neutral-gray/5 rounded-2xl p-6 items-center">
                                            <TextRegular className="text-neutral-gray">Cargando...</TextRegular>
                                        </View>
                                    ) : travelers.travelersVehicles.length === 0 ? (
                                        <View className="bg-neutral-gray/5 rounded-2xl p-6 items-center">
                                            <Ionicons name="car-outline" size={40} color="#999999" />
                                            <TextRegular className="text-neutral-gray text-center mt-2">
                                                Los invitados no tienen vehículos registrados
                                            </TextRegular>
                                        </View>
                                    ) : (
                                        <View className="gap-3">
                                            {travelers.travelersVehicles.map((vehicle) => (
                                                <VehicleCard
                                                    key={vehicle.id}
                                                    vehicle={vehicle}
                                                    onEdit={() => { }}
                                                    onDelete={() => { }}
                                                    isCreatingTrip
                                                    isSelected={selectedVehicles.some(v => v.id === vehicle.id)}
                                                    onPress={() => toggleVehicle(vehicle)}
                                                />
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    )}

                    {/* --- PASO 4: Intereses (solo IA) --- */}
                    {step === 4 && isAiTrip && (
                        <View className="gap-8">
                            <View>
                                <SubtitleSemibold className="mb-4">Tus intereses</SubtitleSemibold>
                                <InterestSelector
                                    selectedInterests={preferences.selectedInterests}
                                    onInterestsChange={preferences.setSelectedInterests}
                                    multiple={true}
                                />
                            </View>
                            <View>
                                <SubtitleSemibold className="mb-4">¿Cómo te gusta viajar?</SubtitleSemibold>
                                <View className="flex-row gap-3">
                                    {[
                                        { key: 'explorer' as const, label: 'Explorador', description: 'Ciudad que piso, ciudad que exploro', icon: ExploreIcon },
                                        { key: 'balanced' as const, label: 'Equilibrado', description: 'Un poco de todo', icon: BalancedIcon },
                                        { key: 'sedentary' as const, label: 'Sedentario', description: 'Mejor me limito a mi destino', icon: SedentaryIcon },
                                    ].map(({ key, label, description, icon: Icon }) => (
                                        <View key={key} className="flex-1">
                                            <TouchableOpacity
                                                onPress={() => preferences.setTravelStyle(key)}
                                                className={`rounded-3xl border-2 items-center justify-center pt-5 pb-4 ${preferences.travelStyle === key ? 'bg-primary-yellow border-primary-yellow' : 'border-neutral-gray/20 bg-white'}`}
                                                activeOpacity={0.7}
                                            >
                                                <Icon width={72} height={72} />
                                                <TextRegular className="text-dark-black text-center mt-2 text-sm">{label}</TextRegular>
                                            </TouchableOpacity>
                                            <MicrotextDark className="text-center text-neutral-gray mt-1.5 px-1 text-xs">{description}</MicrotextDark>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* --- PASO 5: Presupuesto (solo IA) --- */}
                    {step === 5 && isAiTrip && (
                        <View className="gap-8">
                            {/* Perfil de gasto */}
                            <View>
                                <SubtitleSemibold className="mb-4">Tu perfil de gasto</SubtitleSemibold>
                                <View className="flex-row gap-3">
                                    {[
                                        { key: 'saver' as const, label: 'Ahorrador', description: 'Hostels, transporte público, comida local', icon: SaverIcon },
                                        { key: 'balanced' as const, label: 'Equilibrado', description: 'Hoteles 3★, restaurantes variados', icon: BalancedBudgetIcon },
                                        { key: 'luxury' as const, label: 'Derrochador', description: 'Hoteles premium, restaurantes top', icon: LuxuryIcon },
                                    ].map(({ key, label, description, icon: Icon }) => (
                                        <View key={key} className="flex-1">
                                            <TouchableOpacity
                                                onPress={() => budget.setSpendingLevel(key)}
                                                className={`rounded-3xl border-2 items-center justify-center pt-5 pb-4 ${budget.spendingLevel === key ? 'bg-primary-yellow border-primary-yellow' : 'border-neutral-gray/20 bg-white'}`}
                                                activeOpacity={0.7}
                                            >
                                                <Icon width={72} height={72} />
                                                <TextRegular className="text-dark-black text-center mt-2 text-sm">{label}</TextRegular>
                                            </TouchableOpacity>
                                            <MicrotextDark className="text-center text-neutral-gray mt-1.5 px-1 text-xs">{description}</MicrotextDark>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            {/* Slider de presupuesto */}
                            <View>
                                <SubtitleSemibold className="mb-1">Presupuesto total</SubtitleSemibold>
                                {(() => {
                                    const total = travelers.travelerCounts.adults + travelers.travelerCounts.children + travelers.travelerCounts.infants + travelers.travelerCounts.elders;
                                    return (
                                        <MicrotextDark className="text-neutral-gray mb-4">
                                            Para {total} viajero{total !== 1 ? 's' : ''} y {selectedVehicles.length} vehículo{selectedVehicles.length !== 1 ? 's' : ''}
                                        </MicrotextDark>
                                    );
                                })()}

                                <View
                                    className="h-10 mb-6 relative justify-center"
                                    onLayout={(e) => budget.setSliderWidth(e.nativeEvent.layout.width)}
                                >
                                    <View className="absolute h-2 bg-neutral-gray/20 w-full rounded-full" />
                                    <View
                                        className="absolute h-2 bg-primary-yellow rounded-full"
                                        style={{
                                            left: budget.getPositionFromValue(budget.minBudget),
                                            width: budget.getPositionFromValue(budget.maxBudget) - budget.getPositionFromValue(budget.minBudget),
                                        }}
                                    />
                                    <View
                                        {...budget.minPanResponder.panHandlers}
                                        className="absolute w-8 h-8 rounded-full bg-primary-yellow border-4 border-white shadow-lg"
                                        style={{ left: budget.getPositionFromValue(budget.minBudget) - 16 }}
                                    />
                                    <View
                                        {...budget.maxPanResponder.panHandlers}
                                        className="absolute w-8 h-8 rounded-full bg-primary-yellow border-4 border-white shadow-lg"
                                        style={{ left: budget.getPositionFromValue(budget.maxBudget) - 16 }}
                                    />
                                </View>

                                <View className="flex-row gap-4">
                                    <View className="flex-1">
                                        <CustomInput
                                            value={budget.minBudgetInput}
                                            onChangeText={budget.handleMinBudgetInputChange}
                                            onBlur={budget.handleMinBudgetBlur}
                                            keyboardType="numeric"
                                            placeholder="50"
                                            inputClassName="text-center text-base font-semibold"
                                            rightElement={<TextRegular className="text-neutral-gray pr-3">€</TextRegular>}
                                        />
                                        <MicrotextDark className="text-neutral-gray mt-1 text-center">Mínimo</MicrotextDark>
                                    </View>
                                    <View className="flex-1">
                                        <CustomInput
                                            value={budget.maxBudgetInput}
                                            onChangeText={budget.handleMaxBudgetInputChange}
                                            onBlur={budget.handleMaxBudgetBlur}
                                            keyboardType="numeric"
                                            placeholder="1000"
                                            inputClassName="text-center text-base font-semibold"
                                            rightElement={<TextRegular className="text-neutral-gray pr-3">€</TextRegular>}
                                        />
                                        <MicrotextDark className="text-neutral-gray mt-1 text-center">Máximo</MicrotextDark>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* --- NAVEGACIÓN --- */}
            <View className="px-6 pt-3 pb-4 bg-white border-t border-neutral-gray/10">
                <View className="flex-row gap-3">
                    <View className="flex-1">
                        <CustomButton
                            variant="dark"
                            title={
                                <View className="flex-row items-center justify-center gap-2">
                                    <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
                                    <TextRegular style={{ color: '#FFFFFF' }}>Anterior</TextRegular>
                                </View>
                            }
                            onPress={handleGoBack}
                            disabled={showAiLoader}
                        />
                    </View>
                    <View ref={buttonRef} collapsable={false} className="flex-1">
                        <CustomButton
                            variant="primary"
                            title={
                                <View className="flex-row items-center justify-center gap-2">
                                    <TextRegular className="text-dark-black">
                                        {isValidating ? 'Validando...' : step === totalSteps ? 'Crear Viaje' : 'Siguiente'}
                                    </TextRegular>
                                    {!isValidating && <Ionicons name="arrow-forward" size={16} color="#202020" />}
                                </View>
                            }
                            onPress={handleButtonPress}
                            disabled={!isStepValid || showAiLoader || isValidating}
                            loading={isValidating}
                        />
                    </View>
                </View>
            </View>

            {/* TimePickers (native) */}
            {basics.showStartTimePicker && (
                <DateTimePicker
                    value={basics.startTime || new Date()}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, time) => { basics.setShowStartTimePicker(false); if (time) basics.setStartTime(time); }}
                />
            )}
            {basics.showEndTimePicker && (
                <DateTimePicker
                    value={basics.endTime || new Date()}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, time) => { basics.setShowEndTimePicker(false); if (time) basics.setEndTime(time); }}
                />
            )}

            {/* Date picker for intermediate stop arrival date (native only) */}
            {stopDatePickerId && Platform.OS !== 'web' && (
                <DateTimePicker
                    value={
                        intermediateStops.list.find(s => s.id === stopDatePickerId)?.expectedArrivalDate
                        || basics.startDate
                        || new Date()
                    }
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={basics.startDate || new Date()}
                    maximumDate={basics.endDate || undefined}
                    onChange={(_, date) => {
                        const id = stopDatePickerId;
                        setStopDatePickerId(null);
                        if (date && id) {
                            intermediateStops.updateStop(id, { expectedArrivalDate: date });
                        }
                    }}
                />
            )}

            <AiTripLoader
                visible={showAiLoader}
                buttonCoords={wizard.buttonCoords}
                useFlappyBird={false}
            />

            {alertConfig && (
                <CustomAlert
                    visible={showAlert}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type}
                    actions={alertConfig.actions}
                    onClose={hideAlert}
                />
            )}
        </SafeAreaView>
    );
}
