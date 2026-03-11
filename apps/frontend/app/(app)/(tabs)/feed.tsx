import { TextRegular, Title2Semibold, Title3Bold } from '@/components/customElements/CustomText';
import { UserSearchInput } from '@/components/customElements/UserSearchInput';
import { FeedReviewCard } from '@/components/FeedReviewCard';
import { useSocialReviewsFeed } from '@/hooks/useReviews';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '@planmyroute/types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ITEMS_PER_PAGE = 10;

// Tipo de feed que se puede mostrar (escalable para futuras expansiones)
type FeedType = 'social' | 'public' | 'recommended';

export default function FeedScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [feedType, setFeedType] = useState<FeedType>('social'); // Por ahora solo social

    // Fetch reviews feed - usa el feed social que filtra por follows/followers
    const {
        data,
        isLoading,
        isError,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useSocialReviewsFeed({ limit: ITEMS_PER_PAGE, offset: 0 });

    // Extraer el array de reseñas del objeto data
    const reviews = data?.reviews || [];

    const handleUserSelect = (user: User) => {
        router.push(`/${user.username}`);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    const renderEmpty = () => (
        <View className="flex-1 items-center justify-center px-6 py-12">
            <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="people-outline" size={48} color="#9CA3AF" />
            </View>
            <Title2Semibold className="text-gray-800 mb-2 text-center">
                Tu feed está vacío
            </Title2Semibold>
            <TextRegular className="text-gray-500 text-center">
                Sigue a otros viajeros para ver sus reseñas aquí
            </TextRegular>
        </View>
    );

    const renderError = () => (
        <View className="flex-1 items-center justify-center px-6 py-12">
            <View className="w-24 h-24 bg-red-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="warning-outline" size={48} color="#EF4444" />
            </View>
            <Title2Semibold className="text-gray-800 mb-2 text-center">
                Error al cargar el feed
            </Title2Semibold>
            <TextRegular className="text-gray-500 text-center mb-4">
                No pudimos cargar el contenido. Intenta de nuevo.
            </TextRegular>
            <TouchableOpacity
                onPress={() => refetch()}
                className="bg-yellow-400 px-6 py-3 rounded-full"
                activeOpacity={0.7}
            >
                <TextRegular className="text-white">Reintentar</TextRegular>
            </TouchableOpacity>
        </View>
    );

    const renderFooter = () => {
        if (!isFetchingNextPage) return null;

        return (
            <View className="py-4">
                <ActivityIndicator size="small" color="#FFD54D" />
            </View>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#FFD54D" />
                </View>
            </SafeAreaView>
        );
    }

    if (isError) {
        return (
            <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
                {renderError()}
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
            {/* Buscador */}
            <View className="px-6 pt-4 pb-1 bg-white relative z-10">
                <UserSearchInput
                    onUserSelect={handleUserSelect}
                    placeholder="Buscar usuarios..."
                />
            </View>

            {/* Reviews List */}
            <FlatList
                data={reviews}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <FeedReviewCard review={item} />
                )}
                ListHeaderComponent={() => (
                    <Title3Bold className="mb-4">
                        {feedType === 'social' ? 'Reseñas de viajeros que sigues' : 'Reseñas'}
                    </Title3Bold>
                )}
                className='px-2'
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                contentContainerStyle={{
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    flexGrow: reviews.length === 0 ? 1 : undefined,
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#FFD54D"
                        colors={['#FFD54D']}
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}
