import { Ionicons } from '@expo/vector-icons';
import { Stop } from '@planmyroute/types';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useStopAttachments } from '@/hooks/useAttachments';

interface StopCardProps {
    stop: Stop;
    onDelete?: (stopId: number, stopName: string) => void;
    isLoading?: boolean;
    onEdit?: (stop: Stop) => void;
    onLongPress?: () => void;
    isActive?: boolean;
}

export const StopCard: React.FC<StopCardProps> = ({
    stop,
    onDelete,
    onEdit,
    isLoading = false,
    onLongPress,
    isActive = false
}) => {
    // TEMPORAL: Deshabilitado hasta arreglar el problema de autenticación
    // const { data: attachments } = useStopAttachments(String(stop.id));
    // const hasAttachments = attachments && attachments.length > 0;
    const hasAttachments = false;
    // Animación para cuando el item está siendo arrastrado
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    scale: withSpring(isActive ? 1.05 : 1, {
                        damping: 15,
                        stiffness: 150,
                        mass: 0.5,
                    })
                },
            ],
            opacity: withSpring(isActive ? 0.95 : 1, {
                damping: 15,
                stiffness: 150,
            }),
        };
    });

    return (
        <Animated.View
            style={[
                styles.container,
                animatedStyle,
                isActive && styles.containerActive
            ]}
        >
            {/* Foto de la parada (si existe) */}
            {stop.photo_url && (
                <View className="mb-3 rounded-lg overflow-hidden">
                    <Image
                        source={{ uri: stop.photo_url }}
                        style={{ width: '100%', height: 160 }}
                        resizeMode="cover"
                    />
                </View>
            )}

            <View className="flex-row items-start justify-between">
                <TouchableOpacity
                    onLongPress={onLongPress}
                    activeOpacity={0.7}
                    delayLongPress={300}
                    className="flex-row items-start flex-1"
                >
                    {/* Icono de drag handle */}
                    {onLongPress && (
                        <View className="mr-2 pt-1">
                            <Ionicons name="menu" size={20} color={isActive ? "#4F46E5" : "#9CA3AF"} />
                        </View>
                    )}

                    {/* Número de la parada */}
                    <View className="bg-indigo-600 rounded-full w-8 h-8 items-center justify-center mr-3">
                        <Text className="text-white font-bold">{stop.order}</Text>
                    </View>

                    {/* Información de la parada */}
                    <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-800">{stop.name}</Text>
                        {stop.address && (
                            <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
                                {stop.address}
                            </Text>
                        )}
                        {stop.coordinates && stop.coordinates.latitude && stop.coordinates.longitude && (
                            <View className="flex-row items-center mt-2">
                                <Ionicons name="location" size={14} color="#6B7280" />
                                <Text className="text-xs text-gray-400 ml-1">
                                    {stop.coordinates.latitude.toFixed(4)}, {stop.coordinates.longitude.toFixed(4)}
                                </Text>
                            </View>
                        )}

                        {/* Tipo de parada */}
                        <View className="flex-row items-center mt-2 flex-wrap gap-2">
                            <View
                                className={`px-2 py-1 rounded-full ${stop.type === 'origen'
                                    ? 'bg-green-100'
                                    : stop.type === 'destino'
                                        ? 'bg-red-100'
                                        : 'bg-blue-100'
                                    }`}
                            >
                                <Text
                                    className={`text-xs font-medium ${stop.type === 'origen'
                                        ? 'text-green-700'
                                        : stop.type === 'destino'
                                            ? 'text-red-700'
                                            : 'text-blue-700'
                                        }`}
                                >
                                    {stop.type === 'origen'
                                        ? 'Origen'
                                        : stop.type === 'destino'
                                            ? 'Destino'
                                            : 'Intermedia'}
                                </Text>
                            </View>

                            {/* Badge de archivo adjunto */}
                            {hasAttachments && (
                                <View className="bg-yellow-100 px-2 py-1 rounded-full flex-row items-center">
                                    <Ionicons name="attach" size={12} color="#854D0E" />
                                    <Text className="text-xs font-medium text-yellow-800 ml-1">
                                        {attachments.length} {attachments.length === 1 ? 'archivo' : 'archivos'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>

                <View className="flex-row items-center">
                    {/* Botón de eliminar */}
                    {onDelete && (
                        <TouchableOpacity
                            onPress={() => onDelete(stop.id, stop.name)}
                            className="ml-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Ionicons name="hourglass-outline" size={20} color="#94A3B8" />
                            ) : (
                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Botón de editar */}
                    {onEdit && (
                        <TouchableOpacity
                            onPress={() => onEdit(stop)}
                            className="ml-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Ionicons name="hourglass-outline" size={20} color="#94A3B8" />
                            ) : (
                                <Ionicons name="pencil-outline" size={20} color="#4F46E5" />
                            )}
                        </TouchableOpacity>
                    )}
                </View>

            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    containerActive: {
        borderColor: '#6366F1',
        backgroundColor: '#FFFFFF',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
});