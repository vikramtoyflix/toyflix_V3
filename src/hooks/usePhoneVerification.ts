
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UsePhoneVerificationProps {
  phone: string;
  onVerificationComplete: () => void;
  verificationOnly?: boolean;
}

export const usePhoneVerification = ({ phone, onVerificationComplete, verificationOnly = false }: UsePhoneVerificationProps) => {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastOtpSentAt, setLastOtpSentAt] = useState<number | null>(null);
  const { toast } = useToast();

  const OTP_COOLDOWN_MS = 30000; // 30 seconds between OTP requests

  const sendOTP = useCallback(async () => {
    // Check cooldown
    if (lastOtpSentAt && Date.now() - lastOtpSentAt < OTP_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((OTP_COOLDOWN_MS - (Date.now() - lastOtpSentAt)) / 1000);
      toast({
        title: "Please wait",
        description: `You can request a new OTP in ${remainingSeconds} seconds`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Sending OTP to phone via edge function:', phone);
      
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone: phone }
      });

      if (error) {
        console.error('Send OTP error:', error);
        toast({
          title: "Failed to send OTP",
          description: "Please try again or contact support",
          variant: "destructive",
        });
        return;
      }

      console.log('OTP send response:', data);
      
      if (data?.development_mode) {
        toast({
          title: "OTP Sent (Development Mode)",
          description: `Verification code sent to ${phone}. Check logs for OTP in development.`,
        });
      } else {
        toast({
          title: "OTP Sent!",
          description: `Verification code sent to ${phone}`,
        });
      }
      
      setOtpSent(true);
      setLastOtpSentAt(Date.now());
    } catch (error: any) {
      console.error('OTP send exception:', error);
      toast({
        title: "Failed to send OTP",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [phone, lastOtpSentAt, toast]);

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      console.log('Verifying OTP via edge function for phone:', phone, 'with OTP:', otp, 'verificationOnly:', verificationOnly);
      
      // Ensure we have an active session when making the call
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session status:', !!session);
      
      if (verificationOnly && !session) {
        toast({
          title: "Authentication required",
          description: "Please sign in again to verify your phone number",
          variant: "destructive",
        });
        setIsVerifying(false);
        return;
      }
      
      // Make the edge function call with proper headers
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { 
          phone: phone,
          otp: otp,
          verificationOnly: verificationOnly 
        },
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      if (error) {
        console.error('OTP verification error:', error);
        toast({
          title: "Verification failed",
          description: error.message || "Invalid or expired OTP",
          variant: "destructive",
        });
        return;
      }

      console.log('OTP verification response:', data);

      if (data?.error) {
        toast({
          title: "Verification failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      // For verification-only mode, we don't need to handle session data
      if (verificationOnly) {
        if (data?.success) {
          toast({
            title: "Phone verified!",
            description: "Your phone number has been verified successfully",
          });
          onVerificationComplete();
        } else {
          toast({
            title: "Verification failed",
            description: "Failed to verify phone number",
            variant: "destructive",
          });
        }
      } else {
        // Original flow for full authentication
        toast({
          title: "Phone verified!",
          description: "Your phone number has been verified successfully",
        });
        onVerificationComplete();
      }
      
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: "Verification failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = () => {
    setOtp("");
    sendOTP();
  };

  return {
    otp,
    setOtp,
    isLoading,
    otpSent,
    isVerifying,
    sendOTP,
    handleVerifyOTP,
    handleResendOTP
  };
};
