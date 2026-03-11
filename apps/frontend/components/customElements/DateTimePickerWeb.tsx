import React, { useEffect, useRef } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { MicrotextDark } from './CustomText';

interface DateTimePickerWebProps {
    value: Date | null;
    mode: 'date' | 'time';
    onChange: (date: Date | null) => void;
    minimumDate?: Date;
    maximumDate?: Date;
    is24Hour?: boolean;
    label?: string;
    error?: string;
    containerClassName?: string;
}

/**
 * Componente DateTimePickerWeb
 * Proporciona un input de fecha/hora que funciona tanto en web como en mobile
 * En web: usa inputs HTML5 nativo
 * En mobile: retorna null para que el padre use DateTimePicker de React Native
 */
export const DateTimePickerWeb: React.FC<DateTimePickerWebProps> = ({
    value,
    mode,
    onChange,
    minimumDate,
    maximumDate,
    is24Hour = true,
    label,
    error,
    containerClassName = '',
}) => {
    const inputRef = useRef<TextInput>(null);

    // En mobile, no renderizar nada - el padre se encargará del DateTimePicker nativo
    if (Platform.OS !== 'web') {
        return null;
    }

    const formatDateForInput = (date: Date | null): string => {
        if (!date) return '';
        
        if (mode === 'date') {
            // Formato YYYY-MM-DD para input type="date"
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } else {
            // Formato HH:mm para input type="time"
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        }
    };

    const formatDateMinMax = (date: Date | null): string => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleChange = (text: string) => {
        if (!text) {
            onChange(null);
            return;
        }

        try {
            let date: Date;
            
            if (mode === 'date') {
                // Parsear formato YYYY-MM-DD
                const [year, month, day] = text.split('-').map(Number);
                date = new Date(year, month - 1, day);
                // Validar que la fecha sea válida
                if (isNaN(date.getTime())) {
                    onChange(null);
                    return;
                }
            } else {
                // Parsear formato HH:mm
                const [hours, minutes] = text.split(':').map(Number);
                date = new Date();
                date.setHours(hours, minutes, 0, 0);
                if (isNaN(date.getTime())) {
                    onChange(null);
                    return;
                }
            }

            // Validar con fechas mínima y máxima
            if (minimumDate && date < minimumDate) {
                onChange(minimumDate);
                return;
            }
            if (maximumDate && date > maximumDate) {
                onChange(maximumDate);
                return;
            }

            onChange(date);
        } catch (error) {
            console.error('Error parsing date/time:', error);
            onChange(null);
        }
    };

    return (
        <View className={containerClassName}>
            {label && (
                <MicrotextDark className="mb-2">{label}</MicrotextDark>
            )}
            <input
                ref={inputRef as any}
                type={mode === 'date' ? 'date' : 'time'}
                value={formatDateForInput(value)}
                onChange={(e) => handleChange(e.target.value)}
                min={mode === 'date' ? formatDateMinMax(minimumDate || null) : undefined}
                max={mode === 'date' ? formatDateMinMax(maximumDate || null) : undefined}
                style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e5e5',
                    borderRadius: '1rem',
                    padding: '0.75rem 1rem',
                    fontSize: '0.9375rem',
                    fontFamily: 'Urbanist, sans-serif',
                    color: '#202020',
                    width: '100%',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    transition: 'border-color 0.3s',
                }}
                onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#FBBF24';
                }}
                onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e5e5';
                }}
            />
            {error && (
                <MicrotextDark className="text-red-500 mt-1">
                    {error}
                </MicrotextDark>
            )}
        </View>
    );
};

export default DateTimePickerWeb;
