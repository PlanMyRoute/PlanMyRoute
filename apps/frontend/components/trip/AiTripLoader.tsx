import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FlappyBirdGame } from "./FlappyBirdGame";

const { width, height } = Dimensions.get("window");
const MAX_RADIUS = Math.sqrt(width ** 2 + height ** 2);
// Mismo amarillo que el botón "Crear Viaje": el círculo expansivo nace del
// botón y debe fundirse con él y con el fondo de esta pantalla sin costuras.
const BRAND_YELLOW = "#FFD54D";
const INK = "#202020";
const ROUTE_LINE_WIDTH = Math.min(width - 96, 260);

export type AiTripLoaderSummary = {
  /** Dirección completa de origen — se muestra solo la ciudad (primer segmento) */
  origin: string;
  /** Dirección completa de destino — se muestra solo la ciudad */
  destination: string;
  startDate: Date;
  endDate: Date;
  travelers: number;
  vehicles: number;
};

interface AiTripLoaderProps {
  visible: boolean;
  buttonCoords: { x: number; y: number; width: number; height: number } | null;
  loadingMessages?: string[];
  useFlappyBird?: boolean; // Nueva prop para elegir entre video o juego
  tripCreated?: boolean; // Indica que el viaje ya fue creado
  tripId?: number; // ID del viaje creado
  onNavigateToTrip?: () => void; // Callback para navegar al viaje
  /** Datos del viaje en creación — se muestran como resumen animado */
  summary?: AiTripLoaderSummary | null;
}

const cityOf = (address: string) => address.split(",")[0].trim();

const formatShortDate = (d: Date) =>
  d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });

const tripDays = (start: Date, end: Date) =>
  Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1,
  );

export const AiTripLoader = ({
  visible,
  buttonCoords,
  loadingMessages,
  useFlappyBird = false,
  tripCreated = false,
  tripId,
  onNavigateToTrip,
  summary = null,
}: AiTripLoaderProps) => {
  // Animaciones de UI
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(24)).current;
  const chipsOpacity = useRef(new Animated.Value(0)).current;
  // Coche recorriendo la línea de ruta (loop)
  const carProgress = useRef(new Animated.Value(0)).current;
  // Fundido de las frases rotativas
  const messageOpacity = useRef(new Animated.Value(1)).current;

  const defaultMessages = [
    "Analizando tus preferencias...",
    "Trazando la ruta día a día...",
    "Explorando los mejores restaurantes...",
    "Buscando alojamientos con encanto...",
    "Calculando tiempos y distancias...",
    "Puliendo los últimos detalles...",
  ];
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const messages = loadingMessages || defaultMessages;

  useEffect(() => {
    if (visible && buttonCoords) {
      // 1. Secuencia de apertura: el círculo llena la pantalla y después
      // entra el contenido (resumen desliza hacia arriba, chips con retardo).
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
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(contentSlide, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(chipsOpacity, {
            toValue: 1,
            duration: 600,
            delay: 250,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // 2. Coche recorriendo la ruta en bucle
      const carLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(carProgress, {
            toValue: 1,
            duration: 2800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
          Animated.timing(carProgress, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
      carLoop.start();

      // 3. Rotación de mensajes con fundido
      const interval = setInterval(() => {
        Animated.timing(messageOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
          Animated.timing(messageOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }).start();
        });
      }, 2600);

      return () => {
        clearInterval(interval);
        carLoop.stop();
      };
    } else {
      // Reset al cerrar
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      contentOpacity.setValue(0);
      contentSlide.setValue(24);
      chipsOpacity.setValue(0);
      carProgress.setValue(0);
      messageOpacity.setValue(1);
      setCurrentMessageIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, buttonCoords]);

  if (!visible || !buttonCoords) return null;

  const carTranslateX = carProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, ROUTE_LINE_WIDTH - 28],
  });

  const days = summary ? tripDays(summary.startDate, summary.endDate) : null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.container} accessibilityViewIsModal>
        {/* Círculo Amarillo Expansivo */}
        <Animated.View
          style={[
            styles.expandingCircle,
            {
              top: buttonCoords.y + buttonCoords.height / 2 - 25,
              left: buttonCoords.x + buttonCoords.width / 2 - 25,
              transform: [
                {
                  scale: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, (MAX_RADIUS * 2) / 50],
                  }),
                },
              ],
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

        {/* Resumen del viaje en creación */}
        {!useFlappyBird && summary && (
          <Animated.View
            style={[
              styles.summaryContainer,
              {
                opacity: contentOpacity,
                transform: [{ translateY: contentSlide }],
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.eyebrow}>CREANDO TU VIAJE</Text>
            <Text style={styles.cityLine} numberOfLines={1}>
              <Text style={styles.cityPrefix}>De </Text>
              {cityOf(summary.origin)}
            </Text>
            <Text style={styles.cityLine} numberOfLines={1}>
              <Text style={styles.cityPrefix}>a </Text>
              {cityOf(summary.destination)}
            </Text>

            {/* Línea de ruta con coche animado — mismo lenguaje visual que el
                paso Origen → Destino del wizard */}
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: "#FFFFFF" }]} />
              <View style={styles.routeLine} />
              <View style={[styles.routeDot, { backgroundColor: INK }]} />
              <Animated.View
                style={[
                  styles.carWrapper,
                  { transform: [{ translateX: carTranslateX }] },
                ]}
              >
                <Ionicons name="car-sport" size={22} color={INK} />
              </Animated.View>
            </View>

            <Animated.View style={[styles.chipsRow, { opacity: chipsOpacity }]}>
              <Text style={styles.chipText}>
                {days} día{days !== 1 ? "s" : ""} · {formatShortDate(summary.startDate)} → {formatShortDate(summary.endDate)}
              </Text>
              <Text style={styles.chipText}>
                {summary.travelers} viajero{summary.travelers !== 1 ? "s" : ""}
                {summary.vehicles > 0
                  ? ` · ${summary.vehicles} vehículo${summary.vehicles !== 1 ? "s" : ""}`
                  : ""}
              </Text>
            </Animated.View>
          </Animated.View>
        )}

        {/* Indicador de carga - Solo mostrar si el viaje NO está creado */}
        {!tripCreated && (
          <Animated.View
            style={[
              summary ? styles.loadingPillBottom : styles.loadingIndicator,
              { opacity: contentOpacity },
            ]}
          >
            {/* Spinner */}
            <ActivityIndicator size="small" color={INK} style={styles.spinner} />
            {/* Mensaje de carga con fundido */}
            <Animated.Text
              style={[styles.loadingMessage, { opacity: messageOpacity }]}
              numberOfLines={1}
            >
              {messages[currentMessageIndex]}
            </Animated.Text>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  expandingCircle: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: BRAND_YELLOW,
    zIndex: 1,
  },
  gameContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  yellowBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BRAND_YELLOW,
  },
  summaryContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  eyebrow: {
    fontFamily: "Urbanist-SemiBold",
    fontSize: 13,
    letterSpacing: 3,
    color: INK,
    opacity: 0.55,
    marginBottom: 18,
  },
  cityLine: {
    fontFamily: "Urbanist-SemiBold",
    fontSize: 34,
    lineHeight: 42,
    color: INK,
    textAlign: "center",
    maxWidth: width - 48,
  },
  cityPrefix: {
    fontFamily: "Urbanist-Regular",
    fontSize: 22,
    color: INK,
    opacity: 0.6,
  },
  routeRow: {
    width: ROUTE_LINE_WIDTH,
    marginTop: 30,
    marginBottom: 26,
    height: 28,
    flexDirection: "row",
    alignItems: "center",
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: INK,
  },
  routeLine: {
    flex: 1,
    borderBottomWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(32,32,32,0.4)",
    marginHorizontal: 4,
    marginTop: 2,
  },
  carWrapper: {
    position: "absolute",
    left: 0,
    top: -8,
  },
  chipsRow: {
    alignItems: "center",
    gap: 6,
  },
  chipText: {
    fontFamily: "Urbanist-Medium",
    fontSize: 15,
    color: INK,
    opacity: 0.85,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    overflow: "hidden",
  },
  loadingPillBottom: {
    position: "absolute",
    bottom: 64,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    maxWidth: width - 48,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  loadingIndicator: {
    position: "absolute",
    top: 60,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: width - 40,
    zIndex: 10,
    shadowColor: "#000",
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
    fontFamily: "Urbanist-SemiBold",
    fontSize: 13,
    color: INK,
    flexShrink: 1,
  },
});
