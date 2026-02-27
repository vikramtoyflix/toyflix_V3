/**
 * Signup Analytics Service
 * Comprehensive tracking for signup funnel and user behavior
 */

interface SignupEvent {
  eventName: string;
  eventData: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

interface UserJourney {
  sessionId: string;
  events: SignupEvent[];
  startTime: number;
  source: string;
  utmParams: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
  deviceInfo: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
    screenResolution: string;
  };
}

declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: any) => void;
    clarity?: (command: string, ...args: any[]) => void;
    dataLayer?: any[];
    fbq?: (command: string, eventName: string, parameters?: any) => void;
  }
}

export class SignupAnalyticsService {
  private static sessionId: string = '';
  private static userJourney: UserJourney | null = null;

  /**
   * Initialize analytics session
   */
  static initializeSession(source: string = 'direct', utmParams: Record<string, string> = {}) {
    this.sessionId = this.generateSessionId();
    
    this.userJourney = {
      sessionId: this.sessionId,
      events: [],
      startTime: Date.now(),
      source,
      utmParams: {
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        utm_content: utmParams.utm_content,
        utm_term: utmParams.utm_term
      },
      deviceInfo: this.getDeviceInfo()
    };

    // Track session start
    this.trackEvent('signup_session_started', {
      session_id: this.sessionId,
      source,
      ...utmParams,
      ...this.userJourney.deviceInfo
    });

    console.log('📊 Analytics session initialized:', this.sessionId);
  }

  /**
   * Track signup funnel events
   */
  static trackEvent(eventName: string, eventData: Record<string, any> = {}) {
    const timestamp = Date.now();
    
    // Add to user journey
    if (this.userJourney) {
      this.userJourney.events.push({
        eventName,
        eventData,
        timestamp,
        sessionId: this.sessionId,
        userId: eventData.userId
      });
    }

    // Enhanced event data
    const enhancedData = {
      ...eventData,
      session_id: this.sessionId,
      timestamp,
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer,
      user_agent: navigator.userAgent
    };

    // Google Analytics 4
    this.trackGA4(eventName, enhancedData);
    
    // Microsoft Clarity
    this.trackClarity(eventName, enhancedData);
    
    // Facebook Pixel
    this.trackFacebookPixel(eventName, enhancedData);
    
    // Custom event logging
    this.logCustomEvent(eventName, enhancedData);

    console.log(`📊 Event tracked: ${eventName}`, enhancedData);
  }

  /**
   * Track specific signup funnel steps
   */
  static trackSignupStep(step: number, stepName: string, additionalData: Record<string, any> = {}) {
    this.trackEvent('signup_step_progress', {
      step_number: step,
      step_name: stepName,
      funnel_stage: 'signup_capture',
      ...additionalData
    });
  }

  /**
   * Track form interactions
   */
  static trackFormInteraction(fieldName: string, action: string, value?: any) {
    this.trackEvent('signup_form_interaction', {
      field_name: fieldName,
      interaction_type: action,
      field_value_length: value ? value.toString().length : 0,
      has_value: !!value
    });
  }

  /**
   * Track conversion events
   */
  static trackConversion(conversionType: string, value?: number, currency: string = 'INR') {
    this.trackEvent('signup_conversion', {
      conversion_type: conversionType,
      conversion_value: value,
      currency,
      conversion_time: Date.now(),
      session_duration: this.getSessionDuration()
    });

    // Enhanced GA4 conversion tracking
    if (window.gtag) {
      window.gtag('event', 'conversion', {
        send_to: 'AW-CONVERSION_ID/CONVERSION_LABEL', // Replace with actual conversion ID
        event_category: 'Signup Funnel',
        event_label: conversionType,
        value: value || 1,
        currency
      });
    }

    // Facebook Pixel conversion
    if (window.fbq) {
      window.fbq('track', 'CompleteRegistration', {
        content_name: conversionType,
        value: value || 1,
        currency
      });
    }
  }

  /**
   * Track user abandonment
   */
  static trackAbandonment(step: number, reason?: string) {
    this.trackEvent('signup_abandonment', {
      abandoned_at_step: step,
      abandonment_reason: reason,
      time_spent: this.getSessionDuration(),
      completed_fields: this.getCompletedFields()
    });
  }

  /**
   * Track page timing and performance
   */
  static trackPageTiming() {
    if (typeof window !== 'undefined' && window.performance) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;

      this.trackEvent('signup_page_performance', {
        page_load_time: loadTime,
        dom_ready_time: domReady,
        dns_lookup_time: timing.domainLookupEnd - timing.domainLookupStart,
        server_response_time: timing.responseEnd - timing.requestStart
      });
    }
  }

  /**
   * Get comprehensive user journey report
   */
  static getUserJourneyReport(): UserJourney | null {
    if (!this.userJourney) return null;

    return {
      ...this.userJourney,
      events: [...this.userJourney.events],
      totalDuration: Date.now() - this.userJourney.startTime,
      eventCount: this.userJourney.events.length
    } as UserJourney & { totalDuration: number; eventCount: number };
  }

  /**
   * Export analytics data for debugging
   */
  static exportAnalyticsData() {
    const report = this.getUserJourneyReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signup-analytics-${this.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Private helper methods
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
      screenResolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  private static getSessionDuration(): number {
    return this.userJourney ? Date.now() - this.userJourney.startTime : 0;
  }

  private static getCompletedFields(): string[] {
    if (!this.userJourney) return [];
    
    return this.userJourney.events
      .filter(event => event.eventName === 'signup_form_interaction')
      .filter(event => event.eventData.has_value)
      .map(event => event.eventData.field_name);
  }

  private static trackGA4(eventName: string, eventData: Record<string, any>) {
    if (window.gtag) {
      try {
        window.gtag('event', eventName, {
          event_category: 'Signup Funnel',
          event_label: eventData.source || 'unknown',
          custom_map: { 
            dimension1: 'signup_capture_page',
            dimension2: eventData.session_id 
          },
          ...eventData
        });
      } catch (error) {
        console.error('GA4 tracking error:', error);
      }
    }
  }

  private static trackClarity(eventName: string, eventData: Record<string, any>) {
    if (window.clarity) {
      try {
        window.clarity('event', eventName, eventData);
      } catch (error) {
        console.error('Clarity tracking error:', error);
      }
    }
  }

  private static trackFacebookPixel(eventName: string, eventData: Record<string, any>) {
    if (window.fbq) {
      try {
        // Map custom events to Facebook Pixel standard events
        const fbEventMap: Record<string, string> = {
          'signup_step_progress': 'Lead',
          'signup_conversion': 'CompleteRegistration',
          'signup_form_interaction': 'Lead'
        };

        const fbEventName = fbEventMap[eventName] || 'CustomEvent';
        window.fbq('track', fbEventName, eventData);
      } catch (error) {
        console.error('Facebook Pixel tracking error:', error);
      }
    }
  }

  private static logCustomEvent(eventName: string, eventData: Record<string, any>) {
    // Store in localStorage for debugging
    try {
      const events = JSON.parse(localStorage.getItem('signup_analytics_events') || '[]');
      events.push({ eventName, eventData, timestamp: Date.now() });
      
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      localStorage.setItem('signup_analytics_events', JSON.stringify(events));
    } catch (error) {
      console.error('Custom event logging error:', error);
    }
  }

  /**
   * Batch send events to custom analytics endpoint
   */
  static async sendBatchEvents() {
    if (!this.userJourney || this.userJourney.events.length === 0) return;

    try {
      const response = await fetch('/api/analytics/signup-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session: this.userJourney,
          events: this.userJourney.events
        })
      });

      if (response.ok) {
        console.log('📊 Batch events sent successfully');
      }
    } catch (error) {
      console.error('Failed to send batch events:', error);
    }
  }
}

export default SignupAnalyticsService;
