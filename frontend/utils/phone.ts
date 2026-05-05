export function normalizeTurkishPhone(input?: string | null) {
  const raw = (input || '').trim();
  if (!raw) return '';

  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('90') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `+90${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+90${digits}`;
  }
  if (raw.startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return raw;
}

export function normalizeInviteCode(input: string) {
  return input.replace(/\s/g, '').toUpperCase();
}
