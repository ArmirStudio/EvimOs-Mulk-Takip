import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

type UploadOptions = {
  bucket: string;
  path: string;
  fileUri: string;
  contentType?: string;
  upsert?: boolean;
  client?: SupabaseClient;
};

export async function uploadFileToSupabaseStorage(options: UploadOptions) {
  const {
    bucket,
    path,
    fileUri,
    contentType,
    upsert = false,
    client = supabase,
  } = options;

  const fileResponse = await fetch(fileUri);
  const arrayBuffer = await fileResponse.arrayBuffer();

  const { error } = await client.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: contentType || 'application/octet-stream',
    upsert,
  });

  if (error) throw error;

  const { data: publicData } = client.storage.from(bucket).getPublicUrl(path);

  return {
    path,
    publicUrl: publicData.publicUrl,
  };
}

export function extractSupabaseStoragePath(bucket: string, value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const publicSegment = `/storage/v1/object/public/${bucket}/`;
  const signSegment = `/storage/v1/object/sign/${bucket}/`;
  const objectSegment = `/storage/v1/object/${bucket}/`;
  const bucketPrefix = `${bucket}/`;

  if (/^https?:\/\//i.test(trimmed)) {
    if (trimmed.includes(publicSegment)) {
      return trimmed.split(publicSegment)[1]?.split('?')[0] || null;
    }
    if (trimmed.includes(signSegment)) {
      return trimmed.split(signSegment)[1]?.split('?')[0] || null;
    }
    if (trimmed.includes(objectSegment)) {
      return trimmed.split(objectSegment)[1]?.split('?')[0] || null;
    }
    return null;
  }

  if (trimmed.startsWith(bucketPrefix)) {
    return trimmed.slice(bucketPrefix.length);
  }

  if (/^(file|content):\/\//i.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export async function createSignedStorageUrl(
  bucket: string,
  value?: string | null,
  expiresIn = 60 * 10
) {
  const path = extractSupabaseStoragePath(bucket, value);
  if (!path) {
    return /^https?:\/\//i.test(value || '') ? value || null : null;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw error || new Error('Dosya linki uretilemedi');
  }

  return data.signedUrl;
}

export function resolveSupabaseStorageUrl(bucket: string, value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^(file|content):\/\//i.test(trimmed)) {
    return null;
  }

  const normalizedPath = extractSupabaseStoragePath(bucket, trimmed);

  if (!normalizedPath) {
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(normalizedPath);
  return data.publicUrl;
}
