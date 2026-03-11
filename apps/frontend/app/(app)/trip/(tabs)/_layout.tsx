import { DropdownMenu, DropdownMenuItem } from '@/components/modals/DropdownMenu';
import { TripStatusBadge } from '@/components/trip/TripStatusBadge';
import { useTripContext } from '@/context/TripContext';
import { useTripPermissions } from '@/hooks/useTripPermissions';
import { useDeleteTrip, useLeaveTrip } from '@/hooks/useTrips';
import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useRouter, withLayoutContext, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
    Alert,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

// --- COMPONENTE DE BARRA PERSONALIZADA ---
function CustomTabBar({ state, descriptors, navigation }: any) {
    const scrollViewRef = useRef<ScrollView>(null);

    // Estados para detectar scroll
    const [contentWidth, setContentWidth] = useState(0);
    const [layoutWidth, setLayoutWidth] = useState(0);
    const [scrollX, setScrollX] = useState(0);

    const isScrollable = contentWidth > layoutWidth;

    // Lógica de visibilidad de flechas
    const showLeftArrow = isScrollable && scrollX > 10;
    const showRightArrow = isScrollable && (scrollX + layoutWidth < contentWidth - 5);

    const scrollLeft = () => {
        scrollViewRef.current?.scrollTo({ x: Math.max(scrollX - 150, 0), animated: true });
    };

    const scrollRight = () => {
        scrollViewRef.current?.scrollTo({ x: Math.min(scrollX + 150, contentWidth - layoutWidth), animated: true });
    };

    return (
        <View className="bg-white border-b border-gray-100 relative h-[70px] justify-center">

            {/* FLECHA IZQUIERDA (Flotante y Transparente) */}
            {showLeftArrow && (
                <View className="absolute left-0 z-20 h-full justify-center pl-1">
                    <TouchableOpacity
                        onPress={scrollLeft}
                        activeOpacity={0.6}
                        className="p-1"
                    >
                        <Ionicons name="chevron-back" size={28} color="#1D1D1B" />
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    alignItems: 'center',
                    height: '100%'
                }}
                onContentSizeChange={(w) => setContentWidth(w)}
                onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
                onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => setScrollX(e.nativeEvent.contentOffset.x)}
                scrollEventThrottle={16}
            >
                {state.routes.map((route: any, index: number) => {
                    const { options } = descriptors[route.key];
                    const label = options.title !== undefined ? options.title : route.name;
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

                    // Iconos según la ruta
                    const getIconName = (routeName: string) => {
                        switch (routeName) {
                            case 'stops': return 'list';
                            case 'map': return 'map-outline';
                            case 'bills': return 'wallet-outline';
                            case 'travelers': return 'people-outline';
                            case 'photos': return 'images-outline';
                            default: return 'help-circle';
                        }
                    };

                    return (
                        <TouchableOpacity
                            key={route.key}
                            onPress={onPress}
                            activeOpacity={0.7}
                            // Diseño de Pastilla: Amarillo si está activo, transparente si no.
                            className={`flex-row items-center px-5 py-3 mr-3 rounded-full ${isFocused ? 'bg-[#FFD64F]' : 'bg-transparent'
                                }`}
                        >
                            <Ionicons
                                name={getIconName(route.name) as any}
                                size={20}
                                color="#1D1D1B"
                            />
                            <Text className="ml-2 text-sm font-bold text-[#1D1D1B] capitalize">
                                {label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* FLECHA DERECHA (Flotante y Transparente) */}
            {showRightArrow && (
                <View className="absolute right-0 z-20 h-full justify-center pr-1">
                    <TouchableOpacity
                        onPress={scrollRight}
                        activeOpacity={0.6}
                        className="p-1"
                    >
                        <Ionicons name="chevron-forward" size={28} color="#1D1D1B" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// --- COMPONENTE PRINCIPAL (LAYOUT) ---
export default function TripTabsLayout() {
    const params = useLocalSearchParams();
    const { currentTrip, tripId: contextTripId, setCurrentTrip, setTripId, access } = useTripContext();
    
    // Obtener tripId de los parámetros o del contexto
    const tripId = (params.tripId as string) || contextTripId;
    
    console.log('🆔 TripTabsLayout - tripId sources:', {
        fromParams: params.tripId,
        fromContext: contextTripId,
        final: tripId
    });
    
    const router = useRouter();
    const [menuVisible, setMenuVisible] = useState(false);

    // Establecer tripId en el contexto si viene de params y no está en contexto
    useEffect(() => {
        if (params.tripId && params.tripId !== contextTripId) {
            console.log('✅ Setting tripId in context:', params.tripId);
            setTripId(params.tripId as string);
        }
    }, [params.tripId, contextTripId, setTripId]);

    // Permisos y Mutaciones
    const permissions = useTripPermissions(tripId);
    const { canEdit, canDelete, isOwner } = permissions;
    const deleteTripMutation = useDeleteTrip();
    const leaveTripMutation = useLeaveTrip();

    const goBack = () => router.back();

    const handleEditTrip = () => {
        router.push(`/trip/edit?tripId=${tripId}`);
    };

    const handleGoToTravelers = () => {
        router.push(`/trip/travelers?tripId=${tripId}`);
    };

    const handleGoToVehicles = () => {
        router.push(`/(app)/trip/vehicles`);
    };

    const handleLeaveTrip = () => {
        Alert.alert('Salir del viaje', '¿Estás seguro de que quieres salir de este viaje?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Salir',
                style: 'destructive',
                onPress: () => leaveTripMutation.mutate(tripId as string, {
                    onSuccess: () => {
                        setCurrentTrip(null);
                        setTripId(null);
                        router.replace('/');
                    }
                })
            }
        ]);
    };

    const handleDeleteTrip = () => {
        Alert.alert('Eliminar viaje', 'Esta acción es permanente y no se puede deshacer.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: () => deleteTripMutation.mutate(tripId as string, {
                    onSuccess: () => {
                        setCurrentTrip(null);
                        setTripId(null);
                        router.replace('/');
                    }
                })
            }
        ]);
    };

    // Configurar items del menú basado en permisos
    const menuItems: DropdownMenuItem[] = useMemo(() => [
        {
            id: 'travelers',
            label: 'Viajeros',
            icon: 'people-outline',
            onPress: handleGoToTravelers,
        },
        {
            id: 'vehicles',
            label: 'Vehículos',
            icon: 'car',
            onPress: handleGoToVehicles,
        },
        {
            id: 'edit',
            label: 'Editar viaje',
            icon: 'create-outline',
            onPress: handleEditTrip,
            show: access.canEdit && !access.isCompleted,
        },
        {
            id: 'leave',
            label: 'Salir del viaje',
            icon: 'log-out-outline',
            onPress: handleLeaveTrip,
            variant: 'destructive',
            show: access.canLeave && !access.isOwner,
        },
        {
            id: 'delete',
            label: 'Eliminar viaje',
            icon: 'trash-outline',
            onPress: handleDeleteTrip,
            variant: 'destructive',
            show: access.canDelete && access.isOwner,
        },
    ], [access, tripId]);

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="bg-white border-b border-gray-100 pt-12 pb-3 px-4 z-10">
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity onPress={goBack} className="p-2">
                        <Ionicons name="arrow-back" size={24} color="#1D1D1B" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-[#1D1D1B] flex-1 text-center" numberOfLines={1}>
                        {currentTrip?.name || 'Viaje'}
                    </Text>
                    {/* Ocultar menú si es guest */}
                    {!access.isGuest ? (
                        <TouchableOpacity onPress={() => setMenuVisible(true)} className="p-2">
                            <Ionicons name="ellipsis-vertical" size={24} color="#1D1D1B" />
                        </TouchableOpacity>
                    ) : (
                        <View className="p-2 w-10" />
                    )}
                </View>
                {/* Badge de estado si es guest o completed */}
                {(access.isGuest || access.isCompleted) && (
                    <View className="flex-row justify-center mt-2">
                        <TripStatusBadge
                            isGuest={access.isGuest}
                            isCompleted={access.isCompleted}
                            variant="compact"
                        />
                    </View>
                )}
            </View>

            {/* Modal Menú */}
            <DropdownMenu
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
                items={menuItems}
                position="top-right"
            />

            {/* TABS (Inyectamos la barra personalizada) */}
            <MaterialTopTabs
                tabBar={props => <CustomTabBar {...props} />}
                screenOptions={{
                    swipeEnabled: false,
                }}
                initialParams={{ tripId }}
            >
                <MaterialTopTabs.Screen 
                    name="stops" 
                    options={{ title: 'Itinerario' }}
                    initialParams={{ tripId }}
                />
                <MaterialTopTabs.Screen 
                    name="map" 
                    options={{ title: 'Mapa' }}
                    initialParams={{ tripId }}
                />
                <MaterialTopTabs.Screen 
                    name="bills" 
                    options={{ title: 'Gastos' }}
                    initialParams={{ tripId }}
                />
                <MaterialTopTabs.Screen 
                    name="photos" 
                    options={{ title: 'Fotos' }}
                    initialParams={{ tripId }}
                />
            </MaterialTopTabs>
        </View>
    );
}