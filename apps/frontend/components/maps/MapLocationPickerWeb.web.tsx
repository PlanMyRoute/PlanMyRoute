import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, SubtitleSemibold } from '@/components/customElements/CustomText';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, TouchableOpacity, View } from 'react-native';
import type { MapPickerCoords } from './MapLocationPicker';

function getApiBaseUrl(): string {
    return process.env.EXPO_PUBLIC_API_URL
        || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
}

function buildPickerHtml(centerLat: number, centerLng: number, centerZoom: number, apiBaseUrl: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body,#map { height:100%; width:100%; }
    #search-container { position:absolute; top:10px; left:10px; right:10px; z-index:1000; }
    #search-input {
      width:100%; padding:11px 16px; border:none; border-radius:14px;
      background:#fff; box-shadow:0 2px 12px rgba(0,0,0,0.18);
      font-size:15px; font-family:system-ui,-apple-system,sans-serif;
      outline:none;
    }
    #search-input::placeholder { color:#aaa; }
    #search-results {
      display:none; background:#fff; border-radius:14px;
      box-shadow:0 4px 18px rgba(0,0,0,0.16); margin-top:6px; overflow:hidden;
    }
    .result-item {
      padding:11px 16px; font-size:13px;
      font-family:system-ui,-apple-system,sans-serif; color:#202020;
      border-bottom:1px solid rgba(0,0,0,0.06); cursor:pointer;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .result-item:last-child { border-bottom:none; }
    .result-item:active { background:#f5f5f5; }
    .leaflet-control-attribution { font-size:9px; }

    /* ── User location dot ── */
    .user-dot-wrapper {
      width:40px; height:40px;
      display:flex; align-items:center; justify-content:center; position:relative;
    }
    .user-dot-pulse {
      position:absolute; width:40px; height:40px; border-radius:50%;
      background:rgba(74,144,226,0.25); animation:pulse 2s ease-out infinite;
    }
    .user-dot {
      width:14px; height:14px; background:#4A90E2;
      border:3px solid #fff; border-radius:50%;
      box-shadow:0 2px 6px rgba(74,144,226,0.5); position:relative; z-index:1;
    }
    @keyframes pulse {
      0%  { transform:scale(0.3); opacity:1; }
      100%{ transform:scale(1.5); opacity:0; }
    }
  </style>
</head>
<body>
<div id="map"></div>
<div id="search-container">
  <input id="search-input" type="text" placeholder="Buscar ciudad o lugar..."
         autocomplete="off" autocorrect="off" spellcheck="false"/>
  <div id="search-results"></div>
</div>
<script>
  var map = L.map('map', { zoomControl: true }).setView([${centerLat}, ${centerLng}], ${centerZoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>', maxZoom: 19,
  }).addTo(map);

  function notifyCenter() {
    var c = map.getCenter();
    window.parent.postMessage(JSON.stringify({ type: 'mapMoved', lat: c.lat, lng: c.lng }), '*');
  }

  map.on('moveend', function() { notifyCenter(); });
  map.whenReady(function() {
    notifyCenter();
    window.parent.postMessage(JSON.stringify({ type: 'mapReady' }), '*');
  });

  // Punto de ubicación del usuario — creado/movido por mensajes del padre
  function updateUserDot(lat, lng) {
    if (window._userDot) { window._userDot.setLatLng([lat, lng]); return; }
    var icon = L.divIcon({
      html: '<div class="user-dot-wrapper"><div class="user-dot-pulse"></div><div class="user-dot"></div></div>',
      className: '', iconSize: [40, 40], iconAnchor: [20, 20],
    });
    window._userDot = L.marker([lat, lng], { icon: icon, zIndexOffset: -10 }).addTo(map);
  }

  window.addEventListener('message', function(event) {
    try {
      var msg = JSON.parse(event.data);
      if (msg.type === 'updateUserLocation' && typeof msg.lat === 'number' && typeof msg.lng === 'number') {
        updateUserDot(msg.lat, msg.lng);
        if (msg.flyTo) map.flyTo([msg.lat, msg.lng], 14);
      } else if (msg.type === 'flyToUserLocation' && window._userDot) {
        var ll = window._userDot.getLatLng();
        map.flyTo([ll.lat, ll.lng], 14);
      }
    } catch (e) {}
  });

  var searchTimer = null;
  document.getElementById('search-input').addEventListener('input', function(e) {
    var q = e.target.value.trim();
    clearTimeout(searchTimer);
    if (q.length < 3) { document.getElementById('search-results').style.display = 'none'; return; }
    searchTimer = setTimeout(function() { searchPlaces(q); }, 450);
  });
  document.getElementById('search-input').addEventListener('blur', function() {
    setTimeout(function() { document.getElementById('search-results').style.display = 'none'; }, 200);
  });

  async function searchPlaces(query) {
    try {
      var resp = await fetch(
        '${apiBaseUrl}/api/places/autocomplete?input=' + encodeURIComponent(query) + '&language=es'
      );
      var data = await resp.json();
      renderResults(data.predictions || []);
    } catch(e) { document.getElementById('search-results').style.display = 'none'; }
  }

  function renderResults(results) {
    var container = document.getElementById('search-results');
    container.innerHTML = '';
    if (!results || !results.length) { container.style.display = 'none'; return; }
    results.forEach(function(r) {
      var div = document.createElement('div');
      div.className = 'result-item';
      div.textContent = r.description;
      div.title = r.description;
      div.addEventListener('mousedown', function(e) { e.preventDefault(); });
      div.addEventListener('click', function() {
        try {
          var decoded = JSON.parse(atob(r.place_id));
          map.flyTo([parseFloat(decoded.lat), parseFloat(decoded.lng)], 14);
        } catch(e) {}
        document.getElementById('search-input').value = r.description;
        container.style.display = 'none';
      });
      container.appendChild(div);
    });
    container.style.display = 'block';
  }
</script>
</body>
</html>`;
}

type Props = {
    visible: boolean;
    initialLocation?: MapPickerCoords | null;
    onLocationSelect: (coords: MapPickerCoords, address?: string) => void;
    onClose: () => void;
};

export function MapLocationPickerWeb({ visible, initialLocation, onLocationSelect, onClose }: Props) {
    const [coords, setCoords] = useState<MapPickerCoords>({
        latitude: initialLocation?.latitude ?? 40.4168,
        longitude: initialLocation?.longitude ?? -3.7038,
    });
    const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
    const [geoLoading, setGeoLoading] = useState(false);
    const [hasUserLocation, setHasUserLocation] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const mapReadyRef = useRef(false);
    const userCoordsRef = useRef<MapPickerCoords | null>(null);
    const initialLocationRef = useRef(initialLocation);

    useEffect(() => { initialLocationRef.current = initialLocation; }, [initialLocation]);

    const sendToMap = (message: Record<string, unknown>) => {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify(message), '*');
    };

    useEffect(() => {
        if (!visible) return;

        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'mapMoved' && typeof data.lat === 'number' && typeof data.lng === 'number') {
                    const newCoords: MapPickerCoords = { latitude: data.lat, longitude: data.lng };
                    setCoords(newCoords);
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    setGeoLoading(true);
                    debounceRef.current = setTimeout(async () => {
                        try {
                            const res = await fetch(`${getApiBaseUrl()}/api/places/reverse?lat=${data.lat}&lng=${data.lng}`);
                            const json = await res.json();
                            setResolvedAddress(json.address ?? null);
                        } catch {
                            setResolvedAddress(null);
                        } finally {
                            setGeoLoading(false);
                        }
                    }, 600);
                } else if (data.type === 'mapReady') {
                    mapReadyRef.current = true;
                    if (userCoordsRef.current) {
                        sendToMap({
                            type: 'updateUserLocation',
                            lat: userCoordsRef.current.latitude,
                            lng: userCoordsRef.current.longitude,
                            flyTo: !initialLocationRef.current,
                        });
                    }
                }
            } catch {
                // ignore non-JSON messages
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [visible]);

    // Solicitar GPS al abrir el picker — igual que hace el picker nativo —
    // para pintar el punto de ubicación del usuario y permitir centrar el mapa en él.
    useEffect(() => {
        if (!visible) {
            mapReadyRef.current = false;
            userCoordsRef.current = null;
            setHasUserLocation(false);
            return;
        }

        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const gpsCoords: MapPickerCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                userCoordsRef.current = gpsCoords;
                setHasUserLocation(true);
                if (mapReadyRef.current) {
                    sendToMap({
                        type: 'updateUserLocation',
                        lat: gpsCoords.latitude,
                        lng: gpsCoords.longitude,
                        flyTo: !initialLocationRef.current,
                    });
                }
            } catch {
                // GPS no disponible — el mapa se queda en initialLocation o la posición por defecto
            }
        })();
    }, [visible]);

    const handleConfirm = () => {
        onLocationSelect(coords, resolvedAddress ?? undefined);
        onClose();
    };

    const handleCenterOnUser = () => {
        sendToMap({ type: 'flyToUserLocation' });
    };

    if (!visible) return null;

    const centerLat = initialLocation?.latitude ?? 40.4168;
    const centerLng = initialLocation?.longitude ?? -3.7038;
    const centerZoom = initialLocation ? 14 : 5;
    const mapHtml = buildPickerHtml(centerLat, centerLng, centerZoom, getApiBaseUrl());

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                {/* Header */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
                    borderBottomWidth: 1, borderBottomColor: 'rgba(153,153,153,0.15)',
                }}>
                    <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ padding: 4 }}>
                        <Ionicons name="close" size={24} color="#202020" />
                    </TouchableOpacity>
                    <SubtitleSemibold>Elige en el mapa</SubtitleSemibold>
                    <View style={{ width: 32 }} />
                </View>

                {/* Map with fixed crosshair overlay */}
                <View style={{ flex: 1, position: 'relative' }}>
                    <iframe
                        ref={iframeRef}
                        srcDoc={mapHtml}
                        style={{ width: '100%', height: '100%', border: 'none' } as React.CSSProperties}
                        title="Map picker"
                    />
                    {hasUserLocation && (
                        <TouchableOpacity
                            onPress={handleCenterOnUser}
                            activeOpacity={0.8}
                            style={{
                                position: 'absolute', right: 16, bottom: 16,
                                width: 44, height: 44, borderRadius: 22,
                                backgroundColor: '#fff',
                                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.15, shadowRadius: 4,
                                alignItems: 'center', justifyContent: 'center',
                                zIndex: 1000,
                            }}
                        >
                            <Ionicons name="navigate" size={22} color="#FFD54D" />
                        </TouchableOpacity>
                    )}
                    <View style={{
                        position: 'absolute',
                        left: '50%' as any,
                        top: '50%' as any,
                        transform: [{ translateX: -14 }, { translateY: -38 }],
                        zIndex: 1000,
                        pointerEvents: 'none' as any,
                    }}>
                        <img
                            src="data:image/svg+xml,%3Csvg viewBox='0 0 28 40' width='28' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14 0C6.3 0 0 6.3 0 14C0 24.5 14 40 14 40C14 40 28 24.5 28 14C28 6.3 21.7 0 14 0Z' fill='%23FFD54D' stroke='%23fff' stroke-width='2.5'/%3E%3Ccircle cx='14' cy='13' r='5.5' fill='rgba(0,0,0,0.18)'/%3E%3C/svg%3E"
                            alt=""
                            style={{ display: 'block' } as any}
                        />
                    </View>
                </View>

                {/* Bottom panel */}
                <View style={{
                    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28,
                    backgroundColor: '#fff',
                    borderTopWidth: 1, borderTopColor: 'rgba(153,153,153,0.1)',
                    gap: 10,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 20 }}>
                        {geoLoading
                            ? <ActivityIndicator size="small" color="#FFD54D" />
                            : <Ionicons name="location" size={16} color="#FFD54D" />
                        }
                        <MicrotextDark style={{ flex: 1, color: geoLoading ? '#999999' : '#202020' }}>
                            {geoLoading
                                ? 'Localizando...'
                                : (resolvedAddress ?? 'Mueve el mapa para seleccionar la ubicación')}
                        </MicrotextDark>
                    </View>
                    <CustomButton
                        variant="primary"
                        title="Confirmar ubicación"
                        onPress={handleConfirm}
                    />
                </View>
            </View>
        </Modal>
    );
}
