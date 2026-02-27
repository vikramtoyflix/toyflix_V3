import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomOTPAuth } from "./custom-otp/useCustomOTPAuth";
import PhoneInputStep from "./custom-otp/PhoneInputStep";
import SignupFormStep from "./custom-otp/SignupFormStep";
import OTPSigninStep from "./custom-otp/OTPSigninStep";
import OTPSignupStep from "./custom-otp/OTPSignupStep";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface CustomOTPAuthProps {
  onClose?: () => void;
}

const CustomOTPAuth = ({ onClose }: CustomOTPAuthProps) => {
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
    isLoading,
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
  } = useCustomOTPAuth();

  const getStepTitle = () => {
    switch (step) {
      case "phone":
        return "Sign In / Sign Up";
      case "signup-form":
        return "Complete Your Profile";
      case "otp-signin":
        return "Verify & Sign In";
      case "otp-signup":
        return "Verify & Create Account";
      default:
        return "Authentication";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "phone":
        return "Enter your phone number and we'll check if you have an account";
      case "signup-form":
        return "Tell us about yourself to check service availability";
      case "otp-signin":
        return "Enter the OTP sent to your phone to sign in";
      case "otp-signup":
        return "Enter the OTP sent to your phone to complete signup";
      default:
        return "Secure authentication with OTP";
    }
  };

  const renderStep = () => {
    switch (step) {
      case "phone":
        return (
          <PhoneInputStep
            phone={phone}
            setPhone={setPhone}
            phoneError={phoneError}
            isLoading={isLoading}
            onSendOTP={handleSendOTP}
          />
        );

      case "signup-form":
        return (
          <SignupFormStep
            signupData={signupData}
            setSignupData={setSignupData}
            isLoading={isLoading}
            onContinue={handleSendOTPAfterSignup}
            onBack={handleBackToMain}
          />
        );

      case "otp-signin":
        return (
          <OTPSigninStep
            phone={phone}
            otp={otp}
            setOtp={setOtp}
            isLoading={isLoading}
            developmentOtp={developmentOtp}
            resendCooldown={resendCooldown}
            onVerify={handleVerifyOTPSignin}
            onResend={handleResendOTP}
            onBack={handleBackToMain}
          />
        );

      case "otp-signup":
        return (
          <OTPSignupStep
            phone={phone}
            signupData={signupData}
            otp={otp}
            setOtp={setOtp}
            isLoading={isLoading}
            developmentOtp={developmentOtp}
            resendCooldown={resendCooldown}
            onVerify={handleVerifyOTPSignup}
            onResend={handleResendOTP}
            onBack={() => setStep("signup-form")}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg">
      <CardHeader className="relative">
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
        <CardTitle className="text-2xl font-bold text-center">
          {getStepTitle()}
        </CardTitle>
        <CardDescription className="text-center">
          {getStepDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderStep()}
      </CardContent>
    </Card>
  );
};

export default CustomOTPAuth;
