import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useCustomAuth } from './useCustomAuth';
import { DropTrackingService } from '@/services/dropTrackingService';

export const useDropTracking = () => {
  const { user } = useCustomAuth();
  const location = useLocation();

  // Initialize tracking session on mount
  useEffect(() => {
    DropTrackingService.initializeSession();
  }, []);

  // Track page views
  useEffect(() => {
    DropTrackingService.trackJourneyEvent({
      userId: user?.id,
      sessionId: DropTrackingService.getSessionId(),
      eventType: 'page_view',
      pageUrl: location.pathname + location.search
    });
  }, [location.pathname, location.search, user?.id]);

  // Track user interactions
  const trackInteraction = useCallback(() => {
    DropTrackingService.trackInteraction();
  }, []);

  // Track specific drop scenarios
  const trackAuthRequired = useCallback(() => {
    DropTrackingService.trackAuthRequired(user?.id);
  }, [user?.id]);

  const trackPricingConcern = useCallback((planId?: string, totalAmount?: number) => {
    DropTrackingService.trackPricingConcern(user?.id, planId, totalAmount);
  }, [user?.id]);

  const trackPaymentFailure = useCallback((planId?: string, totalAmount?: number, reason?: string) => {
    DropTrackingService.trackPaymentFailure(user?.id, planId, totalAmount, reason);
  }, [user?.id]);

  const trackToySelectionAbandonment = useCallback((planId?: string, ageGroup?: string) => {
    DropTrackingService.trackToySelectionAbandonment(user?.id, planId, ageGroup);
  }, [user?.id]);

  const trackAgeSelectionAbandonment = useCallback((planId?: string) => {
    DropTrackingService.trackAgeSelectionAbandonment(user?.id, planId);
  }, [user?.id]);

  const trackConversion = useCallback((planId: string, totalAmount: number, selectedToysCount: number) => {
    if (user?.id) {
      DropTrackingService.trackConversion(user.id, planId, totalAmount, selectedToysCount);
    }
  }, [user?.id]);

  const trackCustomDrop = useCallback((dropStep: string, dropReason?: string, flowType: 'subscription' | 'ride_on' | 'queue_management' = 'subscription', additionalData?: any) => {
    DropTrackingService.trackDrop({
      userId: user?.id,
      sessionId: DropTrackingService.getSessionId(),
      dropStep,
      dropReason,
      flowType,
      ...additionalData
    });
  }, [user?.id]);

  const trackJourneyEvent = useCallback((eventType: string, eventData?: any) => {
    DropTrackingService.trackJourneyEvent({
      userId: user?.id,
      sessionId: DropTrackingService.getSessionId(),
      eventType,
      eventData
    });
  }, [user?.id]);

  const resetSession = useCallback(() => {
    DropTrackingService.resetSession();
  }, []);

  return {
    trackInteraction,
    trackAuthRequired,
    trackPricingConcern,
    trackPaymentFailure,
    trackToySelectionAbandonment,
    trackAgeSelectionAbandonment,
    trackConversion,
    trackCustomDrop,
    trackJourneyEvent,
    resetSession
  };
}; 