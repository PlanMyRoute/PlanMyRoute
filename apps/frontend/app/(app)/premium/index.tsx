import CustomButton from '@/components/customElements/CustomButton';
import { TextRegular, Title1, Title2Semibold } from '@/components/customElements/CustomText';
import { PlansModal } from '@/components/modals/PlansModal';
import { PREMIUM_BENEFITS } from '@/constants/premiumBenefits';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PremiumScreen() {
    const router = useRouter();
    const [isModalVisible, setModalVisible] = useState(false);

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Botón Cerrar (X) */}
            <View className="px-5 pt-2">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
                    <Ionicons name="close" size={28} color="#202020" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View className="items-center px-6 mt-4 mb-8">
                    {/* Imagen Hero o Logo Premium */}
                    <View className="w-24 h-24 bg-primary-yellow rounded-full items-center justify-center mb-6 shadow-sm">
                        <Ionicons name="diamond" size={48} color="#202020" />
                    </View>

                    <Title1 className="text-center text-3xl mb-2">Plan My Route Premium</Title1>
                    <TextRegular className="text-center text-neutral-gray text-lg">
                        Lleva tus viajes al siguiente nivel con herramientas exclusivas.
                    </TextRegular>
                </View>

                {/* Lista de Ventajas */}
                <View className="px-6 gap-8">
                    {PREMIUM_BENEFITS.map((item) => (
                        <View key={item.id} className="flex-row items-start gap-4">
                            <View className="w-10 h-10 bg-neutral-100 rounded-full items-center justify-center">
                                <Ionicons name={item.icon as any} size={22} color="#202020" />
                            </View>
                            <View className="flex-1">
                                <Title2Semibold className="text-lg mb-1">{item.title}</Title2Semibold>
                                <TextRegular className="text-neutral-gray leading-5">
                                    {item.description}
                                </TextRegular>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>


            {/* Footer Fijo con los Botones */}
            <View className="absolute bottom-0 w-full bg-white border-t border-neutral-100 px-6 py-6 pb-8 shadow-lg gap-3">
                <View className="flex-row justify-between items-center mb-4">
                    <TextRegular className="text-neutral-gray">Desde</TextRegular>
                    <View className="flex-row items-end">
                        <Title2Semibold className="text-2xl">4,99 €</Title2Semibold>
                        <TextRegular className="mb-1 text-neutral-gray">/mes</TextRegular>
                    </View>
                </View>

                <CustomButton
                    title="Ver planes y precios"
                    onPress={() => setModalVisible(true)}
                    variant="primary"
                    size="large"
                />
                <CustomButton
                    title="Ya tengo un código"
                    onPress={() => router.push('/subscription/manage')}
                    variant="outline"
                    size="large"
                />
            </View>

            {/* Modal de Selección de Planes */}
            <PlansModal
                visible={isModalVisible}
                onClose={() => setModalVisible(false)}
            />
        </SafeAreaView>
    );
}