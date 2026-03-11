import CustomButton from '@/components/customElements/CustomButton';
import { TextRegular, Title1 } from '@/components/customElements/CustomText';
import { useSubscription } from '@/context/SubscriptionContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SubscriptionSuccessScreen() {
    const router = useRouter();
    const { refreshSubscription } = useSubscription();
    const params = useLocalSearchParams();

    // Refrescar la suscripción cuando llegue a esta página
    useEffect(() => {
        const refresh = async () => {
            try {
                await refreshSubscription();
            } catch (error) {
                console.error('Error refreshing subscription:', error);
            }
        };
        refresh();
    }, []);

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 items-center justify-center px-6">
                {/* Icono de éxito */}
                <View className="w-32 h-32 bg-green-100 rounded-full items-center justify-center mb-8">
                    <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
                </View>

                {/* Título */}
                <Title1 className="text-center text-3xl mb-4">
                    ¡Bienvenido a Premium! 🎉
                </Title1>

                {/* Descripción */}
                <TextRegular className="text-center text-neutral-gray text-lg mb-8 px-4">
                    Tu suscripción se ha activado correctamente. Ya puedes disfrutar de todas las funciones premium.
                </TextRegular>

                {/* Lista de beneficios desbloqueados */}
                <View className="bg-primary-yellow/10 rounded-2xl p-6 mb-8 w-full">
                    <TextRegular className="text-lg font-semibold mb-4 text-center">
                        Ahora tienes acceso a:
                    </TextRegular>
                    <View className="gap-3">
                        {[
                            'Viajes con IA ilimitados',
                            'Hasta 5 vehículos',
                            'Viajeros ilimitados',
                            'Sin anuncios',
                            'Check de verificado',
                        ].map((benefit, index) => (
                            <View key={index} className="flex-row items-center gap-3">
                                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                                <TextRegular>{benefit}</TextRegular>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Botón para continuar */}
                <CustomButton
                    title="Empezar a explorar"
                    onPress={() => router.replace('/(app)/(tabs)/home')}
                    variant="primary"
                    size="large"
                />
            </View>
        </SafeAreaView>
    );
}
