import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, SubtitleSemibold, TextRegular, Title2Semibold } from '@/components/customElements/CustomText';
import { useModalAnimation } from '@/hooks/useModalAnimation';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, TouchableOpacity, View } from 'react-native';

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

    // Hook de animación con detección automática de web
    const { overlayOpacity, slideAnim, handleClose, isWeb } = useModalAnimation({ visible, onClose });

    // Obtener ubicación automáticamente cuando el modal es visible
    useEffect(() => {
        if (visible && !selectedLocation) {
            handleGetCurrentLocation();
        }
    }, [visible]);

    useEffect(() => {
        setSelectedLocation(initialLocation || null);
    }, [initialLocation]);

    const handleConfirm = () => {
        if (selectedLocation) {
            onLocationSelect(selectedLocation);
        }
    };

    const handleGetCurrentLocation = async () => {
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.error('Permiso de ubicación denegado');
                setLoading(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            setSelectedLocation(coords);
        } catch (error) {
            console.error('Error obteniendo ubicación:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            animationType="none"
            transparent={true}
            visible={visible}
            onRequestClose={handleClose}
        >
            <View style={{ flex: 1 }}>
                {/* Overlay (fondo oscuro) */}
                {isWeb ? (
                    <View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        }}
                    />
                ) : (
                    <Animated.View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            opacity: overlayOpacity,
                        }}
                    />
                )}

                {/* Contenido del modal */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, justifyContent: 'flex-end' }}
                >
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={handleClose}
                    />
                    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                        {isWeb ? (
                            <View
                                className="bg-white rounded-t-3xl pt-6 pb-8 px-6 max-h-[90vh]"
                            >
                                {/* Header */}
                                <View className="flex-row justify-between items-center mb-6">
                                    <Title2Semibold className="text-dark-black">
                                        Seleccionar ubicación
                                    </Title2Semibold>
                                    <TouchableOpacity onPress={handleClose} className="p-1">
                                        <Ionicons name="close" size={24} color="#202020" />
                                    </TouchableOpacity>
                                </View>

                                {/* Contenido */}
                                {selectedLocation ? (
                                    <View className="items-center gap-6">
                                        {/* Icono de ubicación */}
                                        <View className="relative mt-4">
                                            <View className="w-24 h-24 rounded-full bg-primary-yellow/20 items-center justify-center">
                                                <View className="w-16 h-16 rounded-full bg-primary-yellow items-center justify-center">
                                                    <Ionicons name="location" size={40} color="#202020" />
                                                </View>
                                            </View>
                                        </View>

                                        {/* Información de coordenadas */}
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

                                        {/* Botón para actualizar ubicación */}
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

                                {/* Botones de acción */}
                                <View className="flex-row gap-3 mt-6">
                                    <View className="flex-1">
                                        <CustomButton
                                            title="Cancelar"
                                            variant="outline"
                                            onPress={handleClose}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <CustomButton
                                            title="Confirmar"
                                            variant="primary"
                                            onPress={handleConfirm}
                                            disabled={!selectedLocation}
                                        />
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <Animated.View
                                style={{
                                    transform: [{ translateY: slideAnim }],
                                    minHeight: 500,
                                    backgroundColor: '#FFFFFF'
                                }}
                                className="rounded-t-3xl pt-6 pb-8 px-6"
                            >
                                {/* Header */}
                                <View className="flex-row justify-between items-center mb-6">
                                    <Title2Semibold className="text-dark-black">
                                        Seleccionar ubicación
                                    </Title2Semibold>
                                    <TouchableOpacity onPress={handleClose} className="p-1">
                                        <Ionicons name="close" size={24} color="#202020" />
                                    </TouchableOpacity>
                                </View>

                                {/* Contenido */}
                                {selectedLocation ? (
                                    <View className="items-center gap-6">
                                        {/* Icono de ubicación */}
                                        <View className="relative mt-4">
                                            <View className="w-24 h-24 rounded-full bg-primary-yellow/20 items-center justify-center">
                                                <View className="w-16 h-16 rounded-full bg-primary-yellow items-center justify-center">
                                                    <Ionicons name="location" size={40} color="#202020" />
                                                </View>
                                            </View>
                                        </View>

                                        {/* Información de coordenadas */}
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

                                        {/* Botón para actualizar ubicación */}
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

                                {/* Botones de acción */}
                                <View className="flex-row gap-3 mt-6">
                                    <View className="flex-1">
                                        <CustomButton
                                            title="Cancelar"
                                            variant="outline"
                                            onPress={handleClose}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <CustomButton
                                            title="Confirmar"
                                            variant="primary"
                                            onPress={handleConfirm}
                                            disabled={!selectedLocation}
                                        />
                                    </View>
                                </View>
                            </Animated.View>
                        )}
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};
