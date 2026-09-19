export type ContentStatus = 'draft' | 'published' | 'archived';
export type ContentBlockType = 'hero' | 'text' | 'image' | 'gallery' | 'cta' | 'embed' | 'custom';

/** Editorial workflow (migration 20240101000022). Mirrors lib/content/translations. */
export type ContentWorkflowState =
    | 'draft'
    | 'translation_pending'
    | 'in_review'
    | 'changes_requested'
    | 'approved'
    | 'published'
    | 'archived';

export type TranslationRowStatus =
    | 'draft'
    | 'machine_translated'
    | 'in_review'
    | 'approved'
    | 'published';

export type TranslationSource = 'human' | 'ai' | 'import';

export interface ContentPage {
    id: string;
    organization_id: string;
    title: string;
    slug: string;
    status: ContentStatus;
    content: Record<string, unknown>;
    meta_title: string | null;
    meta_description: string | null;
    cover_image_url: string | null;
    published_at: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    /** Editorial workflow state (migration 22). Defaults to 'draft'. */
    workflow_state?: ContentWorkflowState;
    /** Legacy JSON translation store (migration 09). Prefer content_page_translations rows. */
    translations?: Record<string, unknown>;
    translation_status?: Record<string, unknown>;
    approval_status?: 'draft' | 'pending_approval' | 'approved' | 'rejected';
    approved_by?: string | null;
    translation_assignee?: string | null;
    last_translated_at?: string | null;
    /** Stable unguessable preview UUID (migration 24) — gates /public/preview drafts. */
    preview_token?: string | null;
}

export interface ContentPageTranslation {
    id: string;
    organization_id: string;
    page_id: string;
    locale: 'en' | 'de' | 'fr' | 'es' | 'ar';
    status: TranslationRowStatus;
    title: string;
    content: Record<string, unknown>;
    meta_title: string | null;
    meta_description: string | null;
    cover_image_url: string | null;
    cover_alt_text: string | null;
    cta_label: string | null;
    cta_url: string | null;
    category_label: string | null;
    version: number;
    assigned_to: string | null;
    source: TranslationSource;
    ai_provider: string | null;
    ai_model: string | null;
    last_translated_at: string | null;
    published_at: string | null;
    created_by: string | null;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ContentBlock {
    id: string;
    organization_id: string;
    page_id: string | null;
    name: string;
    type: ContentBlockType;
    content: Record<string, unknown>;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface MediaLibraryItem {
    id: string;
    organization_id: string;
    name: string;
    file_url: string;
    file_type: string | null;
    file_size: number | null;
    mime_type: string | null;
    width: number | null;
    height: number | null;
    alt_text: string | null;
    tags: string[];
    uploaded_by: string | null;
    created_at: string;
}

export type ContentPageInsert = Omit<ContentPage, 'id' | 'created_at' | 'updated_at'>;
export type ContentPageUpdate = Partial<ContentPageInsert>;
