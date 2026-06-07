import { MicrotextDark } from '@/components/customElements/CustomText';
import { useTokenBalance } from '@/hooks/users/useTokenBalance';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

type TokenBalanceBadgeProps = {
    /** Acción al pulsar (p.ej. navegar a comprar tokens). Si se omite, el badge no es pulsable. */
    onPress?: () => void;
    /** Variante visual. */
    variant?: 'pill' | 'plain';
};

/**
 * Muestra el saldo de tokens del usuario. Reutilizable en cabeceras y pantallas.
 */
export function TokenBalanceBadge({ onPress, variant = 'pill' }: TokenBalanceBadgeProps) {
    const { data: balance, isLoading } = useTokenBalance();

    const content = (
        <View className="flex-row items-center gap-1.5">
            <Ionicons name="diamond" size={14} color="#FFD54D" />
            {isLoading || typeof balance !== 'number' ? (
                <ActivityIndicator size="small" color="#FFD54D" />
            ) : (
                <MicrotextDark className="font-bold text-dark-black">{balance}</MicrotextDark>
            )}
        </View>
    );

    const pillClasses =
        variant === 'pill'
            ? 'px-3 py-1.5 rounded-full bg-primary-yellow/15 border border-primary-yellow/40'
            : '';

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7} className={pillClasses}>
                {content}
            </TouchableOpacity>
        );
    }

    return <View className={pillClasses}>{content}</View>;
}
