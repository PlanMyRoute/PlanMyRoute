import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase'; // Ajusta la ruta si es necesario
import { UserService } from '../services/userService';

// Cierra cualquier sesión de WebBrowser pendiente cuando se completa el OAuth.
WebBrowser.maybeCompleteAuthSession();

// Define la forma de tu contexto
interface AuthContextType {
  user: User | null;
  session: Session | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, username: string) => Promise<any>;
  verifyOtp: (email: string, token: string) => Promise<any>;
  resendOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  isGuest: boolean;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

// Crea el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Crea el Proveedor
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Carga la sesión al iniciar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Escucha cambios en la autenticación (login, logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        if (event === 'SIGNED_IN' && session?.user) {
          await syncAvatarIfGoogle(session.user);
        }
      }
    );

    // Limpia el listener al desmontar
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Tras cualquier inicio de sesión, sincronizamos el avatar de Google si procede.
  // El estado "necesita completar perfil" se deriva en el cliente desde public.user
  // mediante el hook useNeedsProfileCompletion, así no dependemos de flags persistidos.
  const syncAvatarIfGoogle = async (authUser: User) => {
    if ((authUser as any).is_anonymous) return;
    const provider = (authUser.app_metadata as any)?.provider;
    if (provider !== 'google') return;
    const avatarUrl = authUser.user_metadata?.avatar_url;
    if (!avatarUrl) return;

    try {
      const { data: existing } = await supabase
        .from('user')
        .select('id, img')
        .eq('id', authUser.id)
        .maybeSingle();
      if (existing && existing.img !== avatarUrl) {
        await supabase.from('user').update({ img: avatarUrl }).eq('id', authUser.id);
      }
    } catch (error) {
      // No es crítico: si falla la sincronización del avatar, no rompemos el login.
      console.warn('No se pudo sincronizar el avatar de Google:', error);
    }
  };

  // --- Funciones de Autenticación ---

  const login = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: pass,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, pass: string, username: string) => {
    console.log('📝 Registrando usuario con metadata:', {
      email,
      username,
      metadata: { user_name: username }
    });

    // Solo usar redirect URL si estamos en web de producción (no app nativa)
    const isWebProduction = Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      !window.location.href.includes('localhost') &&
      !window.location.href.match(/192\.168\.\d+\.\d+/);
    const emailRedirectTo = isWebProduction ? 'https://www.planmyroute.es/auth/callback' : undefined;

    // 1. Crear usuario en Supabase Auth con metadata del username y OTP
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: pass,
      options: {
        data: {
          user_name: username, // Guardar username en metadata
        },
        emailRedirectTo: emailRedirectTo, // URL de redirección para producción
      }
    });

    if (authError) {
      console.error('❌ Error en Auth signup:', authError);
      throw authError;
    }

    // Supabase devuelve user con identities=[] cuando el email ya está registrado,
    // en vez de lanzar un error. Detectamos ese caso aquí.
    if (authData.user && Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }

    console.log('✅ Usuario creado en Auth. Código OTP enviado.');
    console.log('📧 Se ha enviado un código de 6 dígitos a:', email);
    console.log('🔍 Usuario creado con ID:', authData.user?.id);
    console.log('🔍 Metadatos guardados:', authData.user?.user_metadata);

    return authData;
  };

  const verifyOtp = async (email: string, token: string) => {
    console.log('🔍 Verificando OTP:', {
      email,
      token,
      tokenLength: token.length,
      tokenTrimmed: token.trim(),
    });

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: token.trim(),
      type: 'email'
    });

    if (error) {
      console.error('❌ Error al verificar OTP:', {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error,
      });
      throw error;
    }

    console.log('✅ Email verificado correctamente');

    // Reserva la fila en public.user inmediatamente para evitar 404s en cascada.
    // Usamos el username del user_metadata (capturado en el registro) y dejamos
    // name/lastname vacíos para que el wizard los pida después.
    const verifiedUser = data.user;
    const accessToken = data.session?.access_token;
    if (verifiedUser && accessToken) {
      const username = (verifiedUser.user_metadata?.user_name as string | undefined) || '';
      try {
        const existing = await UserService.getUserProfile(verifiedUser.id, { token: accessToken }).catch(() => null);
        if (!existing) {
          await UserService.createUser(
            {
              id: verifiedUser.id,
              email: verifiedUser.email!,
              username,
              name: '',
              lastname: '',
              img: null,
              timezone: 'UTC',
              auto_trip_status_update: false,
            } as any,
            accessToken
          );
        }
      } catch (e) {
        // No bloqueamos el login si la creación falla — el badge guiará al wizard.
        console.warn('No se pudo pre-crear la fila en public.user:', e);
      }
    }

    return data;
  };

  const resendOtp = async (email: string) => {
    console.log('🔄 Reenviando código OTP a:', email);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      console.error('❌ Error al reenviar OTP:', error);
      throw error;
    }

    console.log('✅ Código OTP reenviado correctamente');
  };

  const signOut = async () => {
    console.log('=== signOut llamado ===');
    try {
      // Intentar cerrar sesión en Supabase con timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );

      const signOutPromise = supabase.auth.signOut();

      await Promise.race([signOutPromise, timeoutPromise]).catch((error) => {
        console.warn('Advertencia en signOut (puede ser timeout):', error.message);
      });

      // Forzar limpieza local del estado
      console.log('Limpiando estado local...');
      setUser(null);
      setSession(null);

      console.log('signOut completado');
    } catch (error) {
      console.error('Error en signOut:', error);
      // Aún así limpiar el estado local
      setUser(null);
      setSession(null);
    }
  };

  const signInAsGuest = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;

    const guestUser = data.user;
    const guestToken = data.session?.access_token;
    if (!guestUser || !guestToken) {
      throw new Error('No se pudo iniciar la sesión de invitado.');
    }

    // Crear perfil mínimo en public.user para que el resto de la app funcione.
    // Si el trigger de la BD ya lo creó, getUserProfile devolverá el existente y saltamos.
    try {
      const existing = await UserService.getUserProfile(guestUser.id, { token: guestToken });
      if (existing?.user) {
        return;
      }
    } catch {
      // No existe, lo creamos a continuación.
    }

    const suffix = guestUser.id.replace(/-/g, '').slice(0, 8);
    await UserService.createUser(
      {
        id: guestUser.id,
        email: `invitado_${suffix}@guest.planmyroute.local`,
        name: 'Invitado',
        lastname: '',
        username: `invitado_${suffix}`,
        img: null,
        timezone: 'UTC',
        auto_trip_status_update: false,
      } as any,
      guestToken
    );
  };

  const requestPasswordReset = async (email: string) => {
    // En nativo, el deep link va al esquema de la app. En web, a la URL pública.
    const isWebProduction = Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      !window.location.href.includes('localhost') &&
      !window.location.href.match(/192\.168\.\d+\.\d+/);
    const redirectTo = Platform.OS === 'web'
      ? (isWebProduction ? 'https://www.planmyroute.es/auth/reset-password' : `${window.location.origin}/reset-password`)
      : 'planmyroute://auth/reset-password';

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    if (Platform.OS === 'web') {
      const isWebProduction = typeof window !== 'undefined' &&
        !window.location.href.includes('localhost') &&
        !window.location.href.match(/192\.168\.\d+\.\d+/);
      const redirectUrl = isWebProduction
        ? 'https://www.planmyroute.es/auth/callback'
        : `${window.location.origin}/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: false },
      });
      if (error) throw error;
      return;
    }

    // En nativo, signInWithOAuth no abre el navegador automáticamente.
    // Pedimos la URL y la abrimos con WebBrowser.openAuthSessionAsync.
    const redirectTo = Linking.createURL('/auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('No se pudo obtener la URL de autenticación.');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type !== 'success' || !result.url) {
      // Usuario canceló o cerró el navegador — no es un error que mostrar.
      return;
    }

    // Supabase devuelve los tokens en el fragmento (#access_token=...&refresh_token=...)
    const parsed = Linking.parse(result.url);
    const params = (parsed.queryParams ?? {}) as Record<string, string>;
    const fragment = result.url.split('#')[1] ?? '';
    const fragmentParams = Object.fromEntries(new URLSearchParams(fragment).entries());

    const accessToken = params.access_token ?? fragmentParams.access_token;
    const refreshToken = params.refresh_token ?? fragmentParams.refresh_token;

    if (!accessToken || !refreshToken) {
      throw new Error('No se recibieron los tokens de Google. Inténtalo de nuevo.');
    }

    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (setSessionError) throw setSessionError;
  };

  return (
    <AuthContext.Provider value={{ user, session, token: session?.access_token || null, isLoading, login, signUp, verifyOtp, resendOtp, signOut, signInWithGoogle, signInAsGuest, isGuest: Boolean((user as any)?.is_anonymous), requestPasswordReset, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};