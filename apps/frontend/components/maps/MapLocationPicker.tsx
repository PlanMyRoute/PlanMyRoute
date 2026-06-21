import CustomButton from "@/components/customElements/CustomButton";
import {
  MicrotextDark,
  SubtitleSemibold,
} from "@/components/customElements/CustomText";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";

export type MapPickerCoords = { latitude: number; longitude: number };

type MapLocationPickerProps = {
  visible: boolean;
  /** Coordinates of the already-selected address — map will start centered here */
  initialLocation?: MapPickerCoords | null;
  /** Called with selected coords and optional reverse-geocoded address */
  onLocationSelect: (coords: MapPickerCoords, address?: string) => void;
  onClose: () => void;
};

const DEFAULT_LAT = 40.4168;
const DEFAULT_LNG = -3.7038;
const DEFAULT_ZOOM = 5;
const LOCATION_ZOOM = 14;

function getApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
}

export function formatMapAddress(
  r: Location.LocationGeocodedAddress | null,
): string | null {
  if (!r) return null;
  const parts: string[] = [];
  if (r.street)
    parts.push(r.streetNumber ? `${r.street} ${r.streetNumber}` : r.street);
  if (r.city) parts.push(r.city);
  else if (r.district) parts.push(r.district);
  if (r.postalCode) parts.push(r.postalCode);
  if (r.region && !r.city) parts.push(r.region);
  return parts.join(", ") || null;
}

function buildMapHtml(
  centerLat: number,
  centerLng: number,
  centerZoom: number,
  apiBaseUrl: string,
): string {
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

    /* ── Fixed crosshair pin ── */
    #crosshair {
      position:absolute; left:50%; top:50%;
      transform:translate(-50%,-100%);
      pointer-events:none; z-index:1000;
      transition:transform 0.15s ease;
    }
    #crosshair.dragging { transform:translate(-50%,-110%) scale(1.15); }

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

    /* ── Search overlay ── */
    #search-container { position:absolute; top:10px; left:10px; right:10px; z-index:1000; }
    #search-input {
      width:100%; padding:11px 16px; border:none; border-radius:14px;
      background:#fff; box-shadow:0 2px 12px rgba(0,0,0,0.18);
      font-size:15px; font-family:system-ui,-apple-system,sans-serif;
      outline:none; -webkit-appearance:none;
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

<div id="crosshair">
  <svg viewBox="0 0 28 40" width="28" height="40" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.3 0 0 6.3 0 14C0 24.5 14 40 14 40C14 40 28 24.5 28 14C28 6.3 21.7 0 14 0Z"
          fill="#FFD54D" stroke="#fff" stroke-width="2.5"/>
    <circle cx="14" cy="13" r="5.5" fill="rgba(0,0,0,0.18)"/>
  </svg>
</div>

<div id="search-container">
  <input id="search-input" type="text" placeholder="Buscar ciudad o lugar..."
         autocomplete="off" autocorrect="off" spellcheck="false"/>
  <div id="search-results"></div>
</div>

<script>
  var map = L.map('map', { zoomControl:true }).setView([${centerLat}, ${centerLng}], ${centerZoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'© <a href="https://www.openstreetmap.org/copyright">OSM</a>', maxZoom:19,
  }).addTo(map);

  function notifyCenter() {
    var c = map.getCenter();
    window.ReactNativeWebView.postMessage(JSON.stringify({ type:'mapMoved', lat:c.lat, lng:c.lng }));
  }

  map.on('movestart', function() { document.getElementById('crosshair').classList.add('dragging'); });
  map.on('moveend', function() {
    document.getElementById('crosshair').classList.remove('dragging');
    notifyCenter();
  });
  map.whenReady(function() { notifyCenter(); });

  // Injectable: create or move user dot
  function updateUserDot(lat, lng) {
    if (window._userDot) { window._userDot.setLatLng([lat, lng]); return; }
    var icon = L.divIcon({
      html:'<div class="user-dot-wrapper"><div class="user-dot-pulse"></div><div class="user-dot"></div></div>',
      className:'', iconSize:[40,40], iconAnchor:[20,20],
    });
    window._userDot = L.marker([lat, lng], { icon:icon, zIndexOffset:-10 }).addTo(map);
  }

  // Search bar
  var searchTimer = null;
  document.getElementById('search-input').addEventListener('input', function(e) {
    var q = e.target.value.trim();
    clearTimeout(searchTimer);
    if (q.length < 3) { document.getElementById('search-results').style.display='none'; return; }
    searchTimer = setTimeout(function() { searchPlaces(q); }, 450);
  });
  document.getElementById('search-input').addEventListener('blur', function() {
    setTimeout(function() { document.getElementById('search-results').style.display='none'; }, 200);
  });

  async function searchPlaces(query) {
    try {
      var resp = await fetch(
        '${apiBaseUrl}/api/places/autocomplete?input=' + encodeURIComponent(query) + '&language=es'
      );
      var data = await resp.json();
      renderResults(data.predictions || []);
    } catch(e) { document.getElementById('search-results').style.display='none'; }
  }

  function renderResults(results) {
    var container = document.getElementById('search-results');
    container.innerHTML = '';
    if (!results || !results.length) { container.style.display='none'; return; }
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

export const MapLocationPicker = ({
  visible,
  initialLocation,
  onLocationSelect,
  onClose,
}: MapLocationPickerProps) => {
  const [selectedCoords, setSelectedCoords] = useState<MapPickerCoords | null>(
    null,
  );
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const webViewRef = useRef<WebView>(null);
  const webViewReadyRef = useRef(false);
  const pendingFlyToRef = useRef<MapPickerCoords | null>(null);
  const userCoordsRef = useRef<MapPickerCoords | null>(null);
  const reverseDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLocationRef = useRef(initialLocation);

  useEffect(() => {
    initialLocationRef.current = initialLocation;
  }, [initialLocation]);

  // Auto-request GPS when picker opens
  useEffect(() => {
    if (!visible) {
      webViewReadyRef.current = false;
      if (reverseDebounceRef.current) clearTimeout(reverseDebounceRef.current);
      return;
    }
    // Reset on each open
    setResolvedAddress(null);
    setIsLoading(true);
    setSelectedCoords(initialLocationRef.current ?? null);
    userCoordsRef.current = null;
    pendingFlyToRef.current = null;
    webViewReadyRef.current = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const gpsCoords: MapPickerCoords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        userCoordsRef.current = gpsCoords;
        const shouldFly = !initialLocationRef.current;

        if (webViewReadyRef.current) {
          let script = `updateUserDot(${gpsCoords.latitude}, ${gpsCoords.longitude});`;
          if (shouldFly) {
            script =
              `map.flyTo([${gpsCoords.latitude}, ${gpsCoords.longitude}], ${LOCATION_ZOOM}); ` +
              script;
          }
          webViewRef.current?.injectJavaScript(script + " true;");
        } else if (shouldFly) {
          pendingFlyToRef.current = gpsCoords;
        }
      } catch {
        // GPS unavailable — map stays at initialLocation or DEFAULT
      }
    })();
  }, [visible]);

  // Must be after hooks, before early return
  if (Platform.OS === "web") return null;

  const centerLat = initialLocation?.latitude ?? DEFAULT_LAT;
  const centerLng = initialLocation?.longitude ?? DEFAULT_LNG;
  const centerZoom = initialLocation ? LOCATION_ZOOM : DEFAULT_ZOOM;
  const htmlContent = buildMapHtml(
    centerLat,
    centerLng,
    centerZoom,
    getApiBaseUrl(),
  );

  const handleLoadEnd = () => {
    setIsLoading(false);
    webViewReadyRef.current = true;
    const u = userCoordsRef.current;
    if (!u) return;
    const f = pendingFlyToRef.current;
    if (f) {
      pendingFlyToRef.current = null;
      webViewRef.current?.injectJavaScript(
        `map.flyTo([${f.latitude}, ${f.longitude}], ${LOCATION_ZOOM}); updateUserDot(${u.latitude}, ${u.longitude}); true;`,
      );
    } else {
      webViewRef.current?.injectJavaScript(
        `updateUserDot(${u.latitude}, ${u.longitude}); true;`,
      );
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (
        msg.type === "mapMoved" &&
        typeof msg.lat === "number" &&
        typeof msg.lng === "number"
      ) {
        const coords: MapPickerCoords = {
          latitude: msg.lat,
          longitude: msg.lng,
        };
        setSelectedCoords(coords);
        if (reverseDebounceRef.current)
          clearTimeout(reverseDebounceRef.current);
        setGeoLoading(true);
        reverseDebounceRef.current = setTimeout(async () => {
          try {
            const results = await Location.reverseGeocodeAsync(coords);
            // null (no inventar dirección) si no se pudo resolver — el panel
            // inferior mostrará el placeholder "Mueve el mapa..." en su lugar,
            // y handleMapLocationSelected del input padre tratará esto como fallo.
            setResolvedAddress(formatMapAddress(results[0]) ?? null);
          } catch {
            setResolvedAddress(null);
          } finally {
            setGeoLoading(false);
          }
        }, 600);
      }
    } catch {
      // ignore
    }
  };

  const handleConfirm = () => {
    if (selectedCoords) {
      onLocationSelect(selectedCoords, resolvedAddress ?? undefined);
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
      <View
        style={{ flex: 1, backgroundColor: "#fff" }}
        accessibilityViewIsModal
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 52,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(153,153,153,0.15)",
            backgroundColor: "#fff",
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={{ padding: 4 }}
          >
            <Ionicons name="close" size={24} color="#202020" />
          </TouchableOpacity>
          <SubtitleSemibold>Elige en el mapa</SubtitleSemibold>
          <View style={{ width: 32 }} />
        </View>

        {/* Map */}
        <View style={{ flex: 1 }}>
          {isLoading && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              <ActivityIndicator size="large" color="#FFD54D" />
              <MicrotextDark className="text-neutral-gray mt-3">
                Cargando mapa...
              </MicrotextDark>
            </View>
          )}
          <WebView
            ref={webViewRef}
            style={{ flex: 1 }}
            source={{ html: htmlContent }}
            onLoadEnd={handleLoadEnd}
            onMessage={handleMessage}
            scrollEnabled={false}
            bounces={false}
            geolocationEnabled
            javaScriptEnabled
            domStorageEnabled
          />
          {/* My location FAB */}
          <TouchableOpacity
            onPress={() => {
              const u = userCoordsRef.current;
              if (u) {
                webViewRef.current?.injectJavaScript(
                  `map.flyTo([${u.latitude}, ${u.longitude}], ${LOCATION_ZOOM}); true;`,
                );
              }
            }}
            style={{
              position: "absolute",
              right: 16,
              bottom: 16,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#fff",
              elevation: 4,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate" size={22} color="#FFD54D" />
          </TouchableOpacity>
        </View>

        {/* Bottom panel */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 24,
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "rgba(153,153,153,0.1)",
            gap: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              minHeight: 20,
            }}
          >
            {geoLoading ? (
              <ActivityIndicator size="small" color="#FFD54D" />
            ) : (
              <Ionicons name="location" size={16} color="#FFD54D" />
            )}
            <MicrotextDark
              style={{ flex: 1, color: geoLoading ? "#999999" : "#202020" }}
            >
              {geoLoading
                ? "Localizando..."
                : (resolvedAddress ?? "Mueve el mapa para seleccionar")}
            </MicrotextDark>
          </View>
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
