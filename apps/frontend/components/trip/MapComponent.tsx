import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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
}

export const MapComponent: React.FC<MapComponentProps> = ({
  initialRegion,
  markers = [],
  routeCoordinates = [],
}) => {
  // Usar siempre WebView con Leaflet para compatibilidad con Expo Go
  const mapHtml = generateMapHTML(initialRegion, markers, routeCoordinates);
  
  return (
    <View style={styles.container}>
      <WebView
        source={{ html: mapHtml }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};

function generateMapHTML(
  initialRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
  markers: Array<{ id: string; coordinate: { latitude: number; longitude: number }; title: string; description?: string; number: number }>,
  routeCoordinates: Array<{ latitude: number; longitude: number }>
): string {
  const markersJS = markers
    .map((marker, idx) => {
      return `
        var marker${idx} = L.marker([${marker.coordinate.latitude}, ${marker.coordinate.longitude}], {
          icon: L.divIcon({
            html: '<div class="custom-marker"><span>${marker.number}</span></div>',
            className: 'custom-marker-container',
            iconSize: [36, 36]
          })
        }).addTo(map);
        marker${idx}.bindPopup("<b>${marker.title}</b>${marker.description ? '<br>' + marker.description : ''}");
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
