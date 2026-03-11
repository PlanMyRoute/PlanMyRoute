import { TextRegular } from '@/components/customElements/CustomText';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

interface TripStatsCardProps {
    averageRating: number;
    reviewCount: number;
    size?: 'small' | 'medium' | 'large';
    showCount?: boolean;
}

export const TripStatsCard: React.FC<TripStatsCardProps> = ({
    averageRating,
    reviewCount,
    size = 'medium',
    showCount = true,
}) => {
    const starSize = size === 'small' ? 14 : size === 'medium' ? 16 : 20;
    const textSize = size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base';

    const renderStars = () => {
        const fullStars = Math.floor(averageRating);
        const hasHalfStar = averageRating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        return (
            <View className="flex-row items-center gap-0.5">
                {/* Full stars */}
                {Array.from({ length: fullStars }).map((_, i) => (
                    <Ionicons key={`full-${i}`} name="star" size={starSize} color="#FFD54D" />
                ))}

                {/* Half star */}
                {hasHalfStar && (
                    <Ionicons name="star-half" size={starSize} color="#FFD54D" />
                )}

                {/* Empty stars */}
                {Array.from({ length: emptyStars }).map((_, i) => (
                    <Ionicons
                        key={`empty-${i}`}
                        name="star-outline"
                        size={starSize}
                        color="#D1D5DB"
                    />
                ))}
            </View>
        );
    };

    if (reviewCount === 0) {
        return (
            <View className="flex-row items-center gap-1">
                <Ionicons name="star-outline" size={starSize} color="#D1D5DB" />
                <TextRegular className={`text-gray-400 ${textSize}`}>
                    Sin reseñas
                </TextRegular>
            </View>
        );
    }

    return (
        <View className="flex-row items-center gap-2">
            {renderStars()}
            {showCount && (
                <TextRegular className={`text-gray-600 ${textSize}`}>
                    {averageRating.toFixed(1)} ({reviewCount})
                </TextRegular>
            )}
        </View>
    );
};
