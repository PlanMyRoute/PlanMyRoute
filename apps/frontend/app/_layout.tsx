import FontAwesome from '@expo/vector-icons/FontAwesome';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import { AuthProvider } from '../context/AuthContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import '../index.css';
import { queryClient } from '../services/queryClient';

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
              <Slot />
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
