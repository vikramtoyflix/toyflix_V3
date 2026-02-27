import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { verifyOTP } from "./otpService";
import { useCustomAuth } from "@/hooks/useCustomAuth";

export const useOtpVerificationActions = (
  phone: string,
  otp: string,
  setStep: (step: any) => void,
  setIsNewUser: (isNew: boolean) => void,
  setIsLoading: (loading: boolean) => void
) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setAuth } = useCustomAuth();

  const handleVerifyOTP = async () => {
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
      console.log('🔍 Starting OTP verification for phone:', phone);
      const { success, error, user: verifiedUser, session: verifiedSession } = await verifyOTP(phone, otp);
      
      console.log('🔍 OTP verification result:', { success, error: error?.message, userExists: !!verifiedUser });
      
      if (success && verifiedUser && verifiedSession) {
        console.log('🔍 User data received:', {
          id: verifiedUser.id,
          phone: verifiedUser.phone,
          first_name: verifiedUser.first_name,
          last_name: verifiedUser.last_name,
          phone_verified: verifiedUser.phone_verified
        });
        
        // Update the auth context immediately
        setAuth(verifiedUser, verifiedSession);

        const isProfileComplete = verifiedUser.first_name && verifiedUser.last_name;
        console.log('🔍 Profile completeness check:', {
          first_name: verifiedUser.first_name,
          last_name: verifiedUser.last_name,
          isProfileComplete
        });

        if (isProfileComplete) {
          console.log('🔍 Existing user - signing in directly');
          toast({
            title: "Signed in successfully!",
            description: "Welcome back to Toyflix!",
            duration: 6000,
          });
          
          // Check if user came from a specific flow and redirect accordingly
          const urlParams = new URLSearchParams(window.location.search);
          const redirectTo = urlParams.get('redirect');
          
          if (redirectTo) {
            navigate(redirectTo, { replace: true });
          } else {
            // Existing users go to pricing, new users handled elsewhere
            navigate('/pricing', { replace: true });
          }
        } else {
          // New user or incomplete profile
          console.log('🔍 New user or incomplete profile - going to signup');
          setIsNewUser(true);
          setStep("signup");
          toast({
            title: "Verification successful!",
            description: "Please complete your profile to continue.",
            duration: 6000,
          });
        }
      } else {
        console.error('🔍 OTP verification failed:', error);
        toast({
          title: "Verification failed",
          description: error?.message || "Invalid OTP. Please try again.",
          variant: "destructive",
          duration: 6000,
        });
      }
    } catch (error: any) {
      console.error('🔍 OTP verification error:', error);
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

  return {
    handleVerifyOTP
  };
};
