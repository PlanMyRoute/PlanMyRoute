import { SettingsIcon } from '@/components/assets/Icons';
import CustomAlert, { AlertAction } from '@/components/customElements/CustomAlert';
import { MicrotextDark, SubtitleMedium } from '@/components/customElements/CustomText';
import { FuelType, Vehicle, VehicleType } from '@/services/VehicleService';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

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

interface VehicleCardProps {
    vehicle: Vehicle;
    isCreatingTrip?: boolean;
    isSelected?: boolean;
    isInTrip?: boolean; // Si está mostrando el vehículo dentro de un viaje
    canRemove?: boolean; // Si el usuario puede eliminar el vehículo del viaje
    onEdit?: (vehicle: Vehicle) => void;
    onDelete?: (vehicle: Vehicle) => void;
    onRemoveFromTrip?: (vehicle: Vehicle) => void;
    onPress?: () => void;
}

export function VehicleCard({
    vehicle,
    onEdit,
    onDelete,
    onRemoveFromTrip,
    isCreatingTrip,
    isSelected = false,
    isInTrip = false,
    canRemove = true,
    onPress
}: VehicleCardProps) {
    const [showAlert, setShowAlert] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleSettingsPress = () => {
        setShowAlert(true);
    };

    const handleDeletePress = () => {
        setShowAlert(false);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = () => {
        setShowDeleteConfirm(false);
        if (onDelete) {
            onDelete(vehicle);
        }
    };

    // Definir las acciones según el contexto
    const getAlertActions = (): AlertAction[] => {
        if (isInTrip) {
            // Dentro de un viaje: solo opción de eliminar del viaje
            return [
                {
                    text: 'Eliminar del viaje',
                    onPress: () => {
                        if (canRemove && onRemoveFromTrip) {
                            onRemoveFromTrip(vehicle);
                        }
                        setShowAlert(false);
                    },
                    variant: 'danger'
                }
            ];
        } else {
            // Fuera de un viaje: editar o borrar vehículo
            const actions: AlertAction[] = [];

            if (onEdit) {
                actions.push({
                    text: 'Editar',
                    onPress: () => {
                        onEdit(vehicle);
                        setShowAlert(false);
                    },
                    variant: 'outline'
                });
            }

            if (onDelete) {
                actions.push({
                    text: 'Borrar vehículo',
                    onPress: handleDeletePress,
                    variant: 'danger'
                });
            }

            return actions;
        }
    };

    return (
        <>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                className={`rounded-3xl p-4 border-2 ${isSelected
                    ? 'bg-primary-yellow/10 border-primary-yellow'
                    : 'bg-white border-neutral-gray/20'
                    }`}
            >
                <View className="flex-row items-center">
                    <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isSelected ? 'bg-primary-yellow' : 'bg-dark-black'
                        }`}>
                        <Ionicons
                            name={getVehicleIcon(vehicle.type) as any}
                            size={20}
                            color={isSelected ? '#202020' : '#FFFFFF'}
                        />
                    </View>
                    <View className="flex-1">
                        <SubtitleMedium numberOfLines={1} ellipsizeMode="tail">
                            {vehicle.brand} {vehicle.model}
                        </SubtitleMedium>
                        <View className="flex-row items-center mt-1 flex-wrap">
                            <MicrotextDark className="text-neutral-gray">
                                {VEHICLE_TYPE_LABELS[vehicle.type]}
                            </MicrotextDark>
                            {vehicle.type_fuel && (
                                <>
                                    <View className="w-1 h-1 rounded-full bg-neutral-gray mx-2" />
                                    <MicrotextDark className="text-neutral-gray">
                                        {FUEL_TYPE_LABELS[vehicle.type_fuel as FuelType]}
                                    </MicrotextDark>
                                </>
                            )}
                            {vehicle.avg_consumption && (
                                <>
                                    <View className="w-1 h-1 rounded-full bg-neutral-gray mx-2" />
                                    <MicrotextDark className="text-neutral-gray">
                                        {vehicle.avg_consumption}L/100km
                                    </MicrotextDark>
                                </>
                            )}
                        </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                        {isSelected && (
                            <Ionicons name="checkmark-circle" size={24} color="#FFD54D" />
                        )}
                        {/* Botón de ajustes - solo mostrar si hay acciones disponibles */}
                        {(!isCreatingTrip && ((!isInTrip && (onEdit || onDelete)) || (isInTrip && canRemove && onRemoveFromTrip)) && (
                            <TouchableOpacity
                                onPress={handleSettingsPress}
                                className="w-9 h-9 items-center justify-center"
                                activeOpacity={0.7}
                            >
                                <SettingsIcon width={22} height={22} fill="#999999" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </TouchableOpacity>

            {/* Alert de opciones */}
            <CustomAlert
                visible={showAlert}
                title={`${vehicle.brand} ${vehicle.model}`}
                message={isInTrip ? '¿Deseas eliminar este vehículo del viaje?' : '¿Qué deseas hacer con este vehículo?'}
                type="info"
                actions={getAlertActions()}
                onClose={() => setShowAlert(false)}
            />

            {/* Alert de confirmación para borrar vehículo */}
            <CustomAlert
                visible={showDeleteConfirm}
                title="Confirmar Eliminación"
                message={`¿Estás seguro de que quieres eliminar ${vehicle.brand} ${vehicle.model}? Esta acción no se puede deshacer.`}
                type="warning"
                actions={[
                    {
                        text: 'Cancelar',
                        onPress: () => setShowDeleteConfirm(false),
                        variant: 'outline'
                    },
                    {
                        text: 'Eliminar',
                        onPress: handleConfirmDelete,
                        variant: 'danger'
                    }
                ]}
                onClose={() => setShowDeleteConfirm(false)}
            />
        </>
    );
}
