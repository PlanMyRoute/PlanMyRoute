import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface MapComponentProps {
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  markers?: Array<{
    id: string;
    coordinate: {
      latitude: number;
      longitude: number;
    };
    title: string;
    description?: string;
    number: number;
  }>;
  routeCoordinates?: Array<{
    latitude: number;
    longitude: number;
  }>;
  onMarkerPress?: (markerId: string) => void;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  initialRegion,
  markers = [],
  routeCoordinates = [],
  onMarkerPress,
}) => {
  // Usar siempre WebView con Leaflet para compatibilidad con Expo Go
  const mapHtml = generateMapHTML(initialRegion, markers, routeCoordinates);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerPress' && onMarkerPress) {
        onMarkerPress(data.markerId);
      }
    } catch (error) {
      console.log('Error parsing message from map:', error);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: mapHtml }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
      />
    </View>
  );
};

function generateMapHTML(
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
  markers: Array<{ id: string; coordinate: { latitude: number; longitude: number }; title: string; description?: string; number: number }>,
  routeCoordinates: Array<{ latitude: number; longitude: number }>
): string {
  // Agrupar marcadores por ubicación (con tolerancia de 0.0001)
  const COORDINATE_TOLERANCE = 0.0001;
  const groupedMarkers = new Map<string, typeof markers>();

  markers.forEach((marker) => {
    const key = `${Math.round(marker.coordinate.latitude / COORDINATE_TOLERANCE) * COORDINATE_TOLERANCE},${Math.round(marker.coordinate.longitude / COORDINATE_TOLERANCE) * COORDINATE_TOLERANCE}`;
    if (!groupedMarkers.has(key)) {
      groupedMarkers.set(key, []);
    }
    groupedMarkers.get(key)!.push(marker);
  });

  // Generar HTML para marcadores agrupados
  const markersJS = Array.from(groupedMarkers.values())
    .map((group, idx) => {
      const firstMarker = group[0];
      const isCluster = group.length > 1;
      
      // Crear popup con todos los eventos como enlaces clickeables
      let popupContent: string;
      if (isCluster) {
        popupContent = `<div><b>${group.length} eventos en esta ubicación:</b><br><br>${group.map(m => `<a href="javascript:void(0)" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: 'markerPress', markerId: '${m.id}'}))" style="color: #4F46E5; text-decoration: none; display: block; margin: 5px 0; padding: 5px; border-radius: 4px; background: #f0f0f0;"><b>${m.title}</b><br><small style="color: #888;">${m.description || ''}</small></a>`).join('')}</div>`;
      } else {
        popupContent = `<a href="javascript:void(0)" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: 'markerPress', markerId: '${firstMarker.id}'}))" style="color: #4F46E5; text-decoration: none; display: block; padding: 5px; border-radius: 4px; background: #f0f0f0;"><b>${firstMarker.title}</b>${firstMarker.description ? '<br><small style="color: #888;">' + firstMarker.description + '</small>' : ''}</a>`;
      }

      return `
        var marker${idx} = L.marker([${firstMarker.coordinate.latitude}, ${firstMarker.coordinate.longitude}], {
          icon: L.divIcon({
            html: '<div class="custom-marker"><span>${isCluster ? group.length : firstMarker.number}</span></div>',
            className: 'custom-marker-container',
            iconSize: [36, 36]
          })
        }).addTo(map);
        marker${idx}.bindPopup("${popupContent.replace(/"/g, '\\"').replace(/\n/g, ' ')}");
      `;
    })
    .join('\n');

  const routeJS =
    routeCoordinates.length > 0
      ? `
        var routeCoords = ${JSON.stringify(routeCoordinates.map(c => [c.latitude, c.longitude]))};
        var polyline = L.polyline(routeCoords, {color: '#4F46E5', weight: 4}).addTo(map);
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      `
      : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
        }
        #map {
          height: 100%;
          width: 100%;
        }
        .custom-marker-container {
          background: transparent;
          border: none;
        }
        .custom-marker {
          background: #4F46E5;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .custom-marker span {
          color: white;
          font-weight: bold;
          font-size: 16px;
        }
        .leaflet-popup-content {
          max-height: 300px;
          overflow-y: auto;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([${initialRegion.latitude}, ${initialRegion.longitude}], ${12 - Math.log2(initialRegion.latitudeDelta)});
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        ${markersJS}
        ${routeJS}
      </script>
    </body>
    </html>
  `;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
});
