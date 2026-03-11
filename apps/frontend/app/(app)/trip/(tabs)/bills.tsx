import { useTripContext } from '@/context/TripContext';
import { useAuth } from '@/context/AuthContext';
import { useRefuelCostByTrip, useAccommodationCostByTrip, useActivityCostByTrip } from '@/hooks/useItinerary';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

export default function BillsScreen() {
    const { tripId } = useTripContext();
    const { token } = useAuth();

    // Hooks para obtener costos de la base de datos
    const { data: refuelCostData, isLoading: refuelLoading } = useRefuelCostByTrip(
        tripId as string,
        { enabled: !!tripId, token }
    );

    const { data: accommodationCostData, isLoading: accommodationLoading } = useAccommodationCostByTrip(
        tripId as string,
        { enabled: !!tripId, token }
    );

    const { data: activityCostData, isLoading: activityLoading } = useActivityCostByTrip(
        tripId as string,
        { enabled: !!tripId, token }
    );

    // Calcular costos
    const fuelCost = refuelCostData?.total_cost || 0;
    const accommodationCost = accommodationCostData?.total_cost || 0;
    const foodCost = activityCostData?.total_cost || 0;
    const totalCost = fuelCost + accommodationCost + foodCost;

    const isLoading = refuelLoading || accommodationLoading || activityLoading;

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#1D1D1B" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <ScrollView 
                contentContainerClassName="px-5 pt-6 pb-10" 
                showsVerticalScrollIndicator={false}
            >
                {/* Encabezado */}
                <Text className="text-3xl font-normal text-[#1D1D1B] mb-8 mt-2">
                    Gastos del viaje
                </Text>

                {/* --- LISTA DE GASTOS --- */}
                
                {/* Card de Combustible */}
                <View className="flex-row items-center justify-between bg-white border border-gray-300 rounded-full py-4 px-6 mb-4">
                    <View className="flex-row items-center gap-4 flex-1">
                        <Ionicons name="car-outline" size={24} color="#1D1D1B" />
                        <View className="flex-1">
                            <Text className="text-[#1D1D1B] text-lg font-normal">Combustible</Text>
                            {/* Mantenemos la info extra pequeña si existe */}
                            {refuelCostData && refuelCostData.refuel_count > 0 && (
                                <Text className="text-xs text-gray-400">
                                    ({refuelCostData.refuel_count} repostajes)
                                </Text>
                            )}
                        </View>
                    </View>
                    <Text className="text-[#1D1D1B] font-bold text-lg">
                        {fuelCost.toFixed(2)}€
                    </Text>
                </View>

                {/* Card de Estancia */}
                <View className="flex-row items-center justify-between bg-white border border-gray-300 rounded-full py-4 px-6 mb-4">
                    <View className="flex-row items-center gap-4 flex-1">
                        <Ionicons name="home-outline" size={24} color="#1D1D1B" />
                        <View className="flex-1">
                            <Text className="text-[#1D1D1B] text-lg font-normal">Estancia</Text>
                            {accommodationCostData && accommodationCostData.accommodation_count > 0 && (
                                <Text className="text-xs text-gray-400">
                                    ({accommodationCostData.accommodation_count} alojamientos)
                                </Text>
                            )}
                        </View>
                    </View>
                    <Text className="text-[#1D1D1B] font-bold text-lg">{accommodationCost.toFixed(2)}€</Text>
                </View>

                {/* Card de Comida */}
                <View className="flex-row items-center justify-between bg-white border border-gray-300 rounded-full py-4 px-6 mb-10">
                    <View className="flex-row items-center gap-4 flex-1">
                        <Ionicons name="restaurant-outline" size={24} color="#1D1D1B" />
                        <View className="flex-1">
                            <Text className="text-[#1D1D1B] text-lg font-normal">Comida y Actividades</Text>
                            {activityCostData && activityCostData.activity_count > 0 && (
                                <Text className="text-xs text-gray-400">
                                    ({activityCostData.activity_count} actividades)
                                </Text>
                            )}
                        </View>
                    </View>
                    <Text className="text-[#1D1D1B] font-bold text-lg">{foodCost.toFixed(2)}€</Text>
                </View>

                {/* --- SECCIÓN TOTAL (Botón Amarillo Centrado) --- */}
                <View className="items-center">
                    <View className="bg-[#FFD64F] rounded-full px-10 py-3 shadow-sm">
                        <Text className="text-[#1D1D1B] text-lg font-normal">
                            Total: <Text className="font-bold">{totalCost.toFixed(2)}€</Text>
                        </Text>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}