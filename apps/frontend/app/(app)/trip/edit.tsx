import { useTripContext } from '@/context/TripContext';
import { useDeleteTrip, useTrips, useUpdateTrip } from '@/hooks/useTrips'; // Importamos los hooks
import '@/index.css';
import { Ionicons } from '@expo/vector-icons';
import { Interest, Trip } from '@planmyroute/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type TravelerCounts = {
  adults: number;
  children: number;
  infants: number;
  pets: number;
};

// Mismos valores que en createTrip.tsx
const INTEREST_CATEGORIES: Interest[] = [
  'nature', 'cultural', 'gastronomic', 'adventure', 'family', 'beach', 'leisure', 'nightlife',
];
const INTEREST_LABELS: Record<Interest, string> = {
  nature: 'Naturaleza', cultural: 'Cultura', gastronomic: 'Gastronomía',
  adventure: 'Aventura', family: 'Familia', beach: 'Playa',
  leisure: 'Ocio', nightlife: 'Vida nocturna',
};

export default function TripSettingsScreen() {
  const router = useRouter();
  const { currentTrip, setCurrentTrip, tripId } = useTripContext();

  // --- Cargar datos del viaje ---
  // Solo cargar desde el servidor si no tenemos el trip en el Context
  const { data: tripData, loading: isTripLoading } = useTrips(tripId as string, { enabled: !currentTrip && !!tripId });
  const trip = (currentTrip ?? tripData) as Trip | null;

  // Sincronizar el trip con el Context si se cargó desde el servidor (fallback)
  useEffect(() => {
    if (tripData && !currentTrip) {
      setCurrentTrip(tripData as Trip);
    }
  }, [tripData, currentTrip, setCurrentTrip]);

  // Configurar el header con el botón de volver
  const goToIndex = useCallback(() => {
    router.replace('/');
  }, [router]);

  // --- Hook de Mutación ---
  const updateTripMutation = useUpdateTrip();

  // --- Estados del formulario ---
  const [tripName, setTripName] = useState('');
  // Los campos de Origen y Destino se eliminan, ya que son paradas
  // y se gestionan en la pantalla de detalle.
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [roundTrip, setRoundTrip] = useState(false);
  const [travelerCounts, setTravelerCounts] = useState<TravelerCounts>({
    adults: 1, children: 0, infants: 0, pets: 0,
  });
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [minBudget, setMinBudget] = useState(50);
  const [maxBudget, setMaxBudget] = useState(1300);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [collaboration, setCollaboration] = useState(false);

  // --- Poblar el formulario con los datos del viaje ---
  useEffect(() => {
    if (trip) {
      setTripName(trip.name || '');
      setStartDate(trip.start_date ? new Date(trip.start_date) : null);
      setEndDate(trip.end_date ? new Date(trip.end_date) : null);
      setRoundTrip(trip.circular || false);
      setTravelerCounts({
        adults: trip.n_adults || 1,
        children: trip.n_children || 0,
        infants: trip.n_babies || 0,
        pets: trip.n_pets || 0,
      });
      setSelectedInterests(trip.type || []);
      setMinBudget(trip.estimated_price_min || 50);
      setMaxBudget(trip.estimated_price_max || 1300);
      setCollaboration(trip.additional_comments === 'Viaje colaborativo');
    }
  }, [trip]);

  const isValid = useMemo(() => {
    return tripName.trim().length > 0 && startDate !== null;
  }, [tripName, startDate]);

  // --- Lógica del Slider (sin cambios) ---
  const MIN_VALUE = 0;
  const MAX_VALUE = 2000;
  const getPositionFromValue = (value: number) => {
    if (sliderWidth === 0) return 0;
    return ((value - MIN_VALUE) / (MAX_VALUE - MIN_VALUE)) * sliderWidth;
  };
  const getValueFromPosition = (position: number) => {
    if (sliderWidth === 0) return MIN_VALUE;
    const value = (position / sliderWidth) * (MAX_VALUE - MIN_VALUE) + MIN_VALUE;
    return Math.max(MIN_VALUE, Math.min(MAX_VALUE, Math.round(value / 10) * 10));
  };
  const minPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const newPosition = getPositionFromValue(minBudget) + gestureState.dx;
      const newValue = getValueFromPosition(newPosition);
      if (newValue < maxBudget - 50) setMinBudget(newValue);
    },
  });
  const maxPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const newPosition = getPositionFromValue(maxBudget) + gestureState.dx;
      const newValue = getValueFromPosition(newPosition);
      if (newValue > minBudget + 50) setMaxBudget(newValue);
    },
  });

  // --- Lógica de Intereses y Viajeros (sin cambios) ---
  const toggleInterest = (interest: Interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };
  const updateTravelerCount = (type: keyof TravelerCounts, delta: number) => {
    setTravelerCounts(prev => {
      const newValue = prev[type] + delta;
      if (newValue < 0) return prev;
      if (type === 'adults' && newValue < 1) return prev;
      return { ...prev, [type]: newValue };
    });
  };

  // --- FUNCIÓN DE ENVÍO ---
  const handleSubmit = async () => {
    if (!isValid || !tripId || !trip) return;

    // (Validaciones de fecha idénticas a createTrip)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate && new Date(startDate) < today) {
      Alert.alert('Error', 'La fecha de inicio no puede ser una fecha pasada.');
      return;
    }
    if (endDate && new Date(endDate) < today) {
      Alert.alert('Error', 'La fecha de fin no puede ser una fecha pasada.');
      return;
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      Alert.alert('Error', 'La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    // Preparar payload de ACTUALIZACIÓN
    const tripPayload: Partial<Trip> = {
      name: tripName.trim(),
      description: trip.description, // Mantenemos la descripción original (o la añadimos al form)
      start_date: startDate ? startDate.toISOString() : null,
      end_date: endDate ? endDate.toISOString() : null,
      circular: roundTrip,
      n_adults: travelerCounts.adults,
      n_children: travelerCounts.children,
      n_babies: travelerCounts.infants,
      n_pets: travelerCounts.pets,
      type: selectedInterests,
      estimated_price_min: minBudget,
      estimated_price_max: maxBudget,
      additional_comments: collaboration ? 'Viaje colaborativo' : null,
    };

    updateTripMutation.mutate(
      { tripId: tripId as string, tripData: tripPayload },
      {
        onSuccess: (updatedTrip) => {
          // Actualizar el Context con el trip actualizado
          setCurrentTrip(updatedTrip);
          Alert.alert('¡Éxito!', 'El viaje se ha actualizado correctamente', [
            { text: 'OK', onPress: () => router.back() }, // Volver a la pantalla anterior
          ]);
        },
        onError: (error) => {
          console.error('Error updating trip:', error);
          Alert.alert('Error', 'Hubo un problema al actualizar el viaje.');
        },
      }
    );
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getInterestIcon = (category: Interest): any => {
    const icons: Record<Interest, string> = {
      nature: 'leaf', cultural: 'library', gastronomic: 'restaurant',
      adventure: 'trending-up', family: 'people', beach: 'sunny',
      leisure: 'sparkles', nightlife: 'moon',
    };
    return icons[category] || 'star';
  };

  // --- Lógica de Eliminación de Viaje ---
  const deleteTripMutation = useDeleteTrip();

  const executeDeleteTrip = useCallback(() => {
    deleteTripMutation.mutate(tripId as string, {
      onSuccess: () => {
        Alert.alert('Éxito', 'Viaje eliminado correctamente');
        router.replace('/'); // Volver a la pantalla principal después de eliminar
      },
      onError: (error) => {
        Alert.alert('Error', `No se pudo eliminar el viaje: ${error.message}`);
      },
    });
  }, [deleteTripMutation, tripId, router]);

  const handleDeleteTripConfirmation = useCallback(() => {
    Alert.alert(
      'Eliminar Viaje',
      '¿Estás seguro de que quieres eliminar este viaje? Esta acción es permanente y no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => executeDeleteTrip(),
        },
      ]
    );
  }, [executeDeleteTrip]);

  const insets = useSafeAreaInsets();

  // --- Estado de Carga ---
  if (isTripLoading && !trip) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50 p-5">
        <Text className="text-lg text-slate-500 mb-4">No se pudo cargar el viaje</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-indigo-600 px-6 py-3 rounded-xl">
          <Text className="text-white text-base font-semibold">Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- RENDERIZADO DEL FORMULARIO ---
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Editar viaje',
          headerLeft: () => (
            <TouchableOpacity onPress={goToIndex} className="px-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-slate-50"
        showsVerticalScrollIndicator={false}
      >
        <View className="p-5">
          {/* Header */}
          <View className="items-center mb-6">
            <View className="flex-row items-center gap-3 mb-2">
              <Ionicons name="pencil" size={28} color="#4F46E5" />
              <Text className="text-3xl font-bold text-gray-800">Editar viaje</Text>
            </View>
            <Text className="text-base text-gray-500 text-center">
              Actualiza los detalles de tu aventura
            </Text>
          </View>

          {/* Sección Detalles básicos (SIN Origen/Destino) */}
          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
            <View className="flex-row items-center gap-2 mb-4">
              <Ionicons name="information-circle" size={20} color="#4F46E5" />
              <Text className="text-lg font-semibold text-gray-800">Detalles básicos</Text>
            </View>

            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 mb-3">
              <Ionicons name="map" size={18} color="#6B7280" className="mr-3" />
              <TextInput
                placeholder="Nombre del viaje"
                className="flex-1 text-base text-gray-800"
                placeholderTextColor="#9CA3AF"
                value={tripName}
                onChangeText={setTripName}
              />
            </View>

            {/* Campos de Origen y Destino ELIMINADOS */}

            {/* Selección de fechas */}
            <TouchableOpacity
              className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 mb-3"
              onPress={() => setShowStartPicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar" size={18} color="#6B7280" className="mr-3" />
              <Text className={`flex-1 text-base ${!startDate ? 'text-gray-400' : 'text-gray-800'}`}>
                {startDate ? formatDate(startDate) : 'Fecha inicio'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 mb-3"
              onPress={() => setShowEndPicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color="#6B7280" className="mr-3" />
              <Text className={`flex-1 text-base ${!endDate ? 'text-gray-400' : 'text-gray-800'}`}>
                {endDate ? formatDate(endDate) : 'Fecha fin (opcional)'}
              </Text>
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_, selectedDate) => {
                  setShowStartPicker(false);
                  setStartDate(selectedDate || startDate);
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate || startDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={startDate || new Date()}
                onChange={(_, selectedDate) => {
                  setShowEndPicker(false);
                  setEndDate(selectedDate || endDate);
                }}
              />
            )}

            <View className="flex-row items-center justify-between py-1">
              <View className="flex-row items-center gap-2">
                <Ionicons name="refresh" size={18} color="#6B7280" />
                <Text className="text-base text-gray-700 font-medium">Ida y vuelta</Text>
              </View>
              <Switch
                value={roundTrip}
                onValueChange={setRoundTrip}
                trackColor={{ false: '#E5E7EB', true: '#4F46E5' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Sección Viajeros (idéntica a createTrip) */}
          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
            <View className="flex-row items-center gap-2 mb-4">
              <Ionicons name="people" size={20} color="#4F46E5" />
              <Text className="text-lg font-semibold text-gray-800">Viajeros</Text>
            </View>

            <View className="gap-4">
              {[
                { key: 'adults' as keyof TravelerCounts, label: 'Adultos', icon: 'person', description: '13+ años' },
                { key: 'children' as keyof TravelerCounts, label: 'Niños', icon: 'person-outline', description: '2-12 años' },
                { key: 'infants' as keyof TravelerCounts, label: 'Bebés', icon: 'heart', description: 'Menos de 2 años' },
                { key: 'pets' as keyof TravelerCounts, label: 'Mascotas', icon: 'paw', description: 'Animales de compañía' },
              ].map(({ key, label, icon, description }) => (
                <View key={key} className="flex-row items-center justify-between">
                  <View className="flex-col gap-1">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name={icon as any} size={18} color="#4F46E5" />
                      <Text className="text-base font-semibold text-gray-800">{label}</Text>
                    </View>
                    <Text className="text-sm text-gray-500">{description}</Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      className={`w-8 h-8 rounded-lg items-center justify-center ${travelerCounts[key] === 0 ? 'bg-gray-100' : 'bg-indigo-50'
                        }`}
                      onPress={() => updateTravelerCount(key, -1)}
                      disabled={travelerCounts[key] === 0 || (key === 'adults' && travelerCounts[key] === 1)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="remove" size={16} color={travelerCounts[key] === 0 ? '#9CA3AF' : '#4F46E5'} />
                    </TouchableOpacity>
                    <Text className="text-base font-semibold text-gray-800 w-6 text-center">
                      {travelerCounts[key]}
                    </Text>
                    <TouchableOpacity
                      className="w-8 h-8 rounded-lg bg-indigo-50 items-center justify-center"
                      onPress={() => updateTravelerCount(key, 1)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={16} color="#4F46E5" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Sección Intereses (idéntica a createTrip) */}
          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
            <View className="flex-row items-center gap-2 mb-4">
              <Ionicons name="heart" size={20} color="#4F46E5" />
              <Text className="text-lg font-semibold text-gray-800">Intereses</Text>
            </View>
            <View className="flex-row flex-wrap gap-3">
              {INTEREST_CATEGORIES.map(cat => {
                const selected = selectedInterests.includes(cat);

                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => toggleInterest(cat)}
                    className={`flex-row items-center border-2 px-4 py-2.5 rounded-full ${selected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-indigo-600'
                      }`}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={getInterestIcon(cat) as any}
                      size={16}
                      color={selected ? '#FFFFFF' : '#4F46E5'}
                      style={{ marginRight: 6 }}
                    />
                    <Text className={`font-semibold text-sm ${selected ? 'text-white' : 'text-indigo-600'}`}>
                      {INTEREST_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Sección Presupuesto (idéntica a createTrip) */}
          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="wallet" size={20} color="#4F46E5" />
              <Text className="text-lg font-semibold text-gray-800">Rango de precios</Text>
            </View>
            <Text className="text-sm text-gray-500 mb-6">
              Precio del viaje, incluye todas las comisiones
            </Text>

            <View
              className="h-10 mb-8 relative justify-center"
              onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
            >
              <View className="absolute h-1 bg-gray-200 w-full rounded" />
              <View
                className="absolute h-1 bg-indigo-600 rounded"
                style={{
                  left: getPositionFromValue(minBudget),
                  width: getPositionFromValue(maxBudget) - getPositionFromValue(minBudget),
                }}
              />
              <View
                {...minPanResponder.panHandlers}
                className="absolute w-8 h-8 rounded-full bg-white border-3 border-indigo-600 shadow-md"
                style={{ left: getPositionFromValue(minBudget) - 16 }}
              />
              <View
                {...maxPanResponder.panHandlers}
                className="absolute w-8 h-8 rounded-full bg-white border-3 border-indigo-600 shadow-md"
                style={{ left: getPositionFromValue(maxBudget) - 16 }}
              />
            </View>

            <View className="flex-row gap-4 mb-6">
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-2">Mínimo</Text>
                <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 items-center">
                  <Text className="text-lg font-semibold text-gray-800">{minBudget}€</Text>
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500 mb-2">Máximo</Text>
                <View className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 items-center">
                  <Text className="text-lg font-semibold text-gray-800">{maxBudget}€</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Botón final */}
          <TouchableOpacity
            className={`flex-row items-center justify-center px-6 py-4 rounded-2xl mt-4 shadow-md ${!isValid || updateTripMutation.isPending ? 'bg-indigo-300' : 'bg-indigo-600'
              }`}
            disabled={!isValid || updateTripMutation.isPending}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Ionicons
              name={updateTripMutation.isPending ? 'hourglass' : 'checkmark-circle'}
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text className="text-white text-lg font-semibold">
              {updateTripMutation.isPending ? 'Guardando…' : 'Guardar Cambios'}
            </Text>
          </TouchableOpacity>

          <View className="mt-8 border border-red-500 flex rounded-lg p-5">
            <Text className="text-xl text-red-500 mb-2 m-auto font-bold">Zona peligrosa</Text>
            <TouchableOpacity
              className={`flex-row items-center justify-center px-6 py-4 rounded-2xl mt-2 shadow-md bg-red-600`}
              onPress={handleDeleteTripConfirmation}
              activeOpacity={0.8}
            >
              <Ionicons
                name={deleteTripMutation.isPending ? 'hourglass' : 'trash-outline'}
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text className="text-white text-lg font-semibold">
                {deleteTripMutation.isPending ? 'Borrando...' : 'Borrar viaje'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}