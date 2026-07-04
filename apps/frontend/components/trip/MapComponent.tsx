import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import {
    generateMapHTML,
    MapMarker,
    MapRef,
    MapRegion,
    MapUserLocation,
    PinState,
} from '../maps/mapHtmlGenerator';

export type { MapRef, PinState };

interface MapComponentProps {
    initialRegion: MapRegion;
    markers?: MapMarker[];
    routeCoordinates?: Array<{ latitude: number; longitude: number }>;
    returnRouteCoordinates?: Array<{ latitude: number; longitude: number }>;
    visitedUpToIndex?: number;
    onMarkerPress?: (markerId: string) => void;
    userLocation?: MapUserLocation | null;
}

export const MapComponent = forwardRef<MapRef, MapComponentProps>(({
    initialRegion,
    markers = [],
    routeCoordinates = [],
    returnRouteCoordinates,
    visitedUpToIndex,
    onMarkerPress,
    userLocation,
}, ref) => {
    const webViewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
        recenterTo: (lat: number, lng: number) => {
            webViewRef.current?.injectJavaScript(
                `map.setView([${lat}, ${lng}], map.getZoom()); true;`
            );
        },
    }));

    const mapHtml = generateMapHTML(initialRegion, markers, routeCoordinates, visitedUpToIndex, userLocation, 'webview', returnRouteCoordinates);

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'markerPress' && onMarkerPress) {
                onMarkerPress(data.markerId);
            }
        } catch (e) {
            // ignore
        }
    };

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                source={{ html: mapHtml }}
                style={styles.webView}
                javaScriptEnabled
                domStorageEnabled
                onMessage={handleMessage}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: { flex: 1 },
    webView: { flex: 1 },
});
