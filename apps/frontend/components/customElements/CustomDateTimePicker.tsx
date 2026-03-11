import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React from 'react';
import { Platform, View, TextInput, TouchableOpacity, Text } from 'react-native';

interface CustomDateTimePickerProps {
    value: Date;
    mode: 'date' | 'time';
    isVisible: boolean;
    onConfirm: (date: Date) => void;
    onCancel: () => void;
    minimumDate?: Date;
    is24Hour?: boolean;
}

/**
 * CustomDateTimePicker - Wrapper para DateTimePicker con estilo consistente
 * Soporta mobile (iOS/Android) y web
 * 
 * @param value - Fecha/hora actual
 * @param mode - Modo del picker: 'date' o 'time'
 * @param isVisible - Si el picker está visible
 * @param onConfirm - Callback cuando se confirma la selección
 * @param onCancel - Callback cuando se cancela
 * @param minimumDate - Fecha mínima permitida (solo para mode='date')
 * @param is24Hour - Usar formato 24 horas (solo para mode='time')
 */
const CustomDateTimePicker: React.FC<CustomDateTimePickerProps> = ({
    value,
    mode,
    isVisible,
    onConfirm,
    onCancel,
    minimumDate,
    is24Hour = true,
}) => {
    if (!isVisible) return null;

    // Para web, usar input HTML nativo
    if (Platform.OS === 'web') {
        const handleWebDateChange = (e: any) => {
            if (mode === 'date') {
                const dateString = e.target.value;
                if (dateString) {
                    const [year, month, day] = dateString.split('-');
                    const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    onConfirm(newDate);
                }
            }
        };

        const handleWebTimeChange = (e: any) => {
            if (mode === 'time') {
                const timeString = e.target.value;
                if (timeString) {
                    const [hours, minutes] = timeString.split(':');
                    const newDate = new Date(value);
                    newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    onConfirm(newDate);
                }
            }
        };

        // Convertir fecha a formato ISO para el input
        const formatDateForInput = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const formatTimeForInput = (date: Date) => {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        };

        const minDateString = minimumDate ? formatDateForInput(minimumDate) : undefined;

        return (
            <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                justifyContent: 'flex-end',
                zIndex: 1000
            } as any}>
                <View style={{
                    backgroundColor: 'white',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    padding: 16,
                    paddingBottom: 32,
                    gap: 12
                } as any}>
                    {mode === 'date' && (
                        <input
                            id="date-picker-input"
                            type="date"
                            defaultValue={formatDateForInput(value)}
                            onInput={handleWebDateChange}
                            onChange={handleWebDateChange}
                            min={minDateString}
                            style={{
                                padding: '12px 16px',
                                fontSize: 16,
                                borderRadius: 8,
                                border: '1px solid #E5E7EB',
                                fontFamily: 'system-ui',
                            }}
                            autoFocus
                        />
                    )}
                    {mode === 'time' && (
                        <input
                            id="time-picker-input"
                            type="time"
                            defaultValue={formatTimeForInput(value)}
                            onInput={handleWebTimeChange}
                            onChange={handleWebTimeChange}
                            style={{
                                padding: '12px 16px',
                                fontSize: 16,
                                borderRadius: 8,
                                border: '1px solid #E5E7EB',
                                fontFamily: 'system-ui',
                            }}
                            autoFocus
                        />
                    )}
                    <TouchableOpacity
                        onPress={() => {
                            // Obtener el valor actual del input y confirmar
                            if (mode === 'date') {
                                const input = document.getElementById('date-picker-input') as HTMLInputElement;
                                if (input && input.value) {
                                    const [year, month, day] = input.value.split('-');
                                    const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                    console.log('📆 Confirmar button: date =', newDate);
                                    onConfirm(newDate);
                                } else {
                                    onCancel();
                                }
                            } else if (mode === 'time') {
                                const input = document.getElementById('time-picker-input') as HTMLInputElement;
                                if (input && input.value) {
                                    const [hours, minutes] = input.value.split(':');
                                    const newDate = new Date(value);
                                    newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                    console.log('⏰ Confirmar button: time =', newDate);
                                    onConfirm(newDate);
                                } else {
                                    onCancel();
                                }
                            } else {
                                onCancel();
                            }
                        }}
                        style={{
                            padding: 12,
                            backgroundColor: '#4F46E5',
                            borderRadius: 8,
                            alignItems: 'center'
                        }}
                    >
                        <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                            Confirmar
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Para mobile, usar DateTimePicker nativo
    const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        // En Android, el picker se cierra automáticamente
        if (Platform.OS === 'android') {
            onCancel(); // Cerrar el picker
        }

        // Si se seleccionó una fecha/hora, llamar a onConfirm
        if (event.type === 'set' && selectedDate) {
            onConfirm(selectedDate);

            // En iOS, mantener el picker abierto hasta que el usuario cierre manualmente
            if (Platform.OS === 'ios') {
                onCancel();
            }
        } else if (event.type === 'dismissed') {
            // Usuario canceló en Android
            onCancel();
        }
    };

    return (
        <DateTimePicker
            value={value}
            mode={mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={mode === 'date' ? minimumDate : undefined}
            is24Hour={mode === 'time' ? is24Hour : undefined}
            onChange={handleChange}
            themeVariant="light"
            accentColor="#FFD54D"
            textColor="#202020"
        />
    );
};

export default CustomDateTimePicker;
