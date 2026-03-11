import { Refuel } from '@planmyroute/types';
import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

type RefuelData = Partial<Omit<Refuel, 'id'>>;

interface RefuelStopFormProps {
    refuelData: RefuelData;
    onUpdateField: (field: keyof RefuelData, value: any) => void;
}

export default function RefuelStopForm({
    refuelData,
    onUpdateField,
}: RefuelStopFormProps) {
    const [litersStr, setLitersStr] = useState<string>(refuelData.liters?.toString() || '');
    const [pricePerUnitStr, setPricePerUnitStr] = useState<string>(refuelData.price_per_unit?.toString() || '');

    useEffect(() => {
        setLitersStr(refuelData.liters?.toString() || '');
    }, [refuelData.liters]);

    useEffect(() => {
        setPricePerUnitStr(refuelData.price_per_unit?.toString() || '');
    }, [refuelData.price_per_unit]);
    return (
        <View className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 gap-3">
            <Text className="text-sm font-bold text-indigo-900 mb-1">
                Detalles del Repostaje
            </Text>

            <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">Marca de gasolinera</Text>
                <TextInput
                    placeholder="Ej: Repsol, BP, etc."
                    className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                    value={refuelData.station_brand || ''}
                    onChangeText={(value) => onUpdateField('station_brand', value)}
                />
            </View>

            <View className="flex-row gap-3">
                <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-700 mb-1">Litros</Text>
                    <TextInput
                        placeholder="50.0"
                        className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                        keyboardType="numeric"
                        value={litersStr}
                        onChangeText={(value) => {
                            const clean = value.replace(',', '.');
                            setLitersStr(value);
                            const n = parseFloat(clean);
                            onUpdateField('liters', !isNaN(n) ? n : undefined);
                        }}
                    />
                </View>
                <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-700 mb-1">Tipo combustible</Text>
                    <TextInput
                        placeholder="Gasolina 95"
                        className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                        value={refuelData.fuel_type || ''}
                        onChangeText={(value) => onUpdateField('fuel_type', value)}
                    />
                </View>
            </View>

            <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">Precio por litro</Text>
                <TextInput
                    placeholder="1.50"
                    className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm"
                    keyboardType="numeric"
                    value={pricePerUnitStr}
                    onChangeText={(value) => {
                        const clean = value.replace(',', '.');
                        setPricePerUnitStr(value);
                        const n = parseFloat(clean);
                        onUpdateField('price_per_unit', !isNaN(n) ? n : undefined);
                    }}
                />
            </View>
        </View>
    );
}
