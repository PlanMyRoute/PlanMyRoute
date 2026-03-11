import { Text, TextProps } from 'react-native';

/**
 * Componentes de texto siguiendo la guía de tipografía Urbanist
 * 
 * Similar al patrón de Icons.jsx, cada componente tiene un propósito específico:
 * 
 * TÍTULOS:
 * - Title1: 32px Semibold - Títulos principales
 * - Title2Semibold: 24px Semibold - Destacar palabras en títulos
 * - Title2: 24px Regular - Títulos secundarios
 * 
 * SUBTÍTULOS:
 * - SubtitleSemibold: 18px Semibold - Subtítulos destacados
 * - SubtitleMedium: 18px Medium - Subtítulos con peso medio
 * - Subtitle: 18px Regular - Subtítulos normales
 * 
 * TEXTO GENERAL:
 * - TextRegular: 15px Medium - Texto del cuerpo
 * 
 * MICROTEXTOS:
 * - MicrotextDark: 12px Regular - Texto negro sobre fondo blanco
 * - MicrotextLight: 12px Regular - Texto blanco sobre fondo de color
 * 
 * @example
 * <Title1>Empecemos la aventura</Title1>
 * <SubtitleSemibold>Número de viajeros</SubtitleSemibold>
 * <TextRegular className="text-neutral-gray">Descripción</TextRegular>
 */

// TÍTULOS
export const Title1 = (props: TextProps) => (
    <Text
        style={{ fontFamily: 'Urbanist-SemiBold', fontSize: 32, lineHeight: 38, color: '#202020' }}
        {...props}
    />
);

export const Title2Semibold = (props: TextProps) => (
    <Text
        style={{ fontFamily: 'Urbanist-SemiBold', fontSize: 24, lineHeight: 30, color: '#202020' }}
        {...props}
    />
);

export const Title2 = (props: TextProps) => (
    <Text
        style={{ fontFamily: 'Urbanist-Regular', fontSize: 24, lineHeight: 30, color: '#202020' }}
        {...props}
    />
);

export const Title3Bold = (props: TextProps) => (
    <Text
        style={{ fontFamily: 'Urbanist-Bold', fontSize: 20, lineHeight: 26, color: '#202020' }}
        {...props}
    />
);

export const Title3Semibold = (props: TextProps) => (
    <Text
        style={{ fontFamily: 'Urbanist-SemiBold', fontSize: 20, lineHeight: 26, color: '#202020' }}
        {...props}
    />
);

export const Title3 = (props: TextProps) => (
    <Text
        style={{ fontFamily: 'Urbanist-Regular', fontSize: 20, lineHeight: 26, color: '#202020' }}
        {...props}
    />
);

// SUBTÍTULOS
export const SubtitleSemibold = (props: TextProps) => (
    <Text
        style={{ fontFamily: 'Urbanist-SemiBold', fontSize: 18, lineHeight: 24, color: '#202020' }}
        {...props}
    />
);

export const SubtitleMedium = (props: TextProps) => (
    <Text
        style={{ fontFamily: 'Urbanist-Medium', fontSize: 18, lineHeight: 24, color: '#202020' }}
        {...props}
    />
);

export const Subtitle = (props: TextProps) => (
    <Text
        style={{ fontFamily: 'Urbanist-Regular', fontSize: 18, lineHeight: 24, color: '#202020' }}
        {...props}
    />
);

// TEXTO GENERAL
export const TextRegular = (props: TextProps) => (
    <Text
        style={{ fontFamily: 'Urbanist-Medium', fontSize: 15, lineHeight: 20 }}
        {...props}
    />
);

// TEXTO GENERAL NEGRITA    
export const TextBold = (props: TextProps) => (
    <Text
        style={{ fontFamily: 'Urbanist-Bold', fontSize: 15, lineHeight: 20 }}
        {...props}
    />
);

// MICROTEXTOS
export const MicrotextDark = (props: TextProps) => (
    <Text
        style={{ fontFamily: 'Urbanist-Regular', fontSize: 12, lineHeight: 16, color: '#202020' }}
        {...props}
    />
);

export const MicrotextLight = (props: TextProps) => (
    <Text
        style={{ fontFamily: 'Urbanist-Regular', fontSize: 12, lineHeight: 16, color: '#FFFFFF' }}
        {...props}
    />
);
