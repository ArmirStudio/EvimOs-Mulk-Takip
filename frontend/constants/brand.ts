import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

export const brand = {
  appName: 'EvimOs',
  fullName: 'EvimOs - Mülk Yönetim',
  shortTitle: 'Mülk Yönetim',
  tagline: 'Sakin, görünür ve güvenilir mülk yönetimi',
  heroEyebrow: 'Operasyonları sadeleştirin',
  heroTitle: 'Kira, bakım ve belge akışını tek merkezde toplayın.',
  heroSubtitle:
    'EvimOs, emlak ofisi, ev sahibi ve kiracı arasındaki günlük mülk operasyonlarını sakin, görünür ve güvenilir bir akışta birleştirir.',
  heroFootnote: 'Tek oturum. Tek operasyon zemini. Daha az dağınıklık.',
  loginEyebrow: 'Güvenli giriş',
  loginTitle: 'Yetkili kullanıcılar için tek erişim noktası.',
  loginSubtitle:
    'Ofis ekibi, ev sahipleri ve kiracılar aynı marka dili içinde kendi panellerine buradan ulaşır.',
  loginHelper:
    'Makbuz, bakım, ekip ve belge hareketleri oturum açtıktan sonra rolünüze göre şekillenir.',
} as const;

export const brandColors = {
  // Logo colors
  copperDark: '#8B6F47',
  copperMain: '#C8925A',
  copperLight: '#D4A574',
  greenDark: '#2D6A4F',
  greenMain: '#40916C',
  greenLight: '#52B788',
  brownDark: '#6B5C4D',
} as const;

export const publicSurface = {
  heroPanel: '#F4EEE4',
  heroPanelStrong: '#ECE3D8',
  heroTint: 'rgba(35, 83, 83, 0.08)',
  heroTintStrong: 'rgba(35, 83, 83, 0.14)',
  accentSoft: '#EADBC7',
  accentStrong: '#C8925A',
  panel: '#FFFDFC',
  panelBorder: 'rgba(35, 83, 83, 0.12)',
  panelShadow: 'rgba(28, 28, 24, 0.08)',
  chipBg: '#E8F0EF',
  chipText: '#235353',
  warmText: '#6B5C4D',
  fieldBg: '#FFFCF8',
  fieldBorder: '#D6DDD8',
  fieldFocus: '#235353',
  fieldDangerBg: '#FFF1EF',
  fieldDangerBorder: '#E8B5AE',
} as const;

export const landingHighlights: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'layers-outline',
    title: 'Tek akış',
    description: 'Makbuz, bakım ve iletişim kayıtları tek operasyon katmanında toplanır.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Güvenilir görünürlük',
    description: 'Kim ne yaptı, hangi kayıt bekliyor, hangi adım tamamlandı net biçimde izlenir.',
  },
  {
    icon: 'time-outline',
    title: 'Daha az sürtünme',
    description: 'Günlük saha trafiği daha az arama, daha az kayıp bağlam ve daha hızlı karar ile ilerler.',
  },
];

export const landingRoles: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'business-outline',
    title: 'Emlak ofisi',
    description: 'Portföy, ekip ve müşteri operasyonlarını tek bakışta yönetin.',
  },
  {
    icon: 'home-outline',
    title: 'Ev sahibi',
    description: 'Ödeme, bakım ve mülk durumu güncellemelerini daha sakin takip edin.',
  },
  {
    icon: 'person-outline',
    title: 'Kiracı',
    description: 'Arıza ve ödeme kayıtlarını güvenli, anlaşılır ve hızlı bir akışla iletin.',
  },
];

export const landingProof: { label: string; value: string }[] = [
  { label: 'Ödeme akışı', value: 'Makbuz ve kira takibi aynı panelde' },
  { label: 'Bakım akışı', value: 'Talep, not ve durum hareketi görünür' },
  { label: 'Belge akışı', value: 'Sözleşme ve dokümanlara merkezi erişim' },
];
