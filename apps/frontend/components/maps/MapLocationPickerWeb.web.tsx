import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, SubtitleSemibold } from '@/components/customElements/CustomText';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, TouchableOpacity, View } from 'react-native';
import type { MapPickerCoords } from './MapLocationPicker';

import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function getApiBaseUrl(): string {
    return process.env.EXPO_PUBLIC_API_URL
        || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
}

function MapMoveHandler({ onMove }: { onMove: (lat: number, lng: number) => void }) {
    useMapEvents({
        moveend(e) {
            const center = e.target.getCenter();
            onMove(center.lat, center.lng);
        },
    });
    return null;
}

type Props = {
    visible: boolean;
    initialLocation?: MapPickerCoords | null;
    onLocationSelect: (coords: MapPickerCoords, address?: string) => void;
    onClose: () => void;
};

export function MapLocationPickerWeb({ visible, initialLocation, onLocationSelect, onClose }: Props) {
    const [coords, setCoords] = useState<MapPickerCoords>({
        latitude: initialLocation?.latitude ?? 40.4168,
        longitude: initialLocation?.longitude ?? -3.7038,
    });
    const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
    const [geoLoading, setGeoLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMove = (lat: number, lng: number) => {
        setCoords({ latitude: lat, longitude: lng });
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setGeoLoading(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`${getApiBaseUrl()}/api/places/reverse?lat=${lat}&lng=${lng}`);
                const data = await res.json();
                setResolvedAddress(data.address ?? null);
            } catch {
                setResolvedAddress(null);
            } finally {
                setGeoLoading(false);
            }
        }, 600);
    };

    const handleConfirm = () => {
        onLocationSelect(coords, resolvedAddress ?? undefined);
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                {/* Header */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
                    borderBottomWidth: 1, borderBottomColor: 'rgba(153,153,153,0.15)',
                }}>
                    <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ padding: 4 }}>
                        <Ionicons name="close" size={24} color="#202020" />
                    </TouchableOpacity>
                    <SubtitleSemibold>Elige en el mapa</SubtitleSemibold>
                    <View style={{ width: 32 }} />
                </View>

                {/* Map with fixed crosshair */}
                <View style={{ flex: 1, position: 'relative' }}>
                    <MapContainer
                        center={[coords.latitude, coords.longitude]}
                        zoom={initialLocation ? 14 : 5}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={true}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        <MapMoveHandler onMove={handleMove} />
                    </MapContainer>

                    {/* Fixed crosshair pin */}
                    <View style={{
                        position: 'absolute',
                        left: '50%' as any,
                        top: '50%' as any,
                        transform: [{ translateX: -14 }, { translateY: -38 }],
                        zIndex: 1000,
                        pointerEvents: 'none' as any,
                    }}>
                        <img
                            src="data:image/svg+xml,%3Csvg viewBox='0 0 28 40' width='28' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14 0C6.3 0 0 6.3 0 14C0 24.5 14 40 14 40C14 40 28 24.5 28 14C28 6.3 21.7 0 14 0Z' fill='%23FFD54D' stroke='%23fff' stroke-width='2.5'/%3E%3Ccircle cx='14' cy='13' r='5.5' fill='rgba(0,0,0,0.18)'/%3E%3C/svg%3E"
                            alt=""
                            style={{ display: 'block' } as any}
                        />
                    </View>
                </View>

                {/* Bottom panel */}
                <View style={{
                    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28,
                    backgroundColor: '#fff',
                    borderTopWidth: 1, borderTopColor: 'rgba(153,153,153,0.1)',
                    gap: 10,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 20 }}>
                        {geoLoading
                            ? <ActivityIndicator size="small" color="#FFD54D" />
                            : <Ionicons name="location" size={16} color="#FFD54D" />
                        }
                        <MicrotextDark style={{ flex: 1, color: geoLoading ? '#999999' : '#202020' }}>
                            {geoLoading
                                ? 'Localizando...'
                                : (resolvedAddress ?? 'Mueve el mapa para seleccionar la ubicación')}
                        </MicrotextDark>
                    </View>
                    <CustomButton
                        variant="primary"
                        title="Confirmar ubicación"
                        onPress={handleConfirm}
                    />
                </View>
            </View>
        </Modal>
    );
}
