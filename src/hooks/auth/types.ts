
export interface CustomUser {
  id: string;
  phone: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string | null;
  is_active?: boolean;
  role?: 'admin' | 'user';
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  avatar_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  subscription_plan?: 'Discovery Delight' | 'Silver Pack' | 'Gold Pack PRO' | 'basic' | 'premium' | 'family' | null;
  subscription_active?: boolean | null;
  subscription_end_date?: string | null;
}

export interface CustomSession {
  access_token: string;
  refresh_token: string;
  user: CustomUser;
  token_type: string;
  expires_in: number;
  expires_at: number;
}

export interface CustomAuthContextType {
  user: CustomUser | null;
  session: CustomSession | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setAuth: (user: CustomUser, session: CustomSession) => void;
  updateUser: (user: CustomUser) => void;
  refreshAuth?: () => Promise<void>;
}
