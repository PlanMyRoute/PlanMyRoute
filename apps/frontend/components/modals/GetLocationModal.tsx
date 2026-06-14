import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, SubtitleSemibold, TextRegular, Title2Semibold } from '@/components/customElements/CustomText';
import { ModalSheet } from '@/components/modals/ModalSheet';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

export type LocationCoordinates = {
    latitude: number;
    longitude: number;
};

type GetLocationModalProps = {
    visible: boolean;
    initialLocation?: LocationCoordinates | null;
    onLocationSelect: (coords: LocationCoordinates) => void;
    onClose: () => void;
};

export const GetLocationModal = ({
    visible,
    initialLocation,
    onLocationSelect,
    onClose,
}: GetLocationModalProps) => {
    const [selectedLocation, setSelectedLocation] = useState<LocationCoordinates | null>(
        initialLocation || null
    );
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && !selectedLocation) handleGetCurrentLocation();
    }, [visible]);

    useEffect(() => {
        setSelectedLocation(initialLocation || null);
    }, [initialLocation]);

    const handleGetCurrentLocation = async () => {
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') { setLoading(false); return; }
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setSelectedLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
        } catch {
            // silenced — user sees the "Detectando..." state
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalSheet visible={visible} onClose={onClose} minHeight={500}>
            {(handleClose) => (
                <View className="pt-2 pb-8 px-6">
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-6">
                        <Title2Semibold>Seleccionar ubicación</Title2Semibold>
                        <TouchableOpacity onPress={handleClose} className="p-1">
                            <Ionicons name="close" size={24} color="#202020" />
                        </TouchableOpacity>
                    </View>

                    {selectedLocation ? (
                        <View className="items-center gap-6">
                            <View className="relative mt-4">
                                <View className="w-24 h-24 rounded-full bg-primary-yellow/20 items-center justify-center">
                                    <View className="w-16 h-16 rounded-full bg-primary-yellow items-center justify-center">
                                        <Ionicons name="location" size={40} color="#202020" />
                                    </View>
                                </View>
                            </View>

                            <View className="bg-white border border-neutral-gray/20 rounded-2xl p-6 w-full">
                                <SubtitleSemibold className="text-center text-neutral-gray mb-4">
                                    Ubicación seleccionada
                                </SubtitleSemibold>

                                <View className="flex-row items-center gap-3 mb-4 bg-primary-yellow/10 p-4 rounded-xl">
                                    <Ionicons name="navigate" size={20} color="#FFD54D" />
                                    <View className="flex-1">
                                        <MicrotextDark className="text-neutral-gray font-semibold">LATITUD</MicrotextDark>
                                        <TextRegular className="text-dark-black font-semibold">
                                            {selectedLocation.latitude.toFixed(6)}°
                                        </TextRegular>
                                    </View>
                                </View>

                                <View className="flex-row items-center gap-3 bg-neutral-gray/10 p-4 rounded-xl">
                                    <Ionicons name="compass" size={20} color="#999999" />
                                    <View className="flex-1">
                                        <MicrotextDark className="text-neutral-gray font-semibold">LONGITUD</MicrotextDark>
                                        <TextRegular className="text-dark-black font-semibold">
                                            {selectedLocation.longitude.toFixed(6)}°
                                        </TextRegular>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleGetCurrentLocation}
                                disabled={loading}
                                className="bg-neutral-gray/10 px-6 py-4 rounded-2xl flex-row items-center justify-center gap-2 w-full border border-neutral-gray/20"
                                activeOpacity={0.7}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#999999" />
                                ) : (
                                    <>
                                        <Ionicons name="refresh" size={18} color="#999999" />
                                        <TextRegular className="text-neutral-gray font-semibold">
                                            Actualizar ubicación
                                        </TextRegular>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View className="items-center gap-4 py-12">
                            <Ionicons name="map-outline" size={64} color="#999999" />
                            <TextRegular className="text-neutral-gray text-center">
                                Detectando tu ubicación...
                            </TextRegular>
                            <ActivityIndicator size="large" color="#FFD54D" />
                        </View>
                    )}

                    <View className="flex-row gap-3 mt-6">
                        <View className="flex-1">
                            <CustomButton title="Cancelar" variant="outline" onPress={handleClose} />
                        </View>
                        <View className="flex-1">
                            <CustomButton
                                title="Confirmar"
                                variant="primary"
                                onPress={() => { if (selectedLocation) onLocationSelect(selectedLocation); }}
                                disabled={!selectedLocation}
                            />
                        </View>
                    </View>
                </View>
            )}
        </ModalSheet>
    );
};
