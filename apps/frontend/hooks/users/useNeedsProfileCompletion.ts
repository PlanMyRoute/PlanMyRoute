import { useAuth } from '@/context/AuthContext';
import { useProfile } from './useUsers';

/**
 * Determina si el usuario autenticado necesita completar su perfil.
 * La fila en public.user se crea tras verificar el OTP, con username pero sin
 * name/lastname. Consideramos el perfil incompleto si `name` está vacío.
 *
 * Devuelve `false` para invitados (ya tienen perfil generado) y mientras carga.
 */
export function useNeedsProfileCompletion(): {
  needsCompletion: boolean;
  isLoading: boolean;
} {
  const { user, isGuest } = useAuth();
  const { data, isLoading, error } = useProfile(user?.id, undefined, {
    enabled: Boolean(user?.id) && !isGuest,
  });

  if (!user?.id || isGuest) {
    return { needsCompletion: false, isLoading: false };
  }
  if (isLoading) {
    return { needsCompletion: false, isLoading: true };
  }
  if (error) {
    // Si el backend no está disponible (error de red, IP incorrecta, etc.) no podemos
    // determinar el estado del perfil. No bloqueamos al usuario: devolvemos false para
    // que pueda usar la app. El perfil incompleto genuino se gestiona en callback.tsx
    // (OAuth) y en verifyOtp (email OTP), que crean la fila antes del primer acceso.
    return { needsCompletion: false, isLoading: false };
  }
  const name = data?.user?.name;
  return { needsCompletion: !name || name.trim() === '', isLoading: false };
}
