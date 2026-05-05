import type { AdCampaign, CampaignType } from '@shared/campaign';

import { supabase } from './supabase';

type Primitive = string | number | boolean | null | undefined;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: BodyInit | FormData | Record<string, unknown> | null;
  query?: Record<string, Primitive>;
  auth?: boolean;
  headers?: Record<string, string>;
};

type AdminCampaignInput = Partial<AdCampaign> & {
  type: CampaignType;
};

function resolveApiBaseUrl() {
  const explicitUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  if (explicitUrl) {
    const trimmed = explicitUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${origin}/api`;
    }
  }

  return 'http://localhost:8000/api';
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Oturum bulunamadi');
  }

  return session.access_token;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${resolveApiBaseUrl()}${path}`);

  Object.entries(options.query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  const headers = new Headers(options.headers || {});
  if (options.auth !== false) {
    headers.set('Authorization', `Bearer ${await getAccessToken()}`);
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const isBlob = typeof Blob !== 'undefined' && options.body instanceof Blob;
  const isJsonBody =
    options.body !== undefined &&
    options.body !== null &&
    !isFormData &&
    !isBlob &&
    typeof options.body === 'object';

  if (isJsonBody) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: isJsonBody ? JSON.stringify(options.body) : (options.body as BodyInit | null | undefined),
  });

  if (!response.ok) {
    let detail = 'API istegi basarisiz oldu';
    try {
      const payload = await response.json();
      detail = payload?.detail || detail;
    } catch {
      // ignore non-json error bodies
    }
    throw new Error(`[${response.status}] ${url.pathname} - ${detail}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getAdminSession() {
  return apiRequest<{ user: { id: string; email: string; full_name: string; role: string } }>('/admin/session');
}

export function listAdminCampaigns() {
  return apiRequest<{ campaigns: AdCampaign[] }>('/admin/campaigns');
}

export function getAdminCampaign(campaignId: string) {
  return apiRequest<{ campaign: AdCampaign }>(`/admin/campaigns/${campaignId}`);
}

export function createAdminCampaign(payload: AdminCampaignInput) {
  return apiRequest<{ success: boolean; campaign: AdCampaign }>('/admin/campaigns', {
    method: 'POST',
    body: payload,
  });
}

export function updateAdminCampaign(campaignId: string, payload: Partial<AdCampaign>) {
  return apiRequest<{ success: boolean; campaign: AdCampaign }>(`/admin/campaigns/${campaignId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteAdminCampaign(campaignId: string) {
  return apiRequest<{ success: boolean }>(`/admin/campaigns/${campaignId}`, {
    method: 'DELETE',
  });
}

export function toggleAdminCampaign(campaignId: string, active: boolean) {
  return apiRequest<{ success: boolean; campaign: AdCampaign }>(`/admin/campaigns/${campaignId}/toggle`, {
    method: 'POST',
    body: { active },
  });
}

export function duplicateAdminCampaign(campaignId: string) {
  return apiRequest<{ success: boolean; campaign: AdCampaign }>(`/admin/campaigns/${campaignId}/duplicate`, {
    method: 'POST',
  });
}

export function listAdminAgencyOptions() {
  return apiRequest<{
    agencies: {
      id: string;
      name: string;
      location: string;
      brand_color_primary: string | null;
      entity_type: 'office' | 'company';
      status: string;
    }[];
  }>('/admin/agency-options');
}

export function uploadAdminPublicFile(options: {
  bucket: 'ad-media' | 'avatars' | 'agency-branding';
  file: File;
  folder?: string;
  path?: string;
  upsert?: boolean;
}) {
  const formData = new FormData();
  formData.append('bucket', options.bucket);
  formData.append('folder', options.folder || 'misc');
  if (options.path) {
    formData.append('path', options.path);
  }
  if (options.upsert) {
    formData.append('upsert', 'true');
  }
  formData.append('file', options.file);

  return apiRequest<{ path: string; public_url: string }>('/admin/uploads/public', {
    method: 'POST',
    body: formData,
  });
}

export const adminApiRequest = apiRequest;
export const validateAdminSession = getAdminSession;
