import { MicrotextDark, Title3Semibold } from '@/components/customElements/CustomText';
import { INTEREST_LABELS } from '@/components/interests/InterestSelector';
import Travelers from '@/components/travelers/Travelers';
import { useAuth } from '@/context/AuthContext';
import { useTripContext } from '@/context/TripContext';
import { TravelerWithRole, useTravelersWithPending } from '@/hooks/useTrips';
import { Ionicons } from '@expo/vector-icons';
import { Interest } from '@planmyroute/types';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

const INTEREST_ICONS: Record<Interest, string> = {
    nature: 'leaf',
    cultural: 'library',
    gastronomic: 'restaurant',
    adventure: 'trending-up',
    family: 'people',
    beach: 'sunny',
    leisure: 'sparkles',
    nightlife: 'moon',
};

export default function TravelersScreen() {
    const params = useLocalSearchParams<{ tripId?: string }>();
    const { tripId: contextTripId, currentTrip, setTripId } = useTripContext();
    const { user } = useAuth();

    // Usar el tripId de los params o del contexto
    const tripId = params.tripId || contextTripId;

    // Sincronizar el tripId con el contexto si viene de params
    useEffect(() => {
        if (params.tripId && params.tripId !== contextTripId) {
            setTripId(params.tripId);
        }
    }, [params.tripId, contextTripId, setTripId]);

    // Obtener los viajeros del viaje (confirmados + pending) usando el hook unificado
    // Solo habilitar la query cuando tengamos un tripId válido
    const { data: travelers, isLoading, error } = useTravelersWithPending(tripId, {
        enabled: !!tripId && tripId !== 'undefined' && tripId !== 'null'
    });

    // Obtener intereses comunes
    const commonInterests = useMemo(() => {
        if (!travelers || travelers.length === 0) return [];

        const interestCounts = new Map<Interest, number>();

        travelers.forEach((travelerData: TravelerWithRole) => {
            const userInterests = travelerData.user.user_type || [];
            userInterests.forEach((interest: Interest) => {
                interestCounts.set(interest, (interestCounts.get(interest) || 0) + 1);
            });
        });

        const minCount = travelers.length === 1 ? 1 : 2;
        return Array.from(interestCounts.entries())
            .filter(([_, count]) => count >= minCount)
            .map(([interest]) => interest)
            .sort();
    }, [travelers]);

    if (!tripId) {
        return (
            <View className="flex-1 p-4 justify-center items-center bg-white">
                <Ionicons name="alert-circle-outline" size={48} color="#CBD5E1" />
                <Text className="text-base text-gray-500 mt-3">No se ha seleccionado ningún viaje</Text>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text className="text-base text-gray-500 mt-3">Cargando viajeros…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 p-4 justify-center items-center bg-white">
                <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                <Text className="text-base text-red-500 mt-3">Error al cargar los viajeros</Text>
                <Text className="text-sm text-gray-500 mt-2">{error}</Text>
            </View>
        );
    }

    if (!travelers || travelers.length === 0) {
        return (
            <View className="flex-1 p-4 justify-center items-center bg-white">
                <Ionicons name="people-outline" size={48} color="#CBD5E1" />
                <Text className="text-base text-gray-500 mt-3">No hay viajeros en este viaje</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1">
                <View className="p-4 gap-8">
                    {tripId && currentTrip && (
                        <Travelers travelers={travelers} tripId={tripId} currentTrip={currentTrip} />
                    )}

                    {/* Sección de Intereses Comunes */}
                    {commonInterests.length > 0 && travelers.length > 1 && (
                        <View className="bg-white rounded-2xl p-5 border border-neutral-gray/20">
                            <View className="flex-row items-center gap-2 mb-4">
                                <Ionicons name="heart" size={22} color="#FFD54D" />
                                <Title3Semibold className="text-dark-black">Intereses comunes</Title3Semibold>
                            </View>

                            <View className="flex-row flex-wrap gap-2">
                                {commonInterests.map((interest) => (
                                    <View
                                        key={interest}
                                        className="flex-row items-center bg-primary-yellow/10 border-2 border-primary-yellow px-3 py-2 rounded-full"
                                    >
                                        <Ionicons
                                            name={INTEREST_ICONS[interest] as any}
                                            size={16}
                                            color="#202020"
                                            style={{ marginRight: 6 }}
                                        />
                                        <MicrotextDark className="font-semibold text-dark-black">
                                            {INTEREST_LABELS[interest]}
                                        </MicrotextDark>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
