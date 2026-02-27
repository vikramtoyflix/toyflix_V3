
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface OTPVerificationStepProps {
  otp: string;
  setOtp: (otp: string) => void;
  phone: string;
  isLoading: boolean;
  onVerifyOTP: () => void;
  onReset: () => void;
  onResendOTP: () => void;
  resendCooldown: number;
}

const OTPVerificationStep = ({
  otp,
  setOtp,
  phone,
  isLoading,
  onVerifyOTP,
  onReset,
  onResendOTP,
  resendCooldown
}: OTPVerificationStepProps) => {
  return <>
      <div>
        <Label htmlFor="otp">Enter OTP</Label>
        <div className="flex justify-center mt-2">
          <InputOTP value={otp} onChange={value => setOtp(value)} maxLength={6} disabled={isLoading}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <p className="text-sm text-muted-foreground mt-2 text-center">
          Code sent to +91{phone}
        </p>
      </div>
      
      <Button onClick={onVerifyOTP} disabled={isLoading || otp.length !== 6} className="w-full bg-fun-green hover:bg-fun-green/90 bg-lime-500 hover:bg-lime-400 text-zinc-950">
        {isLoading ? "Verifying..." : "Verify & Continue"}
      </Button>
      
      <div className="flex justify-between items-center text-sm">
        <Button variant="link" onClick={onReset} disabled={isLoading} className="p-0 h-auto">
          Change Phone Number
        </Button>
        <Button
          variant="link"
          onClick={onResendOTP}
          disabled={isLoading || resendCooldown > 0}
          className="p-0 h-auto"
        >
          {resendCooldown > 0
            ? `Resend OTP in ${resendCooldown}s`
            : "Resend OTP"}
        </Button>
      </div>
    </>;
};

export default OTPVerificationStep;
