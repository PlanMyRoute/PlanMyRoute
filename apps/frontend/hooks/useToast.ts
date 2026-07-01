import Toast from "react-native-toast-message";

type ToastVariant = "success" | "error" | "info";

interface ShowToastOptions {
  message: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  onPress?: () => void;
}

/**
 * Hook para mostrar y ocultar notificaciones toast con variantes (success, error, info).
 * @returns Objeto con funciones `showToast` para mostrar y `hideToast` para ocultar notificaciones.
 */
export function useToast() {
  const showToast = ({
    message,
    description,
    variant = "info",
    duration = 2500,
    onPress,
  }: ShowToastOptions) => {
    Toast.show({
      type: variant,
      text1: message,
      text2: description,
      visibilityTime: duration,
      onPress,
    });
  };

  const hideToast = () => Toast.hide();

  return { showToast, hideToast };
}
