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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      document_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          template_content: string
          template_name: string
          template_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          template_content: string
          template_name: string
          template_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          template_content?: string
          template_name?: string
          template_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          folder_name: string
          id: string
          mime_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          folder_name: string
          id?: string
          mime_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          folder_name?: string
          id?: string
          mime_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      licitation_processes: {
        Row: {
          budget_allocation: string | null
          created_at: string
          department: string
          estimated_value: number
          id: string
          modality: string
          object: string
          opening_date: string | null
          process_number: string
          publication_date: string | null
          reference_term_attached: boolean | null
          status: string
          supplier_history: Json | null
          technical_study_attached: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_allocation?: string | null
          created_at?: string
          department: string
          estimated_value: number
          id?: string
          modality: string
          object: string
          opening_date?: string | null
          process_number: string
          publication_date?: string | null
          reference_term_attached?: boolean | null
          status?: string
          supplier_history?: Json | null
          technical_study_attached?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_allocation?: string | null
          created_at?: string
          department?: string
          estimated_value?: number
          id?: string
          modality?: string
          object?: string
          opening_date?: string | null
          process_number?: string
          publication_date?: string | null
          reference_term_attached?: boolean | null
          status?: string
          supplier_history?: Json | null
          technical_study_attached?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_quotations: {
        Row: {
          average_price: number
          created_at: string
          end_date: string | null
          id: string
          quotation_count: number
          quotations: Json
          search_term: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          average_price: number
          created_at?: string
          end_date?: string | null
          id?: string
          quotation_count: number
          quotations: Json
          search_term: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          average_price?: number
          created_at?: string
          end_date?: string | null
          id?: string
          quotation_count?: number
          quotations?: Json
          search_term?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_analysis: {
        Row: {
          analyzed_at: string
          created_at: string
          id: string
          process_id: string
          recommendations: string | null
          risk_factors: Json
          risk_level: string
          risk_score: number
          user_id: string
        }
        Insert: {
          analyzed_at?: string
          created_at?: string
          id?: string
          process_id: string
          recommendations?: string | null
          risk_factors: Json
          risk_level: string
          risk_score: number
          user_id: string
        }
        Update: {
          analyzed_at?: string
          created_at?: string
          id?: string
          process_id?: string
          recommendations?: string | null
          risk_factors?: Json
          risk_level?: string
          risk_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_analysis_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "licitation_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_minutas: {
        Row: {
          created_at: string
          generated_content: string
          id: string
          pncp_data: Json | null
          pncp_id: string | null
          pncp_objeto: string | null
          status: string
          template_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_content: string
          id?: string
          pncp_data?: Json | null
          pncp_id?: string | null
          pncp_objeto?: string | null
          status?: string
          template_type: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          generated_content?: string
          id?: string
          pncp_data?: Json | null
          pncp_id?: string | null
          pncp_objeto?: string | null
          status?: string
          template_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transparency_reports: {
        Row: {
          analysis_date: string
          analysis_summary: string | null
          created_at: string
          detailed_findings: Json | null
          findings_count: number
          id: string
          portal_url: string
          score: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_date?: string
          analysis_summary?: string | null
          created_at?: string
          detailed_findings?: Json | null
          findings_count?: number
          id?: string
          portal_url: string
          score: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_date?: string
          analysis_summary?: string | null
          created_at?: string
          detailed_findings?: Json | null
          findings_count?: number
          id?: string
          portal_url?: string
          score?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          author_id: string
          content: string
          created_at: number
          department: string
          gov_level: string | null
          id: string
          integrity_hash: string
          status: string
          title: string
        }
        Insert: {
          author_id: string
          content: string
          created_at: number
          department?: string
          gov_level?: string | null
          id?: string
          integrity_hash: string
          status?: string
          title: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: number
          department?: string
          gov_level?: string | null
          id?: string
          integrity_hash?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      organization_settings: {
        Row: {
          id: string
          logo_data: string | null
          org_name: string
          state: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          logo_data?: string | null
          org_name?: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          logo_data?: string | null
          org_name?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      impugnacoes: {
        Row: {
          analysis_result: string
          created_at: string
          edital_text: string
          id: string
          impugnation_text: string
          user_id: string | null
        }
        Insert: {
          analysis_result: string
          created_at?: string
          edital_text: string
          id?: string
          impugnation_text: string
          user_id?: string | null
        }
        Update: {
          analysis_result?: string
          created_at?: string
          edital_text?: string
          id?: string
          impugnation_text?: string
          user_id?: string | null
        }
        Relationships: []
      }
      documentos_gerados: {
        Row: {
          id: string
          title: string
          type: string
          content: string
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          title: string
          type: string
          content: string
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          type?: string
          content?: string
          created_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
