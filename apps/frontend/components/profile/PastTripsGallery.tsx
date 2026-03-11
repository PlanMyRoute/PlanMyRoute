import { MicrotextDark, SubtitleSemibold, TextRegular, Title2Semibold } from '@/components/customElements/CustomText';
import { ReviewModal } from '@/components/modals/ReviewModal';
import { useCreateReview, useTripStats, useUserTripReview } from '@/hooks/useReviews';
import { useUserRoleInTrip } from '@/hooks/useTrips';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '@planmyroute/types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Pressable, TouchableOpacity, View } from 'react-native';

interface PastTripsGalleryProps {
    trips: Trip[] | undefined;
    loading: boolean;
}

function GalleryTripCard({ trip, index, isLarge, router }: { trip: Trip; index: number; isLarge: boolean; router: any }) {
    const { data: stats } = useTripStats(trip.id.toString());
    const { data: userReview } = useUserTripReview(trip.id.toString());
    const { data: userRole } = useUserRoleInTrip(trip.id.toString());
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const createReview = useCreateReview();

    const getTripImage = (trip: Trip) => {
        return trip.cover_image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';
    };

    const handleSubmitReview = (rating: number, comment: string, isPublic: boolean) => {
        createReview.mutate(
            {
                trip_id: trip.id,
                rating,
                comment,
                is_public: isPublic,
            },
            {
                onSuccess: () => {
                    setReviewModalVisible(false);
                    Alert.alert('¡Éxito!', 'Tu reseña ha sido publicada');
                },
                onError: (error) => {
                    Alert.alert('Error', 'No se pudo publicar la reseña');
                },
            }
        );
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const month = date.toLocaleDateString('es-ES', { month: 'short' });
        const year = date.getFullYear();
        return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
    };

    const renderStars = (rating: number, size: number = 14) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        return (
            <View className="flex-row items-center gap-0.5">
                {Array.from({ length: fullStars }).map((_, i) => (
                    <Ionicons key={`full-${i}`} name="star" size={size} color="#FFD54D" />
                ))}
                {hasHalfStar && (
                    <Ionicons name="star-half" size={size} color="#FFD54D" />
                )}
                {Array.from({ length: emptyStars }).map((_, i) => (
                    <Ionicons key={`empty-${i}`} name="star-outline" size={size} color="#D1D5DB" />
                ))}
            </View>
        );
    };

    const imageUri = getTripImage(trip);

    return (
        <>
            <Pressable
                onPress={() => router.push(`/trip/${trip.id}`)}
                className={`rounded-3xl overflow-hidden ${isLarge ? 'w-full mb-2' : 'w-[48%] mb-2'}`}
                style={({ pressed }) => pressed ? { opacity: 0.95 } : undefined}
            >
                {/* Imagen del viaje */}
                <ImageBackground
                    source={{ uri: imageUri }}
                    className="w-full"
                    style={{ height: isLarge ? 140 : 100 }}
                >
                    <View className="flex-1 p-3">
                        <View className="flex-row justify-between items-start">
                            <View className="bg-white rounded-full px-3 py-1.5">
                                <MicrotextDark className="text-dark-black text-xs">
                                    {formatDate(trip.start_date || trip.end_date)}
                                </MicrotextDark>
                            </View>

                            {/* Badge de ownership */}
                            {userRole && (
                                <View
                                    className={`rounded-full px-2.5 py-1 ${userRole === 'owner'
                                        ? 'bg-primary-yellow'
                                        : 'bg-blue-500'
                                        }`}
                                >
                                    <View className="flex-row items-center gap-1">
                                        <Ionicons
                                            name={userRole === 'owner' ? 'sparkles' : 'person-add'}
                                            size={10}
                                            color={userRole === 'owner' ? '#202020' : '#FFFFFF'}
                                        />
                                        <MicrotextDark
                                            className="text-xs"
                                            style={{ color: userRole === 'owner' ? '#202020' : '#FFFFFF' }}
                                        >
                                            {userRole === 'owner' ? 'Creador' : 'Invitado'}
                                        </MicrotextDark>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                </ImageBackground>

                {/* Panel de información */}
                <View className="p-3 border-2 border-neutral-gray/20 rounded-b-3xl bg-white">
                    <View className="flex-row items-center justify-between mb-2">
                        <SubtitleSemibold className="text-dark-black flex-1" numberOfLines={1}>
                            {trip.name}
                        </SubtitleSemibold>

                        {/* Botón de reseña */}
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation();
                                setReviewModalVisible(true);
                            }}
                            className="ml-2 bg-primary-yellow rounded-full w-9 h-9 items-center justify-center"
                        >
                            <Ionicons name="star" size={18} color="#202020" />
                        </TouchableOpacity>
                    </View>

                    {/* Mi reseña o promedio */}
                    {userReview ? (
                        <View className="flex-row items-center gap-1">
                            {renderStars(userReview.rating, 12)}
                            <MicrotextDark className="text-dark-black text-xs ml-1">Mi reseña</MicrotextDark>
                        </View>
                    ) : stats && stats.totalReviews > 0 ? (
                        <View className="flex-row items-center gap-1">
                            {renderStars(stats.averageRating, 12)}
                            <MicrotextDark className="text-neutral-gray text-xs ml-1">
                                {stats.averageRating.toFixed(1)} ({stats.totalReviews})
                            </MicrotextDark>
                        </View>
                    ) : (
                        <View className="flex-row items-center gap-1">
                            <Ionicons name="star-outline" size={12} color="#D1D5DB" />
                            <MicrotextDark className="text-neutral-gray text-xs">Sin reseñas</MicrotextDark>
                        </View>
                    )}
                </View>
            </Pressable>

            {/* Review Modal */}
            <ReviewModal
                visible={reviewModalVisible}
                tripId={trip.id}
                tripName={trip.name || 'Viaje sin nombre'}
                onClose={() => setReviewModalVisible(false)}
                onSubmit={handleSubmitReview}
                loading={createReview.isPending}
                existingReview={userReview}
            />
        </>
    );
}

export function PastTripsGallery({ trips, loading }: PastTripsGalleryProps) {
    const router = useRouter();

    if (loading) {
        return (
            <View className="mb-6">
                <Title2Semibold>Galería de viajes</Title2Semibold>
                <View className="items-center justify-center py-8">
                    <ActivityIndicator size="small" color="#FFD54D" />
                </View>
            </View>
        );
    }

    if (!trips || trips.length === 0) {
        return (
            <View className="mb-6">
                <SubtitleSemibold className="mb-4">Galería de viaje</SubtitleSemibold>
                <View className="bg-white border border-neutral-gray/20 rounded-3xl p-6 items-center">
                    <Ionicons name="images-outline" size={48} color="#999999" />
                    <TextRegular className="text-neutral-gray text-center mt-3">
                        No tienes viajes en tu galería aún
                    </TextRegular>
                </View>
            </View>
        );
    }

    // Mostrar solo los últimos 5 viajes en formato de galería
    // El más reciente grande, los demás en grid 2x2
    const displayTrips = trips.slice(0, 5);

    return (
        <View className="mb-6">
            <SubtitleSemibold className="mb-4">Galería de viaje</SubtitleSemibold>
            <View>
                {displayTrips.map((trip, index) => {
                    const isLarge = index === 0;

                    // Si es el primero (más reciente), va solo en una fila
                    if (isLarge) {
                        return (
                            <GalleryTripCard
                                key={trip.id}
                                trip={trip}
                                index={index}
                                isLarge={true}
                                router={router}
                            />
                        );
                    }

                    // Los demás van en pares (grid 2 columnas)
                    return null;
                })}

                {/* Grid 2x2 para los viajes restantes */}
                {displayTrips.length > 1 && (
                    <View className="flex-row flex-wrap justify-between">
                        {displayTrips.slice(1).map((trip, index) => (
                            <GalleryTripCard
                                key={trip.id}
                                trip={trip}
                                index={index + 1}
                                isLarge={false}
                                router={router}
                            />
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}
