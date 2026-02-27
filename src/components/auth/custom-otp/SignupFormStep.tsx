import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SignupData } from "./types";
import { validateBangalorePincode, formatPincode } from "@/utils/pincodeValidation";
import { useState } from "react";
import { MapPin, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";

interface SignupFormStepProps {
  signupData: SignupData;
  setSignupData: (data: SignupData) => void;
  isLoading: boolean;
  onContinue: () => void;
  onBack: () => void;
}

const SignupFormStep = ({
  signupData,
  setSignupData,
  isLoading,
  onContinue,
  onBack
}: SignupFormStepProps) => {
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
    const valid = (
      signupData.firstName.trim() && 
      signupData.lastName.trim() && 
      pincodeValidation?.isServiceable
    );
    
    console.log('🔍 Form validation:', {
      firstName: signupData.firstName.trim(),
      lastName: signupData.lastName.trim(),
      pincodeValidation,
      isServiceable: pincodeValidation?.isServiceable,
      isValid: valid
    });
    
    return valid;
  };

  return (
    <>
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
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
          <span className="text-sm font-semibold text-blue-800">Service Area Check</span>
        </div>
        <p className="text-sm text-blue-700">
          We currently deliver only in Bangalore, India. Please complete your profile to check if we serve your area.
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
        onClick={onContinue} 
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-base"
        disabled={isLoading || !isFormValid()}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Validating...
          </div>
        ) : (
          "Continue to Verification →"
        )}
      </Button>
      
      {/* Debug info for form state */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        Form Status: {isFormValid() ? '✅ Ready' : '❌ Incomplete'} | 
        Name: {signupData.firstName && signupData.lastName ? '✅' : '❌'} | 
        Pincode: {pincodeValidation?.isServiceable ? '✅' : '❌'}
      </div>
      
      {/* Show specific help text */}
      {!isFormValid() && (
        <div className="text-sm text-center space-y-1">
          {!signupData.firstName.trim() && (
            <p className="text-red-600">• Please enter your first name</p>
          )}
          {!signupData.lastName.trim() && (
            <p className="text-red-600">• Please enter your last name</p>
          )}
          {signupData.firstName.trim() && signupData.lastName.trim() && !pincodeValidation?.isServiceable && (
            <p className="text-red-600">• Please enter a valid Bangalore pincode</p>
          )}
        </div>
      )}
    </>
  );
};

export default SignupFormStep; 