import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, TextRegular, Title3Semibold } from '@/components/customElements/CustomText';
import { SkeletonBox } from '@/components/customElements/SkeletonBox';
import { DayInfo, DaySelector } from '@/components/trip/DaySelector';
import { MapComponent, PinState } from '@/components/trip/MapComponent';
import { useTripContext } from '@/context/TripContext';
import { useStops } from '@/hooks/useItinerary';
import { Ionicons } from '@expo/vector-icons';
import { Stop } from '@planmyroute/types';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, View } from 'react-native';

export default function MapScreen() {
    const { tripId, currentTrip } = useTripContext();
    const { stops, isLoading: stopsLoading } = useStops(tripId as string, { enabled: !!tripId });

    const [selectedMapStop, setSelectedMapStop] = useState<Stop | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [localStops, setLocalStops] = useState<Stop[]>([]);

    // Ordenar paradas
    useEffect(() => {
        if (!stops) return;
        const sorted = [...stops].sort((a, b) => {
            const typeOrder: Record<string, number> = { origen: 0, intermedia: 1, destino: 2 };
            const diff = (typeOrder[a.type] ?? 1) - (typeOrder[b.type] ?? 1);
            if (diff !== 0) return diff;
            if (a.estimated_arrival && b.estimated_arrival) {
                return new Date(a.estimated_arrival).getTime() - new Date(b.estimated_arrival).getTime();
            }
            return a.order - b.order;
        });
        setLocalStops(sorted);
    }, [stops]);

    // Auto-seleccionar día actual si el viaje está en marcha
    useEffect(() => {
        if (currentTrip?.status === 'going' && currentTrip?.start_date) {
            const start = new Date(currentTrip.start_date);
            const today = new Date();
            start.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            const currentDay = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);
            setSelectedDay(currentDay);
        }
    }, [currentTrip?.status, currentTrip?.start_date]);

    // Agrupar por días
    const dayGroups = useMemo(() => {
        if (!localStops.length) return new Map<number, Stop[]>();
        const map = new Map<number, Stop[]>();
        localStops.forEach(s => {
            const d = (s as any).day ?? 1;
            if (!map.has(d)) map.set(d, []);
            map.get(d)!.push(s);
        });
        return map;
    }, [localStops]);

    // Paradas visibles según día seleccionado
    const visibleStops = useMemo(() => {
        if (selectedDay === null) return localStops;
        return dayGroups.get(selectedDay) ?? [];
    }, [localStops, selectedDay, dayGroups]);

    // Calcular ruta para paradas visibles
    const stopsKey = useMemo(() => visibleStops.map(s => s.id).join(','), [visibleStops]);

    useEffect(() => {
        const valid = visibleStops.filter(s => s.coordinates?.latitude && s.coordinates?.longitude);
        if (valid.length < 2) { setRouteCoordinates([]); return; }
        let cancelled = false;
        (async () => {
            try {
                const coords = valid.map(s => `${s.coordinates.longitude},${s.coordinates.latitude}`).join(';');
                const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
                if (!res.ok || cancelled) return;
                const data = await res.json();
                const route = data.routes?.[0];
                if (route?.geometry?.coordinates) {
                    setRouteCoordinates(route.geometry.coordinates.map((c: number[]) => ({
                        latitude: c[1], longitude: c[0],
                    })));
                }
            } catch { setRouteCoordinates([]); }
        })();
        return () => { cancelled = true; };
    }, [stopsKey]);

    // Determinar estado de cada pin
    const now = new Date();
    let foundNext = false;

    function getPinState(stop: Stop): PinState {
        if (currentTrip?.status !== 'going') return 'standard';
        if (stop.estimated_arrival) {
            const arrival = new Date(stop.estimated_arrival);
            if (arrival < now) return 'visited';
            if (!foundNext) {
                foundNext = true;
                return 'next';
            }
            return 'future';
        }
        return 'standard';
    }

    // Índice hasta el que la ruta está recorrida (para split polyline)
    const visitedUpToIndex = useMemo(() => {
        if (currentTrip?.status !== 'going') return undefined;
        const visitedCount = visibleStops.filter(
            s => s.estimated_arrival && new Date(s.estimated_arrival) < now
        ).length;
        if (visitedCount === 0) return undefined;
        // Aproximar el punto de corte en la polyline proporcionalmente
        if (!routeCoordinates.length || !visibleStops.length) return undefined;
        return Math.round((visitedCount / visibleStops.length) * routeCoordinates.length);
    }, [visibleStops, routeCoordinates, currentTrip?.status]);

    // Días para el selector
    const dayInfos = useMemo((): DayInfo[] => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Array.from(dayGroups.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([day, group]) => {
                let groupDate = new Date();
                if (currentTrip?.start_date) {
                    const start = new Date(currentTrip.start_date);
                    start.setHours(0, 0, 0, 0);
                    start.setDate(start.getDate() + (day - 1));
                    groupDate = start;
                }
                return {
                    day,
                    stopCount: group.length,
                    isToday: groupDate.getTime() === today.getTime(),
                    isPast: groupDate < today,
                };
            });
    }, [dayGroups, currentTrip?.start_date]);

    // Marcadores para el mapa
    foundNext = false; // reset antes de calcular markers
    const markers = visibleStops
        .filter(s => s.coordinates?.latitude && s.coordinates?.longitude)
        .map((stop, index) => ({
            id: stop.id.toString(),
            coordinate: { latitude: stop.coordinates.latitude, longitude: stop.coordinates.longitude },
            title: stop.name,
            description: stop.address || '',
            number: index + 1,
            pinState: getPinState(stop),
            onPress: () => setSelectedMapStop(stop),
        }));

    const firstStop = visibleStops.find(s => s.coordinates?.latitude && s.coordinates?.longitude);
    const initialRegion = firstStop
        ? { latitude: firstStop.coordinates.latitude, longitude: firstStop.coordinates.longitude, latitudeDelta: 0.5, longitudeDelta: 0.5 }
        : { latitude: 40.4168, longitude: -3.7038, latitudeDelta: 10, longitudeDelta: 10 };

    const openGoogleMaps = (stop: Stop) => {
        if (!stop.coordinates) return;
        const { latitude, longitude } = stop.coordinates;
        const label = encodeURIComponent(stop.name);
        const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
        const url = Platform.select({
            ios: `${scheme}?q=${label}&ll=${latitude},${longitude}`,
            android: `${scheme}${latitude},${longitude}?q=${label}`,
        });
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        if (url) Linking.openURL(url).catch(() => Linking.openURL(webUrl));
        else Linking.openURL(webUrl);
    };

    if (stopsLoading) {
        return (
            <View className="flex-1 bg-white">
                <View className="px-4 py-2">
                    <SkeletonBox height={36} style={{ width: '100%' }} borderRadius={18} />
                </View>
                <SkeletonBox style={{ flex: 1 }} borderRadius={0} />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            {/* Selector de días */}
            <View className="bg-white/95 border-b border-neutral/10">
                <DaySelector
                    days={dayInfos}
                    selectedDay={selectedDay}
                    onSelect={setSelectedDay}
                    totalStops={localStops.length}
                />
            </View>

            {/* Mapa */}
            <View className="flex-1">
                <MapComponent
                    initialRegion={initialRegion}
                    markers={markers}
                    routeCoordinates={routeCoordinates}
                    visitedUpToIndex={visitedUpToIndex}
                    onMarkerPress={(id) => {
                        const stop = visibleStops.find(s => s.id.toString() === id);
                        if (stop) setSelectedMapStop(stop);
                    }}
                />
            </View>

            {/* Panel inferior: parada seleccionada */}
            {selectedMapStop && (
                <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-4 pb-6"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 }}
                >
                    {/* Drag handle + cerrar */}
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="w-10 h-1 bg-neutral/30 rounded-full flex-1" />
                        <View
                            className="w-8 h-8 rounded-full bg-neutral/10 items-center justify-center ml-3"
                            onTouchEnd={() => setSelectedMapStop(null)}
                        >
                            <Ionicons name="close" size={16} color="#202020" />
                        </View>
                    </View>

                    <Title3Semibold className="mb-2 pr-10" numberOfLines={2}>
                        {selectedMapStop.name}
                    </Title3Semibold>

                    {selectedMapStop.address && (
                        <View className="flex-row items-start gap-2 mb-2">
                            <Ionicons name="location-outline" size={15} color="#999999" style={{ marginTop: 2 }} />
                            <TextRegular className="flex-1 text-neutral">{selectedMapStop.address}</TextRegular>
                        </View>
                    )}

                    {selectedMapStop.description && (
                        <View className="flex-row items-start gap-2 mb-3">
                            <Ionicons name="information-circle-outline" size={15} color="#999999" style={{ marginTop: 2 }} />
                            <TextRegular className="flex-1 text-neutral" numberOfLines={3} style={{ fontStyle: 'italic' }}>
                                {selectedMapStop.description}
                            </TextRegular>
                        </View>
                    )}

                    {selectedMapStop.estimated_arrival && (
                        <View className="flex-row items-center gap-2 mb-4">
                            <Ionicons name="time-outline" size={15} color="#999999" />
                            <MicrotextDark className="text-neutral">
                                {new Date(selectedMapStop.estimated_arrival).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </MicrotextDark>
                        </View>
                    )}

                    <CustomButton
                        title="Cómo llegar"
                        variant="dark"
                        size="large"
                        icon={<Ionicons name="navigate-outline" size={18} color="#FFD54D" />}
                        onPress={() => openGoogleMaps(selectedMapStop)}
                    />
                </View>
            )}
        </View>
    );
}
