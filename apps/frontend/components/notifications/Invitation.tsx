import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, TextRegular } from '@/components/customElements/CustomText';
import { useAcceptInvitation, useDeclineInvitation } from '@/hooks/useNotifications';
import { notifications } from '@planmyroute/types';
import { Link, useRouter } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

interface InvitationProps {
    notification: notifications;
    userId: string | number;
}

export const Invitation: React.FC<InvitationProps> = ({ notification, userId }) => {
    const router = useRouter();
    const acceptMutation = useAcceptInvitation(userId);
    const declineMutation = useDeclineInvitation(userId);

    const extractRoleFromContent = (content: string): 'owner' | 'editor' | 'viewer' => {
        if (content.includes('Propietario')) return 'owner';
        if (content.includes('Editor')) return 'editor';
        if (content.includes('Observador')) return 'viewer';
        return 'viewer';
    };

    const handleAcceptInvitation = () => {
        const role = extractRoleFromContent(notification.content!);
        acceptMutation.mutate(
            { notificationId: notification.id, role },
            {
                onSuccess: () => {
                    Toast.show({
                        type: 'success',
                        text1: '¡Bienvenido al viaje!',
                        text2: 'Toca para ir al viaje',
                        onPress: () => {
                            Toast.hide();
                            router.push(`/trip/${notification.related_trip_id}`);
                        },
                        visibilityTime: 4000,
                    });
                },
                onError: (error: any) => {
                    Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: error?.message || 'No se pudo aceptar la invitación',
                    });
                },
            }
        );
    };

    const handleDeclineInvitation = () => {
        declineMutation.mutate(notification.id, {
            onSuccess: () => {
                Toast.show({
                    type: 'info',
                    text1: 'Invitación rechazada',
                    text2: 'Has rechazado la invitación al viaje',
                });
            },
            onError: (error: any) => {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: error?.message || 'No se pudo rechazar la invitación',
                });
            },
        });
    };

    const isLoading = acceptMutation.isPending || declineMutation.isPending;

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
        <View className="bg-white border-2 border-neutral-gray/20 rounded-3xl p-4 mb-3">
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-2">
                    <TextRegular className="text-dark-black">{notification.content}</TextRegular>
                </View>
                <MicrotextDark className="text-neutral-gray">{formatDate(notification.created_at)}</MicrotextDark>
            </View>

            {notification.action_status === "pending" ? (
                <View className="flex-row gap-3">
                    <CustomButton
                        title={acceptMutation.isPending ? '' : 'Aceptar'}
                        variant="primary"
                        size="medium"
                        onPress={handleAcceptInvitation}
                        disabled={isLoading}
                        loading={acceptMutation.isPending}
                        className="flex-1"
                    />

                    <CustomButton
                        title={declineMutation.isPending ? '' : 'Rechazar'}
                        variant="outline"
                        size="medium"
                        onPress={handleDeclineInvitation}
                        disabled={isLoading}
                        loading={declineMutation.isPending}
                        className="flex-1"
                    />
                </View>
            ) : (
                <View>
                    {notification.action_status === "accepted" ? (
                        <View>
                            <MicrotextDark className="text-neutral-gray italic mb-2">
                                ✓ Has aceptado esta invitación
                            </MicrotextDark>
                            <Link href={`/trip/${notification.related_trip_id}`} asChild>
                                <TouchableOpacity className="bg-primary-yellow/10 border-2 border-primary-yellow rounded-2xl py-2.5 px-4">
                                    <TextRegular className="text-dark-black text-center">
                                        Ver viaje
                                    </TextRegular>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    ) : (
                        <MicrotextDark className="text-neutral-gray italic">
                            ✗ Has rechazado esta invitación
                        </MicrotextDark>
                    )}
                </View>
            )}
        </View>
    );
}