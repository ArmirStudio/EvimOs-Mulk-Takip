import { useEffect, useState } from 'react';

import {
  readStoredPreferences,
  storeCurrencyPreference,
  type Currency,
} from '../services/preferences';

export type { AppTheme } from '../app/theme';
export type { Currency } from '../services/preferences';

export interface Preferences {
  currency: Currency;
}

const DEFAULT_PREFS: Preferences = { currency: 'TRY' };

export async function loadPreferencesOnce(): Promise<void> {
  try {
    await readStoredPreferences();
  } catch {
    // AsyncStorage failure should not block app boot.
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    readStoredPreferences()
      .then((storedPreferences) => {
        setPrefs({ currency: storedPreferences.currency });
      })
      .finally(() => setLoaded(true));
  }, []);

  const updateCurrency = async (currency: Currency) => {
    setPrefs({ currency });
    await storeCurrencyPreference(currency);
  };

  return { prefs, loaded, updateCurrency };
}
