import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { sendOTP, verifyOTP, updateUserProfile, deleteUserAccount, checkUserStatus } from "./otpService";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { validateBangalorePincode } from "@/utils/pincodeValidation";

export const useAuthActions = (
  phone: string,
  otp: string,
  signupData: any,
  setStep: (step: any) => void,
  setIsNewUser: (isNew: boolean) => void,
  setIsLoading: (loading: boolean) => void,
  setPhoneError: (error: string) => void,
  setDevelopmentOtp: (otp: string) => void,
  lastOtpSentAt: number | null,
  setLastOtpSentAt: (time: number) => void
) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setAuth, updateUser, signOut } = useCustomAuth();

  // NEW: Smart phone verification with user status check
  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      setPhoneError("Please enter a valid phone number");
      return;
    }

    setPhoneError("");
    setIsLoading(true);

    try {
      // Fire both requests in parallel — cuts wait time roughly in half
      const [otpResult, statusResult] = await Promise.all([
        sendOTP(phone),
        checkUserStatus(phone),
      ]);

      if (!otpResult.success) {
        throw new Error(otpResult.error?.message || "Failed to send OTP");
      }

      setLastOtpSentAt(Date.now());
      setDevelopmentOtp(otpResult.developmentOtp || "");

      if (!statusResult.success) {
        throw new Error(statusResult.error?.message || "Failed to check user status");
      }

      console.log('🔍 User status check result:', {
        exists: statusResult.exists,
        isComplete: statusResult.isComplete,
        isPhoneVerified: statusResult.isPhoneVerified
      });

      if (statusResult.exists && statusResult.isComplete) {
        toast({
          title: "OTP Sent! 📱",
          description: "Welcome back! Enter the OTP to sign in.",
          duration: 6000,
        });
        setStep("otp-signin");
      } else if (statusResult.exists && !statusResult.isComplete) {
        setIsNewUser(true);
        setStep("signup-form");
        toast({
          title: "OTP Sent! 📱",
          description: "Complete your profile to continue.",
          duration: 6000,
        });
      } else {
        setIsNewUser(true);
        setStep("signup-form");
        toast({
          title: "OTP Sent! 📱",
          description: "Welcome to Toyflix! Create your account to get started.",
          duration: 6000,
        });
      }
    } catch (error: any) {
      console.error('🔍 Smart OTP flow error:', error);
      toast({
        title: "Error",
        description: error.message || "Please try again",
        variant: "destructive",
        duration: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Send OTP after signup form completion
  const handleSendOTPAfterSignup = async () => {
    if (!signupData.firstName || !signupData.lastName) {
      toast({
        title: "Required fields missing",
        description: "Please enter your first and last name",
        variant: "destructive",
        duration: 6000,
      });
      return;
    }

    if (!signupData.pincode) {
      toast({
        title: "Pincode required",
        description: "Please enter your pincode to check service availability",
        variant: "destructive",
        duration: 6000,
      });
      return;
    }

    // Validate pincode for Bangalore delivery
    const pincodeValidation = validateBangalorePincode(signupData.pincode);
    if (!pincodeValidation.isServiceable) {
      toast({
        title: "Service not available",
        description: pincodeValidation.message,
        variant: "destructive",
        duration: 6000,
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔍 Proceeding to OTP verification after signup form completion');
      
      // OTP is already sent, just proceed to verification step
      setStep("otp-signup");
      toast({
        title: "Great! 🎉",
        description: `We deliver to ${pincodeValidation.area}. Please verify your phone number with the OTP sent earlier.`,
        duration: 6000,
      });
    } catch (error: any) {
      console.error('🔍 OTP after signup error:', error);
      toast({
        title: "Error",
        description: error.message || "Please try again",
        variant: "destructive",
        duration: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Updated: Handle OTP verification for signin
  const handleVerifyOTPSignin = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
        duration: 6000,
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔍 Verifying OTP for existing user signin');
      const { success, error, user: verifiedUser, session: verifiedSession } = await verifyOTP(phone, otp);
      
      if (success && verifiedUser && verifiedSession) {
        setAuth(verifiedUser, verifiedSession);
        
        toast({
          title: "Signed in successfully!",
          description: "Welcome back to Toyflix!",
          duration: 6000,
        });
        
        // Check if user came from a specific flow and redirect accordingly
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get('redirect') || '/pricing'; // Existing users go to pricing
        
        navigate(redirectTo, { replace: true });
      } else {
        toast({
          title: "Verification failed",
          description: error?.message || "Invalid OTP. Please try again.",
          variant: "destructive",
          duration: 6000,
        });
      }
    } catch (error: any) {
      console.error('🔍 OTP signin verification error:', error);
      toast({
        title: "Verification failed",
        description: error.message || "Please try again",
        variant: "destructive",
        duration: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Updated: Handle OTP verification for signup
  const handleVerifyOTPSignup = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
        duration: 6000,
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔍 Verifying OTP for new user signup');
      const { success, error, user: verifiedUser, session: verifiedSession } = await verifyOTP(phone, otp);
      
      if (success && verifiedUser && verifiedSession) {
        // Update user profile with signup data
        const { success: updateSuccess, error: updateError, user: updatedUser } = await updateUserProfile(
          signupData.firstName,
          signupData.lastName,
          signupData.pincode
        );
        
        if (updateSuccess && updatedUser) {
          setAuth(updatedUser, { ...verifiedSession, user: updatedUser });
          
          const pincodeValidation = validateBangalorePincode(signupData.pincode);
          toast({
            title: "Account created successfully!",
            description: `Welcome to Toyflix! We deliver to ${pincodeValidation.area}.`,
            duration: 6000,
          });
          
          // Check if user came from a specific flow and redirect accordingly
          const urlParams = new URLSearchParams(window.location.search);
          const redirectTo = urlParams.get('redirect');
          
          if (redirectTo) {
            navigate(redirectTo, { replace: true });
          } else {
            // New users go through signup success page for analytics
            navigate('/auth?from=signup', { replace: true });
          }
        } else {
          toast({
            title: "Profile update failed",
            description: updateError?.message || "Please try again",
            variant: "destructive",
            duration: 6000,
          });
        }
      } else {
        toast({
          title: "Verification failed",
          description: error?.message || "Invalid OTP. Please try again.",
          variant: "destructive",
          duration: 6000,
        });
      }
    } catch (error: any) {
      console.error('🔍 OTP signup verification error:', error);
      toast({
        title: "Verification failed",
        description: error.message || "Please try again",
        variant: "destructive",
        duration: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy functions for compatibility
  const handleResendOTP = async () => {
    if (lastOtpSentAt && Date.now() - lastOtpSentAt < 30000) {
      toast({
        title: "Please wait",
        description: "Please wait 30 seconds before requesting another OTP",
        variant: "destructive",
        duration: 6000,
      });
      return;
    }

    const otpResult = await sendOTP(phone);
    if (otpResult.success) {
      setLastOtpSentAt(Date.now());
      setDevelopmentOtp(otpResult.developmentOtp || "");
      toast({
        title: "OTP Resent!",
        description: "Please check your SMS for the new verification code",
        duration: 6000,
      });
    } else {
      toast({
        title: "Failed to resend OTP",
        description: otpResult.error?.message || "Please try again",
        variant: "destructive",
        duration: 6000,
      });
    }
  };

  const handleBackToMain = () => {
    // Reset to phone input step
    setStep("phone");
  };

  return {
    handleSendOTP,
    handleSendOTPAfterSignup,
    handleVerifyOTPSignin,
    handleVerifyOTPSignup,
    handleResendOTP,
    handleBackToMain,
    isAuthLoading: false // TODO: implement if needed
  };
};
