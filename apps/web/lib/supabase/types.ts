export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      appointments: {
        Row: {
          actual_duration_minutes: number | null
          client_id: string | null
          created_at: string
          finished_at: string | null
          id: string
          is_home_visit: boolean | null
          payment_status: string | null
          price: number | null
          service_id: string | null
          service_name: string
          start_time: string
          started_at: string | null
          status: string | null
          tenant_id: string
          total_duration_minutes: number | null
        }
        Insert: {
          actual_duration_minutes?: number | null
          client_id?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          is_home_visit?: boolean | null
          payment_status?: string | null
          price?: number | null
          service_id?: string | null
          service_name: string
          start_time: string
          started_at?: string | null
          status?: string | null
          tenant_id: string
          total_duration_minutes?: number | null
        }
        Update: {
          actual_duration_minutes?: number | null
          client_id?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          is_home_visit?: boolean | null
          payment_status?: string | null
          price?: number | null
          service_id?: string | null
          service_name?: string
          start_time?: string
          started_at?: string | null
          status?: string | null
          tenant_id?: string
          total_duration_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_blocks: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          reason: string | null
          start_time: string
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          reason?: string | null
          start_time: string
          tenant_id?: string
          title?: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          reason?: string | null
          start_time?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          close_time: string
          created_at: string | null
          day_of_week: number
          id: string
          is_closed: boolean | null
          open_time: string
          tenant_id: string
        }
        Insert: {
          close_time: string
          created_at?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          open_time: string
          tenant_id: string
        }
        Update: {
          close_time?: string
          created_at?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean | null
          open_time?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          como_conheceu: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          endereco_completo: string | null
          health_tags: string[] | null
          id: string
          initials: string | null
          name: string
          observacoes_gerais: string | null
          phone: string | null
          profissao: string | null
          tenant_id: string
        }
        Insert: {
          como_conheceu?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco_completo?: string | null
          health_tags?: string[] | null
          id?: string
          initials?: string | null
          name: string
          observacoes_gerais?: string | null
          phone?: string | null
          profissao?: string | null
          tenant_id: string
        }
        Update: {
          como_conheceu?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco_completo?: string | null
          health_tags?: string[] | null
          id?: string
          initials?: string | null
          name?: string
          observacoes_gerais?: string | null
          phone?: string | null
          profissao?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_jobs: {
        Row: {
          appointment_id: string | null
          channel: string
          created_at: string
          id: string
          payload: Json
          scheduled_for: string
          status: string
          template_id: string | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          channel: string
          created_at?: string
          id?: string
          payload?: Json
          scheduled_for: string
          status?: string
          template_id?: string | null
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          channel?: string
          created_at?: string
          id?: string
          payload?: Json
          scheduled_for?: string
          status?: string
          template_id?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_jobs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          accepts_home_visit: boolean | null
          created_at: string
          custom_buffer_minutes: number | null
          description: string | null
          duration_minutes: number
          home_visit_fee: number | null
          id: string
          name: string
          price: number
          tenant_id: string
        }
        Insert: {
          accepts_home_visit?: boolean | null
          created_at?: string
          custom_buffer_minutes?: number | null
          description?: string | null
          duration_minutes: number
          home_visit_fee?: number | null
          id?: string
          name: string
          price: number
          tenant_id: string
        }
        Update: {
          accepts_home_visit?: boolean | null
          created_at?: string
          custom_buffer_minutes?: number | null
          description?: string | null
          duration_minutes?: number
          home_visit_fee?: number | null
          id?: string
          name?: string
          price?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string | null
          default_home_buffer: number | null
          default_studio_buffer: number | null
          id: string
          tenant_id: string
          updated_at: string | null
          whatsapp_notification_number: string | null
        }
        Insert: {
          created_at?: string | null
          default_home_buffer?: number | null
          default_studio_buffer?: number | null
          id?: string
          tenant_id?: string
          updated_at?: string | null
          whatsapp_notification_number?: string | null
        }
        Update: {
          created_at?: string | null
          default_home_buffer?: number | null
          default_studio_buffer?: number | null
          id?: string
          tenant_id?: string
          updated_at?: string | null
          whatsapp_notification_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          appointment_id: string | null
          category: string | null
          created_at: string | null
          description: string
          id: string
          payment_method: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          payment_method?: string | null
          tenant_id?: string
          type: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          payment_method?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_internal_appointment: {
        Args: {
          client_name: string
          client_phone?: string
          is_home_visit?: boolean
          p_start_time: string
          p_tenant_id: string
          service_id: string
        }
        Returns: string
      }
      create_public_appointment: {
        Args: {
          client_name: string
          client_phone: string
          is_home_visit?: boolean
          p_start_time: string
          service_id: string
          tenant_slug: string
        }
        Returns: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
