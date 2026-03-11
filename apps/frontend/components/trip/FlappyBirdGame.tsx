import { Logo } from '@/components/assets/Logo';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GRAVITY = 0.6;
const JUMP_VELOCITY = -9;
const BIRD_SIZE = 50;
const PIPE_WIDTH = 60;
const PIPE_GAP = 180;
const PIPE_SPEED = 3;

interface Pipe {
    id: number;
    x: number;
    topHeight: number;
    scored: boolean;
}

interface FlappyBirdGameProps {
    visible: boolean;
    onGameOver?: (score: number) => void;
    isCreatingTrip?: boolean; // Indica si se está creando un viaje
    tripCreated?: boolean; // Indica que el viaje ya fue creado
    tripId?: number; // ID del viaje creado para navegar
    onNavigateToTrip?: () => void; // Callback para navegar al viaje
}

export const FlappyBirdGame = ({
    visible,
    onGameOver,
    isCreatingTrip = false,
    tripCreated = false,
    tripId,
    onNavigateToTrip
}: FlappyBirdGameProps) => {
    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);

    // Posición del pájaro (logo)
    const birdY = useRef(SCREEN_HEIGHT / 2);
    const birdVelocity = useRef(0);
    const birdRotation = useRef(new Animated.Value(0)).current;

    // Pipes
    const [pipes, setPipes] = useState<Pipe[]>([]);
    const pipeIdCounter = useRef(0);

    // Animación del logo
    const logoScale = useRef(new Animated.Value(1)).current;

    // Game loop
    const gameLoopRef = useRef<number | null>(null);

    // Inicializar juego
    useEffect(() => {
        if (visible && !gameStarted) {
            resetGame();
        }
    }, [visible]);

    const resetGame = () => {
        birdY.current = SCREEN_HEIGHT / 2;
        birdVelocity.current = 0;
        birdRotation.setValue(0);
        setPipes([]);
        setScore(0);
        setGameOver(false);
        setGameStarted(false);
        pipeIdCounter.current = 0;
    };

    const startGame = () => {
        if (gameStarted || gameOver) return;

        setGameStarted(true);
        generateInitialPipes();

        // Game loop - 60fps
        gameLoopRef.current = setInterval(() => {
            updateGame();
        }, 1000 / 60);
    };

    const generateInitialPipes = () => {
        const newPipes: Pipe[] = [];
        for (let i = 0; i < 3; i++) {
            newPipes.push(createPipe(SCREEN_WIDTH + i * 300));
        }
        setPipes(newPipes);
    };

    const createPipe = (x: number): Pipe => {
        const minHeight = 100;
        const maxHeight = SCREEN_HEIGHT - PIPE_GAP - 100;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

        return {
            id: pipeIdCounter.current++,
            x,
            topHeight,
            scored: false
        };
    };

    const updateGame = () => {
        // Actualizar velocidad y posición del pájaro
        birdVelocity.current += GRAVITY;
        birdY.current += birdVelocity.current;

        // Animar rotación según velocidad
        const rotation = Math.max(-30, Math.min(30, birdVelocity.current * 3));
        Animated.timing(birdRotation, {
            toValue: rotation,
            duration: 100,
            useNativeDriver: true
        }).start();

        // Verificar colisión con el suelo o techo
        if (birdY.current < 0 || birdY.current > SCREEN_HEIGHT - BIRD_SIZE - 50) {
            endGame();
            return;
        }

        // Actualizar pipes
        setPipes((currentPipes) => {
            let newPipes = currentPipes.map((pipe) => ({
                ...pipe,
                x: pipe.x - PIPE_SPEED
            }));

            // Generar nuevo pipe cuando el último sale de la pantalla
            const lastPipe = newPipes[newPipes.length - 1];
            if (lastPipe && lastPipe.x < SCREEN_WIDTH - 300) {
                newPipes.push(createPipe(SCREEN_WIDTH + 100));
            }

            // Eliminar pipes fuera de pantalla
            newPipes = newPipes.filter((pipe) => pipe.x > -PIPE_WIDTH);

            // Verificar colisión y puntuación
            newPipes.forEach((pipe) => {
                // Verificar si el pájaro pasó el pipe
                if (!pipe.scored && pipe.x + PIPE_WIDTH < SCREEN_WIDTH / 2 - BIRD_SIZE / 2) {
                    pipe.scored = true;
                    setScore((s) => s + 1);
                }

                // Verificar colisión
                const birdLeft = SCREEN_WIDTH / 2 - BIRD_SIZE / 2;
                const birdRight = SCREEN_WIDTH / 2 + BIRD_SIZE / 2;
                const birdTop = birdY.current;
                const birdBottom = birdY.current + BIRD_SIZE;

                const pipeLeft = pipe.x;
                const pipeRight = pipe.x + PIPE_WIDTH;

                if (birdRight > pipeLeft && birdLeft < pipeRight) {
                    if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + PIPE_GAP) {
                        endGame();
                    }
                }
            });

            return newPipes;
        });
    };

    const handleJump = () => {
        if (!gameStarted && !gameOver) {
            startGame();
        }

        if (!gameOver) {
            birdVelocity.current = JUMP_VELOCITY;

            // Animación de escala al saltar
            Animated.sequence([
                Animated.timing(logoScale, {
                    toValue: 1.2,
                    duration: 100,
                    useNativeDriver: true
                }),
                Animated.timing(logoScale, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true
                })
            ]).start();
        }
    };

    const endGame = () => {
        if (gameLoopRef.current) {
            clearInterval(gameLoopRef.current);
        }

        setGameOver(true);
        setGameStarted(false);

        if (score > highScore) {
            setHighScore(score);
        }

        onGameOver?.(score);
    };

    const handleRestart = () => {
        resetGame();
    };

    useEffect(() => {
        return () => {
            if (gameLoopRef.current) {
                clearInterval(gameLoopRef.current);
            }
        };
    }, []);

    if (!visible) return null;

    const rotation = birdRotation.interpolate({
        inputRange: [-30, 30],
        outputRange: ['-30deg', '30deg']
    });

    return (
        <TouchableOpacity
            activeOpacity={1}
            onPress={handleJump}
            style={styles.container}
        >
            {/* Fondo con degradado */}
            <View style={styles.background}>
                <View style={styles.sky} />
                <View style={styles.ground} />
            </View>

            {/* Pipes */}
            {pipes.map((pipe) => (
                <View key={pipe.id}>
                    {/* Pipe superior */}
                    <View
                        style={[
                            styles.pipe,
                            styles.pipeTop,
                            {
                                left: pipe.x,
                                height: pipe.topHeight
                            }
                        ]}
                    />
                    {/* Pipe inferior */}
                    <View
                        style={[
                            styles.pipe,
                            styles.pipeBottom,
                            {
                                left: pipe.x,
                                top: pipe.topHeight + PIPE_GAP,
                                height: SCREEN_HEIGHT - pipe.topHeight - PIPE_GAP - 50
                            }
                        ]}
                    />
                </View>
            ))}

            {/* Logo como pájaro */}
            <Animated.View
                style={[
                    styles.bird,
                    {
                        top: birdY.current,
                        transform: [
                            { rotate: rotation },
                            { scale: logoScale }
                        ]
                    }
                ]}
            >
                <Logo width={BIRD_SIZE} height={BIRD_SIZE * 0.63} color="#232323" />
            </Animated.View>

            {/* Puntuación */}
            <View style={styles.scoreContainer}>
                <Text style={styles.scoreText}>{score}</Text>
            </View>

            {/* Instrucciones iniciales */}
            {!gameStarted && !gameOver && (
                <View style={styles.instructions}>
                    <Text style={styles.instructionsTitle}>¡Toca para volar!</Text>
                    <Text style={styles.instructionsText}>
                        {isCreatingTrip
                            ? 'Evita los obstáculos mientras creamos tu viaje'
                            : 'Evita los obstáculos y consigue la mejor puntuación'
                        }
                    </Text>
                </View>
            )}

            {/* Game Over */}
            {gameOver && (
                <View style={styles.gameOverContainer}>
                    <Text style={styles.gameOverTitle}>
                        {tripCreated ? '¡Viaje creado!' : '¡Game Over!'}
                    </Text>
                    <Text style={styles.gameOverScore}>Puntuación: {score}</Text>
                    {highScore > 0 && (
                        <Text style={styles.highScoreText}>Récord: {highScore}</Text>
                    )}
                    <View style={styles.buttonContainer}>
                        {tripCreated && onNavigateToTrip && (
                            <TouchableOpacity style={styles.primaryButton} onPress={onNavigateToTrip}>
                                <Text style={styles.primaryButtonText}>Ver mi viaje</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={tripCreated ? styles.secondaryButton : styles.restartButton}
                            onPress={handleRestart}
                        >
                            <Text style={tripCreated ? styles.secondaryButtonText : styles.restartButtonText}>
                                Jugar de nuevo
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative'
    },
    background: {
        ...StyleSheet.absoluteFillObject
    },
    sky: {
        flex: 1,
        backgroundColor: '#87CEEB' // Cielo azul
    },
    ground: {
        height: 50,
        backgroundColor: '#DEB887' // Suelo marrón
    },
    pipe: {
        position: 'absolute',
        width: PIPE_WIDTH,
        backgroundColor: '#6B8E23',
        borderWidth: 3,
        borderColor: '#556B2F'
    },
    pipeTop: {
        top: 0,
        borderTopWidth: 0,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10
    },
    pipeBottom: {
        borderBottomWidth: 0,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10
    },
    bird: {
        position: 'absolute',
        left: SCREEN_WIDTH / 2 - BIRD_SIZE / 2,
        width: BIRD_SIZE,
        height: BIRD_SIZE,
        justifyContent: 'center',
        alignItems: 'center'
    },
    scoreContainer: {
        position: 'absolute',
        top: 60,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20
    },
    scoreText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#232323'
    },
    instructions: {
        position: 'absolute',
        top: SCREEN_HEIGHT / 3,
        alignSelf: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 30,
        borderRadius: 20,
        width: '80%'
    },
    instructionsTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#232323',
        marginBottom: 10
    },
    instructionsText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center'
    },
    gameOverContainer: {
        position: 'absolute',
        top: SCREEN_HEIGHT / 3,
        alignSelf: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 30,
        borderRadius: 20,
        width: '80%'
    },
    gameOverTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#232323',
        marginBottom: 10
    },
    gameOverScore: {
        fontSize: 24,
        color: '#666',
        marginBottom: 5
    },
    highScoreText: {
        fontSize: 18,
        color: '#FFD700',
        marginBottom: 20
    },
    buttonContainer: {
        width: '100%',
        marginTop: 10
    },
    primaryButton: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        width: '100%',
        alignItems: 'center',
        marginBottom: 10
    },
    primaryButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#232323'
    },
    secondaryButton: {
        backgroundColor: '#232323',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        width: '100%',
        alignItems: 'center'
    },
    secondaryButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFD700'
    },
    restartButton: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        width: '100%',
        alignItems: 'center'
    },
    restartButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#232323'
    }
});
