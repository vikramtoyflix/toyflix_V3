import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { validateBangalorePincode, formatPincode } from "@/utils/pincodeValidation";
import { useToast } from "@/hooks/use-toast";
import { sendOTP, verifyOTP, completeUserProfile } from "@/components/auth/custom-otp/otpService";
import { useCustomAuth } from "@/hooks/useCustomAuth";

interface SignupFirstAuthProps {
  onClose?: () => void;
}

type AuthMode = "signup" | "signin";

const SignupFirstAuth = ({ onClose }: SignupFirstAuthProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setAuth } = useCustomAuth();

  // Mode from URL param — never auto-switch after page load
  const [mode, setMode] = useState<AuthMode>(() =>
    searchParams.get('mode') === 'signin' ? 'signin' : 'signup'
  );

  // Form state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [signupData, setSignupData] = useState({ firstName: "", lastName: "", email: "", pincode: "" });

  // Step state
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [incompleteUserId, setIncompleteUserId] = useState<string | null>(null);

  // Loading / guard state
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Validation state
  const [pincodeValidation, setPincodeValidation] = useState<any>(null);
  const [phoneError, setPhoneError] = useState("");
  const [devOtp, setDevOtp] = useState("");

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  // Keep URL in sync with mode
  useEffect(() => {
    const p = new URLSearchParams(searchParams);
    mode === 'signup' ? p.delete('mode') : p.set('mode', mode);
    const qs = p.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) return digits.slice(2);
    if (digits.length > 10) return digits.slice(-10);
    return digits;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
    if (val !== phone) {
      // Reset whole flow when phone number changes
      setOtpSent(false);
      setOtpVerified(false);
      setOtp("");
      setDevOtp("");
      setPhoneError("");
      setIncompleteUserId(null);
    }
  };

  const handlePincodeChange = (val: string) => {
    const formatted = formatPincode(val);
    setSignupData(d => ({ ...d, pincode: formatted }));
    if (formatted.length === 6) {
      setPincodeValidation(validateBangalorePincode(formatted));
    } else {
      setPincodeValidation(null);
    }
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setOtpSent(false);
    setOtpVerified(false);
    setOtp("");
    setDevOtp("");
    setPhoneError("");
    setIncompleteUserId(null);
  };

  // ── STEP 1: Send OTP ──────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      toast({ title: "Enter a valid 10-digit mobile number", variant: "destructive" });
      return;
    }
    setPhoneError("");
    setIsSending(true);
    try {
      const normalized = normalizePhone(phone);
      const result = await sendOTP(normalized);
      if (result.success) {
        setOtpSent(true);
        if (result.developmentOtp) setDevOtp(result.developmentOtp);
        toast({ title: "OTP Sent! 📱", description: "Enter the OTP sent to your phone." });
      } else {
        const msg = result.error?.message || "Failed to send OTP. Please try again.";
        setPhoneError(msg);
        toast({ title: "Failed to send OTP", description: msg, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not send OTP. Check your connection.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setOtp("");
    setDevOtp("");
    setResendCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    try {
      const normalized = normalizePhone(phone);
      const result = await sendOTP(normalized);
      if (result.success) {
        if (result.developmentOtp) setDevOtp(result.developmentOtp);
        toast({ title: "OTP Resent", description: `Sent to +91 ${phone}` });
      }
    } catch { /* silent — cooldown still applies */ }
  };

  // ── STEP 2 (signin): Verify OTP → navigate to dashboard ──────────────────
  const handleSignin = async () => {
    if (otp.length !== 6) {
      toast({ title: "Enter the 6-digit OTP", variant: "destructive" });
      return;
    }
    setIsVerifying(true);
    try {
      const normalized = normalizePhone(phone);
      const result = await verifyOTP(normalized, otp, 'signin');
      if (result.success && result.otpVerified) {
        // Save session if present (profile complete)
        if (result.session && result.user) {
          setAuth(result.user as any, result.session as any);
        }
        toast({ title: "Welcome back! 🎉", description: "Signed in successfully." });
        navigate('/dashboard', { replace: true });
      } else {
        toast({
          title: "Verification failed",
          description: result.error?.message || "Invalid OTP. Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Verification failed. Please try again.", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  // ── STEP 2 (signup): Verify OTP → reveal profile form ────────────────────
  const handleVerifyForSignup = async () => {
    if (otp.length !== 6) {
      toast({ title: "Enter the 6-digit OTP", variant: "destructive" });
      return;
    }
    setIsVerifying(true);
    try {
      const normalized = normalizePhone(phone);
      const result = await verifyOTP(normalized, otp, 'signup');
      if (result.success && result.otpVerified) {
        if (result.profileComplete && result.session && result.user) {
          // Existing complete user signed up again — just log them in
          setAuth(result.user as any, result.session as any);
          toast({ title: "Welcome back! 🎉", description: "Signed in to your existing account." });
          navigate('/dashboard', { replace: true });
        } else if (result.user?.id) {
          // New user — show profile completion form
          setIncompleteUserId(result.user.id);
          setOtpVerified(true);
          toast({ title: "OTP Verified! ✅", description: "Now complete your profile to register." });
        }
      } else {
        toast({
          title: "Verification failed",
          description: result.error?.message || "Invalid OTP. Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Verification failed. Please try again.", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  // ── STEP 3 (signup): Submit profile → navigate to dashboard ──────────────
  const handleCompleteProfile = async () => {
    if (!signupData.firstName.trim() || !signupData.lastName.trim()) {
      toast({ title: "Enter your first and last name", variant: "destructive" });
      return;
    }
    if (!pincodeValidation?.isServiceable) {
      toast({ title: "Enter a valid Bangalore pincode", variant: "destructive" });
      return;
    }
    if (!incompleteUserId) {
      toast({ title: "Session error", description: "Please start again.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await completeUserProfile(
        incompleteUserId,
        signupData.firstName,
        signupData.lastName,
        signupData.email || undefined,
        signupData.pincode || undefined
      );
      if (result.success && result.user && result.session) {
        setAuth(result.user as any, result.session as any);
        toast({ title: "Welcome to ToyFlix! 🎉", description: "Your account is ready." });
        navigate('/dashboard', { replace: true });
      } else {
        toast({
          title: "Registration failed",
          description: result.error?.message || "Could not save your details. Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Registration failed. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const RequiredStar = () => <span className="text-red-500">*</span>;

  // ── RENDER: Phone + OTP row (shared between signup and signin) ────────────
  const renderPhoneOtpRow = (inputId: string) => (
    <>
      <div>
        <label htmlFor={inputId} className="text-sm font-medium text-foreground mb-1.5 block">
          Mobile number <RequiredStar />
        </label>
        <div className="flex gap-2">
          <div className="flex flex-1">
            <div className="flex items-center px-3 bg-muted/50 rounded-l-md border border-r-0 border-input text-sm text-muted-foreground">
              +91
            </div>
            <Input
              id={inputId}
              type="tel"
              placeholder="Mobile number"
              value={phone}
              onChange={handlePhoneChange}
              className={`rounded-l-none h-12 flex-1 ${phoneError ? "border-red-500" : ""}`}
              disabled={isSending || otpSent}
            />
          </div>
          {!otpSent && (
            <Button
              onClick={handleSendOTP}
              disabled={isSending || phone.length !== 10}
              className="h-12 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSending ? "Sending…" : "Get OTP"}
            </Button>
          )}
        </div>
        {phoneError && <p className="text-sm text-red-500 mt-1">{phoneError}</p>}
      </div>

      {otpSent && (
        <div>
          <Input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={isVerifying || otpVerified}
            className="h-12 text-center text-lg tracking-[0.3em]"
            maxLength={6}
          />
          <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
            <span>Sent to +91 {phone}</span>
            {resendCooldown > 0 ? (
              <span>Resend in {resendCooldown}s</span>
            ) : (
              <Button variant="link" onClick={handleResendOTP} className="p-0 h-auto text-sm text-toy-coral font-medium" disabled={isVerifying}>
                Resend
              </Button>
            )}
          </div>
          {devOtp && <p className="text-xs text-amber-600 mt-1">Dev OTP: {devOtp}</p>}
        </div>
      )}
    </>
  );

  // ── RENDER: Profile fields (shown after OTP verified in signup) ───────────
  const renderProfileFields = () => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className="text-sm font-medium text-foreground mb-1.5 block">
            First name <RequiredStar />
          </label>
          <Input
            id="firstName"
            placeholder="First name"
            value={signupData.firstName}
            onChange={(e) => setSignupData(d => ({ ...d, firstName: e.target.value }))}
            disabled={isSubmitting}
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
            onChange={(e) => setSignupData(d => ({ ...d, lastName: e.target.value }))}
            disabled={isSubmitting}
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
          disabled={isSubmitting}
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
        onChange={(e) => setSignupData(d => ({ ...d, email: e.target.value }))}
        disabled={isSubmitting}
        className="h-11"
      />
    </>
  );

  // ── RENDER: Signup form ───────────────────────────────────────────────────
  const renderSignupForm = () => (
    <div className="space-y-5">
      {renderPhoneOtpRow("phone-signup")}

      {/* Profile fields shown only after OTP is verified */}
      {otpVerified && renderProfileFields()}

      {/* Step action button */}
      {!otpSent && null /* Get OTP button is inline above */}

      {otpSent && !otpVerified && (
        <Button
          onClick={handleVerifyForSignup}
          disabled={isVerifying || otp.length !== 6}
          className="w-full h-12 font-semibold bg-gradient-to-r from-toy-coral to-toy-sunshine text-white"
        >
          {isVerifying ? "Verifying…" : "Verify OTP"}
        </Button>
      )}

      {otpVerified && (
        <Button
          onClick={handleCompleteProfile}
          disabled={isSubmitting || !signupData.firstName.trim() || !signupData.lastName.trim() || !pincodeValidation?.isServiceable}
          className="w-full h-12 font-semibold bg-gradient-to-r from-toy-coral to-toy-sunshine text-white"
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Have an account?{" "}
        <button type="button" onClick={() => handleModeSwitch("signin")} className="font-semibold text-blue-600 hover:underline">
          Sign in
        </button>
      </p>
    </div>
  );

  // ── RENDER: Signin form ───────────────────────────────────────────────────
  const renderSigninForm = () => (
    <div className="space-y-5">
      {renderPhoneOtpRow("phone-signin")}

      {otpSent && (
        <Button
          onClick={handleSignin}
          disabled={isVerifying || otp.length !== 6}
          className="w-full h-12 font-semibold bg-gradient-to-r from-toy-coral to-toy-sunshine text-white"
        >
          {isVerifying ? "Signing in…" : "Sign in"}
        </Button>
      )}

      <p className="text-center text-sm text-muted-foreground">
        New user?{" "}
        <button type="button" onClick={() => handleModeSwitch("signup")} className="font-semibold text-blue-600 hover:underline">
          Create account
        </button>
      </p>
    </div>
  );

  return (
    <div className="w-full max-w-sm mx-auto relative pt-10">
      <button
        type="button"
        onClick={onClose ? onClose : () => window.history.back()}
        className="absolute top-0 left-0 p-2 -ml-2 text-muted-foreground hover:text-toy-coral transition-colors"
        aria-label="Back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          ×
        </button>
      )}

      <h1 className="text-xl font-semibold text-center mb-1">
        {mode === "signup" ? "Create account" : "Sign in"}
      </h1>
      <p className="text-sm text-muted-foreground text-center mb-6">
        {mode === "signup" ? "We deliver in Bangalore" : "Enter your number"}
      </p>

      {mode === "signup" ? renderSignupForm() : renderSigninForm()}
    </div>
  );
};

export default SignupFirstAuth;
