import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, TextRegular, Title3Semibold } from '@/components/customElements/CustomText';
import { SkeletonBox } from '@/components/customElements/SkeletonBox';
import { DayInfo, DaySelector } from '@/components/trip/DaySelector';
import { MapComponent, PinState } from '@/components/trip/MapComponent';
import { useTripContext } from '@/context/TripContext';
import { useAddEventAsStop } from '@/hooks/useAddEventAsStop';
import { useStops } from '@/hooks/useItinerary';
import { useNearbyRouteEvents } from '@/hooks/useNearbyRouteEvents';
import { useTripPermissions } from '@/hooks/useTripPermissions';
import { TmEvent } from '@/services/eventService';
import { Ionicons } from '@expo/vector-icons';
import { Stop } from '@planmyroute/types';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, View } from 'react-native';

const EVENT_MARKER_PREFIX = 'event-';

export default function MapScreen() {
    const { tripId, currentTrip } = useTripContext();
    const currentTripId = tripId as string;
    const { stops, isLoading: stopsLoading } = useStops(currentTripId, { enabled: !!tripId });
    const { canAddStop } = useTripPermissions(currentTripId);

    const [selectedMapStop, setSelectedMapStop] = useState<Stop | null>(null);
    const [selectedMapEvent, setSelectedMapEvent] = useState<TmEvent | null>(null);
    const [eventsLayerVisible, setEventsLayerVisible] = useState(false);
    const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [localStops, setLocalStops] = useState<Stop[]>([]);
    const [returnRouteCoordinates, setReturnRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
    const [legFilter, setLegFilter] = useState<'all' | 'outbound' | 'return'>('all');

    const { addingEventId, addEventAsStop } = useAddEventAsStop(currentTripId);
    const { events: nearbyEvents, isLoading: loadingNearbyEvents } = useNearbyRouteEvents(
        localStops,
        (currentTrip as any)?.start_date,
        { enabled: eventsLayerVisible },
    );

    // Ordenar paradas por (day, type dentro del día, position)
    useEffect(() => {
        if (!stops) return;
        const typeOrder: Record<string, number> = { origen: 0, intermedia: 1, destino: 2 };
        const sorted = [...stops].sort((a, b) => {
            const dayA = (a as any).day ?? 1;
            const dayB = (b as any).day ?? 1;
            if (dayA !== dayB) return dayA - dayB;
            const tA = typeOrder[a.type] ?? 1;
            const tB = typeOrder[b.type] ?? 1;
            if (tA !== tB) return tA - tB;
            return ((a as any).position ?? a.order ?? 0) - ((b as any).position ?? b.order ?? 0);
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

    // Solo viajes con circular=true muestran el filtro ida/vuelta
    const isCircular = !!(currentTrip?.circular);

    // Punto de giro: día central derivado de las paradas reales
    const midDay = useMemo(() => {
        if (!isCircular) return null;
        const days = Array.from(dayGroups.keys());
        if (days.length === 0) return null;
        return Math.ceil(Math.max(...days) / 2);
    }, [isCircular, dayGroups]);

    // Paradas visibles según día y/o tramo seleccionado
    // La última parada de midDay es Gijón (creada por createCircularMidpointStop al final del día).
    // Es el pivot: fin de ida y comienzo de vuelta.
    const lastMidDayPos = useMemo(() => {
        if (!isCircular || midDay === null) return 0;
        const midDayStops = dayGroups.get(midDay) ?? [];
        return midDayStops.length > 0
            ? Math.max(...midDayStops.map(s => (s as any).position ?? 0))
            : 0;
    }, [isCircular, midDay, dayGroups]);

    const visibleStops = useMemo(() => {
        let base = selectedDay === null ? localStops : (dayGroups.get(selectedDay) ?? []);
        if (isCircular && midDay !== null && legFilter !== 'all' && selectedDay === null) {
            if (legFilter === 'outbound') {
                // Ida: origen → Gijón (todos los stops hasta el último de midDay)
                base = base.filter(s => ((s as any).day ?? 1) <= midDay);
            } else {
                // Vuelta: Gijón (último stop de midDay) → destino
                base = base.filter(s => {
                    const d = (s as any).day ?? 1;
                    const pos = (s as any).position ?? 0;
                    return d > midDay || (d === midDay && pos === lastMidDayPos);
                });
            }
        }
        return base;
    }, [localStops, selectedDay, dayGroups, isCircular, midDay, legFilter, lastMidDayPos]);

    // Al seleccionar un día concreto, resetear el filtro de tramo
    useEffect(() => {
        if (selectedDay !== null) setLegFilter('all');
    }, [selectedDay]);

    // Calcular ruta OSRM — dos tramos separados en viajes circulares
    const stopsKey = useMemo(() => visibleStops.map(s => s.id).join(','), [visibleStops]);

    useEffect(() => {
        const valid = visibleStops.filter(s => s.coordinates?.latitude && s.coordinates?.longitude);
        if (valid.length < 2) { setRouteCoordinates([]); setReturnRouteCoordinates([]); return; }
        let cancelled = false;

        const fetchRoute = async (stops: typeof valid) => {
            const coords = stops.map(s => `${s.coordinates.longitude},${s.coordinates.latitude}`).join(';');
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
            if (!res.ok) return [];
            const data = await res.json();
            return (data.routes?.[0]?.geometry?.coordinates ?? []).map((c: number[]) => ({
                latitude: c[1], longitude: c[0],
            }));
        };

        (async () => {
            try {
                if (isCircular && midDay !== null && selectedDay === null && legFilter === 'all') {
                    // Vista "Todo": dos polylines — ida (oscuro) y vuelta (azul)
                    const outbound = valid.filter(s => ((s as any).day ?? 1) <= midDay);
                    const lastPos = Math.max(0, ...valid
                        .filter(s => ((s as any).day ?? 1) === midDay)
                        .map(s => (s as any).position ?? 0));
                    const ret = valid.filter(s => {
                        const d = (s as any).day ?? 1;
                        const pos = (s as any).position ?? 0;
                        return d > midDay || (d === midDay && pos === lastPos);
                    });
                    const [outCoords, retCoords] = await Promise.all([
                        outbound.length >= 2 ? fetchRoute(outbound) : Promise.resolve([]),
                        ret.length >= 2      ? fetchRoute(ret)      : Promise.resolve([]),
                    ]);
                    if (cancelled) return;
                    setRouteCoordinates(outCoords);
                    setReturnRouteCoordinates(retCoords);
                } else {
                    // Filtro específico (ida o vuelta) o vista por día: una sola polyline
                    const coords = await fetchRoute(valid);
                    if (cancelled) return;
                    setRouteCoordinates(coords);
                    setReturnRouteCoordinates([]);
                }
            } catch {
                setRouteCoordinates([]);
                setReturnRouteCoordinates([]);
            }
        })();
        return () => { cancelled = true; };
    }, [stopsKey, isCircular, midDay, selectedDay, legFilter]);

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
    const stopMarkers = visibleStops
        .filter(s => s.coordinates?.latitude && s.coordinates?.longitude)
        .map((stop, index) => {
            const stopDay = (stop as any).day ?? 1;
            const leg = (() => {
                if (!isCircular || midDay === null || selectedDay !== null) return undefined;
                if (legFilter === 'outbound') return 'outbound' as const;
                if (legFilter === 'return') return 'return' as const;
                // Vista "Todo": color por día
                return (stopDay <= midDay ? 'outbound' : 'return') as 'outbound' | 'return';
            })();
            return {
                id: stop.id.toString(),
                coordinate: { latitude: stop.coordinates.latitude, longitude: stop.coordinates.longitude },
                title: stop.name,
                description: stop.address || '',
                number: index + 1,
                pinState: getPinState(stop),
                leg,
            };
        });

    const eventMarkers = eventsLayerVisible
        ? (nearbyEvents ?? [])
            .filter(e => e.venue?.coordinates?.lat && e.venue?.coordinates?.lng)
            .map(e => ({
                id: `${EVENT_MARKER_PREFIX}${e.id}`,
                coordinate: { latitude: e.venue!.coordinates!.lat, longitude: e.venue!.coordinates!.lng },
                title: e.name,
                description: e.venue?.city ?? '',
                segment: e.segment ?? undefined,
            }))
        : [];

    const markers = [...stopMarkers, ...eventMarkers];

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
                {/* Filtro de tramo — solo viajes circulares (ida y vuelta) */}
                {isCircular && selectedDay === null && (
                    <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
                        {(['all', 'outbound', 'return'] as const).map(f => {
                            const label = f === 'all' ? 'Todo' : f === 'outbound' ? '→ Ida' : '← Vuelta';
                            const active = legFilter === f;
                            return (
                                <Pressable
                                    key={f}
                                    onPress={() => setLegFilter(f)}
                                    style={({ pressed }) => ({
                                        paddingHorizontal: 14,
                                        paddingVertical: 6,
                                        borderRadius: 20,
                                        backgroundColor: active ? '#202020' : '#F5F5F5',
                                        borderWidth: 1,
                                        borderColor: active ? '#202020' : '#E0E0E0',
                                        opacity: pressed ? 0.75 : 1,
                                    })}
                                >
                                    <MicrotextDark style={{ color: active ? '#FFD54D' : '#666666', fontWeight: active ? '700' : '400' }}>
                                        {label}
                                    </MicrotextDark>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </View>

            {/* Mapa */}
            <View className="flex-1">
                <MapComponent
                    initialRegion={initialRegion}
                    markers={markers}
                    routeCoordinates={routeCoordinates}
                    returnRouteCoordinates={returnRouteCoordinates}
                    visitedUpToIndex={visitedUpToIndex}
                    onMarkerPress={(id) => {
                        if (id.startsWith(EVENT_MARKER_PREFIX)) {
                            const eventId = id.slice(EVENT_MARKER_PREFIX.length);
                            const event = (nearbyEvents ?? []).find(e => e.id === eventId) ?? null;
                            setSelectedMapEvent(event);
                            setSelectedMapStop(null);
                        } else {
                            const stop = visibleStops.find(s => s.id.toString() === id);
                            if (stop) {
                                setSelectedMapStop(stop);
                                setSelectedMapEvent(null);
                            }
                        }
                    }}
                />
                {/* Toggle capa de eventos */}
                <Pressable
                    onPress={() => {
                        setEventsLayerVisible(v => !v);
                        setSelectedMapEvent(null);
                    }}
                    style={({ pressed }) => ({
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: eventsLayerVisible ? '#FFD54D' : '#FFFFFF',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: pressed ? 0.15 : 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                        opacity: pressed ? 0.85 : 1,
                    })}
                >
                    {loadingNearbyEvents
                        ? <ActivityIndicator size="small" color={eventsLayerVisible ? '#202020' : '#999999'} />
                        : <Ionicons name="ticket-outline" size={15} color={eventsLayerVisible ? '#202020' : '#999999'} />
                    }
                    <MicrotextDark style={{ color: eventsLayerVisible ? '#202020' : '#999999' }}>
                        Eventos
                    </MicrotextDark>
                </Pressable>
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

            {/* Panel inferior: evento seleccionado */}
            {selectedMapEvent && (
                <View
                    className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-4 pb-6"
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 }}
                >
                    {/* Drag handle + cerrar */}
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="w-10 h-1 bg-neutral/30 rounded-full flex-1" />
                        <Pressable
                            className="w-8 h-8 rounded-full bg-neutral/10 items-center justify-center ml-3"
                            onPress={() => setSelectedMapEvent(null)}
                        >
                            <Ionicons name="close" size={16} color="#202020" />
                        </Pressable>
                    </View>

                    <Title3Semibold className="mb-2 pr-10" numberOfLines={2}>
                        {selectedMapEvent.name}
                    </Title3Semibold>

                    {(selectedMapEvent.date || selectedMapEvent.time) && (
                        <View className="flex-row items-center gap-2 mb-2">
                            <Ionicons name="calendar-outline" size={15} color="#999999" />
                            <TextRegular className="text-neutral">
                                {[selectedMapEvent.date, selectedMapEvent.time].filter(Boolean).join(' · ')}
                            </TextRegular>
                        </View>
                    )}

                    {selectedMapEvent.venue && (
                        <View className="flex-row items-start gap-2 mb-2">
                            <Ionicons name="location-outline" size={15} color="#999999" style={{ marginTop: 2 }} />
                            <TextRegular className="flex-1 text-neutral">
                                {[selectedMapEvent.venue.name, selectedMapEvent.venue.city].filter(Boolean).join(', ')}
                            </TextRegular>
                        </View>
                    )}

                    {selectedMapEvent.priceMin != null && (
                        <View className="flex-row items-center gap-2 mb-3">
                            <Ionicons name="pricetag-outline" size={15} color="#999999" />
                            <TextRegular className="text-neutral">
                                {`Desde ${selectedMapEvent.priceMin} ${selectedMapEvent.currency ?? '€'}`}
                            </TextRegular>
                        </View>
                    )}

                    {canAddStop && (
                        <CustomButton
                            title={addingEventId === selectedMapEvent.id ? 'Añadiendo…' : 'Añadir como parada'}
                            variant="dark"
                            size="large"
                            icon={<Ionicons name="add-circle-outline" size={18} color="#FFD54D" />}
                            onPress={async () => {
                                await addEventAsStop(selectedMapEvent, (currentTrip as any)?.start_date);
                                setSelectedMapEvent(null);
                            }}
                        />
                    )}
                </View>
            )}
        </View>
    );
}
