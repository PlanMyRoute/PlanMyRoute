import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan las variables de entorno de Supabase: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias');
}

// Inicializamos el cliente. 
// Al usar la Service Role Key, este cliente tiene permisos de "Dios" (Bypass RLS).
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});