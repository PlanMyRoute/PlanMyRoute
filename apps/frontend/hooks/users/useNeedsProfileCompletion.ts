import { useAuth } from '@/context/AuthContext';
import { useProfile } from './useUsers';

/**
 * Determina si el usuario autenticado necesita completar su perfil:
 * — No existe fila en public.user (la API devuelve error 404).
 * — La fila existe pero el username está vacío.
 *
 * Devuelve `false` para invitados (ya tienen username generado) y mientras se carga
 * la consulta, para evitar parpadeos en la UI.
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
    // El backend devuelve 404 cuando no existe la fila en public.user.
    return { needsCompletion: true, isLoading: false };
  }
  const username = data?.user?.username;
  return { needsCompletion: !username || username === '', isLoading: false };
}
