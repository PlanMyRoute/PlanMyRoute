import { Image as ExpoImage, type ImageProps } from "expo-image";
import { cssInterop } from "nativewind";

/**
 * expo-image con soporte de `className` de NativeWind (que no intercepta los
 * componentes de expo-image por defecto) y caché en disco + fade-in activados.
 *
 * Sustituye a `Image` de react-native para imágenes REMOTAS (avatares, portadas,
 * fotos de paradas): cachea en disco entre sesiones y evita re-descargas.
 * Para assets locales (require) no aporta nada; usa el `Image` de react-native.
 */
const StyledExpoImage = cssInterop(ExpoImage, { className: "style" });

export type CachedImageProps = ImageProps & { className?: string };

export function CachedImage(props: CachedImageProps) {
  return (
    <StyledExpoImage
      cachePolicy="memory-disk"
      transition={150}
      contentFit="cover"
      {...props}
    />
  );
}
