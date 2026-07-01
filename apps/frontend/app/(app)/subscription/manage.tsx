import CustomButton from '@/components/customElements/CustomButton';
import CustomInput from '@/components/customElements/CustomInput';
import { MicrotextDark, TextRegular, Title1, Title2Semibold } from '@/components/customElements/CustomText';
import { PlansModal } from '@/components/modals/PlansModal';
import { TokenBalanceBadge } from '@/components/TokenBalanceBadge';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useTokenHistory } from '@/hooks/users/useTokenBalance';
import { SubscriptionService } from '@/services/subscriptionService';
import { formatLongDate } from '@/utils/formatDate';
import { TokenTransaction, TokenTransactionType } from '@planmyroute/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, ScrollView, TouchableOpacity, View, Image } from 'react-native';
// Utilidad para mostrar alertas en web y móvil
function showUserAlert(title: string, message?: string) {
    if (Platform.OS === 'web') {
        window.alert(`${title}${message ? '\n\n' + message : ''}`);
    } else {
        Alert.alert(title, message);
    }
}
import { SafeAreaView } from 'react-native-safe-area-context';

// Etiquetas legibles para los tipos de movimiento de tokens.
const TOKEN_TYPE_LABELS: Record<TokenTransactionType, string> = {
    WELCOME_BONUS: 'Bono de bienvenida',
    PURCHASE_BASIC: 'Compra · paquete básico',
    PURCHASE_STANDARD: 'Compra · paquete estándar',
    PURCHASE_TRAVELER: 'Compra · paquete viajero',
    REMOVE_ADS_BONUS: 'Bono sin anuncios',
    PREMIUM_ANNUAL_GRANT: 'Suscripción anual',
    ADMIN_GRANT: 'Concesión',
    REFUND: 'Reembolso',
    GENERATE_TRIP: 'Generación de viaje',
    ADDON_ROUNDTRIP: 'Ida y vuelta',
    ADDON_REFUEL: 'Paradas de repostaje',
    MODIFY_TRIP: 'Modificación de viaje',
    POI_RECOMMENDATION: 'Recomendación de lugar',
};

export default function ManageSubscriptionScreen() {
    const router = useRouter();
    const { session } = useAuth();
    const { subscription, isPremium, refreshSubscription } = useSubscription();
    const { data: tokenHistory } = useTokenHistory(20);
    const [loading, setLoading] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [showPlansModal, setShowPlansModal] = useState(false);

    // Para código promocional
    const [promoCode, setPromoCode] = useState('');
    const [redeemLoading, setRedeemLoading] = useState(false);

    // Handler para canjear código promocional
    const handleRedeemCode = async () => {
        if (!promoCode.trim()) {
            showUserAlert('Introduce un código', 'Por favor, escribe tu código promocional.');
            return;
        }
        if (!session?.access_token) {
            showUserAlert('Debes iniciar sesión', 'Inicia sesión para canjear tu código.');
            return;
        }
        setRedeemLoading(true);
        try {
            const result = await SubscriptionService.redeemCode(promoCode.trim(), 'promo', session.access_token);
            await refreshSubscription();
            if (result.success) {
                showUserAlert('✅ Código válido', result.message || '¡Ya eres Premium!');
                setPromoCode('');
            } else {
                showUserAlert('Código no válido', result.message || 'El código no es válido o ya fue usado.');
            }
        } catch (error: unknown) {
            let msg = error instanceof Error ? error.message : '';
            if (msg.toLowerCase().includes('ya has canjeado este código')) {
                showUserAlert('Código ya usado', 'Ya has canjeado este código anteriormente.');
            } else if (msg.toLowerCase().includes('no válido')) {
                showUserAlert('Código incorrecto', 'El código introducido no es válido.');
            } else if (msg.toLowerCase().includes('agotado')) {
                showUserAlert('Código agotado', 'Este código ya ha sido usado el máximo de veces.');
            } else if (msg.toLowerCase().includes('caducado')) {
                showUserAlert('Código caducado', 'Este código ya ha caducado.');
            } else if (msg.toLowerCase().includes('desactivado')) {
                showUserAlert('Código desactivado', 'Este código ha sido desactivado.');
            } else {
                showUserAlert('Error', msg || 'No se pudo canjear el código.');
            }
        } finally {
            setRedeemLoading(false);
        }
    };

    // Verificar si tiene suscripción de Stripe (ha pagado alguna vez)
    const hasStripeSubscription = subscription?.provider_subscription_id ? true : false;

    // Determinar el plan actual
    const getCurrentPlan = () => {
        if (!isPremium) return 'Free';
        // Aquí podrías detectar si es mensual o anual basándote en la diferencia de fechas
        return 'Premium';
    };

    // Abrir el portal de Stripe para gestionar la suscripción
    const handleOpenPortal = async () => {
        if (!session?.access_token) {
            Alert.alert('Error', 'Debes iniciar sesión');
            return;
        }

        setLoading(true);
        try {
            const { url } = await SubscriptionService.createPortalSession(session.access_token);
            
            if (url) {
                if (Platform.OS === 'web') {
                    window.location.href = url;
                } else {
                    await Linking.openURL(url);
                }
            }
        } catch (error: unknown) {
            Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo abrir el portal de gestión');
        } finally {
            setLoading(false);
        }
    };

    // Cancelar suscripción
    const handleCancelSubscription = () => {
        Alert.alert(
            '¿Cancelar suscripción?',
            'Tu suscripción seguirá activa hasta el final del período actual. No se realizarán más cobros.',
            [
                { text: 'No, mantener', style: 'cancel' },
                {
                    text: 'Sí, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        if (!session?.access_token) return;
                        
                        setCancelLoading(true);
                        try {
                            const result = await SubscriptionService.cancelSubscription(session.access_token);
                            await refreshSubscription();
                            Alert.alert(
                                '✅ Suscripción cancelada',
                                result.message || 'Tu suscripción se cancelará al final del período actual.'
                            );
                        } catch (error: unknown) {
                            Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo cancelar la suscripción');
                        } finally {
                            setCancelLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Reactivar suscripción
    const handleReactivateSubscription = async () => {
        if (!session?.access_token) return;

        setLoading(true);
        try {
            const result = await SubscriptionService.reactivateSubscription(session.access_token);
            await refreshSubscription();
            Alert.alert('✅ ¡Éxito!', result.message || 'Tu suscripción ha sido reactivada.');
        } catch (error: unknown) {
            Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo reactivar la suscripción');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row items-center px-5 py-4 border-b border-neutral-100">
                <TouchableOpacity
                    className="mr-3 w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={20} color="#202020" />
                </TouchableOpacity>
                <Title2Semibold>Gestionar suscripción</Title2Semibold>
            </View>

            <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Estado actual */}
                <View className="mt-6 mb-8">
                    <View className="bg-primary-yellow/10 rounded-2xl p-6">
                        <View className="flex-row items-center mb-4">
                            <View className="w-12 h-12 bg-primary-yellow rounded-full items-center justify-center mr-4 overflow-hidden">
                                {isPremium ? (
                                    <Image
                                        source={require('../../../assets/diamond-crown.png')}
                                        style={{ width: 38, height: 38, resizeMode: 'contain' }}
                                    />
                                ) : (
                                    <Ionicons 
                                        name="person" 
                                        size={24} 
                                        color="#202020" 
                                    />
                                )}
                            </View>
                            <View>
                                <Title1 className="text-xl">{getCurrentPlan()}</Title1>
                                <MicrotextDark className="text-neutral-gray">
                                    {isPremium ? 'Plan activo' : 'Plan gratuito'}
                                </MicrotextDark>
                            </View>
                        </View>

                        {isPremium && subscription && (
                            <View className="border-t border-neutral-200 pt-4 mt-2">
                                <View className="flex-row justify-between mb-2">
                                    <TextRegular className="text-neutral-gray">Estado</TextRegular>
                                    <TextRegular className="font-semibold">
                                        {subscription.cancel_at_period_end 
                                            ? '⚠️ Cancelación pendiente' 
                                            : '✅ Activo'}
                                    </TextRegular>
                                </View>
                                <View className="flex-row justify-between mb-2">
                                    <TextRegular className="text-neutral-gray">Próxima facturación</TextRegular>
                                    <TextRegular className="font-semibold">
                                        {formatLongDate(subscription.current_period_end)}
                                    </TextRegular>
                                </View>
                                {subscription.cancel_at_period_end && (
                                    <View className="bg-orange-100 rounded-xl p-3 mt-2">
                                        <TextRegular className="text-orange-700 text-sm">
                                            Tu suscripción se cancelará el {formatLongDate(subscription.current_period_end)}
                                        </TextRegular>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {/* Saldo de tokens */}
                <View className="mb-8 border border-neutral-200 rounded-2xl p-5">
                    <View className="flex-row items-center justify-between mb-4">
                        <View>
                            <Title2Semibold>Tus tokens</Title2Semibold>
                            <MicrotextDark className="text-neutral-gray">
                                Se usan en las acciones con IA
                            </MicrotextDark>
                        </View>
                        <TokenBalanceBadge />
                    </View>

                    <CustomButton
                        title="Comprar tokens"
                        onPress={() => setShowPlansModal(true)}
                        variant="primary"
                        size="large"
                        icon={<Ionicons name="diamond-outline" size={20} color="#202020" />}
                    />

                    {tokenHistory && tokenHistory.length > 0 && (
                        <View className="mt-5 border-t border-neutral-100 pt-4">
                            <MicrotextDark className="text-neutral-gray mb-3 font-semibold">
                                Movimientos recientes
                            </MicrotextDark>
                            <View className="gap-2">
                                {tokenHistory.slice(0, 8).map((tx: TokenTransaction) => (
                                    <View key={tx.id} className="flex-row items-center justify-between">
                                        <TextRegular className="text-neutral-gray flex-1 mr-3" numberOfLines={1}>
                                            {TOKEN_TYPE_LABELS[tx.type] ?? tx.type}
                                        </TextRegular>
                                        <TextRegular
                                            className={`font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}
                                        >
                                            {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                                        </TextRegular>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>

                {/* Opciones según el estado */}
                {hasStripeSubscription && isPremium && subscription?.status === 'active' ? (
                    <View className="gap-4">
                        {/* Si tiene suscripción de Stripe, mostrar opciones de gestión */}
                        {hasStripeSubscription ? (
                            <>
                                {/* Cambiar plan / método de pago */}
                                <CustomButton
                                    title="Cambiar plan o método de pago"
                                    onPress={handleOpenPortal}
                                    variant="primary"
                                    size="large"
                                    loading={loading}
                                    icon={<Ionicons name="card-outline" size={20} color="#202020" />}
                                />

                                {/* Cancelar o Reactivar */}
                                {subscription?.cancel_at_period_end ? (
                                    <CustomButton
                                        title="Reactivar suscripción"
                                        onPress={handleReactivateSubscription}
                                        variant="outline"
                                        size="large"
                                        loading={loading}
                                        icon={<Ionicons name="refresh-outline" size={20} color="#202020" />}
                                    />
                                ) : (
                                    <CustomButton
                                        title="Cancelar suscripción"
                                        onPress={handleCancelSubscription}
                                        variant="outline"
                                        size="large"
                                        loading={cancelLoading}
                                    />
                                )}

                                {/* Info sobre cancelación */}
                                <View className="bg-neutral-100 rounded-xl p-4 mt-4">
                                    <TextRegular className="text-neutral-gray text-sm leading-5">
                                        💡 Si cancelas, mantendrás el acceso Premium hasta el final de tu período actual. 
                                        No se realizarán más cobros automáticos.
                                    </TextRegular>
                                </View>
                            </>
                        ) : (
                            <>
                                {/* Premium por código promocional o trial - no tiene Stripe */}
                                <View className="bg-green-50 rounded-xl p-4 mb-4">
                                    <TextRegular className="text-green-700 text-sm leading-5">
                                        🎁 Tu acceso Premium fue activado mediante código promocional o período de prueba.
                                        Expira el {formatLongDate(subscription?.current_period_end)}.
                                    </TextRegular>
                                </View>

                                <Title2Semibold className="mb-2">¿Quieres mantener Premium?</Title2Semibold>
                                <TextRegular className="text-neutral-gray mb-4">
                                    Suscríbete para mantener todas las funciones premium cuando expire tu acceso actual.
                                </TextRegular>
                                
                                <CustomButton
                                    title="💎 Suscribirse a Premium"
                                    onPress={() => setShowPlansModal(true)}
                                    variant="primary"
                                    size="large"
                                />
                            </>
                        )}
                    </View>
                ) : (
                    <View className="gap-4">
                        {/* Opción de suscribirse */}
                        <View className="bg-neutral-100 rounded-2xl p-6 mb-4">
                            <Title2Semibold className="mb-2">¿Quieres más funciones?</Title2Semibold>
                            <TextRegular className="text-neutral-gray mb-4">
                                Hazte Premium: 1000 tokens al año, planificador de repostaje, viajes offline, sin anuncios y verificado.
                            </TextRegular>
                            <CustomButton
                                title="Ver planes Premium"
                                onPress={() => setShowPlansModal(true)}
                                variant="primary"
                                size="large"
                            />
                        </View>

                        {/* NUEVO: Canjear código promocional */}
                        {!hasStripeSubscription && (
                          <View className="bg-green-50 rounded-2xl p-6 mb-4">
                              <Title2Semibold className="mb-2">¿Tienes un código promocional?</Title2Semibold>
                              <CustomInput
                                  placeholder="Introduce tu código"
                                  value={promoCode}
                                  onChangeText={setPromoCode}
                                  autoCapitalize="characters"
                                  size="large"
                                  className="mb-6 border-2 border-green-400 bg-white text-lg px-6 py-5 rounded-xl shadow-md"
                                  inputClassName="text-2xl tracking-widest text-center"
                              />
                              <CustomButton
                                  title={redeemLoading ? 'Canjeando...' : 'Canjear código'}
                                  onPress={handleRedeemCode}
                                  variant="primary"
                                  size="large"
                                  loading={redeemLoading}
                                  disabled={redeemLoading}
                                  className="text-lg py-4"
                              />
                          </View>
                        )}

                        {/* Límites del plan Free */}
                        <View className="border border-neutral-200 rounded-2xl p-4">
                            <Title2Semibold className="mb-3">Tu plan Free incluye:</Title2Semibold>
                            <View className="gap-2">
                                {[
                                    '20 tokens de bienvenida',
                                    'Acciones con IA pagando con tokens',
                                    '1 vehículo',
                                    '3 viajeros por viaje',
                                ].map((item, index) => (
                                    <View key={index} className="flex-row items-center gap-2">
                                        <Ionicons name="checkmark-circle" size={18} color="#9ca3af" />
                                        <TextRegular className="text-neutral-gray">{item}</TextRegular>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Modal de planes */}
            <PlansModal
                visible={showPlansModal}
                onClose={() => setShowPlansModal(false)}
            />
        </SafeAreaView>
    );
}
