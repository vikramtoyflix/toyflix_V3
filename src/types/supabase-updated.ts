export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          action_details: Json
          admin_user_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          resource_id: string
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          action_details?: Json
          admin_user_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          resource_id: string
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          action_details?: Json
          admin_user_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          resource_id?: string
          resource_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "admin_audit_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "admin_audit_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "admin_audit_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "admin_audit_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "admin_audit_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "admin_audit_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "admin_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "admin_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "admin_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "admin_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "admin_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "admin_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_requests: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          request_type: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          request_type: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          request_type?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          created_at: string
          id: string
          is_encrypted: boolean | null
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_encrypted?: boolean | null
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_encrypted?: boolean | null
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_users_view: {
        Row: {
          address_line1: string | null
          city: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          last_name: string | null
          phone: string
          role: Database["public"]["Enums"]["app_role"]
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          created_at: string
          email?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          phone: string
          role?: Database["public"]["Enums"]["app_role"]
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          phone?: string
          role?: Database["public"]["Enums"]["app_role"]
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      billing_adjustments: {
        Row: {
          amount: number
          created_at: string | null
          effective_date: string
          id: string
          notes: string | null
          performed_by: string
          processed: boolean | null
          processed_at: string | null
          reason: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          effective_date: string
          id?: string
          notes?: string | null
          performed_by: string
          processed?: boolean | null
          processed_at?: string | null
          reason: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          effective_date?: string
          id?: string
          notes?: string | null
          performed_by?: string
          processed?: boolean | null
          processed_at?: string | null
          reason?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "billing_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "billing_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "billing_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "billing_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "billing_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "billing_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      billing_records: {
        Row: {
          amount: number
          billing_date: string
          created_at: string
          gst: number
          id: string
          payment_id: string | null
          period_end: string
          period_start: string
          status: string
          subscription_id: string
          total_amount: number
          user_id: string
        }
        Insert: {
          amount: number
          billing_date?: string
          created_at?: string
          gst: number
          id?: string
          payment_id?: string | null
          period_end: string
          period_start: string
          status?: string
          subscription_id: string
          total_amount: number
          user_id: string
        }
        Update: {
          amount?: number
          billing_date?: string
          created_at?: string
          gst?: number
          id?: string
          payment_id?: string | null
          period_end?: string
          period_start?: string
          status?: string
          subscription_id?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_current_cycle"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "billing_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_expiration_status"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "billing_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_start_date_comparison"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "billing_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_upcoming_cycles"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "billing_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_offer_assignments: {
        Row: {
          assigned_at: string | null
          campaign_id: string
          id: string
          offer_id: string
        }
        Insert: {
          assigned_at?: string | null
          campaign_id: string
          id?: string
          offer_id: string
        }
        Update: {
          assigned_at?: string | null
          campaign_id?: string
          id?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_offer_assignments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promotional_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_offer_assignments_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "promotional_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      carousel_slides: {
        Row: {
          button_link: string
          button_text: string
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          button_link: string
          button_text: string
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          subtitle: string
          title: string
          updated_at?: string
        }
        Update: {
          button_link?: string
          button_text?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_users: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          phone_verified: boolean | null
          pickup_day: string | null
          role: Database["public"]["Enums"]["app_role"]
          state: string | null
          subscription_active: boolean | null
          subscription_end_date: string | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          phone_verified?: boolean | null
          pickup_day?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          state?: string | null
          subscription_active?: boolean | null
          subscription_end_date?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          phone_verified?: boolean | null
          pickup_day?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          state?: string | null
          subscription_active?: boolean | null
          subscription_end_date?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      custom_users_phone_backup: {
        Row: {
          created_at: string | null
          id: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      custom_users_phone_backup_2025_07_05_02_08_38: {
        Row: {
          id: string | null
          new_phone: string | null
          phone: string | null
        }
        Insert: {
          id?: string | null
          new_phone?: string | null
          phone?: string | null
        }
        Update: {
          id?: string | null
          new_phone?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      customer_drops: {
        Row: {
          age_group: string | null
          browser: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          drop_reason: string | null
          drop_step: string
          flow_type: string
          id: string
          interactions_count: number | null
          os: string | null
          plan_id: string | null
          referrer: string | null
          selected_toys_count: number | null
          session_id: string
          time_on_page_seconds: number | null
          total_amount: number | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          age_group?: string | null
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          drop_reason?: string | null
          drop_step: string
          flow_type: string
          id?: string
          interactions_count?: number | null
          os?: string | null
          plan_id?: string | null
          referrer?: string | null
          selected_toys_count?: number | null
          session_id: string
          time_on_page_seconds?: number | null
          total_amount?: number | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          age_group?: string | null
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          drop_reason?: string | null
          drop_step?: string
          flow_type?: string
          id?: string
          interactions_count?: number | null
          os?: string | null
          plan_id?: string | null
          referrer?: string | null
          selected_toys_count?: number | null
          session_id?: string
          time_on_page_seconds?: number | null
          total_amount?: number | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_drops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_drops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_drops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_drops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "customer_drops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_drops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "customer_drops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "customer_drops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      customer_uuid_mapping: {
        Row: {
          created_at: string | null
          current_user_uuid: string | null
          email_matched: string | null
          id: string
          match_confidence: string | null
          match_type: string | null
          migration_customer_id: string | null
          notes: string | null
          phone_normalized: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_user_uuid?: string | null
          email_matched?: string | null
          id?: string
          match_confidence?: string | null
          match_type?: string | null
          migration_customer_id?: string | null
          notes?: string | null
          phone_normalized?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_user_uuid?: string | null
          email_matched?: string | null
          id?: string
          match_confidence?: string | null
          match_type?: string | null
          migration_customer_id?: string | null
          notes?: string | null
          phone_normalized?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      drop_reasons: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: number
          reason_code: string
          reason_name: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: number
          reason_code: string
          reason_name: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: number
          reason_code?: string
          reason_name?: string
        }
        Relationships: []
      }
      drop_steps: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          is_critical: boolean | null
          step_name: string
          step_order: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_critical?: boolean | null
          step_name: string
          step_order: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_critical?: boolean | null
          step_name?: string
          step_order?: number
        }
        Relationships: []
      }
      entitlements_tracking: {
        Row: {
          created_at: string | null
          current_cycle_toys: Json | null
          id: string
          next_billing_date: string | null
          selection_window_active: boolean | null
          subscription_tracking_id: string | null
          synced_to_main: boolean | null
          toys_in_possession: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_cycle_toys?: Json | null
          id?: string
          next_billing_date?: string | null
          selection_window_active?: boolean | null
          subscription_tracking_id?: string | null
          synced_to_main?: boolean | null
          toys_in_possession?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_cycle_toys?: Json | null
          id?: string
          next_billing_date?: string | null
          selection_window_active?: boolean | null
          subscription_tracking_id?: string | null
          synced_to_main?: boolean | null
          toys_in_possession?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_tracking_subscription_tracking_id_fkey"
            columns: ["subscription_tracking_id"]
            isOneToOne: false
            referencedRelation: "subscription_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_alerts: {
        Row: {
          alert_severity: string
          alert_type: string
          archived_at: string | null
          created_at: string | null
          current_value: number | null
          id: string
          message: string
          reference_id: string | null
          reference_type: string | null
          resolved_at: string | null
          threshold_value: number | null
          toy_id: string | null
          updated_at: string | null
        }
        Insert: {
          alert_severity?: string
          alert_type: string
          archived_at?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          message: string
          reference_id?: string | null
          reference_type?: string | null
          resolved_at?: string | null
          threshold_value?: number | null
          toy_id?: string | null
          updated_at?: string | null
        }
        Update: {
          alert_severity?: string
          alert_type?: string
          archived_at?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          resolved_at?: string | null
          threshold_value?: number | null
          toy_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "inventory_alerts_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "inventory_alerts_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
          toy_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
          toy_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
          toy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "inventory_movements_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "inventory_movements_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      jwt_secrets: {
        Row: {
          algorithm: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_id: string
          secret_key: string
        }
        Insert: {
          algorithm?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_id: string
          secret_key: string
        }
        Update: {
          algorithm?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_id?: string
          secret_key?: string
        }
        Relationships: []
      }
      migration_customer_addresses: {
        Row: {
          address_type: string | null
          city: string | null
          created_at: string | null
          current_user_uuid: string | null
          full_address: string | null
          id: string
          is_primary: boolean | null
          landmark: string | null
          migration_customer_id: string | null
          pincode: string | null
          state: string | null
        }
        Insert: {
          address_type?: string | null
          city?: string | null
          created_at?: string | null
          current_user_uuid?: string | null
          full_address?: string | null
          id?: string
          is_primary?: boolean | null
          landmark?: string | null
          migration_customer_id?: string | null
          pincode?: string | null
          state?: string | null
        }
        Update: {
          address_type?: string | null
          city?: string | null
          created_at?: string | null
          current_user_uuid?: string | null
          full_address?: string | null
          id?: string
          is_primary?: boolean | null
          landmark?: string | null
          migration_customer_id?: string | null
          pincode?: string | null
          state?: string | null
        }
        Relationships: []
      }
      migration_customer_profiles: {
        Row: {
          average_order_value: number | null
          created_at: string | null
          customer_tier: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          last_name: string | null
          migration_customer_id: string
          phone: string | null
          phone_normalized: string | null
          phone_verified: boolean | null
          preferences: Json | null
          primary_child_age_group: string | null
          role: string | null
          total_lifetime_value: number | null
          total_orders: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          average_order_value?: number | null
          created_at?: string | null
          customer_tier?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          migration_customer_id: string
          phone?: string | null
          phone_normalized?: string | null
          phone_verified?: boolean | null
          preferences?: Json | null
          primary_child_age_group?: string | null
          role?: string | null
          total_lifetime_value?: number | null
          total_orders?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          average_order_value?: number | null
          created_at?: string | null
          customer_tier?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          migration_customer_id?: string
          phone?: string | null
          phone_normalized?: string | null
          phone_verified?: boolean | null
          preferences?: Json | null
          primary_child_age_group?: string | null
          role?: string | null
          total_lifetime_value?: number | null
          total_orders?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      migration_log: {
        Row: {
          applied_at: string | null
          description: string | null
          id: number
          migration_name: string
        }
        Insert: {
          applied_at?: string | null
          description?: string | null
          id?: number
          migration_name: string
        }
        Update: {
          applied_at?: string | null
          description?: string | null
          id?: number
          migration_name?: string
        }
        Relationships: []
      }
      migration_order_items: {
        Row: {
          age_group: string | null
          category: string | null
          created_at: string | null
          id: string
          migration_order_id: string | null
          order_csv_id: string | null
          product_name: string | null
          product_sku: string | null
          quantity: number | null
          rental_duration_days: number | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          age_group?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          migration_order_id?: string | null
          order_csv_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          quantity?: number | null
          rental_duration_days?: number | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          age_group?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          migration_order_id?: string | null
          order_csv_id?: string | null
          product_name?: string | null
          product_sku?: string | null
          quantity?: number | null
          rental_duration_days?: number | null
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: []
      }
      migration_orders: {
        Row: {
          created_at: string | null
          currency: string | null
          current_user_uuid: string | null
          customer_age_group: string | null
          delivered_at: string | null
          id: string
          migration_customer_id: string | null
          migration_order_id: string
          order_date: string | null
          payment_method: string | null
          payment_status: string | null
          rental_end_date: string | null
          rental_start_date: string | null
          returned_at: string | null
          shipping_address: Json | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          current_user_uuid?: string | null
          customer_age_group?: string | null
          delivered_at?: string | null
          id?: string
          migration_customer_id?: string | null
          migration_order_id: string
          order_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          rental_end_date?: string | null
          rental_start_date?: string | null
          returned_at?: string | null
          shipping_address?: Json | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          current_user_uuid?: string | null
          customer_age_group?: string | null
          delivered_at?: string | null
          id?: string
          migration_customer_id?: string | null
          migration_order_id?: string
          order_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          rental_end_date?: string | null
          rental_start_date?: string | null
          returned_at?: string | null
          shipping_address?: Json | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migration_products: {
        Row: {
          age_group: string | null
          brand: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          migration_product_id: string
          name: string | null
          rental_price: number | null
          sku: string | null
        }
        Insert: {
          age_group?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          migration_product_id: string
          name?: string | null
          rental_price?: number | null
          sku?: string | null
        }
        Update: {
          age_group?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          migration_product_id?: string
          name?: string | null
          rental_price?: number | null
          sku?: string | null
        }
        Relationships: []
      }
      next_cycle_queue: {
        Row: {
          created_at: string | null
          current_order_id: string
          id: string
          processed_at: string | null
          queue_created_at: string | null
          queued_toys: Json
          shipping_address: Json | null
          special_instructions: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_order_id: string
          id?: string
          processed_at?: string | null
          queue_created_at?: string | null
          queued_toys: Json
          shipping_address?: Json | null
          special_instructions?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_order_id?: string
          id?: string
          processed_at?: string | null
          queue_created_at?: string | null
          queued_toys?: Json
          shipping_address?: Json | null
          special_instructions?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "next_cycle_queue_current_order_id_fkey"
            columns: ["current_order_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "next_cycle_queue_current_order_id_fkey"
            columns: ["current_order_id"]
            isOneToOne: false
            referencedRelation: "rental_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "next_cycle_queue_current_order_id_fkey"
            columns: ["current_order_id"]
            isOneToOne: false
            referencedRelation: "rental_orders_with_cycle_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "next_cycle_queue_current_order_id_fkey"
            columns: ["current_order_id"]
            isOneToOne: false
            referencedRelation: "selection_window_dashboard"
            referencedColumns: ["rental_order_id"]
          },
          {
            foreignKeyName: "next_cycle_queue_current_order_id_fkey"
            columns: ["current_order_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["active_subscription_id"]
          },
          {
            foreignKeyName: "next_cycle_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "next_cycle_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "next_cycle_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "next_cycle_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "next_cycle_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "next_cycle_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "next_cycle_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "next_cycle_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      offer_categories: {
        Row: {
          color_code: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          color_code?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          color_code?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      offer_category_assignments: {
        Row: {
          assigned_at: string | null
          category_id: string
          id: string
          offer_id: string
        }
        Insert: {
          assigned_at?: string | null
          category_id: string
          id?: string
          offer_id: string
        }
        Update: {
          assigned_at?: string | null
          category_id?: string
          id?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "offer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_category_assignments_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "promotional_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_redemption_rules: {
        Row: {
          created_at: string | null
          id: string
          offer_id: string
          rule_type: string
          rule_value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          offer_id: string
          rule_type: string
          rule_value: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          offer_id?: string
          rule_type?: string
          rule_value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "offer_redemption_rules_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "promotional_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          template_data: Json
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_data: Json
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "offer_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "offer_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "offer_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "offer_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "offer_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "offer_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "offer_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      offer_usage_history: {
        Row: {
          discount_amount: number
          final_amount: number
          id: string
          ip_address: unknown | null
          offer_id: string
          order_id: string | null
          original_amount: number
          used_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          discount_amount: number
          final_amount: number
          id?: string
          ip_address?: unknown | null
          offer_id: string
          order_id?: string | null
          original_amount: number
          used_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          discount_amount?: number
          final_amount?: number
          id?: string
          ip_address?: unknown | null
          offer_id?: string
          order_id?: string | null
          original_amount?: number
          used_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_usage_history_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "promotional_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_usage_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "offer_usage_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "offer_usage_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_usage_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "offer_usage_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "offer_usage_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "offer_usage_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "offer_usage_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      order_items: {
        Row: {
          age_group: string | null
          created_at: string | null
          id: string
          order_id: string
          quantity: number | null
          rental_price: number | null
          ride_on_toy_id: string | null
          subscription_category: string | null
          total_price: number | null
          toy_id: string
          unit_price: number | null
        }
        Insert: {
          age_group?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          quantity?: number | null
          rental_price?: number | null
          ride_on_toy_id?: string | null
          subscription_category?: string | null
          total_price?: number | null
          toy_id: string
          unit_price?: number | null
        }
        Update: {
          age_group?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          quantity?: number | null
          rental_price?: number | null
          ride_on_toy_id?: string | null
          subscription_category?: string | null
          total_price?: number | null
          toy_id?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_orders_summary"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_ride_on_toy_id_fkey"
            columns: ["ride_on_toy_id"]
            isOneToOne: false
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "order_items_ride_on_toy_id_fkey"
            columns: ["ride_on_toy_id"]
            isOneToOne: false
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "order_items_ride_on_toy_id_fkey"
            columns: ["ride_on_toy_id"]
            isOneToOne: false
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "order_items_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "order_items_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          base_amount: number
          created_at: string | null
          discount_amount: number
          gst_amount: number
          id: string
          order_type: string | null
          rental_end_date: string | null
          rental_start_date: string | null
          returned_date: string | null
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_amount?: number
          created_at?: string | null
          discount_amount?: number
          gst_amount?: number
          id?: string
          order_type?: string | null
          rental_end_date?: string | null
          rental_start_date?: string | null
          returned_date?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_amount?: number
          created_at?: string | null
          discount_amount?: number
          gst_amount?: number
          id?: string
          order_type?: string | null
          rental_end_date?: string | null
          rental_start_date?: string | null
          returned_date?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      otp_verifications: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_verified: boolean | null
          otp_code: string
          phone_number: string
          provider: string | null
          provider_message_id: string | null
          session_id: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_verified?: boolean | null
          otp_code: string
          phone_number: string
          provider?: string | null
          provider_message_id?: string | null
          session_id?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_verified?: boolean | null
          otp_code?: string
          phone_number?: string
          provider?: string | null
          provider_message_id?: string | null
          session_id?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      pause_records: {
        Row: {
          created_at: string
          id: string
          months_paused: number
          pause_end_date: string | null
          pause_start_date: string
          reason: string | null
          subscription_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          months_paused: number
          pause_end_date?: string | null
          pause_start_date?: string
          reason?: string | null
          subscription_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          months_paused?: number
          pause_end_date?: string | null
          pause_start_date?: string
          reason?: string | null
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pause_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_current_cycle"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "pause_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_expiration_status"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "pause_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_start_date_comparison"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "pause_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_upcoming_cycles"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "pause_records_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_orders: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          order_items: Json | null
          order_type: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          order_items?: Json | null
          order_type: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          order_items?: Json | null
          order_type?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payment_tracking: {
        Row: {
          amount: number
          base_amount: number | null
          created_at: string | null
          currency: string | null
          gst_amount: number | null
          id: string
          order_items: Json | null
          order_type: string
          razorpay_order_id: string
          razorpay_payment_id: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
          user_email: string | null
          user_id: string
          user_phone: string | null
        }
        Insert: {
          amount: number
          base_amount?: number | null
          created_at?: string | null
          currency?: string | null
          gst_amount?: number | null
          id?: string
          order_items?: Json | null
          order_type: string
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_email?: string | null
          user_id: string
          user_phone?: string | null
        }
        Update: {
          amount?: number
          base_amount?: number | null
          created_at?: string | null
          currency?: string | null
          gst_amount?: number | null
          id?: string
          order_items?: Json | null
          order_type?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string
          user_phone?: string | null
        }
        Relationships: []
      }
      perk_assignments: {
        Row: {
          assigned_date: string
          created_at: string
          delivered_date: string | null
          id: string
          perk_type: string
          status: string
          subscription_id: string
          toy_id: string | null
          user_id: string
        }
        Insert: {
          assigned_date?: string
          created_at?: string
          delivered_date?: string | null
          id?: string
          perk_type: string
          status?: string
          subscription_id: string
          toy_id?: string | null
          user_id: string
        }
        Update: {
          assigned_date?: string
          created_at?: string
          delivered_date?: string | null
          id?: string
          perk_type?: string
          status?: string
          subscription_id?: string
          toy_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perk_assignments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_current_cycle"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "perk_assignments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_expiration_status"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "perk_assignments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_start_date_comparison"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "perk_assignments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_upcoming_cycles"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "perk_assignments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_format_backup: {
        Row: {
          backup_timestamp: string | null
          first_name: string | null
          last_name: string | null
          original_custom_users_phone: string | null
          original_rental_orders_phone: string | null
          rental_order_count: number | null
          user_id: string | null
        }
        Insert: {
          backup_timestamp?: string | null
          first_name?: string | null
          last_name?: string | null
          original_custom_users_phone?: string | null
          original_rental_orders_phone?: string | null
          rental_order_count?: number | null
          user_id?: string | null
        }
        Update: {
          backup_timestamp?: string | null
          first_name?: string | null
          last_name?: string | null
          original_custom_users_phone?: string | null
          original_rental_orders_phone?: string | null
          rental_order_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      pickup_routes: {
        Row: {
          actual_duration_minutes: number | null
          assigned_driver_id: string | null
          assigned_driver_name: string | null
          covered_pincodes: string[] | null
          covered_zones: string | null
          created_at: string
          created_by: string | null
          customer_satisfaction_score: number | null
          estimated_duration_minutes: number | null
          id: string
          notes: string | null
          optimized_order: Json | null
          pickup_date: string
          pickup_day: string
          route_end_time: string | null
          route_name: string
          route_start_time: string | null
          route_status: string | null
          success_rate: number | null
          total_completed_pickups: number | null
          total_distance_km: number | null
          total_failed_pickups: number | null
          total_fuel_cost: number | null
          total_planned_pickups: number | null
          updated_at: string
          updated_by: string | null
          vehicle_number: string | null
        }
        Insert: {
          actual_duration_minutes?: number | null
          assigned_driver_id?: string | null
          assigned_driver_name?: string | null
          covered_pincodes?: string[] | null
          covered_zones?: string | null
          created_at?: string
          created_by?: string | null
          customer_satisfaction_score?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          notes?: string | null
          optimized_order?: Json | null
          pickup_date: string
          pickup_day: string
          route_end_time?: string | null
          route_name: string
          route_start_time?: string | null
          route_status?: string | null
          success_rate?: number | null
          total_completed_pickups?: number | null
          total_distance_km?: number | null
          total_failed_pickups?: number | null
          total_fuel_cost?: number | null
          total_planned_pickups?: number | null
          updated_at?: string
          updated_by?: string | null
          vehicle_number?: string | null
        }
        Update: {
          actual_duration_minutes?: number | null
          assigned_driver_id?: string | null
          assigned_driver_name?: string | null
          covered_pincodes?: string[] | null
          covered_zones?: string | null
          created_at?: string
          created_by?: string | null
          customer_satisfaction_score?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          notes?: string | null
          optimized_order?: Json | null
          pickup_date?: string
          pickup_day?: string
          route_end_time?: string | null
          route_name?: string
          route_start_time?: string | null
          route_status?: string | null
          success_rate?: number | null
          total_completed_pickups?: number | null
          total_distance_km?: number | null
          total_failed_pickups?: number | null
          total_fuel_cost?: number | null
          total_planned_pickups?: number | null
          updated_at?: string
          updated_by?: string | null
          vehicle_number?: string | null
        }
        Relationships: []
      }
      pickup_system_config: {
        Row: {
          config_key: string
          config_type: string | null
          config_value: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_type?: string | null
          config_value?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_type?: string | null
          config_value?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      pincode_pickup_schedule: {
        Row: {
          area_name: string | null
          created_at: string
          created_by: string | null
          current_capacity_used: number | null
          delivery_day: string
          estimated_travel_time_minutes: number | null
          id: string
          is_active: boolean | null
          max_pickups_per_day: number | null
          min_pickups_per_day: number | null
          notes: string | null
          pickup_day: string
          pickup_window_end: string | null
          pickup_window_start: string | null
          pincode: string
          priority_level: number | null
          updated_at: string
          updated_by: string | null
          zone: string | null
        }
        Insert: {
          area_name?: string | null
          created_at?: string
          created_by?: string | null
          current_capacity_used?: number | null
          delivery_day: string
          estimated_travel_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          max_pickups_per_day?: number | null
          min_pickups_per_day?: number | null
          notes?: string | null
          pickup_day: string
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          pincode: string
          priority_level?: number | null
          updated_at?: string
          updated_by?: string | null
          zone?: string | null
        }
        Update: {
          area_name?: string | null
          created_at?: string
          created_by?: string | null
          current_capacity_used?: number | null
          delivery_day?: string
          estimated_travel_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          max_pickups_per_day?: number | null
          min_pickups_per_day?: number | null
          notes?: string | null
          pickup_day?: string
          pickup_window_end?: string | null
          pickup_window_start?: string | null
          pincode?: string
          priority_level?: number | null
          updated_at?: string
          updated_by?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      promotional_campaigns: {
        Row: {
          budget_limit: number | null
          campaign_type: string
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          spent_amount: number | null
          start_date: string
          target_audience: Json | null
          updated_at: string | null
        }
        Insert: {
          budget_limit?: number | null
          campaign_type: string
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          spent_amount?: number | null
          start_date: string
          target_audience?: Json | null
          updated_at?: string | null
        }
        Update: {
          budget_limit?: number | null
          campaign_type?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          spent_amount?: number | null
          start_date?: string
          target_audience?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotional_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "promotional_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "promotional_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "promotional_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "promotional_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "promotional_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "promotional_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      promotional_offers: {
        Row: {
          auto_apply: boolean | null
          code: string
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string
          first_time_users_only: boolean | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_value: number | null
          name: string
          stackable: boolean | null
          start_date: string
          target_plans: string[] | null
          type: string
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          value: number
        }
        Insert: {
          auto_apply?: boolean | null
          code: string
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date: string
          first_time_users_only?: boolean | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_value?: number | null
          name: string
          stackable?: boolean | null
          start_date: string
          target_plans?: string[] | null
          type: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          value: number
        }
        Update: {
          auto_apply?: boolean | null
          code?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string
          first_time_users_only?: boolean | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_value?: number | null
          name?: string
          stackable?: boolean | null
          start_date?: string
          target_plans?: string[] | null
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotional_offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "promotional_offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "promotional_offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "promotional_offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "promotional_offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "promotional_offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "promotional_offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          total_cost: number | null
          toy_id: string
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          purchase_order_id: string
          quantity: number
          received_quantity?: number | null
          total_cost?: number | null
          toy_id: string
          unit_cost: number
        }
        Update: {
          created_at?: string | null
          id?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          total_cost?: number | null
          toy_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "purchase_order_items_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "purchase_order_items_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          created_at: string | null
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_number: string
          status: string | null
          supplier_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          status?: string | null
          supplier_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          status?: string | null
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_orders: {
        Row: {
          actual_delivery_date: string | null
          age_group: string | null
          applied_coupon: string | null
          base_amount: number
          coupon_discount: number
          created_at: string
          created_by: string | null
          current_plan_id: string | null
          cycle_based_delivery_date: string | null
          delivery_address: Json
          delivery_instructions: string | null
          estimated_delivery_date: string | null
          gst_amount: number
          id: string
          notes: string | null
          order_number: string | null
          original_subscription_id: string | null
          payment_id: string | null
          payment_status: string | null
          processed_at: string | null
          queue_cycle_number: number | null
          queue_order_type: string | null
          razorpay_order_id: string | null
          selected_toys: Json
          status: string | null
          subscription_aligned: boolean | null
          subscription_cycle_id: string | null
          subscription_cycle_number: number | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_delivery_date?: string | null
          age_group?: string | null
          applied_coupon?: string | null
          base_amount?: number
          coupon_discount?: number
          created_at?: string
          created_by?: string | null
          current_plan_id?: string | null
          cycle_based_delivery_date?: string | null
          delivery_address?: Json
          delivery_instructions?: string | null
          estimated_delivery_date?: string | null
          gst_amount?: number
          id?: string
          notes?: string | null
          order_number?: string | null
          original_subscription_id?: string | null
          payment_id?: string | null
          payment_status?: string | null
          processed_at?: string | null
          queue_cycle_number?: number | null
          queue_order_type?: string | null
          razorpay_order_id?: string | null
          selected_toys?: Json
          status?: string | null
          subscription_aligned?: boolean | null
          subscription_cycle_id?: string | null
          subscription_cycle_number?: number | null
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_delivery_date?: string | null
          age_group?: string | null
          applied_coupon?: string | null
          base_amount?: number
          coupon_discount?: number
          created_at?: string
          created_by?: string | null
          current_plan_id?: string | null
          cycle_based_delivery_date?: string | null
          delivery_address?: Json
          delivery_instructions?: string | null
          estimated_delivery_date?: string | null
          gst_amount?: number
          id?: string
          notes?: string | null
          order_number?: string | null
          original_subscription_id?: string | null
          payment_id?: string | null
          payment_status?: string | null
          processed_at?: string | null
          queue_cycle_number?: number | null
          queue_order_type?: string | null
          razorpay_order_id?: string | null
          selected_toys?: Json
          status?: string | null
          subscription_aligned?: boolean | null
          subscription_cycle_id?: string | null
          subscription_cycle_number?: number | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "queue_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "queue_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "queue_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "queue_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "queue_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "queue_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "queue_orders_original_subscription_id_fkey"
            columns: ["original_subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_current_cycle"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "queue_orders_original_subscription_id_fkey"
            columns: ["original_subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_expiration_status"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "queue_orders_original_subscription_id_fkey"
            columns: ["original_subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_start_date_comparison"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "queue_orders_original_subscription_id_fkey"
            columns: ["original_subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_upcoming_cycles"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "queue_orders_original_subscription_id_fkey"
            columns: ["original_subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_orders_subscription_cycle_id_fkey"
            columns: ["subscription_cycle_id"]
            isOneToOne: false
            referencedRelation: "subscription_cycle_history"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "queue_orders_subscription_cycle_id_fkey"
            columns: ["subscription_cycle_id"]
            isOneToOne: false
            referencedRelation: "subscription_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "queue_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "queue_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "queue_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "queue_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "queue_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "queue_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rental_orders: {
        Row: {
          admin_notes: string | null
          age_group: string | null
          base_amount: number | null
          cancelled_at: string | null
          confirmed_at: string | null
          coupon_code: string | null
          created_at: string | null
          created_by: string | null
          customer_pickup_day: string | null
          cycle_number: number
          damage_details: Json | null
          damage_reported: boolean | null
          delivered_at: string | null
          delivery_date: string | null
          delivery_instructions: string | null
          discount_amount: number | null
          dispatch_tracking_number: string | null
          feedback: string | null
          gst_amount: number | null
          id: string
          internal_status: string | null
          legacy_created_at: string | null
          legacy_order_id: string | null
          manual_selection_control: boolean | null
          migrated_at: string | null
          next_cycle_address: Json | null
          next_cycle_prepared: boolean | null
          next_cycle_toys_selected: Json | null
          order_number: string
          order_type: string
          payment_amount: number | null
          payment_currency: string | null
          payment_method: string | null
          payment_status: string | null
          pickup_cycle_day: number | null
          pickup_instructions: string | null
          pickup_notification_date: string | null
          pickup_notification_sent: boolean | null
          pickup_scheduled_date: string | null
          pickup_status: string | null
          quality_rating: number | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          rental_end_date: string
          rental_start_date: string
          return_status: string | null
          return_tracking_number: string | null
          returned_date: string | null
          scheduled_pickup_id: string | null
          selection_window_auto_close_date: string | null
          selection_window_closed_at: string | null
          selection_window_notes: string | null
          selection_window_opened_at: string | null
          selection_window_status: string | null
          shipped_at: string | null
          shipping_address: Json
          status: string
          subscription_category: string | null
          subscription_id: string | null
          subscription_plan: string | null
          subscription_status: string | null
          total_amount: number
          toys_data: Json
          toys_delivered_count: number | null
          toys_returned_count: number | null
          updated_at: string | null
          updated_by: string | null
          user_id: string
          user_phone: string | null
        }
        Insert: {
          admin_notes?: string | null
          age_group?: string | null
          base_amount?: number | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          coupon_code?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_pickup_day?: string | null
          cycle_number?: number
          damage_details?: Json | null
          damage_reported?: boolean | null
          delivered_at?: string | null
          delivery_date?: string | null
          delivery_instructions?: string | null
          discount_amount?: number | null
          dispatch_tracking_number?: string | null
          feedback?: string | null
          gst_amount?: number | null
          id?: string
          internal_status?: string | null
          legacy_created_at?: string | null
          legacy_order_id?: string | null
          manual_selection_control?: boolean | null
          migrated_at?: string | null
          next_cycle_address?: Json | null
          next_cycle_prepared?: boolean | null
          next_cycle_toys_selected?: Json | null
          order_number?: string
          order_type?: string
          payment_amount?: number | null
          payment_currency?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_cycle_day?: number | null
          pickup_instructions?: string | null
          pickup_notification_date?: string | null
          pickup_notification_sent?: boolean | null
          pickup_scheduled_date?: string | null
          pickup_status?: string | null
          quality_rating?: number | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          rental_end_date: string
          rental_start_date: string
          return_status?: string | null
          return_tracking_number?: string | null
          returned_date?: string | null
          scheduled_pickup_id?: string | null
          selection_window_auto_close_date?: string | null
          selection_window_closed_at?: string | null
          selection_window_notes?: string | null
          selection_window_opened_at?: string | null
          selection_window_status?: string | null
          shipped_at?: string | null
          shipping_address?: Json
          status?: string
          subscription_category?: string | null
          subscription_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          total_amount?: number
          toys_data?: Json
          toys_delivered_count?: number | null
          toys_returned_count?: number | null
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
          user_phone?: string | null
        }
        Update: {
          admin_notes?: string | null
          age_group?: string | null
          base_amount?: number | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          coupon_code?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_pickup_day?: string | null
          cycle_number?: number
          damage_details?: Json | null
          damage_reported?: boolean | null
          delivered_at?: string | null
          delivery_date?: string | null
          delivery_instructions?: string | null
          discount_amount?: number | null
          dispatch_tracking_number?: string | null
          feedback?: string | null
          gst_amount?: number | null
          id?: string
          internal_status?: string | null
          legacy_created_at?: string | null
          legacy_order_id?: string | null
          manual_selection_control?: boolean | null
          migrated_at?: string | null
          next_cycle_address?: Json | null
          next_cycle_prepared?: boolean | null
          next_cycle_toys_selected?: Json | null
          order_number?: string
          order_type?: string
          payment_amount?: number | null
          payment_currency?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_cycle_day?: number | null
          pickup_instructions?: string | null
          pickup_notification_date?: string | null
          pickup_notification_sent?: boolean | null
          pickup_scheduled_date?: string | null
          pickup_status?: string | null
          quality_rating?: number | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          rental_end_date?: string
          rental_start_date?: string
          return_status?: string | null
          return_tracking_number?: string | null
          returned_date?: string | null
          scheduled_pickup_id?: string | null
          selection_window_auto_close_date?: string | null
          selection_window_closed_at?: string | null
          selection_window_notes?: string | null
          selection_window_opened_at?: string | null
          selection_window_status?: string | null
          shipped_at?: string | null
          shipping_address?: Json
          status?: string
          subscription_category?: string | null
          subscription_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          total_amount?: number
          toys_data?: Json
          toys_delivered_count?: number | null
          toys_returned_count?: number | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rental_orders_scheduled_pickup_id_fkey"
            columns: ["scheduled_pickup_id"]
            isOneToOne: false
            referencedRelation: "scheduled_pickups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_current_cycle"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "rental_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_expiration_status"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "rental_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_start_date_comparison"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "rental_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_upcoming_cycles"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "rental_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      rental_orders_phone_backup: {
        Row: {
          created_at: string | null
          id: string | null
          user_phone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          user_phone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      rental_orders_phone_backup_2025_07_05_02_08_38: {
        Row: {
          id: string | null
          new_phone: string | null
          user_phone: string | null
        }
        Insert: {
          id?: string | null
          new_phone?: string | null
          user_phone?: string | null
        }
        Update: {
          id?: string | null
          new_phone?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          order_id: string | null
          rating: number | null
          toy_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          rating?: number | null
          toy_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          rating?: number | null
          toy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_orders_summary"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "reviews_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "reviews_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_pickups: {
        Row: {
          actual_pickup_date: string | null
          actual_pickup_time: string | null
          created_at: string
          created_by: string | null
          customer_address: Json | null
          customer_feedback: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_satisfaction: number | null
          customer_was_present: boolean | null
          cycle_end_date: string | null
          cycle_number: number | null
          days_advance_notice: number | null
          days_into_cycle: number | null
          estimated_pickup_value: number | null
          id: string
          notification_sent_date: string | null
          original_scheduled_date: string | null
          pickup_day: string
          pickup_notes: string | null
          pickup_route_id: string | null
          pickup_status: string | null
          pincode: string
          reminder_sent: boolean | null
          rental_order_id: string | null
          reschedule_count: number | null
          reschedule_reason: string | null
          scheduled_pickup_date: string
          scheduled_pickup_time_end: string | null
          scheduled_pickup_time_start: string | null
          subscription_id: string | null
          toys_actually_collected: Json | null
          toys_collected_count: number | null
          toys_count: number | null
          toys_damaged_count: number | null
          toys_missing_count: number | null
          toys_to_pickup: Json | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          actual_pickup_date?: string | null
          actual_pickup_time?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: Json | null
          customer_feedback?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_satisfaction?: number | null
          customer_was_present?: boolean | null
          cycle_end_date?: string | null
          cycle_number?: number | null
          days_advance_notice?: number | null
          days_into_cycle?: number | null
          estimated_pickup_value?: number | null
          id?: string
          notification_sent_date?: string | null
          original_scheduled_date?: string | null
          pickup_day: string
          pickup_notes?: string | null
          pickup_route_id?: string | null
          pickup_status?: string | null
          pincode: string
          reminder_sent?: boolean | null
          rental_order_id?: string | null
          reschedule_count?: number | null
          reschedule_reason?: string | null
          scheduled_pickup_date: string
          scheduled_pickup_time_end?: string | null
          scheduled_pickup_time_start?: string | null
          subscription_id?: string | null
          toys_actually_collected?: Json | null
          toys_collected_count?: number | null
          toys_count?: number | null
          toys_damaged_count?: number | null
          toys_missing_count?: number | null
          toys_to_pickup?: Json | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          actual_pickup_date?: string | null
          actual_pickup_time?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: Json | null
          customer_feedback?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_satisfaction?: number | null
          customer_was_present?: boolean | null
          cycle_end_date?: string | null
          cycle_number?: number | null
          days_advance_notice?: number | null
          days_into_cycle?: number | null
          estimated_pickup_value?: number | null
          id?: string
          notification_sent_date?: string | null
          original_scheduled_date?: string | null
          pickup_day?: string
          pickup_notes?: string | null
          pickup_route_id?: string | null
          pickup_status?: string | null
          pincode?: string
          reminder_sent?: boolean | null
          rental_order_id?: string | null
          reschedule_count?: number | null
          reschedule_reason?: string | null
          scheduled_pickup_date?: string
          scheduled_pickup_time_end?: string | null
          scheduled_pickup_time_start?: string | null
          subscription_id?: string | null
          toys_actually_collected?: Json | null
          toys_collected_count?: number | null
          toys_count?: number | null
          toys_damaged_count?: number | null
          toys_missing_count?: number | null
          toys_to_pickup?: Json | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_pickups_pickup_route_id_fkey"
            columns: ["pickup_route_id"]
            isOneToOne: false
            referencedRelation: "daily_pickup_schedule"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "scheduled_pickups_pickup_route_id_fkey"
            columns: ["pickup_route_id"]
            isOneToOne: false
            referencedRelation: "pickup_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_pickups_rental_order_id_fkey"
            columns: ["rental_order_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "scheduled_pickups_rental_order_id_fkey"
            columns: ["rental_order_id"]
            isOneToOne: false
            referencedRelation: "rental_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_pickups_rental_order_id_fkey"
            columns: ["rental_order_id"]
            isOneToOne: false
            referencedRelation: "rental_orders_with_cycle_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_pickups_rental_order_id_fkey"
            columns: ["rental_order_id"]
            isOneToOne: false
            referencedRelation: "selection_window_dashboard"
            referencedColumns: ["rental_order_id"]
          },
          {
            foreignKeyName: "scheduled_pickups_rental_order_id_fkey"
            columns: ["rental_order_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["active_subscription_id"]
          },
          {
            foreignKeyName: "scheduled_pickups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "scheduled_pickups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "scheduled_pickups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_pickups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "scheduled_pickups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "scheduled_pickups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "scheduled_pickups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "scheduled_pickups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stock_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          current_quantity: number
          id: string
          is_resolved: boolean | null
          notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          threshold_quantity: number
          toy_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          current_quantity: number
          id?: string
          is_resolved?: boolean | null
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          threshold_quantity: number
          toy_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          current_quantity?: number
          id?: string
          is_resolved?: boolean | null
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          threshold_quantity?: number
          toy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "stock_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "stock_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "stock_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "stock_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "stock_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "stock_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stock_alerts_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "stock_alerts_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "stock_alerts_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          last_payment_date: string | null
          payment_status: string | null
          razorpay_customer_id: string | null
          razorpay_subscription_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_payment_date?: string | null
          payment_status?: string | null
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_payment_date?: string | null
          payment_status?: string | null
          razorpay_customer_id?: string | null
          razorpay_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_actions: {
        Row: {
          action_data: Json
          action_type: string
          amount_change: number | null
          created_at: string | null
          effective_date: string
          id: string
          notes: string | null
          performed_at: string | null
          performed_by: string
          subscription_id: string
        }
        Insert: {
          action_data: Json
          action_type: string
          amount_change?: number | null
          created_at?: string | null
          effective_date: string
          id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by: string
          subscription_id: string
        }
        Update: {
          action_data?: Json
          action_type?: string
          amount_change?: number | null
          created_at?: string | null
          effective_date?: string
          id?: string
          notes?: string | null
          performed_at?: string | null
          performed_by?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_actions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_cycles: {
        Row: {
          billing_amount: number | null
          billing_cycle_id: string | null
          billing_status: string | null
          completed_at: string | null
          created_at: string
          cycle_end_date: string
          cycle_number: number
          cycle_start_date: string
          cycle_status: string | null
          delivery_actual_date: string | null
          delivery_address: Json | null
          delivery_scheduled_date: string | null
          delivery_status: string | null
          id: string
          plan_details: Json | null
          plan_id_at_cycle: string
          selected_toys: Json | null
          selection_closed_at: string | null
          selection_opened_at: string | null
          selection_window_end: string
          selection_window_start: string
          subscription_id: string
          total_toy_value: number | null
          toys_count: number | null
          toys_selected_at: string | null
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_amount?: number | null
          billing_cycle_id?: string | null
          billing_status?: string | null
          completed_at?: string | null
          created_at?: string
          cycle_end_date: string
          cycle_number: number
          cycle_start_date: string
          cycle_status?: string | null
          delivery_actual_date?: string | null
          delivery_address?: Json | null
          delivery_scheduled_date?: string | null
          delivery_status?: string | null
          id?: string
          plan_details?: Json | null
          plan_id_at_cycle: string
          selected_toys?: Json | null
          selection_closed_at?: string | null
          selection_opened_at?: string | null
          selection_window_end: string
          selection_window_start: string
          subscription_id: string
          total_toy_value?: number | null
          toys_count?: number | null
          toys_selected_at?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_amount?: number | null
          billing_cycle_id?: string | null
          billing_status?: string | null
          completed_at?: string | null
          created_at?: string
          cycle_end_date?: string
          cycle_number?: number
          cycle_start_date?: string
          cycle_status?: string | null
          delivery_actual_date?: string | null
          delivery_address?: Json | null
          delivery_scheduled_date?: string | null
          delivery_status?: string | null
          id?: string
          plan_details?: Json | null
          plan_id_at_cycle?: string
          selected_toys?: Json | null
          selection_closed_at?: string | null
          selection_opened_at?: string | null
          selection_window_end?: string
          selection_window_start?: string
          subscription_id?: string
          total_toy_value?: number | null
          toys_count?: number | null
          toys_selected_at?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_current_cycle"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_expiration_status"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_start_date_comparison"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_upcoming_cycles"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_extensions: {
        Row: {
          created_at: string | null
          days_added: number
          extension_type: string
          id: string
          new_end_date: string
          original_end_date: string
          performed_at: string | null
          performed_by: string
          reason: string
          subscription_id: string
        }
        Insert: {
          created_at?: string | null
          days_added: number
          extension_type: string
          id?: string
          new_end_date: string
          original_end_date: string
          performed_at?: string | null
          performed_by: string
          reason: string
          subscription_id: string
        }
        Update: {
          created_at?: string | null
          days_added?: number
          extension_type?: string
          id?: string
          new_end_date?: string
          original_end_date?: string
          performed_at?: string | null
          performed_by?: string
          reason?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_extensions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          change_reason: string | null
          created_at: string | null
          effective_date: string
          id: string
          new_amount: number
          new_plan_type: string
          performed_by: string
          previous_amount: number
          previous_plan_type: string
          prorated_amount: number
          subscription_id: string
        }
        Insert: {
          change_reason?: string | null
          created_at?: string | null
          effective_date: string
          id?: string
          new_amount: number
          new_plan_type: string
          performed_by: string
          previous_amount: number
          previous_plan_type: string
          prorated_amount: number
          subscription_id: string
        }
        Update: {
          change_reason?: string | null
          created_at?: string | null
          effective_date?: string
          id?: string
          new_amount?: number
          new_plan_type?: string
          performed_by?: string
          previous_amount?: number
          previous_plan_type?: string
          prorated_amount?: number
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_management: {
        Row: {
          admin_notes: string | null
          created_at: string
          created_by: string | null
          cycle_end_date: string
          cycle_id: string
          cycle_number: number
          cycle_start_date: string
          cycle_status: string | null
          delivery_actual_date: string | null
          delivery_address: Json | null
          delivery_scheduled_date: string | null
          delivery_status: string | null
          id: string
          last_modified_by: string | null
          manual_override: boolean | null
          order_id: string
          plan_details: Json | null
          plan_id: string
          plan_name: string
          selected_toys: Json | null
          selection_window_end: string
          selection_window_start: string
          selection_window_status: string | null
          subscription_id: string
          total_toy_value: number | null
          toys_count: number | null
          toys_selected_at: string | null
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          created_by?: string | null
          cycle_end_date: string
          cycle_id?: string
          cycle_number: number
          cycle_start_date: string
          cycle_status?: string | null
          delivery_actual_date?: string | null
          delivery_address?: Json | null
          delivery_scheduled_date?: string | null
          delivery_status?: string | null
          id?: string
          last_modified_by?: string | null
          manual_override?: boolean | null
          order_id: string
          plan_details?: Json | null
          plan_id: string
          plan_name: string
          selected_toys?: Json | null
          selection_window_end: string
          selection_window_start: string
          selection_window_status?: string | null
          subscription_id: string
          total_toy_value?: number | null
          toys_count?: number | null
          toys_selected_at?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          created_by?: string | null
          cycle_end_date?: string
          cycle_id?: string
          cycle_number?: number
          cycle_start_date?: string
          cycle_status?: string | null
          delivery_actual_date?: string | null
          delivery_address?: Json | null
          delivery_scheduled_date?: string | null
          delivery_status?: string | null
          id?: string
          last_modified_by?: string | null
          manual_override?: boolean | null
          order_id?: string
          plan_details?: Json | null
          plan_id?: string
          plan_name?: string
          selected_toys?: Json | null
          selection_window_end?: string
          selection_window_start?: string
          selection_window_status?: string | null
          subscription_id?: string
          total_toy_value?: number | null
          toys_count?: number | null
          toys_selected_at?: string | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_management_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_management_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_management_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_management_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_management_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_management_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_management_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_management_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscription_management_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_management_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_management_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_management_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_management_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_management_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_management_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_management_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscription_management_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "subscription_management_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "rental_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_management_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "rental_orders_with_cycle_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_management_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "selection_window_dashboard"
            referencedColumns: ["rental_order_id"]
          },
          {
            foreignKeyName: "subscription_management_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["active_subscription_id"]
          },
          {
            foreignKeyName: "subscription_management_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_management_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_management_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_management_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_management_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_management_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_management_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_management_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_pauses: {
        Row: {
          created_at: string | null
          id: string
          pause_days: number
          pause_end: string | null
          pause_start: string
          performed_by: string
          reason: string | null
          resumed_at: string | null
          resumed_by: string | null
          subscription_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pause_days: number
          pause_end?: string | null
          pause_start: string
          performed_by: string
          reason?: string | null
          resumed_at?: string | null
          resumed_by?: string | null
          subscription_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pause_days?: number
          pause_end?: string | null
          pause_start?: string
          performed_by?: string
          reason?: string | null
          resumed_at?: string | null
          resumed_by?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_pauses_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean | null
          created_at: string | null
          features: Json | null
          max_extensions: number
          max_toys: number
          plan_type: string
          price: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          features?: Json | null
          max_extensions: number
          max_toys: number
          plan_type: string
          price: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          features?: Json | null
          max_extensions?: number
          max_toys?: number
          plan_type?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_toy_selections: {
        Row: {
          created_at: string
          cycle_month: string
          id: string
          selected_at: string | null
          selection_step: number
          status: string
          subscription_id: string
          toy_id: string | null
          toy_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cycle_month: string
          id?: string
          selected_at?: string | null
          selection_step?: number
          status?: string
          subscription_id: string
          toy_id?: string | null
          toy_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cycle_month?: string
          id?: string
          selected_at?: string | null
          selection_step?: number
          status?: string
          subscription_id?: string
          toy_id?: string | null
          toy_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_tracking: {
        Row: {
          age_group: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          delivery_instructions: string | null
          end_date: string | null
          id: string
          order_items: Json | null
          payment_amount: number | null
          payment_currency: string | null
          payment_status: string | null
          plan_id: string
          razorpay_order_id: string
          razorpay_payment_id: string
          ride_on_toy_id: string | null
          selected_toys: Json | null
          shipping_address: Json | null
          start_date: string | null
          status: string | null
          subscription_type: string | null
          synced_to_main: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          age_group?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          delivery_instructions?: string | null
          end_date?: string | null
          id?: string
          order_items?: Json | null
          payment_amount?: number | null
          payment_currency?: string | null
          payment_status?: string | null
          plan_id: string
          razorpay_order_id: string
          razorpay_payment_id: string
          ride_on_toy_id?: string | null
          selected_toys?: Json | null
          shipping_address?: Json | null
          start_date?: string | null
          status?: string | null
          subscription_type?: string | null
          synced_to_main?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          age_group?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          delivery_instructions?: string | null
          end_date?: string | null
          id?: string
          order_items?: Json | null
          payment_amount?: number | null
          payment_currency?: string | null
          payment_status?: string | null
          plan_id?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string
          ride_on_toy_id?: string | null
          selected_toys?: Json | null
          shipping_address?: Json | null
          start_date?: string | null
          status?: string | null
          subscription_type?: string | null
          synced_to_main?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          age_group: string | null
          auto_renew: boolean
          created_at: string
          current_cycle_end: string | null
          current_cycle_start: string | null
          current_cycle_status: string | null
          current_period_end: string
          current_period_start: string
          current_selection_step: number | null
          cycle_end_date: string | null
          cycle_number: number | null
          cycle_start_date: string | null
          cycle_status: Database["public"]["Enums"]["cycle_status_enum"] | null
          end_date: string
          id: string
          last_selection_date: string | null
          next_selection_window_end: string | null
          next_selection_window_start: string | null
          pause_balance: number
          plan_id: string
          start_date: string
          status: string
          subscription_start_date: string | null
          total_cycles_completed: number | null
          toys_delivered_date: string | null
          toys_return_due_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_group?: string | null
          auto_renew?: boolean
          created_at?: string
          current_cycle_end?: string | null
          current_cycle_start?: string | null
          current_cycle_status?: string | null
          current_period_end: string
          current_period_start?: string
          current_selection_step?: number | null
          cycle_end_date?: string | null
          cycle_number?: number | null
          cycle_start_date?: string | null
          cycle_status?: Database["public"]["Enums"]["cycle_status_enum"] | null
          end_date: string
          id?: string
          last_selection_date?: string | null
          next_selection_window_end?: string | null
          next_selection_window_start?: string | null
          pause_balance?: number
          plan_id: string
          start_date?: string
          status?: string
          subscription_start_date?: string | null
          total_cycles_completed?: number | null
          toys_delivered_date?: string | null
          toys_return_due_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_group?: string | null
          auto_renew?: boolean
          created_at?: string
          current_cycle_end?: string | null
          current_cycle_start?: string | null
          current_cycle_status?: string | null
          current_period_end?: string
          current_period_start?: string
          current_selection_step?: number | null
          cycle_end_date?: string | null
          cycle_number?: number | null
          cycle_start_date?: string | null
          cycle_status?: Database["public"]["Enums"]["cycle_status_enum"] | null
          end_date?: string
          id?: string
          last_selection_date?: string | null
          next_selection_window_end?: string | null
          next_selection_window_start?: string | null
          pause_balance?: number
          plan_id?: string
          start_date?: string
          status?: string
          subscription_start_date?: string | null
          total_cycles_completed?: number | null
          toys_delivered_date?: string | null
          toys_return_due_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: Json | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          minimum_order_value: number | null
          name: string
          phone: string | null
          reliability_score: number | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          minimum_order_value?: number | null
          name: string
          phone?: string | null
          reliability_score?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          minimum_order_value?: number | null
          name?: string
          phone?: string | null
          reliability_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      toy_images: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          image_url: string
          is_primary: boolean
          toy_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          id?: string
          image_url: string
          is_primary?: boolean
          toy_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          toy_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toy_images_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "toy_images_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "toy_images_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      toy_inventory: {
        Row: {
          available_quantity: number
          created_at: string | null
          id: string
          rented_quantity: number
          reorder_level: number | null
          total_quantity: number
          toy_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          available_quantity?: number
          created_at?: string | null
          id?: string
          rented_quantity?: number
          reorder_level?: number | null
          total_quantity?: number
          toy_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          available_quantity?: number
          created_at?: string | null
          id?: string
          rented_quantity?: number
          reorder_level?: number | null
          total_quantity?: number
          toy_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toy_inventory_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: true
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "toy_inventory_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: true
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "toy_inventory_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: true
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      toys: {
        Row: {
          age_range: string
          available_quantity: number | null
          barcode: string | null
          brand: string | null
          category: Database["public"]["Enums"]["toy_category"]
          condition_rating: number | null
          created_at: string | null
          description: string | null
          dimensions_cm: string | null
          display_order: number
          id: string
          image_url: string | null
          internal_notes: string | null
          inventory_status: string | null
          is_featured: boolean
          last_maintenance_date: string | null
          last_restocked_date: string | null
          maintenance_required: boolean | null
          max_age: number | null
          min_age: number | null
          name: string
          pack: string | null
          purchase_cost: number | null
          rating: number | null
          rental_price: number | null
          reorder_level: number | null
          reorder_quantity: number | null
          retail_price: number | null
          seasonal_availability: Json | null
          show_strikethrough_pricing: boolean
          sku: string | null
          subscription_category:
            | Database["public"]["Enums"]["subscription_category"]
            | null
          supplier_id: string | null
          total_quantity: number | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          age_range: string
          available_quantity?: number | null
          barcode?: string | null
          brand?: string | null
          category: Database["public"]["Enums"]["toy_category"]
          condition_rating?: number | null
          created_at?: string | null
          description?: string | null
          dimensions_cm?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          internal_notes?: string | null
          inventory_status?: string | null
          is_featured?: boolean
          last_maintenance_date?: string | null
          last_restocked_date?: string | null
          maintenance_required?: boolean | null
          max_age?: number | null
          min_age?: number | null
          name: string
          pack?: string | null
          purchase_cost?: number | null
          rating?: number | null
          rental_price?: number | null
          reorder_level?: number | null
          reorder_quantity?: number | null
          retail_price?: number | null
          seasonal_availability?: Json | null
          show_strikethrough_pricing?: boolean
          sku?: string | null
          subscription_category?:
            | Database["public"]["Enums"]["subscription_category"]
            | null
          supplier_id?: string | null
          total_quantity?: number | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          age_range?: string
          available_quantity?: number | null
          barcode?: string | null
          brand?: string | null
          category?: Database["public"]["Enums"]["toy_category"]
          condition_rating?: number | null
          created_at?: string | null
          description?: string | null
          dimensions_cm?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          internal_notes?: string | null
          inventory_status?: string | null
          is_featured?: boolean
          last_maintenance_date?: string | null
          last_restocked_date?: string | null
          maintenance_required?: boolean | null
          max_age?: number | null
          min_age?: number | null
          name?: string
          pack?: string | null
          purchase_cost?: number | null
          rating?: number | null
          rental_price?: number | null
          reorder_level?: number | null
          reorder_quantity?: number | null
          retail_price?: number | null
          seasonal_availability?: Json | null
          show_strikethrough_pricing?: boolean
          sku?: string | null
          subscription_category?:
            | Database["public"]["Enums"]["subscription_category"]
            | null
          supplier_id?: string | null
          total_quantity?: number | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_toys_supplier"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      toys_1_2_years: {
        Row: {
          age_range: string | null
          available_quantity: number | null
          brand: string | null
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          name: string
          original_toy_id: string | null
          rental_price: number | null
          retail_price: number | null
          total_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          age_range?: string | null
          available_quantity?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          name: string
          original_toy_id?: string | null
          rental_price?: number | null
          retail_price?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          age_range?: string | null
          available_quantity?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          name?: string
          original_toy_id?: string | null
          rental_price?: number | null
          retail_price?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toys_1_2_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "toys_1_2_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "toys_1_2_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      toys_2_3_years: {
        Row: {
          age_range: string | null
          available_quantity: number | null
          brand: string | null
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          name: string
          original_toy_id: string | null
          rental_price: number | null
          retail_price: number | null
          total_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          age_range?: string | null
          available_quantity?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          name: string
          original_toy_id?: string | null
          rental_price?: number | null
          retail_price?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          age_range?: string | null
          available_quantity?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          name?: string
          original_toy_id?: string | null
          rental_price?: number | null
          retail_price?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toys_2_3_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "toys_2_3_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "toys_2_3_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      toys_3_4_years: {
        Row: {
          age_range: string | null
          available_quantity: number | null
          brand: string | null
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          name: string
          original_toy_id: string | null
          rental_price: number | null
          retail_price: number | null
          total_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          age_range?: string | null
          available_quantity?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          name: string
          original_toy_id?: string | null
          rental_price?: number | null
          retail_price?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          age_range?: string | null
          available_quantity?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          name?: string
          original_toy_id?: string | null
          rental_price?: number | null
          retail_price?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toys_3_4_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "toys_3_4_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "toys_3_4_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      toys_4_6_years: {
        Row: {
          age_range: string | null
          available_quantity: number | null
          brand: string | null
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          name: string
          original_toy_id: string | null
          rental_price: number | null
          retail_price: number | null
          total_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          age_range?: string | null
          available_quantity?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          name: string
          original_toy_id?: string | null
          rental_price?: number | null
          retail_price?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          age_range?: string | null
          available_quantity?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          name?: string
          original_toy_id?: string | null
          rental_price?: number | null
          retail_price?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toys_4_6_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "toys_4_6_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "toys_4_6_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      toys_6_8_years: {
        Row: {
          age_range: string | null
          available_quantity: number | null
          brand: string | null
          category: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          name: string
          original_toy_id: string | null
          rental_price: number | null
          retail_price: number | null
          total_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          age_range?: string | null
          available_quantity?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          name: string
          original_toy_id?: string | null
          rental_price?: number | null
          retail_price?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          age_range?: string | null
          available_quantity?: number | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          name?: string
          original_toy_id?: string | null
          rental_price?: number | null
          retail_price?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toys_6_8_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "toys_6_8_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "toys_6_8_years_original_toy_id_fkey"
            columns: ["original_toy_id"]
            isOneToOne: true
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      user_entitlements: {
        Row: {
          big_toys_remaining: number
          books_remaining: number
          coupe_ride_delivered: boolean
          created_at: string
          current_cycle_toys: Json | null
          current_month: string
          early_access: boolean
          id: string
          next_billing_date: string
          premium_toys_remaining: number | null
          reservation_enabled: boolean
          roller_coaster_delivered: boolean
          selection_window_active: boolean | null
          standard_toys_remaining: number
          subscription_id: string
          toys_in_possession: boolean | null
          updated_at: string
          user_id: string
          value_cap_remaining: number
        }
        Insert: {
          big_toys_remaining?: number
          books_remaining?: number
          coupe_ride_delivered?: boolean
          created_at?: string
          current_cycle_toys?: Json | null
          current_month?: string
          early_access?: boolean
          id?: string
          next_billing_date: string
          premium_toys_remaining?: number | null
          reservation_enabled?: boolean
          roller_coaster_delivered?: boolean
          selection_window_active?: boolean | null
          standard_toys_remaining?: number
          subscription_id: string
          toys_in_possession?: boolean | null
          updated_at?: string
          user_id: string
          value_cap_remaining?: number
        }
        Update: {
          big_toys_remaining?: number
          books_remaining?: number
          coupe_ride_delivered?: boolean
          created_at?: string
          current_cycle_toys?: Json | null
          current_month?: string
          early_access?: boolean
          id?: string
          next_billing_date?: string
          premium_toys_remaining?: number | null
          reservation_enabled?: boolean
          roller_coaster_delivered?: boolean
          selection_window_active?: boolean | null
          standard_toys_remaining?: number
          subscription_id?: string
          toys_in_possession?: boolean | null
          updated_at?: string
          user_id?: string
          value_cap_remaining?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_entitlements_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_current_cycle"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "user_entitlements_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_expiration_status"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "user_entitlements_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_start_date_comparison"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "user_entitlements_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_upcoming_cycles"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "user_entitlements_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_journey_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          page_url: string | null
          session_id: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          page_url?: string | null
          session_id: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          page_url?: string | null
          session_id?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_journey_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_journey_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_journey_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journey_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_journey_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_journey_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_journey_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_journey_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_lifecycle_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: unknown | null
          new_state: Json | null
          notes: string | null
          performed_by: string | null
          previous_state: Json | null
          reason: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          new_state?: Json | null
          notes?: string | null
          performed_by?: string | null
          previous_state?: Json | null
          reason?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          new_state?: Json | null
          notes?: string | null
          performed_by?: string | null
          previous_state?: Json | null
          reason?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lifecycle_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_lifecycle_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_lifecycle_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lifecycle_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_lifecycle_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_lifecycle_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_lifecycle_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_lifecycle_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_lifecycle_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_lifecycle_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_lifecycle_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lifecycle_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_lifecycle_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_lifecycle_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_lifecycle_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_lifecycle_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_offer_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string
          expires_at: string | null
          id: string
          is_used: boolean | null
          notes: string | null
          offer_id: string
          order_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by: string
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          notes?: string | null
          offer_id: string
          order_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          notes?: string | null
          offer_id?: string
          order_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_offer_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_offer_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_offer_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_offer_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_offer_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_offer_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_offer_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_offer_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_offer_assignments_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "promotional_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_offer_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_offer_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_offer_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_offer_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_offer_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_offer_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_offer_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_offer_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_permission_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_system_role: boolean | null
          name: string
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name: string
          permissions?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          name?: string
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_permission_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_permission_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_permission_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_permission_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_permission_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_permission_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "user_permission_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          last_used: string | null
          refresh_expires_at: string
          refresh_token: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_used?: string | null
          refresh_expires_at: string
          refresh_token: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_used?: string | null
          refresh_expires_at?: string
          refresh_token?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          auto_renewal: boolean | null
          base_amount: number
          billing_cycle: string
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          discount_amount: number | null
          extension_days: number | null
          extensions_used_this_period: number | null
          free_months_added: number | null
          grace_period_end: string | null
          id: string
          max_extensions_per_period: number | null
          next_billing_date: string | null
          pause_count: number | null
          payment_method: string | null
          plan_type: string
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_renewal?: boolean | null
          base_amount: number
          billing_cycle: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          discount_amount?: number | null
          extension_days?: number | null
          extensions_used_this_period?: number | null
          free_months_added?: number | null
          grace_period_end?: string | null
          id?: string
          max_extensions_per_period?: number | null
          next_billing_date?: string | null
          pause_count?: number | null
          payment_method?: string | null
          plan_type: string
          status: string
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_renewal?: boolean | null
          base_amount?: number
          billing_cycle?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          discount_amount?: number | null
          extension_days?: number | null
          extensions_used_this_period?: number | null
          free_months_added?: number | null
          grace_period_end?: string | null
          id?: string
          max_extensions_per_period?: number | null
          next_billing_date?: string | null
          pause_count?: number | null
          payment_method?: string | null
          plan_type?: string
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      wishlist: {
        Row: {
          created_at: string | null
          id: string
          toy_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          toy_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          toy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "admin_order_items_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "wishlist_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "simple_inventory_view"
            referencedColumns: ["toy_id"]
          },
          {
            foreignKeyName: "wishlist_toy_id_fkey"
            columns: ["toy_id"]
            isOneToOne: false
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_order_details_view: {
        Row: {
          base_amount: number | null
          customer_current_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          customer_email: string | null
          customer_first_name: string | null
          customer_full_name: string | null
          customer_has_active_subscription: boolean | null
          customer_id: string | null
          customer_last_name: string | null
          customer_phone: string | null
          customer_registration_date: string | null
          discount_amount: number | null
          gst_amount: number | null
          items_total_price: number | null
          order_id: string | null
          order_last_updated: string | null
          order_placed_date: string | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          order_type: string | null
          payment_amount: number | null
          payment_created_date: string | null
          payment_currency: string | null
          payment_order_id: string | null
          payment_order_type: string | null
          payment_status: string | null
          payment_updated_date: string | null
          phone_verified: boolean | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          rental_end_date: string | null
          rental_start_date: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_email: string | null
          shipping_first_name: string | null
          shipping_last_name: string | null
          shipping_phone: string | null
          shipping_postcode: string | null
          shipping_state: string | null
          total_amount: number | null
          total_items_count: number | null
          total_quantity: number | null
        }
        Relationships: []
      }
      admin_order_items_view: {
        Row: {
          age_group: string | null
          customer_name: string | null
          customer_phone: string | null
          item_added_date: string | null
          order_date: string | null
          order_id: string | null
          order_item_id: string | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          quantity: number | null
          subscription_category: string | null
          total_price: number | null
          toy_age_group: string | null
          toy_category: Database["public"]["Enums"]["toy_category"] | null
          toy_description: string | null
          toy_id: string | null
          toy_image: string | null
          toy_name: string | null
          toy_price: number | null
          unit_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "admin_orders_summary"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_orders_summary: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          items_count: number | null
          order_id: string | null
          payment_status: string | null
          razorpay_payment_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number | null
          total_quantity: number | null
        }
        Relationships: []
      }
      admin_rental_orders_view: {
        Row: {
          base_amount: number | null
          confirmed_at: string | null
          coupon_code: string | null
          customer_first_name: string | null
          customer_id: string | null
          customer_last_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          delivery_instructions: string | null
          discount_amount: number | null
          dispatch_tracking_number: string | null
          gst_amount: number | null
          order_id: string | null
          order_placed_date: string | null
          order_status: string | null
          order_type: string | null
          payment_status: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          rental_end_date: string | null
          rental_start_date: string | null
          shipped_at: string | null
          shipping_city: string | null
          shipping_first_name: string | null
          total_amount: number | null
          total_items_count: number | null
          toys_data: Json | null
        }
        Relationships: []
      }
      customer_address_view: {
        Row: {
          address_id: string | null
          address_type: string | null
          city: string | null
          created_at: string | null
          full_address: string | null
          is_primary: boolean | null
          landmark: string | null
          pincode: string | null
          source: string | null
          state: string | null
          user_uuid: string | null
        }
        Insert: {
          address_id?: string | null
          address_type?: string | null
          city?: string | null
          created_at?: string | null
          full_address?: string | null
          is_primary?: boolean | null
          landmark?: string | null
          pincode?: string | null
          source?: never
          state?: string | null
          user_uuid?: string | null
        }
        Update: {
          address_id?: string | null
          address_type?: string | null
          city?: string | null
          created_at?: string | null
          full_address?: string | null
          is_primary?: boolean | null
          landmark?: string | null
          pincode?: string | null
          source?: never
          state?: string | null
          user_uuid?: string | null
        }
        Relationships: []
      }
      customer_business_intelligence: {
        Row: {
          average_order_value: number | null
          computed_tier: string | null
          customer_lifecycle_status: string | null
          customer_tenure_days: number | null
          days_since_last_order: number | null
          display_full_name: string | null
          first_order_date: string | null
          last_order_date: string | null
          orders_per_month: number | null
          primary_child_age_group: string | null
          total_order_count: number | null
          total_order_value: number | null
          user_uuid: string | null
        }
        Relationships: []
      }
      customer_comprehensive_dashboard: {
        Row: {
          account_created_date: string | null
          active_in_last_90_days: boolean | null
          auto_renewal: boolean | null
          avg_order_last_90_days: number | null
          calculated_next_pickup: string | null
          current_avg_order_value: number | null
          current_lifetime_value: number | null
          current_orders_count: number | null
          current_subscription_status: string | null
          customer_health_score: string | null
          customer_id: string | null
          data_source: string | null
          days_since_last_order: number | null
          delivery_address: string | null
          email: string | null
          first_current_order_date: string | null
          first_historical_order_date: string | null
          first_name: string | null
          first_order_date: string | null
          has_active_subscription: boolean | null
          has_current_account: boolean | null
          has_historical_data: boolean | null
          historical_avg_order_value: number | null
          historical_lifetime_value: number | null
          historical_orders_count: number | null
          last_current_order_date: string | null
          last_historical_order_date: string | null
          last_name: string | null
          last_order_date: string | null
          next_pickup_date: string | null
          orders_last_90_days: number | null
          overall_avg_order_value: number | null
          phone: string | null
          phone_normalized: string | null
          phone_verified: boolean | null
          pickup_frequency: string | null
          revenue_last_90_days: number | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          subscription_type: string | null
          subscription_value: number | null
          total_lifetime_value: number | null
          total_orders_count: number | null
          value_segment: string | null
        }
        Relationships: []
      }
      customer_order_summary: {
        Row: {
          computed_tier: string | null
          current_order_count: number | null
          current_order_value: number | null
          customer_tier_display: string | null
          display_full_name: string | null
          first_order_date: string | null
          historical_order_count: number | null
          historical_order_value: number | null
          last_order_date: string | null
          lifetime_value_display: number | null
          total_order_count: number | null
          total_order_value: number | null
          user_uuid: string | null
        }
        Relationships: []
      }
      daily_pickup_schedule: {
        Row: {
          assigned_driver_name: string | null
          completed_pickups: number | null
          covered_pincodes: string | null
          failed_pickups: number | null
          pickup_date: string | null
          pickup_day: string | null
          route_id: string | null
          route_name: string | null
          route_status: string | null
          total_pickups: number | null
          total_toys_to_collect: number | null
        }
        Relationships: []
      }
      dashboard_summary_metrics: {
        Row: {
          active_customers_90d: number | null
          active_subscribers: number | null
          at_risk_customers: number | null
          avg_customer_value: number | null
          current_customers: number | null
          current_orders: number | null
          current_revenue: number | null
          customers_with_recent_orders: number | null
          dormant_customers: number | null
          excellent_customers: number | null
          good_customers: number | null
          high_value_customers: number | null
          historical_customers: number | null
          historical_orders: number | null
          historical_revenue: number | null
          low_value_customers: number | null
          medium_value_customers: number | null
          merged_customers: number | null
          regular_customers: number | null
          revenue_last_90_days: number | null
          total_customers: number | null
          total_orders: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      enriched_customer_view: {
        Row: {
          current_first_name: string | null
          current_last_name: string | null
          customer_tier: string | null
          customer_tier_display: string | null
          display_first_name: string | null
          display_full_name: string | null
          display_last_name: string | null
          email: string | null
          has_complete_profile: boolean | null
          has_current_profile: boolean | null
          has_historical_profile: boolean | null
          historical_first_name: string | null
          historical_last_name: string | null
          last_updated: string | null
          lifetime_value_display: number | null
          match_confidence: string | null
          match_notes: string | null
          match_type: string | null
          phone: string | null
          phone_verified: boolean | null
          preferences: Json | null
          primary_child_age_group: string | null
          registration_date: string | null
          total_lifetime_value: number | null
          user_uuid: string | null
        }
        Relationships: []
      }
      inventory_summary: {
        Row: {
          avg_available_per_toy: number | null
          low_stock_count: number | null
          out_of_stock_count: number | null
          total_available: number | null
          total_rented: number | null
          total_toys: number | null
        }
        Relationships: []
      }
      order_items_detail_view: {
        Row: {
          age_group: string | null
          category: string | null
          created_at: string | null
          item_id: string | null
          order_date: string | null
          order_id: string | null
          product_name: string | null
          product_sku: string | null
          quantity: number | null
          rental_duration_days: number | null
          source: string | null
          total_price: number | null
          unit_price: number | null
          user_uuid: string | null
        }
        Relationships: []
      }
      pickup_performance_metrics: {
        Row: {
          avg_customer_satisfaction: number | null
          completed_pickups: number | null
          failed_pickups: number | null
          pickup_day: string | null
          success_rate: number | null
          total_scheduled_pickups: number | null
          total_toys_collected: number | null
        }
        Relationships: []
      }
      rental_orders_with_cycle_info: {
        Row: {
          admin_notes: string | null
          age_group: string | null
          base_amount: number | null
          created_at: string | null
          created_by: string | null
          current_day_in_cycle: number | null
          cycle_number: number | null
          damage_details: Json | null
          damage_reported: boolean | null
          delivery_date: string | null
          delivery_instructions: string | null
          discount_amount: number | null
          dispatch_tracking_number: string | null
          feedback: string | null
          gst_amount: number | null
          id: string | null
          internal_status: string | null
          is_selection_window_active: boolean | null
          legacy_created_at: string | null
          legacy_order_id: string | null
          migrated_at: string | null
          next_cycle_address: Json | null
          next_cycle_prepared: boolean | null
          next_cycle_scheduled_date: string | null
          next_cycle_toys_selected: Json | null
          order_number: string | null
          order_type: string | null
          payment_method: string | null
          payment_status: string | null
          pickup_instructions: string | null
          quality_rating: number | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          rental_end_date: string | null
          rental_start_date: string | null
          return_status: string | null
          return_tracking_number: string | null
          returned_date: string | null
          selection_window_end_date: string | null
          selection_window_start_date: string | null
          shipping_address: Json | null
          status: string | null
          subscription_category: string | null
          subscription_id: string | null
          subscription_plan: string | null
          total_amount: number | null
          toys_at_home_count: number | null
          toys_data: Json | null
          toys_delivered_count: number | null
          toys_returned_count: number | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          age_group?: string | null
          base_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          current_day_in_cycle?: never
          cycle_number?: number | null
          damage_details?: Json | null
          damage_reported?: boolean | null
          delivery_date?: string | null
          delivery_instructions?: string | null
          discount_amount?: number | null
          dispatch_tracking_number?: string | null
          feedback?: string | null
          gst_amount?: number | null
          id?: string | null
          internal_status?: string | null
          is_selection_window_active?: never
          legacy_created_at?: string | null
          legacy_order_id?: string | null
          migrated_at?: string | null
          next_cycle_address?: Json | null
          next_cycle_prepared?: boolean | null
          next_cycle_scheduled_date?: never
          next_cycle_toys_selected?: Json | null
          order_number?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_instructions?: string | null
          quality_rating?: number | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          rental_end_date?: string | null
          rental_start_date?: string | null
          return_status?: string | null
          return_tracking_number?: string | null
          returned_date?: string | null
          selection_window_end_date?: never
          selection_window_start_date?: never
          shipping_address?: Json | null
          status?: string | null
          subscription_category?: string | null
          subscription_id?: string | null
          subscription_plan?: string | null
          total_amount?: number | null
          toys_at_home_count?: never
          toys_data?: Json | null
          toys_delivered_count?: number | null
          toys_returned_count?: number | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          age_group?: string | null
          base_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          current_day_in_cycle?: never
          cycle_number?: number | null
          damage_details?: Json | null
          damage_reported?: boolean | null
          delivery_date?: string | null
          delivery_instructions?: string | null
          discount_amount?: number | null
          dispatch_tracking_number?: string | null
          feedback?: string | null
          gst_amount?: number | null
          id?: string | null
          internal_status?: string | null
          is_selection_window_active?: never
          legacy_created_at?: string | null
          legacy_order_id?: string | null
          migrated_at?: string | null
          next_cycle_address?: Json | null
          next_cycle_prepared?: boolean | null
          next_cycle_scheduled_date?: never
          next_cycle_toys_selected?: Json | null
          order_number?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_instructions?: string | null
          quality_rating?: number | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          rental_end_date?: string | null
          rental_start_date?: string | null
          return_status?: string | null
          return_tracking_number?: string | null
          returned_date?: string | null
          selection_window_end_date?: never
          selection_window_start_date?: never
          shipping_address?: Json | null
          status?: string | null
          subscription_category?: string | null
          subscription_id?: string | null
          subscription_plan?: string | null
          total_amount?: number | null
          toys_at_home_count?: never
          toys_data?: Json | null
          toys_delivered_count?: number | null
          toys_returned_count?: number | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rental_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_current_cycle"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "rental_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_expiration_status"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "rental_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_start_date_comparison"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "rental_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_upcoming_cycles"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "rental_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      selection_window_dashboard: {
        Row: {
          auto_status: string | null
          created_at: string | null
          current_cycle_day: number | null
          cycle_number: number | null
          days_until_closes: number | null
          days_until_opens: number | null
          effective_status: string | null
          manual_selection_control: boolean | null
          order_number: string | null
          rental_end_date: string | null
          rental_order_id: string | null
          rental_start_date: string | null
          selection_window_closed_at: string | null
          selection_window_notes: string | null
          selection_window_opened_at: string | null
          selection_window_status: string | null
          subscription_plan: string | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_phone: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "rental_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      simple_inventory_view: {
        Row: {
          age_range: string | null
          available_quantity: number | null
          brand: string | null
          category: Database["public"]["Enums"]["toy_category"] | null
          description: string | null
          image_url: string | null
          inventory_updated_at: string | null
          inventory_updated_by: string | null
          needs_reorder: boolean | null
          rental_price: number | null
          rented_quantity: number | null
          retail_price: number | null
          sku: string | null
          stock_status: string | null
          total_quantity: number | null
          toy_created_at: string | null
          toy_id: string | null
          toy_name: string | null
          toy_updated_at: string | null
        }
        Relationships: []
      }
      subscription_current_cycle: {
        Row: {
          actual_subscription_start_date: string | null
          created_at: string | null
          current_cycle_end: string | null
          current_cycle_number: number | null
          current_cycle_start: string | null
          current_cycle_status: string | null
          current_day_in_cycle: number | null
          cycle_progress_percentage: number | null
          days_remaining_in_cycle: number | null
          days_to_selection_window: number | null
          last_selection_date: string | null
          next_selection_window_end: string | null
          next_selection_window_start: string | null
          original_subscription_date: string | null
          plan_id: string | null
          rental_orders_count: number | null
          selection_window_status: string | null
          subscription_id: string | null
          subscription_status: string | null
          total_cycles_completed: number | null
          total_days_subscribed_actual: number | null
          updated_at: string | null
          user_actual_start_date: string | null
          user_id: string | null
        }
        Insert: {
          actual_subscription_start_date?: never
          created_at?: string | null
          current_cycle_end?: string | null
          current_cycle_number?: number | null
          current_cycle_start?: string | null
          current_cycle_status?: string | null
          current_day_in_cycle?: never
          cycle_progress_percentage?: never
          days_remaining_in_cycle?: never
          days_to_selection_window?: never
          last_selection_date?: string | null
          next_selection_window_end?: string | null
          next_selection_window_start?: string | null
          original_subscription_date?: string | null
          plan_id?: string | null
          rental_orders_count?: never
          selection_window_status?: never
          subscription_id?: string | null
          subscription_status?: string | null
          total_cycles_completed?: number | null
          total_days_subscribed_actual?: never
          updated_at?: string | null
          user_actual_start_date?: never
          user_id?: string | null
        }
        Update: {
          actual_subscription_start_date?: never
          created_at?: string | null
          current_cycle_end?: string | null
          current_cycle_number?: number | null
          current_cycle_start?: string | null
          current_cycle_status?: string | null
          current_day_in_cycle?: never
          cycle_progress_percentage?: never
          days_remaining_in_cycle?: never
          days_to_selection_window?: never
          last_selection_date?: string | null
          next_selection_window_end?: string | null
          next_selection_window_start?: string | null
          original_subscription_date?: string | null
          plan_id?: string | null
          rental_orders_count?: never
          selection_window_status?: never
          subscription_id?: string | null
          subscription_status?: string | null
          total_cycles_completed?: number | null
          total_days_subscribed_actual?: never
          updated_at?: string | null
          user_actual_start_date?: never
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_cycle_history: {
        Row: {
          actual_rental_start_date: string | null
          billing_amount: number | null
          billing_status: string | null
          completed_at: string | null
          created_at: string | null
          cycle_completion_days: number | null
          cycle_duration_days: number | null
          cycle_end_date: string | null
          cycle_id: string | null
          cycle_number: number | null
          cycle_start_date: string | null
          cycle_status: string | null
          delivery_actual_date: string | null
          delivery_delay_days: number | null
          delivery_scheduled_date: string | null
          delivery_status: string | null
          plan_id_at_cycle: string | null
          rental_orders_count: number | null
          selected_toys: Json | null
          selection_closed_at: string | null
          selection_opened_at: string | null
          selection_window_duration: number | null
          selection_window_end: string | null
          selection_window_start: string | null
          subscription_id: string | null
          total_toy_value: number | null
          toys_count: number | null
          toys_selected_at: string | null
          tracking_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          actual_rental_start_date?: never
          billing_amount?: number | null
          billing_status?: string | null
          completed_at?: string | null
          created_at?: string | null
          cycle_completion_days?: never
          cycle_duration_days?: never
          cycle_end_date?: string | null
          cycle_id?: string | null
          cycle_number?: number | null
          cycle_start_date?: string | null
          cycle_status?: string | null
          delivery_actual_date?: string | null
          delivery_delay_days?: never
          delivery_scheduled_date?: string | null
          delivery_status?: string | null
          plan_id_at_cycle?: string | null
          rental_orders_count?: never
          selected_toys?: Json | null
          selection_closed_at?: string | null
          selection_opened_at?: string | null
          selection_window_duration?: never
          selection_window_end?: string | null
          selection_window_start?: string | null
          subscription_id?: string | null
          total_toy_value?: number | null
          toys_count?: number | null
          toys_selected_at?: string | null
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          actual_rental_start_date?: never
          billing_amount?: number | null
          billing_status?: string | null
          completed_at?: string | null
          created_at?: string | null
          cycle_completion_days?: never
          cycle_duration_days?: never
          cycle_end_date?: string | null
          cycle_id?: string | null
          cycle_number?: number | null
          cycle_start_date?: string | null
          cycle_status?: string | null
          delivery_actual_date?: string | null
          delivery_delay_days?: never
          delivery_scheduled_date?: string | null
          delivery_status?: string | null
          plan_id_at_cycle?: string | null
          rental_orders_count?: never
          selected_toys?: Json | null
          selection_closed_at?: string | null
          selection_opened_at?: string | null
          selection_window_duration?: never
          selection_window_end?: string | null
          selection_window_start?: string | null
          subscription_id?: string | null
          total_toy_value?: number | null
          toys_count?: number | null
          toys_selected_at?: string | null
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_current_cycle"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_expiration_status"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_start_date_comparison"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_upcoming_cycles"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_expiration_status: {
        Row: {
          current_cycle: number | null
          cycles_remaining: number | null
          plan_duration_months: number | null
          plan_id: string | null
          subscription_id: string | null
          subscription_status: string | null
          user_id: string | null
        }
        Insert: {
          current_cycle?: number | null
          cycles_remaining?: never
          plan_duration_months?: never
          plan_id?: string | null
          subscription_id?: string | null
          subscription_status?: never
          user_id?: string | null
        }
        Update: {
          current_cycle?: number | null
          cycles_remaining?: never
          plan_duration_months?: never
          plan_id?: string | null
          subscription_id?: string | null
          subscription_status?: never
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_management_summary: {
        Row: {
          active_amount: number | null
          active_count: number | null
          active_order_number: string | null
          active_status: string | null
          active_subscription_created_at: string | null
          active_subscription_id: string | null
          address_line1: string | null
          address_line2: string | null
          age_group: string | null
          avg_order_value: number | null
          city: string | null
          cycle_number: number | null
          days_since_last_activity: number | null
          email: string | null
          first_name: string | null
          first_order_date: string | null
          full_name: string | null
          inactive_count: number | null
          last_activity: string | null
          last_name: string | null
          phone: string | null
          phone_verified: boolean | null
          plan_category: string | null
          rental_end_date: string | null
          rental_start_date: string | null
          state: string | null
          status_priority: number | null
          subscription_category: string | null
          subscription_plan: string | null
          subscription_status: string | null
          total_orders: number | null
          total_spent: number | null
          user_active: boolean | null
          user_created_at: string | null
          user_id: string | null
          zip_code: string | null
        }
        Relationships: []
      }
      subscription_selection_windows: {
        Row: {
          created_at: string | null
          cycle_number: number | null
          cycle_status: string | null
          days_to_select: number | null
          days_until_closes: number | null
          days_until_opens: number | null
          rental_orders_count: number | null
          selection_closed_at: string | null
          selection_opened_at: string | null
          selection_window_end: string | null
          selection_window_start: string | null
          subscription_id: string | null
          toys_count: number | null
          toys_selected_at: string | null
          updated_at: string | null
          user_id: string | null
          window_status: string | null
        }
        Insert: {
          created_at?: string | null
          cycle_number?: number | null
          cycle_status?: string | null
          days_to_select?: never
          days_until_closes?: never
          days_until_opens?: never
          rental_orders_count?: never
          selection_closed_at?: string | null
          selection_opened_at?: string | null
          selection_window_end?: string | null
          selection_window_start?: string | null
          subscription_id?: string | null
          toys_count?: number | null
          toys_selected_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          window_status?: never
        }
        Update: {
          created_at?: string | null
          cycle_number?: number | null
          cycle_status?: string | null
          days_to_select?: never
          days_until_closes?: never
          days_until_opens?: never
          rental_orders_count?: never
          selection_closed_at?: string | null
          selection_opened_at?: string | null
          selection_window_end?: string | null
          selection_window_start?: string | null
          subscription_id?: string | null
          toys_count?: number | null
          toys_selected_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          window_status?: never
        }
        Relationships: [
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_current_cycle"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_expiration_status"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_start_date_comparison"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_upcoming_cycles"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_cycles_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_order_details_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_rental_orders_view"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_business_intelligence"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_comprehensive_dashboard"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_order_summary"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "enriched_customer_view"
            referencedColumns: ["user_uuid"]
          },
          {
            foreignKeyName: "subscription_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "subscription_management_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscription_start_date_comparison: {
        Row: {
          actual_rental_start_date: string | null
          date_difference_days: number | null
          earliest_rental_date: string | null
          original_subscription_date: string | null
          rental_orders_count: number | null
          stored_subscription_start_date: string | null
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          actual_rental_start_date?: never
          date_difference_days?: never
          earliest_rental_date?: never
          original_subscription_date?: string | null
          rental_orders_count?: never
          stored_subscription_start_date?: string | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          actual_rental_start_date?: never
          date_difference_days?: never
          earliest_rental_date?: never
          original_subscription_date?: string | null
          rental_orders_count?: never
          stored_subscription_start_date?: string | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_upcoming_cycles: {
        Row: {
          actual_subscription_start_date: string | null
          estimated_delivery_date: string | null
          future_cycle_end: string | null
          future_cycle_number: number | null
          future_cycle_start: string | null
          future_selection_end: string | null
          future_selection_start: string | null
          plan_duration_months: number | null
          plan_id: string | null
          subscription_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
      unified_order_history: {
        Row: {
          currency: string | null
          customer_age_group: string | null
          order_date: string | null
          order_id: string | null
          payment_method: string | null
          payment_status: string | null
          rental_end_date: string | null
          rental_start_date: string | null
          returned_date: string | null
          shipping_address: Json | null
          sort_priority: number | null
          source: string | null
          status: string | null
          total_amount: number | null
          user_uuid: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_toy_inventory: {
        Args: {
          p_toy_id: string
          p_new_total_quantity: number
          p_new_available_quantity?: number
          p_notes?: string
          p_adjusted_by?: string
        }
        Returns: boolean
      }
      admin_enable_cycle_update: {
        Args: { p_cycle_id: string; p_admin_user_id: string; p_reason?: string }
        Returns: boolean
      }
      apply_offer_to_user: {
        Args: {
          p_offer_id: string
          p_user_id: string
          p_order_id: string
          p_order_amount: number
        }
        Returns: Json
      }
      auto_schedule_pickup_for_order: {
        Args: { p_rental_order_id: string }
        Returns: string
      }
      calculate_current_day_in_cycle: {
        Args: { rental_start_date_param: string }
        Returns: number
      }
      calculate_next_pickup_date: {
        Args: {
          p_pincode: string
          p_cycle_start_date: string
          p_current_cycle_day?: number
        }
        Returns: string
      }
      calculate_offer_discount: {
        Args: { p_offer_id: string; p_order_amount: number }
        Returns: number
      }
      calculate_prorated_amount: {
        Args: {
          current_plan_price: number
          new_plan_price: number
          remaining_days: number
          billing_cycle?: string
        }
        Returns: number
      }
      calculate_selection_window_status: {
        Args: {
          p_rental_start_date: string
          p_manual_control?: boolean
          p_current_status?: string
        }
        Returns: string
      }
      check_inventory_sync_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          total_toys: number
          toys_with_original_id: number
          sync_coverage_percentage: number
        }[]
      }
      check_overdue_returns: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_inventory_movements: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      control_selection_window: {
        Args: {
          p_rental_order_id: string
          p_action: string
          p_admin_user_id: string
          p_notes?: string
        }
        Returns: boolean
      }
      create_subscription_cycle: {
        Args: { p_subscription_id: string; p_cycle_number?: number }
        Returns: string
      }
      daily_subscription_maintenance: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      demote_to_user: {
        Args: { p_user_id: string; p_admin_user_id?: string }
        Returns: boolean
      }
      forecast_inventory_needs: {
        Args: { p_days_ahead?: number }
        Returns: {
          toy_id: string
          toy_name: string
          current_available: number
          projected_demand: number
          recommended_restock: number
        }[]
      }
      generate_daily_inventory_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          summary_date: string
          total_movements: number
          items_in: number
          items_out: number
          net_change: number
          low_stock_count: number
          out_of_stock_count: number
        }[]
      }
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_active_subscription_for_user: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          order_number: string
          subscription_plan: string
          cycle_number: number
          rental_start_date: string
          rental_end_date: string
          status: string
          created_at: string
        }[]
      }
      get_actual_subscription_start_date: {
        Args: { p_subscription_id: string }
        Returns: string
      }
      get_applicable_age_tables: {
        Args: { age_range_input: string }
        Returns: string[]
      }
      get_available_offers_for_user: {
        Args: { p_user_id: string }
        Returns: {
          offer_id: string
          code: string
          name: string
          description: string
          type: string
          value: number
          min_order_value: number
          max_discount_amount: number
          end_date: string
        }[]
      }
      get_comprehensive_inventory_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          toy_id: string
          toy_name: string
          category: string
          age_range: string
          total_quantity: number
          available_quantity: number
          reserved_quantity: number
          rented_quantity: number
          damaged_quantity: number
          maintenance_quantity: number
          inventory_status: string
          reorder_threshold: number
          needs_restocking: boolean
        }[]
      }
      get_current_active_cycle: {
        Args: { p_user_id: string }
        Returns: {
          cycle_id: string
          subscription_id: string
          cycle_number: number
          cycle_status: string
          toys_count: number
          can_select_toys: boolean
        }[]
      }
      get_current_cycle_day: {
        Args: { p_rental_start_date: string }
        Returns: number
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never> | { session_token?: string }
        Returns: string
      }
      get_current_user_id_from_session: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_customer_order_journey: {
        Args: { order_uuid: string }
        Returns: {
          step_name: string
          step_description: string
          step_timestamp: string
          step_data: Json
        }[]
      }
      get_days_until_selection_closes: {
        Args: { p_rental_start_date: string }
        Returns: number
      }
      get_days_until_selection_opens: {
        Args: { p_rental_start_date: string }
        Returns: number
      }
      get_full_name_immutable: {
        Args: { first_name: string; last_name: string }
        Returns: string
      }
      get_next_cycle_scheduled_date: {
        Args: { rental_end_date_param: string }
        Returns: string
      }
      get_order_payment_details: {
        Args: { order_uuid: string }
        Returns: {
          payment_id: string
          razorpay_order_id: string
          razorpay_payment_id: string
          payment_amount: number
          payment_status: string
          payment_method: string
          gateway_response: Json
          payment_created_at: string
          payment_completed_at: string
        }[]
      }
      get_paginated_subscriptions: {
        Args: {
          p_page?: number
          p_limit?: number
          p_search?: string
          p_status_filter?: string
          p_plan_filter?: string
          p_sort_by?: string
          p_sort_order?: string
        }
        Returns: {
          user_id: string
          full_name: string
          phone: string
          email: string
          subscription_status: string
          subscription_plan: string
          active_amount: number
          total_spent: number
          total_orders: number
          last_activity: string
          active_subscription_id: string
          active_order_number: string
          cycle_number: number
          rental_start_date: string
          rental_end_date: string
          plan_category: string
          days_since_last_activity: number
          total_count: number
        }[]
      }
      get_phone_match_confidence: {
        Args: { phone1: string; phone2: string }
        Returns: string
      }
      get_pickup_day_for_pincode: {
        Args: { p_pincode: string }
        Returns: string
      }
      get_plan_duration_months: {
        Args: { plan_id: string }
        Returns: number
      }
      get_rental_order_items: {
        Args: { order_id_param: string }
        Returns: {
          id: string
          toy_id: string
          toy_name: string
          quantity: number
          returned: boolean
        }[]
      }
      get_selection_window_end_date: {
        Args: { rental_start_date_param: string }
        Returns: string
      }
      get_selection_window_start_date: {
        Args: { rental_start_date_param: string }
        Returns: string
      }
      get_subscription_current_cycle_data: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          user_id: string
          subscription_plan: string
          subscription_status: string
          rental_start_date: string
          rental_end_date: string
          cycle_number: number
          current_cycle_day: number
          days_remaining_in_cycle: number
          cycle_progress_percentage: number
          selection_window_status: string
          manual_selection_control: boolean
          selection_window_opened_at: string
          selection_window_closed_at: string
          selection_window_notes: string
          days_until_selection_opens: number
          days_until_selection_closes: number
        }[]
      }
      get_subscription_stats: {
        Args: { p_user_id: string }
        Returns: {
          total_orders: number
          active_orders: number
          total_amount_spent: number
          current_plan: string
          subscription_start_date: string
          days_subscribed: number
        }[]
      }
      get_subscription_status_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          subscription_status: string
          count: number
          total_amount: number
        }[]
      }
      get_subscription_upcoming_cycles: {
        Args: { p_user_id: string; p_cycle_count?: number }
        Returns: {
          cycle_number: number
          cycle_start_date: string
          cycle_end_date: string
          selection_window_opens: string
          selection_window_closes: string
        }[]
      }
      get_toy_count_by_category: {
        Args: { category_name: string }
        Returns: number
      }
      get_toys_by_age_table: {
        Args: { age_group: string }
        Returns: {
          id: string
          name: string
          description: string
          category: string
          age_range: string
          brand: string
          pack: string
          retail_price: number
          rental_price: number
          image_url: string
          available_quantity: number
          total_quantity: number
          rating: number
          min_age: number
          max_age: number
          show_strikethrough_pricing: boolean
          display_order: number
          is_featured: boolean
          created_at: string
          updated_at: string
        }[]
      }
      get_user_actual_subscription_start_date: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_user_current_cycle: {
        Args: { p_user_id: string }
        Returns: {
          cycle_id: string
          cycle_number: number
          cycle_status: string
          selected_toys: Json
          toys_count: number
          can_update_toys: boolean
          plan_name: string
        }[]
      }
      get_user_cycle_status: {
        Args: { user_id_param: string }
        Returns: {
          has_active_subscription: boolean
          cycle_status: Database["public"]["Enums"]["cycle_status_enum"]
          toys_in_possession: boolean
          selection_window_active: boolean
          days_in_current_cycle: number
          plan_id: string
        }[]
      }
      get_user_effective_permissions: {
        Args: { user_id_param: string }
        Returns: Json
      }
      get_user_order_history: {
        Args: { user_id_param: string }
        Returns: {
          order_id: string
          order_number: string
          cycle_number: number
          status: string
          rental_start_date: string
          rental_end_date: string
          returned_date: string
          toys_count: number
          total_amount: number
          created_at: string
          current_day: number
          is_selection_window: boolean
        }[]
      }
      get_user_profile: {
        Args: { p_session_token: string }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          phone_verified: boolean | null
          pickup_day: string | null
          role: Database["public"]["Enums"]["app_role"]
          state: string | null
          subscription_active: boolean | null
          subscription_end_date: string | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at: string | null
          zip_code: string | null
        }
      }
      get_user_role: {
        Args: { p_user_id?: string }
        Returns: string
      }
      get_user_role_secure: {
        Args: { user_id_param: string }
        Returns: string
      }
      get_users_in_selection_window: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          order_id: string
          first_name: string
          last_name: string
          phone: string
          current_day: number
          days_left_in_selection: number
          rental_start_date: string
          rental_end_date: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      has_role: {
        Args: { p_user_id: string; p_role_name: string }
        Returns: boolean
      }
      initialize_simple_inventory: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      initialize_simple_inventory_fixed: {
        Args: Record<PropertyKey, never>
        Returns: {
          processed_count: number
          skipped_count: number
          error_count: number
        }[]
      }
      is_admin: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_custom_auth_admin: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_offer_valid_for_user: {
        Args: { p_offer_id: string; p_user_id: string }
        Returns: boolean
      }
      is_selection_window_active: {
        Args:
          | { rental_start_date_param: string; returned_date_param: string }
          | { user_id_param: string }
        Returns: boolean
      }
      is_user: {
        Args: { p_user_id?: string }
        Returns: boolean
      }
      is_user_admin: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      normalize_email: {
        Args: { input_email: string }
        Returns: string
      }
      normalize_phone: {
        Args: { input_phone: string }
        Returns: string
      }
      prepare_search_text: {
        Args: { input_text: string }
        Returns: string
      }
      promote_to_admin: {
        Args: { p_user_id: string; p_admin_user_id?: string }
        Returns: boolean
      }
      record_cycle_toy_selection: {
        Args: {
          p_cycle_id: string
          p_selected_toys: Json
          p_total_value?: number
        }
        Returns: boolean
      }
      record_inventory_movement: {
        Args:
          | {
              p_toy_id: string
              p_movement_type: string
              p_quantity: number
              p_reason?: string
              p_reference_order_id?: string
              p_created_by?: string
              p_notes?: string
            }
          | {
              p_toy_id: string
              p_movement_type: string
              p_quantity_change: number
              p_rental_order_id?: string
              p_movement_reason?: string
              p_notes?: string
            }
        Returns: string
      }
      refresh_subscription_statistics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      rent_toy: {
        Args: {
          p_toy_id: string
          p_quantity: number
          p_order_id?: string
          p_subscription_id?: string
          p_notes?: string
        }
        Returns: boolean
      }
      reset_selection_window_to_auto: {
        Args: { p_rental_order_id: string }
        Returns: boolean
      }
      return_toy: {
        Args: {
          p_toy_id: string
          p_quantity: number
          p_order_id?: string
          p_subscription_id?: string
          p_notes?: string
        }
        Returns: boolean
      }
      safe_create_toy: {
        Args: {
          p_name: string
          p_description?: string
          p_category?: string
          p_age_range?: string
          p_brand?: string
          p_retail_price?: number
          p_rental_price?: number
          p_total_quantity?: number
          p_available_quantity?: number
          p_image_url?: string
          p_is_featured?: boolean
        }
        Returns: string
      }
      safe_update_toy: {
        Args: {
          p_toy_id: string
          p_name?: string
          p_description?: string
          p_category?: string
          p_age_range?: string
          p_brand?: string
          p_retail_price?: number
          p_rental_price?: number
          p_total_quantity?: number
          p_available_quantity?: number
          p_image_url?: string
          p_is_featured?: boolean
        }
        Returns: boolean
      }
      search_subscribers: {
        Args: { p_search_term: string; p_limit?: number }
        Returns: {
          user_id: string
          full_name: string
          phone: string
          email: string
          subscription_status: string
          match_type: string
          relevance_score: number
        }[]
      }
      search_subscribers_simple: {
        Args: { p_search_term: string; p_limit?: number }
        Returns: {
          user_id: string
          full_name: string
          phone: string
          email: string
          subscription_status: string
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      standardize_phone: {
        Args: { phone_input: string }
        Returns: string
      }
      sync_age_table_inventory: {
        Args: { p_toy_id: string }
        Returns: boolean
      }
      sync_all_toy_inventory_to_age_tables: {
        Args: Record<PropertyKey, never>
        Returns: {
          toy_id: string
          toy_name: string
          age_tables_updated: number
        }[]
      }
      sync_all_toys_to_age_tables: {
        Args: Record<PropertyKey, never>
        Returns: {
          toy_id: string
          toy_name: string
          action: string
          age_tables_updated: number
        }[]
      }
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
      }
      update_cycle_status: {
        Args: { p_cycle_id: string; p_new_status: string }
        Returns: boolean
      }
      update_inventory_thresholds: {
        Args: { p_category?: string; p_threshold_percentage?: number }
        Returns: number
      }
      update_toy_return_status: {
        Args: {
          order_id_param: string
          toy_id_param: string
          returned_param?: boolean
        }
        Returns: boolean
      }
      update_user_profile: {
        Args: { p_updates: Json; p_session_token: string }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          phone_verified: boolean | null
          pickup_day: string | null
          role: Database["public"]["Enums"]["app_role"]
          state: string | null
          subscription_active: boolean | null
          subscription_end_date: string | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at: string | null
          zip_code: string | null
        }
      }
      user_has_permission: {
        Args: { user_id_param: string; permission_path: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      cycle_status_enum:
        | "selection"
        | "delivery_pending"
        | "toys_in_possession"
        | "return_pending"
        | "cycle_complete"
      order_status:
        | "pending"
        | "shipped"
        | "delivered"
        | "returned"
        | "cancelled"
        | "confirmed"
        | "processing"
      subscription_category:
        | "big_toys"
        | "stem_toys"
        | "educational_toys"
        | "books"
        | "developmental_toys"
        | "ride_on_toys"
      subscription_plan:
        | "basic"
        | "premium"
        | "family"
        | "Discovery Delight"
        | "Silver Pack"
        | "Gold Pack PRO"
      toy_category:
        | "big_toys"
        | "stem_toys"
        | "educational_toys"
        | "books"
        | "developmental_toys"
        | "ride_on_toys"
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
    Enums: {
      app_role: ["admin", "user"],
      cycle_status_enum: [
        "selection",
        "delivery_pending",
        "toys_in_possession",
        "return_pending",
        "cycle_complete",
      ],
      order_status: [
        "pending",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
        "confirmed",
        "processing",
      ],
      subscription_category: [
        "big_toys",
        "stem_toys",
        "educational_toys",
        "books",
        "developmental_toys",
        "ride_on_toys",
      ],
      subscription_plan: [
        "basic",
        "premium",
        "family",
        "Discovery Delight",
        "Silver Pack",
        "Gold Pack PRO",
      ],
      toy_category: [
        "big_toys",
        "stem_toys",
        "educational_toys",
        "books",
        "developmental_toys",
        "ride_on_toys",
      ],
    },
  },
} as const
