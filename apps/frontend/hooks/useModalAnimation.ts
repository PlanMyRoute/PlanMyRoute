import { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, PanResponder, Platform } from "react-native";

// useNativeDriver: true only works for opacity + transform on native.
// On web (React Native Web), JS-driven animation (false) is more reliable.
const NATIVE_DRIVER = Platform.OS !== "web";
const SWIPE_THRESHOLD = 120;
const SWIPE_VELOCITY = 0.5;

type UseModalAnimationProps = {
  visible: boolean;
  onClose: () => void;
};

type UseModalAnimationReturn = {
  overlayOpacity: Animated.Value;
  slideAnim: Animated.Value;
  handleClose: () => void;
  panHandlers: ReturnType<typeof PanResponder.create>["panHandlers"];
};

/**
 * Hook para animar modales tipo bottom sheet con overlay, slide-up y gesto de swipe para cerrar.
 * Proporciona animaciones de entrada/salida y un PanResponder para cerrar deslizando hacia abajo.
 * @param props - Propiedades del hook: `visible` controla la visibilidad, `onClose` se ejecuta al cerrar.
 * @returns Objeto con valores animados (overlayOpacity, slideAnim), función handleClose y panHandlers.
 */
export const useModalAnimation = ({
  visible,
  onClose,
}: UseModalAnimationProps): UseModalAnimationReturn => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Stable ref so panResponder always calls the latest handleClose
  const handleCloseRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (visible) {
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: NATIVE_DRIVER,
      }).start();
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: NATIVE_DRIVER,
      }).start();
    } else {
      // Reset so the next open starts from the correct initial values
      overlayOpacity.setValue(0);
      slideAnim.setValue(300);
    }
  }, [visible, overlayOpacity, slideAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]).start(() => onClose());
  }, [onClose, overlayOpacity, slideAnim]);

  handleCloseRef.current = handleClose;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Only capture downward vertical drags on the drag handle
        onMoveShouldSetPanResponder: (_, { dy, dx }) =>
          dy > 8 && Math.abs(dy) > Math.abs(dx) * 1.5,
        onPanResponderMove: (_, { dy }) => {
          if (dy > 0) slideAnim.setValue(dy);
        },
        onPanResponderRelease: (_, { dy, vy }) => {
          if (dy > SWIPE_THRESHOLD || vy > SWIPE_VELOCITY) {
            handleCloseRef.current();
          } else {
            // Snap back
            Animated.spring(slideAnim, {
              toValue: 0,
              tension: 50,
              friction: 10,
              useNativeDriver: NATIVE_DRIVER,
            }).start();
          }
        },
      }),
    [slideAnim],
  );

  return {
    overlayOpacity,
    slideAnim,
    handleClose,
    panHandlers: panResponder.panHandlers,
  };
};
