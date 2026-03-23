import FontAwesome from '@expo/vector-icons/FontAwesome';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import '../index.css';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { queryClient } from '../services/queryClient'; // <-- Ruta desde 'app/' a 'services/'
// Suppress specific noisy warnings/logs in production/dev when desired
// We filter messages that include any of the substrings below.
const IGNORED_LOG_SUBSTRINGS: string[] = [
  'ImagePicker.MediaTypeOptions',
  'Method readAsStringAsync imported from "expo-file-system" is deprecated',
  'supabase upload error (will try fallback)',
  'supabase.storage.upload failed, attempting direct PUT',
  'StorageUnknownError: Network request failed',
];

function messageContainsIgnored(...args: any[]) {
  if (!args || args.length === 0) return false;
  for (const a of args) {
    try {
      const s = typeof a === 'string' ? a : JSON.stringify(a);
      for (const sub of IGNORED_LOG_SUBSTRINGS) if (s.includes(sub)) return true;
    } catch (_) {
      // ignore stringify errors
    }
  }
  return false;
}

const _origWarn = console.warn.bind(console);
const _origDebug = console.debug ? console.debug.bind(console) : _origWarn;
const _origLog = console.log.bind(console);
console.warn = (...args: any[]) => {
  if (messageContainsIgnored(...args)) return;
  return _origWarn(...args);
};
console.debug = (...args: any[]) => {
  if (messageContainsIgnored(...args)) return;
  return _origDebug(...args);
};
console.log = (...args: any[]) => {
  if (messageContainsIgnored(...args)) return;
  return _origLog(...args);
};

export {
  ErrorBoundary
} from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Urbanist-Regular': require('../assets/fonts/Urbanist-Regular.ttf'),
    'Urbanist-Medium': require('../assets/fonts/Urbanist-Medium.ttf'),
    'Urbanist-SemiBold': require('../assets/fonts/Urbanist-SemiBold.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SubscriptionProvider>
              <InitialLayout />
              <Toast
                config={{
                  success: (props) => (
                    <BaseToast
                      {...props}
                      style={{
                        borderLeftColor: '#10B981',
                        borderLeftWidth: 5,
                        width: '90%',
                        height: 70,
                      }}
                      contentContainerStyle={{ paddingHorizontal: 15 }}
                      text1Style={{
                        fontSize: 17,
                        fontWeight: '600',
                      }}
                      text2Style={{
                        fontSize: 15,
                        fontWeight: '400',
                      }}
                      text2NumberOfLines={2}
                    />
                  ),
                  error: (props) => (
                    <ErrorToast
                      {...props}
                      style={{
                        borderLeftColor: '#EF4444',
                        borderLeftWidth: 5,
                        width: '90%',
                        height: 70,
                      }}
                      contentContainerStyle={{ paddingHorizontal: 15 }}
                      text1Style={{
                        fontSize: 17,
                        fontWeight: '600',
                      }}
                      text2Style={{
                        fontSize: 15,
                        fontWeight: '400',
                      }}
                      text2NumberOfLines={2}
                    />
                  ),
                  info: (props) => (
                    <InfoToast
                      {...props}
                      style={{
                        borderLeftColor: '#3B82F6',
                        borderLeftWidth: 5,
                        width: '90%',
                        height: 70,
                      }}
                      contentContainerStyle={{ paddingHorizontal: 15 }}
                      text1Style={{
                        fontSize: 17,
                        fontWeight: '600',
                      }}
                      text2Style={{
                        fontSize: 15,
                        fontWeight: '400',
                      }}
                      text2NumberOfLines={2}
                    />
                  ),
                }}
              />
            </SubscriptionProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// --- PORTERO DE NAVEGACIÓN ---
function InitialLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    // 1. Definir rutas públicas (accesibles sin autenticación)
    const publicRoutes = ['login', 'register', 'welcome', 'verify-email', 'callback', 'index'];

    // 2. Obtener la ruta actual limpia (sin paréntesis ni guiones bajos)
    const segmentName = [...segments].reverse().find(s => !s.startsWith('(') && !s.startsWith('_'));
    const currentRoute = segmentName || '';

    // 3. Comprobar si es pública
    const isPublicRoute = publicRoutes.includes(currentRoute);

    if (user) {
      // Usuario LOGUEADO: Si está en una ruta pública, redirigir al home
      if (isPublicRoute && currentRoute !== '') {
        router.replace('/(app)/(tabs)');
      }
    } else {
      // Usuario NO LOGUEADO: Si intenta acceder a ruta privada, redirigir según plataforma
      if (!isPublicRoute && currentRoute !== '') {
        if (Platform.OS === 'web') {
          router.replace('/welcome');
        } else {
          router.replace('/(auth)/login');
        }
      }
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}