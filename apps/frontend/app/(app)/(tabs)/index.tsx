import { Title1, Title2Semibold } from '@/components/customElements/CustomText';
import { NewTripCard } from '@/components/indexCards/NewTripCard';
import { TripCard } from '@/components/indexCards/TripCard';
import { useAuth } from '@/context/AuthContext';
import { useActiveTrips } from '@/hooks/useTrips';
import { useUser } from '@/hooks/useUsers';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: organizedTrips, isLoading: tripsLoading, refetch: refetchTrips } = useActiveTrips();
  const { data: userData, isLoading: userLoading } = useUser(user!.id);

  // Refetch trips when screen is focused
  useFocusEffect(
    useCallback(() => {
      refetchTrips();
    }, [refetchTrips])
  );

  const hasTrips = (organizedTrips?.going.length ?? 0) > 0 ||
    (organizedTrips?.planning.length ?? 0) > 0;

  if (tripsLoading || userLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FFD54D" />
      </SafeAreaView>
    );
  }

  const userName = userData && typeof userData === 'object' && 'name' in userData
    ? userData.name
    : 'Usuario';

  // Determinar subtítulo según el estado de los viajes
  const getSubtitle = () => {
    const hasGoingTrips = (organizedTrips?.going.length ?? 0) > 0;
    const hasPlanningTrips = (organizedTrips?.planning.length ?? 0) > 0;

    if (hasGoingTrips) {
      const subtitles = [
        'Veamos qué nos espera hoy',
        'Continuemos con la aventura',
        '¡A por el día de hoy!',
      ];
      return subtitles[Math.floor(Math.random() * subtitles.length)];
    }

    if (hasPlanningTrips) {
      const subtitles = [
        '¿Continuamos planificando?',
        'Ya queda menos para viajar',
        'Terminemos de planificar',
      ];
      return subtitles[Math.floor(Math.random() * subtitles.length)];
    }

    const subtitles = [
      '¿Preparado para empezar a viajar?',
      '¿A dónde vamos hoy?',
      'Comienza tu próxima aventura',
    ];
    return subtitles[Math.floor(Math.random() * subtitles.length)];
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-4">
          {/* Saludo personalizado */}
          <View className="mb-8">
            <Title1 className="mb-1 font-bold">
              Hola {userName},
            </Title1>
            <Title1>
              {getSubtitle()}
            </Title1>
          </View>

          {/* Contenido principal */}
          {!hasTrips ? (
            <NewTripCard />
          ) : (
            <View className="flex-1">
              {/* Viajes en marcha */}
              {(organizedTrips?.going.length ?? 0) > 0 && (
                <View className="mb-8">
                  {organizedTrips?.going.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </View>
              )}

              {/* Viajes planificando */}
              {(organizedTrips?.planning.length ?? 0) > 0 && (
                <View className="mb-8">
                  <Title2Semibold className="mb-4">
                    Continúa tus planes
                  </Title2Semibold>
                  {organizedTrips?.planning.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}