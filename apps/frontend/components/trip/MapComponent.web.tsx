import React, { Suspense, useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

// Definimos los tipos aquí también para que TS no se queje
interface MapComponentProps {
  initialRegion: any;
  markers?: any[];
  routeCoordinates?: any[];
}

// AQUÍ ESTÁ EL TRUCO:
// Cargamos el archivo de implementación SOLO cuando se necesita.
// Al usar import() dinámico, Metro no ejecuta el código de Leaflet durante el build.
const LeafletMapLazy = React.lazy(() => import('./LeafletMapImpl'));

export const MapComponent: React.FC<MapComponentProps> = (props) => {
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
      <LeafletMapLazy {...props} />
    </Suspense>
  );
};