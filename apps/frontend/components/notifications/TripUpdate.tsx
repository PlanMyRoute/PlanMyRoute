import { MicrotextDark, TextRegular } from '@/components/customElements/CustomText';
import { notifications } from '@planmyroute/types';
import { Link } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';

interface TripUpdateProps {
    notification: notifications;
}

export const TripUpdate: React.FC<TripUpdateProps> = ({ notification }) => {
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
                    <View className="flex-row items-center mb-1">
                        <View className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                        <TextRegular className="text-dark-black font-semibold">
                            ℹ️ Actualización de Viaje
                        </TextRegular>
                    </View>
                    <TextRegular className="text-dark-black mt-1">{notification.content}</TextRegular>
                </View>
                <MicrotextDark className="text-neutral-gray">{formatDate(notification.created_at)}</MicrotextDark>
            </View>

            {notification.related_trip_id && (
                <Link href={`/trip/${notification.related_trip_id}`} asChild>
                    <TouchableOpacity className="bg-neutral-gray/10 border-2 border-neutral-gray/30 rounded-2xl py-2.5 px-4">
                        <TextRegular className="text-dark-black text-center">
                            Ver viaje
                        </TextRegular>
                    </TouchableOpacity>
                </Link>
            )}
        </View>
    );
};
