import CustomInput from '@/components/customElements/CustomInput';
import { MicrotextDark, SubtitleSemibold, TextRegular } from '@/components/customElements/CustomText';
import { Invitation } from '@/components/notifications/Invitation';
import { TripStatusCheck } from '@/components/notifications/TripStatusCheck';
import { TripUpdate } from '@/components/notifications/TripUpdate';
import { useAuth } from '@/context/AuthContext';
import useNotifications, { useDeleteNotification } from '@/hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';
import { notifications } from '@planmyroute/types';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, RefreshControl, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

type FilterType = 'all' | 'pending' | 'accepted' | 'rejected';

interface GroupedNotifications {
    title: string;
    data: notifications[];
}

export default function NotificationsScreen() {
    const { user } = useAuth();
    const userId = user?.id;

    const { data, isLoading, error, refetch } = useNotifications(userId);
    const deleteMutation = useDeleteNotification(userId);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [showFilterModal, setShowFilterModal] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const getDaysAgo = (dateString: string): number => {
        const notificationDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        notificationDate.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - notificationDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const groupedNotifications = useMemo(() => {
        if (!data) return [];

        let filtered = data.filter(notification =>
            notification.content?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (filterType !== 'all') {
            filtered = filtered.filter(notification =>
                notification.action_status === filterType
            );
        }

        const pending = filtered.filter(n => n.action_status === 'pending');
        const others = filtered.filter(n => n.action_status !== 'pending');

        const groups: GroupedNotifications[] = [];

        if (pending.length > 0) {
            groups.push({
                title: 'Pendientes',
                data: pending,
            });
        }

        const today: notifications[] = [];
        const yesterday: notifications[] = [];
        const last7Days: notifications[] = [];
        const last30Days: notifications[] = [];
        const older: notifications[] = [];

        others.forEach(notification => {
            const daysAgo = getDaysAgo(notification.created_at);

            if (daysAgo === 0) {
                today.push(notification);
            } else if (daysAgo === 1) {
                yesterday.push(notification);
            } else if (daysAgo <= 7) {
                last7Days.push(notification);
            } else if (daysAgo <= 30) {
                last30Days.push(notification);
            } else {
                older.push(notification);
            }
        });

        if (today.length > 0) groups.push({ title: 'Hoy', data: today });
        if (yesterday.length > 0) groups.push({ title: 'Ayer', data: yesterday });
        if (last7Days.length > 0) groups.push({ title: 'Últimos 7 días', data: last7Days });
        if (last30Days.length > 0) groups.push({ title: 'Últimos 30 días', data: last30Days });
        if (older.length > 0) groups.push({ title: 'Más antiguas', data: older });

        return groups;
    }, [data, searchQuery, filterType]);

    const handleDelete = (notificationId: number) => {
        deleteMutation.mutate(notificationId, {
            onSuccess: () => {
                Toast.show({
                    type: 'info',
                    text1: 'Notificación eliminada',
                    text2: 'La notificación ha sido borrada',
                });
            },
            onError: (error: any) => {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: error?.message || 'No se pudo eliminar la notificación',
                });
            },
        });
    };

    const renderRightActions = (notificationId: number) => {
        return (
            <TouchableOpacity
                className="bg-red-500 justify-center items-center px-6 rounded-3xl ml-2"
                onPress={() => handleDelete(notificationId)}
            >
                <Ionicons name="trash-outline" size={24} color="white" />
                <MicrotextDark className="text-white mt-1">Borrar</MicrotextDark>
            </TouchableOpacity>
        );
    };

    const renderNotificationItem = ({ item }: { item: notifications }) => {
        // Renderizar componente según el tipo de notificación
        let NotificationComponent;

        switch (item.type) {
            case 'trip_status_check':
                NotificationComponent = TripStatusCheck;
                break;
            case 'trip_update':
                NotificationComponent = TripUpdate;
                break;
            case 'invitation':
            default:
                NotificationComponent = Invitation;
                break;
        }

        return (
            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
                <View className="bg-white">
                    <NotificationComponent notification={item} userId={userId as string} />
                </View>
            </Swipeable>
        );
    };

    const filterOptions: { label: string; value: FilterType }[] = [
        { label: 'Todas', value: 'all' },
        { label: 'Pendientes', value: 'pending' },
        { label: 'Aceptadas', value: 'accepted' },
        { label: 'Rechazadas', value: 'rejected' },
    ];

    if (!userId) {
        return (
            <SafeAreaView edges={['bottom']} className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#FFD54D" />
                <TextRegular className="mt-4 text-neutral-gray">Cargando notificaciones...</TextRegular>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
            {/* Header */}
            <View className="px-6 pt-4 pb-6">


                {/* Search Bar */}
                <View className="flex-row items-center gap-3 mt-4">
                    <View className="flex-1">
                        <CustomInput
                            placeholder="Buscar nuevas ideas..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            containerClassName="mb-0"
                        />
                    </View>
                    <TouchableOpacity
                        className="w-12 h-12 bg-dark-black rounded-full items-center justify-center"
                        onPress={() => setShowFilterModal(true)}
                    >
                        <Ionicons name="options-outline" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Active Filter Indicator */}
                {filterType !== 'all' && (
                    <View className="flex-row items-center mt-3">
                        <MicrotextDark className="text-neutral-gray mr-2">
                            Filtro: {filterOptions.find(f => f.value === filterType)?.label}
                        </MicrotextDark>
                        <TouchableOpacity onPress={() => setFilterType('all')}>
                            <Ionicons name="close-circle" size={18} color="#999999" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Filter Modal */}
            <Modal
                visible={showFilterModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowFilterModal(false)}
            >
                <TouchableOpacity
                    className="flex-1 bg-black/50 justify-center items-center"
                    activeOpacity={1}
                    onPress={() => setShowFilterModal(false)}
                >
                    <View className="bg-white rounded-3xl p-6 mx-6 w-64">
                        <SubtitleSemibold className="mb-4">Filtrar por</SubtitleSemibold>
                        {filterOptions.map(option => (
                            <TouchableOpacity
                                key={option.value}
                                className={`py-3 px-4 rounded-2xl mb-2 ${filterType === option.value
                                    ? 'bg-primary-yellow'
                                    : 'bg-neutral-gray/10'
                                    }`}
                                onPress={() => {
                                    setFilterType(option.value);
                                    setShowFilterModal(false);
                                }}
                            >
                                <TextRegular
                                    className={
                                        filterType === option.value
                                            ? 'text-dark-black'
                                            : 'text-neutral-gray'
                                    }
                                >
                                    {option.label}
                                </TextRegular>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Notifications List */}
            <View className="flex-1 px-6">
                {isLoading && !refreshing && (
                    <View className="py-8 items-center">
                        <ActivityIndicator size="large" color="#FFD54D" />
                    </View>
                )}
                {error && (
                    <View className="py-8 items-center">
                        <TextRegular className="text-red-500">{error}</TextRegular>
                    </View>
                )}

                <FlatList
                    data={groupedNotifications}
                    keyExtractor={(item, index) => `section-${index}`}
                    renderItem={({ item: section }) => (
                        <View className="mb-6">
                            <SubtitleSemibold className="mb-3">
                                {section.title}
                            </SubtitleSemibold>
                            <View className="gap-3">
                                {section.data.map(notification => (
                                    <View key={notification.id}>
                                        {renderNotificationItem({ item: notification })}
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={() => (
                        <View className="py-16 items-center">
                            <View className="w-20 h-20 rounded-full bg-neutral-gray/10 items-center justify-center mb-4">
                                <Ionicons name="notifications-off-outline" size={32} color="#999999" />
                            </View>
                            <TextRegular className="text-neutral-gray text-center">
                                {searchQuery || filterType !== 'all'
                                    ? 'No se encontraron notificaciones'
                                    : 'No hay notificaciones'}
                            </TextRegular>
                        </View>
                    )}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#FFD54D']}
                            tintColor="#FFD54D"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </SafeAreaView>
    );
}