import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeSubscription = (onDataChange: () => void) => {
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const isMountedRef = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced data change handler to prevent rapid-fire updates
  const debouncedDataChange = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('Executing debounced data change...');
        onDataChange();
      }
    }, 1500); // 1.5 second debounce to prevent rapid updates
  }, [onDataChange]);

  useEffect(() => {
    console.log('Real-time subscription temporarily disabled for stability...');
    return; // Temporarily disable to reduce console errors
    
    const setupSubscription = () => {
      // Prevent multiple subscriptions
      if (isSubscribedRef.current || channelRef.current) {
        console.log('Subscription already exists, skipping setup');
        return;
      }

      try {
        const channel = supabase
          .channel(`toys-changes-optimized-${Date.now()}`) // Unique channel name
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'toys'
            },
            (payload) => {
              console.log('Real-time toys change detected:', payload.eventType);
              
              // Only trigger debounced data change if component is still mounted
              if (isMountedRef.current) {
                debouncedDataChange();
              }
            }
          )
          .subscribe((status, err) => {
            console.log('Subscription status:', status);
            
            if (err) {
              console.error('Subscription error:', err);
              isSubscribedRef.current = false;
              channelRef.current = null;
              return;
            }

            switch (status) {
              case 'SUBSCRIBED':
                console.log('Successfully subscribed to toys changes');
                isSubscribedRef.current = true;
                break;
              case 'TIMED_OUT':
              case 'CLOSED':
              case 'CHANNEL_ERROR':
                console.error(`Subscription ${status}, cleaning up...`);
                isSubscribedRef.current = false;
                channelRef.current = null;
                break;
            }
          });

        channelRef.current = channel;
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
        isSubscribedRef.current = false;
        channelRef.current = null;
      }
    };

    // Immediate setup without delay to reduce complexity
    setupSubscription();

    return () => {
      console.log('Cleaning up real-time subscription...');
      isMountedRef.current = false;
      
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
          console.log('Channel removed successfully');
        } catch (error) {
          console.error('Error removing subscription:', error);
        }
        channelRef.current = null;
      }
      isSubscribedRef.current = false;
    };
  }, [debouncedDataChange]);

  // Simplified pause/resume methods
  const pauseSubscription = useCallback(() => {
    if (channelRef.current) {
      console.log('Pausing real-time subscription...');
      try {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      } catch (error) {
        console.error('Error pausing subscription:', error);
      }
    }
    
    // Clear any pending debounced updates
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const resumeSubscription = useCallback(() => {
    if (!channelRef.current && isMountedRef.current) {
      console.log('Resuming real-time subscription...');
      
      // Simplified resume without nested timeouts
      const channel = supabase
        .channel(`toys-changes-resume-${Date.now()}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'toys'
        }, (payload) => {
          if (isMountedRef.current) {
            debouncedDataChange();
          }
        })
        .subscribe();
      
      channelRef.current = channel;
      isSubscribedRef.current = true;
    }
  }, [debouncedDataChange]);

  return { pauseSubscription, resumeSubscription };
};
