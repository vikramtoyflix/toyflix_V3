import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for better TypeScript support
export interface Database {
  public: {
    Tables: {
      enriched_customer_view: {
        Row: {
          id: string;
          username: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string;
          phone_normalized: string;
          total_lifetime_value: number;
          total_orders: number;
          average_order_value: number;
          customer_tier: string;
          primary_child_age_group: string;
          has_historical_data: boolean;
          historical_orders_count: number;
          historical_lifetime_value: number;
          data_source: 'current' | 'historical' | 'merged';
        };
      };
      unified_order_history: {
        Row: {
          id: string;
          customer_id: string;
          order_date: string;
          total_amount: number;
          status: string;
          data_source: 'current' | 'historical';
          is_current: boolean;
          item_count: number;
          created_at: string;
        };
      };
      order_items_detail_view: {
        Row: {
          id: string;
          order_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
      };
      customer_business_intelligence: {
        Row: {
          id: string;
          username: string;
          email: string;
          first_name: string;
          last_name: string;
          phone_normalized: string;
          total_lifetime_value: number;
          total_orders: number;
          customer_tier: string;
          has_historical_data: boolean;
          historical_orders_count: number;
          data_source: 'current' | 'historical' | 'merged';
          last_order_date: string;
        };
      };
    };
  };
} 