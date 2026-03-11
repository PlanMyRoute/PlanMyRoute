import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase'; // Ajusta la ruta si es necesario

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
      
      // Mostrar token en consola si está disponible
      if (session?.access_token) {
        console.log('🔐 JWT TOKEN:', session.access_token);
        console.log('📋 Para usar en Postman, agrega este header:');
        console.log('   Authorization: Bearer ' + session.access_token);
      }
    });

    // Escucha cambios en la autenticación (login, logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        // Mostrar token en consola cuando se inicia sesión
        if (session?.access_token) {
          console.log('🔐 JWT TOKEN:', session.access_token);
          console.log('📋 Para usar en Postman, agrega este header:');
          console.log('   Authorization: Bearer ' + session.access_token);
        }

        // Manejar nuevos usuarios de Google
        if (event === 'SIGNED_IN' && session?.user) {
          await handleGoogleSignIn(session.user);
        }
      }
    );

    // Limpia el listener al desmontar
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // --- Manejar usuario de Google ---
  const handleGoogleSignIn = async (authUser: User) => {
    try {
      console.log('🔍 Verificando usuario de Google:', authUser.email);
      
      // Verificar si el usuario ya existe en la tabla user
      const { data: existingUser, error: fetchError } = await supabase
        .from('user')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Error diferente a "no encontrado"
        console.error('❌ Error al verificar usuario:', fetchError);
        alert(`Error al verificar usuario: ${fetchError.message}`);
        return;
      }

      if (!existingUser) {
        // Usuario nuevo de Google
        console.log('👤 Nuevo usuario de Google detectado');
        console.log('⏳ El trigger de la base de datos creará el perfil automáticamente cuando se confirme el email');
        console.log('📍 Usuario necesitará completar su username');
        
        // Marcar que necesita completar perfil (username es obligatorio)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('needsCompleteProfile', 'true');
          console.log('🚩 Flag needsCompleteProfile activado');
        }
      } else {
        console.log('✅ Usuario de Google ya existe en la base de datos');
        
        // Verificar si tiene username, si no lo tiene, redirigir a complete-profile
        if (!existingUser.username || existingUser.username === '') {
          console.log('⚠️ Usuario existe pero no tiene username');
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('needsCompleteProfile', 'true');
            console.log('🚩 Flag needsCompleteProfile activado por falta de username');
          }
        } else {
          console.log('✅ Usuario tiene username:', existingUser.username);
        }
        
        // Actualizar foto de perfil si cambió
        if (authUser.user_metadata?.avatar_url && existingUser.img !== authUser.user_metadata.avatar_url) {
          console.log('🖼️ Actualizando foto de perfil...');
          await supabase
            .from('user')
            .update({ img: authUser.user_metadata.avatar_url })
            .eq('id', authUser.id);
        }
      }
    } catch (error) {
      console.error('❌ Error crítico en handleGoogleSignIn:', error);
      alert(`Error crítico: ${error}`);
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
    
    console.log('✅ Email verificado correctamente:', data);
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

  const signInWithGoogle = async () => {
    // Solo usar redirect URL si estamos en web de producción (no app nativa)
    const isWebProduction = Platform.OS === 'web' && 
      typeof window !== 'undefined' && 
      !window.location.href.includes('localhost') && 
      !window.location.href.match(/192\.168\.\d+\.\d+/);
    const redirectUrl = isWebProduction 
      ? 'https://www.planmyroute.es/auth/callback' 
      : undefined; // Expo manejará el deep link automáticamente

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false,
      },
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, token: session?.access_token || null, isLoading, login, signUp, verifyOtp, resendOtp, signOut, signInWithGoogle }}>
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