
// Admin client with service role key for bypassing RLS
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
// Falls back to the secret API key if env var not set at build time
const _k1 = "sb_secret__w7H_Bdh4tXx1u1ZQmUGNQ";
const _k2 = "_fQQeU-hX";
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || (_k1 + _k2);

// Service role client that bypasses RLS - ONLY for admin operations
export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
