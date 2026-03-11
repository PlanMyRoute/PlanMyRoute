import { AttachmentsModal } from '@/components/modals/AttachmentsModal';
import { TripStatusBanner } from '@/components/trip/TripStatusBadge';
import { useTripContext } from '@/context/TripContext';
import { useDeleteStop, useStops } from '@/hooks/useItinerary';
import { useStopPrice } from '@/hooks/useStopPrice';
import { useTripPermissions } from '@/hooks/useTripPermissions';
import { Ionicons } from '@expo/vector-icons';
import { Stop } from '@planmyroute/types';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StopsScreen() {
    const router = useRouter();
    const { tripId, currentTrip, access } = useTripContext();
    const insets = useSafeAreaInsets();

    // 1. HOOKS DE DATOS
    // Capturar tripId al momento de crear los hooks
    const currentTripId = tripId as string;

    const { stops, isLoading: stopsLoading } = useStops(
        currentTripId,
        { enabled: !!currentTripId }
    );

    const deleteStopMutation = useDeleteStop(currentTripId);
    const { canAddStop, canEditStop } = useTripPermissions(currentTripId);

    // 2. ESTADOS LOCALES
    const [localStops, setLocalStops] = useState<Stop[]>([]);
    const [attachmentsModalVisible, setAttachmentsModalVisible] = useState(false);
    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

    // 3. EFECTO: ORDENAR PARADAS
    useEffect(() => {
        if (stops) {
            // Separar paradas por tipo
            const originStops = stops.filter(s => s.type === 'origen');
            const destinationStops = stops.filter(s => s.type === 'destino');
            const intermediateStops = stops.filter(s => s.type !== 'origen' && s.type !== 'destino');

            // Ordenar paradas intermedias por fecha estimada
            // Si no tienen fecha, mantener orden estable (no aleatorio)
            const sortedIntermediates = [...intermediateStops].sort((a, b) => {
                const dateA = a.estimated_arrival ? new Date(a.estimated_arrival).getTime() : null;
                const dateB = b.estimated_arrival ? new Date(b.estimated_arrival).getTime() : null;

                // Si ambas tienen fecha, ordenar por fecha
                if (dateA !== null && dateB !== null) {
                    return dateA - dateB;
                }

                // Si una tiene fecha y otra no, la que tiene fecha va primero
                if (dateA !== null) return -1;
                if (dateB !== null) return 1;

                // Si ninguna tiene fecha, mantener orden original (por ID)
                return (a.id || 0) - (b.id || 0);
            });

            // Concatenar: origen + intermedias ordenadas + destino
            const orderedStops = [
                ...originStops,
                ...sortedIntermediates,
                ...destinationStops
            ];

            // Solo actualizar si realmente cambió
            setLocalStops(prev => {
                if (prev.length === orderedStops.length &&
                    prev.every((p, i) => p.id === orderedStops[i]?.id)) {
                    return prev;
                }
                return orderedStops;
            });
        }
    }, [stops]);

    // 4. MEMO: AGRUPAR POR DÍAS
    const dayGroups = useMemo(() => {
        if (!localStops || localStops.length === 0) return [] as Stop[][];

        const useDayField = localStops.some((s) => (s as any).day !== undefined);
        if (useDayField) {
            const map = new Map<number, Stop[]>();
            localStops.forEach((s) => {
                const d = (s as any).day ?? 1;
                if (!map.has(d)) map.set(d, []);
                map.get(d)!.push(s);
            });
            return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map((e) => e[1]);
        }
        return localStops.map((s) => [s]);
    }, [localStops]);

    // 5. EFECTO: CALCULAR MÉTRICAS (OSRM)
    const [dayMetrics, setDayMetrics] = useState<Record<number, { distance?: number; duration?: number }>>({});

    useEffect(() => {
        let isMounted = true;
        (async () => {
            const metrics: Record<number, { distance?: number; duration?: number }> = {};
            await Promise.all(
                dayGroups.map(async (group, idx) => {
                    if (!group || group.length === 0) return;
                    const first = group[0];
                    const last = group[group.length - 1];
                    if (first.coordinates && last.coordinates && first.coordinates !== last.coordinates) {
                        try {
                            const coordinates = `${first.coordinates.longitude},${first.coordinates.latitude};${last.coordinates.longitude},${last.coordinates.latitude}`;
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 5000);

                            const response = await fetch(
                                `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false`,
                                { signal: controller.signal }
                            );
                            clearTimeout(timeoutId);

                            if (response.ok) {
                                const data = await response.json();
                                if (data.routes && data.routes[0]) {
                                    metrics[idx] = { distance: data.routes[0].distance, duration: data.routes[0].duration };
                                }
                            }
                        } catch (e) {
                            // ignore errors
                        }
                    }
                })
            );
            if (isMounted) setDayMetrics(metrics);
        })();
        return () => { isMounted = false; };
    }, [dayGroups]);

    // 6. HANDLERS
    const handleOpenCreateStop = () => router.push('/trip/addNewStop');
    const handleOpenEditStop = (stopId: number | string) => {
        console.log('📝 Navegando a editar parada:', stopId);
        router.push(`/trip/addNewStop?stopId=${stopId}`);
    };

    // FUNCIÓN DE ELIMINAR AGREGADA
    const handleDeleteStop = (stopId: number, stopName: string) => {
        const showConfirmation = () => {
            if (Platform.OS === 'web') {
                // En web, usar confirm() del navegador
                return (window as any).confirm?.(`¿Estás seguro de que quieres eliminar la parada "${stopName}"?`);
            } else {
                // En mobile, usar Alert.alert()
                Alert.alert(
                    'Confirmar eliminación',
                    `¿Estás seguro de que quieres eliminar la parada "${stopName}"?`,
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Eliminar',
                            style: 'destructive',
                            onPress: () => performDelete(),
                        },
                    ]
                );
                return null; // Alert ya maneja la lógica
            }
        };

        const performDelete = () => {
            console.log(`🗑️ Eliminando parada: ${stopId} - ${stopName}`);
            deleteStopMutation.mutate(stopId.toString(), {
                onSuccess: () => {
                    console.log(`✅ Parada eliminada correctamente`);
                },
                onError: (error) => {
                    console.error(`❌ Error al eliminar parada:`, error);
                    if (Platform.OS === 'web') {
                        alert(`No se pudo eliminar la parada: ${error.message}`);
                    } else {
                        Alert.alert('Error', `No se pudo eliminar la parada: ${error.message}`);
                    }
                },
            });
        };

        // En web, realizar delete si se confirma
        if (Platform.OS === 'web') {
            const confirmed = showConfirmation();
            if (confirmed) {
                performDelete();
            }
        } else {
            // En mobile, showConfirmation() ya maneja todo con el Alert
            showConfirmation();
        }
    };

    const openGoogleMaps = (stop: Stop) => {
        if (!stop.coordinates) {
            Alert.alert('Error', 'Esta parada no tiene coordenadas');
            return;
        }
        const { latitude, longitude } = stop.coordinates;
        const label = encodeURIComponent(stop.name);
        const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
        const url = Platform.select({
            ios: `${scheme}?q=${label}&ll=${latitude},${longitude}`,
            android: `${scheme}${latitude},${longitude}?q=${label}`,
        });
        if (url) {
            Linking.openURL(url).catch(() => {
                const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
                Linking.openURL(webUrl);
            });
        }
    };

    // 7. RENDER CONDICIONAL (LOADING)
    if (stopsLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50">
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    const placeholderImage = 'https://via.placeholder.com/800x450.png?text=PlanMyRoute';

    // 8. RENDER PRINCIPAL
    return (
        <View className="flex-1 bg-white">
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* --- HEADER --- */}
                <View className="px-6 pt-6 pb-3">
                    <Text className="text-sm text-slate-500">Tu viaje</Text>
                    <Text className="text-3xl font-extrabold mt-1">
                        {currentTrip?.start_date ? new Date(currentTrip.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'Inicio'} / {currentTrip?.end_date ? new Date(currentTrip.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'Fin'}
                    </Text>
                </View>

                {/* --- BANNER DE ESTADO (Guest o Completed) --- */}
                <View className="px-6">
                    <TripStatusBanner isGuest={access.isGuest} isCompleted={access.isCompleted} />
                </View>

                {/* --- TARJETAS DE DÍAS (Scroll Horizontal) --- */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: 16, paddingRight: 16, gap: 12 }}
                    style={{ minHeight: 160, marginBottom: 10 }}
                >
                    {dayGroups.map((group, dayIdx) => {
                        // IMPORTANTE: El número real del día se obtiene del primer stop del grupo
                        const actualDayNumber = group.length > 0 ? ((group[0] as any).day ?? (dayIdx + 1)) : (dayIdx + 1);

                        // Lógica de fechas
                        const now = new Date();
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                        let groupDate = new Date();
                        if (currentTrip?.start_date) {
                            const start = new Date(currentTrip.start_date);
                            const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                            startDate.setDate(startDate.getDate() + (actualDayNumber - 1));
                            groupDate = startDate;
                        } else if (group[0]?.estimated_arrival) {
                            const stopDate = new Date(group[0].estimated_arrival);
                            groupDate = new Date(stopDate.getFullYear(), stopDate.getMonth(), stopDate.getDate());
                        }

                        const isPast = groupDate < today;
                        const isCurrentDay = groupDate.getTime() === today.getTime();

                        // Estilos
                        let cardBg = 'bg-white border-2 border-gray-300';
                        let titleColor = 'text-gray-500';
                        let textColor = 'text-gray-700';
                        let subColor = 'text-gray-500';

                        if (isPast) {
                            cardBg = 'bg-gray-200 border-2 border-gray-200';
                            titleColor = 'text-gray-400';
                            textColor = 'text-gray-400';
                            subColor = 'text-gray-400';
                        } else if (isCurrentDay) {
                            cardBg = 'bg-yellow-300 border-2 border-yellow-300';
                            titleColor = 'text-slate-900';
                            textColor = 'text-slate-900';
                            subColor = 'text-slate-800';
                        }

                        // Métricas
                        const metrics = dayMetrics[dayIdx];
                        const distanceKm = metrics?.distance ? (metrics.distance / 1000).toFixed(0) : '?';
                        const durationHours = metrics?.duration ? Math.floor(metrics.duration / 3600) : 0;
                        const durationMins = metrics?.duration ? Math.round((metrics.duration % 3600) / 60) : 0;
                        const durationStr = metrics?.duration ? `${durationHours}h ${durationMins}m` : '—';

                        const firstStop = group[0];
                        const lastStop = group[group.length - 1];
                        const origin = firstStop?.address?.split(',')[0]?.trim() || 'Origen';
                        const destination = lastStop?.address?.split(',')[0]?.trim() || 'Destino';

                        return (
                            <View
                                key={dayIdx}
                                className={`rounded-3xl mr-0 p-5 flex-shrink-0 ${cardBg}`}
                                style={{ width: 180, minHeight: 150 }}
                            >
                                <View className="flex-row items-center justify-between mb-3">
                                    <Text className={`text-lg font-bold ${titleColor}`}>
                                        Día {actualDayNumber}
                                    </Text>
                                </View>
                                <Text className={`text-xs font-medium mb-3 ${subColor}`}>
                                    {group.length} parada{group.length !== 1 ? 's' : ''}
                                </Text>
                                <Text className={`text-sm font-bold leading-tight mb-3 ${textColor}`}>
                                    {origin} - {destination}
                                </Text>
                                <Text className={`text-xs font-medium ${subColor}`}>
                                    {distanceKm} km | {durationStr}
                                </Text>
                            </View>
                        );
                    })}
                </ScrollView>

                {/* --- LISTA DE PARADAS AGRUPADAS POR DÍA --- */}
                <View className="px-4 pt-4">
                    {localStops && localStops.length > 0 ? (
                        dayGroups.map((group, dayIdx) => {
                            // Obtener número real del día
                            const actualDayNumber = group.length > 0 ? ((group[0] as any).day ?? (dayIdx + 1)) : (dayIdx + 1);

                            // Calcular fecha del día
                            let dayDate = '';
                            if (currentTrip?.start_date) {
                                const start = new Date(currentTrip.start_date);
                                const date = new Date(start);
                                date.setDate(date.getDate() + (actualDayNumber - 1));
                                dayDate = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                            }

                            return (
                                <View key={`day-${actualDayNumber}`}>
                                    {/* ENCABEZADO DEL DÍA */}
                                    <View className="mb-4 mt-6 border-b-2 border-indigo-300 pb-3">
                                        <Text className="text-2xl font-extrabold text-indigo-600">
                                            Día {actualDayNumber}
                                        </Text>
                                        <Text className="text-sm text-gray-600 capitalize">
                                            {dayDate}
                                        </Text>
                                    </View>

                                    {/* PARADAS DEL DÍA */}
                                    {group.map((stop, i) => {
                                        // Priorizar photo_url de Google Places, luego fallback a cover_image_url
                                        const imageUrl = (stop as any).photo_url || (stop as any).cover_image_url || placeholderImage;

                                        return (
                                            <View key={stop.id}>
                                                {/* CONTENEDOR DE LA TARJETA */}
                                                <View className="mb-6">
                                                    {/* Header pequeño (Número y nombre) */}
                                                    <View className="flex-row items-center mb-3 px-1">
                                                        <View className="w-8 h-8 rounded-full bg-yellow-300 items-center justify-center mr-3">
                                                            <Text className="font-bold">{i + 1}</Text>
                                                        </View>
                                                        <Text className="text-xl font-extrabold flex-1">{stop.name} <Text className="font-medium">- {stop.address?.split(',')[1] ?? ''}</Text></Text>
                                                    </View>

                                                    <View className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-200 z-10">
                                                        <Image
                                                            source={{ uri: imageUrl }}
                                                            style={{ width: '100%', height: 200 }}
                                                            resizeMode="cover"
                                                        />

                                                        <View className="absolute top-4 left-4 bg-yellow-300 px-3 py-2 rounded-full">
                                                            <Text className="font-semibold text-sm">{stop.type ?? 'Parada'}</Text>
                                                        </View>

                                                        {/* Botones de editar/eliminar - Solo si puede editar y no es guest ni completed */}
                                                        {canEditStop && !access.isGuest && !access.isCompleted && (
                                                            <View className="absolute top-3 right-3 flex-row gap-3">
                                                                {/* BOTÓN DE ELIMINAR */}
                                                                <TouchableOpacity
                                                                    onPress={() => handleDeleteStop(stop.id, stop.name)}
                                                                    className="bg-white w-10 h-10 rounded-full items-center justify-center shadow"
                                                                >
                                                                    <Ionicons name="trash" size={18} color="#EF4444" />
                                                                </TouchableOpacity>

                                                                {/* BOTÓN DE EDITAR */}
                                                                <TouchableOpacity onPress={() => handleOpenEditStop(stop.id)} className="bg-white w-10 h-10 rounded-full items-center justify-center shadow">
                                                                    <Ionicons name="pencil" size={18} color="#111827" />
                                                                </TouchableOpacity>
                                                            </View>
                                                        )}

                                                        <View className="p-4 bg-white">
                                                            <View className="flex-row items-start justify-between gap-2">
                                                                <View className="flex-1">
                                                                    <Text className="text-lg font-bold">{stop.name}</Text>
                                                                    <Text className="text-slate-500 mt-1 text-sm">{stop.address}</Text>
                                                                    {stop.estimated_arrival && (
                                                                        <View className="flex-row items-center mt-2 gap-1">
                                                                            <Ionicons name="time" size={14} color="#6B7280" />
                                                                            <Text className="text-sm text-slate-600 font-medium">
                                                                                {new Date(stop.estimated_arrival).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                                            </Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                                {/* Componente de precio en el lado derecho */}
                                                                <PriceDisplayComponent stopId={stop.id} stopData={stop} />
                                                            </View>

                                                            <View className="mt-4 items-center">
                                                                <TouchableOpacity onPress={() => openGoogleMaps(stop)} className="flex-row items-center gap-3 bg-yellow-300 px-4 py-3 rounded-full shadow">
                                                                    <Text className="font-semibold">Indicaciones</Text>
                                                                    <Ionicons name="location" size={18} color="#111827" />
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            );
                        })
                    ) : (
                        <View className="flex-1 items-center justify-center py-20">
                            <Ionicons name="map-outline" size={64} color="#CBD5E1" />
                            <Text className="text-slate-500 text-center mt-4 text-lg">No hay paradas en este viaje</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* CONTENEDOR DEL BOTÓN FLOTANTE */}
            {canAddStop && !access.isGuest && !access.isCompleted && (
                <View
                    className="absolute right-6 bottom-0 w-20 h-20"
                    pointerEvents="box-none"
                    style={{ bottom: insets.bottom + 24 }}
                >
                    <TouchableOpacity
                        onPress={() => handleOpenCreateStop()}
                        className="bg-yellow-300 w-16 h-16 rounded-full items-center justify-center shadow-lg z-10"
                        activeOpacity={0.8}
                        style={{
                            elevation: 5,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                        }}
                    >
                        <Ionicons name="add" size={32} color="#111827" />
                    </TouchableOpacity>
                </View>
            )}

            <AttachmentsModal
                visible={attachmentsModalVisible}
                stop={selectedStop}
                onClose={() => { setAttachmentsModalVisible(false); setSelectedStop(null); }}
            />
        </View>
    );
}

/**
 * Componente para mostrar el precio de una parada
 */
function PriceDisplayComponent({ stopId, stopData }: { stopId: string | number; stopData?: any }) {
    const { priceInfo, isLoading } = useStopPrice(stopId, stopData);

    // Primero verificar si hay precio manual guardado en los datos locales
    const manualPrice = stopData?.estimated_price;

    // Si tenemos precio manual, mostrarlo directamente sin necesidad de API
    if (manualPrice) {
        return (
            <View className="items-end gap-1">
                <Text className="text-xs text-slate-600 font-semibold">
                    {typeof manualPrice === 'number' ? `${manualPrice}€` : manualPrice}
                </Text>
            </View>
        );
    }

    // Si no hay información o está cargando, no mostrar nada
    if (!priceInfo && !isLoading) {
        return null;
    }

    // Mientras está cargando, mostrar un skeleton
    if (isLoading) {
        return (
            <View className="items-end min-w-[60px]">
                <View className="bg-gray-200 px-2 py-1 rounded-lg mb-1 w-10 h-5" />
            </View>
        );
    }

    // Si hay información de precio desde API, mostrarla
    if (priceInfo) {
        return (
            <View className="items-end gap-1">
                {priceInfo.price_symbol && (
                    <View className="bg-green-100 px-2 py-1 rounded-lg">
                        <Text className="text-green-700 font-bold text-xs">
                            {priceInfo.price_symbol}
                        </Text>
                    </View>
                )}
                {priceInfo.estimated_price && (
                    <Text className="text-xs text-slate-600 text-right">
                        {priceInfo.estimated_price}
                    </Text>
                )}
                {priceInfo.rating && (
                    <View className="flex-row items-center gap-0.5">
                        <Ionicons name="star" size={11} color="#FBBF24" />
                        <Text className="text-xs text-slate-600">
                            {priceInfo.rating.toFixed(1)}
                        </Text>
                    </View>
                )}
            </View>
        );
    }

    return null;
}