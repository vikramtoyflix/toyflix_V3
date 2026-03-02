// Admin client with service role key for bypassing RLS
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://wucwpyitzqjukcphczhr.supabase.co";
// Service role key: use env var in production; JWT fallback (same format as in verify-migration.js)
const SUPABASE_SERVICE_ROLE_KEY =
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.Gp5Ui_5bHVDcMNKANfFIuGUhN-lKLIVnJH7xoKhqzek";

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
