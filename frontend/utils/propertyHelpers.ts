/**
 * Mülk ekranlarında paylaşılan sabitler ve yardımcı fonksiyonlar.
 * agent/properties ve landlord/properties'te kopyalanmış kodu ortaklaştırır.
 */

// ─── Placeholder görsel listesi ──────────────────────────────────────────────
export const PROPERTY_IMAGES = [
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600',
  'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=600',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600',
];

export const getPropertyImage = (index: number): string =>
  PROPERTY_IMAGES[index % PROPERTY_IMAGES.length];

// ─── Durum etiketleri (tutarlı Türkçe) ───────────────────────────────────────
export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'occupied':    return 'Kirada';
    case 'vacant':      return 'Boş';
    case 'maintenance': return 'Bakımda';
    default:            return status;
  }
};

// ─── Para formatlama ──────────────────────────────────────────────────────────

// Kullanıcı tercihi (usePreferences hook tarafından set edilir)
let _defaultCurrency: 'TRY' | 'USD' | 'EUR' = 'TRY';
export const setDefaultCurrency = (currency: 'TRY' | 'USD' | 'EUR') => {
  _defaultCurrency = currency;
};
export const getDefaultCurrency = (): 'TRY' | 'USD' | 'EUR' => _defaultCurrency;

export const formatCurrency = (
  amount: number | null | undefined,
  currency?: 'TRY' | 'USD' | 'EUR'
): string => {
  const num = Number(amount || 0);
  const formatted = num.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const activeCurrency = currency || _defaultCurrency;

  if (activeCurrency === 'USD') return `$${formatted}`;
  if (activeCurrency === 'EUR') return `€${formatted}`;
  return `${formatted}₺`;
};

export const formatCurrencyInput = (raw: string): string => {
  // TextInput'a yazılan ham sayıyı formatlı gösterir (noktalı binlik ayracı)
  // "5000" → "5.000"
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  return num.toLocaleString('tr-TR');
};

export const formatDecimalInput = (raw: string): { display: string; raw: string } => {
  // Accepts user input with comma or dot as decimal separator.
  // Returns { display: "1.250,50", raw: "1250.50" } for parent state storage.
  const sanitized = raw.replace(/[^0-9.,]/g, '');

  // Find decimal separator (first comma or dot)
  const commaIdx = sanitized.indexOf(',');
  const dotIdx = sanitized.indexOf('.');
  let sepIdx = -1;
  if (commaIdx !== -1 && dotIdx !== -1) sepIdx = Math.min(commaIdx, dotIdx);
  else if (commaIdx !== -1) sepIdx = commaIdx;
  else if (dotIdx !== -1) sepIdx = dotIdx;

  let intStr: string;
  let decStr: string | null = null;

  if (sepIdx !== -1) {
    intStr = sanitized.slice(0, sepIdx).replace(/[^0-9]/g, '');
    decStr = sanitized.slice(sepIdx + 1).replace(/[^0-9]/g, '').slice(0, 2);
  } else {
    intStr = sanitized.replace(/[^0-9]/g, '');
  }

  const formattedInt = intStr ? parseInt(intStr, 10).toLocaleString('tr-TR') : '';

  const display = decStr !== null ? `${formattedInt},${decStr}` : formattedInt;
  const rawOut = decStr !== null ? `${intStr}.${decStr}` : intStr;
  return { display, raw: rawOut };
};

export const parseCurrencyInput = (formatted: string): number => {
  // "1.234,56" → 1234.56 veya "1.234" → 1234
  // Turkish locale: binlik ayracı ".", ondalık ayracı ","
  const cleaned = formatted.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

// ─── Kira günü formatlama ────────────────────────────────────────────────────
export const formatRentDay = (day: number): string => {
  const now = new Date();
  const nextPayment = new Date(now.getFullYear(), now.getMonth(), day);
  if (nextPayment < now) nextPayment.setMonth(nextPayment.getMonth() + 1);
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${nextPayment.getDate()} ${months[nextPayment.getMonth()]} ${nextPayment.getFullYear()}`;
};
