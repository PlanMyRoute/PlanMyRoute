import { Stack, Redirect, useSegments } from 'expo-router';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../context/AuthContext';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  // La pantalla reset-password recibe una sesión temporal de Supabase
  // al abrir el deep link del email — no debe redirigir aunque haya user.
  const current = segments[segments.length - 1];
  const isPasswordResetFlow = current === 'reset-password';

  if (!isLoading && user && !isPasswordResetFlow) {
    return <Redirect href={ROUTES.tabsHome} />;
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="verify-email" options={{ headerShown: false }} />
      <Stack.Screen name="callback" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
    </Stack>
  );
}