import CustomAlert, { type AlertAction } from '@/components/customElements/CustomAlert';
import CustomButton from '@/components/customElements/CustomButton';
import CustomInput from '@/components/customElements/CustomInput';
import { MicrotextDark, SubtitleSemibold, TextRegular, Title1, Title2 } from '@/components/customElements/CustomText';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useDraftBanner } from '@/hooks/trip/useWizardDraft';
import { useUserUsage } from '@/hooks/users/useUserUsage';
import { useTrips } from '@/hooks/useTrips';
import '@/index.css';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '@planmyroute/types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateTripTabScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { data: userUsage } = useUserUsage();
    const { draft, hasDraft, checked, discard } = useDraftBanner(user?.id);

    // Fetch user trips for plantillas rápidas (reuses React Query cache)
    const { data: tripsData } = useTrips();
    const recentTrips = (Array.isArray(tripsData) ? tripsData : [])
        .filter((t: Trip) => t.status === 'completed' || t.status === 'planning')
        .slice(0, 4);

    const [tripName, setTripName] = useState('');
    const [isAiTrip, setIsAiTrip] = useState(true);
    const [showAlert, setShowAlert] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{
        title: string;
        message: string;
        type: 'error' | 'warning' | 'success' | 'info';
        actions: AlertAction[];
    } | null>(null);

    const hideAlert = () => setShowAlert(false);

    const handleSelectAiMode = () => {
        if (userUsage?.ai_trip_creation && !userUsage.ai_trip_creation.can_create) {
            setAlertConfig({
                title: '🔒 Límite alcanzado',
                message: `Has usado ${userUsage.ai_trip_creation.used_count}/${userUsage.ai_trip_creation.max_count} viajes con IA este mes. Actualiza a Premium o usa el modo manual.`,
                type: 'warning',
                actions: [
                    {
                        text: 'Ver Premium',
                        onPress: () => { hideAlert(); router.push(ROUTES.premium); },
                        variant: 'yellow',
                    },
                    {
                        text: 'Usar modo manual',
                        onPress: () => { hideAlert(); setIsAiTrip(false); },
                        variant: 'outline',
                    },
                    { text: 'Cerrar', onPress: hideAlert, variant: 'dark' },
                ],
            });
            setShowAlert(true);
        } else {
            setIsAiTrip(true);
        }
    };

    const handleContinue = () => {
        if (!tripName.trim()) return;
        if (isAiTrip && userUsage?.ai_trip_creation && !userUsage.ai_trip_creation.can_create) {
            setAlertConfig({
                title: '🔒 Límite alcanzado',
                message: `Has usado ${userUsage.ai_trip_creation.used_count}/${userUsage.ai_trip_creation.max_count} viajes con IA este mes. Cambia a modo manual o actualiza a Premium.`,
                type: 'warning',
                actions: [
                    {
                        text: 'Ver Premium',
                        onPress: () => { hideAlert(); router.push(ROUTES.premium); },
                        variant: 'yellow',
                    },
                    {
                        text: 'Usar modo manual',
                        onPress: () => { hideAlert(); setIsAiTrip(false); },
                        variant: 'outline',
                    },
                    { text: 'Cerrar', onPress: hideAlert, variant: 'dark' },
                ],
            });
            setShowAlert(true);
            return;
        }
        router.push(ROUTES.tripCreateWizard(tripName.trim(), isAiTrip));
    };

    const handleContinueDraft = () => {
        if (!draft) return;
        // Navigate to wizard with continueDraft flag; wizard reads from AsyncStorage
        router.push(ROUTES.tripCreateWizard(draft.tripName, draft.isAiTrip, true));
    };

    const handleUseTemplate = (trip: Trip) => {
        const newName = trip.name ? `${trip.name} (copia)` : '';
        setTripName(newName);
        // Template fills only the name for now; user selects locations fresh in wizard
    };

    const formatDraftDate = () => {
        if (!draft?.savedAt) return '';
        const d = new Date(draft.savedAt);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <ScrollView
                className="flex-1"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View className="px-6 pt-6">
                    <Title1 className="mb-6">
                        Empecemos{'\n'}la aventura
                    </Title1>

                    {/* ── Borrador sin terminar ── */}
                    {checked && hasDraft && draft && (
                        <View className="mb-5 bg-primary-yellow/10 border border-primary-yellow rounded-2xl px-4 py-3 flex-row items-center">
                            <View className="flex-1 mr-3">
                                <TextRegular className="text-dark-black font-semibold mb-0.5">
                                    Tienes un viaje sin terminar
                                </TextRegular>
                                <MicrotextDark className="text-neutral-gray">
                                    {draft.tripName || 'Sin nombre'} · {formatDraftDate()}
                                </MicrotextDark>
                            </View>
                            <View className="flex-row items-center gap-3">
                                <TouchableOpacity onPress={discard} activeOpacity={0.7} className="p-1">
                                    <Ionicons name="trash-outline" size={18} color="#999999" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleContinueDraft}
                                    activeOpacity={0.7}
                                    className="bg-primary-yellow px-3 py-1.5 rounded-full"
                                >
                                    <MicrotextDark className="font-semibold">Continuar</MicrotextDark>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <CustomInput
                        label={<SubtitleSemibold className="mb-3">Dale nombre a tu viaje*</SubtitleSemibold>}
                        placeholder="Ruta por los Pirineos"
                        value={tripName}
                        onChangeText={setTripName}
                    />

                    <View className="pt-6">
                        <Title2 className="mb-2">¿Cómo quieres planear?</Title2>
                        <SubtitleSemibold className="text-neutral-gray mb-6">
                            Elige la experiencia que mejor se adapte a tu viaje.
                        </SubtitleSemibold>

                        <View className="flex-row gap-3 mb-8">
                            {/* Opción IA */}
                            <TouchableOpacity
                                onPress={handleSelectAiMode}
                                className={`flex-1 p-4 rounded-2xl border-2 items-center ${isAiTrip
                                    ? 'bg-primary-yellow/10 border-primary-yellow'
                                    : 'bg-white border-neutral-gray/30'
                                    }`}
                                activeOpacity={0.7}
                            >
                                <View className="mb-3">
                                    <Ionicons name="sparkles" size={32} color={isAiTrip ? '#FFD54D' : '#999999'} />
                                </View>
                                <TextRegular className="text-dark-black font-semibold text-center mb-1">
                                    Copiloto IA
                                </TextRegular>
                                <MicrotextDark className="text-neutral-gray text-center">
                                    Itinerario personalizado
                                </MicrotextDark>

                                {userUsage?.ai_trip_creation && (
                                    <View className={`mt-2 px-3 py-1.5 rounded-full ${userUsage.ai_trip_creation.can_create ? 'bg-green-100' : 'bg-red-500'}`}>
                                        <MicrotextDark className={`text-xs font-semibold ${userUsage.ai_trip_creation.can_create ? 'text-green-700' : 'text-white'}`}>
                                            {userUsage.ai_trip_creation.max_count === undefined
                                                ? `${userUsage.ai_trip_creation.used_count || 0}/ilimitado`
                                                : `${userUsage.ai_trip_creation.used_count || 0}/${userUsage.ai_trip_creation.max_count}`}
                                        </MicrotextDark>
                                    </View>
                                )}

                                {isAiTrip && (
                                    <View className="absolute top-2 right-2">
                                        <Ionicons name="checkmark-circle" size={20} color="#FFD54D" />
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Opción Manual */}
                            <TouchableOpacity
                                onPress={() => setIsAiTrip(false)}
                                className={`flex-1 p-4 rounded-2xl border-2 items-center ${!isAiTrip
                                    ? 'bg-dark-black/5 border-dark-black'
                                    : 'bg-white border-neutral-gray/30'
                                    }`}
                                activeOpacity={0.7}
                            >
                                <View className="mb-3">
                                    <Ionicons name="map" size={32} color={!isAiTrip ? '#202020' : '#999999'} />
                                </View>
                                <TextRegular className="text-dark-black font-semibold text-center mb-1">
                                    Modo Manual
                                </TextRegular>
                                <MicrotextDark className="text-neutral-gray text-center">
                                    Planea a tu ritmo
                                </MicrotextDark>
                                {!isAiTrip && (
                                    <View className="absolute top-2 right-2">
                                        <Ionicons name="checkmark-circle" size={20} color="#202020" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* ── Plantillas rápidas ── */}
                        {recentTrips.length > 0 && (
                            <View className="mb-6">
                                <SubtitleSemibold className="mb-3">Basado en un viaje anterior</SubtitleSemibold>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ gap: 10, paddingRight: 4 }}
                                >
                                    {recentTrips.map((trip: Trip) => (
                                        <TouchableOpacity
                                            key={trip.id}
                                            onPress={() => handleUseTemplate(trip)}
                                            activeOpacity={0.7}
                                            className="bg-white border border-neutral-gray/20 rounded-2xl p-3 w-40"
                                        >
                                            <Ionicons
                                                name={trip.status === 'completed' ? 'checkmark-circle' : 'time-outline'}
                                                size={18}
                                                color={trip.status === 'completed' ? '#10B981' : '#FFD54D'}
                                            />
                                            <TextRegular
                                                className="text-dark-black font-medium mt-1.5 mb-0.5"
                                                numberOfLines={1}
                                            >
                                                {trip.name}
                                            </TextRegular>
                                            {((trip as any).origin || (trip as any).destination) && (
                                                <MicrotextDark className="text-neutral-gray" numberOfLines={1}>
                                                    {(trip as any).origin?.split(',')[0]} → {(trip as any).destination?.split(',')[0]}
                                                </MicrotextDark>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Botón Continuar */}
            <View className="px-6 pb-6 bg-white border-t border-neutral-gray/10 pt-3">
                <CustomButton
                    variant="primary"
                    title={
                        <View className="flex-row items-center justify-center gap-2">
                            <TextRegular className="text-dark-black">Continuar</TextRegular>
                            <Ionicons name="arrow-forward" size={16} color="#202020" />
                        </View>
                    }
                    onPress={handleContinue}
                    disabled={!tripName.trim()}
                />
            </View>

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
