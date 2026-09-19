'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { MediaLibraryItem } from '@/types/domain/content';

const TABLE = 'media_library';

const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB — mirrors storage bucket policy intent

function isValidMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Searchable media library. Requires content.read. */
export async function getMediaLibrary(
  search?: string,
  limit = 60,
): Promise<{ data: MediaLibraryItem[] | null; error: string | null }> {
  const auth = await authorizePermission(PERMISSIONS.content.read);
  if (!auth.ok) return { data: null, error: auth.error };

  let query = auth.context.supabase
    .from(TABLE)
    .select('*')
    .eq('organization_id', auth.organizationId)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));

  if (search?.trim()) {
    query = query.ilike('name', `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[getMediaLibrary]', error.message);
    return { data: [], error: null };
  }
  return { data: (data ?? []) as MediaLibraryItem[], error: null };
}

/**
 * Attach an already-hosted file to the library (CDN URL + metadata).
 * Direct binary upload lives in the storage bucket flow; this records
 * the library entry with required alt text. Requires content.manage.
 */
export async function attachMediaItem(input: {
  name: string;
  file_url: string;
  alt_text?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  width?: number | null;
  height?: number | null;
}): Promise<{ data: MediaLibraryItem | null; error: string | null }> {
  const auth = await authorizePermission(PERMISSIONS.content.manage);
  if (!auth.ok) return { data: null, error: auth.error };

  if (!input.name.trim()) return { data: null, error: 'File name is required.' };
  if (!isValidMediaUrl(input.file_url)) {
    return { data: null, error: 'File URL must be a valid http(s) URL.' };
  }
  if (input.mime_type && !ALLOWED_MIME_PREFIXES.some((p) => input.mime_type!.startsWith(p))) {
    return { data: null, error: 'Only image and video files are allowed.' };
  }
  if (input.file_size !== undefined && input.file_size !== null) {
    if (!Number.isFinite(input.file_size) || input.file_size <= 0 || input.file_size > MAX_FILE_SIZE) {
      return { data: null, error: 'File size must be between 1 byte and 25 MB.' };
    }
  }

  const { data, error } = await auth.context.supabase
    .from(TABLE)
    .insert({
      organization_id: auth.organizationId,
      name: input.name.trim(),
      file_url: input.file_url,
      alt_text: input.alt_text?.trim() || null,
      mime_type: input.mime_type ?? null,
      file_type: input.mime_type?.split('/')[0] ?? null,
      file_size: input.file_size ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      uploaded_by: auth.context.userId,
    })
    .select()
    .single();

  if (error) {
    console.error('[attachMediaItem]', error.message);
    return { data: null, error: 'Unable to attach media. Please try again.' };
  }
  revalidatePath('/admin/content');
  return { data: data as MediaLibraryItem, error: null };
}

/** Edit alt text (accessibility requirement). Requires content.manage. */
export async function updateMediaAltText(
  id: string,
  altText: string,
): Promise<{ error: string | null }> {
  const auth = await authorizePermission(PERMISSIONS.content.manage);
  if (!auth.ok) return { error: auth.error };

  const { data, error } = await auth.context.supabase
    .from(TABLE)
    .update({ alt_text: altText.trim() || null })
    .eq('id', id)
    .eq('organization_id', auth.organizationId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[updateMediaAltText]', error.message);
    return { error: 'Unable to update alt text. Please try again.' };
  }
  if (!data) return { error: 'Media item not found.' };
  revalidatePath('/admin/content');
  return { error: null };
}

/**
 * Delete a library RECORD. Requires content.manage + typed confirmation
 * in the UI. Note: this removes the catalog entry, not the underlying
 * storage object — bucket cleanup is a separate storage operation.
 */
export async function deleteMediaItem(id: string): Promise<{ error: string | null }> {
  const auth = await authorizePermission(PERMISSIONS.content.manage);
  if (!auth.ok) return { error: auth.error };

  const { data, error } = await auth.context.supabase
    .from(TABLE)
    .delete()
    .eq('id', id)
    .eq('organization_id', auth.organizationId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[deleteMediaItem]', error.message);
    return { error: 'Unable to delete media item. Please try again.' };
  }
  if (!data) return { error: 'Media item not found.' };
  revalidatePath('/admin/content');
  return { error: null };
}
