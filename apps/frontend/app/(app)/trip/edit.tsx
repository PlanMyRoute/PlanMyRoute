import CustomAlert from '@/components/customElements/CustomAlert';
import CustomButton from '@/components/customElements/CustomButton';
import CustomInput from '@/components/customElements/CustomInput';
import DateTimePickerWeb from '@/components/customElements/DateTimePickerWeb';
import { MicrotextDark, SubtitleSemibold, TextRegular, Title1 } from '@/components/customElements/CustomText';
import { InterestSelector } from '@/components/interests/InterestSelector';
import { useTripContext } from '@/context/TripContext';
import { useDeleteTrip, useTrips, useUpdateTrip } from '@/hooks/useTrips';
import '@/index.css';
import { Ionicons } from '@expo/vector-icons';
import { Interest, Trip } from '@planmyroute/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useRouter } from 'expo-router';
import { ROUTES } from '@/constants/routes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type TravelerCounts = {
  adults: number;
  children: number;
  infants: number;
  pets: number;
};

export default function TripSettingsScreen() {
  const router = useRouter();
  const { currentTrip, setCurrentTrip, tripId } = useTripContext();

  const { data: tripData, loading: isTripLoading } = useTrips(tripId as string, { enabled: !currentTrip && !!tripId });
  const trip = (currentTrip ?? tripData) as Trip | null;

  useEffect(() => {
    if (tripData && !currentTrip) {
      setCurrentTrip(tripData as Trip);
    }
  }, [tripData, currentTrip, setCurrentTrip]);

  const updateTripMutation = useUpdateTrip();
  const deleteTripMutation = useDeleteTrip();

  // Form state — lazy initializers so fields populate immediately if trip is in context
  const [tripName, setTripName] = useState(() => (currentTrip as Trip | null)?.name ?? '');
  const [startDate, setStartDate] = useState<Date | null>(() =>
    (currentTrip as Trip | null)?.start_date ? new Date((currentTrip as Trip).start_date!) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(() =>
    (currentTrip as Trip | null)?.end_date ? new Date((currentTrip as Trip).end_date!) : null
  );
  const [roundTrip, setRoundTrip] = useState(() => (currentTrip as Trip | null)?.circular ?? false);
  const [travelerCounts, setTravelerCounts] = useState<TravelerCounts>(() => ({
    adults: (currentTrip as Trip | null)?.n_adults ?? 1,
    children: (currentTrip as Trip | null)?.n_children ?? 0,
    infants: (currentTrip as Trip | null)?.n_babies ?? 0,
    pets: (currentTrip as Trip | null)?.n_pets ?? 0,
  }));
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>(
    () => ((currentTrip as Trip | null)?.type as Interest[]) ?? []
  );
  const [minBudget, setMinBudget] = useState(() => (currentTrip as Trip | null)?.estimated_price_min ?? 50);
  const [maxBudget, setMaxBudget] = useState(() => (currentTrip as Trip | null)?.estimated_price_max ?? 1300);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Alert state
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Populate form when trip loads from server (fallback path)
  useEffect(() => {
    if (trip && !currentTrip) {
      setTripName(trip.name ?? '');
      setStartDate(trip.start_date ? new Date(trip.start_date) : null);
      setEndDate(trip.end_date ? new Date(trip.end_date) : null);
      setRoundTrip(trip.circular ?? false);
      setTravelerCounts({
        adults: trip.n_adults ?? 1,
        children: trip.n_children ?? 0,
        infants: trip.n_babies ?? 0,
        pets: trip.n_pets ?? 0,
      });
      setSelectedInterests((trip.type as Interest[]) ?? []);
      setMinBudget(trip.estimated_price_min ?? 50);
      setMaxBudget(trip.estimated_price_max ?? 1300);
    }
  }, [trip, currentTrip]);

  const isValid = useMemo(() => tripName.trim().length > 0 && startDate !== null, [tripName, startDate]);

  const updateTravelerCount = (type: keyof TravelerCounts, delta: number) => {
    setTravelerCounts(prev => {
      const newValue = prev[type] + delta;
      if (newValue < 0) return prev;
      if (type === 'adults' && newValue < 1) return prev;
      return { ...prev, [type]: newValue };
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleSubmit = async () => {
    if (!isValid || !tripId || !trip) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate && new Date(startDate) < today) {
      setErrorMessage('La fecha de inicio no puede ser una fecha pasada.');
      setShowErrorAlert(true);
      return;
    }
    if (endDate && new Date(endDate) < today) {
      setErrorMessage('La fecha de fin no puede ser una fecha pasada.');
      setShowErrorAlert(true);
      return;
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setErrorMessage('La fecha de fin no puede ser anterior a la de inicio.');
      setShowErrorAlert(true);
      return;
    }

    const tripPayload: Partial<Trip> = {
      name: tripName.trim(),
      description: trip.description,
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
    };

    updateTripMutation.mutate(
      { tripId: tripId as string, tripData: tripPayload },
      {
        onSuccess: (updatedTrip) => {
          setCurrentTrip(updatedTrip);
          setShowSuccessAlert(true);
        },
        onError: () => {
          setErrorMessage('Hubo un problema al actualizar el viaje. Inténtalo de nuevo.');
          setShowErrorAlert(true);
        },
      }
    );
  };

  const executeDeleteTrip = useCallback(() => {
    deleteTripMutation.mutate(tripId as string, {
      onSuccess: () => {
        router.replace(ROUTES.tabsHome);
      },
      onError: (error) => {
        setErrorMessage(`No se pudo eliminar el viaje: ${error.message}`);
        setShowErrorAlert(true);
      },
    });
  }, [deleteTripMutation, tripId, router]);

  const insets = useSafeAreaInsets();

  if (isTripLoading && !trip) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FFD54D" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View className="flex-1 justify-center items-center bg-white p-5 gap-4">
        <TextRegular className="text-neutral-gray">No se pudo cargar el viaje</TextRegular>
        <CustomButton variant="dark" title="Volver" onPress={() => router.back()} />
      </View>
    );
  }

  const travelerRows: { key: keyof TravelerCounts; label: string; icon: string; description: string }[] = [
    { key: 'adults', label: 'Adultos', icon: 'person', description: '13+ años' },
    { key: 'children', label: 'Niños', icon: 'person-outline', description: '2-12 años' },
    { key: 'infants', label: 'Bebés', icon: 'heart', description: 'Menos de 2 años' },
    { key: 'pets', label: 'Mascotas', icon: 'paw', description: 'Animales de compañía' },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <Ionicons
              name="arrow-back"
              size={24}
              color="#202020"
              style={{ marginLeft: 16, padding: 4 }}
              onPress={() => router.back()}
            />
          ),
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#FFFFFF' },
        }}
      />

      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 20 }}
      >
        {/* Header */}
        <View className="items-center gap-1 mb-2">
          <Title1>Editar viaje</Title1>
          <TextRegular className="text-neutral-gray text-center">
            Actualiza los detalles de tu aventura
          </TextRegular>
        </View>

        {/* Detalles básicos */}
        <View className="bg-white border border-neutral-gray/15 rounded-3xl p-5 gap-4 shadow-sm">
          <View className="flex-row items-center gap-2">
            <Ionicons name="information-circle-outline" size={20} color="#202020" />
            <SubtitleSemibold>Detalles básicos</SubtitleSemibold>
          </View>

          <CustomInput
            label="Nombre del viaje *"
            placeholder="Mi aventura"
            value={tripName}
            onChangeText={setTripName}
          />

          {/* Fechas */}
          {Platform.OS === 'web' ? (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <DateTimePickerWeb
                  label="Fecha de salida *"
                  mode="date"
                  value={startDate}
                  onChange={setStartDate}
                  minimumDate={new Date()}
                />
              </View>
              <View className="flex-1">
                <DateTimePickerWeb
                  label="Fecha de vuelta"
                  mode="date"
                  value={endDate}
                  onChange={setEndDate}
                  minimumDate={startDate ?? new Date()}
                />
              </View>
            </View>
          ) : (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <CustomInput
                  label="Fecha de salida *"
                  placeholder="DD/MM/AA"
                  value={formatDate(startDate)}
                  onPress={() => setShowStartPicker(true)}
                />
              </View>
              <View className="flex-1">
                <CustomInput
                  label="Fecha de vuelta"
                  placeholder="DD/MM/AA"
                  value={formatDate(endDate)}
                  onPress={() => setShowEndPicker(true)}
                />
              </View>
            </View>
          )}

          {showStartPicker && Platform.OS !== 'web' && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(_, selectedDate) => {
                setShowStartPicker(false);
                if (selectedDate) setStartDate(selectedDate);
              }}
            />
          )}
          {showEndPicker && Platform.OS !== 'web' && (
            <DateTimePicker
              value={endDate || startDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={startDate || new Date()}
              onChange={(_, selectedDate) => {
                setShowEndPicker(false);
                if (selectedDate) setEndDate(selectedDate);
              }}
            />
          )}

          <View className="flex-row items-center justify-between py-1">
            <View className="flex-row items-center gap-2">
              <Ionicons name="refresh-outline" size={18} color="#202020" />
              <TextRegular>Ida y vuelta</TextRegular>
            </View>
            <Switch
              value={roundTrip}
              onValueChange={setRoundTrip}
              trackColor={{ false: '#E0E0E0', true: '#FFD54D' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Viajeros */}
        <View className="bg-white border border-neutral-gray/15 rounded-3xl p-5 gap-4 shadow-sm">
          <View className="flex-row items-center gap-2">
            <Ionicons name="people-outline" size={20} color="#202020" />
            <SubtitleSemibold>Viajeros</SubtitleSemibold>
          </View>
          {travelerRows.map(({ key, label, icon, description }) => (
            <View key={key} className="flex-row items-center justify-between">
              <View className="gap-0.5">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name={icon as any} size={16} color="#202020" />
                  <TextRegular style={{ fontFamily: 'Urbanist-SemiBold' }}>{label}</TextRegular>
                </View>
                <MicrotextDark className="text-neutral-gray">{description}</MicrotextDark>
              </View>
              <View className="flex-row items-center gap-3">
                <CustomButton
                  variant="round-outline"
                  size="small"
                  icon={<Ionicons name="remove" size={14} color="#202020" />}
                  onPress={() => updateTravelerCount(key, -1)}
                  disabled={travelerCounts[key] === 0 || (key === 'adults' && travelerCounts[key] === 1)}
                />
                <TextRegular style={{ fontFamily: 'Urbanist-SemiBold', minWidth: 20, textAlign: 'center' }}>
                  {travelerCounts[key]}
                </TextRegular>
                <CustomButton
                  variant="round"
                  size="small"
                  icon={<Ionicons name="add" size={14} color="#202020" />}
                  onPress={() => updateTravelerCount(key, 1)}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Intereses */}
        <View className="bg-white border border-neutral-gray/15 rounded-3xl p-5 gap-4 shadow-sm">
          <View className="flex-row items-center gap-2">
            <Ionicons name="heart-outline" size={20} color="#202020" />
            <SubtitleSemibold>Intereses</SubtitleSemibold>
          </View>
          <InterestSelector
            selectedInterests={selectedInterests}
            onInterestsChange={setSelectedInterests}
            multiple={true}
          />
        </View>

        {/* Presupuesto */}
        <View className="bg-white border border-neutral-gray/15 rounded-3xl p-5 gap-4 shadow-sm">
          <View className="flex-row items-center gap-2">
            <Ionicons name="wallet-outline" size={20} color="#202020" />
            <SubtitleSemibold>Presupuesto (€)</SubtitleSemibold>
          </View>
          <View className="flex-row gap-3">
            <CustomInput
              label="Mínimo"
              value={String(minBudget)}
              onChangeText={(v) => setMinBudget(Math.max(0, Number(v.replace(/[^0-9]/g, '')) || 0))}
              keyboardType="numeric"
              containerClassName="flex-1"
            />
            <CustomInput
              label="Máximo"
              value={String(maxBudget)}
              onChangeText={(v) => setMaxBudget(Math.max(0, Number(v.replace(/[^0-9]/g, '')) || 0))}
              keyboardType="numeric"
              containerClassName="flex-1"
            />
          </View>
        </View>

        {/* Guardar */}
        <CustomButton
          variant="dark"
          size="large"
          title={updateTripMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          onPress={handleSubmit}
          disabled={!isValid || updateTripMutation.isPending}
          loading={updateTripMutation.isPending}
        />

        {/* Zona peligrosa */}
        <View className="border border-red-300 rounded-3xl p-5 gap-3 mt-2">
          <TextRegular style={{ fontFamily: 'Urbanist-SemiBold', color: '#EF4444', textAlign: 'center' }}>
            Zona peligrosa
          </TextRegular>
          <CustomButton
            variant="danger"
            title={deleteTripMutation.isPending ? 'Eliminando...' : 'Eliminar viaje'}
            onPress={() => setShowDeleteAlert(true)}
            loading={deleteTripMutation.isPending}
          />
        </View>
      </ScrollView>

      {/* Alertas */}
      <CustomAlert
        visible={showDeleteAlert}
        title="Eliminar viaje"
        message="¿Estás seguro? Esta acción es permanente y no se puede deshacer."
        type="warning"
        actions={[
          { text: 'Cancelar', onPress: () => setShowDeleteAlert(false), variant: 'outline' },
          { text: 'Eliminar', onPress: () => { setShowDeleteAlert(false); executeDeleteTrip(); }, variant: 'danger' },
        ]}
        onClose={() => setShowDeleteAlert(false)}
      />
      <CustomAlert
        visible={showErrorAlert}
        title="Error"
        message={errorMessage}
        type="error"
        onClose={() => setShowErrorAlert(false)}
      />
      <CustomAlert
        visible={showSuccessAlert}
        title="¡Guardado!"
        message="El viaje se ha actualizado correctamente."
        type="success"
        actions={[{ text: 'OK', onPress: () => { setShowSuccessAlert(false); router.back(); }, variant: 'dark' }]}
        onClose={() => { setShowSuccessAlert(false); router.back(); }}
      />
    </SafeAreaView>
  );
}
