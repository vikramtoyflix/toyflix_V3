import { useState } from "react";
import { AuthStep, SignupData } from "./types";

export const useAuthState = () => {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<AuthStep>("phone");
  const [otp, setOtp] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [developmentOtp, setDevelopmentOtp] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [signupData, setSignupData] = useState<SignupData>({
    firstName: "",
    lastName: "",
    email: "",
    pincode: ""
  });
  const [lastOtpSentAt, setLastOtpSentAt] = useState<number | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const resetFlow = () => {
    setStep("phone");
    setOtp("");
    setPhone("");
    setIsNewUser(false);
    setDevelopmentOtp("");
    setPhoneError("");
    setSignupData({ firstName: "", lastName: "", email: "", pincode: "" });
    setLastOtpSentAt(null);
    setResendCooldown(0);
  };

  return {
    phone,
    setPhone,
    step,
    setStep,
    otp,
    setOtp,
    isNewUser,
    setIsNewUser,
    isLoading,
    setIsLoading,
    developmentOtp,
    setDevelopmentOtp,
    phoneError,
    setPhoneError,
    signupData,
    setSignupData,
    lastOtpSentAt,
    setLastOtpSentAt,
    resendCooldown,
    setResendCooldown,
    resetFlow
  };
};
