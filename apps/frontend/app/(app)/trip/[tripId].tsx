import { useTripContext } from '@/context/TripContext';
import useTrips from '@/hooks/useTrips';
import { Trip } from '@planmyroute/types';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

export default function TripDetailScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { setCurrentTrip, setTripId } = useTripContext();

  // Cargar datos del viaje para sincronizar con el contexto
  const { data: tripData, loading: tripLoading } = useTrips(
    tripId as string,
    { enabled: !!tripId }
  );

  const tripObj = tripData as Trip | null;

  // Sincronizar el trip con el Context cuando se carga
  useEffect(() => {
    if (tripObj && tripId) {
      setCurrentTrip(tripObj);
      setTripId(tripId);
    }
  }, [tripObj, tripId, setCurrentTrip, setTripId]);

  if (tripLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!tripObj) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50 p-5">
        <Text className="text-lg text-slate-500 mb-4">No se pudo cargar el viaje</Text>
        <TouchableOpacity onPress={() => { }} className="bg-indigo-600 px-6 py-3 rounded-xl">
          <Text className="text-white text-base font-semibold">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Redirigir a las tabs (Expo Router propagará el parámetro tripId automáticamente)
  return <Redirect href={`/(app)/trip/(tabs)/stops?tripId=${tripId}`} />;
}