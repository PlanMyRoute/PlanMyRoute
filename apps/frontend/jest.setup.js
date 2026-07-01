// jest.setup.js

// 0. Dummy env vars for Supabase (must be set before any module loads supabase.ts)
process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// 1. Configuración de Reanimated
require("react-native-reanimated").setUpTests();

// 2. Mock para fetch
const { enableFetchMocks } = require("jest-fetch-mock");
enableFetchMocks();

// 3. Mocks globales para Expo y React Native
jest.mock("expo-font", () => ({
  isLoaded: jest.fn().mockReturnValue(true),
  loadAsync: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  Feather: "Feather",
}));

// Mock simplificado de expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
  }),
  useLocalSearchParams: () => ({ tripId: "123" }),
  // AÑADIMOS ESTO: Simulamos que useFocusEffect ejecuta el efecto inmediatamente
  useFocusEffect: (callback) => callback(),
  Link: "Link",
  Stack: {
    Screen: () => null,
  },
}));

// Mock de Async Storage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// --- CAMBIO IMPORTANTE ---
// Eliminamos la línea conflictiva de NativeAnimatedHelper.
// Si necesitas silenciar warnings de animaciones, usa esto:
jest.mock(
  "react-native/Libraries/Animated/NativeAnimatedHelper",
  () => ({
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  }),
  { virtual: true },
); // <--- 'virtual: true' es la clave si el módulo no existe físicamente
