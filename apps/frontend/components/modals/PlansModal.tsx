import { useSubscription } from '@/context/SubscriptionContext'; // Tu contexto
import { SubscriptionService } from '@/services/subscriptionService';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Linking, Modal, Platform, TouchableOpacity, View } from 'react-native';
import CustomButton from '../customElements/CustomButton';
import { MicrotextDark, TextRegular, Title2Semibold } from '../customElements/CustomText';
import { useAuth } from '@/context/AuthContext';

interface PlansModalProps {
    visible: boolean;
    onClose: () => void;
}

export const PlansModal = ({ visible, onClose }: PlansModalProps) => {
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
    const [loading, setLoading] = useState(false);
    const { refreshSubscription } = useSubscription();
    const { session } = useAuth();

    // Función para iniciar el proceso de pago con Stripe
    const handleSubscribe = async () => {
        console.log('=== handleSubscribe iniciado ===');
        console.log('Platform.OS:', Platform.OS);
        console.log('session:', !!session);
        
        if (!session?.access_token) {
            Alert.alert("Error", "Debes iniciar sesión para suscribirte");
            return;
        }

        setLoading(true);
        try {
            // Determinar la plataforma
            const platform = Platform.OS === 'web' ? 'web' : 'mobile';
            console.log('platform detectada:', platform);
            
            // Mapear el plan al formato esperado por el backend
            const planType = selectedPlan === 'yearly' ? 'yearly' : 'monthly';
            console.log('planType:', planType);

            // Crear sesión de checkout en Stripe
            console.log('Llamando a createCheckoutSession...');
            const response = await SubscriptionService.createCheckoutSession(
                session.access_token,
                planType,
                platform
            );
            console.log('Respuesta de createCheckoutSession:', response);

            const { url } = response;
            console.log('Stripe checkout URL:', url);

            if (url) {
                // En web, redirigir usando window.open para asegurar que funcione
                if (Platform.OS === 'web') {
                    console.log('Intentando redirigir en web...');
                    // Cerrar modal primero
                    onClose();
                    // Usar setTimeout para asegurar que el modal se cierre antes de redirigir
                    setTimeout(() => {
                        console.log('Ejecutando window.location.assign:', url);
                        window.location.assign(url);
                    }, 100);
                } else {
                    // En móvil, abrir en el navegador
                    const canOpen = await Linking.canOpenURL(url);
                    if (canOpen) {
                        await Linking.openURL(url);
                        onClose(); // Cerrar el modal después de abrir el navegador
                    } else {
                        Alert.alert("Error", "No se pudo abrir la página de pago");
                    }
                }
            } else {
                console.log('URL vacía o undefined');
                Alert.alert("Error", "No se pudo crear la sesión de pago");
            }

        } catch (error: any) {
            console.error('Error en handleSubscribe:', error);
            Alert.alert("Error", error.message || "No se pudo completar la compra.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl p-6 pb-10">

                    {/* Header del Modal */}
                    <View className="flex-row justify-between items-center mb-6">
                        <Title2Semibold className="text-xl">Elige tu plan</Title2Semibold>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-neutral-100 rounded-full">
                            <Ionicons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Opción Anual (Recomendada) */}
                    <TouchableOpacity
                        onPress={() => setSelectedPlan('yearly')}
                        className={`flex-row items-center justify-between p-4 rounded-2xl border-2 mb-4 ${selectedPlan === 'yearly' ? 'border-primary-yellow bg-primary-yellow/10' : 'border-neutral-200'
                            }`}
                    >
                        <View className="flex-1">
                            <View className="flex-row items-center gap-2">
                                <Title2Semibold>Anual</Title2Semibold>
                                <View className="bg-green-100 px-2 py-0.5 rounded text-xs">
                                    <MicrotextDark className="text-green-700 font-bold">AHORRA 17%</MicrotextDark>
                                </View>
                            </View>
                            <TextRegular className="text-neutral-gray mt-1">49,99 € / año</TextRegular>
                            <MicrotextDark className="text-neutral-400 mt-0.5">Equivale a 4,16 € al mes</MicrotextDark>
                        </View>
                        <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedPlan === 'yearly' ? 'border-primary-yellow' : 'border-neutral-300'
                            }`}>
                            {selectedPlan === 'yearly' && <View className="w-3 h-3 rounded-full bg-primary-yellow" />}
                        </View>
                    </TouchableOpacity>

                    {/* Opción Mensual */}
                    <TouchableOpacity
                        onPress={() => setSelectedPlan('monthly')}
                        className={`flex-row items-center justify-between p-4 rounded-2xl border-2 mb-8 ${selectedPlan === 'monthly' ? 'border-primary-yellow bg-primary-yellow/10' : 'border-neutral-200'
                            }`}
                    >
                        <View>
                            <Title2Semibold>Mensual</Title2Semibold>
                            <TextRegular className="text-neutral-gray mt-1">4,99 € / mes</TextRegular>
                        </View>
                        <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedPlan === 'monthly' ? 'border-primary-yellow' : 'border-neutral-300'
                            }`}>
                            {selectedPlan === 'monthly' && <View className="w-3 h-3 rounded-full bg-primary-yellow" />}
                        </View>
                    </TouchableOpacity>

                    {/* Botón de Acción */}
                    {Platform.OS === 'web' ? (
                        <TouchableOpacity
                            onPress={() => {
                                console.log('Botón presionado en web');
                                handleSubscribe();
                            }}
                            disabled={loading}
                            className="bg-primary-yellow border-2 border-primary-yellow px-8 py-4 rounded-full flex-row items-center justify-center"
                            style={{ cursor: 'pointer' }}
                        >
                            {loading ? (
                                <TextRegular>Cargando...</TextRegular>
                            ) : (
                                <TextRegular>{`Suscribirse y pagar ${selectedPlan === 'yearly' ? '49,99 €' : '4,99 €'}`}</TextRegular>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <CustomButton
                            title={`Suscribirse y pagar ${selectedPlan === 'yearly' ? '49,99 €' : '4,99 €'}`}
                            onPress={handleSubscribe}
                            variant="primary"
                            size="large"
                            loading={loading}
                        />
                    )}

                    <MicrotextDark className="text-center text-neutral-400 mt-4 px-4">
                        La suscripción se renovará automáticamente. Puedes cancelar en cualquier momento desde tu cuenta.
                    </MicrotextDark>

                </View>
            </View>
        </Modal>
    );
};