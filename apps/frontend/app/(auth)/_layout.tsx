import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../context/AuthContext'; // Ajusta la ruta

// Layout para las pantallas de login y registro
export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  // Si el usuario ya está logueado, sácalo de aquí
  if (!isLoading && user) {
    return <Redirect href="/" />; // Envía a la raíz PROTEGIDA
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="verify-email" options={{ headerShown: false }} />
      <Stack.Screen name="callback" options={{ headerShown: false }} />
    </Stack>
  );
}