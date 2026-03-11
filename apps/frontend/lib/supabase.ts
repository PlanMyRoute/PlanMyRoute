import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// ¡Guarda esto en variables de entorno (.env)!
export const supabaseUrl = 'https://mqdqzygwhmrmkvuprsqp.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZHF6eWd3aG1ybWt2dXByc3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMTQ4MjAsImV4cCI6MjA3NjY5MDgyMH0.jgGXnn9YoKTW9wh-6LhCvtuQSjA64V0S83nz59VlTpY';

const storageAdapter = Platform.OS !== 'web' ? AsyncStorage : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter, // Le dice a Supabase que use AsyncStorage en el móvil
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Solo detectar en web, en móvil usamos deep linking
  },
});