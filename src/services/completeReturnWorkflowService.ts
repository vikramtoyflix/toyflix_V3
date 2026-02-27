/**
 * Complete Return Processing Workflow Service
 * Handles the full return lifecycle with quality control and pickup integration
 * Integrates pickup scheduling → quality assessment → inventory restoration
 */

import { supabase } from '@/integrations/supabase/client';
import { PickupManagementService } from './pickupManagementService';
import { AtomicDispatchInventoryService } from './atomicDispatchInventoryService';
import { StandardizedDispatchService } from './standardizedDispatchService';

// ========================================
// TYPES
// ========================================

export interface ReturnRequest {
  id: string;
  dispatchOrderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  requestDate: string;
  requestReason: 'cycle_end' | 'early_return' | 'damage_claim' | 'customer_request';
  priority: 'high' | 'medium' | 'low';
  scheduledPickupDate?: string;
  actualPickupDate?: string;
  status: 'requested' | 'pickup_scheduled' | 'picked_up' | 'quality_check' | 'processed' | 'completed' | 'cancelled';
  totalToys: number;
  notes?: string;
}

export interface QualityCheckResult {
  toyUUID: string;
  toyName: string;
  condition: 'excellent' | 'good' | 'fair' | 'damaged' | 'missing';
  damageNotes?: string;
  photosRequired: boolean;
  repairRequired: boolean;
  replacementRequired: boolean;
  valueImpact: number; // 0-100 percentage
  qualityCheckBy: string;
  qualityCheckDate: string;
}

export interface ReturnProcessingResult {
  returnRequestId: string;
  processedToys: number;
  inventoryRestored: number;
  damagedToys: number;
  missingToys: number;
  totalValueRecovered: number;
  qualityCheckResults: QualityCheckResult[];
  customerNotification: {
    sent: boolean;
    method: 'sms' | 'email' | 'call';
    message: string;
  };
  followUpActions: string[];
}

export interface ReturnWorkflowMetrics {
  totalReturns: number;
  avgProcessingTime: number; // hours
  qualityDistribution: Record<string, number>;
  inventoryRecoveryRate: number; // percentage
  customerSatisfactionScore: number;
  overdueReturns: number;
  followUpRequired: number;
}

// ========================================
// COMPLETE RETURN WORKFLOW SERVICE
// ========================================

export class CompleteReturnWorkflowService {

  /**
   * Initialize return request when cycle ends or customer requests return
   */
  static async initiateReturnRequest(params: {
    dispatchOrderId: string;
    customerId: string;
    requestReason: 'cycle_end' | 'early_return' | 'damage_claim' | 'customer_request';
    priority?: 'high' | 'medium' | 'low';
    customerNotes?: string;
  }): Promise<{
    success: boolean;
    returnRequestId?: string;
    scheduledPickupDate?: string;
    error?: string;
  }> {
    try {
      console.log('🔄 Initiating return request:', params);

      // Step 1: Get dispatch order details
      const dispatchDetails = await StandardizedDispatchService.getDispatchOrderDetails(params.dispatchOrderId);
      if (!dispatchDetails) {
        return {
          success: false,
          error: 'Dispatch order not found'
        };
      }

      // Step 2: Create return request record
      const { data: returnRequest, error: createError } = await (supabase as any)
        .from('return_requests')
        .insert({
          dispatch_order_id: params.dispatchOrderId,
          customer_id: params.customerId,
          customer_name: dispatchDetails.dispatchOrder.customerName,
          customer_phone: dispatchDetails.dispatchOrder.customerPhone,
          request_reason: params.requestReason,
          priority: params.priority || 'medium',
          total_toys: dispatchDetails.totalToys,
          status: 'requested',
          notes: params.customerNotes
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create return request:', createError);
        return {
          success: false,
          error: createError.message
        };
      }

      // Step 3: Auto-schedule pickup if cycle_end
      let scheduledPickupDate;
      if (params.requestReason === 'cycle_end') {
        const pickupResult = await this.scheduleReturnPickup(returnRequest.id);
        if (pickupResult.success) {
          scheduledPickupDate = pickupResult.scheduledDate;
        }
      }

      console.log('✅ Return request initiated successfully:', returnRequest.id);
      return {
        success: true,
        returnRequestId: returnRequest.id,
        scheduledPickupDate
      };
    } catch (error: any) {
      console.error('💥 Failed to initiate return request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Schedule pickup for return request
   */
  static async scheduleReturnPickup(returnRequestId: string): Promise<{
    success: boolean;
    scheduledDate?: string;
    pickupId?: string;
    error?: string;
  }> {
    try {
      console.log('📅 Scheduling return pickup for request:', returnRequestId);

      // Get return request details
      const { data: returnRequest, error: requestError } = await (supabase as any)
        .from('return_requests')
        .select(`
          *, 
          dispatch_orders!inner(shipping_address, expected_return_date),
          custom_users!inner(zip_code)
        `)
        .eq('id', returnRequestId)
        .single();

      if (requestError || !returnRequest) {
        return {
          success: false,
          error: 'Return request not found'
        };
      }

      // Get customer pincode
      const customerPincode = returnRequest.dispatch_orders.shipping_address?.pincode || 
                             returnRequest.custom_users.zip_code;

      if (!customerPincode) {
        return {
          success: false,
          error: 'Customer pincode not found'
        };
      }

      // Calculate pickup date (based on expected return date or current + 2 days)
      const expectedReturnDate = new Date(returnRequest.dispatch_orders.expected_return_date);
      const currentDate = new Date();
      const pickupDate = expectedReturnDate > currentDate ? expectedReturnDate : 
                        new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000);

      // Get pickup day for pincode
      const pickupService = new PickupManagementService();
      const pickupDay = await pickupService.getPickupDayForPincode(customerPincode);

      if (!pickupDay) {
        return {
          success: false,
          error: `No pickup day configured for pincode ${customerPincode}`
        };
      }

      // Create scheduled pickup
      const scheduledPickup = await pickupService.createScheduledPickup({
        rental_order_id: '', // Not applicable for returns
        customer_id: returnRequest.customer_id,
        customer_name: returnRequest.customer_name,
        customer_phone: returnRequest.customer_phone,
        customer_address: JSON.stringify(returnRequest.dispatch_orders.shipping_address),
        pincode: customerPincode,
        pickup_day: pickupDay,
        scheduled_date: pickupDate.toISOString().split('T')[0],
        scheduled_time_slot: '10:00-12:00',
        toys_to_pickup: [], // Will be populated from dispatch order
        pickup_status: 'scheduled',
        special_instructions: `Return pickup for ${returnRequest.request_reason}`,
        cycle_day: 30 // End of cycle
      });

      // Update return request with pickup details
      await (supabase as any)
        .from('return_requests')
        .update({
          status: 'pickup_scheduled',
          scheduled_pickup_date: pickupDate.toISOString().split('T')[0],
          pickup_id: scheduledPickup.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', returnRequestId);

      console.log('✅ Return pickup scheduled successfully');
      return {
        success: true,
        scheduledDate: pickupDate.toISOString().split('T')[0],
        pickupId: scheduledPickup.id
      };
    } catch (error: any) {
      console.error('💥 Failed to schedule return pickup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process picked up toys through quality check
   */
  static async processQualityCheck(params: {
    returnRequestId: string;
    qualityCheckResults: Array<{
      toyUUID: string;
      condition: 'excellent' | 'good' | 'fair' | 'damaged' | 'missing';
      damageNotes?: string;
      photosRequired?: boolean;
      repairRequired?: boolean;
      replacementRequired?: boolean;
      valueImpact?: number; // 0-100
    }>;
    qualityCheckBy: string;
    overallNotes?: string;
  }): Promise<{
    success: boolean;
    processedToys: number;
    qualityResults: QualityCheckResult[];
    nextActions: string[];
    error?: string;
  }> {
    try {
      console.log('🔍 Processing quality check for return request:', params.returnRequestId);

      const qualityResults: QualityCheckResult[] = [];
      const nextActions: string[] = [];

      // Process each toy's quality check
      for (const result of params.qualityCheckResults) {
        const qualityResult: QualityCheckResult = {
          toyUUID: result.toyUUID,
          toyName: '', // Will be fetched
          condition: result.condition,
          damageNotes: result.damageNotes,
          photosRequired: result.photosRequired || false,
          repairRequired: result.repairRequired || false,
          replacementRequired: result.replacementRequired || false,
          valueImpact: result.valueImpact || this.calculateValueImpact(result.condition),
          qualityCheckBy: params.qualityCheckBy,
          qualityCheckDate: new Date().toISOString()
        };

        // Get toy name from UUID
        const toyInfo = await StandardizedDispatchService.searchByUUID(result.toyUUID);
        if (toyInfo.success && toyInfo.toyInfo) {
          qualityResult.toyName = toyInfo.toyInfo.toyName;
        }

        qualityResults.push(qualityResult);

        // Determine next actions based on condition
        if (result.condition === 'damaged' && result.repairRequired) {
          nextActions.push(`Repair required for ${qualityResult.toyName}`);
        }
        if (result.condition === 'missing') {
          nextActions.push(`Investigation required for missing ${qualityResult.toyName}`);
        }
        if (result.photosRequired) {
          nextActions.push(`Photo documentation required for ${qualityResult.toyName}`);
        }
      }

      // Store quality check results
      const { error: insertError } = await (supabase as any)
        .from('quality_check_results')
        .insert(
          qualityResults.map(result => ({
            return_request_id: params.returnRequestId,
            toy_uuid: result.toyUUID,
            toy_name: result.toyName,
            condition: result.condition,
            damage_notes: result.damageNotes,
            photos_required: result.photosRequired,
            repair_required: result.repairRequired,
            replacement_required: result.replacementRequired,
            value_impact: result.valueImpact,
            quality_check_by: result.qualityCheckBy,
            quality_check_date: result.qualityCheckDate
          }))
        );

      if (insertError) {
        console.error('❌ Failed to store quality check results:', insertError);
      }

      // Update return request status
      await (supabase as any)
        .from('return_requests')
        .update({
          status: 'quality_check',
          quality_check_completed_at: new Date().toISOString(),
          quality_check_by: params.qualityCheckBy,
          quality_check_notes: params.overallNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.returnRequestId);

      console.log('✅ Quality check processing completed');
      return {
        success: true,
        processedToys: params.qualityCheckResults.length,
        qualityResults,
        nextActions: [...new Set(nextActions)] // Remove duplicates
      };
    } catch (error: any) {
      console.error('💥 Failed to process quality check:', error);
      return {
        success: false,
        processedToys: 0,
        qualityResults: [],
        nextActions: [],
        error: error.message
      };
    }
  }

  /**
   * Complete return processing and restore inventory
   */
  static async completeReturnProcessing(params: {
    returnRequestId: string;
    processedBy: string;
    customerNotificationMethod?: 'sms' | 'email' | 'call';
    finalNotes?: string;
  }): Promise<ReturnProcessingResult> {
    try {
      console.log('🔄 Completing return processing for request:', params.returnRequestId);

      // Get return request and quality check results
      const { data: returnData, error: returnError } = await (supabase as any)
        .from('return_requests')
        .select(`
          *, 
          quality_check_results(*),
          dispatch_orders!inner(id)
        `)
        .eq('id', params.returnRequestId)
        .single();

      if (returnError || !returnData) {
        throw new Error('Return request not found');
      }

      // Process inventory restoration using atomic service
      const returnResult = await AtomicDispatchInventoryService.processReturnWithInventoryRestore({
        dispatchOrderId: returnData.dispatch_order_id,
        returnedToys: returnData.quality_check_results.map((result: any) => ({
          uuidCode: result.toy_uuid,
          condition: result.condition,
          damageNotes: result.damage_notes
        })),
        returnMethod: 'pickup',
        qualityCheckNotes: returnData.quality_check_notes
      });

      if (!returnResult.success) {
        throw new Error(returnResult.error);
      }

      // Calculate metrics
      const qualityDistribution = returnData.quality_check_results.reduce((acc: any, result: any) => {
        acc[result.condition] = (acc[result.condition] || 0) + 1;
        return acc;
      }, {});

      const totalValueRecovered = returnData.quality_check_results.reduce(
        (sum: number, result: any) => sum + (100 - result.value_impact), 0
      ) / returnData.quality_check_results.length;

      // Send customer notification
      const notificationResult = await this.sendCustomerNotification({
        returnRequestId: params.returnRequestId,
        customerPhone: returnData.customer_phone,
        customerName: returnData.customer_name,
        method: params.customerNotificationMethod || 'sms',
        processedToys: returnResult.processedToys,
        inventoryRestored: returnResult.inventoryRestored,
        damagedToys: returnResult.damagedToys
      });

      // Determine follow-up actions
      const followUpActions = [];
      if (returnResult.damagedToys > 0) {
        followUpActions.push('Schedule repair for damaged toys');
      }
      if (returnData.quality_check_results.some((r: any) => r.condition === 'missing')) {
        followUpActions.push('Investigate missing toys with customer');
      }
      if (returnData.quality_check_results.some((r: any) => r.replacement_required)) {
        followUpActions.push('Process replacement toys for customer');
      }

      // Update return request as completed
      await (supabase as any)
        .from('return_requests')
        .update({
          status: 'completed',
          processing_completed_at: new Date().toISOString(),
          processed_by: params.processedBy,
          final_notes: params.finalNotes,
          customer_notification_sent: notificationResult.sent,
          customer_notification_method: notificationResult.method,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.returnRequestId);

      const result: ReturnProcessingResult = {
        returnRequestId: params.returnRequestId,
        processedToys: returnResult.processedToys,
        inventoryRestored: returnResult.inventoryRestored,
        damagedToys: returnResult.damagedToys,
        missingToys: returnData.quality_check_results.filter((r: any) => r.condition === 'missing').length,
        totalValueRecovered,
        qualityCheckResults: returnData.quality_check_results.map((result: any) => ({
          toyUUID: result.toy_uuid,
          toyName: result.toy_name,
          condition: result.condition,
          damageNotes: result.damage_notes,
          photosRequired: result.photos_required,
          repairRequired: result.repair_required,
          replacementRequired: result.replacement_required,
          valueImpact: result.value_impact,
          qualityCheckBy: result.quality_check_by,
          qualityCheckDate: result.quality_check_date
        })),
        customerNotification: notificationResult,
        followUpActions
      };

      console.log('✅ Return processing completed successfully');
      return result;
    } catch (error: any) {
      console.error('💥 Failed to complete return processing:', error);
      throw error;
    }
  }

  /**
   * Get return workflow metrics
   */
  static async getReturnWorkflowMetrics(dateRange?: {
    startDate: string;
    endDate: string;
  }): Promise<ReturnWorkflowMetrics> {
    try {
      const dateFilter = dateRange ? 
        `AND created_at BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'` : 
        `AND created_at >= CURRENT_DATE - INTERVAL '30 days'`;

      const { data, error } = await (supabase as any)
        .rpc('exec_sql', {
          sql: `
            SELECT 
              COUNT(*) as total_returns,
              AVG(EXTRACT(EPOCH FROM (processing_completed_at - created_at))/3600) as avg_processing_hours,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_returns,
              COUNT(CASE WHEN scheduled_pickup_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled') THEN 1 END) as overdue_returns,
              COUNT(CASE WHEN status IN ('quality_check', 'processed') THEN 1 END) as follow_up_required
            FROM return_requests
            WHERE 1=1 ${dateFilter};
          `
        });

      if (error) {
        console.error('Error fetching return metrics:', error);
        return this.getDefaultMetrics();
      }

      const stats = data && data[0];
      
      // Get quality distribution
      const { data: qualityData } = await (supabase as any)
        .rpc('exec_sql', {
          sql: `
            SELECT 
              condition,
              COUNT(*) as count
            FROM quality_check_results qcr
            JOIN return_requests rr ON qcr.return_request_id = rr.id
            WHERE rr.created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY condition;
          `
        });

      const qualityDistribution = (qualityData || []).reduce((acc: any, item: any) => {
        acc[item.condition] = item.count;
        return acc;
      }, {});

      return {
        totalReturns: stats?.total_returns || 0,
        avgProcessingTime: stats?.avg_processing_hours || 0,
        qualityDistribution,
        inventoryRecoveryRate: stats?.completed_returns ? 
          (stats.completed_returns / stats.total_returns) * 100 : 0,
        customerSatisfactionScore: 85, // Would need customer feedback system
        overdueReturns: stats?.overdue_returns || 0,
        followUpRequired: stats?.follow_up_required || 0
      };
    } catch (error) {
      console.error('Failed to fetch return workflow metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private static calculateValueImpact(condition: string): number {
    switch (condition) {
      case 'excellent': return 0;
      case 'good': return 10;
      case 'fair': return 30;
      case 'damaged': return 70;
      case 'missing': return 100;
      default: return 50;
    }
  }

  private static async sendCustomerNotification(params: {
    returnRequestId: string;
    customerPhone: string;
    customerName: string;
    method: 'sms' | 'email' | 'call';
    processedToys: number;
    inventoryRestored: number;
    damagedToys: number;
  }): Promise<{
    sent: boolean;
    method: 'sms' | 'email' | 'call';
    message: string;
  }> {
    const message = `Hi ${params.customerName}, your return has been processed. ${params.processedToys} toys received, ${params.inventoryRestored} restored to inventory. ${params.damagedToys > 0 ? `${params.damagedToys} toys needed repair. ` : ''}Thank you for using Toyflix!`;

    // TODO: Integrate with actual notification service
    console.log(`📱 Sending ${params.method} notification to ${params.customerPhone}:`, message);

    return {
      sent: true, // Would be actual result from notification service
      method: params.method,
      message
    };
  }

  private static getDefaultMetrics(): ReturnWorkflowMetrics {
    return {
      totalReturns: 0,
      avgProcessingTime: 0,
      qualityDistribution: {},
      inventoryRecoveryRate: 0,
      customerSatisfactionScore: 0,
      overdueReturns: 0,
      followUpRequired: 0
    };
  }
} 