import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import { FlappyBirdGame } from './FlappyBirdGame';

const { width, height } = Dimensions.get('window');
const MAX_RADIUS = Math.sqrt(width ** 2 + height ** 2);

interface AiTripLoaderProps {
    visible: boolean;
    buttonCoords: { x: number; y: number; width: number; height: number } | null;
    loadingMessages?: string[];
    useFlappyBird?: boolean; // Nueva prop para elegir entre video o juego
    tripCreated?: boolean; // Indica que el viaje ya fue creado
    tripId?: number; // ID del viaje creado
    onNavigateToTrip?: () => void; // Callback para navegar al viaje
}

export const AiTripLoader = ({
    visible,
    buttonCoords,
    loadingMessages,
    useFlappyBird = false,
    tripCreated = false,
    tripId,
    onNavigateToTrip
}: AiTripLoaderProps) => {
    // Animaciones de UI
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;
    // Animación de la barra de progreso
    const progressAnim = useRef(new Animated.Value(0)).current;

    const defaultMessages = [
        "Analizando tus preferencias...",
        "Buscando las mejores rutas...",
        "Optimizando paradas y tiempos...",
        "La IA está diseñando tu aventura..."
    ];
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const messages = loadingMessages || defaultMessages;

    useEffect(() => {
        if (visible && buttonCoords) {
            // Reiniciar progreso al abrir
            progressAnim.setValue(0);

            // 1. Secuencia de apertura
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                }),
                Animated.parallel([
                    Animated.timing(opacityAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(contentOpacity, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    })
                ])
            ]).start();

            // 2. Animación de barra de carga (simulada en 3.5 segundos)
            Animated.timing(progressAnim, {
                toValue: 1, // 100%
                duration: 3500,
                useNativeDriver: false, // width no soporta native driver
                easing: Easing.out(Easing.ease)
            }).start();

            // 3. Rotación de mensajes
            const interval = setInterval(() => {
                setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
            }, 2500);

            return () => clearInterval(interval);

        } else {
            // Reset al cerrar
            scaleAnim.setValue(0);
            opacityAnim.setValue(0);
            contentOpacity.setValue(0);
            setCurrentMessageIndex(0);
        }
    }, [visible, buttonCoords]);

    if (!visible || !buttonCoords) return null;

    // Interpolación para la barra de carga
    const widthInterpolated = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.container}>

                {/* Círculo Amarillo Expansivo */}
                <Animated.View
                    style={[
                        styles.expandingCircle,
                        {
                            top: buttonCoords.y + buttonCoords.height / 2 - 25,
                            left: buttonCoords.x + buttonCoords.width / 2 - 25,
                            transform: [{
                                scale: scaleAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, (MAX_RADIUS * 2) / 50],
                                }),
                            }],
                        },
                    ]}
                />

                {/* Flappy Bird Game o Fondo Amarillo */}
                <Animated.View style={[styles.gameContainer, { opacity: opacityAnim }]}>
                    {useFlappyBird ? (
                        <FlappyBirdGame
                            visible={visible}
                            isCreatingTrip={true}
                            tripCreated={tripCreated}
                            tripId={tripId}
                            onNavigateToTrip={onNavigateToTrip}
                        />
                    ) : (
                        <View style={styles.yellowBackground} />
                    )}
                </Animated.View>

                {/* Indicador de carga compacto - Solo mostrar si el viaje NO está creado */}
                {!tripCreated && (
                    <Animated.View style={[styles.loadingIndicator, { opacity: contentOpacity }]}>
                        {/* Spinner */}
                        <ActivityIndicator size="small" color="#232323" style={styles.spinner} />
                        {/* Mensaje de carga */}
                        <Text style={styles.loadingMessage}>
                            {messages[currentMessageIndex]}
                        </Text>
                    </Animated.View>
                )}

            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    expandingCircle: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FACC15',
        zIndex: 1,
    },
    gameContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 2,
    },
    yellowBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FACC15',
        alignItems: 'center',
        zIndex: 3,
        padding: 20,
    },
    loadingIndicator: {
        position: 'absolute',
        top: 60,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        maxWidth: width - 40,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    spinner: {
        marginRight: 10,
    },
    loadingMessage: {
        fontSize: 13,
        color: '#232323',
        fontWeight: '600',
        flexShrink: 1,
    },
});