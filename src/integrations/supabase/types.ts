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
            referencedRelation: "subscriptions"
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
          phone: string
          phone_verified: boolean | null
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
          phone: string
          phone_verified?: boolean | null
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
          phone?: string
          phone_verified?: boolean | null
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
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          quantity: number | null
          rental_price: number | null
          toy_id: string
          unit_price: number | null
          total_price: number | null
          subscription_category: string | null
          age_group: string | null
          ride_on_toy_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          quantity?: number | null
          rental_price?: number | null
          toy_id: string
          unit_price?: number | null
          total_price?: number | null
          subscription_category?: string | null
          age_group?: string | null
          ride_on_toy_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          quantity?: number | null
          rental_price?: number | null
          toy_id?: string
          unit_price?: number | null
          total_price?: number | null
          subscription_category?: string | null
          age_group?: string | null
          ride_on_toy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
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
          created_at: string | null
          id: string
          rental_end_date: string | null
          rental_start_date: string | null
          returned_date: string | null
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number | null
          updated_at: string | null
          user_id: string
          order_type: string | null
          base_amount: number | null
          gst_amount: number | null
          discount_amount: number | null
          coupon_code: string | null
          delivery_instructions: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          rental_end_date?: string | null
          rental_start_date?: string | null
          returned_date?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          user_id: string
          order_type?: string | null
          base_amount?: number | null
          gst_amount?: number | null
          discount_amount?: number | null
          coupon_code?: string | null
          delivery_instructions?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          rental_end_date?: string | null
          rental_start_date?: string | null
          returned_date?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string
          order_type?: string | null
          base_amount?: number | null
          gst_amount?: number | null
          discount_amount?: number | null
          coupon_code?: string | null
          delivery_instructions?: string | null
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_verified: boolean | null
          otp_code: string
          phone_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_verified?: boolean | null
          otp_code: string
          phone_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_verified?: boolean | null
          otp_code?: string
          phone_number?: string
          updated_at?: string
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
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "orders"
            referencedColumns: ["id"]
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
      subscriptions: {
        Row: {
          age_group: string | null
          auto_renew: boolean
          created_at: string
          current_cycle_end: string | null
          current_cycle_start: string | null
          current_period_end: string
          current_period_start: string
          current_selection_step: number | null
          cycle_status: Database["public"]["Enums"]["cycle_status_enum"] | null
          end_date: string
          id: string
          next_selection_window_start: string | null
          pause_balance: number
          plan_id: string
          start_date: string
          status: string
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
          current_period_end: string
          current_period_start?: string
          current_selection_step?: number | null
          cycle_status?: Database["public"]["Enums"]["cycle_status_enum"] | null
          end_date: string
          id?: string
          next_selection_window_start?: string | null
          pause_balance?: number
          plan_id: string
          start_date?: string
          status?: string
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
          current_period_end?: string
          current_period_start?: string
          current_selection_step?: number | null
          cycle_status?: Database["public"]["Enums"]["cycle_status_enum"] | null
          end_date?: string
          id?: string
          next_selection_window_start?: string | null
          pause_balance?: number
          plan_id?: string
          start_date?: string
          status?: string
          toys_delivered_date?: string | null
          toys_return_due_date?: string | null
          updated_at?: string
          user_id?: string
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
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
      toys: {
        Row: {
          age_range: string
          available_quantity: number | null
          brand: string | null
          category: Database["public"]["Enums"]["toy_category"]
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_featured: boolean
          max_age: number | null
          min_age: number | null
          name: string
          pack: string | null
          rating: number | null
          rental_price: number | null
          retail_price: number | null
          show_strikethrough_pricing: boolean
          sku: string | null
          subscription_category: Database["public"]["Enums"]["subscription_category"]
          total_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          age_range: string
          available_quantity?: number | null
          brand?: string | null
          category: Database["public"]["Enums"]["toy_category"]
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_featured?: boolean
          max_age?: number | null
          min_age?: number | null
          name: string
          pack?: string | null
          rating?: number | null
          rental_price?: number | null
          retail_price?: number | null
          show_strikethrough_pricing?: boolean
          sku?: string | null
          subscription_category: Database["public"]["Enums"]["subscription_category"]
          total_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          age_range?: string
          available_quantity?: number | null
          brand?: string | null
          category?: Database["public"]["Enums"]["toy_category"]
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_featured?: boolean
          max_age?: number | null
          min_age?: number | null
          name?: string
          pack?: string | null
          rating?: number | null
          rental_price?: number | null
          retail_price?: number | null
          show_strikethrough_pricing?: boolean
          sku?: string | null
          subscription_category?: Database["public"]["Enums"]["subscription_category"]
          total_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
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
            referencedRelation: "custom_users"
            referencedColumns: ["id"]
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
            referencedRelation: "toys"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_toy_count_by_category: {
        Args: { category_name: string }
        Returns: number
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
          phone: string
          phone_verified: boolean | null
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
      get_user_role_secure: {
        Args: { user_id_param: string }
        Returns: string
      }
      is_selection_window_active: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_user_admin: {
        Args: { user_id_param: string }
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
          phone: string
          phone_verified: boolean | null
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
      subscription_category:
        | "big_toys"
        | "stem_toys"
        | "educational_toys"
        | "books"
        | "developmental_toys"
        | "ride_on_toys"
      subscription_plan: "Discovery Delight" | "Silver Pack" | "Gold Pack PRO" | "basic" | "premium" | "family"
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
      ],
      subscription_category: [
        "big_toys",
        "stem_toys",
        "educational_toys",
        "books",
        "developmental_toys",
        "ride_on_toys",
      ],
      subscription_plan: ["Discovery Delight", "Silver Pack", "Gold Pack PRO", "basic", "premium", "family"],
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
