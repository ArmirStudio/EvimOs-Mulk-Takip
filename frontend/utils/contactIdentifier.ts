export type ContactIdentifierKind = 'email' | 'phone';

function isMostlyPhoneCharacters(value: string) {
  // Digits plus common phone formatting characters.
  return /^[\d\s()+\-\.]+$/.test(value);
}

export function getContactIdentifierKind(rawValue: string): ContactIdentifierKind {
  const value = (rawValue || '').trim();
  if (!value) {
    return 'email';
  }

  if (value.includes('@')) {
    return 'email';
  }

  // If user starts typing a phone-like prefix, switch immediately.
  if (/^[+\d(]/.test(value)) {
    return 'phone';
  }

  // If they start typing letters, treat it as email/username.
  if (/[a-zA-Z]/.test(value)) {
    return 'email';
  }

  return isMostlyPhoneCharacters(value) ? 'phone' : 'email';
}

export function getIoniconForContactIdentifier(rawValue: string): 'call-outline' | 'mail-outline' {
  return getContactIdentifierKind(rawValue) === 'phone' ? 'call-outline' : 'mail-outline';
}

// MaterialIcons icon set: use "email" instead of "mail-outline" (not available there).
export function getMaterialIconForContactIdentifier(rawValue: string): 'phone' | 'email' {
  return getContactIdentifierKind(rawValue) === 'phone' ? 'phone' : 'email';
}
