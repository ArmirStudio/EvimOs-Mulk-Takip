export type BrandColorValue = {
  primary: string;
  secondary?: string | null;
};

export const BRAND_COLOR_PRESETS = [
  '#D4622B',
  '#B35C2E',
  '#D94F45',
  '#E67E22',
  '#B88A2A',
  '#3C8D5A',
  '#2F8F9D',
  '#3566C8',
  '#5B53D6',
  '#8B5CF6',
  '#C44D7C',
  '#4B5563',
] as const;

function clampChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function normalizeHexColor(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/^#/, '');
  const valid = /^[\da-fA-F]{3}$|^[\da-fA-F]{6}$/;

  if (!valid.test(normalized)) {
    return null;
  }

  const expanded = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;

  return `#${expanded.toUpperCase()}`;
}

export function isValidHexColor(value?: string | null) {
  return !!normalizeHexColor(value);
}

export function hexToRgb(value: string) {
  const normalized = normalizeHexColor(value);
  if (!normalized) {
    return null;
  }

  const raw = normalized.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

export function mixHexColors(base: string, target: string, weight: number) {
  const sourceRgb = hexToRgb(base);
  const targetRgb = hexToRgb(target);

  if (!sourceRgb || !targetRgb) {
    return normalizeHexColor(base) || '#D4622B';
  }

  return rgbToHex(
    sourceRgb.r + (targetRgb.r - sourceRgb.r) * weight,
    sourceRgb.g + (targetRgb.g - sourceRgb.g) * weight,
    sourceRgb.b + (targetRgb.b - sourceRgb.b) * weight
  );
}

export function lightenHex(value: string, amount = 0.2) {
  return mixHexColors(value, '#FFFFFF', amount);
}

export function darkenHex(value: string, amount = 0.2) {
  return mixHexColors(value, '#000000', amount);
}

export function getContrastTextColor(value: string) {
  const rgb = hexToRgb(value);
  if (!rgb) {
    return '#FFFFFF';
  }

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62 ? '#2C1810' : '#FFFCF8';
}
