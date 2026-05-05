import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import {
  syncStoredPreferencesFromUserSettings,
  type BackendThemePreference,
  type Currency,
} from './preferences';

export const USER_DATA_STORAGE_KEY = 'user_data';

export type EffectiveBrand = {
  primary: string;
  secondary: string | null;
  source: 'agency' | 'user' | 'creator_agency' | 'creator_user';
};

export type UserData = {
  id: string;
  auth_id: string;
  email: string;
  role: string;
  status?: 'pending' | 'active' | null;
  full_name: string;
  phone: string | null;
  city: string | null;
  district: string | null;
  avatar_url: string | null;
  created_at: string | null;
  created_by?: string | null;
  invited_via_invite_id?: string | null;
  inviteContactLabel?: string | null;
  inviteOfficeName?: string | null;
  inviteLastRemindedAt?: string | null;
  agency_id?: string | null;
  employee_access_level?: 'full' | 'limited' | null;
  brand_color_primary?: string | null;
  brand_color_secondary?: string | null;
  preferred_currency?: Currency | null;
  preferred_theme?: BackendThemePreference | null;
  effectiveBrand?: EffectiveBrand | null;
};

type AgencyBrandRow = {
  name?: string | null;
  brand_color_primary?: string | null;
  brand_color_secondary?: string | null;
};

type UserBrandRow = {
  id: string;
  auth_id?: string | null;
  email: string;
  role: string;
  status?: 'pending' | 'active' | null;
  full_name: string;
  phone?: string | null;
  city?: string | null;
  district?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  invited_via_invite_id?: string | null;
  agency_id?: string | null;
  employee_access_level?: 'full' | 'limited' | null;
  brand_color_primary?: string | null;
  brand_color_secondary?: string | null;
  preferred_currency?: Currency | null;
  preferred_theme?: BackendThemePreference | null;
  agencies?: AgencyBrandRow | AgencyBrandRow[] | null;
  invites?: {
    contact_label?: string | null;
    last_reminded_at?: string | null;
    office_owner_id?: string | null;
    office_owner?: {
      full_name?: string | null;
      agencies?: AgencyBrandRow | AgencyBrandRow[] | null;
    } | null;
  } | null;
};

function normalizeAgencyRelation(agency: AgencyBrandRow | AgencyBrandRow[] | null | undefined) {
  return Array.isArray(agency) ? agency[0] || null : agency || null;
}

function buildEffectiveBrand(
  ownProfile: UserBrandRow,
  creatorProfile?: UserBrandRow | null
): EffectiveBrand | null {
  const ownAgency = normalizeAgencyRelation(ownProfile.agencies);
  if (ownAgency?.brand_color_primary) {
    return {
      primary: ownAgency.brand_color_primary,
      secondary: ownAgency.brand_color_secondary || null,
      source: 'agency',
    };
  }

  if (ownProfile.brand_color_primary) {
    return {
      primary: ownProfile.brand_color_primary,
      secondary: ownProfile.brand_color_secondary || null,
      source: 'user',
    };
  }

  if (!creatorProfile) {
    return null;
  }

  const creatorAgency = normalizeAgencyRelation(creatorProfile.agencies);
  if (creatorAgency?.brand_color_primary) {
    return {
      primary: creatorAgency.brand_color_primary,
      secondary: creatorAgency.brand_color_secondary || null,
      source: 'creator_agency',
    };
  }

  if (creatorProfile.brand_color_primary) {
    return {
      primary: creatorProfile.brand_color_primary,
      secondary: creatorProfile.brand_color_secondary || null,
      source: 'creator_user',
    };
  }

  return null;
}

async function fetchUserBrandProfileById(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      role,
      status,
      full_name,
      phone,
      city,
      district,
      avatar_url,
      created_at,
      created_by,
      invited_via_invite_id,
      agency_id,
      employee_access_level,
      brand_color_primary,
      brand_color_secondary,
      agencies:agency_id (
        name,
        brand_color_primary,
        brand_color_secondary
      ),
      invites:invited_via_invite_id (
        contact_label,
        last_reminded_at,
        office_owner_id,
        office_owner:office_owner_id (
          full_name,
          agencies:agency_id (
            name,
            brand_color_primary,
            brand_color_secondary
          )
        )
      )
    `)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as UserBrandRow | null;
}

export async function loadStoredUserData() {
  try {
    const raw = await AsyncStorage.getItem(USER_DATA_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserData) : null;
  } catch {
    return null;
  }
}

export async function clearStoredUserData() {
  await AsyncStorage.removeItem(USER_DATA_STORAGE_KEY);
}

export async function persistUserData(userData: UserData) {
  await syncStoredPreferencesFromUserSettings({
    preferred_currency: userData.preferred_currency,
    preferred_theme: userData.preferred_theme,
  });
  await AsyncStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify(userData));
}

export async function buildUserDataForSession(authId: string) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      auth_id,
      email,
      role,
      status,
      full_name,
      phone,
      city,
      district,
      avatar_url,
      created_at,
      created_by,
      invited_via_invite_id,
      agency_id,
      employee_access_level,
      brand_color_primary,
      brand_color_secondary,
      preferred_currency,
      preferred_theme,
      agencies:agency_id (
        name,
        brand_color_primary,
        brand_color_secondary
      ),
      invites:invited_via_invite_id (
        contact_label,
        last_reminded_at,
        office_owner_id,
        office_owner:office_owner_id (
          full_name,
          agencies:agency_id (
            name,
            brand_color_primary,
            brand_color_secondary
          )
        )
      )
    `)
    .eq('auth_id', authId)
    .single();

  if (error || !data) {
    throw error || new Error('Kullanıcı profili bulunamadı');
  }

  const ownProfile = data as UserBrandRow;
  const creatorProfile = ownProfile.created_by
    ? await fetchUserBrandProfileById(ownProfile.created_by)
    : null;

  const effectiveBrand = buildEffectiveBrand(ownProfile, creatorProfile);

  return {
    id: ownProfile.id,
    auth_id: ownProfile.auth_id || authId,
    email: ownProfile.email,
    role: ownProfile.role,
    status: ownProfile.status || 'active',
    full_name: ownProfile.full_name,
    phone: ownProfile.phone || null,
    city: ownProfile.city || null,
    district: ownProfile.district || null,
    avatar_url: ownProfile.avatar_url || null,
    created_at: ownProfile.created_at || null,
    created_by: ownProfile.created_by || null,
    invited_via_invite_id: ownProfile.invited_via_invite_id || null,
    inviteContactLabel: ownProfile.invites?.contact_label || null,
    inviteOfficeName:
      normalizeAgencyRelation(ownProfile.invites?.office_owner?.agencies)?.name ||
      ownProfile.invites?.office_owner?.full_name ||
      null,
    inviteLastRemindedAt: ownProfile.invites?.last_reminded_at || null,
    agency_id: ownProfile.agency_id || null,
    employee_access_level: ownProfile.employee_access_level || null,
    brand_color_primary: ownProfile.brand_color_primary || null,
    brand_color_secondary: ownProfile.brand_color_secondary || null,
    preferred_currency: ownProfile.preferred_currency || null,
    preferred_theme: ownProfile.preferred_theme || null,
    effectiveBrand,
  } satisfies UserData;
}

export async function hydrateStoredUserDataFromSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    await clearStoredUserData();
    return null;
  }

  const userData = await buildUserDataForSession(session.user.id);
  await persistUserData(userData);
  return userData;
}
