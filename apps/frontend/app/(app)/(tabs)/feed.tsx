import { EmptyState } from '@/components/customElements/EmptyState';
import { LoadingView } from '@/components/customElements/LoadingView';
import { Title3Bold } from '@/components/customElements/CustomText';
import { UserSearchInput } from '@/components/customElements/UserSearchInput';
import { FeedReviewCard } from '@/components/FeedReviewCard';
import { useSocialReviewsFeed } from '@/hooks/useReviews';
import type { User } from '@planmyroute/types';
import { useRouter } from 'expo-router';
import { ROUTES } from '@/constants/routes';
import { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
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
        router.push(ROUTES.userProfile(user.username));
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
        <EmptyState
            icon="people-outline"
            iconSize={48}
            iconColor="#9CA3AF"
            iconBackgroundColor="#F3F4F6"
            iconBackgroundSize={96}
            title="Tu feed está vacío"
            message="Sigue a otros viajeros para ver sus reseñas aquí"
        />
    );

    const renderError = () => (
        <EmptyState
            icon="warning-outline"
            iconSize={48}
            iconColor="#EF4444"
            iconBackgroundColor="#FEE2E2"
            iconBackgroundSize={96}
            title="Error al cargar el feed"
            message="No pudimos cargar el contenido. Intenta de nuevo."
            actionLabel="Reintentar"
            onAction={() => refetch()}
        />
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
        return <LoadingView safeArea />;
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
