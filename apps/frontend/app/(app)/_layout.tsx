import { ROUTES } from '@/constants/routes';
import { TripProvider } from '@/context/TripContext';
import { Redirect, Slot } from 'expo-router';
import { View } from 'react-native';
import GuestBanner from '../../components/GuestBanner';
import { useAuth } from '../../context/AuthContext';
import usePushNotifications from '../../hooks/usePushNotifications';

// Layout para las rutas protegidas de la app.
// El estado "perfil incompleto" se gestiona ahora con un badge en la tab de Perfil
// y una redirección perezosa al wizard al entrar en Perfil o CreateTrip — no bloqueamos
// el acceso a la app aunque la fila en public.user todavía no exista.
export default function AppLayout() {
  const { user, isLoading: isAuthLoading } = useAuth();

  // Registrar notificaciones push cuando el usuario está autenticado
  usePushNotifications();

  if (isAuthLoading) {
    return null; // El portero raíz (app/_layout.tsx) ya muestra un spinner
  }

  if (!user) {
    return <Redirect href={ROUTES.login} />;
  }

  return (
    <TripProvider>
      <View style={{ flex: 1 }}>
        <GuestBanner />
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
      </View>
    </TripProvider>
  );
}