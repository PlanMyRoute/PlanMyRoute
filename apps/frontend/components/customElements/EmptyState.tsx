import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  MicrotextDark,
  SubtitleSemibold,
  TextRegular,
} from "@/components/customElements/CustomText";

interface EmptyStateProps {
  /** Nombre del icono de Ionicons */
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  /** Título principal del estado vacío */
  title: string;
  /** Mensaje descriptivo opcional */
  message?: string;
  /** Texto del botón de acción opcional */
  actionLabel?: string;
  /** Callback del botón de acción */
  onAction?: () => void;
  /** Tamaño del icono (por defecto 64) */
  iconSize?: number;
  /** Color del icono (por defecto #999999) */
  iconColor?: string;
  /** Color de fondo circular detrás del icono (si se omite, no se muestra fondo) */
  iconBackgroundColor?: string;
  /** Tamaño del círculo de fondo del icono en px (por defecto iconSize × 2) */
  iconBackgroundSize?: number;
}

/**
 * Componente reutilizable para estados vacíos (sin datos).
 *
 * @example
 * // Solo icono y título
 * <EmptyState icon="car-outline" title="No hay vehículos en este viaje" />
 *
 * // Con mensaje y acción
 * <EmptyState
 *   icon="images-outline"
 *   title="Sin fotos aún"
 *   message="Agrega fotos para recordar tu viaje"
 *   actionLabel="Agregar primera foto"
 *   onAction={handleAddPhoto}
 * />
 *
 * // Con fondo circular detrás del icono
 * <EmptyState
 *   icon="people-outline"
 *   iconSize={48}
 *   iconBackgroundColor="rgba(156,163,175,0.1)"
 *   iconBackgroundSize={96}
 *   title="Tu feed está vacío"
 *   message="Sigue a otros viajeros para ver sus reseñas aquí"
 * />
 */
export const EmptyState = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  iconSize = 64,
  iconColor = "#999999",
  iconBackgroundColor,
  iconBackgroundSize,
}: EmptyStateProps) => {
  const bgSize = iconBackgroundSize ?? iconSize * 2;

  return (
    <View className="flex-1 justify-center items-center p-4">
      {icon &&
        (iconBackgroundColor ? (
          <View
            style={{
              width: bgSize,
              height: bgSize,
              borderRadius: bgSize / 2,
              backgroundColor: iconBackgroundColor,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon} size={iconSize} color={iconColor} />
          </View>
        ) : (
          <Ionicons name={icon} size={iconSize} color={iconColor} />
        ))}
      <SubtitleSemibold className="text-neutral-gray mt-4 text-center">
        {title}
      </SubtitleSemibold>
      {message && (
        <MicrotextDark className="text-neutral-gray mt-2 text-center px-8">
          {message}
        </MicrotextDark>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          className="mt-4 bg-primary-yellow px-6 py-3 rounded-full"
        >
          <TextRegular className="text-dark-black">{actionLabel}</TextRegular>
        </TouchableOpacity>
      )}
    </View>
  );
};
