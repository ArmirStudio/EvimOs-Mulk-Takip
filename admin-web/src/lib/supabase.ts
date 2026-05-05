import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  throw new Error(
    'Missing required admin-web env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
