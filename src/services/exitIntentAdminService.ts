import { supabase } from '@/integrations/supabase/client';

export interface ExitIntentConfig {
  id: string;
  is_enabled: boolean;
  sensitivity: number;
  delay_ms: number;
  cookie_expiry_hours: number;
  show_on_mobile: boolean;
  aggressive_mode: boolean;
  min_time_on_page: number;
  max_shows_per_session: number;
  enabled_pages: string[];
  disabled_pages: string[];
  user_type_restrictions: string[];
  discount_codes: string[];
  created_at: string;
  updated_at: string;
}

export interface ExitIntentAnalytics {
  total_popup_shows: number;
  total_claims: number;
  total_conversions: number;
  claim_rate: number;
  conversion_rate: number;
  total_discount_given: number;
  revenue_generated: number;
  avg_discount_per_user: number;
  top_pages: Array<{
    page: string;
    shows: number;
    claims: number;
    conversions: number;
    claim_rate: number;
  }>;
  device_breakdown: Array<{
    device: string;
    shows: number;
    claims: number;
    claim_rate: number;
  }>;
  time_series: Array<{
    date: string;
    shows: number;
    claims: number;
    conversions: number;
  }>;
}

export interface ExitIntentJourneyEvent {
  id: string;
  user_id?: string;
  session_id: string;
  event_type: string;
  event_data: any;
  page_url?: string;
  timestamp: string;
  created_at: string;
}

export class ExitIntentAdminService {
  /**
   * Get exit-intent configuration
   */
  static async getConfiguration(): Promise<ExitIntentConfig | null> {
    try {
      // For now, return default configuration
      // In a real implementation, this would be stored in a database table
      return {
        id: 'default',
        is_enabled: true,
        sensitivity: 20,
        delay_ms: 100,
        cookie_expiry_hours: 24,
        show_on_mobile: true,
        aggressive_mode: false,
        min_time_on_page: 30,
        max_shows_per_session: 1,
        enabled_pages: ['/', '/pricing', '/subscription-flow', '/select-toys', '/about'],
        disabled_pages: ['/auth', '/dashboard', '/admin', '/confirmation-success'],
        user_type_restrictions: ['guest', 'authenticated'],
        discount_codes: ['SAVE20EXIT', 'MOBILE20', 'WELCOME20'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching exit-intent configuration:', error);
      return null;
    }
  }

  /**
   * Update exit-intent configuration
   */
  static async updateConfiguration(config: Partial<ExitIntentConfig>): Promise<boolean> {
    try {
      // In a real implementation, this would update the database
      console.log('Updating exit-intent configuration:', config);
      
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return true;
    } catch (error) {
      console.error('Error updating exit-intent configuration:', error);
      return false;
    }
  }

  /**
   * Get exit-intent analytics for a date range
   */
  static async getAnalytics(startDate: string, endDate: string): Promise<ExitIntentAnalytics> {
    try {
      // Fetch journey events for exit-intent popups
      const { data: journeyEvents, error: journeyError } = await supabase
        .from('user_journey_events')
        .select('*')
        .in('event_type', [
          'exit_intent_popup_shown',
          'exit_intent_offer_claimed', 
          'exit_intent_info_captured',
          'exit_intent_popup_dismissed'
        ])
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (journeyError) throw journeyError;

      // Fetch offer usage for exit-intent codes
      const { data: offerUsage, error: offerError } = await supabase
        .from('offer_usage_history')
        .select(`
          *,
          promotional_offers!inner(code, name)
        `)
        .in('promotional_offers.code', ['SAVE20EXIT', 'MOBILE20', 'WELCOME20'])
        .gte('used_at', startDate)
        .lte('used_at', endDate);

      if (offerError) throw offerError;

      // Calculate analytics
      const popupShows = journeyEvents?.filter(e => e.event_type === 'exit_intent_popup_shown') || [];
      const claims = journeyEvents?.filter(e => e.event_type === 'exit_intent_offer_claimed') || [];
      const conversions = offerUsage || [];

      const totalShows = popupShows.length;
      const totalClaims = claims.length;
      const totalConversions = conversions.length;
      const totalDiscountGiven = conversions.reduce((sum, usage) => sum + usage.discount_amount, 0);
      const revenueGenerated = conversions.reduce((sum, usage) => sum + usage.final_amount, 0);

      // Page breakdown
      const pageStats = new Map();
      popupShows.forEach(event => {
        const page = event.event_data?.currentPage || 'unknown';
        if (!pageStats.has(page)) {
          pageStats.set(page, { shows: 0, claims: 0, conversions: 0 });
        }
        pageStats.get(page).shows++;
      });

      claims.forEach(event => {
        const page = event.event_data?.currentPage || 'unknown';
        if (pageStats.has(page)) {
          pageStats.get(page).claims++;
        }
      });

      const topPages = Array.from(pageStats.entries()).map(([page, stats]) => ({
        page,
        shows: stats.shows,
        claims: stats.claims,
        conversions: stats.conversions,
        claim_rate: stats.shows > 0 ? (stats.claims / stats.shows) * 100 : 0
      })).sort((a, b) => b.shows - a.shows).slice(0, 5);

      // Device breakdown
      const deviceStats = new Map();
      popupShows.forEach(event => {
        const device = event.event_data?.deviceType || 'desktop';
        if (!deviceStats.has(device)) {
          deviceStats.set(device, { shows: 0, claims: 0 });
        }
        deviceStats.get(device).shows++;
      });

      claims.forEach(event => {
        const device = event.event_data?.deviceType || 'desktop';
        if (deviceStats.has(device)) {
          deviceStats.get(device).claims++;
        }
      });

      const deviceBreakdown = Array.from(deviceStats.entries()).map(([device, stats]) => ({
        device,
        shows: stats.shows,
        claims: stats.claims,
        claim_rate: stats.shows > 0 ? (stats.claims / stats.shows) * 100 : 0
      }));

      // Time series data (simplified - would need more complex grouping in real implementation)
      const timeSeriesMap = new Map();
      const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i < days; i++) {
        const date = new Date(new Date(startDate).getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        timeSeriesMap.set(dateStr, { date: dateStr, shows: 0, claims: 0, conversions: 0 });
      }

      popupShows.forEach(event => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        if (timeSeriesMap.has(date)) {
          timeSeriesMap.get(date).shows++;
        }
      });

      claims.forEach(event => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        if (timeSeriesMap.has(date)) {
          timeSeriesMap.get(date).claims++;
        }
      });

      conversions.forEach(usage => {
        const date = new Date(usage.used_at).toISOString().split('T')[0];
        if (timeSeriesMap.has(date)) {
          timeSeriesMap.get(date).conversions++;
        }
      });

      return {
        total_popup_shows: totalShows,
        total_claims: totalClaims,
        total_conversions: totalConversions,
        claim_rate: totalShows > 0 ? (totalClaims / totalShows) * 100 : 0,
        conversion_rate: totalClaims > 0 ? (totalConversions / totalClaims) * 100 : 0,
        total_discount_given: totalDiscountGiven,
        revenue_generated: revenueGenerated,
        avg_discount_per_user: totalConversions > 0 ? totalDiscountGiven / totalConversions : 0,
        top_pages: topPages,
        device_breakdown: deviceBreakdown,
        time_series: Array.from(timeSeriesMap.values())
      };

    } catch (error) {
      console.error('Error fetching exit-intent analytics:', error);
      
      // Return empty analytics on error
      return {
        total_popup_shows: 0,
        total_claims: 0,
        total_conversions: 0,
        claim_rate: 0,
        conversion_rate: 0,
        total_discount_given: 0,
        revenue_generated: 0,
        avg_discount_per_user: 0,
        top_pages: [],
        device_breakdown: [],
        time_series: []
      };
    }
  }

  /**
   * Get exit-intent journey events
   */
  static async getJourneyEvents(
    startDate: string, 
    endDate: string, 
    eventType?: string
  ): Promise<ExitIntentJourneyEvent[]> {
    try {
      let query = supabase
        .from('user_journey_events')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (eventType) {
        query = query.eq('event_type', eventType);
      } else {
        query = query.in('event_type', [
          'exit_intent_popup_shown',
          'exit_intent_offer_claimed', 
          'exit_intent_info_captured',
          'exit_intent_popup_dismissed'
        ]);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching journey events:', error);
      return [];
    }
  }

  /**
   * Clear exit-intent analytics data
   */
  static async clearAnalyticsData(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_journey_events')
        .delete()
        .in('event_type', [
          'exit_intent_popup_shown',
          'exit_intent_offer_claimed', 
          'exit_intent_info_captured',
          'exit_intent_popup_dismissed'
        ]);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error clearing analytics data:', error);
      return false;
    }
  }

  /**
   * Get exit-intent discount codes performance
   */
  static async getDiscountCodesPerformance(startDate: string, endDate: string) {
    try {
      const { data: offerUsage, error } = await supabase
        .from('offer_usage_history')
        .select(`
          *,
          promotional_offers!inner(code, name, type, value)
        `)
        .in('promotional_offers.code', ['SAVE20EXIT', 'MOBILE20', 'WELCOME20'])
        .gte('used_at', startDate)
        .lte('used_at', endDate);

      if (error) throw error;

      // Group by discount code
      const codeStats = new Map();
      
      (offerUsage || []).forEach(usage => {
        const code = usage.promotional_offers.code;
        if (!codeStats.has(code)) {
          codeStats.set(code, {
            code,
            name: usage.promotional_offers.name,
            usage_count: 0,
            total_discount: 0,
            total_revenue: 0,
            avg_discount: 0
          });
        }
        
        const stats = codeStats.get(code);
        stats.usage_count++;
        stats.total_discount += usage.discount_amount;
        stats.total_revenue += usage.final_amount;
      });

      // Calculate averages
      codeStats.forEach(stats => {
        stats.avg_discount = stats.usage_count > 0 ? stats.total_discount / stats.usage_count : 0;
      });

      return Array.from(codeStats.values()).sort((a, b) => b.usage_count - a.usage_count);
    } catch (error) {
      console.error('Error fetching discount codes performance:', error);
      return [];
    }
  }

  /**
   * Export analytics data to CSV
   */
  static exportAnalyticsToCSV(analytics: ExitIntentAnalytics): string {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Popup Shows', analytics.total_popup_shows.toString()],
      ['Total Claims', analytics.total_claims.toString()],
      ['Total Conversions', analytics.total_conversions.toString()],
      ['Claim Rate (%)', analytics.claim_rate.toFixed(2)],
      ['Conversion Rate (%)', analytics.conversion_rate.toFixed(2)],
      ['Total Discount Given (₹)', analytics.total_discount_given.toString()],
      ['Revenue Generated (₹)', analytics.revenue_generated.toString()],
      ['Average Discount per User (₹)', analytics.avg_discount_per_user.toFixed(2)],
      [''],
      ['Top Pages', ''],
      ['Page', 'Shows', 'Claims', 'Claim Rate (%)'],
      ...analytics.top_pages.map(page => [
        page.page,
        page.shows.toString(),
        page.claims.toString(),
        page.claim_rate.toFixed(2)
      ]),
      [''],
      ['Device Breakdown', ''],
      ['Device', 'Shows', 'Claims', 'Claim Rate (%)'],
      ...analytics.device_breakdown.map(device => [
        device.device,
        device.shows.toString(),
        device.claims.toString(),
        device.claim_rate.toFixed(2)
      ])
    ];

    return csvData.map(row => row.join(',')).join('\n');
  }
}
