
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import AuthToggle from "./AuthToggle";

interface EmailAuthContentProps {
  isLogin: boolean;
  setIsLogin: (value: boolean) => void;
  isSubmitting: boolean;
  formData: any;
  setFormData: (data: any) => void;
  formErrors: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleGoBack: () => void;
}

const EmailAuthContent = ({
  isLogin,
  setIsLogin,
  isSubmitting,
  formData,
  setFormData,
  formErrors,
  handleInputChange,
  handleSubmit,
  handleGoBack
}: EmailAuthContentProps) => {
  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isLogin ? (
          <LoginForm
            formData={formData}
            handleInputChange={handleInputChange}
            isSubmitting={isSubmitting}
          />
        ) : (
          <SignupForm
            formData={formData}
            setFormData={setFormData}
            formErrors={formErrors}
            handleInputChange={handleInputChange}
            isSubmitting={isSubmitting}
          />
        )}
      </form>

      <AuthToggle
        isLogin={isLogin}
        setIsLogin={setIsLogin}
        isSubmitting={isSubmitting}
      />

      <Button 
        variant="outline" 
        onClick={handleGoBack}
        className="w-full mt-4 flex items-center justify-center space-x-2"
        disabled={isSubmitting}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Go Back to Home</span>
      </Button>
    </>
  );
};

export default EmailAuthContent;
