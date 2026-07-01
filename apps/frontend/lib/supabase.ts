import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

/** URL del proyecto Supabase (variable de entorno obligatoria) */
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
/** Clave anónima de Supabase (variable de entorno obligatoria) */
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan las variables de entorno EXPO_PUBLIC_SUPABASE_URL y/o EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Crea un archivo .env.local con estos valores.",
  );
}

const storageAdapter = Platform.OS !== "web" ? AsyncStorage : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter, // Le dice a Supabase que use AsyncStorage en el móvil
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web", // Solo detectar en web, en móvil usamos deep linking
  },
});
