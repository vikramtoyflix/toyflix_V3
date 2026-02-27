
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PhoneVerificationActionsProps {
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
  isLoading: boolean;
  isVerifying: boolean;
  otpLength: number;
}

const PhoneVerificationActions = ({
  onVerify,
  onResend,
  onBack,
  isLoading,
  isVerifying,
  otpLength
}: PhoneVerificationActionsProps) => {
  return (
    <>
      <Button 
        onClick={onVerify} 
        className="w-full bg-fun-green hover:bg-fun-green/90"
        disabled={isLoading || isVerifying || otpLength !== 6}
      >
        {isVerifying ? "Verifying..." : "Verify Phone Number"}
      </Button>

      <Button 
        variant="outline" 
        onClick={onResend}
        className="w-full"
        disabled={isLoading || isVerifying}
      >
        Resend OTP
      </Button>
      
      <Button 
        variant="outline" 
        onClick={onBack}
        className="w-full flex items-center justify-center space-x-2"
        disabled={isLoading || isVerifying}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Sign Up</span>
      </Button>
    </>
  );
};

export default PhoneVerificationActions;
