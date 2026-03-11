import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, TextRegular } from '@/components/customElements/CustomText';
import { useAuth } from '@/context/AuthContext';
import { notifications } from '@planmyroute/types';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Toast from 'react-native-toast-message';

interface TripStatusCheckProps {
    notification: notifications;
    userId: string | number;
}

export const TripStatusCheck: React.FC<TripStatusCheckProps> = ({ notification, userId }) => {
    const router = useRouter();
    const { session } = useAuth();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);

    const isStartNotification = notification.content?.toLowerCase().includes('comenzar') ||
        notification.content?.toLowerCase().includes('empezar') ||
        notification.content?.toLowerCase().includes('partir');

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/trip/${notification.related_trip_id}/status/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    notificationId: notification.id,
                    started: isStartNotification ? true : undefined,
                    completed: !isStartNotification ? true : undefined,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al responder');
            }

            const result = await response.json();

            // Invalidar cache de notificaciones
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
            queryClient.invalidateQueries({ queryKey: ['trip', notification.related_trip_id] });

            Toast.show({
                type: 'success',
                text1: isStartNotification ? '¡Buen viaje! 🚗' : '¡Viaje completado! 🎉',
                text2: result.message,
                onPress: () => {
                    Toast.hide();
                    router.push(`/trip/${notification.related_trip_id}`);
                },
                visibilityTime: 4000,
            });
        } catch (error: any) {
            console.error('Error responding to trip status:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error?.message || 'No se pudo actualizar el estado del viaje',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeny = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/trip/${notification.related_trip_id}/status/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    notificationId: notification.id,
                    started: isStartNotification ? false : undefined,
                    completed: !isStartNotification ? false : undefined,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al responder');
            }

            // Invalidar cache de notificaciones
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] });

            Toast.show({
                type: 'info',
                text1: 'Respuesta registrada',
                text2: isStartNotification
                    ? 'El viaje se mantendrá en planificación'
                    : 'El viaje continuará en curso',
            });
        } catch (error: any) {
            console.error('Error responding to trip status:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error?.message || 'No se pudo registrar la respuesta',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
            return `Hace ${diffMins} min`;
        } else if (diffHours < 24) {
            return `Hace ${diffHours}h`;
        } else if (diffDays === 1) {
            return 'Ayer';
        } else if (diffDays < 7) {
            return `Hace ${diffDays} días`;
        } else {
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        }
    };

    return (
        <View className="bg-white border-2 border-primary-yellow/30 rounded-3xl p-4 mb-3">
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-2">
                    <View className="flex-row items-center mb-1">
                        <View className="w-2 h-2 bg-primary-yellow rounded-full mr-2" />
                        <TextRegular className="text-dark-black font-semibold">
                            {isStartNotification ? '🚗 Estado del Viaje' : '🏁 Estado del Viaje'}
                        </TextRegular>
                    </View>
                    <TextRegular className="text-dark-black mt-1">{notification.content}</TextRegular>
                </View>
                <MicrotextDark className="text-neutral-gray">{formatDate(notification.created_at)}</MicrotextDark>
            </View>

            {notification.action_status === 'pending' ? (
                <View className="flex-row gap-3">
                    <CustomButton
                        title={isLoading ? '' : isStartNotification ? 'Sí, he empezado' : 'Sí, he terminado'}
                        variant="primary"
                        size="medium"
                        onPress={handleConfirm}
                        disabled={isLoading}
                        loading={isLoading}
                        className="flex-1"
                    />

                    <CustomButton
                        title={isLoading ? '' : 'Aún no'}
                        variant="outline"
                        size="medium"
                        onPress={handleDeny}
                        disabled={isLoading}
                        loading={isLoading}
                        className="flex-1"
                    />
                </View>
            ) : (
                <View>
                    {notification.action_status === 'accepted' ? (
                        <MicrotextDark className="text-green-600 italic">
                            ✓ Has confirmado el cambio de estado
                        </MicrotextDark>
                    ) : (
                        <MicrotextDark className="text-neutral-gray italic">
                            ✗ Has indicado que aún no
                        </MicrotextDark>
                    )}
                </View>
            )}
        </View>
    );
};
