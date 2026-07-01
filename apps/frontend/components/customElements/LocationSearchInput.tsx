import {
  formatMapAddress,
  MapLocationPicker,
  MapPickerCoords,
} from "@/components/maps/MapLocationPicker";
import { MapLocationPickerWeb } from "@/components/maps/MapLocationPickerWeb";
import type { LocationCoordinates } from "@/components/modals/GetLocationModal";
import { apiFetch } from "@/lib/apiClient";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import CustomInput from "./CustomInput";
import { MicrotextDark, TextRegular } from "./CustomText";

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

// ── Internal search modal ─────────────────────────────────────────────────────

type LocationSearchModalProps = {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (address: string, coords: LocationCoordinates) => void;
  onOpenMap: () => void;
  showLocationButton?: boolean;
};

const LocationSearchModal = ({
  visible,
  onClose,
  onLocationSelect,
  onOpenMap,
  showLocationButton = true,
}: LocationSearchModalProps) => {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<LocationPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setQuery("");
      setPredictions([]);
      setGpsError(null);
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch<{
          predictions?: Array<{
            place_id: string;
            description: string;
            structured_formatting?: {
              main_text: string;
              secondary_text: string;
            };
          }>;
        }>(
          `/api/places/autocomplete?input=${encodeURIComponent(text)}&language=es`,
        );
        setPredictions(
          (data.predictions ?? []).map((p: any) => ({
            place_id: p.place_id,
            description: p.description,
            main_text: p.structured_formatting?.main_text || p.description,
            secondary_text: p.structured_formatting?.secondary_text || "",
          })),
        );
      } catch {
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const handleSelectPrediction = useCallback(
    async (prediction: LocationPrediction) => {
      setLoading(true);
      try {
        const data = await apiFetch<{
          result?: {
            geometry?: { location: { lat: number; lng: number } };
            formatted_address?: string;
          };
        }>(
          `/api/places/details?place_id=${encodeURIComponent(prediction.place_id)}&fields=geometry,formatted_address`,
        );
        if (data.result?.geometry) {
          const { lat, lng } = data.result.geometry.location;
          const address =
            data.result.formatted_address || prediction.description;
          onLocationSelect(address, { latitude: lat, longitude: lng });
        }
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    },
    [onLocationSelect],
  );

  const handleGPS = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsError("Permiso de ubicación denegado.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: LocationCoordinates = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      let address: string | null = null;
      if (Platform.OS === "web") {
        try {
          const data = await apiFetch<{ address?: string }>(
            `/api/places/reverse?lat=${coords.latitude}&lng=${coords.longitude}`,
          );
          address = data.address ?? null;
        } catch {
          /* ignore */
        }
      } else {
        const results = await Location.reverseGeocodeAsync(coords);
        address = formatMapAddress(results[0]) ?? null;
      }
      if (!address) {
        setGpsError("No se pudo resolver la ubicación. Busca manualmente.");
        return;
      }
      onLocationSelect(address, coords);
    } catch {
      setGpsError("Error al obtener la ubicación. Verifica los permisos.");
    } finally {
      setGpsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={{ flex: 1, backgroundColor: "#fff" }}
        accessibilityViewIsModal
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingTop: 52,
            paddingHorizontal: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(153,153,153,0.15)",
            gap: 8,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{ padding: 4 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#202020" />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={handleSearch}
            placeholder="Buscar ciudad o lugar..."
            placeholderTextColor="#999999"
            style={{
              flex: 1,
              fontFamily: "Urbanist-Medium",
              fontSize: 15,
              color: "#202020",
            }}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {loading && <ActivityIndicator size="small" color="#FFD54D" />}
          {query.length > 0 && !loading && (
            <TouchableOpacity
              onPress={() => {
                setQuery("");
                setPredictions([]);
              }}
              style={{ padding: 4 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#999999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick action buttons */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(153,153,153,0.08)",
          }}
        >
          <TouchableOpacity
            onPress={handleGPS}
            disabled={gpsLoading}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(255,213,77,0.12)",
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
            activeOpacity={0.7}
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color="#FFD54D" />
            ) : (
              <Ionicons name="navigate" size={18} color="#FFD54D" />
            )}
            <TextRegular style={{ color: "#202020", fontSize: 13 }}>
              Usar mi ubicación
            </TextRegular>
          </TouchableOpacity>
          {showLocationButton && (
            <TouchableOpacity
              onPress={onOpenMap}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(32,32,32,0.06)",
                borderRadius: 14,
                paddingVertical: 10,
                paddingHorizontal: 14,
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="map-outline" size={18} color="#202020" />
              <TextRegular style={{ color: "#202020", fontSize: 13 }}>
                Elegir en el mapa
              </TextRegular>
            </TouchableOpacity>
          )}
        </View>

        {/* GPS error */}
        {gpsError && (
          <MicrotextDark
            style={{
              color: "#EF4444",
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            {gpsError}
          </MicrotextDark>
        )}

        {/* Results */}
        <FlatList
          data={predictions}
          keyExtractor={(item) => item.place_id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSelectPrediction(item)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(153,153,153,0.08)",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={18} color="#999999" />
              <View style={{ flex: 1 }}>
                <TextRegular className="font-semibold text-dark-black">
                  {item.main_text}
                </TextRegular>
                {item.secondary_text ? (
                  <MicrotextDark className="text-neutral-gray mt-0.5">
                    {item.secondary_text}
                  </MicrotextDark>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            query.length >= 3 && !loading ? (
              <View
                style={{ paddingVertical: 48, alignItems: "center", gap: 8 }}
              >
                <Ionicons name="search-outline" size={32} color="#999999" />
                <MicrotextDark className="text-neutral-gray">
                  Sin resultados para "{query}"
                </MicrotextDark>
              </View>
            ) : null
          }
        />
      </View>
    </Modal>
  );
};

// ── Main exported component ───────────────────────────────────────────────────

export const LocationSearchInput = ({
  value,
  onLocationSelect,
  placeholder = "Calle, ciudad o lugar",
  editable = true,
  showLocationButton = true,
  currentCoordinates = null,
}: LocationSearchInputProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const handleLocationSelect = useCallback(
    (address: string, coords: LocationCoordinates) => {
      onLocationSelect(address, coords);
      setModalOpen(false);
    },
    [onLocationSelect],
  );

  const handleMapLocationSelected = useCallback(
    async (coords: MapPickerCoords, address?: string) => {
      let resolvedAddress = address;
      if (!resolvedAddress) {
        try {
          if (Platform.OS === "web") {
            const data = await apiFetch<{ address?: string }>(
              `/api/places/reverse?lat=${coords.latitude}&lng=${coords.longitude}`,
            );
            resolvedAddress = data.address ?? undefined;
          } else {
            const results = await Location.reverseGeocodeAsync(coords);
            resolvedAddress = formatMapAddress(results[0]) ?? undefined;
          }
        } catch {
          resolvedAddress = undefined;
        }
      }

      // No inventar una dirección "de éxito": si la geocodificación inversa
      // falla, dejamos al usuario en el mapa para que ajuste el punto o
      // busque manualmente, en lugar de guardar coordenadas sin dirección real.
      if (!resolvedAddress) {
        Toast.show({
          type: "error",
          text1: "No se pudo resolver la ubicación",
          text2: "Ajusta el punto en el mapa o busca la dirección manualmente.",
        });
        setMapOpen(false);
        setModalOpen(true);
        return;
      }

      onLocationSelect(resolvedAddress, coords);
      setMapOpen(false);
    },
    [onLocationSelect],
  );

  return (
    <View>
      {/* Tappable display input */}
      <CustomInput
        placeholder={placeholder}
        value={value}
        onPress={editable ? () => setModalOpen(true) : undefined}
        rightElement={
          <View style={{ paddingRight: 12 }}>
            {currentCoordinates ? (
              <Ionicons name="checkmark-circle" size={20} color="#FFD54D" />
            ) : (
              <Ionicons name="chevron-forward" size={18} color="#999999" />
            )}
          </View>
        }
      />

      {/* Full-screen search modal */}
      <LocationSearchModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onLocationSelect={handleLocationSelect}
        onOpenMap={() => {
          setMapOpen(true);
          setModalOpen(false);
        }}
        showLocationButton={showLocationButton}
      />

      {/* Map picker (independent modal, avoids nesting) */}
      {Platform.OS === "web" ? (
        <MapLocationPickerWeb
          visible={mapOpen}
          initialLocation={currentCoordinates}
          onLocationSelect={handleMapLocationSelected}
          onClose={() => {
            setMapOpen(false);
            setModalOpen(true);
          }}
        />
      ) : (
        <MapLocationPicker
          visible={mapOpen}
          initialLocation={
            currentCoordinates
              ? {
                  latitude: currentCoordinates.latitude,
                  longitude: currentCoordinates.longitude,
                }
              : null
          }
          onLocationSelect={handleMapLocationSelected}
          onClose={() => {
            setMapOpen(false);
            setModalOpen(true);
          }}
        />
      )}
    </View>
  );
};
