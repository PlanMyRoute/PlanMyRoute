import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
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

type ToastProps = {
  text1?: string;
  text2?: string;
  onPress?: () => void;
};

function ToastCard({ text1, text2, onPress, icon, iconColor }: ToastProps & { icon: keyof typeof Ionicons.glyphMap; iconColor: string }) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#202020',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginHorizontal: 16,
        gap: 12,
      }}
    >
      <Ionicons name={icon} size={24} color={iconColor} />
      <View style={{ flex: 1 }}>
        {text1 ? (
          <Text style={{ fontFamily: 'Urbanist-Medium', fontSize: 15, color: '#FFFFFF', lineHeight: 20 }}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={{ fontFamily: 'Urbanist-Regular', fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2, lineHeight: 16 }}>
            {text2}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const toastConfig = {
  success: ({ text1, text2, onPress }: ToastProps) => (
    <ToastCard text1={text1} text2={text2} onPress={onPress} icon="checkmark-circle" iconColor="#FFD54D" />
  ),
  error: ({ text1, text2, onPress }: ToastProps) => (
    <ToastCard text1={text1} text2={text2} onPress={onPress} icon="close-circle" iconColor="#EF4444" />
  ),
  info: ({ text1, text2, onPress }: ToastProps) => (
    <ToastCard text1={text1} text2={text2} onPress={onPress} icon="information-circle" iconColor="#FFD54D" />
  ),
};

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
              <Toast config={toastConfig} />
            </SubscriptionProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
