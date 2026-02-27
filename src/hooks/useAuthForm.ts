
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  agreeToTerms: boolean;
}

interface FormErrors {
  passwordMismatch: boolean;
  termsNotAgreed: boolean;
}

export const useAuthForm = () => {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    agreeToTerms: false
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({
    passwordMismatch: false,
    termsNotAgreed: false
  });

  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear validation errors when user starts typing
    if (name === 'confirmPassword' || name === 'password') {
      setFormErrors(prev => ({ ...prev, passwordMismatch: false }));
    }
  };

  const validateSignupForm = () => {
    const errors = {
      passwordMismatch: false,
      termsNotAgreed: false
    };

    if (formData.password !== formData.confirmPassword) {
      errors.passwordMismatch = true;
      toast({
        title: "Password mismatch",
        description: "Passwords do not match. Please check and try again.",
        variant: "destructive",
      });
    }

    if (!formData.agreeToTerms) {
      errors.termsNotAgreed = true;
      toast({
        title: "Terms required",
        description: "Please agree to the terms and conditions to continue.",
        variant: "destructive",
      });
    }

    setFormErrors(errors);
    return !errors.passwordMismatch && !errors.termsNotAgreed;
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      phone: "",
      agreeToTerms: false
    });
    setFormErrors({
      passwordMismatch: false,
      termsNotAgreed: false
    });
  };

  return {
    formData,
    setFormData,
    formErrors,
    handleInputChange,
    validateSignupForm,
    resetForm
  };
};
