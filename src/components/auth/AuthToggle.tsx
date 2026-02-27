
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface AuthToggleProps {
  isLogin: boolean;
  setIsLogin: (isLogin: boolean) => void;
  isSubmitting: boolean;
}

const AuthToggle = ({ isLogin, setIsLogin, isSubmitting }: AuthToggleProps) => {
  const { t } = useLanguage();

  return (
    <div className="mt-6 text-center">
      <p className="text-sm text-muted-foreground">
        {isLogin ? t('dontHaveAccount') : t('alreadyHaveAccount')}
        <Button
          variant="link"
          onClick={() => setIsLogin(!isLogin)}
          className="p-0 ml-1 h-auto"
          disabled={isSubmitting}
        >
          {isLogin ? t('signUp') : t('signIn')}
        </Button>
      </p>
    </div>
  );
};

export default AuthToggle;
