import { MicrotextDark, SubtitleSemibold, TextRegular, Title2Semibold } from '@/components/customElements/CustomText';
import { SkeletonBox } from '@/components/customElements/SkeletonBox';
import { useAuth } from '@/context/AuthContext';
import { useTripContext } from '@/context/TripContext';
import { useAccommodationCostByTrip, useActivityCostByTrip, useRefuelCostByTrip } from '@/hooks/useItinerary';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';

interface CostRowProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    subtitle?: string;
    amount: number;
}

function CostRow({ icon, label, subtitle, amount }: CostRowProps) {
    return (
        <View className="flex-row items-center gap-4 py-4 border-b border-neutral/10">
            <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center">
                <Ionicons name={icon} size={20} color="#202020" />
            </View>
            <View className="flex-1">
                <SubtitleSemibold>{label}</SubtitleSemibold>
                {subtitle ? <MicrotextDark className="text-neutral mt-0.5">{subtitle}</MicrotextDark> : null}
            </View>
            <Title2Semibold>{amount.toFixed(2)}€</Title2Semibold>
        </View>
    );
}

export default function BillsScreen() {
    const { tripId } = useTripContext();
    const { token } = useAuth();
    const queryClient = useQueryClient();

    useFocusEffect(
        useCallback(() => {
            if (!tripId) return;
            queryClient.invalidateQueries({ queryKey: ['refuelCostByTrip', tripId] });
            queryClient.invalidateQueries({ queryKey: ['accommodationCostByTrip', tripId] });
            queryClient.invalidateQueries({ queryKey: ['activityCostByTrip', tripId] });
        }, [tripId, queryClient])
    );

    const { data: refuelData, isLoading: refuelLoading } = useRefuelCostByTrip(tripId as string, { enabled: !!tripId, token: token ?? undefined });
    const { data: accommodationData, isLoading: accommodationLoading } = useAccommodationCostByTrip(tripId as string, { enabled: !!tripId, token: token ?? undefined });
    const { data: activityData, isLoading: activityLoading } = useActivityCostByTrip(tripId as string, { enabled: !!tripId, token: token ?? undefined });

    const fuelCost = refuelData?.total_cost || 0;
    const accommodationCost = accommodationData?.total_cost || 0;
    const foodCost = activityData?.total_cost || 0;
    const totalCost = fuelCost + accommodationCost + foodCost;

    const isLoading = refuelLoading || accommodationLoading || activityLoading;

    if (isLoading) {
        return (
            <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>
                <SkeletonBox height={28} width="40%" borderRadius={6} style={{ marginBottom: 24 }} />
                {[1, 2, 3].map(i => (
                    <View key={i} className="flex-row items-center gap-4 py-4 border-b border-neutral/10">
                        <SkeletonBox width={40} height={40} borderRadius={20} />
                        <View className="flex-1 gap-2">
                            <SkeletonBox height={18} width="50%" borderRadius={6} />
                            <SkeletonBox height={12} width="30%" borderRadius={6} />
                        </View>
                        <SkeletonBox width={60} height={24} borderRadius={6} />
                    </View>
                ))}
            </ScrollView>
        );
    }

    return (
        <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>

            <SubtitleSemibold className="mb-2">Gastos del viaje</SubtitleSemibold>

            {/* Sin datos */}
            {totalCost === 0 ? (
                <View className="items-center py-12">
                    <View className="w-16 h-16 bg-primary/20 rounded-full items-center justify-center mb-4">
                        <Ionicons name="wallet-outline" size={28} color="#202020" />
                    </View>
                    <SubtitleSemibold className="text-center mb-1">Sin gastos registrados</SubtitleSemibold>
                    <TextRegular className="text-neutral text-center">
                        Los gastos aparecerán aquí cuando añadas paradas con coste.
                    </TextRegular>
                </View>
            ) : (
                <>
                    <View className="border border-neutral/10 rounded-2xl px-4 mb-6">
                        <CostRow
                            icon="car-outline"
                            label="Combustible"
                            subtitle={refuelData?.refuel_count ? `${refuelData.refuel_count} repostajes` : undefined}
                            amount={fuelCost}
                        />
                        <CostRow
                            icon="home-outline"
                            label="Estancia"
                            subtitle={accommodationData?.accommodation_count ? `${accommodationData.accommodation_count} alojamientos` : undefined}
                            amount={accommodationCost}
                        />
                        <View className="flex-row items-center gap-4 py-4">
                            <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center">
                                <Ionicons name="restaurant-outline" size={20} color="#202020" />
                            </View>
                            <View className="flex-1">
                                <SubtitleSemibold>Comida y actividades</SubtitleSemibold>
                                {activityData?.activity_count ? (
                                    <MicrotextDark className="text-neutral mt-0.5">{activityData.activity_count} actividades</MicrotextDark>
                                ) : null}
                            </View>
                            <Title2Semibold>{foodCost.toFixed(2)}€</Title2Semibold>
                        </View>
                    </View>

                    {/* Total */}
                    <View className="bg-dark rounded-2xl p-5 flex-row items-center justify-between">
                        <TextRegular style={{ color: '#FFFFFF' }}>Total del viaje</TextRegular>
                        <Title2Semibold style={{ color: '#FFD54D' }}>{totalCost.toFixed(2)}€</Title2Semibold>
                    </View>
                </>
            )}
        </ScrollView>
    );
}
