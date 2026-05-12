import { Refuel } from '@planmyroute/types';
import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

type RefuelData = Partial<Omit<Refuel, 'id'>>;

interface RefuelStopFormProps {
    refuelData: RefuelData;
    onUpdateField: (field: keyof RefuelData, value: any) => void;
}

export default function RefuelStopForm({ refuelData, onUpdateField }: RefuelStopFormProps) {
    const [litersStr, setLitersStr] = useState<string>(refuelData.liters?.toString() || '');
    const [pricePerUnitStr, setPricePerUnitStr] = useState<string>(refuelData.price_per_unit?.toString() || '');

    useEffect(() => { setLitersStr(refuelData.liters?.toString() || ''); }, [refuelData.liters]);
    useEffect(() => { setPricePerUnitStr(refuelData.price_per_unit?.toString() || ''); }, [refuelData.price_per_unit]);

    return (
        <View className="bg-gray-50 border border-neutral-gray/20 rounded-2xl p-4 gap-3">
            <Text className="text-xs font-bold text-dark-black uppercase tracking-widest mb-1">
                Detalles del repostaje
            </Text>

            {/* Marca */}
            <View>
                <Text className="text-xs font-semibold text-neutral-gray mb-1.5">Marca de gasolinera</Text>
                <TextInput
                    placeholder="Ej: Repsol, BP…"
                    className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
                    placeholderTextColor="#9CA3AF"
                    value={refuelData.station_brand || ''}
                    onChangeText={(value) => onUpdateField('station_brand', value)}
                />
            </View>

            {/* Litros + Tipo combustible */}
            <View className="flex-row gap-3">
                <View className="flex-1">
                    <Text className="text-xs font-semibold text-neutral-gray mb-1.5">Litros</Text>
                    <TextInput
                        placeholder="50.0"
                        className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        value={litersStr}
                        onChangeText={(value) => {
                            setLitersStr(value);
                            const n = parseFloat(value.replace(',', '.'));
                            onUpdateField('liters', !isNaN(n) ? n : undefined);
                        }}
                    />
                </View>
                <View className="flex-1">
                    <Text className="text-xs font-semibold text-neutral-gray mb-1.5">Tipo combustible</Text>
                    <TextInput
                        placeholder="Gasolina 95"
                        className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
                        placeholderTextColor="#9CA3AF"
                        value={refuelData.fuel_type || ''}
                        onChangeText={(value) => onUpdateField('fuel_type', value)}
                    />
                </View>
            </View>

            {/* Precio por litro */}
            <View>
                <Text className="text-xs font-semibold text-neutral-gray mb-1.5">Precio por litro (€)</Text>
                <TextInput
                    placeholder="1.50"
                    className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={pricePerUnitStr}
                    onChangeText={(value) => {
                        setPricePerUnitStr(value);
                        const n = parseFloat(value.replace(',', '.'));
                        onUpdateField('price_per_unit', !isNaN(n) ? n : undefined);
                    }}
                />
            </View>
        </View>
    );
}