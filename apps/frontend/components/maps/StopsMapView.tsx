import { Stop } from '@planmyroute/types';
import { Platform, View, ActivityIndicator, Text } from 'react-native';
import { useMemo, useState } from 'react';
import WebView from 'react-native-webview';

export function StopsMapView({ stops, currentTrip }: { stops: Stop[], currentTrip: any }) {
    const [isLoading, setIsLoading] = useState(true);

    // En web, mostrar un componente diferente o placeholder
    if (Platform.OS === 'web') {
        return (
            <View className="flex-1 bg-gray-100 items-center justify-center">
                <Text className="text-gray-600">La vista de mapa no está disponible en web.</Text>
                <Text className="text-sm text-gray-500 mt-2">Por favor, usa la aplicación móvil para ver el mapa.</Text>
            </View>
        );
    }

    // Preparar marcadores desde las paradas
    const markers = useMemo(() => {
        return stops
            .filter(s => s.coordinates)
            .map((stop, idx) => ({
                id: stop.id?.toString(),
                lat: stop.coordinates!.latitude,
                lng: stop.coordinates!.longitude,
                title: stop.name,
                address: stop.address,
                index: idx,
                type: stop.type,
            }));
    }, [stops]);

    // Calcular región inicial del mapa
    const initialBounds = useMemo(() => {
        if (markers.length === 0) {
            return {
                minLat: 40.0,
                maxLat: 41.0,
                minLng: -4.0,
                maxLng: -3.0,
            };
        }

        const latitudes = markers.map(m => m.lat);
        const longitudes = markers.map(m => m.lng);

        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);

        // Agregar margen
        const latMargin = Math.max(maxLat - minLat, 0.05) * 0.2;
        const lngMargin = Math.max(maxLng - minLng, 0.05) * 0.2;

        return {
            minLat: minLat - latMargin,
            maxLat: maxLat + latMargin,
            minLng: minLng - lngMargin,
            maxLng: maxLng + lngMargin,
        };
    }, [markers]);

    // Generar HTML para el mapa con Leaflet
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            * { margin: 0; padding: 0; }
            html, body, #map { height: 100%; width: 100%; }
            .leaflet-popup-content { font-family: system-ui; font-size: 14px; }
            .popup-title { font-weight: bold; margin-bottom: 4px; }
            .popup-address { color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            const map = L.map('map');
            
            // Cargar el tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);

            // Marcadores
            const markers = ${JSON.stringify(markers)};
            
            // Colores por tipo
            const colorMap = {
                'origen': '#FCD34D',      // Amarillo
                'destino': '#10B981',     // Verde
                'parada': '#6366F1'       // Indigo
            };

            // Agregar marcadores
            markers.forEach((marker, idx) => {
                const color = colorMap[marker.type] || '#6366F1';
                const html = \`
                    <div style="background: white; padding: 8px; border-radius: 6px;">
                        <div class="popup-title">\${marker.title}</div>
                        <div class="popup-address">\${marker.address}</div>
                    </div>
                \`;
                
                const markerEl = L.circleMarker([marker.lat, marker.lng], {
                    radius: 10,
                    fillColor: color,
                    color: 'white',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                })
                .addTo(map)
                .bindPopup(html);
            });

            // Ajustar vista al mapa
            if (markers.length > 0) {
                const bounds = L.latLngBounds(
                    markers.map(m => [m.lat, m.lng])
                );
                map.fitBounds(bounds, { padding: [50, 50] });
            } else {
                map.setView([40.4168, -3.7038], 5);
            }

            // Notificar cuando está listo
            window.ReactNativeWebView.postMessage('ready');
        </script>
    </body>
    </html>
    `;

    return (
        <View className="flex-1 bg-white">
            {isLoading && (
                <View className="absolute inset-0 bg-gray-100 items-center justify-center z-50">
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text className="text-gray-600 mt-4">Cargando mapa...</Text>
                </View>
            )}
            <WebView
                style={{ flex: 1 }}
                source={{ html: htmlContent }}
                onLoadEnd={() => setIsLoading(false)}
                scrollEnabled={false}
                bounces={false}
            />
        </View>
    );
}
