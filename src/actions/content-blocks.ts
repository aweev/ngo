'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { BLOCK_TYPES } from '@/lib/content/blocks';
import type { ContentBlock } from '@/types/domain/content';

const TABLE = 'content_blocks';

/** Blocks for one page, ordered. Requires content.read. */
export async function getContentBlocks(
  pageId: string,
): Promise<{ data: ContentBlock[] | null; error: string | null }> {
  const auth = await authorizePermission(PERMISSIONS.content.read);
  if (!auth.ok) return { data: null, error: auth.error };

  const { data, error } = await auth.context.supabase
    .from(TABLE)
    .select('*')
    .eq('page_id', pageId)
    .eq('organization_id', auth.organizationId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[getContentBlocks]', error.message);
    return { data: [], error: null };
  }
  return { data: (data ?? []) as ContentBlock[], error: null };
}

/** Add a block to a page. Requires content.manage. */
export async function createContentBlock(input: {
  page_id: string;
  name: string;
  type: string;
  content?: Record<string, unknown>;
}): Promise<{ data: ContentBlock | null; error: string | null }> {
  const auth = await authorizePermission(PERMISSIONS.content.manage);
  if (!auth.ok) return { data: null, error: auth.error };

  if (!input.name.trim()) return { data: null, error: 'Block name is required.' };
  if (!(BLOCK_TYPES as readonly string[]).includes(input.type)) {
    return { data: null, error: 'Unknown block type.' };
  }

  // Owning page must belong to the active org.
  const { data: page } = await auth.context.supabase
    .from('content_pages')
    .select('id')
    .eq('id', input.page_id)
    .eq('organization_id', auth.organizationId)
    .maybeSingle();
  if (!page) return { data: null, error: 'Content page not found.' };

  const { data: siblings } = await auth.context.supabase
    .from(TABLE)
    .select('sort_order')
    .eq('page_id', input.page_id)
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextOrder = ((siblings?.[0] as { sort_order: number } | undefined)?.sort_order ?? -1) + 1;

  const { data, error } = await auth.context.supabase
    .from(TABLE)
    .insert({
      organization_id: auth.organizationId,
      page_id: input.page_id,
      name: input.name.trim(),
      type: input.type,
      content: input.content ?? {},
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('[createContentBlock]', error.message);
    return { data: null, error: 'Unable to create block. Please try again.' };
  }
  revalidatePath(`/admin/content/${input.page_id}`);
  return { data: data as ContentBlock, error: null };
}

/** Edit a block's name/type/content. Requires content.manage. */
export async function updateContentBlock(
  id: string,
  input: { name?: string; type?: string; content?: Record<string, unknown> },
): Promise<{ data: ContentBlock | null; error: string | null }> {
  const auth = await authorizePermission(PERMISSIONS.content.manage);
  if (!auth.ok) return { data: null, error: auth.error };

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) return { data: null, error: 'Block name is required.' };
    patch.name = input.name.trim();
  }
  if (input.type !== undefined) {
    if (!(BLOCK_TYPES as readonly string[]).includes(input.type)) {
      return { data: null, error: 'Unknown block type.' };
    }
    patch.type = input.type;
  }
  if (input.content !== undefined) {
    if (typeof input.content !== 'object' || input.content === null || Array.isArray(input.content)) {
      return { data: null, error: 'Block content must be an object.' };
    }
    patch.content = input.content;
  }

  const { data, error } = await auth.context.supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .eq('organization_id', auth.organizationId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[updateContentBlock]', error.message);
    return { data: null, error: 'Unable to update block. Please try again.' };
  }
  if (!data) return { data: null, error: 'Block not found.' };
  revalidatePath('/admin/content');
  return { data: data as ContentBlock, error: null };
}

/** Delete a block. Requires content.manage. */
export async function deleteContentBlock(id: string): Promise<{ error: string | null }> {
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
    console.error('[deleteContentBlock]', error.message);
    return { error: 'Unable to delete block. Please try again.' };
  }
  if (!data) return { error: 'Block not found.' };
  revalidatePath('/admin/content');
  return { error: null };
}

/** Persist drag/manual reorder. Requires content.manage. */
export async function reorderContentBlocks(
  pageId: string,
  orderedIds: string[],
): Promise<{ error: string | null }> {
  const auth = await authorizePermission(PERMISSIONS.content.manage);
  if (!auth.ok) return { error: auth.error };

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await auth.context.supabase
      .from(TABLE)
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('page_id', pageId)
      .eq('organization_id', auth.organizationId);
    if (error) {
      console.error('[reorderContentBlocks]', error.message);
      return { error: 'Unable to save block order. Please try again.' };
    }
  }
  revalidatePath(`/admin/content/${pageId}`);
  return { error: null };
}

