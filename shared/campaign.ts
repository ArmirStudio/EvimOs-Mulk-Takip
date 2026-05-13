export type CampaignType = 'inline_ad' | 'news' | 'testimonial' | 'service' | 'interstitial';

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  inline_ad: 'Icerik Reklami',
  news: 'Haber',
  testimonial: 'Musteri Yorumu',
  service: 'Servis Ortagi',
  interstitial: 'Tam Ekran',
};

export const CAMPAIGN_TYPE_ICONS: Record<CampaignType, string> = {
  inline_ad: 'campaign',
  news: 'article',
  testimonial: 'star',
  service: 'handshake',
  interstitial: 'fullscreen',
};

export const CAMPAIGN_TYPE_OPTIONS: Array<{
  type: CampaignType;
  label: string;
  desc: string;
  icon: string;
}> = [
  {
    type: 'inline_ad',
    label: CAMPAIGN_TYPE_LABELS.inline_ad,
    desc: 'Haberlerin arasina yerlestirilen reklam banneri.',
    icon: CAMPAIGN_TYPE_ICONS.inline_ad,
  },
  {
    type: 'news',
    label: 'Emlak Haberi',
    desc: 'Haber akisinda ozel gorunumlu guncel haber ogesi.',
    icon: CAMPAIGN_TYPE_ICONS.news,
  },
  {
    type: 'testimonial',
    label: 'Mutlu Musteri',
    desc: 'Musteri yorumu ve yildiz degerlendirmesi.',
    icon: CAMPAIGN_TYPE_ICONS.testimonial,
  },
  {
    type: 'service',
    label: CAMPAIGN_TYPE_LABELS.service,
    desc: 'Is ortaklarinin logosu ve hizmet aciklamasi.',
    icon: CAMPAIGN_TYPE_ICONS.service,
  },
  {
    type: 'interstitial',
    label: CAMPAIGN_TYPE_LABELS.interstitial,
    desc: 'Uygulama acilisinda tam ekran gosterilen reklam.',
    icon: CAMPAIGN_TYPE_ICONS.interstitial,
  },
];

export interface AdCampaign {
  id: string;
  type: CampaignType;
  title: string;
  body: string | null;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  
  // Testimonial specific
  client_name: string | null;
  client_avatar: string | null;
  client_rating: number | null;
  client_title: string | null;
  client_company: string | null;

  // Service specific
  service_icon: string | null;
  
  // Interstitial specific
  daily_frequency: number | null;
  lock_duration: number | null;    // X butonu kaç sn sonra aktif (0=anında)
  modal_width_pct: number | null;  // Modal genişliği (ekranın %si, 60-95)
  image_height_pct: number | null; // Görsel yüksekliği (ekranın %si, 20-50)
  start_hour: number | null;       // Günlük ilk gösterim saati (0-23, varsayılan 7)

  // Advertiser / Company shared fields
  company_name: string | null;
  company_description: string | null;
  company_logo: string | null;
  company_banner: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  contact_website: string | null;

  // Targeting
  target_roles: string[];
  target_provinces: string[] | null;
  target_districts: string[] | null;
  target_agency_ids: string[] | null;

  created_at?: string;
  updated_at?: string;
}

export interface AdCampaignStats {
  campaign_id: string;
  title: string | null;
  type: CampaignType;
  impressions: number;
  clicks: number;
  link_opens: number;
}
