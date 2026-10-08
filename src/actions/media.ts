'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { detectTrustDocumentType, stripImageMetadata } from '@/lib/trust-documents';
import type { MediaLibraryItem } from '@/types/domain/content';

const TABLE = 'media_library';

const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];
const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'ogg', 'ogv', 'm4v', 'avi', 'mkv'];
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
  // Phase 0: MIME-prefix checks pass SVG through — SVG is active content and
  // is rejected everywhere else in this codebase (see detectTrustDocumentType).
  if (input.mime_type?.toLowerCase().split(';')[0].trim() === 'image/svg+xml') {
    return { data: null, error: 'SVG files are not allowed. Upload a PNG or JPEG instead.' };
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

/**
 * Upload a binary file to the content-media bucket and catalog it.
 * Accepts FormData with `file` (File) and optional `name` / `alt_text`.
 * Requires content.manage. Public URL is derived from the public bucket.
 */
export async function uploadMediaItem(
    formData: FormData,
): Promise<{ data: MediaLibraryItem | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
        return { data: null, error: 'Choose a file to upload.' };
    }
    if (!ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) {
        return { data: null, error: 'Only image and video files are allowed.' };
    }
    if (file.size > MAX_FILE_SIZE) {
        return { data: null, error: 'File must be 25 MB or smaller.' };
    }
    const altText = formData.get('alt_text');
    const rawName = formData.get('name');
    const name = (typeof rawName === 'string' && rawName.trim()) || file.name.replace(/\.[^.]+$/, '') || 'upload';

    // Phase 0: verify images by magic bytes (not the client claim) and strip
    // EXIF/GPS metadata — same pipeline as trust documents. Videos keep the
    // MIME + extension allowlist check (no EXIF rewriting for video).
    const original = new Uint8Array(await file.arrayBuffer());
    let payload: Uint8Array = original;
    let storedMime = file.type;
    if (file.type.startsWith('image/')) {
        const detected = detectTrustDocumentType(original, file.type);
        if (!detected.ok) return { data: null, error: detected.reason };
        const stripped = stripImageMetadata(original, detected.mime);
        if (!stripped) return { data: null, error: 'The image is corrupt and could not be processed.' };
        payload = stripped.bytes;
        storedMime = detected.mime;
    } else {
        const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
        if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
            return { data: null, error: 'Unsupported video format. Allowed: MP4, MOV, WebM, OGV, M4V, AVI, MKV.' };
        }
    }

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
    const path = `${auth.organizationId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await auth.context.supabase.storage
        .from('content-media')
        .upload(path, payload, { contentType: storedMime, upsert: false });
    if (uploadError) {
        console.error('[uploadMediaItem]', uploadError.message);
        return { data: null, error: 'Upload failed. Please try again.' };
    }

    const { data: urlData } = auth.context.supabase.storage.from('content-media').getPublicUrl(path);
    return attachMediaItem({
        name: name.trim().slice(0, 200),
        file_url: urlData.publicUrl,
        alt_text: typeof altText === 'string' && altText.trim() ? altText.trim() : null,
        mime_type: storedMime,
        file_size: payload.length,
    });
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
 * Delete a library record — and its storage object when the file lives in
 * our content-media bucket (hosted URLs are untouched). Requires
 * content.manage + typed confirmation in the UI.
 */
export async function deleteMediaItem(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { error: auth.error };

    const { data: row } = await auth.context.supabase
        .from(TABLE)
        .select('id, file_url')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!row) return { error: 'Media item not found.' };

    const objectPath = storagePathFromPublicUrl((row.file_url as string) ?? '');
    if (objectPath) {
        const { error: storageError } = await auth.context.supabase.storage
            .from('content-media')
            .remove([objectPath]);
        if (storageError) {
            // Never trap the user on orphan cleanup — the record delete
            // below still succeeds; the object is invisible without it.
            console.error('[deleteMediaItem] storage cleanup failed:', storageError.message);
        }
    }

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

/**
 * Extracts the in-bucket path from one of our public content-media URLs.
 * Returns null for hosted/foreign URLs (never touch those).
 */
function storagePathFromPublicUrl(fileUrl: string): string | null {
    try {
        const parsed = new URL(fileUrl);
        const marker = '/storage/v1/object/public/content-media/';
        const idx = parsed.pathname.indexOf(marker);
        if (idx === -1) return null;
        const path = parsed.pathname.slice(idx + marker.length);
        if (!path || path.includes('..')) return null;
        return path;
    } catch {
        return null;
    }
}
