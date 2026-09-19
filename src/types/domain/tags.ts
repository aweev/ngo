export interface Tag {
    id: string;
    organization_id: string;
    name: string;
    slug: string;
    color: string;
    description: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface TagAssignment {
    id: string;
    organization_id: string;
    tag_id: string;
    entity_type: string;
    entity_id: string;
    created_by: string | null;
    created_at: string;
}

export type TagInsert = Omit<Tag, 'id' | 'created_at' | 'updated_at'>;
export type TagUpdate = Partial<TagInsert>;
