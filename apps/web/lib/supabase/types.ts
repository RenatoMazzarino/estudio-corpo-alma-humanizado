export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointment_attendances: {
        Row: {
          actual_seconds: number
          appointment_id: string
          confirmed_at: string | null
          created_at: string
          paused_total_seconds: number
          planned_seconds: number | null
          tenant_id: string
          timer_paused_at: string | null
          timer_started_at: string | null
          timer_status: string
          updated_at: string
        }
        Insert: {
          actual_seconds?: number
          appointment_id: string
          confirmed_at?: string | null
          created_at?: string
          paused_total_seconds?: number
          planned_seconds?: number | null
          tenant_id: string
          timer_paused_at?: string | null
          timer_started_at?: string | null
          timer_status?: string
          updated_at?: string
        }
        Update: {
          actual_seconds?: number
          appointment_id?: string
          confirmed_at?: string | null
          created_at?: string
          paused_total_seconds?: number
          planned_seconds?: number | null
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
          tenant_id: string
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
          subtotal?: number
          tenant_id: string
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
          tenant_id: string
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
          tenant_id: string
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
      appointment_evolution_entries: {
        Row: {
          appointment_id: string
          created_at: string
          created_by: string | null
          evolution_text: string | null
          id: string
          tenant_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          created_by?: string | null
          evolution_text?: string | null
          id?: string
          tenant_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          created_by?: string | null
          evolution_text?: string | null
          id?: string
          tenant_id?: string
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
          tenant_id: string
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
      appointment_payments: {
        Row: {
          amount: number
          appointment_id: string
          card_brand: string | null
          card_last4: string | null
          card_mode: string | null
          created_at: string
          id: string
          installments: number | null
          method: string
          paid_at: string | null
          payment_method_id: string | null
          point_terminal_id: string | null
          provider_order_id: string | null
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
          card_mode?: string | null
          created_at?: string
          id?: string
          installments?: number | null
          method: string
          paid_at?: string | null
          payment_method_id?: string | null
          point_terminal_id?: string | null
          provider_order_id?: string | null
          provider_ref?: string | null
          raw_payload?: Json | null
          status?: string
          tenant_id: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string
          card_brand?: string | null
          card_last4?: string | null
          card_mode?: string | null
          created_at?: string
          id?: string
          installments?: number | null
          method?: string
          paid_at?: string | null
          payment_method_id?: string | null
          point_terminal_id?: string | null
          provider_order_id?: string | null
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
          tenant_id: string
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
      appointments: {
        Row: {
          actual_duration_minutes: number | null
          address_bairro: string | null
          address_cep: string | null
          address_cidade: string | null
          address_complemento: string | null
          address_estado: string | null
          address_logradouro: string | null
          address_numero: string | null
          attendance_code: string | null
          client_address_id: string | null
          client_id: string | null
          created_at: string
          displacement_distance_km: number | null
          displacement_fee: number
          finished_at: string | null
          id: string
          internal_notes: string | null
          is_home_visit: boolean | null
          payment_status: string | null
          price: number | null
          price_override: number | null
          service_id: string | null
          service_name: string
          signal_paid_amount: number
          signal_required_amount: number
          signal_status: string
          start_time: string
          started_at: string | null
          status: string | null
          tenant_id: string
          total_duration_minutes: number | null
        }
        Insert: {
          actual_duration_minutes?: number | null
          address_bairro?: string | null
          address_cep?: string | null
          address_cidade?: string | null
          address_complemento?: string | null
          address_estado?: string | null
          address_logradouro?: string | null
          address_numero?: string | null
          attendance_code?: string | null
          client_address_id?: string | null
          client_id?: string | null
          created_at?: string
          displacement_distance_km?: number | null
          displacement_fee?: number
          finished_at?: string | null
          id?: string
          internal_notes?: string | null
          is_home_visit?: boolean | null
          payment_status?: string | null
          price?: number | null
          price_override?: number | null
          service_id?: string | null
          service_name: string
          signal_paid_amount?: number
          signal_required_amount?: number
          signal_status?: string
          start_time: string
          started_at?: string | null
          status?: string | null
          tenant_id: string
          total_duration_minutes?: number | null
        }
        Update: {
          actual_duration_minutes?: number | null
          address_bairro?: string | null
          address_cep?: string | null
          address_cidade?: string | null
          address_complemento?: string | null
          address_estado?: string | null
          address_logradouro?: string | null
          address_numero?: string | null
          attendance_code?: string | null
          client_address_id?: string | null
          client_id?: string | null
          created_at?: string
          displacement_distance_km?: number | null
          displacement_fee?: number
          finished_at?: string | null
          id?: string
          internal_notes?: string | null
          is_home_visit?: boolean | null
          payment_status?: string | null
          price?: number | null
          price_override?: number | null
          service_id?: string | null
          service_name?: string
          signal_paid_amount?: number
          signal_required_amount?: number
          signal_status?: string
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
          tenant_id: string
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
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean | null
          open_time: string
          tenant_id: string
        }
        Insert: {
          close_time: string
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean | null
          open_time: string
          tenant_id: string
        }
        Update: {
          close_time?: string
          created_at?: string
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
          latitude: number | null
          longitude: number | null
          place_id: string | null
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
          latitude?: number | null
          longitude?: number | null
          place_id?: string | null
          referencia?: string | null
          tenant_id: string
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
          latitude?: number | null
          longitude?: number | null
          place_id?: string | null
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
      client_code_counters: {
        Row: {
          last_value: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          last_value?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          last_value?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_code_counters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
          normalized_email: string | null
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
          normalized_email?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          normalized_email?: string | null
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
          is_active: boolean
          label: string
          notes: string | null
          severity: string | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          notes?: string | null
          severity?: string | null
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          notes?: string | null
          severity?: string | null
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
          normalized_number: string | null
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
          normalized_number?: string | null
          number_e164?: string | null
          number_raw: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          is_whatsapp?: boolean
          label?: string | null
          normalized_number?: string | null
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
      clients: {
        Row: {
          address_bairro: string | null
          address_cep: string | null
          address_cidade: string | null
          address_complemento: string | null
          address_estado: string | null
          address_logradouro: string | null
          address_numero: string | null
          anamnese_form_answered_at: string | null
          anamnese_form_sent_at: string | null
          anamnese_form_status: string | null
          anamnese_url: string | null
          archived_at: string | null
          avatar_url: string | null
          birth_date: string | null
          client_code: string | null
          clinical_history: string | null
          como_conheceu: string | null
          contraindications: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          endereco_completo: string | null
          guardian_cpf: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          health_tags: string[] | null
          id: string
          initials: string | null
          internal_reference: string | null
          is_minor: boolean
          is_minor_override: boolean | null
          is_vip: boolean
          marketing_opt_in: boolean
          name: string
          needs_attention: boolean
          notes: string | null
          observacoes_gerais: string | null
          phone: string | null
          preferences_notes: string | null
          profissao: string | null
          public_first_name: string | null
          public_last_name: string | null
          public_name: string | null
          short_name: string | null
          system_name: string | null
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
          anamnese_form_answered_at?: string | null
          anamnese_form_sent_at?: string | null
          anamnese_form_status?: string | null
          anamnese_url?: string | null
          archived_at?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          client_code?: string | null
          clinical_history?: string | null
          como_conheceu?: string | null
          contraindications?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco_completo?: string | null
          guardian_cpf?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          health_tags?: string[] | null
          id?: string
          initials?: string | null
          internal_reference?: string | null
          is_minor?: boolean
          is_minor_override?: boolean | null
          is_vip?: boolean
          marketing_opt_in?: boolean
          name: string
          needs_attention?: boolean
          notes?: string | null
          observacoes_gerais?: string | null
          phone?: string | null
          preferences_notes?: string | null
          profissao?: string | null
          public_first_name?: string | null
          public_last_name?: string | null
          public_name?: string | null
          short_name?: string | null
          system_name?: string | null
          tenant_id: string
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
          anamnese_form_answered_at?: string | null
          anamnese_form_sent_at?: string | null
          anamnese_form_status?: string | null
          anamnese_url?: string | null
          archived_at?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          client_code?: string | null
          clinical_history?: string | null
          como_conheceu?: string | null
          contraindications?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco_completo?: string | null
          guardian_cpf?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          health_tags?: string[] | null
          id?: string
          initials?: string | null
          internal_reference?: string | null
          is_minor?: boolean
          is_minor_override?: boolean | null
          is_vip?: boolean
          marketing_opt_in?: boolean
          name?: string
          needs_attention?: boolean
          notes?: string | null
          observacoes_gerais?: string | null
          phone?: string | null
          preferences_notes?: string | null
          profissao?: string | null
          public_first_name?: string | null
          public_last_name?: string | null
          public_name?: string | null
          short_name?: string | null
          system_name?: string | null
          tenant_id?: string
          updated_at?: string
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
      dashboard_access_users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_login_at: string | null
          linked_at: string | null
          role: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          linked_at?: string | null
          role?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          linked_at?: string | null
          role?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_access_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_dead_letter_queue: {
        Row: {
          correlation_id: string
          error_message: string | null
          event_id: string
          event_type: string
          failed_attempts: number
          first_failed_at: string
          id: string
          metadata: Json
          moved_at: string
          outbox_id: string | null
          payload: Json
          resolution_note: string | null
          resolved_at: string | null
          tenant_id: string
        }
        Insert: {
          correlation_id: string
          error_message?: string | null
          event_id: string
          event_type: string
          failed_attempts?: number
          first_failed_at?: string
          id?: string
          metadata?: Json
          moved_at?: string
          outbox_id?: string | null
          payload?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          tenant_id: string
        }
        Update: {
          correlation_id?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          failed_attempts?: number
          first_failed_at?: string
          id?: string
          metadata?: Json
          moved_at?: string
          outbox_id?: string | null
          payload?: Json
          resolution_note?: string | null
          resolved_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_dead_letter_queue_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "notification_event_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_dead_letter_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_dispatch_logs: {
        Row: {
          attempt: number
          channel: string
          correlation_id: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          outbox_id: string | null
          response_payload: Json | null
          status: string
          target: string | null
          tenant_id: string
        }
        Insert: {
          attempt?: number
          channel: string
          correlation_id: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          outbox_id?: string | null
          response_payload?: Json | null
          status: string
          target?: string | null
          tenant_id: string
        }
        Update: {
          attempt?: number
          channel?: string
          correlation_id?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          outbox_id?: string | null
          response_payload?: Json | null
          status?: string
          target?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_dispatch_logs_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "notification_event_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_dispatch_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_event_outbox: {
        Row: {
          attempts: number
          available_at: string
          correlation_id: string
          created_at: string
          event_id: string
          event_type: string
          event_version: number
          id: string
          idempotency_key: string
          last_error: string | null
          last_error_at: string | null
          payload: Json
          processed_at: string | null
          processing_status: string
          source_module: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          correlation_id: string
          created_at?: string
          event_id: string
          event_type: string
          event_version?: number
          id?: string
          idempotency_key: string
          last_error?: string | null
          last_error_at?: string | null
          payload?: Json
          processed_at?: string | null
          processing_status?: string
          source_module: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          available_at?: string
          correlation_id?: string
          created_at?: string
          event_id?: string
          event_type?: string
          event_version?: number
          id?: string
          idempotency_key?: string
          last_error?: string | null
          last_error_at?: string | null
          payload?: Json
          processed_at?: string | null
          processing_status?: string
          source_module?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_event_outbox_tenant_id_fkey"
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
          body: string | null
          category: string | null
          channel: string
          created_at: string
          id: string
          language_code: string
          last_synced_at: string | null
          metadata: Json
          name: string
          provider: string
          provider_template_id: string | null
          quality: string | null
          source: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          category?: string | null
          channel: string
          created_at?: string
          id?: string
          language_code?: string
          last_synced_at?: string | null
          metadata?: Json
          name: string
          provider?: string
          provider_template_id?: string | null
          quality?: string | null
          source?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          category?: string | null
          channel?: string
          created_at?: string
          id?: string
          language_code?: string
          last_synced_at?: string | null
          metadata?: Json
          name?: string
          provider?: string
          provider_template_id?: string | null
          quality?: string | null
          source?: string
          status?: string
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
      pix_payment_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_type: string
          key_value: string
          label: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_type: string
          key_value: string
          label?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_type?: string
          key_value?: string
          label?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pix_payment_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      public_booking_identity_lookup_events: {
        Row: {
          actor_key_hash: string
          created_at: string
          details: Json
          event_type: string
          id: string
          phone_hash: string
          phone_last4: string | null
          tenant_id: string
        }
        Insert: {
          actor_key_hash: string
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          phone_hash: string
          phone_last4?: string | null
          tenant_id: string
        }
        Update: {
          actor_key_hash?: string
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          phone_hash?: string
          phone_last4?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_booking_identity_lookup_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      public_booking_identity_lookup_guards: {
        Row: {
          actor_key_hash: string
          attempts_in_cycle: number
          completed_cycles: number
          cooldown_until: string | null
          created_at: string
          hard_block_until: string | null
          id: string
          last_attempt_at: string | null
          last_success_at: string | null
          phone_hash: string
          phone_last4: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actor_key_hash: string
          attempts_in_cycle?: number
          completed_cycles?: number
          cooldown_until?: string | null
          created_at?: string
          hard_block_until?: string | null
          id?: string
          last_attempt_at?: string | null
          last_success_at?: string | null
          phone_hash: string
          phone_last4?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actor_key_hash?: string
          attempts_in_cycle?: number
          completed_cycles?: number
          cooldown_until?: string | null
          created_at?: string
          hard_block_until?: string | null
          id?: string
          last_attempt_at?: string | null
          last_success_at?: string | null
          phone_hash?: string
          phone_last4?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_booking_identity_lookup_guards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_delivery_attempts: {
        Row: {
          attempt: number
          correlation_id: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          next_retry_at: string | null
          outbox_id: string | null
          provider: string
          provider_message_id: string | null
          push_subscription_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
          tenant_id: string
        }
        Insert: {
          attempt?: number
          correlation_id: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          next_retry_at?: string | null
          outbox_id?: string | null
          provider?: string
          provider_message_id?: string | null
          push_subscription_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          tenant_id: string
        }
        Update: {
          attempt?: number
          correlation_id?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          next_retry_at?: string | null
          outbox_id?: string | null
          provider?: string
          provider_message_id?: string | null
          push_subscription_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_delivery_attempts_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "notification_event_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_delivery_attempts_push_subscription_id_fkey"
            columns: ["push_subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_delivery_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          dashboard_access_user_id: string | null
          device_label: string | null
          external_id: string
          id: string
          is_active: boolean
          last_seen_at: string
          metadata: Json
          onesignal_onesignal_id: string | null
          onesignal_subscription_id: string
          platform: string
          tenant_id: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          dashboard_access_user_id?: string | null
          device_label?: string | null
          external_id: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          metadata?: Json
          onesignal_onesignal_id?: string | null
          onesignal_subscription_id: string
          platform?: string
          tenant_id: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          dashboard_access_user_id?: string | null
          device_label?: string | null
          external_id?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          metadata?: Json
          onesignal_onesignal_id?: string | null
          onesignal_subscription_id?: string
          platform?: string
          tenant_id?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_dashboard_access_user_id_fkey"
            columns: ["dashboard_access_user_id"]
            isOneToOne: false
            referencedRelation: "dashboard_access_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
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
          attendance_checklist_enabled: boolean
          attendance_checklist_items: Json
          buffer_after_minutes: number | null
          buffer_before_minutes: number | null
          created_at: string | null
          default_home_buffer: number | null
          default_studio_buffer: number | null
          id: string
          mp_point_enabled: boolean
          mp_point_terminal_external_id: string | null
          mp_point_terminal_id: string | null
          mp_point_terminal_model: string | null
          mp_point_terminal_name: string | null
          public_base_url: string | null
          public_booking_cutoff_before_close_minutes: number | null
          public_booking_last_slot_before_close_minutes: number | null
          signal_percentage: number | null
          spotify_access_token: string | null
          spotify_account_id: string | null
          spotify_account_name: string | null
          spotify_connected_at: string | null
          spotify_enabled: boolean
          spotify_playlist_url: string | null
          spotify_refresh_token: string | null
          spotify_token_expires_at: string | null
          tenant_id: string
          timezone: string
          updated_at: string | null
          whatsapp_automation_enabled: boolean
          whatsapp_notification_number: string | null
          whatsapp_studio_location_line: string | null
          whatsapp_template_created_language: string
          whatsapp_template_created_name: string
          whatsapp_template_reminder_language: string
          whatsapp_template_reminder_name: string
        }
        Insert: {
          attendance_checklist_enabled?: boolean
          attendance_checklist_items?: Json
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          created_at?: string | null
          default_home_buffer?: number | null
          default_studio_buffer?: number | null
          id?: string
          mp_point_enabled?: boolean
          mp_point_terminal_external_id?: string | null
          mp_point_terminal_id?: string | null
          mp_point_terminal_model?: string | null
          mp_point_terminal_name?: string | null
          public_base_url?: string | null
          public_booking_cutoff_before_close_minutes?: number | null
          public_booking_last_slot_before_close_minutes?: number | null
          signal_percentage?: number | null
          spotify_access_token?: string | null
          spotify_account_id?: string | null
          spotify_account_name?: string | null
          spotify_connected_at?: string | null
          spotify_enabled?: boolean
          spotify_playlist_url?: string | null
          spotify_refresh_token?: string | null
          spotify_token_expires_at?: string | null
          tenant_id: string
          timezone?: string
          updated_at?: string | null
          whatsapp_automation_enabled?: boolean
          whatsapp_notification_number?: string | null
          whatsapp_studio_location_line?: string | null
          whatsapp_template_created_language?: string
          whatsapp_template_created_name?: string
          whatsapp_template_reminder_language?: string
          whatsapp_template_reminder_name?: string
        }
        Update: {
          attendance_checklist_enabled?: boolean
          attendance_checklist_items?: Json
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          created_at?: string | null
          default_home_buffer?: number | null
          default_studio_buffer?: number | null
          id?: string
          mp_point_enabled?: boolean
          mp_point_terminal_external_id?: string | null
          mp_point_terminal_id?: string | null
          mp_point_terminal_model?: string | null
          mp_point_terminal_name?: string | null
          public_base_url?: string | null
          public_booking_cutoff_before_close_minutes?: number | null
          public_booking_last_slot_before_close_minutes?: number | null
          signal_percentage?: number | null
          spotify_access_token?: string | null
          spotify_account_id?: string | null
          spotify_account_name?: string | null
          spotify_connected_at?: string | null
          spotify_enabled?: boolean
          spotify_playlist_url?: string | null
          spotify_refresh_token?: string | null
          spotify_token_expires_at?: string | null
          tenant_id?: string
          timezone?: string
          updated_at?: string | null
          whatsapp_automation_enabled?: boolean
          whatsapp_notification_number?: string | null
          whatsapp_studio_location_line?: string | null
          whatsapp_template_created_language?: string
          whatsapp_template_created_name?: string
          whatsapp_template_reminder_language?: string
          whatsapp_template_reminder_name?: string
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
      tenant_branding: {
        Row: {
          accent_color: string | null
          background_color: string | null
          body_font_family: string | null
          created_at: string
          display_name: string
          favicon_url: string | null
          font_strategy: string
          heading_font_family: string | null
          icon_url: string | null
          illustration_style: string
          logo_dark_url: string | null
          logo_horizontal_url: string | null
          logo_light_url: string | null
          logo_url: string | null
          on_primary_color: string | null
          on_surface_color: string | null
          primary_color: string | null
          public_app_name: string
          radius_strategy: string
          secondary_color: string | null
          splash_image_url: string | null
          surface_color: string | null
          surface_style: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          body_font_family?: string | null
          created_at?: string
          display_name: string
          favicon_url?: string | null
          font_strategy?: string
          heading_font_family?: string | null
          icon_url?: string | null
          illustration_style?: string
          logo_dark_url?: string | null
          logo_horizontal_url?: string | null
          logo_light_url?: string | null
          logo_url?: string | null
          on_primary_color?: string | null
          on_surface_color?: string | null
          primary_color?: string | null
          public_app_name: string
          radius_strategy?: string
          secondary_color?: string | null
          splash_image_url?: string | null
          surface_color?: string | null
          surface_style?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          body_font_family?: string | null
          created_at?: string
          display_name?: string
          favicon_url?: string | null
          font_strategy?: string
          heading_font_family?: string | null
          icon_url?: string | null
          illustration_style?: string
          logo_dark_url?: string | null
          logo_horizontal_url?: string | null
          logo_light_url?: string | null
          logo_url?: string | null
          on_primary_color?: string | null
          on_surface_color?: string | null
          primary_color?: string | null
          public_app_name?: string
          radius_strategy?: string
          secondary_color?: string | null
          splash_image_url?: string | null
          surface_color?: string | null
          surface_style?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_configuration_audit_logs: {
        Row: {
          actor_dashboard_access_user_id: string | null
          actor_email: string | null
          after_json: Json | null
          before_json: Json | null
          category: string
          change_summary: string | null
          correlation_id: string | null
          created_at: string
          id: string
          source_module: string | null
          tenant_id: string
        }
        Insert: {
          actor_dashboard_access_user_id?: string | null
          actor_email?: string | null
          after_json?: Json | null
          before_json?: Json | null
          category: string
          change_summary?: string | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          source_module?: string | null
          tenant_id: string
        }
        Update: {
          actor_dashboard_access_user_id?: string | null
          actor_email?: string | null
          after_json?: Json | null
          before_json?: Json | null
          category?: string
          change_summary?: string | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          source_module?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_configuration_audit_lo_actor_dashboard_access_user__fkey"
            columns: ["actor_dashboard_access_user_id"]
            isOneToOne: false
            referencedRelation: "dashboard_access_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_configuration_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          is_active: boolean
          is_primary: boolean
          tenant_id: string
          type: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          tenant_id: string
          type: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          tenant_id?: string
          type?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          metadata: Json
          scope: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          metadata?: Json
          scope?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          metadata?: Json
          scope?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_membership_audit_logs: {
        Row: {
          action: string
          actor_dashboard_access_user_id: string | null
          actor_email: string | null
          created_at: string
          dashboard_access_user_id: string | null
          id: string
          metadata: Json
          new_is_active: boolean | null
          new_role: string | null
          old_is_active: boolean | null
          old_role: string | null
          reason: string | null
          target_email: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_dashboard_access_user_id?: string | null
          actor_email?: string | null
          created_at?: string
          dashboard_access_user_id?: string | null
          id?: string
          metadata?: Json
          new_is_active?: boolean | null
          new_role?: string | null
          old_is_active?: boolean | null
          old_role?: string | null
          reason?: string | null
          target_email?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_dashboard_access_user_id?: string | null
          actor_email?: string | null
          created_at?: string
          dashboard_access_user_id?: string | null
          id?: string
          metadata?: Json
          new_is_active?: boolean | null
          new_role?: string | null
          old_is_active?: boolean | null
          old_role?: string | null
          reason?: string | null
          target_email?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_membership_audit_logs_actor_dashboard_access_user_i_fkey"
            columns: ["actor_dashboard_access_user_id"]
            isOneToOne: false
            referencedRelation: "dashboard_access_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_membership_audit_logs_dashboard_access_user_id_fkey"
            columns: ["dashboard_access_user_id"]
            isOneToOne: false
            referencedRelation: "dashboard_access_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_membership_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_onboarding_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: string | null
          id: string
          notes: string | null
          started_at: string | null
          started_by_email: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          started_by_email?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          started_by_email?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_onboarding_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_onboarding_step_logs: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          notes: string | null
          onboarding_run_id: string
          performed_by_email: string | null
          status: string
          step_key: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          onboarding_run_id: string
          performed_by_email?: string | null
          status?: string
          step_key: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          onboarding_run_id?: string
          performed_by_email?: string | null
          status?: string
          step_key?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_onboarding_step_logs_onboarding_run_id_fkey"
            columns: ["onboarding_run_id"]
            isOneToOne: false
            referencedRelation: "tenant_onboarding_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_onboarding_step_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_provider_configs: {
        Row: {
          base_url: string | null
          config_version: number
          created_at: string
          credential_mode: string
          enabled: boolean
          environment_mode: string
          fail_safe_enabled: boolean
          id: string
          last_error: string | null
          last_validated_at: string | null
          provider_key: string
          public_config: Json
          secret_config: Json
          sender_identifier: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          config_version?: number
          created_at?: string
          credential_mode?: string
          enabled?: boolean
          environment_mode?: string
          fail_safe_enabled?: boolean
          id?: string
          last_error?: string | null
          last_validated_at?: string | null
          provider_key: string
          public_config?: Json
          secret_config?: Json
          sender_identifier?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          config_version?: number
          created_at?: string
          credential_mode?: string
          enabled?: boolean
          environment_mode?: string
          fail_safe_enabled?: boolean
          id?: string
          last_error?: string | null
          last_validated_at?: string | null
          provider_key?: string
          public_config?: Json
          secret_config?: Json
          sender_identifier?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_provider_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_provider_daily_usage: {
        Row: {
          created_at: string
          currency: string
          estimated_cost_cents: number
          event_count: number
          id: string
          provider_key: string
          tenant_id: string
          total_quantity: number
          updated_at: string
          usage_date: string
        }
        Insert: {
          created_at?: string
          currency?: string
          estimated_cost_cents?: number
          event_count?: number
          id?: string
          provider_key: string
          tenant_id: string
          total_quantity?: number
          updated_at?: string
          usage_date: string
        }
        Update: {
          created_at?: string
          currency?: string
          estimated_cost_cents?: number
          event_count?: number
          id?: string
          provider_key?: string
          tenant_id?: string
          total_quantity?: number
          updated_at?: string
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_provider_daily_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_provider_metering_events: {
        Row: {
          correlation_id: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          metadata: Json
          occurred_at: string
          provider_key: string
          quantity: number
          tenant_id: string
          unit: string
          usage_key: string
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          occurred_at?: string
          provider_key: string
          quantity?: number
          tenant_id: string
          unit?: string
          usage_key: string
        }
        Update: {
          correlation_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          occurred_at?: string
          provider_key?: string
          quantity?: number
          tenant_id?: string
          unit?: string
          usage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_provider_metering_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_provider_monthly_snapshots: {
        Row: {
          closed_at: string | null
          created_at: string
          currency: string
          estimated_cost_cents: number
          final_cost_cents: number | null
          id: string
          included_quantity: number
          overage_quantity: number
          package_quota: number
          period_month: string
          provider_key: string
          status: string
          tenant_id: string
          total_quantity: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          currency?: string
          estimated_cost_cents?: number
          final_cost_cents?: number | null
          id?: string
          included_quantity?: number
          overage_quantity?: number
          package_quota?: number
          period_month: string
          provider_key: string
          status?: string
          tenant_id: string
          total_quantity?: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          currency?: string
          estimated_cost_cents?: number
          final_cost_cents?: number | null
          id?: string
          included_quantity?: number
          overage_quantity?: number
          package_quota?: number
          period_month?: string
          provider_key?: string
          status?: string
          tenant_id?: string
          total_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_provider_monthly_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_provider_usage_profiles: {
        Row: {
          billing_model: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          overage_price_cents: number
          package_price_cents: number
          package_quota: number
          provider_key: string
          reset_cycle: string
          tenant_id: string
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          billing_model?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          overage_price_cents?: number
          package_price_cents?: number
          package_quota?: number
          provider_key: string
          reset_cycle?: string
          tenant_id: string
          unit_price_cents?: number
          updated_at?: string
        }
        Update: {
          billing_model?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          overage_price_cents?: number
          package_price_cents?: number
          package_quota?: number
          provider_key?: string
          reset_cycle?: string
          tenant_id?: string
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_provider_usage_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          base_city: string | null
          base_state: string | null
          created_at: string
          id: string
          legal_name: string
          locale: string
          name: string
          slug: string
          status: string
          support_email: string | null
          support_phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          base_city?: string | null
          base_state?: string | null
          created_at?: string
          id?: string
          legal_name?: string
          locale?: string
          name: string
          slug: string
          status?: string
          support_email?: string | null
          support_phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          base_city?: string | null
          base_state?: string | null
          created_at?: string
          id?: string
          legal_name?: string
          locale?: string
          name?: string
          slug?: string
          status?: string
          support_email?: string | null
          support_phone?: string | null
          timezone?: string
          updated_at?: string
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
          tenant_id: string
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
      user_notification_preferences: {
        Row: {
          channels: Json
          created_at: string
          dashboard_access_user_id: string | null
          enabled: boolean
          event_type: string
          external_id: string
          id: string
          metadata: Json
          quiet_hours: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channels?: Json
          created_at?: string
          dashboard_access_user_id?: string | null
          enabled?: boolean
          event_type: string
          external_id: string
          id?: string
          metadata?: Json
          quiet_hours?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channels?: Json
          created_at?: string
          dashboard_access_user_id?: string | null
          enabled?: boolean
          event_type?: string
          external_id?: string
          id?: string
          metadata?: Json
          quiet_hours?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_dashboard_access_user_id_fkey"
            columns: ["dashboard_access_user_id"]
            isOneToOne: false
            referencedRelation: "dashboard_access_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_environment_channels: {
        Row: {
          allowed_created_template_names: string[]
          allowed_reminder_template_names: string[]
          created_at: string
          default_language_code: string
          enabled: boolean
          environment: string
          force_test_recipient: boolean
          id: string
          metadata: Json
          profile: string
          provider: string
          sender_display_phone: string | null
          sender_phone_number_id: string | null
          tenant_id: string
          test_recipient_e164: string | null
          updated_at: string
        }
        Insert: {
          allowed_created_template_names?: string[]
          allowed_reminder_template_names?: string[]
          created_at?: string
          default_language_code?: string
          enabled?: boolean
          environment: string
          force_test_recipient?: boolean
          id?: string
          metadata?: Json
          profile: string
          provider?: string
          sender_display_phone?: string | null
          sender_phone_number_id?: string | null
          tenant_id: string
          test_recipient_e164?: string | null
          updated_at?: string
        }
        Update: {
          allowed_created_template_names?: string[]
          allowed_reminder_template_names?: string[]
          created_at?: string
          default_language_code?: string
          enabled?: boolean
          environment?: string
          force_test_recipient?: boolean
          id?: string
          metadata?: Json
          profile?: string
          provider?: string
          sender_display_phone?: string | null
          sender_phone_number_id?: string | null
          tenant_id?: string
          test_recipient_e164?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_environment_channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_events: {
        Row: {
          appointment_id: string | null
          created_at: string
          details: Json
          event_timestamp: string | null
          event_type: string
          id: string
          notification_job_id: string | null
          payload: Json
          provider: string
          severity: string
          source_contact: string | null
          source_message_id: string | null
          summary: string
          tenant_id: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          details?: Json
          event_timestamp?: string | null
          event_type: string
          id?: string
          notification_job_id?: string | null
          payload?: Json
          provider?: string
          severity?: string
          source_contact?: string | null
          source_message_id?: string | null
          summary?: string
          tenant_id: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          details?: Json
          event_timestamp?: string | null
          event_type?: string
          id?: string
          notification_job_id?: string | null
          payload?: Json
          provider?: string
          severity?: string
          source_contact?: string | null
          source_message_id?: string | null
          summary?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_webhook_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_webhook_events_notification_job_id_fkey"
            columns: ["notification_job_id"]
            isOneToOne: false
            referencedRelation: "notification_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_webhook_events_tenant_id_fkey"
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
      activate_pix_payment_key: {
        Args: { p_key_id: string; p_tenant_id: string }
        Returns: undefined
      }
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
          p_address_label?: string
          p_address_logradouro?: string
          p_address_numero?: string
          p_client_address_id?: string
          p_client_id?: string
          p_displacement_distance_km?: number
          p_displacement_fee?: number
          p_internal_notes?: string
          p_price_override?: number
          p_start_time: string
          p_tenant_id: string
          service_id: string
        }
        Returns: string
      }
      create_public_appointment:
        | {
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
              p_displacement_distance_km?: number
              p_displacement_fee?: number
              p_start_time: string
              service_id: string
              tenant_slug: string
            }
            Returns: string
          }
        | {
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
              p_client_email: string
              p_displacement_distance_km?: number
              p_displacement_fee?: number
              p_start_time: string
              service_id: string
              tenant_slug: string
            }
            Returns: string
          }
      generate_next_client_code: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      normalize_phone_digits: { Args: { value: string }; Returns: string }
      remove_pix_payment_key_and_rebalance: {
        Args: { p_key_id: string; p_tenant_id: string }
        Returns: {
          deleted_was_active: boolean
          next_active_key_id: string
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

