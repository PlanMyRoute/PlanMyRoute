import { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';

type UseModalAnimationProps = {
    visible: boolean;
    onClose: () => void;
};

type UseModalAnimationReturn = {
    overlayOpacity: Animated.Value;
    slideAnim: Animated.Value;
    handleClose: () => void;
    isWeb: boolean;
};

/**
 * Hook personalizado para manejar las animaciones de apertura y cierre de modales
 * 
 * @param visible - Estado de visibilidad del modal
 * @param onClose - Función para cerrar el modal (se ejecuta después de la animación)
 * @returns Valores animados y función de cierre con animación
 * 
 */
export const useModalAnimation = ({
    visible,
    onClose,
}: UseModalAnimationProps): UseModalAnimationReturn => {
    const isWeb = Platform.OS === 'web';

    // Animaciones separadas para overlay y contenido
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(300)).current;

    // Animación de apertura
    useEffect(() => {
        if (visible && !isWeb) {
            // Fade in del overlay (más lento)
            Animated.timing(overlayOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Slide up del contenido (más suave y lento)
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 10,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, overlayOpacity, slideAnim]);

    // Función para manejar el cierre con animación
    const handleClose = () => {
        // Animar antes de cerrar
        Animated.parallel([
            Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 300,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Ejecutar onClose después de que terminen las animaciones
            onClose();
        });
    };

    return {
        overlayOpacity,
        slideAnim,
        handleClose,
        isWeb,
    };
};
