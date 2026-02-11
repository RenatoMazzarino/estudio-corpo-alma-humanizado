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
          address_bairro: string | null
          address_cep: string | null
          address_cidade: string | null
          address_complemento: string | null
          address_estado: string | null
          address_logradouro: string | null
          address_numero: string | null
          actual_duration_minutes: number | null
          client_address_id: string | null
          client_id: string | null
          created_at: string
          finished_at: string | null
          id: string
          is_home_visit: boolean | null
          internal_notes: string | null
          payment_status: string | null
          price_override: number | null
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
          address_bairro?: string | null
          address_cep?: string | null
          address_cidade?: string | null
          address_complemento?: string | null
          address_estado?: string | null
          address_logradouro?: string | null
          address_numero?: string | null
          actual_duration_minutes?: number | null
          client_address_id?: string | null
          client_id?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          is_home_visit?: boolean | null
          internal_notes?: string | null
          payment_status?: string | null
          price_override?: number | null
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
          address_bairro?: string | null
          address_cep?: string | null
          address_cidade?: string | null
          address_complemento?: string | null
          address_estado?: string | null
          address_logradouro?: string | null
          address_numero?: string | null
          actual_duration_minutes?: number | null
          client_address_id?: string | null
          client_id?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          is_home_visit?: boolean | null
          internal_notes?: string | null
          payment_status?: string | null
          price_override?: number | null
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
            foreignKeyName: "appointments_client_address_id_fkey"
            columns: ["client_address_id"]
            isOneToOne: false
            referencedRelation: "client_addresses"
            referencedColumns: ["id"]
          },
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
      appointment_attendances: {
        Row: {
          actual_seconds: number
          appointment_id: string
          checkout_status: string
          confirmed_at: string | null
          confirmed_channel: string | null
          created_at: string
          current_stage: string
          paused_total_seconds: number
          planned_seconds: number | null
          post_status: string
          pre_status: string
          session_status: string
          stage_lock_reason: string | null
          tenant_id: string
          timer_paused_at: string | null
          timer_started_at: string | null
          timer_status: string
          updated_at: string
        }
        Insert: {
          actual_seconds?: number
          appointment_id: string
          checkout_status?: string
          confirmed_at?: string | null
          confirmed_channel?: string | null
          created_at?: string
          current_stage?: string
          paused_total_seconds?: number
          planned_seconds?: number | null
          post_status?: string
          pre_status?: string
          session_status?: string
          stage_lock_reason?: string | null
          tenant_id?: string
          timer_paused_at?: string | null
          timer_started_at?: string | null
          timer_status?: string
          updated_at?: string
        }
        Update: {
          actual_seconds?: number
          appointment_id?: string
          checkout_status?: string
          confirmed_at?: string | null
          confirmed_channel?: string | null
          created_at?: string
          current_stage?: string
          paused_total_seconds?: number
          planned_seconds?: number | null
          post_status?: string
          pre_status?: string
          session_status?: string
          stage_lock_reason?: string | null
          tenant_id?: string
          timer_paused_at?: string | null
          timer_started_at?: string | null
          timer_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_attendances_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_attendances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_checklist_items: {
        Row: {
          appointment_id: string
          completed_at: string | null
          created_at: string
          id: string
          label: string
          sort_order: number
          source: string | null
          tenant_id: string
        }
        Insert: {
          appointment_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          source?: string | null
          tenant_id?: string
        }
        Update: {
          appointment_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          source?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_checklist_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_checklist_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_checkout: {
        Row: {
          appointment_id: string
          confirmed_at: string | null
          created_at: string
          discount_reason: string | null
          discount_type: string | null
          discount_value: number | null
          payment_status: string
          subtotal: number
          tenant_id: string
          total: number
          updated_at: string
        }
        Insert: {
          appointment_id: string
          confirmed_at?: string | null
          created_at?: string
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number | null
          payment_status?: string
          subtotal?: number
          tenant_id?: string
          total?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          confirmed_at?: string | null
          created_at?: string
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number | null
          payment_status?: string
          subtotal?: number
          tenant_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_checkout_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_checkout_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_checkout_items: {
        Row: {
          amount: number
          appointment_id: string
          created_at: string
          id: string
          label: string
          metadata: Json | null
          qty: number
          sort_order: number
          tenant_id: string
          type: string
        }
        Insert: {
          amount: number
          appointment_id: string
          created_at?: string
          id?: string
          label: string
          metadata?: Json | null
          qty?: number
          sort_order?: number
          tenant_id?: string
          type: string
        }
        Update: {
          amount?: number
          appointment_id?: string
          created_at?: string
          id?: string
          label?: string
          metadata?: Json | null
          qty?: number
          sort_order?: number
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_checkout_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_checkout_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_events: {
        Row: {
          appointment_id: string
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          payload: Json
          tenant_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          payload?: Json
          tenant_id?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          payload?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_messages: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          payload: Json | null
          sent_at: string | null
          status: string
          tenant_id: string
          type: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          payload?: Json | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
          type: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_evolution_entries: {
        Row: {
          appointment_id: string
          complaint: string | null
          created_at: string
          created_by: string | null
          id: string
          recommendations: string | null
          sections_json: Json | null
          status: string
          summary: string | null
          techniques: string | null
          tenant_id: string
          version: number
        }
        Insert: {
          appointment_id: string
          complaint?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          recommendations?: string | null
          sections_json?: Json | null
          status?: string
          summary?: string | null
          techniques?: string | null
          tenant_id?: string
          version: number
        }
        Update: {
          appointment_id?: string
          complaint?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          recommendations?: string | null
          sections_json?: Json | null
          status?: string
          summary?: string | null
          techniques?: string | null
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "appointment_evolution_entries_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_evolution_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_payments: {
        Row: {
          amount: number
          appointment_id: string
          card_brand: string | null
          card_last4: string | null
          created_at: string
          id: string
          installments: number | null
          method: string
          paid_at: string | null
          payment_method_id: string | null
          provider_ref: string | null
          raw_payload: Json | null
          status: string
          tenant_id: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          appointment_id: string
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          id?: string
          installments?: number | null
          method: string
          paid_at?: string | null
          payment_method_id?: string | null
          provider_ref?: string | null
          raw_payload?: Json | null
          status?: string
          tenant_id?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          id?: string
          installments?: number | null
          method?: string
          paid_at?: string | null
          payment_method_id?: string | null
          provider_ref?: string | null
          raw_payload?: Json | null
          status?: string
          tenant_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_post: {
        Row: {
          appointment_id: string
          created_at: string
          follow_up_due_at: string | null
          follow_up_note: string | null
          kpi_total_seconds: number
          post_notes: string | null
          survey_score: number | null
          survey_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          follow_up_due_at?: string | null
          follow_up_note?: string | null
          kpi_total_seconds?: number
          post_notes?: string | null
          survey_score?: number | null
          survey_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          follow_up_due_at?: string | null
          follow_up_note?: string | null
          kpi_total_seconds?: number
          post_notes?: string | null
          survey_score?: number | null
          survey_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_post_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_post_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_blocks: {
        Row: {
          block_type: string
          created_at: string | null
          end_time: string
          id: string
          is_full_day: boolean | null
          reason: string | null
          start_time: string
          tenant_id: string
          title: string
        }
        Insert: {
          block_type?: string
          created_at?: string | null
          end_time: string
          id?: string
          is_full_day?: boolean | null
          reason?: string | null
          start_time: string
          tenant_id?: string
          title?: string
        }
        Update: {
          block_type?: string
          created_at?: string | null
          end_time?: string
          id?: string
          is_full_day?: boolean | null
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
          address_bairro: string | null
          address_cep: string | null
          address_cidade: string | null
          address_complemento: string | null
          address_estado: string | null
          address_logradouro: string | null
          address_numero: string | null
          anamnese_url: string | null
          avatar_url: string | null
          como_conheceu: string | null
          cpf: string | null
          contraindications: string | null
          created_at: string
          clinical_history: string | null
          data_nascimento: string | null
          email: string | null
          endereco_completo: string | null
          extra_data: Json
          guardian_cpf: string | null
          guardian_name: string | null
          guardian_phone: string | null
          health_tags: string[] | null
          id: string
          initials: string | null
          is_minor: boolean
          is_vip: boolean
          marketing_opt_in: boolean
          name: string
          needs_attention: boolean
          observacoes_gerais: string | null
          phone: string | null
          preferences_notes: string | null
          profissao: string | null
          tenant_id: string
        }
        Insert: {
          address_bairro?: string | null
          address_cep?: string | null
          address_cidade?: string | null
          address_complemento?: string | null
          address_estado?: string | null
          address_logradouro?: string | null
          address_numero?: string | null
          anamnese_url?: string | null
          avatar_url?: string | null
          como_conheceu?: string | null
          cpf?: string | null
          contraindications?: string | null
          created_at?: string
          clinical_history?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco_completo?: string | null
          extra_data?: Json
          guardian_cpf?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          health_tags?: string[] | null
          id?: string
          initials?: string | null
          is_minor?: boolean
          is_vip?: boolean
          marketing_opt_in?: boolean
          name: string
          needs_attention?: boolean
          observacoes_gerais?: string | null
          phone?: string | null
          preferences_notes?: string | null
          profissao?: string | null
          tenant_id: string
        }
        Update: {
          address_bairro?: string | null
          address_cep?: string | null
          address_cidade?: string | null
          address_complemento?: string | null
          address_estado?: string | null
          address_logradouro?: string | null
          address_numero?: string | null
          anamnese_url?: string | null
          avatar_url?: string | null
          como_conheceu?: string | null
          cpf?: string | null
          contraindications?: string | null
          created_at?: string
          clinical_history?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco_completo?: string | null
          extra_data?: Json
          guardian_cpf?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          health_tags?: string[] | null
          id?: string
          initials?: string | null
          is_minor?: boolean
          is_vip?: boolean
          marketing_opt_in?: boolean
          name?: string
          needs_attention?: boolean
          observacoes_gerais?: string | null
          phone?: string | null
          preferences_notes?: string | null
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
      client_addresses: {
        Row: {
          address_bairro: string | null
          address_cep: string | null
          address_cidade: string | null
          address_complemento: string | null
          address_estado: string | null
          address_logradouro: string | null
          address_numero: string | null
          client_id: string
          created_at: string
          id: string
          is_primary: boolean
          label: string
          referencia: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address_bairro?: string | null
          address_cep?: string | null
          address_cidade?: string | null
          address_complemento?: string | null
          address_estado?: string | null
          address_logradouro?: string | null
          address_numero?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string
          referencia?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          address_bairro?: string | null
          address_cep?: string | null
          address_cidade?: string | null
          address_complemento?: string | null
          address_estado?: string | null
          address_logradouro?: string | null
          address_numero?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string
          referencia?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_addresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_addresses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_emails: {
        Row: {
          client_id: string
          created_at: string
          email: string
          id: string
          is_primary: boolean
          label: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email: string
          id?: string
          is_primary?: boolean
          label?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_emails_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_emails_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_health_items: {
        Row: {
          client_id: string
          created_at: string
          id: string
          label: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          label: string
          tenant_id?: string
          type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          label?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_health_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_health_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_phones: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_primary: boolean
          is_whatsapp: boolean
          label: string | null
          number_e164: string | null
          number_raw: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          is_whatsapp?: boolean
          label?: string | null
          number_e164?: string | null
          number_raw: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          is_whatsapp?: boolean
          label?: string | null
          number_e164?: string | null
          number_raw?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_phones_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_phones_tenant_id_fkey"
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
          buffer_after_minutes: number | null
          buffer_before_minutes: number | null
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
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
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
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
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
          buffer_after_minutes: number | null
          buffer_before_minutes: number | null
          created_at: string | null
          default_home_buffer: number | null
          default_studio_buffer: number | null
          id: string
          public_base_url: string | null
          signal_percentage: number | null
          tenant_id: string
          updated_at: string | null
          whatsapp_notification_number: string | null
        }
        Insert: {
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          created_at?: string | null
          default_home_buffer?: number | null
          default_studio_buffer?: number | null
          id?: string
          public_base_url?: string | null
          signal_percentage?: number | null
          tenant_id?: string
          updated_at?: string | null
          whatsapp_notification_number?: string | null
        }
        Update: {
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          created_at?: string | null
          default_home_buffer?: number | null
          default_studio_buffer?: number | null
          id?: string
          public_base_url?: string | null
          signal_percentage?: number | null
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
          p_address_bairro?: string
          p_address_cep?: string
          p_address_cidade?: string
          p_address_complemento?: string
          p_address_estado?: string
          p_address_logradouro?: string
          p_address_numero?: string
          p_internal_notes?: string
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
          p_address_bairro?: string
          p_address_cep?: string
          p_address_cidade?: string
          p_address_complemento?: string
          p_address_estado?: string
          p_address_logradouro?: string
          p_address_numero?: string
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
