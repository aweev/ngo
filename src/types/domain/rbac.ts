export interface CustomRole {
    id: string;
    organization_id: string;
    name: string;
    slug: string;
    description: string | null;
    is_system: boolean;
    permissions: Record<string, boolean>;
    created_at: string;
    updated_at: string;
}

export interface RoleAssignment {
    id: string;
    organization_id: string;
    user_id: string;
    role_id: string;
    granted_by: string | null;
    expires_at: string | null;
    created_at: string;
}

export interface PermissionOverride {
    id: string;
    organization_id: string;
    user_id: string;
    permission_key: string;
    is_granted: boolean;
    granted_by: string | null;
    reason: string | null;
    created_at: string;
    updated_at: string;
}

export type CustomRoleInsert = Omit<CustomRole, 'id' | 'created_at' | 'updated_at'>;
export type CustomRoleUpdate = Partial<CustomRoleInsert>;
