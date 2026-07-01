import React from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { MicrotextDark, MicrotextLight, TextRegular } from "./CustomText";

interface CustomButtonProps {
  onPress?: () => void;
  title?: string | React.ReactNode;
  variant?:
    | "primary"
    | "outline"
    | "dark"
    | "round"
    | "round-outline"
    | "danger"
    | "yellow";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  textClassName?: string;
  children?: React.ReactNode;
  /** Etiqueta para lectores de pantalla. Se deriva automáticamente de `title` si es string. */
  accessibilityLabel?: string;
}

/**
 * Componente CustomButton - Botón reutilizable con múltiples variantes
 *
 * @param onPress - Función a ejecutar al presionar el botón
 * @param title - Texto del botón (string o componente React)
 * @param variant - Estilo del botón: 'primary' (amarillo), 'outline' (trazado), 'dark' (negro), 'round' (redondo amarillo), 'round-outline' (redondo trazado)
 * @param size - Tamaño del botón: 'small' (12px), 'medium' (15px), 'large' (24px)
 * @param disabled - Desactivar el botón
 * @param loading - Mostrar indicador de carga
 * @param icon - Icono a mostrar en el botón
 * @param className - Clases adicionales para el contenedor
 * @param textClassName - Clases adicionales para el texto (solo para title tipo string)
 * @param children - Contenido personalizado del botón
 *
 * Ejemplos de uso:
 * <CustomButton title="Itinerario" variant="primary" size="medium" />
 * <CustomButton title={<MicrotextLight>Itinerario</MicrotextLight>} variant="dark" />
 * <CustomButton title="1" variant="round" size="small" />
 * <CustomButton icon={<PlusIcon />} variant="round" size="medium" />
 */
export const CustomButton: React.FC<CustomButtonProps> = ({
  onPress,
  title,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  icon,
  className = "",
  textClassName = "",
  children,
  accessibilityLabel,
}) => {
  // Estilos base según la variante
  const variantStyles = {
    primary: "bg-primary-yellow border-2 border-primary-yellow",
    outline: "bg-transparent border-2 border-dark-black",
    dark: "bg-dark-black border-2 border-dark-black",
    danger: "bg-red-500 border-2 border-red-500",
    yellow: "bg-primary-yellow border-2 border-primary-yellow",
    round: "bg-primary-yellow border-2 border-primary-yellow rounded-full",
    "round-outline": "bg-transparent border-2 border-dark-black rounded-full",
  };

  // Tamaños según el tipo de botón
  const isRound = variant === "round" || variant === "round-outline";

  const sizeStyles = isRound
    ? {
        small: "w-10 h-10", // 12px padding aprox
        medium: "w-12 h-12", // 15px padding aprox
        large: "w-16 h-16", // 24px padding aprox
      }
    : {
        small: "px-4 py-2",
        medium: "px-5 py-2.5",
        large: "px-6 py-3",
      };

  // Estilo para botón deshabilitado
  const disabledStyle = disabled ? "opacity-50" : "";

  const renderTitle = () => {
    if (!title) return null;

    if (typeof title === "string") {
      const isDark = variant === "dark" || variant === "danger";

      // Botones pequeños: 12px (microtexto)
      if (size === "small") {
        return isDark ? (
          <MicrotextLight className={textClassName}>{title}</MicrotextLight>
        ) : (
          <MicrotextDark className={textClassName}>{title}</MicrotextDark>
        );
      }

      // Botones medium y large: 15px
      return (
        <TextRegular
          style={isDark ? { color: "#FFFFFF" } : undefined}
          className={textClassName}
        >
          {title}
        </TextRegular>
      );
    }

    return <>{title}</>;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? (typeof title === "string" ? title : undefined)
      }
      accessibilityState={{ disabled: disabled || loading }}
      className={`
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${disabledStyle}
        ${isRound ? "items-center justify-center" : "rounded-full"}
        flex-row items-center justify-center
        ${className}
      `}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "dark" || variant === "danger" ? "#FFFFFF" : "#202020"
          }
          size="small"
        />
      ) : (
        <>
          {children || (
            <View className="flex-row items-center justify-center gap-2">
              {icon && <View>{icon}</View>}
              {title && renderTitle()}
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

export default CustomButton;
