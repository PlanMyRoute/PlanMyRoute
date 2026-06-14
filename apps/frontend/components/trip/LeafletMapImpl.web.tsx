import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
    generateMapHTML,
    MapMarker,
    MapRef,
    MapRegion,
    MapUserLocation,
} from '../maps/mapHtmlGenerator';

interface MapComponentProps {
    initialRegion: MapRegion;
    markers?: MapMarker[];
    routeCoordinates?: Array<{ latitude: number; longitude: number }>;
    visitedUpToIndex?: number;
    onMarkerPress?: (markerId: string) => void;
    userLocation?: MapUserLocation | null;
}

const LeafletMapImpl = forwardRef<MapRef, MapComponentProps>(({
    initialRegion,
    markers = [],
    routeCoordinates = [],
    visitedUpToIndex,
    onMarkerPress,
    userLocation,
}, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useImperativeHandle(ref, () => ({
        recenterTo: (lat: number, lng: number) => {
            iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ type: 'recenterTo', lat, lng }),
                '*'
            );
        },
    }));

    useEffect(() => {
        if (!onMarkerPress) return;
        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'markerPress' && typeof data.markerId === 'string') {
                    onMarkerPress(data.markerId);
                }
            } catch {
                // ignore non-JSON messages from other sources
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onMarkerPress]);

    const html = generateMapHTML(initialRegion, markers, routeCoordinates, visitedUpToIndex, userLocation, 'iframe');

    return (
        <View style={styles.container}>
            <iframe
                ref={iframeRef}
                srcDoc={html}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' } as React.CSSProperties}
                title="Map"
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: 400,
    },
});

export default LeafletMapImpl;
