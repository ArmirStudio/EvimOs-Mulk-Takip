import React from 'react';
import { isSupabaseConfigured, supabase } from '../services/supabase';
import {
  clearStoredUserData,
  hydrateStoredUserDataFromSession,
  loadStoredUserData,
  type UserData,
} from '../services/userSession';

export type { EffectiveBrand, UserData } from '../services/userSession';

export function useUserData() {
  const [userData, setUserData] = React.useState<UserData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      if (!isSupabaseConfigured) {
        await clearStoredUserData();
        setUserData(null);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        await clearStoredUserData();
        setUserData(null);
        return;
      }

      const hydrated = await hydrateStoredUserDataFromSession();
      setUserData(hydrated);
    } catch {
      const stored = await loadStoredUserData();
      setUserData(stored);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return { userData, loading, reload: load };
}

export async function getUserData(): Promise<UserData | null> {
  return loadStoredUserData();
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
  await clearStoredUserData();
}
