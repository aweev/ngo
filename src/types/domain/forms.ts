export type FormFieldType = 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'radio' | 'date' | 'file' | 'email' | 'phone';

export interface FormField {
    id: string;
    type: FormFieldType;
    label: string;
    placeholder?: string;
    helpText?: string;
    required: boolean;
    options?: string[]; // for select/radio
    defaultValue?: unknown;
    sortOrder: number;
}

export interface FormDefinition {
    id: string;
    organization_id: string;
    title: string;
    slug: string;
    description: string | null;
    status: 'draft' | 'published' | 'archived';
    fields: FormField[];
    submit_button_text: string;
    success_message: string;
    is_public: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface FormSubmission {
    id: string;
    organization_id: string;
    form_id: string;
    data: Record<string, unknown>;
    submitter_email: string | null;
    submitted_at: string;
    ip_address: string | null;
    created_at: string;
}

export type FormDefinitionInsert = Omit<FormDefinition, 'id' | 'created_at' | 'updated_at'>;
export type FormDefinitionUpdate = Partial<FormDefinitionInsert>;
