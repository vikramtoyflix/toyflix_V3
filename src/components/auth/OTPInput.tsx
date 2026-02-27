
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

interface OTPInputProps {
  otp: string;
  setOtp: (value: string) => void;
  isLoading: boolean;
  isVerifying: boolean;
  otpSent: boolean;
}

const OTPInput = ({ otp, setOtp, isLoading, isVerifying, otpSent }: OTPInputProps) => {
  if (!otpSent) {
    return (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Please send the verification code first
        </p>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor="otp">Enter OTP</Label>
      <div className="flex justify-center mt-2">
        <InputOTP
          value={otp}
          onChange={(value) => setOtp(value)}
          maxLength={6}
          disabled={isLoading || isVerifying}
        >
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
        Enter the 6-digit code sent to your phone
      </p>
    </div>
  );
};

export default OTPInput;
