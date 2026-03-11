import { TimePickerInput } from '@/components/modals/TimePickerInput';
import FilePicker, { FileInfo } from '@/components/trip/FilePicker';
import { Accommodation } from '@planmyroute/types';
import { Text, TextInput, View } from 'react-native';

type AccommodationData = Partial<Omit<Accommodation, 'id'>> & {
    reservationFile?: FileInfo | null;
};

interface AccommodationStopFormProps {
    accommodationData: AccommodationData;
    onUpdateField: (field: keyof AccommodationData, value: any) => void;
}

export default function AccommodationStopForm({
    accommodationData,
    onUpdateField,
}: AccommodationStopFormProps) {
    return (
        <View className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 gap-3">
            <Text className="text-sm font-bold text-indigo-900 mb-1">
                Detalles del Alojamiento
            </Text>

            <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">URL de reserva</Text>
                <TextInput
                    placeholder="https://..."
                    className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                    value={accommodationData.url || ''}
                    onChangeText={(value) => onUpdateField('url', value)}
                    keyboardType="url"
                />
            </View>

            <View className="flex-row gap-3">
                <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-700 mb-1">Check-in</Text>
                    <TimePickerInput
                        value={accommodationData.check_in_time || ''}
                        onChangeTime={(time) => onUpdateField('check_in_time', time)}
                        placeholder="15:00"
                        iconName="enter"
                    />
                </View>
                <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-700 mb-1">Check-out</Text>
                    <TimePickerInput
                        value={accommodationData.check_out_time || ''}
                        onChangeTime={(time) => onUpdateField('check_out_time', time)}
                        placeholder="12:00"
                        iconName="exit"
                    />
                </View>
            </View>

            <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">Código de reserva</Text>
                <TextInput
                    placeholder="Ej: ABC123"
                    className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                    value={accommodationData.reservation_code || ''}
                    onChangeText={(value) => onUpdateField('reservation_code', value)}
                />
            </View>

            <View className="flex-row gap-3">
                <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-700 mb-1">Contacto</Text>
                    <TextInput
                        placeholder="Teléfono o email"
                        className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                        value={accommodationData.contact || ''}
                        onChangeText={(value) => onUpdateField('contact', value)}
                    />
                </View>
                <View className="w-24">
                    <Text className="text-xs font-semibold text-gray-700 mb-1">Noches *</Text>
                    <TextInput
                        placeholder="1"
                        className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                        keyboardType="number-pad"
                        value={accommodationData.nights?.toString() || ''}
                        onChangeText={(value) => onUpdateField('nights', value ? parseInt(value) : 1)}
                    />
                </View>
            </View>

            <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">Precio por noche (€) *</Text>
                <TextInput
                    placeholder="Ej: 75.00"
                    className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                    keyboardType="decimal-pad"
                    value={accommodationData.estimated_price?.toString() || ''}
                    onChangeText={(value) => {
                        const clean = value.replace(',', '.');
                        const n = parseFloat(clean);
                        if (!isNaN(n)) {
                            onUpdateField('estimated_price', n);
                            // Si se ingresa precio y no hay noches, establecer por defecto a 1
                            if (!accommodationData.nights) {
                                onUpdateField('nights', 1);
                            }
                        } else {
                            onUpdateField('estimated_price', undefined);
                        }
                    }}
                />
            </View>

            <FilePicker
                label="Comprobante de reserva del alojamiento"
                currentFile={accommodationData.reservationFile || null}
                onFileSelected={(file) => onUpdateField('reservationFile', file)}
            />
        </View>
    );
}
