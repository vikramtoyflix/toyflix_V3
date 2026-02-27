import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface DropTrackingData {
  userId?: string;
  sessionId: string;
  dropStep: string;
  dropReason?: string;
  flowType: 'subscription' | 'ride_on' | 'queue_management';
  planId?: string;
  ageGroup?: string;
  selectedToysCount?: number;
  totalAmount?: number;
  userAgent?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  timeOnPageSeconds?: number;
  interactionsCount?: number;
}

export interface JourneyEventData {
  userId?: string;
  sessionId: string;
  eventType: string;
  eventData?: any;
  pageUrl?: string;
}

export class DropTrackingService {
  private static sessionId: string | null = null;
  private static sessionStartTime: number | null = null;
  private static interactionsCount: number = 0;

  /**
   * Initialize tracking session
   */
  static initializeSession(): string {
    if (!this.sessionId) {
      this.sessionId = uuidv4();
      this.sessionStartTime = Date.now();
      this.interactionsCount = 0;
      
      // Store session in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('toyflix_session_id', this.sessionId);
        localStorage.setItem('toyflix_session_start', this.sessionStartTime.toString());
      }
    }
    return this.sessionId;
  }

  /**
   * Get current session ID
   */
  static getSessionId(): string {
    if (!this.sessionId) {
      // Try to restore from localStorage
      if (typeof window !== 'undefined') {
        const storedSessionId = localStorage.getItem('toyflix_session_id');
        const storedStartTime = localStorage.getItem('toyflix_session_start');
        
        if (storedSessionId && storedStartTime) {
          this.sessionId = storedSessionId;
          this.sessionStartTime = parseInt(storedStartTime);
        } else {
          this.initializeSession();
        }
      } else {
        this.initializeSession();
      }
    }
    return this.sessionId!;
  }

  /**
   * Track user interaction
   */
  static trackInteraction(): void {
    this.interactionsCount++;
  }

  /**
   * Get device information
   */
  private static getDeviceInfo() {
    if (typeof window === 'undefined') return {};

    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(userAgent);
    
    let deviceType: 'mobile' | 'desktop' | 'tablet' = 'desktop';
    if (isMobile) deviceType = 'mobile';
    else if (isTablet) deviceType = 'tablet';

    // Detect browser
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // Detect OS
    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return {
      userAgent,
      deviceType,
      browser,
      os,
      referrer: document.referrer
    };
  }

  /**
   * Get UTM parameters from URL
   */
  private static getUTMParams(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
    if (typeof window === 'undefined') return {};

    const urlParams = new URLSearchParams(window.location.search);
    return {
      utmSource: urlParams.get('utm_source') || undefined,
      utmMedium: urlParams.get('utm_medium') || undefined,
      utmCampaign: urlParams.get('utm_campaign') || undefined
    };
  }

  /**
   * Calculate time on page
   */
  private static getTimeOnPage(): number {
    if (!this.sessionStartTime) return 0;
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }

  /**
   * Track customer drop
   */
  static async trackDrop(data: DropTrackingData): Promise<void> {
    try {
      const sessionId = this.getSessionId();
      const deviceInfo = this.getDeviceInfo();
      const utmParams = this.getUTMParams();
      const timeOnPage = this.getTimeOnPage();

      const dropData = {
        user_id: data.userId || null,
        session_id: sessionId,
        drop_step: data.dropStep,
        drop_reason: data.dropReason || null,
        flow_type: data.flowType,
        plan_id: data.planId || null,
        age_group: data.ageGroup || null,
        selected_toys_count: data.selectedToysCount || 0,
        total_amount: data.totalAmount || null,
        user_agent: deviceInfo.userAgent || data.userAgent,
        referrer: deviceInfo.referrer || data.referrer,
        utm_source: utmParams.utmSource || data.utmSource,
        utm_medium: utmParams.utmMedium || data.utmMedium,
        utm_campaign: utmParams.utmCampaign || data.utmCampaign,
        device_type: deviceInfo.deviceType || data.deviceType,
        browser: deviceInfo.browser || data.browser,
        os: deviceInfo.os || data.os,
        country: data.country || null,
        city: data.city || null,
        time_on_page_seconds: timeOnPage,
        interactions_count: this.interactionsCount
      };

      const { error } = await supabase
        .from('customer_drops')
        .insert(dropData);

      if (error) {
        console.error('Error tracking customer drop:', error);
      } else {
        console.log('✅ Customer drop tracked:', data.dropStep, data.dropReason);
      }
    } catch (error) {
      console.error('Error in drop tracking:', error);
    }
  }

  /**
   * Track journey event
   */
  static async trackJourneyEvent(data: JourneyEventData): Promise<void> {
    try {
      const sessionId = this.getSessionId();

      const eventData = {
        user_id: data.userId || null,
        session_id: sessionId,
        event_type: data.eventType,
        event_data: data.eventData || null,
        page_url: data.pageUrl || (typeof window !== 'undefined' ? window.location.href : null)
      };

      const { error } = await supabase
        .from('user_journey_events')
        .insert(eventData);

      if (error) {
        console.error('Error tracking journey event:', error);
      }
    } catch (error) {
      console.error('Error in journey event tracking:', error);
    }
  }

  /**
   * Track specific drop scenarios
   */
  static async trackAuthRequired(userId?: string): Promise<void> {
    await this.trackDrop({
      sessionId: this.getSessionId(),
      dropStep: 'auth_required',
      dropReason: 'auth_required',
      flowType: 'subscription'
    });
  }

  static async trackPricingConcern(userId?: string, planId?: string, totalAmount?: number): Promise<void> {
    await this.trackDrop({
      userId,
      sessionId: this.getSessionId(),
      dropStep: 'cart_summary',
      dropReason: 'pricing_concern',
      flowType: 'subscription',
      planId,
      totalAmount
    });
  }

  static async trackPaymentFailure(userId?: string, planId?: string, totalAmount?: number, reason?: string): Promise<void> {
    await this.trackDrop({
      userId,
      sessionId: this.getSessionId(),
      dropStep: 'payment_failed',
      dropReason: reason || 'payment_method',
      flowType: 'subscription',
      planId,
      totalAmount
    });
  }

  static async trackToySelectionAbandonment(userId?: string, planId?: string, ageGroup?: string): Promise<void> {
    await this.trackDrop({
      userId,
      sessionId: this.getSessionId(),
      dropStep: 'toy_selection',
      dropReason: 'toy_availability',
      flowType: 'subscription',
      planId,
      ageGroup
    });
  }

  static async trackAgeSelectionAbandonment(userId?: string, planId?: string): Promise<void> {
    await this.trackDrop({
      userId,
      sessionId: this.getSessionId(),
      dropStep: 'age_selection',
      dropReason: 'age_restriction',
      flowType: 'subscription',
      planId
    });
  }

  /**
   * Track successful conversion
   */
  static async trackConversion(userId: string, planId: string, totalAmount: number, selectedToysCount: number): Promise<void> {
    await this.trackJourneyEvent({
      userId,
      sessionId: this.getSessionId(),
      eventType: 'conversion_success',
      eventData: {
        planId,
        totalAmount,
        selectedToysCount
      }
    });
  }

  /**
   * Reset session (for new flows)
   */
  static resetSession(): void {
    this.sessionId = null;
    this.sessionStartTime = null;
    this.interactionsCount = 0;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('toyflix_session_id');
      localStorage.removeItem('toyflix_session_start');
    }
  }

  /**
   * Get drop analytics data
   */
  static async getDropAnalytics(days: number = 30): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('customer_drops')
        .select('*')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching drop analytics:', error);
      return [];
    }
  }

  /**
   * Get drop rate by step
   */
  static async getDropRateByStep(days: number = 30): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('get_drop_rate_by_step', { days_param: days });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching drop rate by step:', error);
      return [];
    }
  }
} 