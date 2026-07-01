/**
 * Stub nativo para LeafletMapImpl.
 * En web se usa LeafletMapImpl.web.tsx con la implementacion real de Leaflet.
 * Este archivo solo existe para satisfacer la resolucion de modulos de TypeScript.
 */
import { forwardRef } from "react";
import { View } from "react-native";
import type {
  MapRef,
  MapRegion,
  MapMarker,
  MapUserLocation,
} from "../maps/mapHtmlGenerator";

interface MapComponentProps {
  initialRegion: MapRegion;
  markers?: MapMarker[];
  routeCoordinates?: Array<{ latitude: number; longitude: number }>;
  visitedUpToIndex?: number;
  onMarkerPress?: (markerId: string) => void;
  userLocation?: MapUserLocation | null;
}

const LeafletMapImpl = forwardRef<MapRef, MapComponentProps>((_props, _ref) => {
  // Leaflet no esta disponible en plataformas nativas
  return <View />;
});

LeafletMapImpl.displayName = "LeafletMapImpl";

export default LeafletMapImpl;
