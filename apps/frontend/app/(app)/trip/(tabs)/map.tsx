import { MapComponent } from '@/components/trip/MapComponent';
import { useTripContext } from '@/context/TripContext';
import { useStops } from '@/hooks/useItinerary';
import { Ionicons } from '@expo/vector-icons';
import { Stop } from '@planmyroute/types';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function MapScreen() {
    const { tripId } = useTripContext();

    // Hooks para datos
    const { stops, isLoading: stopsLoading } = useStops(
        tripId as string,
        { enabled: !!tripId }
    );

    // Estado para la parada seleccionada en el mapa
    const [selectedMapStop, setSelectedMapStop] = useState<Stop | null>(null);

    // Estados del mapa - Calculamos las coordenadas de ruta cuando hay cambios en stops
    const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);

    // Estado local para las paradas ordenables
    const [localStops, setLocalStops] = useState<Stop[]>([]);

    // Sincronizar las paradas del servidor con el estado local y ordenarlas
    useEffect(() => {
        if (stops) {
            // Ordenar las paradas según el tipo y la fecha
            const sortedStops = [...stops].sort((a, b) => {
                // 1. Primero por tipo: origen -> intermedia -> destino
                const typeOrder = { 'origen': 0, 'intermedia': 1, 'destino': 2 };
                const typeA = typeOrder[a.type] ?? 1;
                const typeB = typeOrder[b.type] ?? 1;

                if (typeA !== typeB) {
                    return typeA - typeB;
                }

                // 2. Si son del mismo tipo, ordenar por fecha de llegada estimada
                if (a.estimated_arrival && b.estimated_arrival) {
                    return new Date(a.estimated_arrival).getTime() - new Date(b.estimated_arrival).getTime();
                }

                // 3. Si no tienen fecha, ordenar por el campo 'order'
                return a.order - b.order;
            });

            setLocalStops(sortedStops);
        }
    }, [stops]);

    // Crear una cadena estable de IDs de paradas para detectar cambios reales
    const stopsKey = useMemo(() => {
        return localStops?.map(s => s.id).join(',') || '';
    }, [localStops]);

    // Calcular ruta solo cuando realmente cambian las paradas
    useEffect(() => {
        if (!localStops || localStops.length < 2) {
            setRouteCoordinates([]);
            return;
        }

        const calculateRoute = async () => {
            try {
                // Filtrar paradas que no tengan coordenadas válidas
                const validStops = localStops.filter(
                    stop => stop.coordinates && stop.coordinates.latitude && stop.coordinates.longitude
                );

                if (validStops.length < 2) {
                    setRouteCoordinates([]);
                    return;
                }

                const coordinates = validStops.map((stop) => ({
                    latitude: stop.coordinates.latitude,
                    longitude: stop.coordinates.longitude,
                }));

                const coordsString = coordinates
                    .map((coord) => `${coord.longitude},${coord.latitude}`)
                    .join(';');

                const response = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.routes && data.routes[0]) {
                        const routeData = data.routes[0].geometry.coordinates.map((coord: number[]) => ({
                            latitude: coord[1],
                            longitude: coord[0],
                        }));
                        setRouteCoordinates(routeData);
                    } else {
                        setRouteCoordinates([]);
                    }
                } else {
                    setRouteCoordinates([]);
                }
            } catch (error) {
                console.error('Error calculating route:', error);
                setRouteCoordinates([]);
            }
        };

        calculateRoute();
    }, [stopsKey]);

    // Función para abrir Google Maps con las direcciones a una parada
    const openGoogleMaps = (stop: Stop) => {
        if (!stop.coordinates) {
            Alert.alert('Error', 'Esta parada no tiene coordenadas');
            return;
        }

        const { latitude, longitude } = stop.coordinates;
        const label = encodeURIComponent(stop.name);

        const scheme = Platform.select({
            ios: 'maps:',
            android: 'geo:',
        });

        const url = Platform.select({
            ios: `${scheme}?q=${label}&ll=${latitude},${longitude}`,
            android: `${scheme}${latitude},${longitude}?q=${label}`,
        });

        if (url) {
            Linking.openURL(url).catch(() => {
                // Fallback a Google Maps web
                const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
                Linking.openURL(webUrl);
            });
        }
    };

    // Calcular región inicial del mapa basada en las paradas o usar ubicación por defecto
    const firstStopWithCoords = localStops?.find(
        stop => stop.coordinates && stop.coordinates.latitude && stop.coordinates.longitude
    );

    const initialRegion = firstStopWithCoords
        ? {
            latitude: firstStopWithCoords.coordinates.latitude,
            longitude: firstStopWithCoords.coordinates.longitude,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
        }
        : {
            latitude: 40.4168,
            longitude: -3.7038,
            latitudeDelta: 10,
            longitudeDelta: 10,
        };

    // Preparar marcadores para el mapa - solo paradas con coordenadas válidas
    const markers =
        localStops
            ?.filter(stop => stop.coordinates && stop.coordinates.latitude && stop.coordinates.longitude)
            .map((stop, index) => ({
                id: stop.id.toString(),
                coordinate: {
                    latitude: stop.coordinates.latitude,
                    longitude: stop.coordinates.longitude,
                },
                title: stop.name,
                description: stop.address || '',
                number: index + 1,
                onPress: () => setSelectedMapStop(stop),
            })) || [];

    if (stopsLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50">
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-50">
            <MapComponent
                initialRegion={initialRegion}
                markers={markers}
                routeCoordinates={routeCoordinates}
            />

            {/* Desplegable de información de parada seleccionada */}
            {selectedMapStop && (
                <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5">
                    <TouchableOpacity
                        onPress={() => setSelectedMapStop(null)}
                        className="absolute top-3 right-3 bg-gray-200 p-2 rounded-full"
                    >
                        <Ionicons name="close" size={20} color="#374151" />
                    </TouchableOpacity>

                    <Text className="text-2xl font-bold text-gray-800 mb-3 pr-10">
                        {selectedMapStop.name}
                    </Text>

                    {selectedMapStop.address && (
                        <View className="flex-row items-start gap-2 mb-3">
                            <Ionicons name="location" size={18} color="#6B7280" />
                            <Text className="flex-1 text-gray-700">{selectedMapStop.address}</Text>
                        </View>
                    )}

                    {selectedMapStop.description && (
                        <View className="flex-row items-start gap-2 mb-4">
                            <Ionicons name="information-circle" size={18} color="#6B7280" />
                            <Text className="flex-1 text-gray-600">{selectedMapStop.description}</Text>
                        </View>
                    )}

                    {selectedMapStop.coordinates && (
                        <TouchableOpacity
                            onPress={() => openGoogleMaps(selectedMapStop)}
                            className="bg-indigo-600 py-3 rounded-xl flex-row items-center justify-center gap-2"
                        >
                            <Ionicons name="navigate" size={18} color="#FFF" />
                            <Text className="text-white font-semibold">Cómo llegar</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}
