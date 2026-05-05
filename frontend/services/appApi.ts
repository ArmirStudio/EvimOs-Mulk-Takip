import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { isSupabaseConfigured, missingSupabaseEnvVars, supabase } from './supabase';
import type { TeamReportPayload, TeamReportRange } from './teamTypes';
import { clearStoredUserData } from './userSession';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
};

type TeamMembersResponse = {
  members: any[];
  viewer: { is_manager: boolean; office_owner_id: string };
};

type TeamMemberDetailResponse = {
  member: any;
  metrics: {
    completed_tasks_this_month: number;
    property_showings_this_month: number;
  };
};

class ApiRequestError extends Error {
  status: number;
  path: string;
  detail: string;

  constructor(status: number, path: string, detail: string) {
    super(`[${status}] ${path} - ${detail}`);
    this.name = 'ApiRequestError';
    this.status = status;
    this.path = path;
    this.detail = detail;
  }
}

async function buildApiRequestError(response: Response, path: string, fallbackDetail: string) {
  let detail = fallbackDetail;

  try {
    const errorPayload = await response.json();
    detail = errorPayload?.detail || detail;
  } catch {
    // ignore non-json error bodies
  }

  return new ApiRequestError(response.status, path, detail);
}

function shouldClearSessionForAuthError(error: ApiRequestError) {
  const detail = error.detail.toLocaleLowerCase('tr-TR');
  return (
    detail.includes('gecersiz token') ||
    detail.includes('geçersiz token') ||
    detail.includes('kullanici profili bulunamadi') ||
    detail.includes('kullanıcı profili bulunamadı') ||
    detail.includes('oturum bulunamadi') ||
    detail.includes('oturum bulunamadı')
  );
}

function buildApiUrl(path: string, query?: RequestOptions['query']) {
  const baseUrl = resolveApiBaseUrl();
  const url = new URL(`${baseUrl}${path}`);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  return url;
}

function getExpoDevHost() {
  const constantsAny = Constants as any;
  const hostUri =
    constantsAny.expoConfig?.hostUri ||
    constantsAny.expoGoConfig?.debuggerHost ||
    constantsAny.manifest2?.extra?.expoClient?.hostUri ||
    constantsAny.manifest?.debuggerHost;

  if (typeof hostUri !== 'string' || hostUri.length === 0) {
    return null;
  }

  return hostUri.split(':')[0] || null;
}

function withApiSuffix(url: string) {
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function resolveLocalhostForNative(explicitUrl: string) {
  try {
    const parsed = new URL(explicitUrl);
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

    if (!isLocalhost || Platform.OS === 'web') {
      return explicitUrl;
    }

    const devHost = getExpoDevHost();
    if (devHost) {
      parsed.hostname = devHost;
      return parsed.toString();
    }

    if (Platform.OS === 'android') {
      parsed.hostname = '10.0.2.2';
      return parsed.toString();
    }
  } catch {
    // URL construction below will still surface invalid explicit config.
  }

  return explicitUrl;
}

function resolveApiBaseUrl() {
  const explicitUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
  if (explicitUrl) {
    return withApiSuffix(resolveLocalhostForNative(explicitUrl));
  }

  const devHost = getExpoDevHost();
  if (devHost) {
    return `http://${devHost}:8000/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api';
  }

  return 'http://localhost:8000/api';
}

async function getAccessToken() {
  if (!isSupabaseConfigured) {
    throw new Error(
      `Supabase ayarları eksik: ${missingSupabaseEnvVars.join(', ')}`
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    await clearStoredUserData();
    await supabase.auth.signOut();
    throw new Error('Oturum bulunamadi');
  }

  return session.access_token;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getAccessToken();
  const url = buildApiUrl(path, options.query);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error: any) {
    throw new Error(`Backend bağlantısı kurulamadı (${url.origin}). ${error?.message || 'Ağ isteği başarısız oldu'}`);
  }

  if (!response.ok) {
    const error = await buildApiRequestError(response, url.pathname, 'API isteği başarısız oldu');
    if (response.status === 401 && shouldClearSessionForAuthError(error)) {
      await clearStoredUserData();
      await supabase.auth.signOut();
    }
    throw error;
  }

  return (await response.json()) as T;
}

export async function publicApiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = buildApiUrl(path, options.query);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error: any) {
    throw new Error(`Backend bağlantısı kurulamadı (${url.origin}). ${error?.message || 'Ağ isteği başarısız oldu'}`);
  }

  if (!response.ok) {
    throw await buildApiRequestError(response, url.pathname, 'API isteği başarısız oldu');
  }

  return (await response.json()) as T;
}

export function listMaintenance(params?: { propertyId?: string; status?: string }) {
  return apiRequest<{ maintenance_requests: any[] }>('/maintenance/list', {
    query: {
      property_id: params?.propertyId,
      status: params?.status,
    },
  });
}

export function getMaintenance(requestId: string) {
  return apiRequest<any>(`/maintenance/${requestId}`);
}

export function createMaintenance(payload: {
  property_id: string;
  title: string;
  description: string;
  photo_urls: string[];
  priority?: 'low' | 'medium' | 'high';
}) {
  return apiRequest<{ success: boolean; request_id: string }>('/maintenance/create', {
    method: 'POST',
    body: payload,
  });
}

export function transitionMaintenance(
  requestId: string,
  payload: {
    action: 'start' | 'reject' | 'complete' | 'reopen';
    note?: string;
    photo_urls?: string[];
  }
) {
  return apiRequest<{ success: boolean; status: string }>(`/maintenance/${requestId}/transition`, {
    method: 'POST',
    body: payload,
  });
}

export function reviewMaintenanceAsTenant(
  requestId: string,
  payload: {
    action: 'approve' | 'reject';
    reason?: string;
  }
) {
  return apiRequest<{ success: boolean; status: string }>(`/maintenance/${requestId}/tenant-review`, {
    method: 'POST',
    body: payload,
  });
}

export function addMaintenanceLog(
  requestId: string,
  payload: {
    note?: string;
    photo_urls?: string[];
  }
) {
  return apiRequest<{ success: boolean }>(`/maintenance/${requestId}/log`, {
    method: 'POST',
    body: payload,
  });
}

export function addLandlordMaintenanceNote(
  requestId: string,
  payload: {
    note: string;
  }
) {
  return apiRequest<{ success: boolean }>(`/maintenance/${requestId}/landlord-note`, {
    method: 'POST',
    body: payload,
  });
}

export function listReceipts(params?: { propertyId?: string; status?: string }) {
  return apiRequest<{ receipts: any[] }>('/receipts/list', {
    query: {
      property_id: params?.propertyId,
      status: params?.status,
    },
  });
}

export function listUsers(params?: { role?: string }) {
  return apiRequest<{ users: any[] }>('/users/list', {
    query: {
      role: params?.role,
    },
  });
}

export function listProperties() {
  return apiRequest<{ properties: any[] }>('/properties/list');
}

export type PropertyMutationPayload = {
  address: string;
  city: string;
  district: string;
  property_type: string;
  landlord_id: string;
  monthly_rent: number;
  description?: string | null;
  status?: 'vacant' | 'occupied' | 'maintenance';
  dues_amount?: number | null;
  rent_day?: number | null;
  dues_day?: number | null;
  contract_start?: string | null;
  contract_end?: string | null;
  contract_duration?: number | null;
  tenant_id?: string | null;
  employee_id?: string | null;
  is_furnished?: boolean | null;
  amenities?: Record<string, boolean> | null;
  area?: number | null;
  heating?: string | null;
  deposit_amount?: number | null;
  deposit_currency?: 'TRY' | 'USD' | 'EUR' | null;
  images?: string[] | null;
};

export function createProperty(payload: PropertyMutationPayload) {
  return apiRequest<{ success: boolean; property_id: string }>('/properties/create', {
    method: 'POST',
    body: payload,
  });
}

export function updateProperty(propertyId: string, payload: PropertyMutationPayload) {
  return apiRequest<{ success: boolean; property: any }>(`/properties/${propertyId}`, {
    method: 'PUT',
    body: payload,
  });
}

export function deleteProperty(propertyId: string) {
  return apiRequest<{ success: boolean }>(`/properties/${propertyId}`, {
    method: 'DELETE',
  });
}

export function createUser(payload: {
  email: string;
  password?: string | null;
  role: string;
  full_name: string;
  phone?: string | null;
  city?: string | null;
  district?: string | null;
  created_by?: string | null;
  property_id?: string | null;
  employee_access_level?: 'full' | 'limited' | null;
}) {
  return apiRequest<{ success: boolean; user_id: string }>('/users/create', {
    method: 'POST',
    body: payload,
  });
}

export function getUserDetail(userId: string) {
  return apiRequest<{ user: any; properties: any[] }>(`/users/${userId}`);
}

export function updateUser(
  userId: string,
  payload: {
    full_name?: string;
    phone?: string | null;
    city?: string | null;
    district?: string | null;
    employee_access_level?: 'full' | 'limited' | null;
    preferred_currency?: 'TRY' | 'USD' | 'EUR';
    preferred_theme?: 'light' | 'dark' | 'system';
  }
) {
  return apiRequest<{ success: boolean; user: any }>(`/users/${userId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteUser(userId: string) {
  return apiRequest<{ success: boolean }>(`/users/${userId}`, {
    method: 'DELETE',
  });
}

export function getReceipt(receiptId: string) {
  return apiRequest<any>(`/receipts/${receiptId}`);
}

export function uploadReceipt(payload: {
  property_id: string;
  receipt_type: 'rent' | 'dues' | 'other';
  amount: number;
  month: string;
  document_url?: string | null;
  storage_path?: string | null;
  notes?: string | null;
  replaces_receipt_id?: string | null;
}) {
  return apiRequest<{ success: boolean; receipt_id: string }>('/receipts/upload', {
    method: 'POST',
    body: payload,
  });
}

export function reviewReceipt(receiptId: string, payload: { action: 'approve' | 'reject'; notes?: string }) {
  return apiRequest<{ success: boolean; status: string }>(`/receipts/${receiptId}/review`, {
    method: 'POST',
    body: payload,
  });
}

export function withdrawReceipt(receiptId: string, payload: { reason?: string }) {
  return apiRequest<{ success: boolean; status: string }>(`/receipts/${receiptId}/withdraw`, {
    method: 'POST',
    body: payload,
  });
}

export function revokeReceiptReview(receiptId: string, payload: { reason: string }) {
  return apiRequest<{ success: boolean; status: string }>(`/receipts/${receiptId}/revoke-review`, {
    method: 'POST',
    body: payload,
  });
}

export function listTeamMembers() {
  return apiRequest<TeamMembersResponse>('/team/members');
}

export function getTeamMemberDetail(memberId: string) {
  return apiRequest<TeamMemberDetailResponse>(`/team/members/${memberId}`);
}

export function listTeamTasks() {
  return apiRequest<{ tasks: any[] }>('/team/tasks');
}

export function createTeamTask(payload: {
  assignee_id: string;
  task_type: string;
  title: string;
  description?: string | null;
  property_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  scheduled_at: string;
  repeat_enabled: boolean;
}) {
  return apiRequest<{ success: boolean; task: any }>('/team/tasks', {
    method: 'POST',
    body: payload,
  });
}

export function getTeamTask(taskId: string) {
  return apiRequest<any>(`/team/tasks/${taskId}`);
}

export function updateTeamTask(
  taskId: string,
  payload: {
    assignee_id?: string;
    task_type?: string;
    title?: string;
    description?: string | null;
    property_id?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    scheduled_at?: string;
    repeat_enabled?: boolean;
  }
) {
  return apiRequest<{ success: boolean; task: any }>(`/team/tasks/${taskId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function transitionTeamTask(
  taskId: string,
  payload: {
    action: 'start' | 'complete' | 'cancel';
    note?: string;
    photo_urls?: string[];
  }
) {
  return apiRequest<{ success: boolean; task: any }>(`/team/tasks/${taskId}/transition`, {
    method: 'POST',
    body: payload,
  });
}

export function listTeamAnnouncements() {
  return apiRequest<{ announcements: any[] }>('/team/announcements');
}

export function listTeamMessages() {
  return apiRequest<{ messages: any[] }>('/team/messages');
}

export function createTeamMessage(payload: { body: string }) {
  return apiRequest<{ success: boolean; message: any }>('/team/messages', {
    method: 'POST',
    body: payload,
  });
}

export function createTeamAnnouncement(payload: {
  title: string;
  body: string;
  send_to_all: boolean;
  recipient_ids?: string[];
  attachment_path?: string | null;
  attachment_kind?: 'image' | 'document' | 'file' | null;
}) {
  return apiRequest<{ success: boolean; announcement: any }>('/team/announcements', {
    method: 'POST',
    body: payload,
  });
}

export function markAnnouncementRead(announcementId: string) {
  return apiRequest<{ success: boolean }>(`/team/announcements/${announcementId}/read`, {
    method: 'POST',
  });
}

export function remindAnnouncement(announcementId: string) {
  return apiRequest<{ success: boolean; reminded_count: number }>(`/team/announcements/${announcementId}/remind`, {
    method: 'POST',
  });
}

export function getTeamReport(range: TeamReportRange) {
  return apiRequest<TeamReportPayload>('/team/report', {
    query: { range },
  });
}

export function listDashboardCampaigns() {
  return apiRequest<{ campaigns: any[] }>('/dashboard/campaigns');
}

export function resolveLoginIdentifier(identifier: string) {
  return publicApiRequest<{ email: string; resolved: boolean }>('/auth/resolve-identifier', {
    method: 'POST',
    body: { identifier },
  });
}

export type InviteRole = 'tenant' | 'landlord';

export type PendingInviteUser = {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: InviteRole;
  status: 'pending' | 'active';
  created_at: string;
  invited_via_invite_id?: string | null;
  invites?: {
    id: string;
    contact_label?: string;
    role: InviteRole;
    office_owner_id: string;
    prefill_full_name?: string | null;
    prefill_phone?: string | null;
    prefill_email?: string | null;
    last_reminded_at?: string | null;
    reminder_count?: number;
    created_at: string;
  } | null;
};

export type PublicInvitePayload = {
  valid: boolean;
  role: InviteRole;
  contact_label: string;
  office_name: string;
  expires_at: string;
  prefill_full_name?: string | null;
  prefill_phone?: string | null;
  prefill_email?: string | null;
};

export function createInvite(payload: {
  role: InviteRole;
  contact_label: string;
  prefill_full_name?: string | null;
  prefill_phone?: string | null;
  prefill_email?: string | null;
}) {
  return apiRequest<{ invite: any; token: string; code: string; link: string }>('/invites', {
    method: 'POST',
    body: payload,
  });
}

export function getPublicInvite(token: string) {
  return publicApiRequest<PublicInvitePayload>(`/public/invites/${token}`);
}

export function lookupPublicInviteCode(code: string) {
  return publicApiRequest<PublicInvitePayload>('/public/invites/lookup-code', {
    method: 'POST',
    body: { code },
  });
}

export function registerPublicInvite(
  token: string,
  payload: {
    full_name: string;
    phone?: string | null;
    email: string;
    password: string;
  }
) {
  return publicApiRequest<{ success: boolean; user_id: string; role: InviteRole; status: 'pending' }>(
    `/public/invites/${token}/register`,
    {
      method: 'POST',
      body: payload,
    }
  );
}

export function registerPublicInviteCode(
  code: string,
  payload: {
    full_name: string;
    phone?: string | null;
    email: string;
    password: string;
  }
) {
  return publicApiRequest<{ success: boolean; user_id: string; role: InviteRole; status: 'pending' }>(
    '/public/invites/register-code',
    {
      method: 'POST',
      body: { code, ...payload },
    }
  );
}

export function listPendingInvites(params?: { role?: InviteRole | 'all' }) {
  return apiRequest<{ pending: PendingInviteUser[] }>('/invites/pending', {
    query: {
      role: params?.role === 'all' ? undefined : params?.role,
    },
  });
}

export function getPendingInviteDetail(userId: string) {
  return apiRequest<{ pending: PendingInviteUser }>(`/invites/pending/${userId}`);
}

export function approvePendingInvite(userId: string) {
  return apiRequest<{ success: boolean; user: any }>(`/invites/pending/${userId}`, {
    method: 'PATCH',
    body: { action: 'approve' },
  });
}

export function updatePendingInviteLabel(userId: string, contactLabel: string) {
  return apiRequest<{ success: boolean; invite: any }>(`/invites/pending/${userId}`, {
    method: 'PATCH',
    body: { action: 'update_label', contact_label: contactLabel },
  });
}

export function rejectPendingInvite(userId: string) {
  return apiRequest<{ success: boolean }>(`/invites/pending/${userId}`, {
    method: 'DELETE',
  });
}

export function remindPendingInvite() {
  return apiRequest<{
    success: boolean;
    cooldown_seconds: number;
    next_allowed_at?: string;
  }>('/invites/remind', {
    method: 'POST',
  });
}

export function getAdminDashboard() {
  return apiRequest<any>('/admin/dashboard');
}

export function listAdminStructures() {
  return apiRequest<{ items: any[] }>('/admin/structures');
}

export function listAdminContacts() {
  return apiRequest<{ contacts: any[] }>('/admin/contacts');
}

export function getAdminAgency(agencyId: string) {
  return apiRequest<{ agency: any }>(`/admin/agencies/${agencyId}`);
}

export function createAdminAgency(payload: {
  entity_type: 'office' | 'company';
  name: string;
  location: string;
  district?: string | null;
  address?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  brand_color_primary?: string | null;
  brand_color_secondary?: string | null;
  active_regions?: string[];
  subscription_plan?: 'free' | 'basic' | 'premium';
  max_properties?: number;
  contract_start?: string | null;
  contract_end?: string | null;
  contact_email: string;
  contact_phone?: string | null;
  notes?: string | null;
  status?: 'active' | 'suspended' | 'inactive';
  agent_password?: string | null;
}) {
  return apiRequest<{ success: boolean; agency: any; agent: any }>('/admin/agencies', {
    method: 'POST',
    body: payload,
  });
}

export function updateAdminAgency(
  agencyId: string,
  payload: {
    entity_type?: 'office' | 'company';
    name?: string;
    location?: string;
    address?: string | null;
    logo_url?: string | null;
    banner_url?: string | null;
    brand_color_primary?: string | null;
    brand_color_secondary?: string | null;
    active_regions?: string[];
    subscription_plan?: 'free' | 'basic' | 'premium';
    max_properties?: number;
    contract_start?: string | null;
    contract_end?: string | null;
    contact_email?: string;
    contact_phone?: string | null;
    notes?: string | null;
    status?: 'active' | 'suspended' | 'inactive';
  }
) {
  return apiRequest<{ success: boolean; agency: any }>(`/admin/agencies/${agencyId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function createAdminStandaloneAgent(payload: {
  email: string;
  password?: string | null;
  full_name: string;
  phone?: string | null;
  city: string;
  district: string;
  avatar_url?: string | null;
  brand_color_primary?: string | null;
  brand_color_secondary?: string | null;
}) {
  return apiRequest<{ success: boolean; user: any }>('/admin/agents/standalone', {
    method: 'POST',
    body: payload,
  });
}

export function getAdminAgent(userId: string) {
  return apiRequest<{ user: any; agencies: any[] }>(`/admin/agents/${userId}`);
}

export function updateAdminAgent(
  userId: string,
  payload: {
    full_name?: string;
    phone?: string | null;
    city?: string;
    district?: string;
    agency_id?: string | null;
    avatar_url?: string | null;
    brand_color_primary?: string | null;
    brand_color_secondary?: string | null;
  }
) {
  return apiRequest<{ success: boolean; user: any }>(`/admin/agents/${userId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function uploadAdminPublicFile(payload: {
  bucket: 'avatars' | 'agency-branding' | 'ad-media';
  folder: string;
  fileUri: string;
  fileName?: string;
  contentType?: string;
  path?: string;
  upsert?: boolean;
}) {
  const token = await getAccessToken();
  const url = `${resolveApiBaseUrl()}/admin/uploads/public`;
  const formData = new FormData();
  const fileResponse = await fetch(payload.fileUri);
  const fileBlob = await fileResponse.blob();

  formData.append('bucket', payload.bucket);
  formData.append('folder', payload.folder);
  if (payload.path) {
    formData.append('path', payload.path);
  }
  if (payload.upsert) {
    formData.append('upsert', 'true');
  }

  formData.append('file', fileBlob, payload.fileName || `${Date.now()}.bin`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let detail = 'Dosya yuklenemedi';
    try {
      const errorPayload = await response.json();
      detail = errorPayload?.detail || detail;
    } catch {
      // ignore non-json error bodies
    }
    throw new Error(`[${response.status}] ${detail}`);
  }

  return (await response.json()) as { path: string; public_url: string };
}

export const appApi = {
  get: (path: string, query?: Record<string, any>) =>
    apiRequest(path, { query }),

  post: (path: string, body?: any) =>
    apiRequest(path, { method: 'POST', body }),

  patch: (path: string, body?: any) =>
    apiRequest(path, { method: 'PATCH', body }),

  delete: (path: string) =>
    apiRequest(path, { method: 'DELETE' }),

  listProfessions: () =>
    apiRequest<{ professions: Array<{ id: number; name: string }> }>(
      '/professions',
      { method: 'GET' }
    ),

  createOfficeContact: (payload: {
    full_name: string;
    phone: string;
    profession: string;
    email?: string;
  }) =>
    apiRequest('/office-contacts/create', {
      method: 'POST',
      body: payload,
    }),

  listOfficeContacts: (filters?: { search?: string; profession?: string }) =>
    apiRequest<{ contacts: any[] }>('/office-contacts', {
      query: filters,
    }),

  getOfficeContact: (id: string) =>
    apiRequest(`/office-contacts/${id}`, {
      method: 'GET',
    }),

  updateOfficeContact: (
    id: string,
    payload: {
      full_name?: string;
      phone?: string;
      profession?: string;
      email?: string;
    }
  ) =>
    apiRequest(`/office-contacts/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  deleteOfficeContact: (id: string) =>
    apiRequest(`/office-contacts/${id}`, {
      method: 'DELETE',
    }),
};
