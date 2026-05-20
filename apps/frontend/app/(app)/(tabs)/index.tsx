import { TextBold, TextRegular, Title1, Title2Semibold } from '@/components/customElements/CustomText';
import { NewTripCard } from '@/components/indexCards/NewTripCard';
import { TripCard } from '@/components/indexCards/TripCard';
import { TripCardSkeleton } from '@/components/indexCards/TripCardSkeleton';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useNeedsProfileCompletion } from '@/hooks/users/useNeedsProfileCompletion';
import { useUser } from '@/hooks/users/useUsers';
import { useActiveTrips } from '@/hooks/useTrips';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: organizedTrips, isLoading: tripsLoading, refetch: refetchTrips } = useActiveTrips();
  const { data: userData, isLoading: userLoading } = useUser(user!.id);
  const { needsCompletion } = useNeedsProfileCompletion();

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
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-4">
            <View className="mb-8">
              <View className="h-9 w-48 bg-neutral/20 rounded-lg mb-2" />
              <View className="h-9 w-64 bg-neutral/20 rounded-lg" />
            </View>
            <TripCardSkeleton />
            <TripCardSkeleton />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const rawName = userData && typeof userData === 'object' && 'name' in userData
    ? (userData.name as string | null | undefined)
    : null;
  const rawUsername = userData && typeof userData === 'object' && 'username' in userData
    ? (userData.username as string | null | undefined)
    : null;
  const hasName = typeof rawName === 'string' && rawName.trim().length > 0;
  const greeting = hasName
    ? `Hola ${rawName?.trim()},`
    : rawUsername
      ? `¡Bienvenid@, ${rawUsername}!`
      : '¡Bienvenid@!';

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
          <View className="mb-6">
            <Title1 className="mb-1 font-bold">
              {greeting}
            </Title1>
            <Title1>
              {getSubtitle()}
            </Title1>
          </View>

          {/* Banner de bienvenida si falta completar el perfil */}
          {needsCompletion && (
            <TouchableOpacity
              onPress={() => router.push(ROUTES.completeProfile)}
              activeOpacity={0.8}
              className="bg-primary/20 border border-primary rounded-2xl p-4 mb-6 flex-row items-center gap-3"
            >
              <Ionicons name="person-circle-outline" size={32} color="#202020" />
              <View className="flex-1">
                <TextBold className="text-dark">Completa tu perfil</TextBold>
                <TextRegular className="text-dark/70 mt-0.5">
                  Añade tu nombre para personalizar tu experiencia.
                </TextRegular>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#202020" />
            </TouchableOpacity>
          )}

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