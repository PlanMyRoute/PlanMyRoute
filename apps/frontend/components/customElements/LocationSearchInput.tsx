import { MapLocationPicker } from '@/components/maps/MapLocationPicker';
import { GetLocationModal, LocationCoordinates } from '@/components/modals/GetLocationModal';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
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
    showLocationButton?: boolean;
    /** Coordinates already associated with the current input value (from a previous selection).
     *  If provided, the map opens centered here instead of on the GPS position. */
    currentCoordinates?: LocationCoordinates | null;
};

export const LocationSearchInput = ({
    value,
    onLocationSelect,
    placeholder = 'Calle, ciudad o lugar',
    editable = true,
    showLocationButton = true,
    currentCoordinates = null,
}: LocationSearchInputProps) => {
    const containerRef = useRef<View>(null);
    const [searchText, setSearchText] = useState(value);
    const [predictions, setPredictions] = useState<LocationPrediction[]>([]);
    const [loading, setLoading] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

    // Sync value prop → local text
    const prevValue = useRef(value);
    if (value !== prevValue.current) {
        prevValue.current = value;
        setSearchText(value);
    }

    const measureInputPosition = useCallback(() => {
        // Delay to let keyboard animation finish before measuring screen coordinates
        setTimeout(() => {
            containerRef.current?.measureInWindow((x, y, w, h) => {
                if (w > 0) {
                    setDropdownPos({ top: y + h + 4, left: x, width: w });
                }
            });
        }, 350);
    }, []);

    // Fetch Google Places predictions
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
                `${apiUrl}/api/places/autocomplete?input=${encodeURIComponent(text)}&language=es`
            );
            const data = await response.json();
            if (data.predictions) {
                setPredictions(
                    data.predictions.map((p: any) => ({
                        place_id: p.place_id,
                        description: p.description,
                        main_text: p.structured_formatting?.main_text || p.description,
                        secondary_text: p.structured_formatting?.secondary_text || '',
                    }))
                );
                // Re-measure position now that keyboard has had time to settle
                measureInputPosition();
            }
        } catch {
            // silently ignore network errors for search
        } finally {
            setLoading(false);
        }
    }, [measureInputPosition]);

    // Resolve place_id → coordinates + formatted address
    const handleSelectPrediction = useCallback(async (prediction: LocationPrediction) => {
        setLoading(true);
        closePredictions();
        try {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
            const response = await fetch(
                `${apiUrl}/api/places/details?place_id=${prediction.place_id}&fields=geometry,formatted_address`
            );
            const data = await response.json();
            if (data.result?.geometry) {
                const { lat, lng } = data.result.geometry.location;
                const address = data.result.formatted_address || prediction.description;
                onLocationSelect(address, { latitude: lat, longitude: lng });
                setSearchText(address);
            }
        } catch {
            // silently ignore
        } finally {
            setLoading(false);
        }
    }, [onLocationSelect]);

    const closePredictions = () => {
        setIsFocused(false);
        setPredictions([]);
    };

    // GPS current location → open map modal for confirmation
    const handleGetCurrentLocation = useCallback(async () => {
        setLocationLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            setShowMapModal(true);
        } catch {
            // ignore
        } finally {
            setLocationLoading(false);
        }
    }, []);

    // Reverse-geocode after map selection
    const handleMapLocationSelected = useCallback(async (coords: LocationCoordinates) => {
        try {
            const results = await Location.reverseGeocodeAsync(coords);
            if (results.length > 0) {
                const r = results[0];
                const parts: string[] = [];
                if (r.street) parts.push(r.streetNumber ? `${r.street} ${r.streetNumber}` : r.street);
                if (r.city) parts.push(r.city);
                else if (r.district) parts.push(r.district);
                if (r.postalCode) parts.push(r.postalCode);
                if (r.region && !r.city) parts.push(r.region);
                const address = parts.join(', ') || 'Ubicación seleccionada';
                onLocationSelect(address, coords);
                setSearchText(address);
            }
        } catch {
            // ignore
        } finally {
            setShowMapModal(false);
        }
    }, [onLocationSelect]);

    const showDropdown = isFocused && predictions.length > 0 && !!dropdownPos;

    return (
        <View ref={containerRef} style={{ overflow: 'visible' }}>
            <CustomInput
                placeholder={placeholder}
                value={searchText}
                onChangeText={handleSearch}
                editable={editable}
                onFocus={() => {
                    setIsFocused(true);
                    measureInputPosition();
                }}
                onBlur={() => {
                    // Delay to allow prediction tap to register before hiding
                    setTimeout(closePredictions, 200);
                }}
                rightElement={showLocationButton || loading ? (
                    <View className="flex-row items-center pr-3">
                        {loading && <ActivityIndicator size="small" color="#FFD54D" />}
                        {showLocationButton && (
                            <>
                                {Platform.OS !== 'web' && (
                                    <TouchableOpacity
                                        onPress={() => setShowMapPicker(true)}
                                        className="ml-1 p-1"
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="map-outline" size={20} color="#FFD54D" />
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                ) : undefined}
            />

            {/* Predictions rendered in a transparent Modal to avoid z-index / overflow-clip issues */}
            <Modal
                visible={showDropdown}
                transparent
                animationType="none"
                statusBarTranslucent
                onRequestClose={closePredictions}
            >
                {/* Backdrop — tap to dismiss */}
                <Pressable style={StyleSheet.absoluteFillObject} onPress={closePredictions}>
                    {/* Inner Pressable stops backdrop from firing when tapping the list */}
                    <Pressable
                        style={[
                            styles.dropdown,
                            dropdownPos ? {
                                position: 'absolute',
                                top: dropdownPos.top,
                                left: dropdownPos.left,
                                width: dropdownPos.width,
                            } : undefined,
                        ]}
                    >
                        <FlatList
                            data={predictions}
                            keyExtractor={(item) => item.place_id}
                            keyboardShouldPersistTaps="handled"
                            style={{ maxHeight: 280 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => handleSelectPrediction(item)}
                                    className="px-4 py-3 border-b border-neutral-gray/10"
                                    activeOpacity={0.7}
                                >
                                    <TextRegular className="font-semibold text-dark-black">
                                        {item.main_text}
                                    </TextRegular>
                                    {item.secondary_text ? (
                                        <MicrotextDark className="text-neutral-gray mt-1">
                                            {item.secondary_text}
                                        </MicrotextDark>
                                    ) : null}
                                </TouchableOpacity>
                            )}
                        />
                    </Pressable>
                </Pressable>
            </Modal>

            <GetLocationModal
                visible={showMapModal}
                initialLocation={currentLocation}
                onLocationSelect={handleMapLocationSelected}
                onClose={() => setShowMapModal(false)}
            />

            <MapLocationPicker
                visible={showMapPicker}
                initialLocation={
                    currentCoordinates
                        ? { latitude: currentCoordinates.latitude, longitude: currentCoordinates.longitude }
                        : currentLocation
                            ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
                            : null
                }
                userLocation={
                    currentLocation
                        ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
                        : null
                }
                onLocationSelect={async (coords) => {
                    setShowMapPicker(false);
                    await handleMapLocationSelected(coords);
                }}
                onClose={() => setShowMapPicker(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    dropdown: {
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(153,153,153,0.3)',
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
});
