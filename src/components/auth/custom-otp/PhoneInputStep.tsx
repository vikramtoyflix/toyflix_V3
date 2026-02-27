import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhoneInputStepProps {
  phone: string;
  setPhone: (phone: string) => void;
  phoneError: string;
  setPhoneError?: (error: string) => void;
  isLoading: boolean;
  onSendOTP: () => void;
}

const PhoneInputStep = ({
  phone,
  setPhone,
  phoneError,
  setPhoneError,
  isLoading,
  onSendOTP
}: PhoneInputStepProps) => {
  console.log('PhoneInputStep rendering:', {
    phone,
    phoneError,
    isLoading
  });

  const isButtonDisabled = isLoading || phone.length !== 10;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <div className="flex">
          <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0 border-input">
            <span className="text-sm text-muted-foreground">+91</span>
          </div>
          <Input 
            id="phone" 
            type="tel" 
            placeholder=""
            value={phone} 
            onChange={e => {
              const newPhone = e.target.value.replace(/\D/g, '').slice(0, 10);
              setPhone(newPhone);
              // Clear error when user starts typing (if setPhoneError is provided)
              if (phoneError && setPhoneError) setPhoneError("");
            }} 
            className={`rounded-l-none ${phoneError ? 'border-red-500' : ''}`} 
            disabled={isLoading} 
          />
        </div>
        {phoneError && <p className="text-sm text-red-500 mt-1">{phoneError}</p>}
        {phone.length > 0 && phone.length < 10 && !phoneError && (
          <p className="text-sm text-muted-foreground mt-1">
            Please enter {10 - phone.length} more digit{10 - phone.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      
      <div className="w-full">
        <Button 
          onClick={() => {
            console.log('Send OTP button clicked');
            onSendOTP();
          }} 
          disabled={isButtonDisabled} 
          type="button" 
          className="w-full bg-fun-orange hover:bg-fun-orange/90 transition-all duration-200 font-medium text-zinc-950 bg-lime-400 hover:bg-lime-300"
        >
          {isLoading ? "Sending OTP..." : "Send OTP"}
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          We'll send OTP and check your account status
        </p>
      </div>
    </div>
  );
};

export default PhoneInputStep;
