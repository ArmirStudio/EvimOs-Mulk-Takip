import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  darkenHex,
  getContrastTextColor,
  lightenHex,
  normalizeHexColor,
} from '../utils/branding';
import {
  DEFAULT_STORED_PREFERENCES,
  readStoredPreferences,
  storeThemePreference,
  type PreferenceTheme,
} from '../services/preferences';

export type AppTheme = PreferenceTheme;
export type ResolvedTheme = 'light' | 'dark';
export type BrandOverride = {
  primary: string;
  secondary?: string | null;
} | null;

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  round: 50,
};

const fontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

const motion = {
  springDefault: { damping: 15, stiffness: 150, mass: 1 },
  springBouncy: { damping: 10, stiffness: 180, mass: 0.8 },
  springGentle: { damping: 20, stiffness: 120, mass: 1 },
  durationFast: 200,
  durationNormal: 300,
  durationSlow: 500,
  slideInOffset: 60,
  fadeInInitial: 0,
  fadeInFinal: 1,
  scalePressed: 0.96,
  scaleNormal: 1,
};

type ThemeColors = {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  dark: string;
  darkSecondary: string;
  background: string;
  surface: string;
  surface2: string;
  border: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  success: string;
  successLight: string;
  successText: string;
  warning: string;
  warningLight: string;
  warningText: string;
  error: string;
  errorLight: string;
  errorText: string;
  info: string;
  infoLight: string;
  infoText: string;
  text: string;
  card: string;
  white: string;
  highlightYellow: string;
  overlayStrong: string;
  overlaySoft: string;
  shadow: string;
  shadowStrong: string;
  navGlass: string;
  modalBackdrop: string;
  purple: string;
  purpleLight: string;
  purpleText: string;
  copper: string;
  copperLight: string;
  copperDark: string;
  stitch: {
    primary: string;
    cardBg: string;
    orange50: string;
    orange200: string;
    orange400: string;
    textBrown: string;
    textMuted: string;
    bgLight: string;
  };
};

function createTheme(colors: ThemeColors) {
  return {
    colors,
    spacing,
    borderRadius,
    fontSize,
    fontWeight,
    shadows: {
      sm: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 1,
      },
      md: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.14,
        shadowRadius: 8,
        elevation: 3,
      },
      lg: {
        shadowColor: colors.shadowStrong,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 6,
      },
    },
    wizard: {
      stepperHeight: 4,
      dotSize: 10,
      activeDotSize: 14,
      activeColor: colors.primary,
      inactiveColor: colors.border,
      completedColor: colors.success,
      progressBackground: colors.overlaySoft,
      connectorWidth: 48,
      connectorHeight: 3,
      stepCircleSize: 36,
      progressBarHeight: 6,
      progressBarRadius: 3,
    },
    motion,
    calendar: {
      rentDay: colors.primary,
      rentDayLight: colors.primaryLight,
      duesDay: colors.success,
      duesDayLight: colors.successLight,
      maintenanceDay: colors.accent,
      maintenanceDayLight: colors.errorLight,
      reminderDay: colors.info,
      reminderDayLight: colors.infoLight,
      emptyDay: colors.surface2,
      todayOutline: colors.textPrimary,
      todayBg: colors.purpleLight,
      todayCircle: colors.purple,
      todayCircleText: '#FFFFFF',
      selectedDayBg: colors.primary,
      selectedDayText: colors.textInverse,
    },
  };
}

function applyBrandOverride(
  baseTheme: AppThemeTokens,
  brandOverride: BrandOverride
) {
  if (!brandOverride?.primary) {
    return baseTheme;
  }

  const primary = normalizeHexColor(brandOverride.primary) || baseTheme.colors.primary;
  const secondary = normalizeHexColor(brandOverride.secondary) || darkenHex(primary, 0.18);
  const primaryLight = lightenHex(primary, 0.84);
  const primaryDark = darkenHex(primary, 0.2);
  const accent = secondary;
  const accentLight = lightenHex(accent, 0.8);

  return createTheme({
    ...baseTheme.colors,
    primary,
    primaryHover: darkenHex(primary, 0.08),
    primaryLight,
    primaryDark,
    accent,
    accentHover: darkenHex(accent, 0.08),
    accentLight,
    overlaySoft: lightenHex(primary, 0.9),
    navGlass: baseTheme.colors.navGlass,
    stitch: {
      ...baseTheme.colors.stitch,
      primary,
      orange50: primaryLight,
      orange200: lightenHex(primary, 0.45),
      orange400: primary,
    },
    textInverse: getContrastTextColor(primary),
  });
}

const lightColors: ThemeColors = {
  primary: '#235353',
  primaryHover: '#4A8282',
  primaryLight: '#D0E8E8',
  primaryDark: '#2A4A4A',
  accent: '#6B5C4D',
  accentHover: '#6B5C4D',
  accentLight: '#F1DCC9',
  dark: '#2A4A4A',
  darkSecondary: '#6B5C4D',
  background: '#FDF9F3',
  surface: '#FDF9F3',
  surface2: '#F7F3ED',
  border: '#C0C8C7',
  divider: '#C0C8C7',
  textPrimary: '#1C1C18',
  textSecondary: '#404848',
  textMuted: '#707978',
  textInverse: '#FFFFFF',
  success: '#3A7A5A',
  successLight: '#E4F2EB',
  successText: '#3A7A5A',
  warning: '#8B6A3A',
  warningLight: '#F5EDDE',
  warningText: '#8B6A3A',
  error: '#BA1A1A',
  errorLight: '#F5E4E4',
  errorText: '#BA1A1A',
  info: '#235353',
  infoLight: '#D0E8E8',
  infoText: '#235353',
  text: '#1C1C18',
  card: '#FFFFFF',
  white: '#FFFFFF',
  highlightYellow: '#FFEB3B',
  overlayStrong: 'rgba(28, 28, 24, 0.18)',
  overlaySoft: 'rgba(35, 83, 83, 0.1)',
  shadow: '#1C1C18',
  shadowStrong: '#1C1C18',
  navGlass: 'rgba(253, 249, 243, 0.88)',
  modalBackdrop: 'rgba(28, 28, 24, 0.56)',
  purple: '#235353',
  purpleLight: '#D0E8E8',
  purpleText: '#235353',
  copper: '#B87333',
  copperLight: '#F5E6D3',
  copperDark: '#8B5A1F',
  stitch: {
    primary: '#235353',
    cardBg: '#FFFFFF',
    orange50: '#D0E8E8',
    orange200: '#A0CFCF',
    orange400: '#235353',
    textBrown: '#1C1C18',
    textMuted: '#707978',
    bgLight: '#FDF9F3',
  },
};

const darkColors: ThemeColors = {
  primary: '#A0CFCF',
  primaryHover: '#A0CFCF',
  primaryLight: '#1F4343',
  primaryDark: '#A0CFCF',
  accent: '#D7C3B1',
  accentHover: '#D7C3B1',
  accentLight: '#3E2F24',
  dark: '#0E1818',
  darkSecondary: '#6B5C4D',
  background: '#0E1818',
  surface: '#141E1E',
  surface2: '#1A2525',
  border: '#2A3A39',
  divider: '#2A3A39',
  textPrimary: '#EAF4F4',
  textSecondary: '#C0C8C7',
  textMuted: '#707978',
  textInverse: '#0E1818',
  success: '#4FD695',
  successLight: '#183227',
  successText: '#4FD695',
  warning: '#D4A870',
  warningLight: '#3E2F24',
  warningText: '#D4A870',
  error: '#FF7C7C',
  errorLight: '#351B22',
  errorText: '#FF7C7C',
  info: '#A0CFCF',
  infoLight: '#1F4343',
  infoText: '#A0CFCF',
  text: '#EAF4F4',
  card: '#141E1E',
  white: '#EAF4F4',
  highlightYellow: '#F9DA5A',
  overlayStrong: 'rgba(234, 244, 244, 0.18)',
  overlaySoft: 'rgba(160, 207, 207, 0.14)',
  shadow: '#000000',
  shadowStrong: '#000000',
  navGlass: 'rgba(20, 30, 30, 0.94)',
  modalBackdrop: 'rgba(14, 24, 24, 0.78)',
  purple: '#A0CFCF',
  purpleLight: '#1F4343',
  purpleText: '#A0CFCF',
  copper: '#D4956A',
  copperLight: '#3D2010',
  copperDark: '#B5762A',
  stitch: {
    primary: '#A0CFCF',
    cardBg: '#141E1E',
    orange50: '#1F4343',
    orange200: '#2A5454',
    orange400: '#A0CFCF',
    textBrown: '#EAF4F4',
    textMuted: '#707978',
    bgLight: '#0E1818',
  },
};

export const lightTheme = createTheme(lightColors);
export const darkTheme = createTheme(darkColors);
export type AppThemeTokens = typeof lightTheme;

type ThemeContextValue = {
  isReady: boolean;
  preference: AppTheme;
  resolvedTheme: ResolvedTheme;
  setPreference: (nextTheme: AppTheme) => Promise<void>;
  setBrandOverride: (nextBrand: BrandOverride) => void;
  theme: AppThemeTokens;
};

const ThemeContext = createContext<ThemeContextValue>({
  isReady: false,
  preference: DEFAULT_STORED_PREFERENCES.theme,
  resolvedTheme: 'light',
  setPreference: async () => {},
  setBrandOverride: () => {},
  theme: lightTheme,
});

function resolveTheme(preference: AppTheme, systemTheme: ResolvedTheme): ResolvedTheme {
  if (preference === 'auto') {
    return systemTheme;
  }

  return preference;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const systemTheme: ResolvedTheme = colorScheme === 'dark' ? 'dark' : 'light';
  const [preference, setPreferenceState] = useState<AppTheme>(DEFAULT_STORED_PREFERENCES.theme);
  const [brandOverride, setBrandOverride] = useState<BrandOverride>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    readStoredPreferences()
      .then((storedPreferences) => {
        if (!isMounted) {
          return;
        }

        setPreferenceState(storedPreferences.theme);
      })
      .finally(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setPreference = useCallback(async (nextTheme: AppTheme) => {
    setPreferenceState(nextTheme);
    await storeThemePreference(nextTheme);
  }, []);

  const resolvedTheme = resolveTheme(preference, systemTheme);
  const baseTheme = resolvedTheme === 'dark' ? darkTheme : lightTheme;
  const theme = useMemo(
    () => applyBrandOverride(baseTheme, brandOverride),
    [baseTheme, brandOverride],
  );

  const value: ThemeContextValue = useMemo(
    () => ({
      isReady,
      preference,
      resolvedTheme,
      setPreference,
      setBrandOverride,
      theme,
    }),
    [isReady, preference, resolvedTheme, setPreference, setBrandOverride, theme],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useThemeController() {
  return useContext(ThemeContext);
}

export function useAppTheme() {
  return useThemeController().theme;
}

export function createThemedStyles<T>(factory: (theme: AppThemeTokens) => T) {
  return function useThemedStyles() {
    const theme = useAppTheme();
    return useMemo(() => factory(theme), [theme]);
  };
}

export function getBadgeStyles(theme: AppThemeTokens) {
  return {
    pending: {
      background: theme.colors.warningLight,
      text: theme.colors.warningText,
      border: theme.colors.warning,
    },
    in_progress: {
      background: theme.colors.purpleLight,
      text: theme.colors.purpleText,
      border: theme.colors.purple,
    },
    completed: {
      background: theme.colors.successLight,
      text: theme.colors.successText,
      border: theme.colors.success,
    },
    rejected: {
      background: theme.colors.errorLight,
      text: theme.colors.errorText,
      border: theme.colors.error,
    },
    critical: {
      background: theme.colors.errorLight,
      text: theme.colors.errorText,
      border: theme.colors.error,
    },
    approved: {
      background: theme.colors.successLight,
      text: theme.colors.successText,
      border: theme.colors.success,
    },
    withdrawn: {
      background: theme.colors.surface2,
      text: theme.colors.textSecondary,
      border: theme.colors.border,
    },
  };
}

export function getPriorityStyles(theme: AppThemeTokens) {
  return {
    high: {
      background: theme.colors.errorLight,
      text: theme.colors.errorText,
      border: theme.colors.error,
    },
    medium: {
      background: theme.colors.purpleLight,
      text: theme.colors.purpleText,
      border: theme.colors.purple,
    },
    low: {
      background: theme.colors.successLight,
      text: theme.colors.successText,
      border: theme.colors.success,
    },
  };
}

export function getDashboardIcons(theme: AppThemeTokens) {
  return {
    totalProperties: theme.colors.primary,
    occupied: theme.colors.success,
    vacant: theme.colors.warning,
    pendingMaintenance: theme.colors.purple,
  };
}

export const theme = lightTheme;

export default lightTheme;
