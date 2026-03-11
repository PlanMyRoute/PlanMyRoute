import { TripProvider } from '@/context/TripContext';
import { Redirect, Stack, Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import usePushNotifications from '../../hooks/usePushNotifications';
import { UserService } from '../../services/userService';

/**
 * Este componente es un "Portero" interno para el grupo (app).
 * Comprueba si el perfil del usuario (de public.user) está completo.
 */
function ProfileGatekeeper() {
  const { user } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [isChecking, setIsChecking] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);

  const inCompleteProfileScreen = segments[segments.length - 1] === 'complete-profile';

  useEffect(() => {
    const checkProfile = async () => {
      if (!user?.id) {
        setIsChecking(false);
        return;
      }


      // Solo mostrar completar perfil si el flag está presente (tras registro), y borrarlo tras usarlo
      let needsComplete = null;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        needsComplete = window.localStorage.getItem('needsCompleteProfile');
        if (needsComplete === 'true') {
          window.localStorage.removeItem('needsCompleteProfile');
        }
      } else {
        needsComplete = await AsyncStorage.getItem('needsCompleteProfile');
        if (needsComplete === 'true') {
          await AsyncStorage.removeItem('needsCompleteProfile');
        }
      }
      if (needsComplete === 'true') {
        setNeedsProfile(true);
        setIsChecking(false);
        if (!inCompleteProfileScreen) {
          router.replace('/complete-profile');
        }
        return;
      }

      try {
        // Verificar en BD con timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        );
        const profilePromise = UserService.getUserProfile(user.id, {});
        const profile = await Promise.race([profilePromise, timeoutPromise]) as any;

        const isIncomplete = !profile?.user?.username || profile.user.username === '';
        setNeedsProfile(isIncomplete);

        // Solo mostrar completar perfil si el flag estaba presente (tras registro)
        // Si el usuario ya existe y no hay flag, NO forzar la redirección ni bloquear la app
        if (isIncomplete && !inCompleteProfileScreen && needsComplete === 'true') {
          router.replace('/complete-profile');
        } else if (!isIncomplete && inCompleteProfileScreen) {
          router.replace('/');
        } else {
          // Permitir el uso normal de la app aunque el username esté vacío si no hay flag
          setIsChecking(false);
        }
      } catch (error) {
        console.log('⚠️ Error verificando perfil, permitiendo acceso normal', error);
        setIsChecking(false);
      }
    };

    checkProfile();
  }, [user?.id, segments]);

  // Muestra un spinner mientras se verifica el perfil
  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Si todo está bien, muestra la app
  return <Slot />;
}


// Layout para las rutas protegidas de la app
export default function AppLayout() {
  const { user, isLoading: isAuthLoading } = useAuth();

  // Registrar notificaciones push cuando el usuario está autenticado
  usePushNotifications();

  if (isAuthLoading) {
    return null; // El portero raíz (app/_layout.tsx) ya muestra un spinner
  }

  // Si no hay usuario, redirige fuera de (app)
  if (!user) {
    return <Redirect href="/login" />;
  }

  // Si hay usuario, envuelve el Stack con el Portero de Perfil y TripProvider
  return (
    <TripProvider>
      <ProfileGatekeeper />
    </TripProvider>
  );
}