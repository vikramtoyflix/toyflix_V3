
import React, { createContext, useContext, ReactNode } from 'react';

interface LanguageContextType {
  t: (key: string) => string;
}

const translations = {
  // Header
  toyflix: 'Toyflix',
  
  // Auth Page
  phoneOtp: 'Phone OTP',
  emailLogin: 'Email Login',
  
  // OTP Auth
  phoneLogin: 'Login with Phone',
  otpVerify: 'Verify OTP',
  phoneLoginDesc: 'Enter your phone number to receive OTP',
  otpVerifyDesc: 'Enter the OTP sent to your phone',
  phoneNumber: 'Phone Number',
  sendOtp: 'Send OTP',
  sending: 'Sending...',
  enterOtp: 'Enter OTP',
  verifyOtp: 'Verify OTP',
  verifying: 'Verifying...',
  newNumber: 'Enter New Number',
  invalidPhone: 'Invalid Phone Number',
  invalidPhoneDesc: 'Please enter a valid phone number',
  otpSentSuccess: 'OTP Sent Successfully',
  otpSentDesc: 'OTP has been sent to your phone',
  invalidOtp: 'Invalid OTP',
  invalidOtpDesc: 'Please enter 6-digit OTP',
  loginSuccess: 'Login Successful',
  loginSuccessDesc: 'Successfully logged in!',
  
  // Email Auth
  welcomeBack: 'Welcome Back',
  createAccount: 'Create Account',
  signInDesc: 'Sign in to manage your toy subscriptions',
  joinDesc: 'Join thousands of families enjoying Toyflix',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  password: 'Password',
  confirmPassword: 'Confirm Password',
  agreeTerms: 'I agree to the Terms of Service and Privacy Policy',
  signIn: 'Sign In',
  processing: 'Processing...',
  dontHaveAccount: "Don't have an account?",
  alreadyHaveAccount: 'Already have an account?',
  signUp: 'Sign up'
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const t = (key: string): string => {
    return translations[key as keyof typeof translations] || key;
  };

  return (
    <LanguageContext.Provider value={{ t }}>
      {children}
    </LanguageContext.Provider>
  );
};
