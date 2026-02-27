
import { useToast } from "@/hooks/use-toast";
import { sendOTP } from "./otpService";
import { validatePhoneNumber } from "./validation";

const OTP_COOLDOWN_MS = 30000; // 30 seconds

export const useOtpRequestActions = (
  phone: string,
  setIsLoading: (loading: boolean) => void,
  setPhoneError: (error: string) => void,
  setDevelopmentOtp: (otp: string) => void,
  lastOtpSentAt: number | null,
  setLastOtpSentAt: (timestamp: number | null) => void,
  setStep: (step: any) => void,
  authLoading: boolean
) => {
  const { toast } = useToast();

  const canRequestOTP = () => {
    // Don't allow OTP requests while auth is still loading
    if (authLoading) {
      toast({
        title: "Please wait",
        description: "Initializing authentication system...",
        variant: "default",
      });
      return false;
    }

    if (lastOtpSentAt && Date.now() - lastOtpSentAt < OTP_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((OTP_COOLDOWN_MS - (Date.now() - lastOtpSentAt)) / 1000);
      toast({
        title: "Please wait",
        description: `You can request a new OTP in ${remainingSeconds} seconds.`,
        variant: "default",
      });
      return false;
    }
    return true;
  };

  const _sendOTP = async (retryCount = 0) => {
    const maxRetries = 2;
    
    setIsLoading(true);
    try {
      const { success, error, developmentOtp } = await sendOTP(phone);
      if (success) {
        setLastOtpSentAt(Date.now());
        setDevelopmentOtp(developmentOtp || "");
        return true;
      } else {
        // Check if this might be a transient auth state issue
        if (retryCount < maxRetries && (error?.message?.includes('auth') || error?.message?.includes('session'))) {
          console.log(`OTP send failed, retrying... (${retryCount + 1}/${maxRetries})`);
          // Wait a bit for auth state to stabilize
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return await _sendOTP(retryCount + 1);
        }
        
        toast({
          title: "Failed to send OTP",
          description: error?.message || "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error('Unexpected error in _sendOTP:', error);
      
      // Retry for network or transient errors
      if (retryCount < maxRetries) {
        console.log(`OTP send failed with exception, retrying... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return await _sendOTP(retryCount + 1);
      }
      
      toast({
        title: "Failed to send OTP",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    const validation = validatePhoneNumber(phone);
    if (!validation.isValid) {
      setPhoneError(validation.error);
      toast({ title: "Invalid phone number", description: validation.error, variant: "destructive" });
      return;
    }
    if (!canRequestOTP()) return;

    const sent = await _sendOTP();
    if (sent) {
      toast({ title: "OTP Sent Successfully", description: "Please check your phone for the verification code" });
      setStep("otp");
    }
  };
  
  const handleResendOTP = async () => {
    if (!canRequestOTP()) return;
    const sent = await _sendOTP();
    if (sent) {
      toast({ title: "OTP Resent", description: "A new OTP has been sent." });
    }
  };

  return {
    handleSendOTP,
    handleResendOTP
  };
};
