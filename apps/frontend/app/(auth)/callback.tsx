import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState('Procesando...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('📍 [Callback] Iniciando proceso de callback...');
        setStatus('Obteniendo sesión...');

        // Esperar un momento para que la URL se procese
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ [Callback] Error en autenticación:', error);
          setStatus('Error en autenticación');
          await new Promise(resolve => setTimeout(resolve, 1000));
          router.replace('/login');
          return;
        }

        if (!session) {
          console.log('⚠️ [Callback] No hay sesión, redirigiendo a login');
          router.replace('/login');
          return;
        }

        console.log('✅ [Callback] Sesión obtenida:', session.user.email);
        setStatus('Verificando usuario...');

        // Esperar a que AuthContext procese el usuario
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verificar si el usuario existe en la tabla user
        const { data: userProfile, error: profileError } = await supabase
          .from('user')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('❌ [Callback] Error al verificar perfil:', profileError);
        }

        console.log('👤 [Callback] Usuario en BD:', userProfile ? 'Existe' : 'No existe');

        // Verificar si necesita completar perfil
        if (!userProfile || !userProfile.username || userProfile.username === '') {
          console.log('🚩 [Callback] Usuario necesita completar perfil');
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('needsCompleteProfile', 'true');
          }
          setStatus('Completando perfil...');
          await new Promise(resolve => setTimeout(resolve, 500));
          router.replace('/complete-profile');
          return;
        }

        console.log('✅ [Callback] Todo correcto, redirigiendo a home');
        setStatus('Iniciando...');
        await new Promise(resolve => setTimeout(resolve, 500));
        router.replace('/');

      } catch (error) {
        console.error('❌ [Callback] Error crítico:', error);
        setStatus('Error inesperado');
        await new Promise(resolve => setTimeout(resolve, 1000));
        router.replace('/login');
      }
    };

    handleCallback();
  }, []);

  return (
    <View className="flex-1 bg-primary justify-center items-center">
      <ActivityIndicator size="large" color="#232323" />
      <Text className="mt-4 text-lg text-[#1D1D1B]">
        {status}
      </Text>
    </View>
  );
}
