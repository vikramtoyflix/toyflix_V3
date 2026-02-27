import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SignupData } from "./types";
import { validateBangalorePincode, formatPincode } from "@/utils/pincodeValidation";
import { useState } from "react";
import { MapPin, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";

interface SignupStepProps {
  signupData: SignupData;
  setSignupData: (data: SignupData) => void;
  isLoading: boolean;
  onSignUp: () => void;
  onReset: () => void;
  onBackToMain: () => void;
}

const SignupStep = ({
  signupData,
  setSignupData,
  isLoading,
  onSignUp,
  onReset,
  onBackToMain
}: SignupStepProps) => {
  const [pincodeValidation, setPincodeValidation] = useState(
    signupData.pincode ? validateBangalorePincode(signupData.pincode) : null
  );

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

  const isFormValid = () => {
    return (
      signupData.firstName.trim() && 
      signupData.lastName.trim() && 
      pincodeValidation?.isServiceable
    );
  };

  return (
    <>
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBackToMain}
        className="mb-4 -ml-2"
        disabled={isLoading}
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back
      </Button>

      {/* Service Area Information */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">Service Area</span>
        </div>
        <p className="text-sm text-blue-700">
          We currently deliver only in Bangalore, India. Enter your pincode to check if we serve your area.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={signupData.firstName}
            onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
            disabled={isLoading}
            required
            placeholder="Enter your first name"
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={signupData.lastName}
            onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
            disabled={isLoading}
            required
            placeholder="Enter your last name"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="email">Email (Optional)</Label>
        <Input
          id="email"
          type="email"
          value={signupData.email}
          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
          disabled={isLoading}
          placeholder="your.email@example.com"
        />
      </div>

      {/* Pincode Field */}
      <div>
        <Label htmlFor="pincode">Pincode *</Label>
        <Input
          id="pincode"
          type="text"
          value={signupData.pincode}
          onChange={(e) => handlePincodeChange(e.target.value)}
          disabled={isLoading}
          required
          placeholder="560001"
          maxLength={6}
          className={pincodeValidation && !pincodeValidation.isServiceable ? 'border-red-500' : ''}
        />
        
        {/* Pincode Validation Messages */}
        {pincodeValidation && (
          <div className="mt-2">
            {pincodeValidation.isServiceable ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="flex items-center justify-between">
                    <span>{pincodeValidation.message}</span>
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      {pincodeValidation.area}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {pincodeValidation.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        {signupData.pincode.length > 0 && signupData.pincode.length < 6 && (
          <p className="text-sm text-muted-foreground mt-1">
            Please enter {6 - signupData.pincode.length} more digit{6 - signupData.pincode.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
      
      <Button 
        onClick={onSignUp} 
        className="w-full bg-fun-green hover:bg-fun-green/90"
        disabled={isLoading || !isFormValid()}
      >
        {isLoading ? "Creating Account..." : "Create Account"}
      </Button>
      
      {/* Show why button is disabled */}
      {!isFormValid() && signupData.firstName && signupData.lastName && (
        <p className="text-sm text-center text-muted-foreground">
          Please enter a valid Bangalore pincode to continue
        </p>
      )}
      
      <Button 
        variant="outline" 
        onClick={onReset}
        className="w-full"
        disabled={isLoading}
      >
        Start Over
      </Button>
    </>
  );
};

export default SignupStep;
