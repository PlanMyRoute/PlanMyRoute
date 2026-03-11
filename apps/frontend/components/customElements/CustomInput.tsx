import React from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import { MicrotextDark } from './CustomText';

interface CustomInputProps extends TextInputProps {
    label?: string | React.ReactNode;
    error?: string;
    containerClassName?: string;
    inputClassName?: string;
    labelClassName?: string;
    size?: 'small' | 'medium' | 'large';
    onPress?: () => void;
    rightElement?: React.ReactNode; // Elemento a la derecha del input (botón, icono, etc.)
}

/**
 * Componente CustomInput - Input reutilizable con estilos consistentes
 * 
 * @param label - Etiqueta opcional del input (string o componente React)
 * @param error - Mensaje de error opcional
 * @param containerClassName - Clases adicionales para el contenedor
 * @param inputClassName - Clases adicionales para el input
 * @param labelClassName - Clases adicionales para la etiqueta (solo para label tipo string)
 * @param size - Tamaño del input: 'small', 'medium', 'large'
 * @param onPress - Función a ejecutar al presionar (convierte el input en un botón)
 * @param rightElement - Elemento React a la derecha del input (botón, icono, etc.)
 * 
 * Ejemplos de uso:
 * <CustomInput placeholder="Madrid" />
 * <CustomInput label="Origen" placeholder="Madrid" />
 * <CustomInput label={<SubtitleSemibold>Origen</SubtitleSemibold>} placeholder="Madrid" />
 * <CustomInput label="Fecha" onPress={() => setShowPicker(true)} editable={false} />
 * <CustomInput placeholder="Buscar" rightElement={<TouchableOpacity>...</TouchableOpacity>} />
 */
export const CustomInput: React.FC<CustomInputProps> = ({
    label,
    error,
    containerClassName = '',
    inputClassName = '',
    labelClassName = '',
    size = 'medium',
    onPress,
    rightElement,
    ...props
}) => {
    // Definir estilos según el tamaño
    const sizeStyles = {
        small: 'px-4 py-2',
        medium: 'px-4 py-3',
        large: 'px-5 py-4',
    };

    const fontSizeStyles = {
        small: { fontFamily: 'Urbanist-Medium', fontSize: 14 },
        medium: { fontFamily: 'Urbanist-Medium', fontSize: 15 },
        large: { fontFamily: 'Urbanist-Medium', fontSize: 16 },
    };

    const isButton = !!onPress;
    const hasRightElement = !!rightElement;

    const inputElement = (
        <View className={`flex-row items-center bg-white border border-neutral-gray/30 rounded-2xl ${error ? 'border-red-500' : ''}`}>
            <TextInput
                className={`
              flex-1
              ${hasRightElement ? 'pl-4 pr-2 py-3' : sizeStyles[size]}
              text-dark-black
              ${inputClassName}
            `}
                style={fontSizeStyles[size]}
                placeholderTextColor="#999999"
                editable={!isButton}
                {...props}
            />
            {hasRightElement && rightElement}
        </View>
    );

    return (
        <View className={`${containerClassName}`} style={{ overflow: 'visible' }}>
            {label && (
                typeof label === 'string'
                    ? <MicrotextDark className={`mb-2 ${labelClassName}`}>{label}</MicrotextDark>
                    : label
            )}
            {isButton ? (
                <Pressable onPress={onPress}>
                    {inputElement}
                </Pressable>
            ) : (
                inputElement
            )}
            {error && (
                <MicrotextDark className="text-red-500 mt-1">
                    {error}
                </MicrotextDark>
            )}
        </View>
    );
};

export default CustomInput;
