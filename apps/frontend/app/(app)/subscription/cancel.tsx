import CustomButton from '@/components/customElements/CustomButton';
import { TextRegular, Title1 } from '@/components/customElements/CustomText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SubscriptionCancelScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1 items-center justify-center px-6">
                {/* Icono */}
                <View className="w-32 h-32 bg-neutral-100 rounded-full items-center justify-center mb-8">
                    <Ionicons name="close-circle" size={80} color="#9ca3af" />
                </View>

                {/* Título */}
                <Title1 className="text-center text-3xl mb-4">
                    Pago cancelado
                </Title1>

                {/* Descripción */}
                <TextRegular className="text-center text-neutral-gray text-lg mb-8 px-4">
                    No se ha realizado ningún cargo. Puedes intentarlo de nuevo cuando quieras.
                </TextRegular>

                {/* Botones */}
                <View className="w-full gap-4">
                    <CustomButton
                        title="Intentar de nuevo"
                        onPress={() => router.replace('/(app)/premium')}
                        variant="primary"
                        size="large"
                    />
                    
                    <CustomButton
                        title="Volver al inicio"
                        onPress={() => router.replace('/')}
                        variant="outline"
                        size="large"
                    />
                </View>
            </View>
        </SafeAreaView>
    );
}
