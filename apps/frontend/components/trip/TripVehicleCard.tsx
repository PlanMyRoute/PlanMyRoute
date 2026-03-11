import { MicrotextDark, SubtitleMedium } from '@/components/customElements/CustomText';
import { FuelType, VehicleType } from '@/services/VehicleService';
import { Ionicons } from '@expo/vector-icons';
import { Alert, TouchableOpacity, View } from 'react-native';

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
    car: 'Coche',
    motorcycle: 'Moto',
    campervan: 'Autocaravana',
    van: 'Furgoneta',
};

const FUEL_TYPE_LABELS: Record<FuelType, string> = {
    gasoline: 'Gasolina',
    diesel: 'Diésel',
    electric: 'Eléctrico',
    LPG: 'GLP',
};

const getVehicleIcon = (type: VehicleType): any => {
    const icons: Record<VehicleType, string> = {
        car: 'car',
        motorcycle: 'bicycle',
        campervan: 'bus',
        van: 'cube',
    };
    return icons[type] || 'car';
};

interface TripVehicleCardProps {
    vehicleData: any; // Datos de la relación road_trip con info del vehículo
    canRemove: boolean;
    onRemove: () => void;
}

export function TripVehicleCard({ vehicleData, canRemove, onRemove }: TripVehicleCardProps) {
    // Los datos vienen de la tabla road_trip que tiene id_vehicle, id_trip
    // Necesitamos hacer join con vehicle para obtener los detalles
    // Por ahora asumimos que vehicleData contiene toda la info del vehículo

    const handleRemove = () => {
        if (!canRemove) {
            Alert.alert(
                'Permisos insuficientes',
                'No tienes permisos para eliminar vehículos de este viaje'
            );
            return;
        }
        onRemove();
    };

    // Extraer datos del vehículo (puede venir de un join en el backend)
    const vehicle = vehicleData.vehicle || vehicleData;
    const brand = vehicle.brand || 'Marca desconocida';
    const model = vehicle.model || 'Modelo desconocido';
    const type = vehicle.type || 'car';
    const typeFuel = vehicle.type_fuel;
    const avgConsumption = vehicle.avg_consumption;

    return (
        <View className="rounded-2xl bg-gray-50 p-4">
            <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full items-center justify-center mr-3 bg-indigo-600">
                    <Ionicons
                        name={getVehicleIcon(type as VehicleType) as any}
                        size={24}
                        color="#FFFFFF"
                    />
                </View>

                <View className="flex-1">
                    <SubtitleMedium numberOfLines={1} ellipsizeMode="tail">
                        {brand} {model}
                    </SubtitleMedium>
                    <View className="flex-row items-center mt-1 flex-wrap">
                        <MicrotextDark className="text-neutral-gray">
                            {VEHICLE_TYPE_LABELS[type as VehicleType] || type}
                        </MicrotextDark>
                        {typeFuel && (
                            <>
                                <View className="w-1 h-1 rounded-full bg-neutral-gray mx-2" />
                                <MicrotextDark className="text-neutral-gray">
                                    {FUEL_TYPE_LABELS[typeFuel as FuelType] || typeFuel}
                                </MicrotextDark>
                            </>
                        )}
                        {avgConsumption && (
                            <>
                                <View className="w-1 h-1 rounded-full bg-neutral-gray mx-2" />
                                <MicrotextDark className="text-neutral-gray">
                                    {avgConsumption}L/100km
                                </MicrotextDark>
                            </>
                        )}
                    </View>
                </View>

                {canRemove && (
                    <TouchableOpacity
                        onPress={handleRemove}
                        className="ml-2 bg-red-50 w-10 h-10 rounded-full items-center justify-center"
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
