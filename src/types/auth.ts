export interface AuthResult {
  error: any;
  success?: boolean;
}

export interface AuthContextType {
  user: any;
  session: any;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string, phone: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  verifyPhoneAfterSignup: (phone: string, otp: string) => Promise<{ error: any }>;
}
