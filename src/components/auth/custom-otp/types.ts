export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  pincode: string;
}

export type AuthStep = "phone" | "signup-form" | "otp-signin" | "otp-signup";

export interface CustomOTPAuthState {
  phone: string;
  step: AuthStep;
  otp: string;
  isNewUser: boolean;
  isLoading: boolean;
  developmentOtp: string;
  phoneError: string;
  signupData: SignupData;
}
