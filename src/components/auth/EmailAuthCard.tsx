
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

interface EmailAuthCardProps {
  isLogin: boolean;
  children: React.ReactNode;
}

const EmailAuthCard = ({ isLogin, children }: EmailAuthCardProps) => {
  const { t } = useLanguage();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="text-2xl font-bold text-primary mb-2">{t('toyflix')}</div>
        <CardTitle>{isLogin ? t('welcomeBack') : t('createAccount')}</CardTitle>
        <CardDescription>
          {isLogin ? t('signInDesc') : 'Create your account and verify your phone for updates'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

export default EmailAuthCard;
