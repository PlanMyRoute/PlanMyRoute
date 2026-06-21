import { MicrotextDark, TextRegular, Title3Semibold } from '@/components/customElements/CustomText';
import { SkeletonBox } from '@/components/customElements/SkeletonBox';
import { Ionicons } from '@expo/vector-icons';
import { Stop } from '@planmyroute/types';
import { Image, Linking, Platform, TouchableOpacity, View } from 'react-native';

interface StopGuideItemProps {
    stop: Stop;
    stopNumber: number;
    isLast: boolean;
    canEdit: boolean;
    isEnriching?: boolean;
    legDistanceKm?: string;
    legDurationStr?: string;
    onEdit: (stop: Stop) => void;
    onDelete: (stopId: number, stopName: string) => void;
}

const PLACEHOLDER = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400';

function formatTime(isoString: string) {
    return new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function openDirections(stop: Stop) {
    if (!stop.coordinates) return;
    const { latitude, longitude } = stop.coordinates;
    const label = encodeURIComponent(stop.name);
    const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
    const url = Platform.select({
        ios: `${scheme}?q=${label}&ll=${latitude},${longitude}`,
        android: `${scheme}${latitude},${longitude}?q=${label}`,
    });
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    if (url) {
        Linking.openURL(url).catch(() => Linking.openURL(webUrl));
    } else {
        Linking.openURL(webUrl);
    }
}

export function StopGuideItem({
    stop,
    stopNumber,
    isLast,
    canEdit,
    isEnriching,
    legDistanceKm,
    legDurationStr,
    onEdit,
    onDelete,
}: StopGuideItemProps) {
    const hasPhoto = !!(stop as any).photo_url || !!(stop as any).cover_image_url;
    const showSkeleton = isEnriching && !hasPhoto;
    const imageUrl = (stop as any).photo_url || (stop as any).cover_image_url || PLACEHOLDER;

    return (
        <View>
            <View className="flex-row">
                {/* Columna timeline */}
                <View className="items-center" style={{ width: 32 }}>
                    <View className="w-8 h-8 bg-primary rounded-full items-center justify-center z-10">
                        <MicrotextDark>{stopNumber}</MicrotextDark>
                    </View>
                    {!isLast && (
                        <View className="w-px bg-neutral/25 flex-1 mt-1" style={{ minHeight: 60 }} />
                    )}
                </View>

                {/* Contenido */}
                <View className="flex-1 ml-3 pb-6">
                    {/* Fila cabecera: nombre + acciones */}
                    <View className="flex-row items-start justify-between mb-2">
                        <Title3Semibold className="flex-1 mr-2" numberOfLines={2}>
                            {stop.name}
                        </Title3Semibold>
                        {canEdit && (
                            <View className="flex-row gap-1">
                                <TouchableOpacity
                                    onPress={() => onEdit(stop)}
                                    className="w-8 h-8 rounded-full bg-neutral/10 items-center justify-center"
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="pencil-outline" size={15} color="#202020" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => onDelete(stop.id, stop.name)}
                                    className="w-8 h-8 rounded-full bg-neutral/10 items-center justify-center"
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Fila principal: detalles + thumbnail */}
                    <View className="flex-row">
                        <View className="flex-1 mr-3">
                            {/* Descripción IA */}
                            {stop.description ? (
                                <TextRegular
                                    className="text-neutral mb-2"
                                    style={{ fontStyle: 'italic' }}
                                    numberOfLines={3}
                                >
                                    {stop.description}
                                </TextRegular>
                            ) : null}

                            {/* Dirección */}
                            {stop.address ? (
                                <View className="flex-row items-start gap-1 mb-1.5">
                                    <Ionicons name="location-outline" size={13} color="#999999" style={{ marginTop: 1 }} />
                                    <MicrotextDark className="text-neutral flex-1" numberOfLines={2}>
                                        {stop.address}
                                    </MicrotextDark>
                                </View>
                            ) : null}

                            {/* Hora estimada */}
                            {stop.estimated_arrival ? (
                                <View className="flex-row items-center gap-1 mb-3">
                                    <Ionicons name="time-outline" size={13} color="#999999" />
                                    <MicrotextDark className="text-neutral">
                                        {formatTime(stop.estimated_arrival)}
                                    </MicrotextDark>
                                </View>
                            ) : <View className="mb-3" />}

                            {/* Botón indicaciones */}
                            <TouchableOpacity
                                onPress={() => openDirections(stop)}
                                activeOpacity={0.75}
                                className="flex-row items-center gap-1.5 self-start bg-dark/5 px-3 py-1.5 rounded-full"
                            >
                                <Ionicons name="navigate-outline" size={13} color="#202020" />
                                <MicrotextDark>Indicaciones</MicrotextDark>
                            </TouchableOpacity>
                        </View>

                        {/* Thumbnail */}
                        {showSkeleton ? (
                            <SkeletonBox width={80} height={80} borderRadius={12} />
                        ) : (
                            <Image
                                source={{ uri: imageUrl }}
                                style={{ width: 80, height: 80, borderRadius: 12 }}
                                resizeMode="cover"
                            />
                        )}
                    </View>
                </View>
            </View>

            {/* Conector entre paradas */}
            {!isLast && (legDistanceKm || legDurationStr) && (
                <View className="flex-row items-center ml-4 mb-2" style={{ paddingLeft: 12 }}>
                    <Ionicons name="arrow-down" size={12} color="#999999" />
                    <MicrotextDark className="text-neutral ml-1">
                        {[legDistanceKm && `${legDistanceKm} km`, legDurationStr].filter(Boolean).join(' · ')}
                    </MicrotextDark>
                </View>
            )}
        </View>
    );
}
