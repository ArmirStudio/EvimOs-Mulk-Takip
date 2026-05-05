import AsyncStorage from '@react-native-async-storage/async-storage';

import { setDefaultCurrency } from '../utils/propertyHelpers';

export type Currency = 'TRY' | 'USD' | 'EUR';
export type PreferenceTheme = 'light' | 'dark' | 'auto';
export type BackendThemePreference = 'light' | 'dark' | 'system';

export type StoredPreferences = {
  currency: Currency;
  theme: PreferenceTheme;
};

export type UserSettingsSnapshot = {
  preferred_currency?: Currency | null;
  preferred_theme?: BackendThemePreference | null;
};

export const PREFERENCE_STORAGE_KEY = 'user_preferences';

export const DEFAULT_STORED_PREFERENCES: StoredPreferences = {
  currency: 'TRY',
  theme: 'auto',
};

function normalizeCurrency(value: unknown): Currency {
  if (value === 'TRY' || value === 'USD' || value === 'EUR') {
    return value;
  }

  return DEFAULT_STORED_PREFERENCES.currency;
}

function normalizePreferenceTheme(value: unknown): PreferenceTheme {
  if (value === 'light' || value === 'dark' || value === 'auto') {
    return value;
  }

  if (value === 'system') {
    return 'auto';
  }

  return DEFAULT_STORED_PREFERENCES.theme;
}

function parseStoredPreferences(raw: string | null): StoredPreferences {
  if (!raw) {
    return DEFAULT_STORED_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredPreferences> & {
      theme?: PreferenceTheme | BackendThemePreference;
    };

    return {
      currency: normalizeCurrency(parsed.currency),
      theme: normalizePreferenceTheme(parsed.theme),
    };
  } catch {
    return DEFAULT_STORED_PREFERENCES;
  }
}

async function writeStoredPreferences(nextPreferences: StoredPreferences) {
  await AsyncStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(nextPreferences));
  setDefaultCurrency(nextPreferences.currency);
  return nextPreferences;
}

export function mapBackendThemeToPreference(
  theme?: BackendThemePreference | null
): PreferenceTheme {
  if (theme === 'light' || theme === 'dark') {
    return theme;
  }

  return 'auto';
}

export function mapPreferenceToBackendTheme(
  theme: PreferenceTheme
): BackendThemePreference {
  return theme === 'auto' ? 'system' : theme;
}

export async function readStoredPreferences(): Promise<StoredPreferences> {
  const raw = await AsyncStorage.getItem(PREFERENCE_STORAGE_KEY);
  const parsed = parseStoredPreferences(raw);
  setDefaultCurrency(parsed.currency);
  return parsed;
}

export async function storeCurrencyPreference(currency: Currency) {
  const current = await readStoredPreferences();
  return writeStoredPreferences({
    ...current,
    currency,
  });
}

export async function storeThemePreference(theme: PreferenceTheme) {
  const current = await readStoredPreferences();
  return writeStoredPreferences({
    ...current,
    theme,
  });
}

export async function syncStoredPreferencesFromUserSettings(
  userSettings: UserSettingsSnapshot
) {
  const current = await readStoredPreferences();
  return writeStoredPreferences({
    currency: userSettings.preferred_currency ?? current.currency,
    theme: userSettings.preferred_theme
      ? mapBackendThemeToPreference(userSettings.preferred_theme)
      : current.theme,
  });
}
