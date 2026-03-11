import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- TUS PROPS ---
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

// --- LOGICA DEL MAPA ---
const LeafletMapImpl: React.FC<MapComponentProps> = ({
  initialRegion,
  markers = [],
  routeCoordinates = [],
}) => {
  const polylinePositions = routeCoordinates.map(c => [c.latitude, c.longitude] as [number, number]);

  const createCustomIcon = (number: number) => {
    return L.divIcon({
      html: `<div style="
        background-color: #4F46E5;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <span style="color: white; font-weight: bold; font-size: 16px;">${number}</span>
      </div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });
  };

  return (
    <View style={styles.container}>
        {/* Inyectar CSS manualmente por seguridad si falla el import */}
        <style type="text/css">{`
           @import url("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
           .leaflet-container { height: 100%; width: 100%; }
         `}</style>

      <MapContainer
        center={[initialRegion.latitude, initialRegion.longitude]}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {polylinePositions.length > 0 && (
          <Polyline 
            positions={polylinePositions} 
            pathOptions={{ color: '#4F46E5', weight: 4 }} 
          />
        )}

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.coordinate.latitude, marker.coordinate.longitude]}
            icon={createCustomIcon(marker.number)}
          >
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <b>{marker.title}</b>
                {marker.description && <><br />{marker.description}</>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400, 
  },
});

// IMPORTANTE: Exportación por defecto para React.lazy
export default LeafletMapImpl;