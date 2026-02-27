import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import UserVerificationService from '@/services/userVerificationService';

interface SignupStep {
  step: 'phone_entered' | 'otp_sent' | 'otp_verified' | 'profile_completed' | 'session_created';
  timestamp: Date;
  data?: any;
}

interface SignupCompletionState {
  userId?: string;
  phone: string;
  steps: SignupStep[];
  currentStep: string;
  isComplete: boolean;
  verificationStatus?: {
    phoneVerified: boolean;
    profileComplete: boolean;
    hasActiveSessions: boolean;
  };
}

export const useSignupCompletionTracking = (phone: string, source: string = 'unknown') => {
  const [state, setState] = useState<SignupCompletionState>({
    phone,
    steps: [],
    currentStep: 'phone_entered',
    isComplete: false
  });

  const [isTracking, setIsTracking] = useState(false);

  // Track a signup step
  const trackStep = useCallback(async (
    step: SignupStep['step'], 
    data?: any
  ) => {
    try {
      setIsTracking(true);
      
      const newStep: SignupStep = {
        step,
        timestamp: new Date(),
        data
      };

      setState(prev => ({
        ...prev,
        steps: [...prev.steps, newStep],
        currentStep: step,
        isComplete: step === 'session_created'
      }));

      console.log(`📊 Signup tracking - ${step}:`, { phone, step, data, source });

      // Log to database if we have a user ID
      if (state.userId) {
        await supabase.functions.invoke('enhanced-user-verification', {
          body: {
            action: 'log_step',
            userId: state.userId,
            phone,
            step,
            source,
            metadata: data
          }
        });
      }

    } catch (error) {
      console.error('Failed to track signup step:', error);
      // Don't fail the signup process for tracking errors
    } finally {
      setIsTracking(false);
    }
  }, [phone, source, state.userId]);

  // Track OTP sent
  const trackOTPSent = useCallback(async (otpData?: any) => {
    await trackStep('otp_sent', otpData);
  }, [trackStep]);

  // Track OTP verified
  const trackOTPVerified = useCallback(async (user: any) => {
    setState(prev => ({ ...prev, userId: user.id }));
    await trackStep('otp_verified', { userId: user.id });

    // Ensure phone verification
    try {
      const verificationResult = await UserVerificationService.ensurePhoneVerified(phone, user.id);
      if (verificationResult.success) {
        console.log('✅ Phone verification ensured for user:', user.id);
        setState(prev => ({
          ...prev,
          verificationStatus: verificationResult.verificationStatus
        }));
      } else {
        console.error('❌ Failed to ensure phone verification:', verificationResult.error);
      }
    } catch (error) {
      console.error('Error ensuring phone verification:', error);
    }
  }, [trackStep, phone]);

  // Track profile completed
  const trackProfileCompleted = useCallback(async (profileData: any) => {
    await trackStep('profile_completed', profileData);

    // Track profile completion event
    try {
      if (typeof window !== 'undefined' && window.cbq) {
        window.cbq('track', 'CompleteRegistration', {
          user_id: state.userId,
          phone: phone,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          email: profileData.email,
          pincode: profileData.pincode,
          registration_method: 'profile_completion',
          source: source,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }

    // Complete signup with validation
    if (state.userId) {
      try {
        const completionResult = await UserVerificationService.completeSignup({
          userId: state.userId,
          phone,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          pincode: profileData.pincode,
          source
        });

        if (completionResult.success) {
          console.log('✅ Signup completion tracked successfully');
          setState(prev => ({
            ...prev,
            verificationStatus: completionResult.verificationStatus
          }));
        }
      } catch (error) {
        console.error('Error tracking signup completion:', error);
      }
    }
  }, [trackStep, state.userId, phone, source]);

  // Track session created
  const trackSessionCreated = useCallback(async (sessionData: any) => {
    await trackStep('session_created', sessionData);
  }, [trackStep]);

  // Validate current user data
  const validateUserData = useCallback(async () => {
    if (!state.userId) return null;

    try {
      const validation = await UserVerificationService.validateUserData(state.userId);
      console.log('📊 User data validation:', validation);
      return validation;
    } catch (error) {
      console.error('Error validating user data:', error);
      return null;
    }
  }, [state.userId]);

  // Get signup completion summary
  const getCompletionSummary = useCallback(() => {
    const stepCounts = state.steps.reduce((acc, step) => {
      acc[step.step] = (acc[step.step] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const duration = state.steps.length > 0 
      ? new Date().getTime() - state.steps[0].timestamp.getTime()
      : 0;

    return {
      phone,
      source,
      userId: state.userId,
      totalSteps: state.steps.length,
      currentStep: state.currentStep,
      isComplete: state.isComplete,
      duration: Math.round(duration / 1000), // seconds
      stepCounts,
      verificationStatus: state.verificationStatus,
      steps: state.steps
    };
  }, [phone, source, state]);

  return {
    // State
    state,
    isTracking,
    
    // Tracking functions
    trackOTPSent,
    trackOTPVerified,
    trackProfileCompleted,
    trackSessionCreated,
    
    // Utilities
    validateUserData,
    getCompletionSummary,
    
    // Computed values
    completionPercentage: Math.round((state.steps.length / 5) * 100),
    hasIssues: state.verificationStatus ? 
      (!state.verificationStatus.phoneVerified || !state.verificationStatus.profileComplete) : 
      false
  };
};
