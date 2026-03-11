import { Redirect } from 'expo-router';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

/**
 * Ruta raíz (/) de la aplicación.
 * Redirige según la plataforma y el estado de autenticación:
 * - Web sin login -> /welcome (landing page)
 * - Mobile sin login -> /login
 * - Con login -> /(app)/(tabs) (home)
 */
export default function Index() {
    const { user, isLoading } = useAuth();

    // Mientras carga el estado de autenticación, mostramos un loader
    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // Si el usuario está logueado, va directo al home
    if (user) {
        return <Redirect href="/(app)/(tabs)" />;
    }

    // Si no está logueado:
    // - En web -> landing page (welcome)
    // - En mobile -> login directo
    if (Platform.OS === 'web') {
        return <Redirect href="/welcome" />;
    } else {
        return <Redirect href="/(auth)/login" />;
    }
}
