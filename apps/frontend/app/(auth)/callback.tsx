import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { LoadingView } from '@/components/customElements/LoadingView';
import { supabase } from '@/lib/supabase';
import { ROUTES } from '@/constants/routes';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [status, setStatus] = useState('Procesando...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatus('Obteniendo sesión...');

        // OAuth redirect processing may need a moment — retry up to 5 times (500ms apart)
        let session = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error('❌ [Callback] Error en autenticación:', error);
            router.replace(ROUTES.login);
            return;
          }
          if (data.session) {
            session = data.session;
            break;
          }
          if (attempt < 4) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        if (!session) {
          router.replace(ROUTES.login);
          return;
        }

        setStatus('Verificando usuario...');

        const { data: userProfile } = await supabase
          .from('user')
          .select('id, username')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!userProfile?.username) {
          router.replace(ROUTES.completeProfile);
          return;
        }

        router.replace(ROUTES.tabsHome);

      } catch (error) {
        console.error('❌ [Callback] Error crítico:', error);
        router.replace(ROUTES.login);
      }
    };

    handleCallback();
  }, []);

  return <LoadingView color="#202020" message={status} />;
}
