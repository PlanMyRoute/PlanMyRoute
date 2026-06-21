import { MicrotextDark, SubtitleSemibold, TextRegular } from '@/components/customElements/CustomText';
import { EmptyState } from '@/components/customElements/EmptyState';
import { LoadingView } from '@/components/customElements/LoadingView';
import { VehicleCard } from '@/components/profile/VehicleCard';
import { useAuth } from '@/context/AuthContext';
import { useTripContext } from '@/context/TripContext';
import { useTripPermissions } from '@/hooks/useTripPermissions';
import { useTripVehicles } from '@/hooks/useTripVehicles';
import { Vehicle } from '@/services/vehicleService';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View } from 'react-native';

export default function VehiclesScreen() {
    const { tripId } = useTripContext();
    const { user } = useAuth();
    const permissions = useTripPermissions(tripId);

    // Obtener los vehículos del viaje
    const { vehicles, loading, error, handleRemoveVehicle } = useTripVehicles(tripId || undefined, user?.id);

    if (!tripId) {
        return (
            <EmptyState
                icon="alert-circle-outline"
                title="No se ha seleccionado ningún viaje"
            />
        );
    }

    if (loading) {
        return <LoadingView message="Cargando vehículos…" />;
    }

    if (error) {
        return (
            <EmptyState
                icon="alert-circle-outline"
                title="Error al cargar los vehículos"
                message={error}
                iconColor="#EF4444"
            />
        );
    }

    if (!vehicles || vehicles.length === 0) {
        return (
            <EmptyState
                icon="car-outline"
                title="No hay vehículos en este viaje"
                message="Los vehículos se agregan al crear el viaje"
            />
        );
    }

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1">
                <View className="p-5 gap-5">
                    {/* Información del viaje */}
                    <View className="border-2 border-primary-yellow/30 rounded-2xl p-4 bg-primary-yellow/5">
                        <View className="flex-row items-center gap-2 mb-2">
                            <Ionicons name="information-circle" size={24} color="#FFD54D" />
                            <SubtitleSemibold className="text-dark-black">Vehículos del viaje</SubtitleSemibold>
                        </View>
                        <TextRegular className="text-neutral-gray">
                            {vehicles.length} {vehicles.length === 1 ? 'vehículo registrado' : 'vehículos registrados'}
                        </TextRegular>
                    </View>

                    {/* Lista de vehículos */}
                    <View className="gap-4">
                        {vehicles.map((vehicleData, index) => {
                            // Extraer el vehículo desde vehicleData (puede venir de un join)
                            const vehicle: Vehicle = vehicleData.vehicle || vehicleData;

                            return (
                                <View key={vehicleData.id_vehicle || index}>
                                    <VehicleCard
                                        vehicle={vehicle}
                                        isInTrip={true}
                                        canRemove={permissions.canEdit}
                                        onRemoveFromTrip={() => handleRemoveVehicle(vehicleData.id_vehicle)}
                                    />
                                    {index < vehicles.length - 1 && (
                                        <View className="h-px bg-neutral-gray/20 my-2" />
                                    )}
                                </View>
                            );
                        })}
                    </View>

                    {/* Nota informativa */}
                    {!permissions.canEdit && (
                        <View className="bg-primary-yellow/10 rounded-2xl p-4 border-2 border-primary-yellow/30">
                            <View className="flex-row items-start gap-3">
                                <Ionicons name="lock-closed" size={20} color="#FFD54D" />
                                <MicrotextDark className="flex-1 text-neutral-gray">
                                    Solo los editores y propietarios pueden eliminar vehículos del viaje
                                </MicrotextDark>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
