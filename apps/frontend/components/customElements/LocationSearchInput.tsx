import { GetLocationModal, LocationCoordinates } from '@/components/modals/GetLocationModal';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    TouchableOpacity,
    View,
} from 'react-native';
import CustomInput from './CustomInput';
import { MicrotextDark, TextRegular } from './CustomText';

type LocationPrediction = {
    place_id: string;
    description: string;
    main_text: string;
    secondary_text: string;
};

type LocationSearchInputProps = {
    value: string;
    onLocationSelect: (address: string, coordinates: LocationCoordinates) => void;
    placeholder?: string;
    editable?: boolean;
    showLocationButton?: boolean; // Mostrar u ocultar el botón de ubicación
};

export const LocationSearchInput = ({
    value,
    onLocationSelect,
    placeholder = 'Calle, ciudad o lugar',
    editable = true,
    showLocationButton = true,
}: LocationSearchInputProps) => {
    const [searchText, setSearchText] = useState(value);
    const [predictions, setPredictions] = useState<LocationPrediction[]>([]);
    const [loading, setLoading] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Sync value prop with local state
    useEffect(() => {
        setSearchText(value);
    }, [value]);

    // Get Google Places predictions
    const handleSearch = useCallback(async (text: string) => {
        setSearchText(text);

        if (!text || text.length < 3) {
            setPredictions([]);
            return;
        }

        setLoading(true);
        try {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
            const response = await fetch(
                `${apiUrl}/api/places/autocomplete?input=${encodeURIComponent(
                    text
                )}&language=es`
            );

            const data = await response.json();

            if (data.predictions) {
                const formattedPredictions: LocationPrediction[] = data.predictions.map(
                    (prediction: any) => ({
                        place_id: prediction.place_id,
                        description: prediction.description,
                        main_text: prediction.structured_formatting?.main_text || prediction.description,
                        secondary_text: prediction.structured_formatting?.secondary_text || '',
                    })
                );
                setPredictions(formattedPredictions);
            }
        } catch (error) {
            console.error('Error fetching predictions:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Get place details to extract coordinates
    const handleSelectPrediction = useCallback(async (prediction: LocationPrediction) => {
        setLoading(true);
        try {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
            const response = await fetch(
                `${apiUrl}/api/places/details?place_id=${prediction.place_id}&fields=geometry,formatted_address`
            );

            const data = await response.json();

            if (data.result?.geometry) {
                const { lat, lng } = data.result.geometry.location;
                const address = data.result.formatted_address || prediction.description;

                onLocationSelect(address, {
                    latitude: lat,
                    longitude: lng,
                });

                setSearchText(address);
                setPredictions([]);
            }
        } catch (error) {
            console.error('Error fetching place details:', error);
        } finally {
            setLoading(false);
        }
    }, [onLocationSelect]);

    // Get current device location
    const handleGetCurrentLocation = useCallback(async () => {
        setLocationLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.error('Permission to access location was denied');
                setLocationLoading(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            setCurrentLocation(coords);
            setShowMapModal(true);
        } catch (error) {
            console.error('Error getting location:', error);
        } finally {
            setLocationLoading(false);
        }
    }, []);

    // Reverse geocode coordinates to get address
    const handleMapLocationSelected = useCallback(
        async (coords: LocationCoordinates) => {
            try {
                const results = await Location.reverseGeocodeAsync(coords);
                if (results.length > 0) {
                    const result = results[0];
                    // Construir dirección más detallada: Calle Número, Ciudad, CP
                    const addressParts = [];

                    // Calle y número
                    if (result.street) {
                        if (result.streetNumber) {
                            addressParts.push(`${result.street} ${result.streetNumber}`);
                        } else {
                            addressParts.push(result.street);
                        }
                    }

                    // Ciudad
                    if (result.city) {
                        addressParts.push(result.city);
                    } else if (result.district) {
                        addressParts.push(result.district);
                    }

                    // Código postal
                    if (result.postalCode) {
                        addressParts.push(result.postalCode);
                    }

                    // Región o país si es necesario
                    if (result.region && !result.city) {
                        addressParts.push(result.region);
                    }

                    const address = addressParts.join(', ') || 'Ubicación seleccionada';

                    onLocationSelect(address, coords);
                    setSearchText(address);
                }
            } catch (error) {
                console.error('Error reverse geocoding:', error);
            } finally {
                setShowMapModal(false);
            }
        },
        [onLocationSelect]
    );

    return (
        <View style={{ position: 'relative', zIndex: isFocused ? 9999 : 1, overflow: 'visible' }}>
            <CustomInput
                placeholder={placeholder}
                value={searchText}
                onChangeText={handleSearch}
                editable={editable}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                    // Pequeño delay para permitir que el click en predicción se registre
                    setTimeout(() => {
                        setIsFocused(false);
                        setPredictions([]);
                    }, 150);
                }}
                rightElement={showLocationButton || loading ? (
                    <View className="flex-row items-center pr-3">
                        {loading && <ActivityIndicator size="small" color="#FFD54D" />}
                        {showLocationButton && (
                            <TouchableOpacity
                                onPress={handleGetCurrentLocation}
                                disabled={locationLoading}
                                className="ml-1 p-1"
                                activeOpacity={0.7}
                            >
                                {locationLoading ? (
                                    <ActivityIndicator size="small" color="#FFD54D" />
                                ) : (
                                    <Ionicons name="location" size={20} color="#FFD54D" />
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                ) : undefined}
            />

            {/* Predictions List - Web and Mobile */}
            {predictions.length > 0 && isFocused && (
                <View
                    className="bg-white border border-neutral-gray/30 rounded-2xl"
                    style={{
                        maxHeight: 280,
                        position: 'absolute',
                        top: '100%',
                        marginTop: 8,
                        left: 0,
                        right: 0,
                        zIndex: 99999,
                        elevation: 10,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 8,
                    }}
                    pointerEvents="auto"
                >
                    <FlatList
                        data={predictions}
                        keyExtractor={(item) => item.place_id}
                        scrollEnabled={true}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                        style={{ flex: 1 }}
                        contentContainerStyle={{ flexGrow: 1 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => handleSelectPrediction(item)}
                                className="px-4 py-3 border-b border-neutral-gray/10"
                                activeOpacity={0.7}
                            >
                                <TextRegular className="font-semibold text-dark-black">
                                    {item.main_text}
                                </TextRegular>
                                {item.secondary_text && (
                                    <MicrotextDark className="text-neutral-gray mt-1">
                                        {item.secondary_text}
                                    </MicrotextDark>
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {/* Location Modal */}
            <GetLocationModal
                visible={showMapModal}
                initialLocation={currentLocation}
                onLocationSelect={handleMapLocationSelected}
                onClose={() => setShowMapModal(false)}
            />
        </View>
    );
};
