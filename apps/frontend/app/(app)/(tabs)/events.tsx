import { TmEvent } from '@/services/eventService';
import { ROUTES } from '@/constants/routes';
import { useEvents } from '@/hooks/useEvents';
import { formatShortDate } from '@/utils/formatDate';
import { EmptyState } from '@/components/customElements/EmptyState';
import { LoadingView } from '@/components/customElements/LoadingView';
import { MapComponent, MapRef } from '@/components/trip/MapComponent';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const COUNTRY_OPTIONS = [
    { code: '', label: 'Global' },
    { code: 'ES', label: 'España' },
    { code: 'US', label: 'EE.UU.' },
    { code: 'GB', label: 'UK' },
    { code: 'DE', label: 'Alemania' },
    { code: 'FR', label: 'Francia' },
];


function formatPrice(min: number | null, max: number | null, currency: string | null) {
    if (min == null) return 'Precio a consultar';
    const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    if (max && max !== min) return `${sym}${min} – ${sym}${max}`;
    return `${sym}${min}`;
}

function EventCard({ event }: { event: TmEvent }) {
    const router = useRouter();
    const artist = event.artists[0];

    return (
        <TouchableOpacity
            className="mx-4 mb-4 rounded-2xl overflow-hidden bg-white shadow-sm"
            style={{ elevation: 2 }}
            activeOpacity={0.85}
            onPress={() => router.push(ROUTES.event(event.id, event.dates))}
        >
            <View className="relative">
                {event.image ? (
                    <Image
                        source={{ uri: event.image }}
                        className="w-full"
                        style={{ height: 180 }}
                        resizeMode="cover"
                    />
                ) : (
                    <View className="w-full bg-gray-200 items-center justify-center" style={{ height: 180 }}>
                        <Ionicons name="musical-notes" size={48} color="#999" />
                    </View>
                )}
                {event.segment && (
                    <View className="absolute top-3 left-3 bg-primary-yellow px-2 py-0.5 rounded-full">
                        <Text className="text-dark-black text-xs font-bold uppercase">{event.segment}</Text>
                    </View>
                )}
            </View>

            <View className="p-4">
                <Text className="text-dark-black font-bold text-base" numberOfLines={2}>
                    {event.name}
                </Text>
                {artist && (
                    <Text className="text-gray-500 text-sm mt-0.5" numberOfLines={1}>
                        {artist.name}
                    </Text>
                )}

                <View className="flex-row items-center mt-3 gap-x-4">
                    {event.dates?.length > 1 ? (
                        <View className="flex-row items-center gap-x-1">
                            <Ionicons name="calendar-outline" size={14} color="#555" />
                            <Text className="text-gray-600 text-sm">{event.dates.length} fechas</Text>
                        </View>
                    ) : event.date ? (
                        <View className="flex-row items-center gap-x-1">
                            <Ionicons name="calendar-outline" size={14} color="#555" />
                            <Text className="text-gray-600 text-sm">{formatShortDate(event.date)}</Text>
                        </View>
                    ) : null}
                    {event.venue?.city && (
                        <View className="flex-row items-center gap-x-1">
                            <Ionicons name="location-outline" size={14} color="#555" />
                            <Text className="text-gray-600 text-sm" numberOfLines={1}>
                                {event.venue.city}
                                {event.venue.country ? `, ${event.venue.country}` : ''}
                            </Text>
                        </View>
                    )}
                </View>

                <View className="flex-row items-center justify-between mt-3">
                    <Text className="text-dark-black font-semibold text-sm">
                        {formatPrice(event.priceMin, event.priceMax, event.currency)}
                    </Text>
                    <View className="bg-primary-yellow px-3 py-1 rounded-full">
                        <Text className="text-dark-black text-xs font-bold">Ver evento</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// Compact bottom-sheet popup shown when tapping a map pin
function EventMapPreview({ event, onClose, onNavigate }: {
    event: TmEvent;
    onClose: () => void;
    onNavigate: () => void;
}) {
    return (
        <View
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl"
            style={{ elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12 }}
        >
            {/* Drag handle */}
            <View className="w-10 h-1 bg-gray-300 rounded-full self-center mt-3 mb-3" />

            <View className="flex-row px-4 pb-5 gap-x-3">
                {event.image ? (
                    <Image
                        source={{ uri: event.image }}
                        className="rounded-xl"
                        style={{ width: 80, height: 80 }}
                        resizeMode="cover"
                    />
                ) : (
                    <View className="rounded-xl bg-gray-100 items-center justify-center" style={{ width: 80, height: 80 }}>
                        <Ionicons name="musical-notes" size={28} color="#aaa" />
                    </View>
                )}

                <View className="flex-1">
                    <Text className="text-dark-black font-bold text-sm leading-5" numberOfLines={2}>
                        {event.name}
                    </Text>
                    {event.segment && (
                        <Text className="text-xs text-gray-400 mt-0.5">{event.segment}</Text>
                    )}
                    {(event.dates?.length > 1 ? (
                        <Text className="text-xs text-gray-500 mt-1">{event.dates.length} fechas disponibles</Text>
                    ) : event.date ? (
                        <Text className="text-xs text-gray-500 mt-1">{formatShortDate(event.date)}</Text>
                    ) : null)}
                    {event.venue?.city && (
                        <Text className="text-xs text-gray-500" numberOfLines={1}>
                            {event.venue.city}{event.venue.country ? `, ${event.venue.country}` : ''}
                        </Text>
                    )}

                    <TouchableOpacity
                        className="mt-2.5 bg-dark-black rounded-xl py-2 items-center"
                        onPress={onNavigate}
                        activeOpacity={0.85}
                    >
                        <Text className="text-primary-yellow font-bold text-xs">Ver evento</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    className="absolute top-0 right-4 w-7 h-7 bg-gray-100 rounded-full items-center justify-center"
                    onPress={onClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="close" size={14} color="#555" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function EventsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const mapRef = useRef<MapRef>(null);

    const [keyword, setKeyword] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [countryCode, setCountryCode] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        })();
    }, []);

    // When Global mode (no country filter), pass user coords so Ticketmaster returns nearby events
    const geoParams = !countryCode && userLocation
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : {};

    const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, isError } =
        useEvents({ countryCode, keyword, ...geoParams });

    const allEvents = data?.pages.flatMap((p) => p.events).filter((event, index, self) =>
        self.findIndex(e => e.id === event.id) === index
    ) ?? [];

    const selectedEvent = selectedEventId ? allEvents.find(e => e.id === selectedEventId) ?? null : null;

    const handleMarkerPress = useCallback((eventId: string) => {
        setSelectedEventId(eventId);
    }, []);

    const handleNavigateToEvent = useCallback((event: TmEvent) => {
        setSelectedEventId(null);
        router.push(ROUTES.event(event.id, event.dates));
    }, [router]);

    const markers = allEvents.map((event, index) => ({
        id: event.id,
        coordinate: {
            latitude: event.venue?.coordinates?.lat || 0,
            longitude: event.venue?.coordinates?.lng || 0,
        },
        title: event.name,
        description: event.venue?.city
            ? `${event.venue.city}${event.dates?.length > 1 ? ` · ${event.dates.length} fechas` : event.date ? ` · ${event.date}` : ''}`
            : '',
        number: index + 1,
        segment: event.segment ?? undefined,
    })).filter(marker => marker.coordinate.latitude !== 0 && marker.coordinate.longitude !== 0);

    const initialRegion = userLocation
        ? {
              latitude: userLocation.lat,
              longitude: userLocation.lng,
              latitudeDelta: 5,
              longitudeDelta: 5,
          }
        : allEvents[0]?.venue?.coordinates
        ? {
              latitude: allEvents[0].venue!.coordinates!.lat,
              longitude: allEvents[0].venue!.coordinates!.lng,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
          }
        : {
              latitude: 40.4168,
              longitude: -3.7038,
              latitudeDelta: 10,
              longitudeDelta: 10,
          };

    const handleSearch = useCallback(() => {
        setKeyword(searchInput.trim());
    }, [searchInput]);

    const renderFooter = () => {
        if (!isFetchingNextPage) return null;
        return (
            <View className="py-4 items-center">
                <ActivityIndicator color="#FFD54D" />
            </View>
        );
    };

    return (
        <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className="px-4 pt-4 pb-2 bg-white">
                <Text className="text-2xl font-bold text-dark-black">Eventos</Text>
                <Text className="text-gray-500 text-sm mt-0.5">
                    Festivales y conciertos destacados
                </Text>

                {/* Buscador */}
                <View className="flex-row mt-3 gap-x-2">
                    <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
                        <Ionicons name="search" size={18} color="#888" />
                        <TextInput
                            className="flex-1 ml-2 text-sm text-dark-black"
                            placeholder="Artista, festival…"
                            placeholderTextColor="#aaa"
                            value={searchInput}
                            onChangeText={setSearchInput}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                        {searchInput.length > 0 && (
                            <TouchableOpacity onPress={() => { setSearchInput(''); setKeyword(''); }}>
                                <Ionicons name="close-circle" size={18} color="#aaa" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        className="bg-primary-yellow rounded-xl px-4 items-center justify-center"
                        onPress={handleSearch}
                    >
                        <Text className="font-bold text-dark-black text-sm">Buscar</Text>
                    </TouchableOpacity>
                </View>

                {/* Filtro país */}
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={COUNTRY_OPTIONS}
                    keyExtractor={(item) => item.code}
                    className="mt-3 -mx-1"
                    contentContainerStyle={{ paddingHorizontal: 4 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => setCountryCode(item.code)}
                            className={`mr-2 px-3 py-1 rounded-full border ${
                                countryCode === item.code
                                    ? 'bg-dark-black border-dark-black'
                                    : 'bg-white border-gray-300'
                            }`}
                        >
                            <Text
                                className={`text-xs font-semibold ${
                                    countryCode === item.code ? 'text-primary-yellow' : 'text-gray-600'
                                }`}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Toggle vista */}
            <View className="flex-row bg-white px-4 pb-2">
                <TouchableOpacity
                    className={`flex-1 py-2 rounded-lg mr-2 ${viewMode === 'list' ? 'bg-primary-yellow' : 'bg-gray-100'}`}
                    onPress={() => setViewMode('list')}
                >
                    <Text className={`text-center text-sm font-medium ${viewMode === 'list' ? 'text-dark-black' : 'text-gray-600'}`}>
                        Lista
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 py-2 rounded-lg ml-2 ${viewMode === 'map' ? 'bg-primary-yellow' : 'bg-gray-100'}`}
                    onPress={() => setViewMode('map')}
                >
                    <Text className={`text-center text-sm font-medium ${viewMode === 'map' ? 'text-dark-black' : 'text-gray-600'}`}>
                        Mapa
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Contenido */}
            {viewMode === 'list' ? (
                <>
                    {isLoading ? (
                        <LoadingView message="Cargando eventos…" />
                    ) : isError ? (
                        <EmptyState
                            icon="alert-circle-outline"
                            iconSize={48}
                            iconColor="#ccc"
                            title="No se pudieron cargar los eventos. Comprueba tu conexión."
                        />
                    ) : allEvents.length === 0 ? (
                        <EmptyState
                            icon="search-outline"
                            iconSize={48}
                            iconColor="#ccc"
                            title="No hay eventos que coincidan con tu búsqueda."
                        />
                    ) : (
                        <FlatList
                            data={allEvents}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => <EventCard event={item} />}
                            contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 16 }}
                            ListFooterComponent={renderFooter}
                            onEndReached={() => hasNextPage && fetchNextPage()}
                            onEndReachedThreshold={0.4}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </>
            ) : (
                // Map view with locate-me button overlay and event preview popup
                <View className="flex-1">
                    <MapComponent
                        ref={mapRef}
                        initialRegion={initialRegion}
                        markers={markers}
                        onMarkerPress={handleMarkerPress}
                        userLocation={userLocation}
                    />

                    {/* Locate-me floating button */}
                    {userLocation && (
                        <TouchableOpacity
                            className="absolute bottom-6 right-4 w-11 h-11 bg-white rounded-full items-center justify-center"
                            style={{ elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }}
                            onPress={() => mapRef.current?.recenterTo(userLocation.lat, userLocation.lng)}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="locate" size={20} color="#202020" />
                        </TouchableOpacity>
                    )}

                    {/* Event preview popup */}
                    {selectedEvent && (
                        <EventMapPreview
                            event={selectedEvent}
                            onClose={() => setSelectedEventId(null)}
                            onNavigate={() => handleNavigateToEvent(selectedEvent)}
                        />
                    )}
                </View>
            )}
        </View>
    );
}
