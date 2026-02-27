import { useState, useEffect } from "react";
import { useAuthState } from "./useAuthState";
import { useAuthActions } from "./useAuthActions";

const OTP_COOLDOWN_MS = 30000; // 30 seconds

export const useCustomOTPAuth = () => {
  const {
    phone,
    setPhone,
    otp,
    setOtp,
    step,
    setStep,
    signupData,
    setSignupData,
    isNewUser,
    setIsNewUser,
    isLoading,
    setIsLoading,
    phoneError,
    setPhoneError,
    developmentOtp,
    setDevelopmentOtp,
    lastOtpSentAt,
    setLastOtpSentAt,
    resendCooldown,
    setResendCooldown
  } = useAuthState();

  const {
    handleSendOTP,
    handleSendOTPAfterSignup,
    handleVerifyOTPSignin,
    handleVerifyOTPSignup,
    handleResendOTP,
    handleBackToMain,
    isAuthLoading
  } = useAuthActions(
    phone,
    otp,
    signupData,
    setStep,
    setIsNewUser,
    setIsLoading,
    setPhoneError,
    setDevelopmentOtp,
    lastOtpSentAt,
    setLastOtpSentAt
  );

  useEffect(() => {
    if (!['otp-signin', 'otp-signup'].includes(step) || !lastOtpSentAt) {
      setResendCooldown(0);
      return;
    }

    const intervalId = setInterval(() => {
      const timePassed = Date.now() - lastOtpSentAt;
      if (timePassed >= OTP_COOLDOWN_MS) {
        setResendCooldown(0);
        clearInterval(intervalId);
      } else {
        setResendCooldown(Math.ceil((OTP_COOLDOWN_MS - timePassed) / 1000));
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [step, lastOtpSentAt, setResendCooldown]);

  const resetFlow = () => {
    setStep("phone");
    setOtp("");
    setPhone("");
    setPhoneError("");
    setSignupData({ firstName: "", lastName: "", email: "", pincode: "" });
    setIsNewUser(false);
    setLastOtpSentAt(null);
    setResendCooldown(0);
  };

  return {
    phone,
    setPhone,
    otp,
    setOtp,
    step,
    setStep,
    signupData,
    setSignupData,
    isNewUser,
    isLoading,
    isAuthLoading,
    phoneError,
    developmentOtp,
    resendCooldown,
    handleSendOTP,
    handleSendOTPAfterSignup,
    handleVerifyOTPSignin,
    handleVerifyOTPSignup,
    handleResendOTP,
    handleBackToMain,
    resetFlow
  };
};
