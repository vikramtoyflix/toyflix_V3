
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

interface PhoneVerificationCardProps {
  phone: string;
  children: React.ReactNode;
}

const PhoneVerificationCard = ({ phone, children }: PhoneVerificationCardProps) => {
  const { t } = useLanguage();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="text-2xl font-bold text-primary mb-2">{t('toyflix')}</div>
        <CardTitle>Verify Your Phone Number</CardTitle>
        <CardDescription>
          Enter the OTP sent to {phone} to complete your account setup
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
};

export default PhoneVerificationCard;
