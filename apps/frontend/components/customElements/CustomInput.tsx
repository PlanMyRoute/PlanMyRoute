import React, { useState } from 'react';
import { Platform, Pressable, TextInput, TextInputProps, View } from 'react-native';
import { MicrotextDark } from './CustomText';

interface CustomInputProps extends TextInputProps {
    label?: string | React.ReactNode;
    error?: string;
    containerClassName?: string;
    inputClassName?: string;
    labelClassName?: string;
    size?: 'small' | 'medium' | 'large';
    onPress?: () => void;
    rightElement?: React.ReactNode;
}

export const CustomInput: React.FC<CustomInputProps> = ({
    label,
    error,
    containerClassName = '',
    inputClassName = '',
    labelClassName = '',
    size = 'medium',
    onPress,
    rightElement,
    onFocus,
    onBlur,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);

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

    const borderClass = error
        ? 'border-red-500'
        : isFocused
            ? 'border-primary-yellow'
            : 'border-neutral-gray/30';

    const inputElement = (
        <View className={`flex-row items-center bg-white border rounded-2xl ${borderClass}`}>
            <TextInput
                className={`flex-1 ${hasRightElement ? 'pl-4 pr-2 py-3' : sizeStyles[size]} text-dark-black ${inputClassName}`}
                style={[fontSizeStyles[size], Platform.OS === 'web' ? { outlineStyle: 'none' as any, outlineWidth: 0 } : {}]}
                placeholderTextColor="#999999"
                editable={!isButton}
                {...props}
                onFocus={(e) => {
                    setIsFocused(true);
                    onFocus?.(e);
                }}
                onBlur={(e) => {
                    setIsFocused(false);
                    onBlur?.(e);
                }}
            />
            {hasRightElement && rightElement}
        </View>
    );

    return (
        <View className={containerClassName} style={{ overflow: 'visible' }}>
            {label && (
                typeof label === 'string'
                    ? <MicrotextDark className={`mb-2 ${labelClassName}`}>{label}</MicrotextDark>
                    : label
            )}
            {isButton ? (
                <Pressable onPress={onPress}>{inputElement}</Pressable>
            ) : (
                inputElement
            )}
            {error && (
                <MicrotextDark className="text-red-500 mt-1">{error}</MicrotextDark>
            )}
        </View>
    );
};

export default CustomInput;
