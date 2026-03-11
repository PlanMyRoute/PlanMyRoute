import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomButton from '@/components/customElements/CustomButton';
import { TextRegular, Title1 } from '@/components/customElements/CustomText';

export default function SubscriptionCancelScreen() {
    const router = useRouter();

    const handleGoHome = () => {
        if (Platform.OS === 'web') {
            window.location.href = '/';
        } else {
            router.replace('/(app)/(tabs)/home');
        }
    };

    const handleRetry = () => {
        if (Platform.OS === 'web') {
            window.location.href = '/';
        } else {
            router.replace('/(app)/(tabs)/home');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 items-center justify-center px-8">
                {/* Icono */}
                <View className="w-24 h-24 bg-neutral-100 rounded-full items-center justify-center mb-6">
                    <Ionicons name="close-circle" size={64} color="#9ca3af" />
                </View>

                {/* Título */}
                <Title1 className="text-2xl text-center mb-4">
                    Pago cancelado
                </Title1>

                {/* Descripción */}
                <TextRegular className="text-center text-neutral-gray mb-2">
                    No te preocupes, no se ha realizado ningún cargo.
                </TextRegular>
                <TextRegular className="text-center text-neutral-gray mb-8">
                    Puedes suscribirte en cualquier momento desde tu perfil.
                </TextRegular>

                {/* Botones */}
                <View className="w-full gap-4">
                    <CustomButton
                        title="Volver al inicio"
                        onPress={handleGoHome}
                        variant="primary"
                        size="large"
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}
