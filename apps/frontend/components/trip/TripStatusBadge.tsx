import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

type TripStatusBadgeProps = {
    isGuest?: boolean;
    isCompleted?: boolean;
    variant?: 'default' | 'compact';
};

/**
 * Badge para mostrar el estado del viaje
 * - Guest: Usuario visitando desde reviews (solo lectura)
 * - Completed: Viaje finalizado (solo lectura, excepto delete para owner)
 */
export function TripStatusBadge({ isGuest, isCompleted, variant = 'default' }: TripStatusBadgeProps) {
    if (!isGuest && !isCompleted) {
        return null;
    }

    const isCompact = variant === 'compact';

    if (isGuest) {
        return (
            <View className={`flex-row items-center ${isCompact ? 'bg-blue-100 px-2 py-1' : 'bg-blue-50 px-3 py-1.5'} rounded-full`}>
                <Ionicons
                    name="eye-outline"
                    size={isCompact ? 14 : 16}
                    color="#2563EB"
                />
                <Text className={`${isCompact ? 'text-xs' : 'text-sm'} font-medium text-blue-700 ml-1`}>
                    Solo lectura
                </Text>
            </View>
        );
    }

    if (isCompleted) {
        return (
            <View className={`flex-row items-center ${isCompact ? 'bg-gray-100 px-2 py-1' : 'bg-gray-50 px-3 py-1.5'} rounded-full`}>
                <Ionicons
                    name="checkmark-circle"
                    size={isCompact ? 14 : 16}
                    color="#059669"
                />
                <Text className={`${isCompact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 ml-1`}>
                    Finalizado
                </Text>
            </View>
        );
    }

    return null;
}

/**
 * Banner informativo para mostrar en el header cuando hay restricciones
 */
export function TripStatusBanner({ isGuest, isCompleted }: TripStatusBadgeProps) {
    if (!isGuest && !isCompleted) {
        return null;
    }

    return (
        <View className="bg-yellow-50 border-l-4 border-yellow-400 px-4 py-3 mb-4">
            <View className="flex-row items-start">
                <Ionicons
                    name="information-circle"
                    size={20}
                    color="#F59E0B"
                    style={{ marginTop: 2 }}
                />
                <View className="flex-1 ml-3">
                    {isGuest && (
                        <>
                            <Text className="text-sm font-semibold text-yellow-800 mb-1">
                                Modo Solo Lectura
                            </Text>
                            <Text className="text-xs text-yellow-700">
                                Estás visitando este viaje como invitado. No puedes realizar cambios.
                            </Text>
                        </>
                    )}
                    {isCompleted && !isGuest && (
                        <>
                            <Text className="text-sm font-semibold text-yellow-800 mb-1">
                                Viaje Finalizado
                            </Text>
                            <Text className="text-xs text-yellow-700">
                                Este viaje ha sido marcado como completado y no puede editarse.
                            </Text>
                        </>
                    )}
                </View>
            </View>
        </View>
    );
}
