import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile, deleteUserAccount } from "./otpService";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { validateBangalorePincode } from "@/utils/pincodeValidation";
import { fbqTrack } from "@/utils/fbq";

export const useSignupActions = (
  signupData: any,
  setIsLoading: (loading: boolean) => void
) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { updateUser, signOut } = useCustomAuth();

  const handleSignUp = async () => {
    if (!signupData.firstName || !signupData.lastName) {
      toast({
        title: "Required fields missing",
        description: "Please enter your first and last name",
        variant: "destructive",
      });
      return;
    }

    if (!signupData.pincode) {
      toast({
        title: "Pincode required",
        description: "Please enter your pincode to check service availability",
        variant: "destructive",
      });
      return;
    }

    // Validate pincode for Bangalore delivery
    const pincodeValidation = validateBangalorePincode(signupData.pincode);
    if (!pincodeValidation.isServiceable) {
      setIsLoading(true);
      
      try {
        // Delete the user account since service is not available
        await deleteUserAccount();
        
        // Clear authentication state
        signOut();
        
        toast({
          title: "Service not available",
          description: pincodeValidation.message,
          variant: "destructive",
        });
        
        // Redirect back to auth page after cleanup
        setTimeout(() => {
          navigate("/auth", { replace: true });
        }, 3000);
        
        return;
      } catch (error) {
        console.error('Error during user cleanup:', error);
        toast({
          title: "Service not available",
          description: pincodeValidation.message,
          variant: "destructive",
        });
        return;
      } finally {
        setIsLoading(false);
      }
    }

    setIsLoading(true);

    try {
      const { success, error, user: updatedUser } = await updateUserProfile(
        signupData.firstName,
        signupData.lastName,
        signupData.pincode
      );
      
      if (success && updatedUser) {
        // Update user in context with new profile info
        updateUser(updatedUser);
        
        // 📊 Track successful registration for Meta Signals Gateway
        fbqTrack('CompleteRegistration', {
          content_name: 'Toyflix Registration',
          status: true,
          content_category: 'signup',
          user_location: pincodeValidation.area
        });
        
        // Also track as Lead event for conversion optimization
        fbqTrack('Lead', {
          content_name: 'Toyflix Signup Lead',
          value: 0,
          currency: 'INR',
          content_category: 'signup',
          user_location: pincodeValidation.area
        });
        
        toast({
          title: "Account created successfully!",
          description: `Welcome to Toyflix! We deliver to ${pincodeValidation.area}.`,
        });
        
        // Check if user came from subscription flow
        const urlParams = new URLSearchParams(window.location.search);
        const redirectTo = urlParams.get('redirect');
        
        if (redirectTo) {
          navigate(redirectTo, { replace: true });
        } else {
          // New users go through signup success page for analytics
          navigate('/auth?from=signup', { replace: true });
        }
      } else {
        toast({
          title: "Signup failed",
          description: error?.message || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Signup failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleSignUp
  };
};
