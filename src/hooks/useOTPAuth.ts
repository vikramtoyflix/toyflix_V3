
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export const useOTPAuth = () => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const sendOTP = async () => {
    if (!phone || phone.length !== 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${phone}`,
        options: {
          shouldCreateUser: true,
        }
      });

      if (error) {
        console.error('Send OTP error:', error);
        toast({
          title: "Failed to send OTP",
          description: error.message || "Please try again",
          variant: "destructive",
        });
        return;
      }

      console.log('OTP sent successfully via Supabase native auth');
      
      // Track OTP request
      try {
        if (typeof window !== 'undefined' && window.cbq) {
          window.cbq('track', 'SendOTP', {
            phone: `+91${phone}`,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }
      
      toast({
        title: "OTP sent!",
        description: "Please check your SMS for the verification code. Valid for 10 minutes.",
      });
      
      setStep("otp");
    } catch (error: any) {
      console.error('Send OTP exception:', error);
      toast({
        title: "Failed to send OTP",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Verifying OTP for phone:', `+91${phone}`, 'with OTP:', otp);
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: `+91${phone}`,
        token: otp,
        type: 'sms'
      });

      if (error) {
        console.error('Verify OTP error:', error);
        toast({
          title: "Verification failed",
          description: error.message || "Invalid or expired OTP",
          variant: "destructive",
        });
        return;
      }

      console.log('OTP verification successful:', data);

      // Track OTP verification success
      try {
        if (typeof window !== 'undefined' && window.cbq) {
          window.cbq('track', 'CompleteRegistration', {
            user_id: data.user?.id,
            phone: `+91${phone}`,
            registration_method: 'otp',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }

      // Check if user has complete profile
      if (data.user) {
        const { data: profile } = await supabase
          .from('custom_users')
          .select('first_name, last_name, phone_verified')
          .eq('id', data.user.id)
          .single();

        console.log('User profile:', profile);

        if (!profile || !profile.first_name) {
          console.log('Redirecting to profile setup');
          navigate(`/auth?action=signup&phone=${encodeURIComponent(`+91${phone}`)}`, { replace: true });
        } else {
          console.log('Redirecting to dashboard');
          navigate("/dashboard", { replace: true });
        }
      }

      toast({
        title: "Verification successful!",
        description: "Welcome to Toyflix!",
      });
    } catch (error: any) {
      console.error('Verify OTP exception:', error);
      toast({
        title: "Verification failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setStep("phone");
    setOtp("");
    setPhone("");
  };

  return {
    phone,
    setPhone,
    otp,
    setOtp,
    step,
    isLoading,
    developmentOtp: null, // No longer needed with native auth
    sendOTP,
    verifyOTP,
    resetFlow,
  };
};
