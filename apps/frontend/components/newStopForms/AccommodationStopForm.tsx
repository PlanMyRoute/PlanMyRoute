import { TimePickerInput } from '@/components/modals/TimePickerInput';
import FilePicker, { FileInfo } from '@/components/trip/FilePicker';
import { Accommodation } from '@planmyroute/types';
import { Text, TextInput, View } from 'react-native';

type AccommodationData = Partial<Omit<Accommodation, 'id'>> & {
    reservationFile?: FileInfo | null;
    estimated_price?: number;
};

interface AccommodationStopFormProps {
    accommodationData: AccommodationData;
    onUpdateField: (field: keyof AccommodationData, value: any) => void;
}

export default function AccommodationStopForm({ accommodationData, onUpdateField }: AccommodationStopFormProps) {
    return (
        <View className="bg-gray-50 border border-neutral-gray/20 rounded-2xl p-4 gap-3">
            <Text className="text-xs font-bold text-dark-black uppercase tracking-widest mb-1">
                Detalles del alojamiento
            </Text>

            {/* URL */}
            <View>
                <Text className="text-xs font-semibold text-neutral-gray mb-1.5">URL de reserva</Text>
                <TextInput
                    placeholder="https://..."
                    className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
                    placeholderTextColor="#9CA3AF"
                    value={accommodationData.url || ''}
                    onChangeText={(value) => onUpdateField('url', value)}
                    keyboardType="url"
                />
            </View>

            {/* Check-in / Check-out */}
            <View className="flex-row gap-3">
                <View className="flex-1">
                    <Text className="text-xs font-semibold text-neutral-gray mb-1.5">Check-in</Text>
                    <TimePickerInput
                        value={accommodationData.check_in_time || ''}
                        onChangeTime={(time) => onUpdateField('check_in_time', time)}
                        placeholder="15:00"
                        iconName="enter"
                    />
                </View>
                <View className="flex-1">
                    <Text className="text-xs font-semibold text-neutral-gray mb-1.5">Check-out</Text>
                    <TimePickerInput
                        value={accommodationData.check_out_time || ''}
                        onChangeTime={(time) => onUpdateField('check_out_time', time)}
                        placeholder="12:00"
                        iconName="exit"
                    />
                </View>
            </View>

            {/* Código de reserva */}
            <View>
                <Text className="text-xs font-semibold text-neutral-gray mb-1.5">Código de reserva</Text>
                <TextInput
                    placeholder="Ej: ABC123"
                    className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
                    placeholderTextColor="#9CA3AF"
                    value={accommodationData.reservation_code || ''}
                    onChangeText={(value) => onUpdateField('reservation_code', value)}
                />
            </View>

            {/* Contacto + Noches */}
            <View className="flex-row gap-3">
                <View className="flex-1">
                    <Text className="text-xs font-semibold text-neutral-gray mb-1.5">Contacto</Text>
                    <TextInput
                        placeholder="Teléfono o email"
                        className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
                        placeholderTextColor="#9CA3AF"
                        value={accommodationData.contact || ''}
                        onChangeText={(value) => onUpdateField('contact', value)}
                    />
                </View>
                <View className="w-24">
                    <Text className="text-xs font-semibold text-neutral-gray mb-1.5">Noches</Text>
                    <TextInput
                        placeholder="1"
                        className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        value={accommodationData.nights?.toString() || ''}
                        onChangeText={(value) => onUpdateField('nights', value ? parseInt(value) : 1)}
                    />
                </View>
            </View>

            {/* Precio por noche */}
            <View>
                <Text className="text-xs font-semibold text-neutral-gray mb-1.5">Precio por noche (€)</Text>
                <TextInput
                    placeholder="Ej: 75.00"
                    className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    value={accommodationData.estimated_price?.toString() || ''}
                    onChangeText={(value) => {
                        const n = parseFloat(value.replace(',', '.'));
                        if (!isNaN(n)) {
                            onUpdateField('estimated_price', n);
                            if (!accommodationData.nights) onUpdateField('nights', 1);
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