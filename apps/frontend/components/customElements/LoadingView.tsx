import React from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextRegular } from "@/components/customElements/CustomText";

interface LoadingViewProps {
  /** Texto opcional debajo del spinner */
  message?: string;
  /** Color del spinner (por defecto primario #FFD54D) */
  color?: string;
  /** Tamaño del spinner (por defecto "large") */
  size?: "small" | "large";
  /** Si es true, envuelve en SafeAreaView en lugar de View */
  safeArea?: boolean;
}

/**
 * Vista de carga reutilizable con spinner centrado y mensaje opcional.
 *
 * @example
 * // Spinner de página completa
 * if (isLoading) return <LoadingView message="Cargando viajes..." />;
 *
 * // Con SafeAreaView
 * if (isLoading) return <LoadingView message="Cargando..." safeArea />;
 */
export const LoadingView = ({
  message,
  color = "#FFD54D",
  size = "large",
  safeArea = false,
}: LoadingViewProps) => {
  const Container = safeArea ? SafeAreaView : View;

  return (
    <Container className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size={size} color={color} />
      {message && (
        <TextRegular className="text-neutral-gray mt-4">{message}</TextRegular>
      )}
    </Container>
  );
};
