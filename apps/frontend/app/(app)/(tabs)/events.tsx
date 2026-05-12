import { TmEvent } from '@/services/eventService';
import { useEvents } from '@/hooks/useEvents';
import { MapComponent } from '@/components/trip/MapComponent';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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

function formatDate(date: string | null) {
    if (!date) return '';
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

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
            onPress={() => router.push(`/event/${event.id}`)}
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
                {/* Badge segmento */}
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
                    {event.date && (
                        <View className="flex-row items-center gap-x-1">
                            <Ionicons name="calendar-outline" size={14} color="#555" />
                            <Text className="text-gray-600 text-sm">{formatDate(event.date)}</Text>
                        </View>
                    )}
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

export default function EventsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [keyword, setKeyword] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [countryCode, setCountryCode] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, isError } =
        useEvents({ countryCode, keyword });

    const allEvents = data?.pages.flatMap((p) => p.events).filter((event, index, self) => 
        self.findIndex(e => e.id === event.id) === index
    ) ?? [];

    const handleMarkerPress = useCallback((eventId: string) => {
        router.push(`/event/${eventId}`);
    }, [router]);

    const markers = allEvents.map((event, index) => ({
        id: event.id,
        coordinate: {
            latitude: event.venue?.coordinates?.lat || 0,
            longitude: event.venue?.coordinates?.lng || 0,
        },
        title: event.name,
        description: event.venue?.name || '',
        number: index + 1,
    })).filter(marker => marker.coordinate.latitude !== 0 && marker.coordinate.longitude !== 0);

    const initialRegion = allEvents.length > 0 ? {
        latitude: allEvents[0].venue?.coordinates?.lat || 40.4168,
        longitude: allEvents[0].venue?.coordinates?.lng || -3.7038,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    } : {
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
                    {/* Lista */}
                    {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#FFD54D" />
                    <Text className="text-gray-500 mt-3">Cargando eventos…</Text>
                </View>
            ) : isError ? (
                <View className="flex-1 items-center justify-center px-8">
                    <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
                    <Text className="text-gray-500 text-center mt-3">
                        No se pudieron cargar los eventos. Comprueba tu conexión.
                    </Text>
                </View>
            ) : allEvents.length === 0 ? (
                <View className="flex-1 items-center justify-center px-8">
                    <Ionicons name="search-outline" size={48} color="#ccc" />
                    <Text className="text-gray-500 text-center mt-3">
                        No hay eventos que coincidan con tu búsqueda.
                    </Text>
                </View>
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
                <MapComponent
                    initialRegion={initialRegion}
                    markers={markers}
                    onMarkerPress={handleMarkerPress}
                />
            )}
        </View>
    );
}
