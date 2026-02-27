import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MessageSquare, Phone } from "lucide-react";

interface OTPSigninStepProps {
  phone: string;
  otp: string;
  setOtp: (otp: string) => void;
  isLoading: boolean;
  developmentOtp: string;
  resendCooldown: number;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
}

const OTPSigninStep = ({
  phone,
  otp,
  setOtp,
  isLoading,
  developmentOtp,
  resendCooldown,
  onVerify,
  onResend,
  onBack
}: OTPSigninStepProps) => {
  return (
    <>
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="mb-4 -ml-2"
        disabled={isLoading}
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back
      </Button>

      {/* Signin Context */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Welcome back!</h3>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Phone className="w-4 h-4" />
          <span>Signing in with {phone}</span>
        </div>
      </div>

      {/* OTP Instruction */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-green-600" />
          <span className="text-sm font-semibold text-green-800">OTP Sent</span>
        </div>
        <p className="text-sm text-green-700">
          We've sent a 6-digit verification code to your phone number. Please enter it below to sign in.
        </p>
      </div>

      <div>
        <Label htmlFor="otp">Enter 6-digit OTP</Label>
        <Input
          id="otp"
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          disabled={isLoading}
          placeholder=""
          maxLength={6}
          className="text-center text-lg font-mono tracking-wider"
        />
        
        {/* Development OTP Display */}
        {developmentOtp && (
          <p className="mt-2 text-sm text-center text-muted-foreground bg-yellow-50 border border-yellow-200 rounded p-2">
            Development OTP: <span className="font-mono font-bold">{developmentOtp}</span>
          </p>
        )}
      </div>

      <Button 
        onClick={onVerify}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-base"
        disabled={isLoading || otp.length !== 6}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Signing in...
          </div>
        ) : (
          "Sign In"
        )}
      </Button>

      {/* Debug info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        OTP Status: {otp.length === 6 ? '✅ Ready' : `❌ Need ${6 - otp.length} more digits`} | 
        Loading: {isLoading ? '⏳' : '🟢'}
      </div>

      {/* Resend OTP */}
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onResend}
          disabled={isLoading || resendCooldown > 0}
          className="text-sm"
        >
          {resendCooldown > 0 
            ? `Resend OTP in ${resendCooldown}s` 
            : "Resend OTP"
          }
        </Button>
      </div>
    </>
  );
};

export default OTPSigninStep; 