export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          organization_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          organization_id: string
          results: Json
          rule_id: string | null
          started_at: string
          status: string
          trigger_data: Json
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          organization_id: string
          results?: Json
          rule_id?: string | null
          started_at?: string
          status: string
          trigger_data?: Json
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          organization_id?: string
          results?: Json
          rule_id?: string | null
          started_at?: string
          status?: string
          trigger_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_enabled: boolean
          last_run_at: string | null
          last_run_status: string | null
          name: string
          organization_id: string
          run_count: number
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          name: string
          organization_id: string
          run_count?: number
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          name?: string
          organization_id?: string
          run_count?: number
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          organization_id: string | null
          template_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          organization_id?: string | null
          template_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string | null
          template_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          allocated_amount: number
          budget_id: string
          category: string
          created_at: string
          currency: string
          description: string | null
          id: string
          organization_id: string
          sort_order: number
          spent_amount: number
          updated_at: string
        }
        Insert: {
          allocated_amount: number
          budget_id: string
          category: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          organization_id: string
          sort_order?: number
          spent_amount?: number
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          budget_id?: string
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          organization_id?: string
          sort_order?: number
          spent_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          currency: string
          fiscal_year: number | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          period_type: string
          project_id: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          fiscal_year?: number | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          period_type?: string
          project_id?: string | null
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          fiscal_year?: number | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          period_type?: string
          project_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          cover_image_url: string | null
          created_at: string
          currency: string
          description: string | null
          end_date: string | null
          goal_amount: number
          id: string
          name: string
          organization_id: string
          project_id: string | null
          raised_amount: number
          slug: string
          start_date: string | null
          status: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          end_date?: string | null
          goal_amount: number
          id?: string
          name: string
          organization_id: string
          project_id?: string | null
          raised_amount?: number
          slug: string
          start_date?: string | null
          status?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          end_date?: string | null
          goal_amount?: number
          id?: string
          name?: string
          organization_id?: string
          project_id?: string | null
          raised_amount?: number
          slug?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_blocks: {
        Row: {
          content: Json
          created_at: string
          id: string
          name: string
          organization_id: string
          page_id: string | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          name: string
          organization_id: string
          page_id?: string | null
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          page_id?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_blocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_blocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "content_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "public_content_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      content_page_revisions: {
        Row: {
          content: Json
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          organization_id: string
          page_id: string
          slug: string
          status: string
          title: string
          workflow_state: string
        }
        Insert: {
          content?: Json
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          organization_id: string
          page_id: string
          slug: string
          status: string
          title: string
          workflow_state?: string
        }
        Update: {
          content?: Json
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          organization_id?: string
          page_id?: string
          slug?: string
          status?: string
          title?: string
          workflow_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_page_revisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_page_revisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_page_revisions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "content_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_page_revisions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "public_content_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      content_page_translations: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          assigned_to: string | null
          category_label: string | null
          content: Json
          cover_alt_text: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          id: string
          last_translated_at: string | null
          locale: string
          meta_description: string | null
          meta_title: string | null
          organization_id: string
          page_id: string
          published_at: string | null
          source: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          assigned_to?: string | null
          category_label?: string | null
          content?: Json
          cover_alt_text?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          last_translated_at?: string | null
          locale: string
          meta_description?: string | null
          meta_title?: string | null
          organization_id: string
          page_id: string
          published_at?: string | null
          source?: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          assigned_to?: string | null
          category_label?: string | null
          content?: Json
          cover_alt_text?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          last_translated_at?: string | null
          locale?: string
          meta_description?: string | null
          meta_title?: string | null
          organization_id?: string
          page_id?: string
          published_at?: string | null
          source?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_page_translations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_page_translations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_page_translations_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "content_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_page_translations_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "public_content_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      content_pages: {
        Row: {
          approval_status: string
          approved_by: string | null
          content: Json
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          id: string
          last_translated_at: string | null
          meta_description: string | null
          meta_title: string | null
          organization_id: string
          preview_token: string
          published_at: string | null
          slug: string
          status: string
          title: string
          translation_assignee: string | null
          translation_status: Json
          translations: Json
          updated_at: string
          workflow_state: string
        }
        Insert: {
          approval_status?: string
          approved_by?: string | null
          content?: Json
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_translated_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          organization_id: string
          preview_token?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          translation_assignee?: string | null
          translation_status?: Json
          translations?: Json
          updated_at?: string
          workflow_state?: string
        }
        Update: {
          approval_status?: string
          approved_by?: string | null
          content?: Json
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_translated_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          organization_id?: string
          preview_token?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          translation_assignee?: string | null
          translation_status?: Json
          translations?: Json
          updated_at?: string
          workflow_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          attachments: Json
          content: string
          content_type: string
          conversation_id: string
          created_at: string
          id: string
          is_deleted: boolean
          organization_id: string
          read_by: string[]
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          content: string
          content_type?: string
          conversation_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          organization_id: string
          read_by?: string[]
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          content?: string
          content_type?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          organization_id?: string
          read_by?: string[]
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          campaign_id: string | null
          created_at: string
          created_by: string | null
          department: string | null
          id: string
          is_archived: boolean
          last_message_at: string | null
          last_message_preview: string | null
          organization_id: string
          participant_ids: string[]
          project_id: string | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          last_message_preview?: string | null
          organization_id: string
          participant_ids?: string[]
          project_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          last_message_preview?: string | null
          organization_id?: string
          participant_ids?: string[]
          project_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          organization_id: string
          permissions: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          organization_id: string
          permissions?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string
          permissions?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          campaign_id: string | null
          cancelled_at: string | null
          created_at: string
          currency: string
          dedication: string | null
          dispute_status: string | null
          donated_at: string
          donor_id: string | null
          donor_name: string | null
          email: string | null
          id: string
          is_anonymous: boolean
          needs_receipt: boolean
          notes: string | null
          organization_id: string
          payment_intent: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_ref: string | null
          payment_reference: string | null
          project_id: string | null
          receipt_url: string | null
          status: string
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          subscription_ref: string | null
          tax_receipt_url: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          dedication?: string | null
          dispute_status?: string | null
          donated_at?: string
          donor_id?: string | null
          donor_name?: string | null
          email?: string | null
          id?: string
          is_anonymous?: boolean
          needs_receipt?: boolean
          notes?: string | null
          organization_id: string
          payment_intent?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_ref?: string | null
          payment_reference?: string | null
          project_id?: string | null
          receipt_url?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          subscription_ref?: string | null
          tax_receipt_url?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          dedication?: string | null
          dispute_status?: string | null
          donated_at?: string
          donor_id?: string | null
          donor_name?: string | null
          email?: string | null
          id?: string
          is_anonymous?: boolean
          needs_receipt?: boolean
          notes?: string | null
          organization_id?: string
          payment_intent?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_ref?: string | null
          payment_reference?: string | null
          project_id?: string | null
          receipt_url?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          subscription_ref?: string | null
          tax_receipt_url?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_donations_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_donations_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_donations_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_donations_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_donations_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_donations_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      donors: {
        Row: {
          address: string | null
          city: string | null
          communication_preferences: Json
          country: string | null
          created_at: string
          currency: string
          email: string | null
          first_donation_date: string | null
          id: string
          last_donation_date: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          preferred_payment_method: string | null
          status: string
          total_donated: number
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          communication_preferences?: Json
          country?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          first_donation_date?: string | null
          id?: string
          last_donation_date?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          preferred_payment_method?: string | null
          status?: string
          total_donated?: number
          type?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          communication_preferences?: Json
          country?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          first_donation_date?: string | null
          id?: string
          last_donation_date?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          preferred_payment_method?: string | null
          status?: string
          total_donated?: number
          type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_translations: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          fields: Json
          id: string
          last_translated_at: string | null
          locale: string
          organization_id: string
          published_at: string | null
          source: string
          status: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          fields?: Json
          id?: string
          last_translated_at?: string | null
          locale: string
          organization_id: string
          published_at?: string | null
          source?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          fields?: Json
          id?: string
          last_translated_at?: string | null
          locale?: string
          organization_id?: string
          published_at?: string | null
          source?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "entity_translations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_translations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          created_at: string
          email: string
          event_id: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          registered_at: string
          registrant_id: string | null
          registrant_type: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          registered_at?: string
          registrant_id?: string | null
          registrant_type?: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          registered_at?: string
          registrant_id?: string | null
          registrant_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "org_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "public_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          budget_id: string | null
          budget_line_id: string | null
          category: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          organization_id: string
          paid_at: string | null
          project_id: string | null
          receipt_url: string | null
          status: string
          submitted_by: string | null
          title: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          budget_id?: string | null
          budget_line_id?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          organization_id: string
          paid_at?: string | null
          project_id?: string | null
          receipt_url?: string | null
          status?: string
          submitted_by?: string | null
          title: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          budget_id?: string | null
          budget_line_id?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          organization_id?: string
          paid_at?: string | null
          project_id?: string | null
          receipt_url?: string | null
          status?: string
          submitted_by?: string | null
          title?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          config: Json
          created_at: string
          feature_key: string
          id: string
          is_enabled: boolean
          organization_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          feature_key: string
          id?: string
          is_enabled?: boolean
          organization_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          feature_key?: string
          id?: string
          is_enabled?: boolean
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      form_definitions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          fields: Json
          id: string
          is_public: boolean
          organization_id: string
          slug: string
          status: string
          submit_button_text: string
          success_message: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_public?: boolean
          organization_id: string
          slug: string
          status?: string
          submit_button_text?: string
          success_message?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_public?: boolean
          organization_id?: string
          slug?: string
          status?: string
          submit_button_text?: string
          success_message?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          form_id: string | null
          form_slug: string
          id: string
          locale: string | null
          organization_id: string | null
          status: string
          submission_data: Json
          submitted_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          form_id?: string | null
          form_slug: string
          id?: string
          locale?: string | null
          organization_id?: string | null
          status?: string
          submission_data?: Json
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          form_id?: string | null
          form_slug?: string
          id?: string
          locale?: string | null
          organization_id?: string | null
          status?: string
          submission_data?: Json
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_approvals: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_lifecycle_records: {
        Row: {
          access_revoked: boolean
          approved_by: string | null
          checklist: Json
          contract_doc_url: string | null
          created_at: string
          created_by: string | null
          effective_date: string
          exit_interview_notes: string | null
          id: string
          organization_id: string
          person_id: string
          person_type: string
          reason: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          access_revoked?: boolean
          approved_by?: string | null
          checklist?: Json
          contract_doc_url?: string | null
          created_at?: string
          created_by?: string | null
          effective_date: string
          exit_interview_notes?: string | null
          id?: string
          organization_id: string
          person_id: string
          person_type: string
          reason?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          access_revoked?: boolean
          approved_by?: string | null
          checklist?: Json
          contract_doc_url?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string
          exit_interview_notes?: string | null
          id?: string
          organization_id?: string
          person_id?: string
          person_type?: string
          reason?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_lifecycle_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_lifecycle_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_goals: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metrics: Json
          name: string
          organization_id: string
          project_id: string | null
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metrics?: Json
          name: string
          organization_id: string
          project_id?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metrics?: Json
          name?: string
          organization_id?: string
          project_id?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impact_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_measurements: {
        Row: {
          created_at: string
          data_source: string | null
          id: string
          measured_at: string
          metric_id: string
          notes: string | null
          organization_id: string
          value: number
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          data_source?: string | null
          id?: string
          measured_at?: string
          metric_id: string
          notes?: string | null
          organization_id: string
          value: number
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          data_source?: string | null
          id?: string
          measured_at?: string
          metric_id?: string
          notes?: string | null
          organization_id?: string
          value?: number
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impact_measurements_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "impact_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_measurements_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "public_impact_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_measurements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_measurements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_metrics: {
        Row: {
          baseline_value: number
          category: string | null
          created_at: string
          created_by: string | null
          current_value: number
          description: string | null
          id: string
          is_public: boolean
          name: string
          organization_id: string
          slug: string
          target_value: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          baseline_value?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          organization_id: string
          slug: string
          target_value?: number | null
          unit: string
          updated_at?: string
        }
        Update: {
          baseline_value?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          current_value?: number
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          organization_id?: string
          slug?: string
          target_value?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impact_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_stories: {
        Row: {
          author_avatar_url: string | null
          author_name: string | null
          consent_obtained: boolean
          content: string
          created_at: string
          created_by: string | null
          duration_label: string | null
          id: string
          image_alt: string | null
          image_url: string | null
          impact_stats: Json
          is_featured: boolean
          media_url: string | null
          organization_id: string
          program: string | null
          published_at: string | null
          slug: string
          status: string
          story_type: string
          subject_role: string
          summary: string | null
          timeline: Json
          title: string
          transcript_url: string | null
          updated_at: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name?: string | null
          consent_obtained?: boolean
          content?: string
          created_at?: string
          created_by?: string | null
          duration_label?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          impact_stats?: Json
          is_featured?: boolean
          media_url?: string | null
          organization_id: string
          program?: string | null
          published_at?: string | null
          slug: string
          status?: string
          story_type?: string
          subject_role?: string
          summary?: string | null
          timeline?: Json
          title: string
          transcript_url?: string | null
          updated_at?: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string | null
          consent_obtained?: boolean
          content?: string
          created_at?: string
          created_by?: string | null
          duration_label?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          impact_stats?: Json
          is_featured?: boolean
          media_url?: string | null
          organization_id?: string
          program?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          story_type?: string
          subject_role?: string
          summary?: string | null
          timeline?: Json
          title?: string
          transcript_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impact_stories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_stories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          credentials_ref: string | null
          id: string
          last_synced_at: string | null
          metadata: Json
          name: string
          organization_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          credentials_ref?: string | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json
          name: string
          organization_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          credentials_ref?: string | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json
          name?: string
          organization_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          first_name: string | null
          id: string
          invited_by: string | null
          last_name: string | null
          organization_id: string
          role: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invited_by?: string | null
          last_name?: string | null
          organization_id: string
          role?: string
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invited_by?: string | null
          last_name?: string | null
          organization_id?: string
          role?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      job_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          job_id: string
          organization_id: string
          output: Json
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_id: string
          organization_id: string
          output?: Json
          started_at?: string
          status: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          job_id?: string
          organization_id?: string
          output?: Json
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_executions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scheduled_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          alt_text: string | null
          created_at: string
          file_size: number | null
          file_type: string | null
          file_url: string
          height: number | null
          id: string
          mime_type: string | null
          name: string
          organization_id: string
          tags: string[]
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          height?: number | null
          id?: string
          mime_type?: string | null
          name: string
          organization_id: string
          tags?: string[]
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          organization_id?: string
          tags?: string[]
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_library_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_library_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          author_avatar_url: string | null
          author_name: string | null
          author_role: string | null
          category: string | null
          content: string
          cover_alt_text: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          id: string
          is_featured: boolean
          key_takeaways: string[]
          organization_id: string
          published_at: string | null
          read_minutes: number | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name?: string | null
          author_role?: string | null
          category?: string | null
          content?: string
          cover_alt_text?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          key_takeaways?: string[]
          organization_id: string
          published_at?: string | null
          read_minutes?: number | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string | null
          author_role?: string | null
          category?: string | null
          content?: string
          cover_alt_text?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          key_takeaways?: string[]
          organization_id?: string
          published_at?: string | null
          read_minutes?: number | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_articles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          locale: string | null
          organization_id: string | null
          source: string
          status: string
          subscribed_at: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          locale?: string | null
          organization_id?: string | null
          source?: string
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          locale?: string | null
          organization_id?: string | null
          source?: string
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscribers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_subscribers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          digest_frequency: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          organization_id: string
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_frequency?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          organization_id: string
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digest_frequency?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          organization_id?: string
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          organization_id: string | null
          slug: string
          subject: string | null
          updated_at: string
          variables: Json
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          organization_id?: string | null
          slug: string
          subject?: string | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string | null
          slug?: string
          subject?: string | null
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channel: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          organization_id: string
          read_at: string | null
          recipient_email: string | null
          recipient_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id: string
          read_at?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string
          read_at?: string | null
          recipient_email?: string | null
          recipient_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      org_events: {
        Row: {
          address: string | null
          campaign_id: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_public: boolean
          location: string | null
          max_attendees: number | null
          organization_id: string
          project_id: string | null
          registered_count: number
          slug: string
          start_date: string
          status: string
          title: string
          type: string
          updated_at: string
          virtual_link: string | null
        }
        Insert: {
          address?: string | null
          campaign_id?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          max_attendees?: number | null
          organization_id: string
          project_id?: string | null
          registered_count?: number
          slug: string
          start_date: string
          status?: string
          title: string
          type?: string
          updated_at?: string
          virtual_link?: string | null
        }
        Update: {
          address?: string | null
          campaign_id?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          max_attendees?: number | null
          organization_id?: string
          project_id?: string | null
          registered_count?: number
          slug?: string
          start_date?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          department: string | null
          id: string
          joined_at: string
          organization_id: string
          permissions: Json
          role: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          joined_at?: string
          organization_id: string
          permissions?: Json
          role?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          joined_at?: string
          organization_id?: string
          permissions?: Json
          role?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          founded_date: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          registration_number: string | null
          settings: Json
          size: string
          slug: string
          status: string
          tax_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          founded_date?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          registration_number?: string | null
          settings?: Json
          size?: string
          slug: string
          status?: string
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          founded_date?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          registration_number?: string | null
          settings?: Json
          size?: string
          slug?: string
          status?: string
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          contract_value: number | null
          country: string | null
          created_at: string
          currency: string
          description: string | null
          documents: Json
          email: string
          end_date: string | null
          id: string
          logo_url: string | null
          name: string
          notes: string | null
          organization_id: string
          partnership_type: string
          phone: string | null
          start_date: string | null
          status: string
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          contract_value?: number | null
          country?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          documents?: Json
          email: string
          end_date?: string | null
          id?: string
          logo_url?: string | null
          name: string
          notes?: string | null
          organization_id: string
          partnership_type?: string
          phone?: string | null
          start_date?: string | null
          status?: string
          type: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          contract_value?: number | null
          country?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          documents?: Json
          email?: string
          end_date?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          partnership_type?: string
          phone?: string | null
          start_date?: string | null
          status?: string
          type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          areas_for_growth: string[]
          created_at: string
          feedback_notes: string
          id: string
          is_private: boolean
          organization_id: string
          rating: number | null
          review_period: string | null
          reviewer_id: string
          strengths: string[]
          subject_id: string
          subject_type: string
          title: string
          updated_at: string
        }
        Insert: {
          areas_for_growth?: string[]
          created_at?: string
          feedback_notes: string
          id?: string
          is_private?: boolean
          organization_id: string
          rating?: number | null
          review_period?: string | null
          reviewer_id: string
          strengths?: string[]
          subject_id: string
          subject_type: string
          title: string
          updated_at?: string
        }
        Update: {
          areas_for_growth?: string[]
          created_at?: string
          feedback_notes?: string
          id?: string
          is_private?: boolean
          organization_id?: string
          rating?: number | null
          review_period?: string | null
          reviewer_id?: string
          strengths?: string[]
          subject_id?: string
          subject_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_overrides: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          is_granted: boolean
          organization_id: string
          permission_key: string
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          is_granted: boolean
          organization_id: string
          permission_key: string
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          is_granted?: boolean
          organization_id?: string
          permission_key?: string
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_experience_items: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_enabled: boolean
          item_key: string
          kind: string
          label: string
          metadata: Json
          organization_id: string
          sort_order: number
          translations: Json
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_enabled?: boolean
          item_key: string
          kind: string
          label: string
          metadata?: Json
          organization_id: string
          sort_order?: number
          translations?: Json
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_enabled?: boolean
          item_key?: string
          kind?: string
          label?: string
          metadata?: Json
          organization_id?: string
          sort_order?: number
          translations?: Json
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_experience_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_experience_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          beneficiaries_reached: number
          beneficiaries_target: number | null
          budget: number | null
          category: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          currency: string
          description: string | null
          documents: Json
          end_date: string | null
          gallery_urls: string[]
          id: string
          location: string | null
          name: string
          organization_id: string
          progress: number
          slug: string
          spent: number
          start_date: string | null
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          beneficiaries_reached?: number
          beneficiaries_target?: number | null
          budget?: number | null
          category?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          documents?: Json
          end_date?: string | null
          gallery_urls?: string[]
          id?: string
          location?: string | null
          name: string
          organization_id: string
          progress?: number
          slug: string
          spent?: number
          start_date?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          beneficiaries_reached?: number
          beneficiaries_target?: number | null
          budget?: number | null
          category?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          documents?: Json
          end_date?: string | null
          gallery_urls?: string[]
          id?: string
          location?: string | null
          name?: string
          organization_id?: string
          progress?: number
          slug?: string
          spent?: number
          start_date?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      report_definitions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          entity_type: string
          filters: Json
          grouping: string[]
          id: string
          metrics: string[]
          name: string
          organization_id: string
          schedule_job_id: string | null
          slug: string
          sort_direction: string | null
          sort_field: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type: string
          filters?: Json
          grouping?: string[]
          id?: string
          metrics?: string[]
          name: string
          organization_id: string
          schedule_job_id?: string | null
          slug: string
          sort_direction?: string | null
          sort_field?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type?: string
          filters?: Json
          grouping?: string[]
          id?: string
          metrics?: string[]
          name?: string
          organization_id?: string
          schedule_job_id?: string | null
          slug?: string
          sort_direction?: string | null
          sort_field?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_definitions_schedule_job_id_fkey"
            columns: ["schedule_job_id"]
            isOneToOne: false
            referencedRelation: "scheduled_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      report_snapshots: {
        Row: {
          created_at: string
          data: Json
          expires_at: string | null
          generated_at: string
          generated_by: string | null
          id: string
          name: string | null
          organization_id: string
          report_id: string
          row_count: number
        }
        Insert: {
          created_at?: string
          data?: Json
          expires_at?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          name?: string | null
          organization_id: string
          report_id: string
          row_count?: number
        }
        Update: {
          created_at?: string
          data?: Json
          expires_at?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          name?: string | null
          organization_id?: string
          report_id?: string
          row_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_snapshots_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "report_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_assignments: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          organization_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          organization_id: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          organization_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_requests: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          reason: string | null
          requested_role: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          reason?: string | null
          requested_role: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          reason?: string | null
          requested_role?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_jobs: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          cron_expression: string | null
          description: string | null
          id: string
          is_active: boolean
          job_type: string
          last_run_at: string | null
          last_run_status: string | null
          name: string
          next_run_at: string | null
          organization_id: string
          run_count: number
          schedule_type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          cron_expression?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          job_type: string
          last_run_at?: string | null
          last_run_status?: string | null
          name: string
          next_run_at?: string | null
          organization_id: string
          run_count?: number
          schedule_type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          cron_expression?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          job_type?: string
          last_run_at?: string | null
          last_run_status?: string | null
          name?: string
          next_run_at?: string | null
          organization_id?: string
          run_count?: number
          schedule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
        }
        Relationships: []
      }
      tag_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_hours: {
        Row: {
          activity: string
          approved_by: string | null
          created_at: string
          date: string
          hours: number
          id: string
          notes: string | null
          organization_id: string
          project_id: string | null
          status: string
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          activity: string
          approved_by?: string | null
          created_at?: string
          date?: string
          hours: number
          id?: string
          notes?: string | null
          organization_id: string
          project_id?: string | null
          status?: string
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          activity?: string
          approved_by?: string | null
          created_at?: string
          date?: string
          hours?: number
          id?: string
          notes?: string | null
          organization_id?: string
          project_id?: string | null
          status?: string
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_volunteer_hours_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_volunteer_hours_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_volunteer_hours_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_hours_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_hours_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_hours_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_roles: {
        Row: {
          category: string | null
          commitment: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_urgent: boolean
          location: string
          openings: number
          organization_id: string
          published_at: string | null
          requirements: string[]
          responsibilities: string[]
          slug: string
          status: string
          title: string
          updated_at: string
          work_type: string
        }
        Insert: {
          category?: string | null
          commitment?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_urgent?: boolean
          location?: string
          openings?: number
          organization_id: string
          published_at?: string | null
          requirements?: string[]
          responsibilities?: string[]
          slug: string
          status?: string
          title: string
          updated_at?: string
          work_type?: string
        }
        Update: {
          category?: string | null
          commitment?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_urgent?: boolean
          location?: string
          openings?: number
          organization_id?: string
          published_at?: string | null
          requirements?: string[]
          responsibilities?: string[]
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          address: string | null
          availability: Json | null
          background_check_date: string | null
          background_check_status: string
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          documents: Json
          email: string
          emergency_contact: Json | null
          first_name: string
          hours_logged: number
          id: string
          interests: string[]
          joined_date: string
          last_name: string
          notes: string | null
          organization_id: string
          phone: string | null
          skills: string[]
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          availability?: Json | null
          background_check_date?: string | null
          background_check_status?: string
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          documents?: Json
          email: string
          emergency_contact?: Json | null
          first_name: string
          hours_logged?: number
          id?: string
          interests?: string[]
          joined_date?: string
          last_name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          skills?: string[]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          availability?: Json | null
          background_check_date?: string | null
          background_check_status?: string
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          documents?: Json
          email?: string
          emergency_contact?: Json | null
          first_name?: string
          hours_logged?: number
          id?: string
          interests?: string[]
          joined_date?: string
          last_name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          skills?: string[]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          delivered_at: string | null
          event_type: string
          id: string
          organization_id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          webhook_id: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          event_type: string
          id?: string
          organization_id: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          id?: string
          organization_id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          created_by: string | null
          events: string[]
          failure_count: number
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          organization_id: string
          secret_token: string | null
          success_count: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          organization_id: string
          secret_token?: string | null
          success_count?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          organization_id?: string
          secret_token?: string | null
          success_count?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          currency: string
          department: string | null
          documents: Json
          email: string
          emergency_contact: Json | null
          employee_id: string | null
          employment_type: string
          first_name: string
          hire_date: string | null
          id: string
          last_name: string
          notes: string | null
          organization_id: string
          phone: string | null
          position: string | null
          salary: number | null
          status: string
          termination_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          department?: string | null
          documents?: Json
          email: string
          emergency_contact?: Json | null
          employee_id?: string | null
          employment_type?: string
          first_name: string
          hire_date?: string | null
          id?: string
          last_name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          position?: string | null
          salary?: number | null
          status?: string
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          department?: string | null
          documents?: Json
          email?: string
          emergency_contact?: Json | null
          employee_id?: string | null
          employment_type?: string
          first_name?: string
          hire_date?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          position?: string | null
          salary?: number | null
          status?: string
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          slug: string
          status: string
          steps: Json
          trigger_config: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          slug: string
          status?: string
          steps?: Json
          trigger_config?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          slug?: string
          status?: string
          steps?: Json
          trigger_config?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_instances: {
        Row: {
          completed_at: string | null
          context_data: Json
          created_at: string
          current_step_index: number
          definition_id: string
          entity_id: string | null
          entity_type: string | null
          id: string
          organization_id: string
          started_at: string | null
          status: string
          step_history: Json
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          context_data?: Json
          created_at?: string
          current_step_index?: number
          definition_id: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id: string
          started_at?: string | null
          status?: string
          step_history?: Json
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          context_data?: Json
          created_at?: string
          current_step_index?: number
          definition_id?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string
          started_at?: string | null
          status?: string
          step_history?: Json
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          config: Json
          created_at: string
          definition_id: string
          id: string
          name: string
          organization_id: string
          step_index: number
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          definition_id: string
          id?: string
          name: string
          organization_id: string
          step_index: number
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          definition_id?: string
          id?: string
          name?: string
          organization_id?: string
          step_index?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "public_organization"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_campaigns: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          goal_amount: number | null
          id: string | null
          name: string | null
          raised_amount: number | null
          slug: string | null
          start_date: string | null
          video_url: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          goal_amount?: number | null
          id?: string | null
          name?: string | null
          raised_amount?: number | null
          slug?: string | null
          start_date?: string | null
          video_url?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          goal_amount?: number | null
          id?: string | null
          name?: string | null
          raised_amount?: number | null
          slug?: string | null
          start_date?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      public_content_blocks: {
        Row: {
          content: Json | null
          created_at: string | null
          id: string | null
          name: string | null
          page_id: string | null
          page_slug: string | null
          sort_order: number | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "content_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "public_content_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      public_content_page_translations: {
        Row: {
          category_label: string | null
          content: Json | null
          cover_alt_text: string | null
          cover_image_url: string | null
          cta_label: string | null
          cta_url: string | null
          locale: string | null
          meta_description: string | null
          meta_title: string | null
          page_id: string | null
          page_slug: string | null
          published_at: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_page_translations_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "content_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_page_translations_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "public_content_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      public_content_pages: {
        Row: {
          content: Json | null
          cover_image_url: string | null
          created_at: string | null
          id: string | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          id?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          id?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_entity_translations: {
        Row: {
          entity_id: string | null
          entity_type: string | null
          fields: Json | null
          locale: string | null
          published_at: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          entity_id?: string | null
          entity_type?: string | null
          fields?: Json | null
          locale?: string | null
          published_at?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          entity_id?: string | null
          entity_type?: string | null
          fields?: Json | null
          locale?: string | null
          published_at?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      public_events: {
        Row: {
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string | null
          location: string | null
          max_attendees: number | null
          registered_count: number | null
          slug: string | null
          start_date: string | null
          title: string | null
          type: string | null
          virtual_link: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string | null
          location?: string | null
          max_attendees?: number | null
          registered_count?: number | null
          slug?: string | null
          start_date?: string | null
          title?: string | null
          type?: string | null
          virtual_link?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string | null
          location?: string | null
          max_attendees?: number | null
          registered_count?: number | null
          slug?: string | null
          start_date?: string | null
          title?: string | null
          type?: string | null
          virtual_link?: string | null
        }
        Relationships: []
      }
      public_impact_metrics: {
        Row: {
          baseline_value: number | null
          category: string | null
          created_at: string | null
          current_value: number | null
          description: string | null
          id: string | null
          name: string | null
          slug: string | null
          target_value: number | null
          unit: string | null
        }
        Insert: {
          baseline_value?: number | null
          category?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          target_value?: number | null
          unit?: string | null
        }
        Update: {
          baseline_value?: number | null
          category?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          target_value?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      public_impact_stories: {
        Row: {
          author_avatar_url: string | null
          author_name: string | null
          content: string | null
          created_at: string | null
          duration_label: string | null
          id: string | null
          image_alt: string | null
          image_url: string | null
          impact_stats: Json | null
          is_featured: boolean | null
          media_url: string | null
          program: string | null
          published_at: string | null
          role: string | null
          slug: string | null
          story_type: string | null
          summary: string | null
          timeline: Json | null
          title: string | null
          transcript_url: string | null
        }
        Insert: {
          author_avatar_url?: string | null
          author_name?: string | null
          content?: string | null
          created_at?: string | null
          duration_label?: string | null
          id?: string | null
          image_alt?: string | null
          image_url?: string | null
          impact_stats?: Json | null
          is_featured?: boolean | null
          media_url?: string | null
          program?: string | null
          published_at?: string | null
          role?: string | null
          slug?: string | null
          story_type?: string | null
          summary?: string | null
          timeline?: Json | null
          title?: string | null
          transcript_url?: string | null
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string | null
          content?: string | null
          created_at?: string | null
          duration_label?: string | null
          id?: string | null
          image_alt?: string | null
          image_url?: string | null
          impact_stats?: Json | null
          is_featured?: boolean | null
          media_url?: string | null
          program?: string | null
          published_at?: string | null
          role?: string | null
          slug?: string | null
          story_type?: string | null
          summary?: string | null
          timeline?: Json | null
          title?: string | null
          transcript_url?: string | null
        }
        Relationships: []
      }
      public_news_articles: {
        Row: {
          author_avatar_url: string | null
          author_name: string | null
          author_role: string | null
          category: string | null
          content: string | null
          cover_alt_text: string | null
          cover_image_url: string | null
          created_at: string | null
          excerpt: string | null
          id: string | null
          is_featured: boolean | null
          key_takeaways: string[] | null
          published_at: string | null
          read_minutes: number | null
          slug: string | null
          tags: string[] | null
          title: string | null
        }
        Insert: {
          author_avatar_url?: string | null
          author_name?: string | null
          author_role?: string | null
          category?: string | null
          content?: string | null
          cover_alt_text?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string | null
          is_featured?: boolean | null
          key_takeaways?: string[] | null
          published_at?: string | null
          read_minutes?: number | null
          slug?: string | null
          tags?: string[] | null
          title?: string | null
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string | null
          author_role?: string | null
          category?: string | null
          content?: string | null
          cover_alt_text?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string | null
          is_featured?: boolean | null
          key_takeaways?: string[] | null
          published_at?: string | null
          read_minutes?: number | null
          slug?: string | null
          tags?: string[] | null
          title?: string | null
        }
        Relationships: []
      }
      public_organization: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          founded_date: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          settings: Json | null
          slug: string | null
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          founded_date?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          settings?: Json | null
          slug?: string | null
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          founded_date?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          settings?: Json | null
          slug?: string | null
          website?: string | null
        }
        Relationships: []
      }
      public_partners: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          partnership_type: string | null
          type: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          partnership_type?: string | null
          type?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          partnership_type?: string | null
          type?: string | null
          website?: string | null
        }
        Relationships: []
      }
      public_projects: {
        Row: {
          beneficiaries_reached: number | null
          beneficiaries_target: number | null
          category: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          gallery_urls: string[] | null
          id: string | null
          location: string | null
          name: string | null
          progress: number | null
          slug: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          beneficiaries_reached?: number | null
          beneficiaries_target?: number | null
          category?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          gallery_urls?: string[] | null
          id?: string | null
          location?: string | null
          name?: string | null
          progress?: number | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          beneficiaries_reached?: number | null
          beneficiaries_target?: number | null
          category?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          gallery_urls?: string[] | null
          id?: string | null
          location?: string | null
          name?: string | null
          progress?: number | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: []
      }
      public_public_campaigns: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          goal_amount: number | null
          id: string | null
          name: string | null
          raised_amount: number | null
          slug: string | null
          start_date: string | null
          video_url: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          goal_amount?: number | null
          id?: string | null
          name?: string | null
          raised_amount?: number | null
          slug?: string | null
          start_date?: string | null
          video_url?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          goal_amount?: number | null
          id?: string | null
          name?: string | null
          raised_amount?: number | null
          slug?: string | null
          start_date?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      public_public_partners: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          partnership_type: string | null
          type: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          partnership_type?: string | null
          type?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          partnership_type?: string | null
          type?: string | null
          website?: string | null
        }
        Relationships: []
      }
      public_public_projects: {
        Row: {
          beneficiaries_reached: number | null
          beneficiaries_target: number | null
          category: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          gallery_urls: string[] | null
          id: string | null
          location: string | null
          name: string | null
          progress: number | null
          slug: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          beneficiaries_reached?: number | null
          beneficiaries_target?: number | null
          category?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          gallery_urls?: string[] | null
          id?: string | null
          location?: string | null
          name?: string | null
          progress?: number | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          beneficiaries_reached?: number | null
          beneficiaries_target?: number | null
          category?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          gallery_urls?: string[] | null
          id?: string | null
          location?: string | null
          name?: string | null
          progress?: number | null
          slug?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: []
      }
      public_volunteer_roles: {
        Row: {
          category: string | null
          commitment: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_urgent: boolean | null
          location: string | null
          openings: number | null
          requirements: string[] | null
          responsibilities: string[] | null
          slug: string | null
          title: string | null
          work_type: string | null
        }
        Insert: {
          category?: string | null
          commitment?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_urgent?: boolean | null
          location?: string | null
          openings?: number | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          slug?: string | null
          title?: string | null
          work_type?: string | null
        }
        Update: {
          category?: string | null
          commitment?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_urgent?: boolean | null
          location?: string | null
          openings?: number | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          slug?: string | null
          title?: string | null
          work_type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: Json }
      add_tenant_policies: {
        Args: {
          p_manage: string
          p_nullable_org?: boolean
          p_read: string
          p_tbl: string
          p_update_extra?: string
        }
        Returns: undefined
      }
      public_content_preview: { Args: { p_token: string }; Returns: Json }
      public_default_org_id: { Args: never; Returns: string }
      public_financial_summary: { Args: never; Returns: Json }
      public_impact_stats: { Args: never; Returns: Json }
      public_org_brand_theme: { Args: never; Returns: string }
      role_has_permission: {
        Args: { p_permission: string; p_role: string }
        Returns: boolean
      }
      schedule_cron_jobs: {
        Args: { p_functions_base_url: string }
        Returns: string
      }
      storage_org_id: { Args: { p_name: string }; Returns: string }
      user_has_org_access: { Args: { p_org_id: string }; Returns: boolean }
      user_has_permission: {
        Args: { p_org_id: string; p_permission: string }
        Returns: boolean
      }
      validate_invitation: {
        Args: { p_token: string }
        Returns: {
          email: string
          first_name: string
          inviter_name: string
          last_name: string
          organization_name: string
          role: string
          user_exists: boolean
          valid: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
