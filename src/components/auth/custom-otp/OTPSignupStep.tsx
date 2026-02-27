import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Phone, User, MapPin } from "lucide-react";
import { SignupData } from "./types";
import { validateBangalorePincode } from "@/utils/pincodeValidation";

interface OTPSignupStepProps {
  phone: string;
  signupData: SignupData;
  otp: string;
  setOtp: (otp: string) => void;
  isLoading: boolean;
  developmentOtp: string;
  resendCooldown: number;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
}

const OTPSignupStep = ({
  phone,
  signupData,
  otp,
  setOtp,
  isLoading,
  developmentOtp,
  resendCooldown,
  onVerify,
  onResend,
  onBack
}: OTPSignupStepProps) => {
  const pincodeValidation = validateBangalorePincode(signupData.pincode);

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

      {/* Signup Context */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Almost there!</h3>
        <p className="text-sm text-muted-foreground">
          Just verify your phone number to complete your account
        </p>
      </div>

      {/* Account Summary */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {signupData.firstName} {signupData.lastName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">{phone}</span>
          </div>
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">{signupData.pincode}</span>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-300">
              {pincodeValidation.area}
            </Badge>
          </div>
        </div>
      </div>

      {/* OTP Instruction */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-green-600" />
          <span className="text-sm font-semibold text-green-800">OTP Sent</span>
        </div>
        <p className="text-sm text-green-700">
          We've sent a 6-digit verification code to your phone number. Please enter it below to create your account.
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
            Creating account...
          </div>
        ) : (
          "Create Account"
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

export default OTPSignupStep; 