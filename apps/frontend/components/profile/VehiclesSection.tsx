import { CustomButton } from '@/components/customElements/CustomButton';
import { TextRegular, Title2Semibold } from '@/components/customElements/CustomText';
import { SkeletonBox } from '@/components/customElements/SkeletonBox';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '@planmyroute/types';
import { View } from 'react-native';
import { VehicleCard } from './VehicleCard';

interface VehiclesSectionProps {
    vehicles: Vehicle[];
    loading: boolean;
    maxVehicles: number;
    isCreatingTrip?: boolean;
    selectedVehicles?: Vehicle[];
    onAddVehicle: () => void;
    onEditVehicle: (vehicle: Vehicle) => void;
    onDeleteVehicle: (vehicle: Vehicle) => void;
    onSelectVehicle?: (vehicle: Vehicle) => void;
}


export function VehiclesSection({
    vehicles,
    loading,
    maxVehicles,
    isCreatingTrip = false,
    selectedVehicles = [],
    onAddVehicle,
    onEditVehicle,
    onDeleteVehicle,
    onSelectVehicle,
}: VehiclesSectionProps) {
    return (
        <View className="mb-6">
            <View className="flex-row justify-between items-center mb-4">
                <Title2Semibold>Vehículos</Title2Semibold>
                {!isCreatingTrip && vehicles.length < maxVehicles && vehicles.length > 0 && (
                    <CustomButton
                        variant="round"
                        size="small"
                        onPress={onAddVehicle}
                        icon={<Ionicons name="add" size={20} color="#202020" />}
                    />
                )}
            </View>

            {loading ? (
                <View className="gap-3">
                    {[1, 2].map(i => (
                        <View key={i} className="rounded-3xl p-4 border-2 border-neutral/10 flex-row items-center gap-3">
                            <SkeletonBox width={40} height={40} borderRadius={20} />
                            <View className="flex-1 gap-2">
                                <SkeletonBox height={16} width="60%" borderRadius={6} />
                                <SkeletonBox height={12} width="40%" borderRadius={6} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : vehicles.length === 0 ? (
                <View className="bg-white border border-neutral-gray/20 rounded-3xl p-6 items-center">
                    <Ionicons name="car-outline" size={48} color="#999999" />
                    <TextRegular className="text-neutral-gray text-center mt-3 mb-4">
                        No tienes vehículos registrados
                    </TextRegular>
                    <CustomButton
                        title="Añadir mi primer vehículo"
                        variant="primary"
                        size="medium"
                        onPress={onAddVehicle}
                    />
                </View>
            ) : (
                <View className="gap-3">
                    {vehicles.map((vehicle) => {
                        const isSelected = selectedVehicles.some(v => v.id === vehicle.id);
                        return (
                            <VehicleCard
                                key={vehicle.id}
                                vehicle={vehicle}
                                onEdit={onEditVehicle}
                                onDelete={onDeleteVehicle}
                                isCreatingTrip={isCreatingTrip}
                                isSelected={isSelected}
                                onPress={() => onSelectVehicle && onSelectVehicle(vehicle)}
                            />
                        );
                    })}
                </View>
            )}
        </View>
    );
}
