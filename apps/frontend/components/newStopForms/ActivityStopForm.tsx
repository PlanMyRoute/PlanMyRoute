import FilePicker, { FileInfo } from '@/components/trip/FilePicker';
import { Ionicons } from '@expo/vector-icons';
import { Activity } from '@planmyroute/types';
import { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, ScrollView, Modal } from 'react-native';

type ActivityData = Partial<Omit<Activity, 'id'>> & {
    reservationFile?: FileInfo | null;
};

interface ActivityStopFormProps {
    activityData: ActivityData;
    onUpdateField: (field: keyof ActivityData, value: any) => void;
}

export default function ActivityStopForm({
    activityData,
    onUpdateField
}: ActivityStopFormProps) {
    const [entryPriceStr, setEntryPriceStr] = useState<string>(activityData.entry_price?.toString() || '');
    const [durationStr, setDurationStr] = useState<string>(activityData.estimated_duration_minutes?.toString() || '');
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const categories = [
        'Museo',
        'Parque',
        'Restaurante',
        'Café',
        'Monumento',
        'Playa',
        'Montaña',
        'Tienda',
        'Teatro',
        'Cine',
        'Galería',
        'Mercado',
        'Otro'
    ];

    useEffect(() => {
        setEntryPriceStr(activityData.entry_price?.toString() || '');
    }, [activityData.entry_price]);

    useEffect(() => {
        setDurationStr(activityData.estimated_duration_minutes?.toString() || '');
    }, [activityData.estimated_duration_minutes]);
    return (
        <View className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 gap-3">
            <Text className="text-sm font-bold text-indigo-900 mb-1">
                Detalles de la Actividad
            </Text>

            <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">Categoría</Text>
                <TouchableOpacity
                    onPress={() => setShowCategoryModal(true)}
                    className="bg-white border border-indigo-200 rounded-lg px-3 py-3"
                >
                    <Text className={`text-sm ${activityData.category ? 'text-gray-900' : 'text-gray-400'}`}>
                        {activityData.category || 'Selecciona una categoría'}
                    </Text>
                </TouchableOpacity>

                <Modal
                    visible={showCategoryModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowCategoryModal(false)}
                >
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white rounded-t-3xl p-4">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-lg font-bold text-gray-900">Selecciona una categoría</Text>
                                <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                                    <Ionicons name="close" size={24} color="#111827" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView className="max-h-96">
                                {categories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        onPress={() => {
                                            onUpdateField('category', cat);
                                            setShowCategoryModal(false);
                                        }}
                                        className={`py-3 px-4 rounded-lg mb-2 border-2 ${activityData.category === cat
                                                ? 'bg-indigo-100 border-indigo-600'
                                                : 'bg-gray-50 border-gray-200'
                                            }`}
                                    >
                                        <Text className={`font-semibold text-base ${activityData.category === cat ? 'text-indigo-700' : 'text-gray-700'}`}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TouchableOpacity
                                onPress={() => setShowCategoryModal(false)}
                                className="mt-4 py-3 px-4 bg-gray-100 rounded-lg"
                            >
                                <Text className="text-center font-semibold text-gray-700">
                                    Cerrar
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>

            <View className="flex-row gap-3">
                <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-700 mb-1">Precio entrada</Text>
                    <TextInput
                        placeholder="0.00"
                        className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                        keyboardType="decimal-pad"
                        value={entryPriceStr}
                        onChangeText={(value) => {
                            const clean = value.replace(',', '.');
                            setEntryPriceStr(value);
                            const n = parseFloat(clean);
                            onUpdateField('entry_price', !isNaN(n) ? n : undefined);
                        }}
                    />
                </View>
                <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-700 mb-1">Duración (min)</Text>
                    <TextInput
                        placeholder="60"
                        className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                        keyboardType="numeric"
                        value={durationStr}
                        onChangeText={(value) => {
                            setDurationStr(value);
                            const n = parseInt(value, 10);
                            onUpdateField('estimated_duration_minutes', !isNaN(n) ? n : undefined);
                        }}
                    />
                </View>
            </View>

            <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">Precio (€) - Opcional</Text>
                <TextInput
                    placeholder="Ej: 15.50"
                    className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                    keyboardType="decimal-pad"
                    value={activityData.estimated_price?.toString() || ''}
                    onChangeText={(value) => {
                        const clean = value.replace(',', '.');
                        const n = parseFloat(clean);
                        onUpdateField('estimated_price', !isNaN(n) ? n : undefined);
                    }}
                />
            </View>

            <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">URL</Text>
                <TextInput
                    placeholder="https://..."
                    className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                    value={activityData.url || ''}
                    onChangeText={(value) => onUpdateField('url', value)}
                    keyboardType="url"
                />
            </View>

            <TouchableOpacity
                onPress={() => onUpdateField('booking_required', !activityData.booking_required)}
                className="flex-row items-center gap-2"
            >
                <View className={`w-5 h-5 rounded border-2 items-center justify-center ${activityData.booking_required ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                    {activityData.booking_required && (
                        <Ionicons name="checkmark" size={16} color="white" />
                    )}
                </View>
                <Text className="text-sm text-gray-700">Requiere reserva</Text>
            </TouchableOpacity>

            {activityData.booking_required && (
                <FilePicker
                    label="Comprobante de reserva"
                    currentFile={activityData.reservationFile || null}
                    onFileSelected={(file) => onUpdateField('reservationFile', file)}
                />
            )}
        </View>
    );
}
