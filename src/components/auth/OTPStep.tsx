
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

interface OTPStepProps {
  otp: string;
  setOtp: (otp: string) => void;
  onVerifyOTP: () => void;
  onReset: () => void;
  isLoading: boolean;
  developmentOtp?: string | null;
}

const OTPStep = ({ otp, setOtp, onVerifyOTP, onReset, isLoading }: OTPStepProps) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="otp">{t('enterOtp')}</Label>
        <div className="flex justify-center mt-2">
          <InputOTP
            value={otp}
            onChange={(value) => setOtp(value)}
            maxLength={6}
            disabled={isLoading}
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
      </div>
      <Button 
        onClick={onVerifyOTP} 
        className="w-full bg-fun-green hover:bg-fun-green/90"
        disabled={isLoading || otp.length !== 6}
      >
        {isLoading ? t('verifying') : t('verifyOtp')}
      </Button>
      <Button 
        variant="outline" 
        onClick={onReset}
        className="w-full"
        disabled={isLoading}
      >
        {t('newNumber')}
      </Button>
    </div>
  );
};

export default OTPStep;
