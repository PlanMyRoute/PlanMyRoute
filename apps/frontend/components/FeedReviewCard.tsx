import { SubtitleSemibold, TextRegular } from '@/components/customElements/CustomText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ImageBackground, TouchableOpacity, View } from 'react-native';

interface FeedReviewCardProps {
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
            description?: string | null;
        };
        user?: {
            id: string;
            name: string;
            username: string;
            img: string | null;
        };
    };
}

export const FeedReviewCard: React.FC<FeedReviewCardProps> = ({ review }) => {
    const router = useRouter();

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

    const imageUri = review.trip?.cover_image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';

    return (
        <TouchableOpacity
            onPress={() => review.trip && router.push(`/trip/${review.trip.id}`)}
            className="bg-white rounded-3xl overflow-hidden shadow-sm border border-neutral-gray/10 mb-4"
            activeOpacity={0.7}
        >
            {/* Imagen del viaje */}
            <ImageBackground
                source={{ uri: imageUri }}
                className="w-full h-48"
                resizeMode="cover"
            >
                <View className="flex-1" />
            </ImageBackground>

            {/* Contenido del post */}
            <View className="p-4">
                {/* Título del viaje con estrellas */}
                <View className="flex-row items-center gap-2 mb-3">
                    <SubtitleSemibold className="flex-1" numberOfLines={1}>
                        {review.trip?.name || 'Viaje sin nombre'}
                    </SubtitleSemibold>
                    {renderStars(review.rating)}
                </View>

                {/* Usuario */}
                {review.user && (
                    <View className="flex-row items-center justify-between">
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation();
                                router.push(`/${review.user!.username}`);
                            }}
                            className="flex-row items-center gap-2"
                        >
                            <Image
                                source={{
                                    uri: review.user.img || `https://ui-avatars.com/api/?name=${review.user.username}&background=FFD54D&color=202020&size=100`
                                }}
                                className="w-10 h-10 rounded-full"
                            />
                            <TextRegular className="text-dark-black">
                                {review.user.name || review.user.username}
                            </TextRegular>
                        </TouchableOpacity>

                        {/* Botones de acción (comentados por ahora) */}
                        {/* <View className="flex-row gap-3">
                            <TouchableOpacity onPress={(e) => e.stopPropagation()}>
                                <Ionicons name="chatbubble-outline" size={20} color="#202020" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={(e) => e.stopPropagation()}>
                                <Ionicons name="heart-outline" size={20} color="#202020" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={(e) => e.stopPropagation()}>
                                <Ionicons name="share-social-outline" size={20} color="#202020" />
                            </TouchableOpacity>
                        </View> */}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};
