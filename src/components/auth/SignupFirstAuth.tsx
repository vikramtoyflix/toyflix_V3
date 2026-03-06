import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { validateBangalorePincode, formatPincode } from "@/utils/pincodeValidation";
import { useHybridAuth } from "@/hooks/useHybridAuth";
import { useToast } from "@/hooks/use-toast";
import { checkUserExistsForSmartLogin, checkUserStatus, completeUserProfile } from "@/components/auth/custom-otp/otpService";
import { useCustomAuth } from "@/hooks/useCustomAuth";

interface SignupFirstAuthProps {
  onClose?: () => void;
}

type AuthMode = "signup" | "signin";

const SignupFirstAuth = ({ onClose }: SignupFirstAuthProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Check if user came from subscription flow
  const redirectParam = searchParams.get('redirect');
  const isFromSubscriptionFlow = redirectParam && decodeURIComponent(redirectParam).includes('/subscription-flow');
  
  // Get mode from URL params, default to signup
  const [mode, setMode] = useState<AuthMode>(() => {
    const urlMode = searchParams.get('mode');
    return (urlMode === 'signin' ? 'signin' : 'signup') as AuthMode;
  });
  
  const [pincodeValidation, setPincodeValidation] = useState<any>(null);
  const [showOTPField, setShowOTPField] = useState(false);
  const [isOTPSent, setIsOTPSent] = useState(false);
  const [isOTPVerified, setIsOTPVerified] = useState(false);

  // Use the hybrid auth hook
  const {
    isLoading,
    sendHybridOTP,
    verifyHybridOTP
  } = useHybridAuth();

  // Get setAuth from custom auth
  const { setAuth } = useCustomAuth();

  // Local state for form management
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    pincode: ""
  });
  const [phoneError, setPhoneError] = useState("");
  const [developmentOtp, setDevelopmentOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [incompleteUser, setIncompleteUser] = useState<any>(null);
  
  // Add state to prevent duplicate verification calls
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCompleted, setVerificationCompleted] = useState(false);

  // Enhanced phone number normalization function
  const normalizePhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/[^\d]/g, '');
    
    // If it starts with 91 and has 12 digits, remove the 91
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
      return digitsOnly.slice(2);
    }
    
    // If it has more than 10 digits, take the last 10
    if (digitsOnly.length > 10) {
      return digitsOnly.slice(-10);
    }
    
    return digitsOnly;
  };

  // Update URL when mode changes
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (mode === 'signup') {
      newSearchParams.delete('mode');
    } else {
      newSearchParams.set('mode', mode);
    }
    
    const newUrl = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [mode, searchParams]);

  const handlePincodeChange = (value: string) => {
    const formatted = formatPincode(value);
    setSignupData({ ...signupData, pincode: formatted });
    
    if (formatted.length === 6) {
      const validation = validateBangalorePincode(formatted);
      setPincodeValidation(validation);
    } else {
      setPincodeValidation(null);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhone = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(newPhone);
    
    // Reset OTP state when phone changes
    if (newPhone !== phone) {
      setShowOTPField(false);
      setIsOTPSent(false);
      setIsOTPVerified(false);
      setOtp("");
      setIsVerifying(false);
      setVerificationCompleted(false);
      setIncompleteUser(null);
    }
  };

  const isPhoneValid = () => {
    return phone.length === 10;
  };

  const handleSendOTP = async () => {
    if (!isPhoneValid()) {
      toast({
        title: "Please enter a valid phone number",
        description: "Enter your 10-digit mobile number to continue.",
        variant: "destructive",
        duration: 6000,
      });
      return;
    }

    setShowOTPField(true);
    
    try {
      const normalizedPhone = normalizePhoneNumber(phone);

      // Fire OTP send and user status check in parallel — cuts wait time in half
      const [result, statusResult] = await Promise.all([
        sendHybridOTP(normalizedPhone),
        checkUserStatus(normalizedPhone),
      ]);
      
      // Only suggest sign-in when user chose signup but we detect an existing complete account.
      // Never switch signin → signup: respect user's choice when they clicked "Sign in".
      if (statusResult.success && mode === 'signup' && statusResult.exists && statusResult.isComplete) {
        setMode('signin');
      }

      if (result.success) {
        setIsOTPSent(true);
        if (result.developmentOtp) {
          setDevelopmentOtp(result.developmentOtp);
        }
        toast({
          title: "OTP Sent! 📱",
          description: "Please enter the OTP sent to your phone.",
          duration: 6000,
        });
      } else {
        setShowOTPField(false);
        setPhoneError(result.error || "Failed to send OTP");
        toast({
          title: "Failed to send OTP",
          description: result.error || "Please try again.",
          variant: "destructive",
          duration: 6000,
        });
      }
    } catch (error) {
      console.error('🔍 OTP send failed:', error);
      setShowOTPField(false);
      toast({
        title: "Error",
        description: "Failed to check user status. Please try again.",
        variant: "destructive",
        duration: 6000,
      });
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Please enter the complete OTP",
        description: "Enter the 6-digit OTP sent to your phone.",
        variant: "destructive",
        duration: 6000,
      });
      return;
    }

    // Prevent duplicate verification calls
    if (isVerifying || verificationCompleted) {
      console.log('🔍 Verification already in progress or completed, skipping...');
      return;
    }

    setIsVerifying(true);

    try {
      // Use normalized phone for OTP verification as well
      const normalizedPhone = normalizePhoneNumber(phone);
      console.log('🔍 Starting OTP verification for phone:', phone, '→ Normalized:', normalizedPhone, 'mode:', mode);
      const result = await verifyHybridOTP(normalizedPhone, otp, mode);
      console.log('🔍 OTP verification result:', result);
      
      if (result.success && result.otpVerified) {
        setIsOTPVerified(true);
        setVerificationCompleted(true);
        
        if (result.profileComplete) {
          console.log('🔍 OTP verified and profile complete - user authenticated');
          toast({
            title: "Welcome! 🎉",
            description: "Successfully signed in to your account.",
            duration: 6000,
          });
          navigate('/dashboard', { replace: true });
        } else {
          // Handle incomplete profile based on mode
          if (mode === 'signin') {
            console.log('🔍 SIGNIN MODE - OTP verified, user authenticated even with incomplete profile');
            toast({
              title: "Welcome Back! 🎉",
              description: "Successfully signed in to your account.",
              duration: 6000,
            });
            navigate('/dashboard', { replace: true });
          } else {
            console.log('🔍 SIGNUP MODE - OTP verified but profile incomplete - staying on signup form');
            // Store the incomplete user info for profile completion
            setIncompleteUser(result.user);
            toast({
              title: "OTP Verified! ✅",
              description: "Please complete your profile to finish registration.",
              duration: 6000,
            });
            // Stay on the form for profile completion
          }
        }
      } else {
        // Only show error toast if result indicates a clear failure
        if (result && result.error) {
          console.error('🔍 OTP verification failed:', result.error);
          toast({
            title: "Verification failed",
            description: result.error || "Invalid OTP",
            variant: "destructive",
            duration: 6000,
          });
        }
      }
    } catch (error) {
      console.error('🔍 OTP verification exception:', error);
      toast({
        title: "Verification failed",
        description: "An error occurred during verification. Please try again.",
        variant: "destructive",
        duration: 6000,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinalRegistration = async () => {
    // Check form validation based on current state
    if (incompleteUser && isOTPVerified) {
      // Profile completion validation
      if (!isSignupFormValid()) {
        toast({
          title: "Please complete all required fields",
          description: "Make sure to fill in your name and valid Bangalore pincode.",
          variant: "destructive",
          duration: 6000,
        });
        return;
      }
    } else if (mode === 'signup') {
      // Signup mode - validate all fields including OTP
      if (!isSignupFormValid()) {
        toast({
          title: "Please complete all required fields",
          description: "Make sure to enter OTP, your name, and valid Bangalore pincode.",
          variant: "destructive",
          duration: 6000,
        });
        return;
      }
    }
    
    // If we have an incomplete user (OTP verified but profile incomplete), complete the profile
    if (incompleteUser && isOTPVerified) {
      console.log('🔍 Completing profile for user:', incompleteUser.id);
      try {
        const result = await completeUserProfile(
          incompleteUser.id,
          signupData.firstName,
          signupData.lastName,
          signupData.email || undefined,
          signupData.pincode || undefined
        );
        
        if (result.success) {
          // CRITICAL: Set authentication state after profile completion
          setAuth(result.user, result.session);
          
          toast({
            title: "Registration Complete! 🎉",
            description: "Your profile has been completed successfully. Welcome to ToyFlix!",
            duration: 6000,
          });
          console.log('🔍 Profile completed successfully, user authenticated');
          
          // Redirect to toys page with signup parameter
          setTimeout(() => {
            navigate('/auth?from=signup', { replace: true });
          }, 1500);
        } else {
          toast({
            title: "Registration failed",
            description: result.error?.message || "Failed to complete registration",
            variant: "destructive",
            duration: 6000,
          });
        }
      } catch (error) {
        console.error('🔍 Profile completion error:', error);
        toast({
          title: "Registration failed",
          description: "An error occurred during registration. Please try again.",
          variant: "destructive",
          duration: 6000,
        });
      }
    } else if (mode === 'signup') {
      // New signup flow - verify OTP and complete registration in one step
      console.log('🔍 Starting combined OTP verification and registration');
      try {
        const normalizedPhone = normalizePhoneNumber(phone);
        const result = await verifyHybridOTP(normalizedPhone, otp, mode);
        console.log('🔍 OTP verification result:', result);
        
        if (result.success && result.otpVerified) {
          setIsOTPVerified(true);
          
          if (result.profileComplete) {
            console.log('🔍 OTP verified and profile complete - user authenticated');
            toast({
              title: "Welcome! 🎉",
              description: "Successfully signed in to your account.",
              duration: 6000,
            });
            
            // Redirect to toys page with signup parameter
            setTimeout(() => {
              navigate('/auth?from=signup', { replace: true });
            }, 1500);
          } else {
            console.log('🔍 OTP verified but profile incomplete - completing profile');
            // Complete the profile immediately
            const profileResult = await completeUserProfile(
              result.user?.id || '',
              signupData.firstName,
              signupData.lastName,
              signupData.email || undefined,
              signupData.pincode || undefined
            );
            
            if (profileResult.success) {
              // CRITICAL: Set authentication state after profile completion
              setAuth(profileResult.user, profileResult.session);
              
              toast({
                title: "Registration Complete! 🎉",
                description: "Your profile has been completed successfully. Welcome to ToyFlix!",
                duration: 6000,
              });
              console.log('🔍 Profile completed successfully, user authenticated');
              
              // Redirect to toys page with signup parameter
              setTimeout(() => {
                navigate('/auth?from=signup', { replace: true });
              }, 1500);
            } else {
              toast({
                title: "Registration failed",
                description: profileResult.error?.message || "Failed to complete registration",
                variant: "destructive",
                duration: 6000,
              });
            }
          }
        } else {
          console.error('🔍 OTP verification failed:', result.error);
          toast({
            title: "Verification failed",
            description: result.error || "Invalid OTP",
            variant: "destructive",
            duration: 6000,
          });
        }
      } catch (error) {
        console.error('🔍 Combined registration error:', error);
        toast({
          title: "Registration failed",
          description: "An error occurred during registration. Please try again.",
          variant: "destructive",
          duration: 6000,
        });
      }
    } else {
      // For signin mode, just verify OTP (but only if not already completed)
      if (!verificationCompleted && !isVerifying) {
        await handleVerifyOTP();
      }
    }
  };

  const isSignupFormValid = () => {
    return (
      phone.length === 10 &&
      showOTPField && // OTP field is shown (OTP was sent)
      otp.length === 6 && // OTP is entered
      signupData.firstName.trim() && 
      signupData.lastName.trim() && 
      pincodeValidation?.isServiceable
    );
  };

  const isSigninFormValid = () => {
    // If user has incomplete profile, use signup validation for profile completion
    if (isOTPVerified && incompleteUser) {
      return isSignupFormValid();
    }
    // For signin mode, need phone and OTP input
    if (showOTPField) {
      return phone.length === 10 && otp.length === 6;
    }
    // Otherwise, just need phone
    return phone.length === 10;
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setShowOTPField(false);
    setIsOTPSent(false);
    setIsOTPVerified(false);
    setOtp("");
    setIsVerifying(false);
    setVerificationCompleted(false);
    setIncompleteUser(null);
  };

  const handleResendOTPClick = async () => {
    if (resendCooldown > 0) return;
    
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      const result = await sendHybridOTP(normalizedPhone);
      if (result.success) {
        toast({
          title: "OTP Resent",
          description: `New OTP sent to +91 ${phone}`,
          duration: 6000,
        });
        if (result.developmentOtp) {
          setDevelopmentOtp(result.developmentOtp);
        }
      }
    } catch (error) {
      console.error('Resend OTP failed:', error);
    }
  };

  const handleGoBack = () => {
    if (onClose) {
      // If this is a modal/overlay, close it
      onClose();
    } else {
      // Always use browser back navigation instead of trying to go to protected routes
      // This prevents the auth loop when redirect target requires authentication
      window.history.back();
    }
  };

  const RequiredStar = () => <span className="text-red-500">*</span>;

  const renderSignupForm = () => (
    <div className="space-y-5">
      {/* Phone */}
      <div>
        <label htmlFor="phone" className="text-sm font-medium text-foreground mb-1.5 block">
          Mobile number <RequiredStar />
        </label>
        <div className="flex gap-2">
        <div className="flex flex-1">
          <div className="flex items-center px-3 bg-muted/50 rounded-l-md border border-r-0 border-input text-sm text-muted-foreground">
            +91
          </div>
          <Input
            id="phone"
            type="tel"
            placeholder="Mobile number"
            value={phone}
            onChange={handlePhoneChange}
            className={`rounded-l-none h-12 flex-1 ${phoneError ? "border-red-500" : ""}`}
            disabled={isLoading || isOTPSent}
          />
        </div>
        {!isOTPSent && (
          <Button onClick={handleSendOTP} disabled={isLoading || !isPhoneValid()} className="h-12 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md hover:shadow-lg transition-all">
            {isLoading ? "..." : "Get OTP"}
          </Button>
        )}
        </div>
      </div>
      {phoneError && <p className="text-sm text-red-500 mt-1">{phoneError}</p>}

      {/* OTP */}
      {showOTPField && (
        <div>
          <Input
            id="otp"
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={isLoading}
            className="h-12 text-center text-lg tracking-[0.3em]"
            maxLength={6}
          />
          <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
            <span>Sent to +91 {phone}</span>
            {resendCooldown > 0 ? (
              <span>Resend in {resendCooldown}s</span>
            ) : (
              <Button variant="link" onClick={handleResendOTPClick} className="p-0 h-auto text-sm text-toy-coral hover:text-toy-coral/80 font-medium" disabled={isLoading}>
                Resend
              </Button>
            )}
          </div>
          {developmentOtp && (
            <p className="text-xs text-amber-600 mt-1">Dev OTP: {developmentOtp}</p>
          )}
        </div>
      )}

      {/* Name + Pincode - essential fields only */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className="text-sm font-medium text-foreground mb-1.5 block">
            First name <RequiredStar />
          </label>
          <Input
            id="firstName"
            placeholder="First name"
          value={signupData.firstName}
          onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
          disabled={isLoading}
          className="h-11"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="text-sm font-medium text-foreground mb-1.5 block">
            Last name <RequiredStar />
          </label>
          <Input
            id="lastName"
            placeholder="Last name"
          value={signupData.lastName}
          onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
          disabled={isLoading}
          className="h-11"
          />
        </div>
      </div>

      <div>
        <label htmlFor="pincode" className="text-sm font-medium text-foreground mb-1.5 block">
          Pincode (Bangalore) <RequiredStar />
        </label>
        <Input
          id="pincode"
          placeholder="560001"
          type="text"
          value={signupData.pincode}
          onChange={(e) => handlePincodeChange(e.target.value)}
          disabled={isLoading}
          maxLength={6}
          className={`h-11 ${pincodeValidation && !pincodeValidation.isServiceable ? "border-red-500" : ""}`}
        />
        {pincodeValidation?.isServiceable && (
          <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            {pincodeValidation.area}
          </p>
        )}
        {pincodeValidation && !pincodeValidation.isServiceable && (
          <p className="text-sm text-red-500 mt-1">{pincodeValidation.message}</p>
        )}
      </div>

      <Input
        placeholder="Email (optional)"
        type="email"
        value={signupData.email}
        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
        disabled={isLoading}
        className="h-11 text-muted-foreground"
      />

      <Button
        onClick={handleFinalRegistration}
        className="w-full h-12 font-semibold bg-gradient-to-r from-toy-coral to-toy-sunshine hover:from-toy-coral/90 hover:to-toy-sunshine/90 text-white shadow-md hover:shadow-lg transition-all"
        disabled={isLoading || isVerifying || !isSignupFormValid()}
      >
        {isLoading || isVerifying ? "Please wait..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Have an account?{" "}
        <button type="button" onClick={() => handleModeSwitch("signin")} className="font-semibold text-blue-600 hover:text-blue-700 hover:underline" disabled={isLoading}>
          Sign in
        </button>
      </p>
    </div>
  );

  const renderSigninForm = () => (
    <div className="space-y-5">
      <div>
        <label htmlFor="phone-signin" className="text-sm font-medium text-foreground mb-1.5 block">
          Mobile number <RequiredStar />
        </label>
        <div className="flex gap-2">
        <div className="flex flex-1">
          <div className="flex items-center px-3 bg-muted/50 rounded-l-md border border-r-0 border-input text-sm text-muted-foreground">
            +91
          </div>
          <Input
            id="phone"
            type="tel"
            placeholder="Mobile number"
            value={phone}
            onChange={handlePhoneChange}
            className={`rounded-l-none h-12 flex-1 ${phoneError ? "border-red-500" : ""}`}
            disabled={isLoading || isOTPSent}
          />
        </div>
        {!isOTPSent && (
          <Button onClick={handleSendOTP} disabled={isLoading || !isPhoneValid()} className="h-12 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md hover:shadow-lg transition-all">
            {isLoading ? "..." : "Get OTP"}
          </Button>
        )}
        </div>
      </div>
      {phoneError && <p className="text-sm text-red-500 mt-1">{phoneError}</p>}

      {showOTPField && (
        <div>
          <Input
            id="otp"
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={isLoading}
            className="h-12 text-center text-lg tracking-[0.3em]"
            maxLength={6}
          />
          <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
            <span>Sent to +91 {phone}</span>
            {resendCooldown > 0 ? (
              <span>Resend in {resendCooldown}s</span>
            ) : (
              <Button variant="link" onClick={handleResendOTPClick} className="p-0 h-auto text-sm text-toy-coral hover:text-toy-coral/80 font-medium" disabled={isLoading}>
                Resend
              </Button>
            )}
          </div>
          {developmentOtp && (
            <p className="text-xs text-amber-600 mt-1">Dev OTP: {developmentOtp}</p>
          )}
        </div>
      )}

      {isOTPVerified && incompleteUser && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">First name <RequiredStar /></label>
              <Input placeholder="First name" value={signupData.firstName} onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })} disabled={isLoading} className="h-11" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Last name <RequiredStar /></label>
              <Input placeholder="Last name" value={signupData.lastName} onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })} disabled={isLoading} className="h-11" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Pincode (Bangalore) <RequiredStar /></label>
            <Input placeholder="560001" type="text" value={signupData.pincode} onChange={(e) => handlePincodeChange(e.target.value)} disabled={isLoading} maxLength={6} className={`h-11 ${pincodeValidation && !pincodeValidation.isServiceable ? "border-red-500" : ""}`} />
            {pincodeValidation?.isServiceable && <p className="text-sm text-green-600 flex items-center gap-1 mt-1"><CheckCircle className="w-4 h-4" />{pincodeValidation.area}</p>}
            {pincodeValidation && !pincodeValidation.isServiceable && <p className="text-sm text-red-500 mt-1">{pincodeValidation.message}</p>}
          </div>
          <Input placeholder="Email (optional)" type="email" value={signupData.email} onChange={(e) => setSignupData({ ...signupData, email: e.target.value })} disabled={isLoading} className="h-11" />
        </>
      )}

      {showOTPField && (
        <Button onClick={handleFinalRegistration} className="w-full h-12 font-semibold bg-gradient-to-r from-toy-coral to-toy-sunshine hover:from-toy-coral/90 hover:to-toy-sunshine/90 text-white shadow-md hover:shadow-lg transition-all" disabled={isLoading || isVerifying || !isSigninFormValid()}>
          {isLoading || isVerifying ? "Please wait..." : "Sign in"}
        </Button>
      )}

      <p className="text-center text-sm text-muted-foreground">
        New user?{" "}
        <button type="button" onClick={() => handleModeSwitch("signup")} className="font-semibold text-blue-600 hover:text-blue-700 hover:underline" disabled={isLoading}>
          Create account
        </button>
      </p>
    </div>
  );

  return (
    <div className="w-full max-w-sm mx-auto relative pt-10">
      <button type="button" onClick={handleGoBack} className="absolute top-0 left-0 p-2 -ml-2 text-muted-foreground hover:text-toy-coral transition-colors" aria-label="Back">
        <ArrowLeft className="w-5 h-5" />
      </button>
      {onClose && (
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground" aria-label="Close">
          ×
        </button>
      )}
      <h1 className="text-xl font-semibold text-center mb-1">
        {mode === "signup" ? "Create account" : "Sign in"}
      </h1>
      <p className="text-sm text-muted-foreground text-center mb-6">
        {mode === "signup" ? "We deliver in Bangalore" : "Enter your number"}
      </p>
      <div className="space-y-5">
        {mode === "signup" ? renderSignupForm() : renderSigninForm()}
      </div>
    </div>
  );
};

export default SignupFirstAuth; 