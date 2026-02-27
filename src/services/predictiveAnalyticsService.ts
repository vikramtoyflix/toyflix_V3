import { supabase } from '@/integrations/supabase/client';

interface PricingRecommendation {
  toyId: string;
  toyName: string;
  currentPrice: number;
  recommendedPrice: number;
  priceChange: number;
  reason: string;
  expectedImpact: {
    demandChange: number;
    revenueChange: number;
    profitChange: number;
  };
}

interface SeasonalAnalysis {
  toyId: string;
  seasonalPatterns: {
    month: string;
    demandMultiplier: number;
    popularityScore: number;
  }[];
  peakSeasons: string[];
  lowSeasons: string[];
  recommendations: string[];
}

interface DemandForecast {
  toyId: string;
  predictedDemand: number;
  confidence: number;
  timeframe: string;
}

interface SlowMovingItem {
  toyId: string;
  toyName: string;
  daysWithoutRental: number;
  currentStock: number;
  totalInvestment: number;
  recommendedAction: 'discount' | 'bundle' | 'discontinue' | 'reposition';
  suggestedDiscountPercentage?: number;
}

export class PredictiveAnalyticsService {
  private static instance: PredictiveAnalyticsService;

  public static getInstance(): PredictiveAnalyticsService {
    if (!PredictiveAnalyticsService.instance) {
      PredictiveAnalyticsService.instance = new PredictiveAnalyticsService();
    }
    return PredictiveAnalyticsService.instance;
  }

  /**
   * Predict demand for toys over specified timeframe
   */
  async predictDemand(toyId: string, timeframeDays: number): Promise<DemandForecast> {
    console.log(`🔮 Predicting demand for toy ${toyId} over ${timeframeDays} days`);
    
    try {
      // Get historical data for the toy
      const { data: historicalData, error } = await supabase
        .from('order_items')
        .select(`
          quantity, created_at,
          orders!inner(status, created_at)
        `)
        .or(`toy_id.eq.${toyId},ride_on_toy_id.eq.${toyId}`)
        .gte('orders.created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()) // Last 180 days
        .in('orders.status', ['delivered', 'shipped']);

      if (error) throw error;

      const orders = historicalData || [];
      
      // Calculate weekly demand patterns
      const weeklyDemand = this.calculateWeeklyDemand(orders);
      
      // Apply seasonal factors
      const seasonalFactor = this.getSeasonalFactor(new Date());
      
      // Calculate trend
      const trendFactor = this.calculateTrendFactor(weeklyDemand);
      
      // Predict demand
      const averageWeeklyDemand = weeklyDemand.reduce((sum, week) => sum + week.demand, 0) / weeklyDemand.length;
      const weeksInTimeframe = timeframeDays / 7;
      const baseDemand = averageWeeklyDemand * weeksInTimeframe;
      const adjustedDemand = baseDemand * seasonalFactor * trendFactor;
      
      // Calculate confidence based on data availability
      const confidence = Math.min(orders.length / 20, 1); // Higher confidence with more data points
      
      return {
        toyId,
        predictedDemand: Math.round(Math.max(0, adjustedDemand)),
        confidence: confidence * 100,
        timeframe: `${timeframeDays} days`
      };
    } catch (error) {
      console.error('Error predicting demand:', error);
      return {
        toyId,
        predictedDemand: 0,
        confidence: 0,
        timeframe: `${timeframeDays} days`
      };
    }
  }

  /**
   * Analyze seasonal patterns for toys
   */
  async analyzeSeasonalPatterns(): Promise<SeasonalAnalysis[]> {
    console.log('📊 Analyzing seasonal patterns...');
    
    try {
      const { data: toys, error } = await supabase
        .from('toys')
        .select('id, name, category');

      if (error) throw error;

      const analyses: SeasonalAnalysis[] = [];

      for (const toy of toys || []) {
        const { data: yearlyData, error: dataError } = await supabase
          .from('order_items')
          .select(`
            quantity, created_at,
            orders!inner(status, created_at)
          `)
          .or(`toy_id.eq.${toy.id},ride_on_toy_id.eq.${toy.id}`)
          .gte('orders.created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
          .in('orders.status', ['delivered', 'shipped']);

        if (dataError) continue;

        const monthlyData = this.groupByMonth(yearlyData || []);
        const seasonalPatterns = this.calculateSeasonalPatterns(monthlyData);
        
        const analysis: SeasonalAnalysis = {
          toyId: toy.id,
          seasonalPatterns,
          peakSeasons: seasonalPatterns
            .filter(p => p.demandMultiplier > 1.2)
            .map(p => p.month),
          lowSeasons: seasonalPatterns
            .filter(p => p.demandMultiplier < 0.8)
            .map(p => p.month),
          recommendations: this.generateSeasonalRecommendations(seasonalPatterns, toy.category)
        };

        analyses.push(analysis);
      }

      console.log(`✅ Analyzed seasonal patterns for ${analyses.length} toys`);
      return analyses;
    } catch (error) {
      console.error('❌ Error analyzing seasonal patterns:', error);
      throw error;
    }
  }

  /**
   * Generate pricing recommendations based on demand and competition
   */
  async suggestDiscountPricing(): Promise<PricingRecommendation[]> {
    console.log('💰 Generating pricing recommendations...');
    
    try {
      const { data: toys, error } = await supabase
        .from('toys')
        .select('id, name, rental_price, category, available_quantity, total_quantity');

      if (error) throw error;

      const recommendations: PricingRecommendation[] = [];

      for (const toy of toys || []) {
        // Get recent demand data
        const demandForecast = await this.predictDemand(toy.id, 30);
        
        // Calculate utilization rate
        const utilizationRate = toy.total_quantity > 0 ? 
          ((toy.total_quantity - toy.available_quantity) / toy.total_quantity) * 100 : 0;
        
        // Generate pricing recommendation
        const currentPrice = toy.rental_price || 0;
        let recommendedPrice = currentPrice;
        let reason = 'Current pricing is optimal';
        
        // Low utilization - suggest discount
        if (utilizationRate < 30 && demandForecast.predictedDemand < 2) {
          recommendedPrice = currentPrice * 0.85; // 15% discount
          reason = 'Low utilization rate suggests price reduction to increase demand';
        }
        // High utilization - suggest price increase
        else if (utilizationRate > 80 && demandForecast.predictedDemand > 5) {
          recommendedPrice = currentPrice * 1.15; // 15% increase
          reason = 'High demand and utilization support price increase';
        }
        // Seasonal adjustment
        else if (this.isSeasonalPeak(toy.category)) {
          recommendedPrice = currentPrice * 1.1; // 10% increase
          reason = 'Seasonal peak period supports temporary price increase';
        }

        if (recommendedPrice !== currentPrice) {
          recommendations.push({
            toyId: toy.id,
            toyName: toy.name,
            currentPrice,
            recommendedPrice: Math.round(recommendedPrice),
            priceChange: recommendedPrice - currentPrice,
            reason,
            expectedImpact: {
              demandChange: recommendedPrice < currentPrice ? 20 : -10, // % change in demand
              revenueChange: ((recommendedPrice - currentPrice) / currentPrice) * 100,
              profitChange: ((recommendedPrice - currentPrice) / currentPrice) * 100 * 0.8 // Assuming 80% profit margin
            }
          });
        }
      }

      console.log(`💡 Generated ${recommendations.length} pricing recommendations`);
      return recommendations;
    } catch (error) {
      console.error('❌ Error generating pricing recommendations:', error);
      throw error;
    }
  }

  /**
   * Identify slow-moving stock with actionable recommendations
   */
  async identifySlowMovingStock(): Promise<SlowMovingItem[]> {
    console.log('🐌 Identifying slow-moving stock...');
    
    try {
      const { data: toys, error } = await supabase
        .from('toys')
        .select('id, name, rental_price, available_quantity, total_quantity, updated_at')
        .gt('available_quantity', 0);

      if (error) throw error;

      const slowMovingItems: SlowMovingItem[] = [];

      for (const toy of toys || []) {
        // Check recent rental activity
        const { data: recentOrders, error: ordersError } = await supabase
          .from('order_items')
          .select('quantity, orders!inner(created_at)')
          .or(`toy_id.eq.${toy.id},ride_on_toy_id.eq.${toy.id}`)
          .gte('orders.created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

        if (ordersError) continue;

        const totalRentals = recentOrders?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        const daysSinceLastUpdate = toy.updated_at ? 
          Math.floor((Date.now() - new Date(toy.updated_at).getTime()) / (24 * 60 * 60 * 1000)) : 60;

        // Consider slow-moving if no rentals in 60 days
        if (totalRentals === 0 && daysSinceLastUpdate > 30) {
          // Use rental price as proxy for investment cost
          const totalInvestment = (toy.rental_price * 0.4) * toy.total_quantity;
          
          // Determine recommended action
          let recommendedAction: 'discount' | 'bundle' | 'discontinue' | 'reposition' = 'discount';
          let suggestedDiscountPercentage = 20;
          
          if (daysSinceLastUpdate > 90) {
            recommendedAction = 'discontinue';
          } else if (totalInvestment > 5000) {
            recommendedAction = 'bundle';
          } else if (daysSinceLastUpdate > 60) {
            recommendedAction = 'discount';
            suggestedDiscountPercentage = 30;
          } else {
            recommendedAction = 'reposition';
          }

          slowMovingItems.push({
            toyId: toy.id,
            toyName: toy.name,
            daysWithoutRental: daysSinceLastUpdate,
            currentStock: toy.available_quantity,
            totalInvestment,
            recommendedAction,
            suggestedDiscountPercentage: recommendedAction === 'discount' ? suggestedDiscountPercentage : undefined
          });
        }
      }

      console.log(`📊 Found ${slowMovingItems.length} slow-moving items`);
      return slowMovingItems;
    } catch (error) {
      console.error('❌ Error identifying slow-moving stock:', error);
      throw error;
    }
  }

  /**
   * Calculate weekly demand patterns
   */
  private calculateWeeklyDemand(orders: any[]): { week: string; demand: number }[] {
    const weeklyData: Record<string, number> = {};
    
    orders.forEach(order => {
      const date = new Date(order.orders.created_at);
      const weekKey = `${date.getFullYear()}-W${this.getWeekNumber(date)}`;
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + (order.quantity || 0);
    });

    return Object.entries(weeklyData).map(([week, demand]) => ({ week, demand }));
  }

  /**
   * Get seasonal factor for current date
   */
  private getSeasonalFactor(date: Date): number {
    const month = date.getMonth();
    const seasonalFactors = {
      0: 0.8,  // January
      1: 0.9,  // February
      2: 1.0,  // March
      3: 1.1,  // April
      4: 1.2,  // May
      5: 1.1,  // June
      6: 1.3,  // July
      7: 1.2,  // August
      8: 1.1,  // September
      9: 1.2,  // October
      10: 1.4, // November
      11: 1.5  // December
    };

    return seasonalFactors[month as keyof typeof seasonalFactors] || 1.0;
  }

  /**
   * Calculate trend factor from weekly demand
   */
  private calculateTrendFactor(weeklyDemand: { week: string; demand: number }[]): number {
    if (weeklyDemand.length < 4) return 1.0;

    const recentWeeks = weeklyDemand.slice(-4);
    const olderWeeks = weeklyDemand.slice(0, Math.max(1, weeklyDemand.length - 4));

    const recentAverage = recentWeeks.reduce((sum, week) => sum + week.demand, 0) / recentWeeks.length;
    const olderAverage = olderWeeks.reduce((sum, week) => sum + week.demand, 0) / olderWeeks.length;

    if (olderAverage === 0) return 1.0;

    const trendFactor = recentAverage / olderAverage;
    return Math.max(0.5, Math.min(2.0, trendFactor)); // Cap between 0.5 and 2.0
  }

  /**
   * Group orders by month
   */
  private groupByMonth(orders: any[]): Record<string, number> {
    const monthlyData: Record<string, number> = {};
    
    orders.forEach(order => {
      const date = new Date(order.orders.created_at);
      const monthKey = date.toLocaleString('default', { month: 'long' });
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (order.quantity || 0);
    });

    return monthlyData;
  }

  /**
   * Calculate seasonal patterns from monthly data
   */
  private calculateSeasonalPatterns(monthlyData: Record<string, number>): SeasonalAnalysis['seasonalPatterns'] {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const totalDemand = Object.values(monthlyData).reduce((sum, demand) => sum + demand, 0);
    const averageDemand = totalDemand / 12;

    return months.map(month => ({
      month,
      demandMultiplier: averageDemand > 0 ? (monthlyData[month] || 0) / averageDemand : 1,
      popularityScore: ((monthlyData[month] || 0) / totalDemand) * 100
    }));
  }

  /**
   * Generate seasonal recommendations
   */
  private generateSeasonalRecommendations(patterns: SeasonalAnalysis['seasonalPatterns'], category: string): string[] {
    const recommendations: string[] = [];
    
    const highDemandMonths = patterns.filter(p => p.demandMultiplier > 1.2);
    const lowDemandMonths = patterns.filter(p => p.demandMultiplier < 0.8);

    if (highDemandMonths.length > 0) {
      recommendations.push(`Peak demand in ${highDemandMonths.map(m => m.month).join(', ')} - increase stock levels`);
    }

    if (lowDemandMonths.length > 0) {
      recommendations.push(`Low demand in ${lowDemandMonths.map(m => m.month).join(', ')} - consider promotions`);
    }

    if (category === 'outdoor' && patterns.some(p => p.month === 'July' && p.demandMultiplier > 1.5)) {
      recommendations.push('Summer toys show high demand - stock up before June');
    }

    return recommendations;
  }

  /**
   * Check if current period is a seasonal peak for category
   */
  private isSeasonalPeak(category: string): boolean {
    const currentMonth = new Date().getMonth();
    
    // Simplified seasonal peaks by category
    const seasonalPeaks = {
      'outdoor': [5, 6, 7], // June, July, August
      'educational': [8, 9], // September, October (back to school)
      'holiday': [10, 11], // November, December
      'default': [10, 11] // Default to holiday season
    };

    const peaks = seasonalPeaks[category as keyof typeof seasonalPeaks] || seasonalPeaks.default;
    return peaks.includes(currentMonth);
  }

  /**
   * Get week number for date
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}

// Export singleton instance
export const predictiveAnalyticsService = PredictiveAnalyticsService.getInstance(); 