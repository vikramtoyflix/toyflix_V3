import { supabase } from '@/integrations/supabase/client';
import { ReorderRecommendation, InventoryMovement, PurchaseOrder } from '@/types/inventory';

interface DemandForecast {
  toyId: string;
  predictedDemand: number;
  confidence: number;
  seasonalFactor: number;
  trendFactor: number;
  nextMonthDemand: number;
}

interface StockOptimization {
  toyId: string;
  currentStock: number;
  optimalStock: number;
  adjustmentNeeded: number;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

interface DemandPattern {
  toyId: string;
  averageDemand: number;
  demandVariability: number;
  seasonalPeaks: string[];
  leadTime: number;
}

export class AutomatedInventoryService {
  private static instance: AutomatedInventoryService;

  public static getInstance(): AutomatedInventoryService {
    if (!AutomatedInventoryService.instance) {
      AutomatedInventoryService.instance = new AutomatedInventoryService();
    }
    return AutomatedInventoryService.instance;
  }

  /**
   * Analyze inventory needs based on historical data and demand patterns
   */
  async analyzeInventoryNeeds(): Promise<ReorderRecommendation[]> {
    console.log('🔍 Analyzing inventory needs...');
    
    try {
      // Get toys with their current stock and historical data
      const { data: toys, error: toysError } = await supabase
        .from('toys')
        .select(`
          id, name, available_quantity, total_quantity, reorder_level, 
          reorder_quantity, purchase_cost, rental_price, category,
          inventory_status, supplier_id
        `)
        .eq('inventory_status', 'active');

      if (toysError) throw toysError;

      const recommendations: ReorderRecommendation[] = [];

      for (const toy of toys || []) {
        // Get demand forecast for this toy
        const forecast = await this.predictDemand(toy.id, 30); // 30 days forecast
        
        // Calculate optimal stock level
        const optimization = await this.calculateOptimalStock(toy, forecast);
        
        // Check if reorder is needed
        if (optimization.adjustmentNeeded > 0) {
          const recommendation: ReorderRecommendation = {
            toyId: toy.id,
            toyName: toy.name,
            currentStock: toy.available_quantity || 0,
            recommendedOrderQuantity: Math.max(optimization.adjustmentNeeded, toy.reorder_quantity || 10),
            urgency: this.calculateUrgency(toy, forecast),
            reasoning: optimization.reasoning,
            expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default
            costAnalysis: {
              unitCost: toy.purchase_cost || (toy.rental_price * 0.4) || 100,
              totalCost: (toy.purchase_cost || (toy.rental_price * 0.4) || 100) * optimization.adjustmentNeeded,
              expectedRevenue: (toy.rental_price || 0) * optimization.adjustmentNeeded * 3,
              projectedProfit: ((toy.rental_price || 0) * optimization.adjustmentNeeded * 3) - 
                              ((toy.purchase_cost || (toy.rental_price * 0.4) || 100) * optimization.adjustmentNeeded)
            }
          };
          
          recommendations.push(recommendation);
        }
      }

      // Sort by urgency and potential profit
      recommendations.sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 };
        const urgencyScore = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
        if (urgencyScore !== 0) return urgencyScore;
        return b.costAnalysis.projectedProfit - a.costAnalysis.projectedProfit;
      });

      console.log(`✅ Generated ${recommendations.length} reorder recommendations`);
      return recommendations;
    } catch (error) {
      console.error('❌ Error analyzing inventory needs:', error);
      throw error;
    }
  }

  /**
   * Predict demand for a specific toy over a given timeframe
   */
  async predictDemand(toyId: string, timeframeDays: number): Promise<DemandForecast> {
    try {
      // Get historical rental data
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          quantity, created_at,
          orders!inner(status, created_at)
        `)
        .or(`toy_id.eq.${toyId},ride_on_toy_id.eq.${toyId}`)
        .gte('orders.created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
        .in('orders.status', ['delivered', 'active', 'completed']);

      if (error) throw error;

      const historicalData = orderItems || [];
      
      // Calculate average daily demand
      const totalQuantity = historicalData.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const averageDailyDemand = totalQuantity / 90; // Over 90 days
      
      // Calculate seasonal factors (simplified)
      const currentMonth = new Date().getMonth();
      const seasonalFactors = this.getSeasonalFactors(currentMonth);
      
      // Calculate trend (growing/declining demand)
      const trendFactor = this.calculateTrend(historicalData);
      
      // Predict demand for the timeframe
      const baseDemand = averageDailyDemand * timeframeDays;
      const seasonalAdjustedDemand = baseDemand * seasonalFactors;
      const trendAdjustedDemand = seasonalAdjustedDemand * trendFactor;
      
      // Calculate confidence based on data availability
      const confidence = Math.min(historicalData.length / 10, 1); // Higher confidence with more data
      
      return {
        toyId,
        predictedDemand: Math.round(trendAdjustedDemand),
        confidence,
        seasonalFactor: seasonalFactors,
        trendFactor,
        nextMonthDemand: Math.round(averageDailyDemand * 30 * seasonalFactors * trendFactor)
      };
    } catch (error) {
      console.error('Error predicting demand:', error);
      // Return conservative estimate
      return {
        toyId,
        predictedDemand: 2,
        confidence: 0.3,
        seasonalFactor: 1,
        trendFactor: 1,
        nextMonthDemand: 2
      };
    }
  }

  /**
   * Calculate optimal stock levels for a toy
   */
  private async calculateOptimalStock(toy: any, forecast: DemandForecast): Promise<StockOptimization> {
    const currentStock = toy.available_quantity || 0;
    const reorderLevel = toy.reorder_level || 5;
    const leadTimeDays = 14; // Default lead time
    
    // Calculate safety stock (buffer for demand variability)
    const safetyStock = Math.ceil(forecast.predictedDemand * 0.2); // 20% buffer
    
    // Calculate optimal stock level
    const leadTimeDemand = (forecast.predictedDemand / 30) * leadTimeDays; // Demand during lead time
    const optimalStock = Math.ceil(leadTimeDemand + safetyStock);
    
    // Determine if adjustment is needed
    const adjustmentNeeded = Math.max(0, optimalStock - currentStock);
    
    let reasoning = '';
    let priority: 'high' | 'medium' | 'low' = 'medium';
    
    if (currentStock === 0) {
      reasoning = 'Out of stock - immediate reorder required';
      priority = 'high';
    } else if (currentStock <= reorderLevel) {
      reasoning = `Stock below reorder level (${reorderLevel}). Predicted demand: ${forecast.predictedDemand} units`;
      priority = forecast.confidence > 0.7 ? 'high' : 'medium';
    } else if (adjustmentNeeded > 0) {
      reasoning = `Forecasted demand (${forecast.predictedDemand}) exceeds current capacity`;
      priority = 'medium';
    } else {
      reasoning = 'Stock levels adequate for forecasted demand';
      priority = 'low';
    }
    
    return {
      toyId: toy.id,
      currentStock,
      optimalStock,
      adjustmentNeeded,
      reasoning,
      priority
    };
  }

  /**
   * Calculate urgency for reorder recommendation
   */
  private calculateUrgency(toy: any, forecast: DemandForecast): 'high' | 'medium' | 'low' {
    const currentStock = toy.available_quantity || 0;
    const daysOfStock = currentStock / Math.max(forecast.predictedDemand / 30, 0.1); // Days of stock remaining
    
    if (currentStock === 0) return 'high';
    if (daysOfStock < 7) return 'high'; // Less than a week of stock
    if (daysOfStock < 14) return 'medium'; // Less than two weeks of stock
    return 'low';
  }

  /**
   * Get seasonal adjustment factors
   */
  private getSeasonalFactors(currentMonth: number): number {
    // Simplified seasonal factors for toy industry
    const seasonalFactors = {
      0: 0.8, // January - post-holiday low
      1: 0.9, // February
      2: 1.0, // March
      3: 1.1, // April - spring
      4: 1.2, // May
      5: 1.1, // June
      6: 1.3, // July - summer holidays
      7: 1.2, // August
      8: 1.1, // September - back to school
      9: 1.2, // October
      10: 1.4, // November - pre-holiday
      11: 1.5  // December - holiday season
    };
    
    return seasonalFactors[currentMonth as keyof typeof seasonalFactors] || 1.0;
  }

  /**
   * Calculate demand trend
   */
  private calculateTrend(historicalData: any[]): number {
    if (historicalData.length < 2) return 1.0;
    
    // Simple trend calculation: compare recent vs older demand
    const sortedData = historicalData.sort((a, b) => 
      new Date(a.orders.created_at).getTime() - new Date(b.orders.created_at).getTime()
    );
    
    const midPoint = Math.floor(sortedData.length / 2);
    const olderPeriod = sortedData.slice(0, midPoint);
    const recentPeriod = sortedData.slice(midPoint);
    
    const olderDemand = olderPeriod.reduce((sum, item) => sum + (item.quantity || 0), 0) / olderPeriod.length;
    const recentDemand = recentPeriod.reduce((sum, item) => sum + (item.quantity || 0), 0) / recentPeriod.length;
    
    if (olderDemand === 0) return 1.0;
    
    const trendFactor = recentDemand / olderDemand;
    
    // Cap trend factor to reasonable range
    return Math.max(0.5, Math.min(2.0, trendFactor));
  }

  /**
   * Generate automatic purchase orders based on recommendations
   */
  async generatePurchaseOrders(recommendations?: ReorderRecommendation[]): Promise<PurchaseOrder[]> {
    console.log('🛒 Generating automatic purchase orders...');
    
    try {
      const reorderRecommendations = recommendations || await this.analyzeInventoryNeeds();
      const highPriorityRecommendations = reorderRecommendations.filter(r => r.urgency === 'high');
      
      if (highPriorityRecommendations.length === 0) {
        console.log('No high-priority reorders needed');
        return [];
      }

      // Group recommendations by supplier
      const supplierGroups = await this.groupBySupplier(highPriorityRecommendations);
      const generatedOrders: PurchaseOrder[] = [];

      for (const [supplierId, items] of Object.entries(supplierGroups)) {
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', supplierId)
          .single();

        if (!supplier) continue;

        // Create purchase order
        const orderNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
        const totalAmount = items.reduce((sum, item) => sum + item.costAnalysis.totalCost, 0);

        const { data: purchaseOrder, error } = await supabase
          .from('purchase_orders')
          .insert({
            order_number: orderNumber,
            supplier_id: supplierId,
            status: 'draft',
            total_amount: totalAmount,
            expected_delivery_date: new Date(Date.now() + (supplier.lead_time_days || 14) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: `Auto-generated based on inventory analysis. ${items.length} items requiring urgent reorder.`
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating purchase order:', error);
          continue;
        }

        // Add purchase order items
        const orderItems = items.map(item => ({
          purchase_order_id: purchaseOrder.id,
          toy_id: item.toyId,
          quantity: item.recommendedOrderQuantity,
          unit_cost: item.costAnalysis.unitCost
        }));

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('Error creating purchase order items:', itemsError);
          continue;
        }

        generatedOrders.push(purchaseOrder);
      }

      console.log(`✅ Generated ${generatedOrders.length} automatic purchase orders`);
      return generatedOrders;
    } catch (error) {
      console.error('❌ Error generating purchase orders:', error);
      throw error;
    }
  }

  /**
   * Group recommendations by supplier
   */
  private async groupBySupplier(recommendations: ReorderRecommendation[]): Promise<Record<string, ReorderRecommendation[]>> {
    const groups: Record<string, ReorderRecommendation[]> = {};

    for (const recommendation of recommendations) {
      const { data: toy } = await supabase
        .from('toys')
        .select('supplier_id')
        .eq('id', recommendation.toyId)
        .single();

      const supplierId = toy?.supplier_id || 'unknown';
      
      if (!groups[supplierId]) {
        groups[supplierId] = [];
      }
      groups[supplierId].push(recommendation);
    }

    return groups;
  }

  /**
   * Optimize stock levels across all toys
   */
  async optimizeStockLevels(): Promise<StockOptimization[]> {
    console.log('⚡ Optimizing stock levels...');
    
    try {
      const { data: toys, error } = await supabase
        .from('toys')
        .select('*')
        .eq('inventory_status', 'active');

      if (error) throw error;

      const optimizations: StockOptimization[] = [];

      for (const toy of toys || []) {
        const forecast = await this.predictDemand(toy.id, 30);
        const optimization = await this.calculateOptimalStock(toy, forecast);
        optimizations.push(optimization);
      }

      // Sort by priority and adjustment needed
      optimizations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityScore = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityScore !== 0) return priorityScore;
        return b.adjustmentNeeded - a.adjustmentNeeded;
      });

      console.log(`✅ Generated optimization recommendations for ${optimizations.length} toys`);
      return optimizations;
    } catch (error) {
      console.error('❌ Error optimizing stock levels:', error);
      throw error;
    }
  }

  /**
   * Identify slow-moving stock
   */
  async identifySlowMovingStock(daysThreshold: number = 90): Promise<any[]> {
    console.log('🐌 Identifying slow-moving stock...');
    
    try {
      const { data: toys, error } = await supabase
        .from('toys')
        .select(`
          id, name, category, available_quantity, total_quantity,
          rental_price, created_at, updated_at
        `)
        .eq('inventory_status', 'active')
        .gt('available_quantity', 0);

      if (error) throw error;

      const slowMovingItems = [];
      const cutoffDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

      for (const toy of toys || []) {
        // Check recent rental activity
        const { data: recentOrders, error: ordersError } = await supabase
          .from('order_items')
          .select('quantity, orders!inner(created_at)')
          .or(`toy_id.eq.${toy.id},ride_on_toy_id.eq.${toy.id}`)
          .gte('orders.created_at', cutoffDate.toISOString());

        if (ordersError) continue;

        const totalRentals = recentOrders?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        const daysSinceLastRental = toy.updated_at ? 
          Math.floor((Date.now() - new Date(toy.updated_at).getTime()) / (24 * 60 * 60 * 1000)) : 
          daysThreshold;

        // Consider slow-moving if very few rentals in the period
        if (totalRentals <= 1 && daysSinceLastRental > 30) {
          slowMovingItems.push({
            ...toy,
            totalRentals,
            daysSinceLastRental,
            utilizationRate: toy.total_quantity > 0 ? 
              ((toy.total_quantity - toy.available_quantity) / toy.total_quantity) * 100 : 0
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
}

// Export singleton instance
export const automatedInventoryService = AutomatedInventoryService.getInstance(); 