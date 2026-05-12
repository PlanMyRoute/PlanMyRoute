import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, SubtitleSemibold, TextRegular } from '@/components/customElements/CustomText';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    TouchableOpacity,
    View,
} from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

export type MapPickerCoords = { latitude: number; longitude: number };

type MapLocationPickerProps = {
    visible: boolean;
    /** Coordinates of the already-selected address — pin will start here */
    initialLocation?: MapPickerCoords | null;
    /** User's real GPS position — shown as a blue pulsing dot */
    userLocation?: MapPickerCoords | null;
    onLocationSelect: (coords: MapPickerCoords) => void;
    onClose: () => void;
};

// Fallback when neither an initial location nor GPS is available
const DEFAULT_LAT = 40.4168;
const DEFAULT_LNG = -3.7038;
const DEFAULT_ZOOM = 5;
const LOCATION_ZOOM = 14;

function buildMapHtml(
    pinLat: number,
    pinLng: number,
    pinZoom: number,
    userLat: number | null,
    userLng: number | null,
): string {
    const userMarkerScript = (userLat !== null && userLng !== null)
        ? `
  var userDotIcon = L.divIcon({
    html: '<div class="user-dot-wrapper"><div class="user-dot-pulse"></div><div class="user-dot"></div></div>',
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
  L.marker([${userLat}, ${userLng}], { icon: userDotIcon, zIndexOffset: -10 }).addTo(map);
`
        : '';

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

    /* ── Selected-location pin (teardrop SVG) ── */
    .pin-svg { display:block; }

    /* ── User location dot ── */
    .user-dot-wrapper {
      width:40px; height:40px;
      display:flex; align-items:center; justify-content:center;
      position:relative;
    }
    .user-dot-pulse {
      position:absolute;
      width:40px; height:40px;
      border-radius:50%;
      background:rgba(74,144,226,0.25);
      animation:pulse 2s ease-out infinite;
    }
    .user-dot {
      width:14px; height:14px;
      background:#4A90E2;
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 2px 6px rgba(74,144,226,0.5);
      position:relative; z-index:1;
    }
    @keyframes pulse {
      0%  { transform:scale(0.3); opacity:1; }
      100%{ transform:scale(1.5); opacity:0; }
    }

    /* ── Search overlay ── */
    #search-container {
      position:absolute;
      top:10px; left:10px; right:10px;
      z-index:1000;
    }
    #search-input {
      width:100%;
      padding:11px 16px;
      border:none;
      border-radius:14px;
      background:#fff;
      box-shadow:0 2px 12px rgba(0,0,0,0.18);
      font-size:15px;
      font-family:system-ui,-apple-system,sans-serif;
      outline:none;
      -webkit-appearance:none;
    }
    #search-input::placeholder { color:#aaa; }
    #search-results {
      display:none;
      background:#fff;
      border-radius:14px;
      box-shadow:0 4px 18px rgba(0,0,0,0.16);
      margin-top:6px;
      overflow:hidden;
    }
    .result-item {
      padding:11px 16px;
      font-size:13px;
      font-family:system-ui,-apple-system,sans-serif;
      color:#202020;
      border-bottom:1px solid rgba(0,0,0,0.06);
      cursor:pointer;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .result-item:last-child { border-bottom:none; }
    .result-item:active, .result-item.hover { background:#f5f5f5; }

    /* Hide Leaflet attribution to save space */
    .leaflet-control-attribution { font-size:9px; }
  </style>
</head>
<body>
<div id="map"></div>

<!-- Search bar overlay -->
<div id="search-container">
  <input
    id="search-input"
    type="text"
    placeholder="Buscar ciudad o lugar..."
    autocomplete="off"
    autocorrect="off"
    spellcheck="false"
  />
  <div id="search-results"></div>
</div>

<script>
  // ── Map init ────────────────────────────────────────────────────────────
  var map = L.map('map', { zoomControl: true }).setView([${pinLat}, ${pinLng}], ${pinZoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 19,
  }).addTo(map);

  // ── Selected-location pin (yellow teardrop SVG) ─────────────────────────
  var pinSvg =
    '<svg viewBox="0 0 28 40" width="28" height="40" xmlns="http://www.w3.org/2000/svg" class="pin-svg">' +
      '<path d="M14 0C6.3 0 0 6.3 0 14C0 24.5 14 40 14 40C14 40 28 24.5 28 14C28 6.3 21.7 0 14 0Z" fill="#FFD54D" stroke="#fff" stroke-width="2.5"/>' +
      '<circle cx="14" cy="13" r="5.5" fill="rgba(0,0,0,0.18)"/>' +
    '</svg>';

  var pinIcon = L.divIcon({
    html: pinSvg,
    className: '',
    iconSize: [28, 40],
    iconAnchor: [14, 40],   // tip of the teardrop
    popupAnchor: [0, -42],
  });

  var selectedMarker = L.marker([${pinLat}, ${pinLng}], {
    icon: pinIcon,
    draggable: true,
  }).addTo(map);

  // ── User location dot (blue, fixed) ────────────────────────────────────
  ${userMarkerScript}

  // ── Notify React Native of the selected position ────────────────────────
  function notifyPosition(lat, lng) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'location', lat: lat, lng: lng }));
  }

  // Map click → move pin
  map.on('click', function(e) {
    selectedMarker.setLatLng(e.latlng);
    notifyPosition(e.latlng.lat, e.latlng.lng);
    document.getElementById('search-results').style.display = 'none';
  });

  // Marker drag
  selectedMarker.on('dragend', function() {
    var pos = selectedMarker.getLatLng();
    notifyPosition(pos.lat, pos.lng);
  });

  // Notify initial position once ready
  map.whenReady(function() {
    notifyPosition(${pinLat}, ${pinLng});
  });

  // ── Search (Nominatim, debounced) ────────────────────────────────────────
  var searchTimer = null;

  document.getElementById('search-input').addEventListener('input', function(e) {
    var q = e.target.value.trim();
    clearTimeout(searchTimer);
    if (q.length < 3) {
      document.getElementById('search-results').style.display = 'none';
      return;
    }
    searchTimer = setTimeout(function() { searchPlaces(q); }, 450);
  });

  // Hide results when input is cleared
  document.getElementById('search-input').addEventListener('blur', function() {
    setTimeout(function() {
      document.getElementById('search-results').style.display = 'none';
    }, 200);
  });

  async function searchPlaces(query) {
    try {
      var resp = await fetch(
        'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(query) +
        '&format=json&limit=6&addressdetails=0',
        { headers: { 'Accept-Language': 'es' } }
      );
      var data = await resp.json();
      renderResults(data);
    } catch(e) {
      document.getElementById('search-results').style.display = 'none';
    }
  }

  function renderResults(results) {
    var container = document.getElementById('search-results');
    container.innerHTML = '';
    if (!results || !results.length) {
      container.style.display = 'none';
      return;
    }
    results.forEach(function(r) {
      var div = document.createElement('div');
      div.className = 'result-item';
      // Show a shorter label: first comma-separated segment
      var label = r.display_name;
      div.textContent = label;
      div.title = label;
      div.addEventListener('mousedown', function(e) { e.preventDefault(); });
      div.addEventListener('click', function() {
        var lat = parseFloat(r.lat);
        var lng = parseFloat(r.lon);
        map.setView([lat, lng], 14);
        selectedMarker.setLatLng([lat, lng]);
        notifyPosition(lat, lng);
        document.getElementById('search-input').value = label;
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

/**
 * Full-screen interactive map picker.
 * - Yellow teardrop pin: the location being selected (draggable, tap-to-move).
 * - Blue pulsing dot: the user's real GPS position (static reference).
 * - Search bar: Nominatim-powered place search.
 * Mobile-only (returns null on web).
 */
export const MapLocationPicker = ({
    visible,
    initialLocation,
    userLocation,
    onLocationSelect,
    onClose,
}: MapLocationPickerProps) => {
    const [selectedCoords, setSelectedCoords] = useState<MapPickerCoords | null>(
        initialLocation ?? userLocation ?? null
    );
    const [isLoading, setIsLoading] = useState(true);
    const webViewRef = useRef<WebView>(null);

    if (Platform.OS === 'web') return null;

    // Pin starts at the selected-address location; falls back to GPS, then Madrid
    const pinLat = initialLocation?.latitude ?? userLocation?.latitude ?? DEFAULT_LAT;
    const pinLng = initialLocation?.longitude ?? userLocation?.longitude ?? DEFAULT_LNG;
    const pinZoom = (initialLocation || userLocation) ? LOCATION_ZOOM : DEFAULT_ZOOM;

    const userLat = userLocation?.latitude ?? null;
    const userLng = userLocation?.longitude ?? null;

    const htmlContent = buildMapHtml(pinLat, pinLng, pinZoom, userLat, userLng);

    const handleMessage = (event: WebViewMessageEvent) => {
        try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'location' && typeof msg.lat === 'number' && typeof msg.lng === 'number') {
                setSelectedCoords({ latitude: msg.lat, longitude: msg.lng });
            }
        } catch {
            // ignore
        }
    };

    const handleConfirm = () => {
        if (selectedCoords) {
            onLocationSelect(selectedCoords);
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                {/* Header */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingTop: 52,
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(153,153,153,0.15)',
                    backgroundColor: '#fff',
                }}>
                    <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={{ padding: 4 }}>
                        <Ionicons name="close" size={24} color="#202020" />
                    </TouchableOpacity>
                    <SubtitleSemibold>Elige en el mapa</SubtitleSemibold>
                    <View style={{ width: 32 }} />
                </View>

                {/* Map */}
                <View style={{ flex: 1 }}>
                    {isLoading && (
                        <View style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: '#fff',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                        }}>
                            <ActivityIndicator size="large" color="#FFD54D" />
                            <TextRegular className="text-neutral-gray mt-3">Cargando mapa...</TextRegular>
                        </View>
                    )}
                    <WebView
                        ref={webViewRef}
                        style={{ flex: 1 }}
                        source={{ html: htmlContent }}
                        onLoadEnd={() => setIsLoading(false)}
                        onMessage={handleMessage}
                        scrollEnabled={false}
                        bounces={false}
                        geolocationEnabled
                        javaScriptEnabled
                        domStorageEnabled
                    />
                </View>

                {/* Instruction + Confirm */}
                <View style={{
                    paddingHorizontal: 24,
                    paddingTop: 10,
                    paddingBottom: 24,
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(153,153,153,0.1)',
                    gap: 8,
                }}>
                    <MicrotextDark className="text-center text-neutral-gray">
                        Toca el mapa, arrastra el marcador o usa el buscador
                    </MicrotextDark>
                    <CustomButton
                        variant="primary"
                        title="Confirmar ubicación"
                        onPress={handleConfirm}
                        disabled={!selectedCoords}
                    />
                </View>
            </View>
        </Modal>
    );
};
