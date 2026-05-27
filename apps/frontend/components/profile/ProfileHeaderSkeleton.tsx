import { SkeletonBox } from '@/components/customElements/SkeletonBox';
import { View } from 'react-native';

export function ProfileHeaderSkeleton() {
    return (
        <View className="w-full px-5 gap-4">
            {/* Avatar + info */}
            <View className="flex-row items-center mb-4">
                {/* Avatar */}
                <SkeletonBox width={100} height={100} borderRadius={50} />

                {/* Nombre, fecha y stats */}
                <View className="ml-4 flex-1 gap-2">
                    <SkeletonBox width="60%" height={22} borderRadius={6} />
                    <SkeletonBox width="40%" height={14} borderRadius={6} />
                    <View className="flex-row gap-3 mt-1">
                        <SkeletonBox width={80} height={14} borderRadius={6} />
                        <SkeletonBox width={80} height={14} borderRadius={6} />
                    </View>
                </View>
            </View>

            {/* Botón placeholder */}
            <SkeletonBox height={44} borderRadius={22} style={{ width: '100%' }} />

            {/* Stats box */}
            <View className="rounded-3xl border border-neutral/20 p-4 flex-row justify-around">
                <View className="items-center gap-2">
                    <SkeletonBox width={32} height={22} borderRadius={6} />
                    <SkeletonBox width={52} height={12} borderRadius={6} />
                </View>
                <View className="items-center gap-2">
                    <SkeletonBox width={32} height={22} borderRadius={6} />
                    <SkeletonBox width={64} height={12} borderRadius={6} />
                </View>
            </View>
        </View>
    );
}
