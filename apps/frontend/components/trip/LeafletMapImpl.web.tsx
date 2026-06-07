import React from 'react';
import { View, StyleSheet } from 'react-native';

interface MapComponentProps {
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  markers?: Array<{
    id: string;
    coordinate: { latitude: number; longitude: number };
    title: string;
    description?: string;
    number: number;
  }>;
  routeCoordinates?: Array<{ latitude: number; longitude: number }>;
}

function buildMapHtml(
  initialRegion: MapComponentProps['initialRegion'],
  markers: NonNullable<MapComponentProps['markers']>,
  routeCoordinates: NonNullable<MapComponentProps['routeCoordinates']>,
): string {
  const markersJS = markers
    .filter(m => m.coordinate.latitude && m.coordinate.longitude)
    .map((m, idx) => {
      const escapedTitle = m.title.replace(/'/g, "\\'").replace(/"/g, '\\"');
      const escapedDesc = (m.description ?? '').replace(/'/g, "\\'").replace(/"/g, '\\"');
      return `
        var icon${idx} = L.divIcon({
          html: '<div style="background:#4F46E5;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><span style="color:white;font-weight:bold;font-size:16px;">${m.number}</span></div>',
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -18]
        });
        L.marker([${m.coordinate.latitude}, ${m.coordinate.longitude}], { icon: icon${idx} })
          .addTo(map)
          .bindPopup('<b>${escapedTitle}</b>${m.description ? '<br>' + escapedDesc : ''}');
      `;
    })
    .join('\n');

  let routeJS = '';
  if (routeCoordinates.length > 1) {
    const coords = JSON.stringify(routeCoordinates.map(c => [c.latitude, c.longitude]));
    routeJS = `
      var poly = L.polyline(${coords}, { color: '#4F46E5', weight: 4 }).addTo(map);
      map.fitBounds(poly.getBounds(), { padding: [50, 50] });
    `;
  }

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
  </script>
</body>
</html>`;
}

const LeafletMapImpl: React.FC<MapComponentProps> = ({
  initialRegion,
  markers = [],
  routeCoordinates = [],
}) => {
  const html = buildMapHtml(initialRegion, markers, routeCoordinates);

  return (
    <View style={styles.container}>
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' } as React.CSSProperties}
        title="Map"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400,
  },
});

export default LeafletMapImpl;
