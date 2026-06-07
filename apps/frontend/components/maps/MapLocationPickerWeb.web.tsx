import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, SubtitleSemibold } from '@/components/customElements/CustomText';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, TouchableOpacity, View } from 'react-native';
import type { MapPickerCoords } from './MapLocationPicker';

function getApiBaseUrl(): string {
    return process.env.EXPO_PUBLIC_API_URL
        || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
}

function buildPickerHtml(centerLat: number, centerLng: number, centerZoom: number): string {
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
  map.whenReady(function() { notifyCenter(); });

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
        'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(query) +
        '&format=json&limit=6&addressdetails=0', { headers: { 'Accept-Language': 'es' } }
      );
      var data = await resp.json();
      renderResults(data);
    } catch(e) { document.getElementById('search-results').style.display = 'none'; }
  }

  function renderResults(results) {
    var container = document.getElementById('search-results');
    container.innerHTML = '';
    if (!results || !results.length) { container.style.display = 'none'; return; }
    results.forEach(function(r) {
      var div = document.createElement('div');
      div.className = 'result-item';
      div.textContent = r.display_name;
      div.title = r.display_name;
      div.addEventListener('mousedown', function(e) { e.preventDefault(); });
      div.addEventListener('click', function() {
        map.flyTo([parseFloat(r.lat), parseFloat(r.lon)], 14);
        document.getElementById('search-input').value = r.display_name;
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
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const handleConfirm = () => {
        onLocationSelect(coords, resolvedAddress ?? undefined);
        onClose();
    };

    if (!visible) return null;

    const centerLat = initialLocation?.latitude ?? 40.4168;
    const centerLng = initialLocation?.longitude ?? -3.7038;
    const centerZoom = initialLocation ? 14 : 5;
    const mapHtml = buildPickerHtml(centerLat, centerLng, centerZoom);

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
                        srcDoc={mapHtml}
                        style={{ width: '100%', height: '100%', border: 'none' } as React.CSSProperties}
                        title="Map picker"
                    />
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
