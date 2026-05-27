import { SkeletonBox } from '@/components/customElements/SkeletonBox';
import { View } from 'react-native';

export function TripCardSkeleton() {
    return (
        <View className="mb-6 rounded-3xl overflow-hidden border border-neutral/20">
            {/* Imagen placeholder */}
            <SkeletonBox height={160} borderRadius={0} style={{ width: '100%' }} />

            {/* Panel de información */}
            <View className="p-5 bg-white gap-3">
                {/* Título */}
                <SkeletonBox width="65%" height={20} borderRadius={6} />
                {/* Descripción */}
                <SkeletonBox width="45%" height={15} borderRadius={6} />
                {/* Paradas */}
                <SkeletonBox width="25%" height={12} borderRadius={6} />
            </View>
        </View>
    );
}
