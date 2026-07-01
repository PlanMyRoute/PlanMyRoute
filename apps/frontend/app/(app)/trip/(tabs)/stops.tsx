import CustomAlert from '@/components/customElements/CustomAlert';
import { MicrotextDark, SubtitleSemibold, TextRegular, Title2Semibold } from '@/components/customElements/CustomText';
import { SkeletonBox } from '@/components/customElements/SkeletonBox';
import { AttachmentsModal } from '@/components/modals/AttachmentsModal';
import { DayInfo, DaySelector } from '@/components/trip/DaySelector';
import { StopGuideItem } from '@/components/trip/StopGuideItem';
import { TripStatusBanner } from '@/components/trip/TripStatusBadge';
import { ROUTES } from '@/constants/routes';
import { useTripContext } from '@/context/TripContext';
import { useAddEventAsStop } from '@/hooks/useAddEventAsStop';
import { useDeleteStop, useStops } from '@/hooks/useItinerary';
import { useNearbyRouteEvents } from '@/hooks/useNearbyRouteEvents';
import useTrips from '@/hooks/useTrips';
import { useTripPermissions } from '@/hooks/useTripPermissions';
import { TmEvent } from '@/services/eventService';
import { Ionicons } from '@expo/vector-icons';
import { Stop } from '@planmyroute/types';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StopsScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { tripId, currentTrip, setCurrentTrip, access } = useTripContext();
    const insets = useSafeAreaInsets();
    const currentTripId = tripId as string;

    const generationStatus = (currentTrip as any)?.generation_status as string | undefined;
    const isGenerating = generationStatus === 'generating';
    const isFailed = generationStatus === 'failed';

    // Poll el trip cada 3s mientras se generan paradas, para detectar cuando termina
    const { data: polledTrip } = useTrips(isGenerating ? currentTripId : null, {
        enabled: isGenerating && !!currentTripId,
        refetchInterval: 3000,
    });
    useEffect(() => {
        if (polledTrip && (polledTrip as any).generation_status !== 'generating') {
            setCurrentTrip(polledTrip as any);
            queryClient.invalidateQueries({ queryKey: ['stops', currentTripId] });
        }
    }, [polledTrip, setCurrentTrip, queryClient, currentTripId]);

    const { stops, isLoading: stopsLoading } = useStops(currentTripId, {
        enabled: !!currentTripId,
        refetchInterval: isGenerating ? 3000 : false,
    });
    const deleteStopMutation = useDeleteStop(currentTripId);
    const { canAddStop, canEditStop } = useTripPermissions(currentTripId);

    const [localStops, setLocalStops] = useState<Stop[]>([]);
    const [attachmentsModalVisible, setAttachmentsModalVisible] = useState(false);
    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
    const [eventsSearchEnabled, setEventsSearchEnabled] = useState(false);

    const { addingEventId, addEventAsStop } = useAddEventAsStop(currentTripId);
    const { events: nearbyEvents, isLoading: loadingNearby } = useNearbyRouteEvents(
        localStops,
        (currentTrip as any)?.start_date,
        { enabled: eventsSearchEnabled },
    );

    // Ordenar paradas al cargar
    useEffect(() => {
        if (!stops) return;
        const origin = stops.filter(s => s.type === 'origen');
        const destination = stops.filter(s => s.type === 'destino');
        const intermediate = stops
            .filter(s => s.type !== 'origen' && s.type !== 'destino')
            .sort((a, b) => {
                const dateA = a.estimated_arrival ? new Date(a.estimated_arrival).getTime() : null;
                const dateB = b.estimated_arrival ? new Date(b.estimated_arrival).getTime() : null;
                if (dateA && dateB) return dateA - dateB;
                if (dateA) return -1;
                if (dateB) return 1;
                return (a.id || 0) - (b.id || 0);
            });
        const ordered = [...origin, ...intermediate, ...destination];
        setLocalStops(prev => {
            if (prev.length === ordered.length && prev.every((p, i) => p.id === ordered[i]?.id)) return prev;
            return ordered;
        });
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
        if (!localStops.length) return [] as Stop[][];
        const hasDayField = localStops.some(s => (s as any).day !== undefined);
        if (hasDayField) {
            const map = new Map<number, Stop[]>();
            localStops.forEach(s => {
                const d = (s as any).day ?? 1;
                if (!map.has(d)) map.set(d, []);
                map.get(d)!.push(s);
            });
            return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(e => e[1]);
        }
        return localStops.map(s => [s]);
    }, [localStops]);

    // Calcular métricas por día (distancia total + legs entre paradas consecutivas)
    const [dayMetrics, setDayMetrics] = useState<
        Record<number, { totalKm?: string; durationStr?: string; legs: { km: string; dur: string }[] }>
    >({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const metrics: typeof dayMetrics = {};
            await Promise.all(
                dayGroups.map(async (group, idx) => {
                    const valid = group.filter(s => s.coordinates?.latitude && s.coordinates?.longitude);
                    if (valid.length < 2) { metrics[idx] = { legs: [] }; return; }
                    try {
                        const coords = valid.map(s => `${s.coordinates.longitude},${s.coordinates.latitude}`).join(';');
                        const ctrl = new AbortController();
                        const tid = setTimeout(() => ctrl.abort(), 5000);
                        const res = await fetch(
                            `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`,
                            { signal: ctrl.signal }
                        );
                        clearTimeout(tid);
                        if (!res.ok || cancelled) return;
                        const data = await res.json();
                        const route = data.routes?.[0];
                        if (!route) return;
                        const totalKm = ((route.distance || 0) / 1000).toFixed(0);
                        const h = Math.floor((route.duration || 0) / 3600);
                        const m = Math.round(((route.duration || 0) % 3600) / 60);
                        const durationStr = h > 0 ? `${h}h ${m}min` : `${m}min`;
                        const legs = (route.legs || []).map((leg: any) => ({
                            km: ((leg.distance || 0) / 1000).toFixed(0),
                            dur: (() => {
                                const lh = Math.floor((leg.duration || 0) / 3600);
                                const lm = Math.round(((leg.duration || 0) % 3600) / 60);
                                return lh > 0 ? `${lh}h ${lm}min` : `${lm}min`;
                            })(),
                        }));
                        metrics[idx] = { totalKm, durationStr, legs };
                    } catch { metrics[idx] = { legs: [] }; }
                })
            );
            if (!cancelled) setDayMetrics(metrics);
        })();
        return () => { cancelled = true; };
    }, [dayGroups]);

    // Días para el selector
    const dayInfos = useMemo((): DayInfo[] => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dayGroups.map((group, idx) => {
            const actualDay = (group[0] as any).day ?? (idx + 1);
            let groupDate = new Date();
            if (currentTrip?.start_date) {
                const start = new Date(currentTrip.start_date);
                start.setHours(0, 0, 0, 0);
                start.setDate(start.getDate() + (actualDay - 1));
                groupDate = start;
            }
            const isPast = groupDate < today;
            const isToday = groupDate.getTime() === today.getTime();
            const m = dayMetrics[idx];
            return {
                day: actualDay,
                stopCount: group.length,
                distanceKm: m?.totalKm,
                durationStr: m?.durationStr,
                isToday,
                isPast,
            };
        });
    }, [dayGroups, dayMetrics, currentTrip?.start_date]);

    // Paradas filtradas por día seleccionado
    const visibleGroups = useMemo(() => {
        if (selectedDay === null) return dayGroups;
        return dayGroups.filter(group => {
            const day = (group[0] as any)?.day;
            return day === selectedDay;
        });
    }, [dayGroups, selectedDay]);

    // Próxima parada para el banner "De camino a"
    const nextStop = useMemo(() => {
        if (currentTrip?.status !== 'going') return null;
        const now = new Date();
        for (const stop of localStops) {
            if (stop.estimated_arrival && new Date(stop.estimated_arrival) > now) return stop;
        }
        return localStops[localStops.length - 1] ?? null;
    }, [localStops, currentTrip?.status]);

    const handleAddEventAsStop = useCallback((event: TmEvent) => {
        addEventAsStop(event, (currentTrip as any)?.start_date);
    }, [addEventAsStop, currentTrip]);

    const handleDeleteStop = useCallback((stopId: number, stopName: string) => {
        setDeleteConfirm({ id: stopId, name: stopName });
    }, []);

    const confirmDelete = useCallback(() => {
        if (!deleteConfirm) return;
        deleteStopMutation.mutate(deleteConfirm.id.toString(), {
            onSuccess: () => setDeleteConfirm(null),
            onError: () => setDeleteConfirm(null),
        });
    }, [deleteConfirm, deleteStopMutation]);

    const handleOpenEditStop = useCallback((stop: Stop) => {
        router.push(ROUTES.tripEditStop(String(stop.id)));
    }, [router]);

    if (stopsLoading) {
        return (
            <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
                <View className="px-6 pt-6 gap-4">
                    <SkeletonBox height={28} width="50%" borderRadius={6} />
                    <SkeletonBox height={40} style={{ width: '100%' }} borderRadius={20} />
                    {[1, 2, 3].map(i => (
                        <View key={i} className="flex-row gap-3">
                            <SkeletonBox width={32} height={32} borderRadius={16} />
                            <View className="flex-1 gap-2">
                                <SkeletonBox height={20} width="70%" borderRadius={6} />
                                <SkeletonBox height={14} width="50%" borderRadius={6} />
                                <SkeletonBox height={14} width="40%" borderRadius={6} />
                            </View>
                            <SkeletonBox width={80} height={80} borderRadius={12} />
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

                {/* Banner de estado */}
                <View className="px-6 pt-4">
                    <TripStatusBanner isGuest={access.isGuest} isCompleted={access.isCompleted} />
                </View>

                {/* Banner de error si la generación falló */}
                {isFailed && (
                    <View className="mx-6 mt-2 mb-2 bg-red-50 border border-red-200 rounded-2xl p-4">
                        <View className="flex-row items-center gap-2 mb-1">
                            <Ionicons name="alert-circle" size={20} color="#EF4444" />
                            <SubtitleSemibold style={{ color: '#EF4444' }}>Error en la generación</SubtitleSemibold>
                        </View>
                        <TextRegular className="text-neutral mb-3">
                            Hubo un problema al generar el itinerario. Los tokens han sido reembolsados.
                        </TextRegular>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="self-start bg-dark-black rounded-full px-4 py-2"
                            activeOpacity={0.8}
                        >
                            <Text className="text-primary-yellow text-sm font-semibold">Volver a intentar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Banner de enriquecimiento en progreso */}
                {isGenerating && localStops.length > 0 && (
                    <View className="mx-6 mt-2 mb-2 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 flex-row items-center gap-2">
                        <ActivityIndicator size="small" color="#D97706" />
                        <MicrotextDark className="text-yellow-700 flex-1">
                            Completando fotos y detalles de las paradas…
                        </MicrotextDark>
                    </View>
                )}

                {/* Selector de días */}
                <DaySelector
                    days={dayInfos}
                    selectedDay={selectedDay}
                    onSelect={setSelectedDay}
                    totalStops={localStops.length}
                />

                {/* Banner "De camino a" */}
                {nextStop && currentTrip?.status === 'going' && (
                    <View className="mx-6 mb-4 bg-primary rounded-2xl p-4">
                        <MicrotextDark className="mb-0.5 opacity-60">De camino a</MicrotextDark>
                        <View className="flex-row items-center justify-between">
                            <Title2Semibold className="flex-1 mr-2" numberOfLines={1}>
                                {nextStop.name}
                            </Title2Semibold>
                            {nextStop.estimated_arrival && (
                                <View className="flex-row items-center gap-1 bg-white/70 rounded-full px-3 py-1">
                                    <Ionicons name="time-outline" size={14} color="#202020" />
                                    <MicrotextDark>
                                        {new Date(nextStop.estimated_arrival).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                    </MicrotextDark>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Lista de paradas por día */}
                <View className="px-6 pt-2">
                    {localStops.length === 0 ? (
                        <View className="items-center py-16">
                            <View className="w-20 h-20 bg-primary rounded-full items-center justify-center mb-4">
                                <Ionicons name="map-outline" size={36} color="#202020" />
                            </View>
                            <SubtitleSemibold className="text-center mb-2">Sin paradas aún</SubtitleSemibold>
                            <TextRegular className="text-neutral text-center">
                                Añade la primera parada para empezar a planificar tu ruta.
                            </TextRegular>
                        </View>
                    ) : (
                        visibleGroups.map((group, groupIdx) => {
                            const actualDay = (group[0] as any)?.day ?? (groupIdx + 1);
                            const globalIdx = dayGroups.findIndex(g => g === group);
                            const metrics = dayMetrics[globalIdx];

                            let dayDate = '';
                            if (currentTrip?.start_date) {
                                const start = new Date(currentTrip.start_date);
                                start.setDate(start.getDate() + (actualDay - 1));
                                dayDate = start.toLocaleDateString('es-ES', {
                                    weekday: 'long', day: 'numeric', month: 'long',
                                });
                            }

                            return (
                                <View key={`day-${actualDay}`} className="mb-2">
                                    {/* Cabecera del día */}
                                    <View className="mb-4 mt-4">
                                        <View className="flex-row items-baseline gap-2">
                                            <SubtitleSemibold>Día {actualDay}</SubtitleSemibold>
                                            {metrics?.totalKm && (
                                                <MicrotextDark className="text-neutral">
                                                    · {metrics.totalKm} km · {metrics.durationStr}
                                                </MicrotextDark>
                                            )}
                                        </View>
                                        {dayDate ? (
                                            <MicrotextDark className="text-neutral capitalize mt-0.5">{dayDate}</MicrotextDark>
                                        ) : null}
                                    </View>

                                    {/* Paradas del día */}
                                    {group.map((stop, i) => (
                                        <StopGuideItem
                                            key={stop.id}
                                            stop={stop}
                                            stopNumber={i + 1}
                                            isLast={i === group.length - 1}
                                            canEdit={canEditStop && !access.isGuest && !access.isCompleted}
                                            isEnriching={isGenerating}
                                            legDistanceKm={metrics?.legs?.[i]?.km}
                                            legDurationStr={metrics?.legs?.[i]?.dur}
                                            onEdit={handleOpenEditStop}
                                            onDelete={handleDeleteStop}
                                        />
                                    ))}
                                </View>
                            );
                        })
                    )}

                    {/* Skeleton por días pendientes de generación */}
                    {isGenerating && (() => {
                        if (!currentTrip?.start_date || !currentTrip?.end_date) return null;
                        const totalDays = Math.max(1, Math.round(
                            (new Date(currentTrip.end_date).getTime() - new Date(currentTrip.start_date).getTime()) / 86400000
                        ) + 1);
                        const daysWithStops = new Set(localStops.map(s => (s as any).day || 1));
                        const pendingDays = Array.from({ length: totalDays }, (_, i) => i + 1)
                            .filter(d => !daysWithStops.has(d));
                        if (pendingDays.length === 0) return null;
                        return pendingDays.map(day => (
                            <View key={`skeleton-day-${day}`} className="mt-4 mb-2">
                                <View className="mb-4 mt-4">
                                    <SkeletonBox height={18} width="25%" borderRadius={6} />
                                    <SkeletonBox height={12} width="40%" borderRadius={6} style={{ marginTop: 4 }} />
                                </View>
                                {[1, 2].map(i => (
                                    <View key={i} className="flex-row gap-3 mb-5">
                                        <SkeletonBox width={32} height={32} borderRadius={16} />
                                        <View className="flex-1 gap-2">
                                            <SkeletonBox height={18} width="65%" borderRadius={6} />
                                            <SkeletonBox height={13} width="45%" borderRadius={6} />
                                        </View>
                                        <SkeletonBox width={72} height={72} borderRadius={10} />
                                    </View>
                                ))}
                            </View>
                        ));
                    })()}
                </View>

                {/* Sección: Eventos en tu ruta */}
                {!isGenerating && localStops.length > 0 && !access.isCompleted && (
                    <View className="px-6 mt-6 mb-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center gap-x-2">
                                <Ionicons name="ticket-outline" size={18} color="#202020" />
                                <SubtitleSemibold>Eventos en tu ruta</SubtitleSemibold>
                            </View>
                            {!eventsSearchEnabled && (
                                <TouchableOpacity
                                    onPress={() => setEventsSearchEnabled(true)}
                                    className="bg-dark-black px-3 py-1.5 rounded-full flex-row items-center gap-x-1"
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="search" size={13} color="#FFD54D" />
                                    <Text className="text-primary-yellow text-xs font-semibold">Buscar</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {!eventsSearchEnabled ? (
                            <View className="bg-gray-50 rounded-2xl p-4 items-center">
                                <Text className="text-gray-400 text-sm text-center">
                                    Busca eventos que se celebren cerca de las paradas de tu viaje.
                                </Text>
                            </View>
                        ) : loadingNearby ? (
                            <View className="py-8 items-center">
                                <ActivityIndicator color="#FFD54D" />
                                <Text className="text-gray-400 text-sm mt-2">Buscando eventos…</Text>
                            </View>
                        ) : nearbyEvents.length === 0 ? (
                            <View className="bg-gray-50 rounded-2xl p-4 items-center">
                                <Ionicons name="calendar-outline" size={32} color="#ccc" />
                                <Text className="text-gray-400 text-sm text-center mt-2">
                                    No hay eventos programados cerca de tus paradas en esas fechas.
                                </Text>
                            </View>
                        ) : (
                            nearbyEvents.map((event) => (
                                <View
                                    key={event.id}
                                    className="flex-row bg-white rounded-2xl mb-3 overflow-hidden border border-gray-100"
                                    style={{ elevation: 1 }}
                                >
                                    {event.image ? (
                                        <Image source={{ uri: event.image }} style={{ width: 72, height: 72 }} resizeMode="cover" />
                                    ) : (
                                        <View style={{ width: 72, height: 72 }} className="bg-gray-200 items-center justify-center">
                                            <Ionicons name="musical-notes" size={24} color="#bbb" />
                                        </View>
                                    )}
                                    <View className="flex-1 p-3 justify-between">
                                        <View>
                                            <Text className="text-dark-black font-semibold text-sm" numberOfLines={1}>{event.name}</Text>
                                            <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
                                                {[event.venue?.city, event.date].filter(Boolean).join(' · ')}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => handleAddEventAsStop(event)}
                                            disabled={addingEventId === event.id}
                                            className="self-start bg-dark-black rounded-full px-3 py-1 mt-1 flex-row items-center gap-x-1"
                                            activeOpacity={0.8}
                                        >
                                            {addingEventId === event.id ? (
                                                <ActivityIndicator size="small" color="#FFD54D" />
                                            ) : (
                                                <>
                                                    <Ionicons name="add" size={13} color="#FFD54D" />
                                                    <Text className="text-primary-yellow text-xs font-semibold">Añadir</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Botón flotante añadir parada */}
            {canAddStop && !access.isGuest && !access.isCompleted && (
                <TouchableOpacity
                    onPress={() => router.push(ROUTES.tripAddStop)}
                    activeOpacity={0.8}
                    className="absolute right-6 w-14 h-14 bg-dark rounded-full items-center justify-center"
                    style={{
                        bottom: insets.bottom + 24,
                        elevation: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                    }}
                >
                    <Ionicons name="add" size={28} color="#FFD54D" />
                </TouchableOpacity>
            )}

            {/* Confirmación de borrado */}
            <CustomAlert
                visible={!!deleteConfirm}
                title="Eliminar parada"
                message={`¿Seguro que quieres eliminar "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
                type="warning"
                actions={[
                    { text: 'Cancelar', variant: 'outline', onPress: () => setDeleteConfirm(null) },
                    { text: 'Eliminar', variant: 'danger', onPress: confirmDelete },
                ]}
                onClose={() => setDeleteConfirm(null)}
            />

            <AttachmentsModal
                visible={attachmentsModalVisible}
                stop={selectedStop}
                onClose={() => { setAttachmentsModalVisible(false); setSelectedStop(null); }}
            />
        </View>
    );
}
