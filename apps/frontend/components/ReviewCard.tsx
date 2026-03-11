import { MicrotextLight, SubtitleSemibold, TextRegular } from '@/components/customElements/CustomText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

interface ReviewCardProps {
    review: {
        id: string;
        rating: number;
        comment: string | null;
        created_at: string;
        trip?: {
            id: number;
            name: string;
            cover_image_url: string | null;
            start_date: string | null;
            end_date: string | null;
        };
        user?: {
            id: string;
            name: string;
            username: string;
            img: string | null;
        };
    };
    showTripInfo?: boolean;
    showUserInfo?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
    review,
    showTripInfo = true,
    showUserInfo = true,
}) => {
    const router = useRouter();

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} días`;
        if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;

        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const renderStars = (rating: number) => {
        return (
            <View className="flex-row gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                        key={star}
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={16}
                        color={star <= rating ? '#FFD54D' : '#D1D5DB'}
                    />
                ))}
            </View>
        );
    };

    return (
        <View className="bg-white rounded-3xl p-4 mb-3 border border-gray-200">
            {/* User Info */}
            {showUserInfo && review.user && (
                <View className="flex-row items-center mb-3">
                    <Image
                        source={{
                            uri: review.user.img || 'https://via.placeholder.com/40',
                        }}
                        className="w-10 h-10 rounded-full"
                    />
                    <View className="ml-3 flex-1">
                        <SubtitleSemibold className="text-gray-800">
                            {review.user.name}
                        </SubtitleSemibold>
                        <MicrotextLight className="text-gray-500">
                            @{review.user.username}
                        </MicrotextLight>
                    </View>
                    <MicrotextLight className="text-gray-400">
                        {formatDate(review.created_at)}
                    </MicrotextLight>
                </View>
            )}

            {/* Trip Info */}
            {showTripInfo && review.trip && (
                <TouchableOpacity
                    onPress={() => router.push(`/trip/${review.trip!.id}`)}
                    className="flex-row items-center mb-3 bg-gray-50 rounded-2xl p-3"
                    activeOpacity={0.7}
                >
                    {review.trip.cover_image_url ? (
                        <Image
                            source={{ uri: review.trip.cover_image_url }}
                            className="w-12 h-12 rounded-xl"
                        />
                    ) : (
                        <View className="w-12 h-12 rounded-xl bg-blue-400 items-center justify-center">
                            <Ionicons name="map" size={24} color="#FFF" />
                        </View>
                    )}
                    <View className="ml-3 flex-1">
                        <TextRegular className="text-gray-800" numberOfLines={1}>
                            {review.trip.name}
                        </TextRegular>
                        {review.trip.start_date && (
                            <MicrotextLight className="text-gray-500">
                                {new Date(review.trip.start_date).toLocaleDateString('es-ES', {
                                    month: 'short',
                                    year: 'numeric',
                                })}
                            </MicrotextLight>
                        )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
            )}

            {/* Rating */}
            <View className="flex-row items-center mb-2">
                {renderStars(review.rating)}
                <Text
                    className="ml-2 text-gray-700"
                    style={{ fontFamily: 'Poppins-SemiBold', fontSize: 14 }}
                >
                    {review.rating === 1 && 'Muy malo'}
                    {review.rating === 2 && 'Malo'}
                    {review.rating === 3 && 'Regular'}
                    {review.rating === 4 && 'Bueno'}
                    {review.rating === 5 && 'Excelente'}
                </Text>
            </View>

            {/* Comment */}
            {review.comment && (
                <TextRegular className="text-gray-700 leading-5">
                    {review.comment}
                </TextRegular>
            )}
        </View>
    );
};
