import { ModalSheet } from '@/components/modals/ModalSheet';
import { SubscriptionService } from '@/services/subscriptionService';
import { TokenService } from '@/services/tokenService';
import { TOKEN_PACKAGES } from '@planmyroute/types';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Linking, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import CustomButton from '../customElements/CustomButton';
import { MicrotextDark, TextRegular, Title2Semibold } from '../customElements/CustomText';
import { useAuth } from '@/context/AuthContext';

interface PlansModalProps {
    visible: boolean;
    onClose: () => void;
}

const PREMIUM_PERKS = [
    '1000 tokens al año',
    'Planificador de paradas de repostaje/carga',
    'Descarga tus viajes y úsalos sin conexión',
    'Sin anuncios',
    'Perfil verificado',
];

export const PlansModal = ({ visible, onClose }: PlansModalProps) => {
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const { session } = useAuth();

    const platform: 'web' | 'mobile' = Platform.OS === 'web' ? 'web' : 'mobile';

    // Redirige al checkout de Stripe (web: misma pestaña; móvil: navegador).
    const openCheckoutUrl = async (url: string) => {
        if (!url) {
            Alert.alert('Error', 'No se pudo crear la sesión de pago');
            return;
        }
        if (Platform.OS === 'web') {
            onClose();
            setTimeout(() => window.location.assign(url), 100);
        } else {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
                onClose();
            } else {
                Alert.alert('Error', 'No se pudo abrir la página de pago');
            }
        }
    };

    // Suscripción anual
    const handleSubscribe = async () => {
        if (!session?.access_token) {
            Alert.alert('Error', 'Debes iniciar sesión para suscribirte');
            return;
        }
        setLoadingAction('subscription');
        try {
            const { url } = await SubscriptionService.createCheckoutSession(
                session.access_token,
                'yearly',
                platform
            );
            await openCheckoutUrl(url);
        } catch (error: unknown) {
            Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo completar la compra.');
        } finally {
            setLoadingAction(null);
        }
    };

    // Compra de un paquete de tokens (pago único)
    const handleBuyTokens = async (packageId: string) => {
        if (!session?.access_token) {
            Alert.alert('Error', 'Debes iniciar sesión para comprar tokens');
            return;
        }
        setLoadingAction(packageId);
        try {
            const { url } = await TokenService.createTokenCheckoutSession(
                session.access_token,
                packageId,
                platform
            );
            await openCheckoutUrl(url);
        } catch (error: unknown) {
            Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo completar la compra.');
        } finally {
            setLoadingAction(null);
        }
    };

    return (
        <ModalSheet visible={visible} onClose={onClose} contentStyle={{ maxHeight: '90%' }}>
            {(handleClose) => (
                <View className="p-6 pb-10">
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-6">
                        <Title2Semibold className="text-xl">Premium y tokens</Title2Semibold>
                        <TouchableOpacity onPress={handleClose} className="p-2 bg-neutral-100 rounded-full">
                            <Ionicons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Suscripción anual */}
                        <View className="p-4 rounded-2xl border-2 border-primary-yellow bg-primary-yellow/10 mb-6">
                            <View className="flex-row items-center gap-2 mb-1">
                                <Title2Semibold>Premium Anual</Title2Semibold>
                                <View className="bg-green-100 px-2 py-0.5 rounded">
                                    <MicrotextDark className="text-green-700 font-bold">RECOMENDADO</MicrotextDark>
                                </View>
                            </View>
                            <TextRegular className="text-neutral-gray">49,99 € / año · equivale a 4,16 €/mes</TextRegular>

                            <View className="gap-2 mt-3 mb-4">
                                {PREMIUM_PERKS.map((perk, i) => (
                                    <View key={i} className="flex-row items-center gap-2">
                                        <Ionicons name="checkmark-circle" size={18} color="#FFD54D" />
                                        <TextRegular className="text-dark-black flex-1">{perk}</TextRegular>
                                    </View>
                                ))}
                            </View>

                            <CustomButton
                                title="Suscribirse · 49,99 €"
                                onPress={handleSubscribe}
                                variant="primary"
                                size="large"
                                loading={loadingAction === 'subscription'}
                                disabled={loadingAction !== null}
                            />
                        </View>

                        {/* Paquetes de tokens */}
                        <Title2Semibold className="mb-1">Comprar tokens</Title2Semibold>
                        <MicrotextDark className="text-neutral-gray mb-4">
                            Paga solo por lo que usas. Los tokens no caducan.
                        </MicrotextDark>

                        <View className="gap-3 mb-2">
                            {TOKEN_PACKAGES.map((pkg) => (
                                <View
                                    key={pkg.id}
                                    className="flex-row items-center justify-between p-4 rounded-2xl border-2 border-neutral-200"
                                >
                                    <View className="flex-1 mr-3">
                                        <View className="flex-row items-center gap-1.5">
                                            <Ionicons name="diamond" size={16} color="#FFD54D" />
                                            <Title2Semibold>{pkg.tokens} tokens</Title2Semibold>
                                        </View>
                                        <MicrotextDark className="text-neutral-gray mt-0.5">
                                            {pkg.priceEur.toFixed(2).replace('.', ',')} €
                                        </MicrotextDark>
                                    </View>
                                    <CustomButton
                                        title="Comprar"
                                        onPress={() => handleBuyTokens(pkg.id)}
                                        variant="outline"
                                        size="medium"
                                        loading={loadingAction === pkg.id}
                                        disabled={loadingAction !== null}
                                    />
                                </View>
                            ))}
                        </View>

                        <MicrotextDark className="text-center text-neutral-400 mt-5 px-4">
                            La suscripción se renueva automáticamente. Puedes cancelar cuando quieras desde tu cuenta.
                        </MicrotextDark>
                    </ScrollView>
                </View>
            )}
        </ModalSheet>
    );
};
