import { useModalAnimation } from '@/hooks/useModalAnimation';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Animated, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

type TimePickerInputProps = {
    value: string;
    onChangeTime: (time: string) => void;
    placeholder?: string;
    editable?: boolean;
    iconName?: keyof typeof Ionicons.glyphMap;
};

export const TimePickerInput = ({
    value,
    onChangeTime,
    placeholder = 'Seleccionar hora (HH:mm)',
    editable = true,
    iconName = 'time'
}: TimePickerInputProps) => {
    const [showPicker, setShowPicker] = useState(false);
    const [selectedHour, setSelectedHour] = useState(
        value ? parseInt(value.split(':')[0]) : 12
    );
    const [selectedMinute, setSelectedMinute] = useState(
        value ? parseInt(value.split(':')[1]) : 0
    );

    // Animaciones del modal
    const { overlayOpacity, slideAnim, handleClose: handleAnimatedClose } = useModalAnimation({
        visible: showPicker,
        onClose: () => setShowPicker(false)
    });

    // Generar arrays de horas (0-23) y minutos (0-59)
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    const handleConfirm = () => {
        const timeString = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
        onChangeTime(timeString);
        handleAnimatedClose();
    };

    const handleCancel = () => {
        // Restaurar valores originales
        if (value) {
            const [h, m] = value.split(':').map(Number);
            setSelectedHour(h);
            setSelectedMinute(m);
        }
        handleAnimatedClose();
    };

    const displayValue = value || '';

    return (
        <View>
            <TouchableOpacity
                onPress={() => editable && setShowPicker(true)}
                disabled={!editable}
                className="flex-row items-center bg-slate-50 border border-gray-200 rounded-xl px-4 py-3"
            >
                <Ionicons name={iconName} size={18} color="#6B7280" className="mr-3" />
                <Text
                    className={`flex-1 text-base ${displayValue ? 'text-gray-800' : 'text-gray-400'
                        }`}
                >
                    {displayValue || placeholder}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
            </TouchableOpacity>

            {/* Modal con selector de hora */}
            <Modal
                transparent={true}
                animationType="none"
                visible={showPicker}
                onRequestClose={handleCancel}
            >
                <Animated.View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        opacity: overlayOpacity,
                    }}
                >
                    <TouchableOpacity
                        className="flex-1 justify-end"
                        activeOpacity={1}
                        onPress={handleCancel}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <Animated.View
                                style={{ transform: [{ translateY: slideAnim }] }}
                                className="bg-white rounded-t-3xl p-5"
                            >
                                {/* Header */}
                                <View className="flex-row justify-between items-center mb-4">
                                    <Text className="text-lg font-bold text-gray-800">
                                        Seleccionar hora
                                    </Text>
                                    <View className="flex-row gap-3">
                                        <TouchableOpacity onPress={handleCancel}>
                                            <Text className="text-gray-500 font-semibold text-base">
                                                Cancelar
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={handleConfirm}>
                                            <Text className="text-indigo-600 font-semibold text-base">
                                                Confirmar
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Vista previa de la hora seleccionada */}
                                <View className="items-center mb-4 py-3 bg-indigo-50 rounded-xl">
                                    <Text className="text-3xl font-bold text-indigo-600">
                                        {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
                                    </Text>
                                </View>

                                {/* Selectores de hora y minutos */}
                                <View className="flex-row justify-center gap-4">
                                    {/* Selector de Horas */}
                                    <View className="flex-1">
                                        <Text className="text-center text-sm font-semibold text-gray-600 mb-2">
                                            Hora
                                        </Text>
                                        <ScrollView
                                            className="h-48 border border-gray-200 rounded-xl"
                                            showsVerticalScrollIndicator={false}
                                        >
                                            {hours.map((hour) => (
                                                <TouchableOpacity
                                                    key={hour}
                                                    onPress={() => setSelectedHour(hour)}
                                                    className={`py-3 px-4 ${selectedHour === hour
                                                        ? 'bg-indigo-100'
                                                        : 'bg-white'
                                                        }`}
                                                >
                                                    <Text
                                                        className={`text-center text-lg ${selectedHour === hour
                                                            ? 'text-indigo-600 font-bold'
                                                            : 'text-gray-700'
                                                            }`}
                                                    >
                                                        {hour.toString().padStart(2, '0')}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    {/* Separador visual */}
                                    <View className="justify-center">
                                        <Text className="text-2xl font-bold text-gray-400">:</Text>
                                    </View>

                                    {/* Selector de Minutos */}
                                    <View className="flex-1">
                                        <Text className="text-center text-sm font-semibold text-gray-600 mb-2">
                                            Minutos
                                        </Text>
                                        <ScrollView
                                            className="h-48 border border-gray-200 rounded-xl"
                                            showsVerticalScrollIndicator={false}
                                        >
                                            {minutes.map((minute) => (
                                                <TouchableOpacity
                                                    key={minute}
                                                    onPress={() => setSelectedMinute(minute)}
                                                    className={`py-3 px-4 ${selectedMinute === minute
                                                        ? 'bg-indigo-100'
                                                        : 'bg-white'
                                                        }`}
                                                >
                                                    <Text
                                                        className={`text-center text-lg ${selectedMinute === minute
                                                            ? 'text-indigo-600 font-bold'
                                                            : 'text-gray-700'
                                                            }`}
                                                    >
                                                        {minute.toString().padStart(2, '0')}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            </Animated.View>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Animated.View>
            </Modal>
        </View>
    );
};
