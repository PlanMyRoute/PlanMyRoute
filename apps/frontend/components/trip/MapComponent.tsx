import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export type PinState = 'standard' | 'visited' | 'next' | 'future';

export interface MapRef {
    recenterTo: (lat: number, lng: number) => void;
}

interface Marker {
    id: string;
    coordinate: { latitude: number; longitude: number };
    title: string;
    description?: string;
    number: number;
    pinState?: PinState;
    segment?: string;
}

interface MapComponentProps {
    initialRegion: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    markers?: Marker[];
    routeCoordinates?: Array<{ latitude: number; longitude: number }>;
    visitedUpToIndex?: number;
    onMarkerPress?: (markerId: string) => void;
    userLocation?: { lat: number; lng: number } | null;
}

export const MapComponent = forwardRef<MapRef, MapComponentProps>(({
    initialRegion,
    markers = [],
    routeCoordinates = [],
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

    const mapHtml = generateMapHTML(initialRegion, markers, routeCoordinates, visitedUpToIndex, userLocation);

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

// Colores y tamaños por estado del pin (paradas de viaje)
function pinConfig(state: PinState): { bg: string; text: string; w: number; h: number } {
    switch (state) {
        case 'visited': return { bg: '#999999', text: '#FFFFFF', w: 24, h: 30 };
        case 'next':    return { bg: '#FFD54D', text: '#202020', w: 34, h: 42 };
        case 'future':  return { bg: '#202020', text: '#FFD54D', w: 28, h: 36 };
        default:        return { bg: '#202020', text: '#FFD54D', w: 28, h: 36 };
    }
}

// Color e icono por segmento de evento (Ticketmaster)
function segmentPinConfig(segment: string): { bg: string; icon: string } {
    switch (segment) {
        case 'Music':           return { bg: '#FFD54D', icon: '&#9835;' };
        case 'Sports':          return { bg: '#4A90E2', icon: '&#9917;' };
        case 'Arts & Theatre':  return { bg: '#9B59B6', icon: '&#127914;' };
        case 'Film':            return { bg: '#E74C3C', icon: '&#127916;' };
        default:                return { bg: '#202020', icon: '&#9733;' };
    }
}

function generateMapHTML(
    initialRegion: MapComponentProps['initialRegion'],
    markers: Marker[],
    routeCoordinates: Array<{ latitude: number; longitude: number }>,
    visitedUpToIndex?: number,
    userLocation?: { lat: number; lng: number } | null,
): string {
    const markersJS = markers
        .filter(m => m.coordinate.latitude && m.coordinate.longitude)
        .map((m, idx) => {
            let pinHtml: string;
            let pinW: number;
            let pinH: number;

            if (m.segment) {
                const segCfg = segmentPinConfig(m.segment);
                const textColor = m.segment === 'Music' ? '#202020' : '#FFFFFF';
                pinW = 32; pinH = 38;
                pinHtml = `
                <div style="
                    width:32px;height:38px;position:relative;
                    background:${segCfg.bg};
                    border-radius:50% 50% 50% 0;
                    transform:rotate(-45deg);
                    border:2px solid #FFFFFF;
                    box-shadow:0 2px 8px rgba(0,0,0,0.35);
                ">
                    <span style="
                        position:absolute;top:50%;left:50%;
                        transform:translate(-50%,-50%) rotate(45deg);
                        color:${textColor};font-size:14px;line-height:1;
                    ">${segCfg.icon}</span>
                </div>`;
            } else {
                const cfg = pinConfig(m.pinState ?? 'standard');
                const fontSize = cfg.w <= 24 ? 10 : cfg.w <= 28 ? 11 : 13;
                const borderWidth = m.pinState === 'next' ? 3 : 2;
                const borderColor = m.pinState === 'next' ? '#202020' : '#FFFFFF';
                pinW = cfg.w; pinH = cfg.h;
                pinHtml = `
                <div style="
                    width:${cfg.w}px;height:${cfg.h}px;position:relative;
                    background:${cfg.bg};
                    border-radius:50% 50% 50% 0;
                    transform:rotate(-45deg);
                    border:${borderWidth}px solid ${borderColor};
                    box-shadow:0 2px 8px rgba(0,0,0,0.3);
                ">
                    <span style="
                        position:absolute;top:50%;left:50%;
                        transform:translate(-50%,-50%) rotate(45deg);
                        color:${cfg.text};font-size:${fontSize}px;font-weight:700;
                        font-family:sans-serif;line-height:1;
                    ">${m.number}</span>
                </div>`;
            }

            const escapedPin = pinHtml.replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/\n\s*/g, '');
            const escapedTitle = m.title.replace(/'/g, "\\'").replace(/"/g, '\\"');
            const escapedDesc = (m.description || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
            const iconAnchorX = Math.round(pinW / 2);

            return `
                var icon${idx} = L.divIcon({
                    html: \`${escapedPin}\`,
                    className: '',
                    iconSize: [${pinW}, ${pinH}],
                    iconAnchor: [${iconAnchorX}, ${pinH}],
                    popupAnchor: [0, -${pinH}]
                });
                var marker${idx} = L.marker(
                    [${m.coordinate.latitude}, ${m.coordinate.longitude}],
                    { icon: icon${idx} }
                ).addTo(map);
                marker${idx}.on('click', function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerPress',markerId:'${m.id}'}));
                });
            `;
        })
        .join('\n');

    let routeJS = '';
    if (routeCoordinates.length > 1) {
        const allCoords = JSON.stringify(routeCoordinates.map(c => [c.latitude, c.longitude]));
        if (visitedUpToIndex !== undefined && visitedUpToIndex > 0 && visitedUpToIndex < routeCoordinates.length) {
            const visitedCoords = JSON.stringify(routeCoordinates.slice(0, visitedUpToIndex + 1).map(c => [c.latitude, c.longitude]));
            const futureCoords = JSON.stringify(routeCoordinates.slice(visitedUpToIndex).map(c => [c.latitude, c.longitude]));
            routeJS = `
                L.polyline(${visitedCoords}, {color:'#999999',weight:4,opacity:0.7}).addTo(map);
                var futureLine = L.polyline(${futureCoords}, {color:'#202020',weight:4}).addTo(map);
                map.fitBounds(L.polyline(${allCoords}).getBounds(), {padding:[50,50]});
            `;
        } else {
            routeJS = `
                var polyline = L.polyline(${allCoords}, {color:'#202020',weight:4}).addTo(map);
                map.fitBounds(polyline.getBounds(), {padding:[50,50]});
            `;
        }
    }

    // Render user location dot directly from native coords (watchPosition unreliable in WebView)
    const userLocationJS = userLocation
        ? `
            var userIcon = L.divIcon({
                html: '<div class="user-dot"></div>',
                className: '',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });
            L.marker([${userLocation.lat}, ${userLocation.lng}], { icon: userIcon }).addTo(map);
        `
        : '';

    const zoom = Math.max(1, 12 - Math.log2(Math.max(initialRegion.latitudeDelta, 0.001)));

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body,html{margin:0;padding:0;height:100%;width:100%}
    #map{height:100%;width:100%}
    .user-dot{
      width:12px;height:12px;
      background:#3B82F6;
      border-radius:50%;
      border:2px solid #FFFFFF;
      box-shadow:0 0 0 3px rgba(59,130,246,0.25);
      animation:pulse 2s infinite;
    }
    @keyframes pulse{
      0%{box-shadow:0 0 0 3px rgba(59,130,246,0.25)}
      50%{box-shadow:0 0 0 7px rgba(59,130,246,0.08)}
      100%{box-shadow:0 0 0 3px rgba(59,130,246,0.25)}
    }
    .leaflet-popup-content{font-size:14px;font-family:sans-serif}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${initialRegion.latitude},${initialRegion.longitude}],${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap',maxZoom:19
    }).addTo(map);
    ${markersJS}
    ${routeJS}
    ${userLocationJS}
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    webView: { flex: 1 },
});
