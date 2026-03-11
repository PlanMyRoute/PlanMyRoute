import { useSubscription } from '@/context/SubscriptionContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, TextRegular, Title1 } from '@/components/customElements/CustomText';

export default function SubscriptionSuccessScreen() {
    const router = useRouter();
    const { refreshSubscription } = useSubscription();

    useEffect(() => {
        // Refrescar la suscripción cuando llegue a esta página
        refreshSubscription();
    }, []);

    const handleContinue = () => {
        if (Platform.OS === 'web') {
            window.location.href = '/';
        } else {
            router.replace('/(app)/(tabs)/home');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 items-center justify-center px-8">
                {/* Icono de éxito */}
                <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-6">
                    <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
                </View>

                {/* Título */}
                <Title1 className="text-2xl text-center mb-4">
                    ¡Pago completado!
                </Title1>

                {/* Descripción */}
                <TextRegular className="text-center text-neutral-gray mb-2">
                    Tu suscripción Premium está activa.
                </TextRegular>
                <TextRegular className="text-center text-neutral-gray mb-8">
                    Ahora puedes disfrutar de todas las funciones sin límites.
                </TextRegular>

                {/* Beneficios */}
                <View className="bg-primary-yellow/10 rounded-2xl p-6 w-full mb-8">
                    <MicrotextDark className="font-semibold mb-3">Ahora tienes acceso a:</MicrotextDark>
                    {[
                        'Viajes con IA ilimitados',
                        'Hasta 5 vehículos',
                        'Viajeros ilimitados',
                        'Sin anuncios',
                        'Soporte prioritario',
                    ].map((benefit, index) => (
                        <View key={index} className="flex-row items-center gap-2 mb-2">
                            <Ionicons name="checkmark" size={18} color="#22c55e" />
                            <TextRegular>{benefit}</TextRegular>
                        </View>
                    ))}
                </View>

                {/* Botón para continuar */}
                <CustomButton
                    title="Empezar a explorar"
                    onPress={handleContinue}
                    variant="primary"
                    size="large"
                    icon={<Ionicons name="arrow-forward" size={20} color="#202020" />}
                />
            </View>
        </SafeAreaView>
    );
}
