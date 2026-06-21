import CustomAlert from '@/components/customElements/CustomAlert';
import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, TextRegular, Title3Semibold } from '@/components/customElements/CustomText';
import { TripStatusBadge } from '@/components/trip/TripStatusBadge';
import { ROUTES } from '@/constants/routes';
import { useTripContext } from '@/context/TripContext';
import { useTripPermissions } from '@/hooks/useTripPermissions';
import { useDeleteTrip, useLeaveTrip } from '@/hooks/useTrips';
import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useLocalSearchParams, useRouter, withLayoutContext } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

// ── Tab bar simplificado (4 tabs fijos, sin scroll) ─────────────────────────
function CustomTabBar({ state, descriptors, navigation }: any) {
    const getIcon = (name: string): keyof typeof Ionicons.glyphMap => {
        switch (name) {
            case 'stops': return 'list';
            case 'map': return 'map-outline';
            case 'bills': return 'wallet-outline';
            case 'photos': return 'images-outline';
            default: return 'help-circle';
        }
    };

    return (
        <View className="bg-white border-b border-neutral/15 flex-row px-3 h-14 items-center">
            {state.routes.map((route: any, index: number) => {
                const { options } = descriptors[route.key];
                const label = options.title ?? route.name;
                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });
                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name, route.params);
                    }
                };

                return (
                    <TouchableOpacity
                        key={route.key}
                        onPress={onPress}
                        activeOpacity={0.7}
                        className={`flex-1 items-center justify-center py-1.5 rounded-xl ${isFocused ? 'bg-primary' : ''}`}
                    >
                        <Ionicons name={getIcon(route.name)} size={18} color="#202020" />
                        <MicrotextDark className="mt-0.5">{label}</MicrotextDark>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

// ── Bottom sheet menú ────────────────────────────────────────────────────────
interface MenuItem {
    id: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    destructive?: boolean;
}

function TripActionSheet({ visible, onClose, items }: { visible: boolean; onClose: () => void; items: MenuItem[] }) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1 }} accessibilityViewIsModal>
            <TouchableOpacity
                className="flex-1 bg-black/40"
                activeOpacity={1}
                onPress={onClose}
            />
            <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-6 pt-3 pb-8">
                {/* Drag handle */}
                <View className="w-10 h-1 bg-neutral/30 rounded-full self-center mb-5" />

                {items.map((item, idx) => (
                    <TouchableOpacity
                        key={item.id}
                        onPress={() => { onClose(); setTimeout(item.onPress, 150); }}
                        activeOpacity={0.7}
                        className={`flex-row items-center gap-3 py-4 ${idx < items.length - 1 ? 'border-b border-neutral/10' : ''}`}
                    >
                        <Ionicons
                            name={item.icon}
                            size={22}
                            color={item.destructive ? '#EF4444' : '#202020'}
                        />
                        <TextRegular style={item.destructive ? { color: '#EF4444' } : undefined}>
                            {item.label}
                        </TextRegular>
                    </TouchableOpacity>
                ))}

                <View className="mt-4">
                    <CustomButton title="Cancelar" variant="outline" size="large" onPress={onClose} />
                </View>
            </View>
            </View>
        </Modal>
    );
}

// ── Layout principal ─────────────────────────────────────────────────────────
export default function TripTabsLayout() {
    const params = useLocalSearchParams();
    const { currentTrip, tripId: contextTripId, setCurrentTrip, setTripId, access } = useTripContext();
    const tripId = (params.tripId as string) || contextTripId;

    const router = useRouter();
    const [menuVisible, setMenuVisible] = useState(false);
    const [leaveAlertVisible, setLeaveAlertVisible] = useState(false);
    const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);

    useEffect(() => {
        if (params.tripId && params.tripId !== contextTripId) {
            setTripId(params.tripId as string);
        }
    }, [params.tripId, contextTripId, setTripId]);

    const { canEdit, canDelete, isOwner } = useTripPermissions(tripId);
    const deleteTripMutation = useDeleteTrip();
    const leaveTripMutation = useLeaveTrip();

    const goBack = () => router.canGoBack() ? router.back() : router.replace(ROUTES.tabsHome);

    const handleLeaveTrip = () => {
        leaveTripMutation.mutate(tripId as string, {
            onSuccess: () => {
                setCurrentTrip(null);
                setTripId(null);
                router.replace(ROUTES.tabsHome);
            },
        });
    };

    const handleDeleteTrip = () => {
        deleteTripMutation.mutate(tripId as string, {
            onSuccess: () => {
                setCurrentTrip(null);
                setTripId(null);
                router.replace(ROUTES.tabsHome);
            },
        });
    };

    const menuItems = useMemo((): MenuItem[] => {
        const items: MenuItem[] = [
            {
                id: 'travelers',
                label: 'Viajeros',
                icon: 'people-outline',
                onPress: () => router.push(ROUTES.tripTravelers(tripId!)),
            },
            {
                id: 'vehicles',
                label: 'Vehículos',
                icon: 'car-outline',
                onPress: () => router.push(ROUTES.tripVehicles),
            },
        ];

        if (access.canEdit && !access.isCompleted) {
            items.push({
                id: 'edit',
                label: 'Editar viaje',
                icon: 'create-outline',
                onPress: () => router.push(ROUTES.tripEdit(tripId!)),
            });
        }

        if (access.canLeave && !access.isOwner) {
            items.push({
                id: 'leave',
                label: 'Salir del viaje',
                icon: 'exit-outline',
                onPress: () => setLeaveAlertVisible(true),
                destructive: true,
            });
        }

        if (access.canDelete && access.isOwner) {
            items.push({
                id: 'delete',
                label: 'Eliminar viaje',
                icon: 'trash-outline',
                onPress: () => setDeleteAlertVisible(true),
                destructive: true,
            });
        }

        return items;
    }, [access, tripId]);

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="bg-white pt-12 pb-3 px-4 border-b border-neutral/10">
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity
                        onPress={goBack}
                        className="w-10 h-10 rounded-full bg-dark/5 items-center justify-center"
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={20} color="#202020" />
                    </TouchableOpacity>

                    <Title3Semibold className="flex-1 text-center mx-3" numberOfLines={1}>
                        {currentTrip?.name || 'Viaje'}
                    </Title3Semibold>

                    {!access.isGuest ? (
                        <TouchableOpacity
                            onPress={() => setMenuVisible(true)}
                            className="w-10 h-10 rounded-full bg-dark/5 items-center justify-center"
                            activeOpacity={0.7}
                        >
                            <Ionicons name="ellipsis-vertical" size={20} color="#202020" />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }}>
                            {(access.isGuest || access.isCompleted) && (
                                <TripStatusBadge isGuest={access.isGuest} isCompleted={access.isCompleted} variant="compact" />
                            )}
                        </View>
                    )}
                </View>

                {!access.isGuest && (access.isCompleted) && (
                    <View className="flex-row justify-center mt-1">
                        <TripStatusBadge isGuest={false} isCompleted={access.isCompleted} variant="compact" />
                    </View>
                )}
            </View>

            {/* Bottom sheet menú */}
            <TripActionSheet
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                items={menuItems}
            />

            {/* Alerta salir del viaje */}
            <CustomAlert
                visible={leaveAlertVisible}
                title="Salir del viaje"
                message="¿Seguro que quieres salir? Ya no tendrás acceso a este viaje."
                type="warning"
                actions={[
                    { text: 'Cancelar', variant: 'outline', onPress: () => setLeaveAlertVisible(false) },
                    { text: 'Salir', variant: 'danger', onPress: () => { setLeaveAlertVisible(false); handleLeaveTrip(); } },
                ]}
                onClose={() => setLeaveAlertVisible(false)}
            />

            {/* Alerta eliminar viaje */}
            <CustomAlert
                visible={deleteAlertVisible}
                title="Eliminar viaje"
                message={`¿Seguro que quieres eliminar "${currentTrip?.name}"? Esta acción es permanente y no se puede deshacer.`}
                type="warning"
                actions={[
                    { text: 'Cancelar', variant: 'outline', onPress: () => setDeleteAlertVisible(false) },
                    { text: 'Eliminar', variant: 'danger', onPress: () => { setDeleteAlertVisible(false); handleDeleteTrip(); } },
                ]}
                onClose={() => setDeleteAlertVisible(false)}
            />

            {/* Tabs */}
            <MaterialTopTabs
                tabBar={props => <CustomTabBar {...props} />}
                screenOptions={{ swipeEnabled: false }}
            >
                <MaterialTopTabs.Screen name="stops" options={{ title: 'Itinerario' }} initialParams={{ tripId }} />
                <MaterialTopTabs.Screen name="map" options={{ title: 'Mapa' }} initialParams={{ tripId }} />
                <MaterialTopTabs.Screen name="bills" options={{ title: 'Gastos' }} initialParams={{ tripId }} />
                <MaterialTopTabs.Screen name="photos" options={{ title: 'Fotos' }} initialParams={{ tripId }} />
            </MaterialTopTabs>
        </View>
    );
}
