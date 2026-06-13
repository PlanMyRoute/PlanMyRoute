import React, { forwardRef, Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { MapMarker, MapRef, MapRegion, MapUserLocation } from '../maps/mapHtmlGenerator';

interface MapComponentProps {
    initialRegion: MapRegion;
    markers?: MapMarker[];
    routeCoordinates?: Array<{ latitude: number; longitude: number }>;
    visitedUpToIndex?: number;
    onMarkerPress?: (markerId: string) => void;
    userLocation?: MapUserLocation | null;
}

// Cargamos el archivo de implementación SOLO cuando se necesita.
// Al usar import() dinámico, Metro/Expo no ejecutan el código de Leaflet
// (que toca `window`/`document`) durante el build estático (SSR/export).
//
// React.lazy's TS types drop ref support (ComponentPropsWithoutRef), even though
// refs DO resolve correctly at runtime through a forwardRef-wrapped lazy component —
// this cast restores the ref typing so MapRef (recenterTo) keeps working on web.
const LeafletMapLazy = React.lazy(() => import('./LeafletMapImpl')) as unknown as React.ForwardRefExoticComponent<
    MapComponentProps & React.RefAttributes<MapRef>
>;

export const MapComponent = forwardRef<MapRef, MapComponentProps>((props, ref) => {
    // Aseguramos que solo renderizamos en el cliente (navegador)
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <Suspense fallback={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text>Cargando mapa...</Text>
            </View>
        }>
            <LeafletMapLazy ref={ref} {...props} />
        </Suspense>
    );
});
