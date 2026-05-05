import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const envSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const envSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'placeholder-anon-key';

export const missingSupabaseEnvVars = [
  !envSupabaseUrl ? 'EXPO_PUBLIC_SUPABASE_URL' : null,
  !envSupabaseAnonKey ? 'EXPO_PUBLIC_SUPABASE_ANON_KEY' : null,
].filter(Boolean) as string[];

export const isSupabaseConfigured = missingSupabaseEnvVars.length === 0;
export const supabaseConfigurationErrorMessage = isSupabaseConfigured
  ? null
  : `Supabase ayarları eksik: ${missingSupabaseEnvVars.join(', ')}. frontend/.env dosyasını güncelleyin.`;

if (!isSupabaseConfigured) {
  console.warn(
    `[supabase] Missing environment variables: ${missingSupabaseEnvVars.join(', ')}. ` +
      'Using a placeholder client until Expo public env vars are configured.'
  );
}

const supabaseUrl = envSupabaseUrl || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = envSupabaseAnonKey || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
