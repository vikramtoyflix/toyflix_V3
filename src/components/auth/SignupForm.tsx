
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/contexts/LanguageContext";

interface SignupFormProps {
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone: string;
    agreeToTerms: boolean;
  };
  setFormData: (data: any) => void;
  formErrors: {
    passwordMismatch: boolean;
    termsNotAgreed: boolean;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSubmitting: boolean;
}

const SignupForm = ({ formData, setFormData, formErrors, handleInputChange, isSubmitting }: SignupFormProps) => {
  const { t } = useLanguage();

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">{t('firstName')}</Label>
          <Input
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            required
            disabled={isSubmitting}
          />
        </div>
        <div>
          <Label htmlFor="lastName">{t('lastName')}</Label>
          <Input
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Label htmlFor="phone">{t('phoneNumber')}</Label>
        <div className="flex">
          <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0 border-input">
            <span className="text-sm text-muted-foreground">+91</span>
          </div>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="9876543210"
            value={formData.phone}
            onChange={(e) => {
              const cleanedValue = e.target.value.replace(/\D/g, '').slice(0, 10);
              handleInputChange({
                ...e,
                target: { ...e.target, name: 'phone', value: cleanedValue }
              });
            }}
            className="rounded-l-none"
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleInputChange}
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          required
          disabled={isSubmitting}
          className={formErrors.passwordMismatch ? "border-red-500" : ""}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="agreeToTerms"
          checked={formData.agreeToTerms}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, agreeToTerms: checked as boolean })
          }
          disabled={isSubmitting}
          className={formErrors.termsNotAgreed ? "border-red-500" : ""}
        />
        <Label htmlFor="agreeToTerms" className="text-sm">
          {t('agreeTerms')}
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t('processing') : t('createAccount')}
      </Button>
    </>
  );
};

export default SignupForm;
