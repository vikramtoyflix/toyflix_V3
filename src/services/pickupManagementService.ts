/**
 * Pickup Management Service
 * Handles database interactions for the automated pickup system
 */

import { supabaseAdmin } from '@/integrations/supabase/adminClient';
import { 
  PickupDay, 
  PincodePickupInfo, 
  PincodeScheduleEntry
} from '@/utils/pincodeValidation';

// Types for pickup system
export interface ScheduledPickup {
  id: string;
  rental_order_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: any;
  pincode: string;
  pickup_day: PickupDay;
  scheduled_date: string;
  scheduled_time_slot: string;
  toys_to_pickup: string[];
  pickup_status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'rescheduled';
  special_instructions?: string;
  cycle_day: number;
  reschedule_count: number;
  reschedule_reason?: string;
  original_scheduled_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PickupRoute {
  id: string;
  pickup_day: PickupDay;
  route_date: string;
  driver_name?: string;
  driver_phone?: string;
  planned_pickups: number;
  completed_pickups: number;
  route_status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  covered_pincodes: string[];
  estimated_duration: string;
  created_at: string;
  updated_at: string;
}

export interface PickupPerformanceMetrics {
  total_scheduled: number;
  total_completed: number;
  total_failed: number;
  completion_rate: number;
  average_pickups_per_day: number;
  peak_pickup_day: PickupDay;
  coverage_by_pincode: Record<string, number>;
}

export interface SystemConfig {
  advance_notice_days: number;
  max_daily_capacity: number;
  pickup_cycle_days: number;
  auto_schedule_enabled: boolean;
  min_pickups_per_day: number;
  max_pickups_per_day: number;
}

export class PickupManagementService {
  constructor() {}

  /**
   * Diagnostic method to check pickup system health
   */
  async diagnosePickupData(): Promise<{
    scheduledPickupsCount: number;
    pickupRoutesCount: number;
    pincodeScheduleCount: number;
    systemConfigCount: number;
    sampleData: any;
    errors: string[];
  }> {
    const errors: string[] = [];
    const result = {
      scheduledPickupsCount: 0,
      pickupRoutesCount: 0,
      pincodeScheduleCount: 0,
      systemConfigCount: 0,
      sampleData: {} as any,
      errors
    };

    try {
      // Check scheduled_pickups table
      const { count: pickupsCount, error: pickupsError } = await (supabaseAdmin as any)
        .from('scheduled_pickups')
        .select('*', { count: 'exact', head: true });
      
      if (pickupsError) {
        errors.push(`scheduled_pickups: ${pickupsError.message}`);
      } else {
        result.scheduledPickupsCount = pickupsCount || 0;
      }

      // Check pickup_routes table
      const { count: routesCount, error: routesError } = await (supabaseAdmin as any)
        .from('pickup_routes')
        .select('*', { count: 'exact', head: true });
      
      if (routesError) {
        errors.push(`pickup_routes: ${routesError.message}`);
      } else {
        result.pickupRoutesCount = routesCount || 0;
      }

      // Check pincode_pickup_schedule table
      const { count: pincodeCount, error: pincodeError } = await (supabaseAdmin as any)
        .from('pincode_pickup_schedule')
        .select('*', { count: 'exact', head: true });
      
      if (pincodeError) {
        errors.push(`pincode_pickup_schedule: ${pincodeError.message}`);
      } else {
        result.pincodeScheduleCount = pincodeCount || 0;
      }

      // Get sample data
      if (result.scheduledPickupsCount > 0) {
        const { data: samplePickup } = await (supabaseAdmin as any)
          .from('scheduled_pickups')
          .select('*')
          .limit(1)
          .single();
        
        result.sampleData.scheduledPickup = samplePickup;
      }

      console.log('🔍 Pickup System Diagnosis:', result);
      return result;
    } catch (error: any) {
      errors.push(`General error: ${error.message}`);
      return result;
    }
  }

  /**
   * Get scheduled pickups from database - FIXED VERSION
   */
  async getScheduledPickups(filters?: {
    pickup_day?: PickupDay;
    pickup_status?: string;
    scheduled_date?: string;
    pincode?: string;
  }): Promise<ScheduledPickup[]> {
    try {
      console.log('🔍 getScheduledPickups called with filters:', filters);
      
      // Build query without type casting
      let query = (supabaseAdmin as any)
        .from('scheduled_pickups')
        .select('*')
        .order('scheduled_pickup_date', { ascending: true });

      if (filters?.scheduled_date) {
        console.log('📅 Adding date filter:', filters.scheduled_date);
        query = query.eq('scheduled_pickup_date', filters.scheduled_date);
      }
      if (filters?.pickup_status && filters.pickup_status !== 'all') {
        console.log('📊 Adding status filter:', filters.pickup_status);
        query = query.eq('pickup_status', filters.pickup_status);
      }
      if (filters?.pickup_day) {
        console.log('📅 Adding day filter:', filters.pickup_day);
        query = query.eq('pickup_day', filters.pickup_day);
      }
      if (filters?.pincode) {
        console.log('📍 Adding pincode filter:', filters.pincode);
        query = query.eq('pincode', filters.pincode);
      }

      console.log('🚀 Executing pickup query...');
      const { data, error } = await query;

      console.log('📦 Raw pickup query result:', { 
        data, 
        error, 
        dataLength: data?.length,
        sampleRecord: data?.[0],
        queryFilter: filters
      });

      if (error) {
        console.error('❌ Database error fetching scheduled pickups:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No pickup data returned from scheduled_pickups table');
        console.log('🔍 Checking if table exists and has data...');
        
        // Try a simple count query to verify table exists
        const { count, error: countError } = await (supabaseAdmin as any)
          .from('scheduled_pickups')
          .select('*', { count: 'exact', head: true });
          
        if (countError) {
          console.error('❌ Table access error:', countError);
          throw new Error(`Table access error: ${countError.message}`);
        }
        
        console.log(`📊 Total records in scheduled_pickups table: ${count}`);
        return [];
      }

      console.log('✅ Found', data.length, 'pickup records, mapping to frontend format...');
      
      const mappedData = (data as any[]).map(item => ({
        id: item.id,
        rental_order_id: item.rental_order_id,
        customer_id: item.user_id,
        customer_name: item.customer_name || 'Unknown Customer',
        customer_phone: item.customer_phone || '',
        customer_address: item.customer_address || {},
        pincode: item.pincode,
        pickup_day: item.pickup_day as PickupDay,
        scheduled_date: item.scheduled_pickup_date,
        scheduled_time_slot: `${item.scheduled_pickup_time_start || '10:00'}-${item.scheduled_pickup_time_end || '12:00'}`,
        toys_to_pickup: Array.isArray(item.toys_to_pickup) ? item.toys_to_pickup : [],
        pickup_status: item.pickup_status,
        special_instructions: item.pickup_notes,
        cycle_day: item.days_into_cycle || 28,
        reschedule_count: item.reschedule_count || 0,
        reschedule_reason: item.reschedule_reason || undefined,
        original_scheduled_date: item.original_scheduled_date || undefined,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      console.log('✅ Mapped data sample:', mappedData[0]);
      return mappedData;
    } catch (error) {
      console.error('💥 Failed to fetch scheduled pickups:', error);
      return [];
    }
  }

  /**
   * Get pickup routes from database - FIXED VERSION
   */
  async getPickupRoutes(filters?: {
    pickup_day?: PickupDay;
    route_date?: string;
    route_status?: string;
  }): Promise<PickupRoute[]> {
    try {
      console.log('🔍 getPickupRoutes called with filters:', filters);
      
      let query = (supabaseAdmin as any)
        .from('pickup_routes')
        .select('*')
        .order('pickup_date', { ascending: true });

      if (filters?.route_date) {
        console.log('📅 Adding route date filter:', filters.route_date);
        query = query.eq('pickup_date', filters.route_date);
      }
      if (filters?.pickup_day) {
        console.log('📅 Adding route day filter:', filters.pickup_day);
        query = query.eq('pickup_day', filters.pickup_day);
      }
      if (filters?.route_status) {
        console.log('📊 Adding route status filter:', filters.route_status);
        query = query.eq('route_status', filters.route_status);
      }

      console.log('🚀 Executing pickup routes query...');
      const { data, error } = await query;

      console.log('📦 Raw pickup routes query result:', { 
        data, 
        error, 
        dataLength: data?.length,
        sampleRecord: data?.[0],
        queryFilter: filters
      });

      if (error) {
        console.error('❌ Database error fetching pickup routes:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No route data returned from pickup_routes table');
        console.log('🔍 Checking if pickup_routes table exists and has data...');
        
        // Try a simple count query to verify table exists
        const { count, error: countError } = await (supabaseAdmin as any)
          .from('pickup_routes')
          .select('*', { count: 'exact', head: true });
          
        if (countError) {
          console.error('❌ Table access error for pickup_routes:', countError);
          throw new Error(`Table access error: ${countError.message}`);
        }
        
        console.log(`📊 Total records in pickup_routes table: ${count}`);
        return [];
      }

      console.log('✅ Found', data.length, 'route records, mapping to frontend format...');

      return (data as any[]).map(item => ({
        id: item.id,
        pickup_day: item.pickup_day as PickupDay,
        route_date: item.pickup_date,
        driver_name: item.assigned_driver_name,
        driver_phone: item.assigned_driver_phone || '',
        planned_pickups: item.total_planned_pickups || 0,
        completed_pickups: item.total_completed_pickups || 0,
        route_status: item.route_status,
        covered_pincodes: item.covered_pincodes || [],
        estimated_duration: item.estimated_duration_minutes 
          ? `${Math.floor(item.estimated_duration_minutes / 60)}h ${item.estimated_duration_minutes % 60}m` 
          : '4-6 hours',
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
    } catch (error) {
      console.error('💥 Failed to fetch pickup routes:', error);
      return [];
    }
  }

  /**
   * Get pincode schedule data from database - FIXED VERSION
   */
  async getPincodeSchedule(): Promise<PincodeScheduleEntry[]> {
    try {
      console.log('🔍 getPincodeSchedule called');
      
      const { data, error } = await (supabaseAdmin as any)
        .from('pincode_pickup_schedule')
        .select('*')
        .eq('is_active', true)
        .order('pincode');

      console.log('📦 Pincode schedule query result:', { 
        data, 
        error, 
        dataLength: data?.length 
      });

      if (error) {
        console.error('❌ Error fetching pincode schedule:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No pincode schedule data found');
        return [];
      }

      console.log('✅ Found', data.length, 'pincode records');

      return (data as any[]).map(item => ({
        id: item.id,
        pincode: item.pincode,
        pickup_day: item.pickup_day as PickupDay,
        delivery_day: item.pickup_day as PickupDay,
        area_name: item.area_name || '',
        zone: item.zone || '',
        max_pickups_per_day: item.max_pickups_per_day || 25,
        min_pickups_per_day: item.min_pickups_per_day || 10,
        current_capacity_used: 0,
        estimated_travel_time_minutes: 30,
        pickup_window_start: '09:00',
        pickup_window_end: '18:00',
        is_active: item.is_active,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
    } catch (error) {
      console.error('💥 Failed to fetch pincode schedule:', error);
      return [];
    }
  }

  /**
   * Update pincode schedule
   */
  async updatePincodeSchedule(pincode: string, pickupDay: PickupDay, areaName?: string, zone?: string): Promise<boolean> {
    try {
      const { error } = await (supabaseAdmin as any)
        .from('pincode_pickup_schedule')
        .upsert({
          pincode,
          pickup_day: pickupDay,
          delivery_day: pickupDay, // Set delivery_day same as pickup_day
          area_name: areaName,
          zone: zone,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'pincode'
        });

      if (error) {
        console.error('Error updating pincode schedule:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update pincode schedule:', error);
      return false;
    }
  }

  /**
   * Bulk update pincode schedules
   */
  async bulkUpdatePincodeSchedules(updates: Array<{
    pincode: string;
    pickup_day: PickupDay;
    area_name?: string;
    zone?: string;
  }>): Promise<boolean> {
    try {
      const { error } = await (supabaseAdmin as any)
        .from('pincode_pickup_schedule')
        .upsert(
          updates.map(update => ({
            pincode: update.pincode,
            pickup_day: update.pickup_day,
            delivery_day: update.pickup_day, // Set delivery_day same as pickup_day
            area_name: update.area_name,
            zone: update.zone,
            is_active: true,
            updated_at: new Date().toISOString()
          })),
          { onConflict: 'pincode' }
        );

      if (error) {
        console.error('Error bulk updating pincode schedules:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to bulk update pincode schedules:', error);
      return false;
    }
  }

  /**
   * Delete pincode from schedule
   */
  async deletePincodeSchedule(pincode: string): Promise<boolean> {
    try {
      const { error } = await (supabaseAdmin as any)
        .from('pincode_pickup_schedule')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('pincode', pincode);

      if (error) {
        console.error('Error deleting pincode schedule:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to delete pincode schedule:', error);
      return false;
    }
  }

  /**
   * Create scheduled pickup
   */
  async createScheduledPickup(pickup: Omit<ScheduledPickup, 'id' | 'created_at' | 'updated_at'>): Promise<ScheduledPickup> {
    try {
      const timeSlot = pickup.scheduled_time_slot.split('-');
      const { data, error } = await (supabaseAdmin as any)
        .from('scheduled_pickups')
        .insert({
          rental_order_id: pickup.rental_order_id,
          user_id: pickup.customer_id,
          customer_name: pickup.customer_name,
          customer_phone: pickup.customer_phone,
          customer_address: pickup.customer_address,
          pincode: pickup.pincode,
          pickup_day: pickup.pickup_day,
          scheduled_pickup_date: pickup.scheduled_date,
          scheduled_pickup_time_start: timeSlot[0]?.trim(),
          scheduled_pickup_time_end: timeSlot[1]?.trim(),
          toys_to_pickup: pickup.toys_to_pickup,
          pickup_status: pickup.pickup_status,
          pickup_notes: pickup.special_instructions,
          days_into_cycle: pickup.cycle_day
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating scheduled pickup:', error);
        throw error;
      }

      return {
        ...pickup,
        id: data.id,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Failed to create scheduled pickup:', error);
      throw error;
    }
  }

  /**
   * Update scheduled pickup status
   */
  async updateScheduledPickupStatus(pickupId: string, status: ScheduledPickup['pickup_status']): Promise<boolean> {
    try {
      const { error } = await (supabaseAdmin as any)
        .from('scheduled_pickups')
        .update({ 
          pickup_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', pickupId);

      if (error) {
        console.error('Error updating pickup status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update pickup status:', error);
      return false;
    }
  }

  /**
   * Update pickup details - comprehensive update method
   */
  async updatePickupDetails(pickupId: string, updates: Partial<ScheduledPickup>): Promise<boolean> {
    try {
      console.log('🔄 Updating pickup details:', pickupId, updates);

      // Prepare database update object
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Map frontend fields to database fields
      if (updates.customer_name !== undefined) updateData.customer_name = updates.customer_name;
      if (updates.customer_phone !== undefined) updateData.customer_phone = updates.customer_phone;
      if (updates.customer_address !== undefined) {
        // Handle address - if it's a string from the form, store as object with address1
        updateData.customer_address = typeof updates.customer_address === 'string' 
          ? { address1: updates.customer_address } 
          : updates.customer_address;
      }
      if (updates.pincode !== undefined) updateData.pincode = updates.pincode;
      if (updates.pickup_day !== undefined) updateData.pickup_day = updates.pickup_day;
      if (updates.scheduled_date !== undefined) updateData.scheduled_pickup_date = updates.scheduled_date;
      if (updates.pickup_status !== undefined) updateData.pickup_status = updates.pickup_status;
      if (updates.special_instructions !== undefined) updateData.pickup_notes = updates.special_instructions;
      if (updates.cycle_day !== undefined) updateData.days_into_cycle = updates.cycle_day;
      if (updates.reschedule_count !== undefined) updateData.reschedule_count = updates.reschedule_count;
      if (updates.reschedule_reason !== undefined) updateData.reschedule_reason = updates.reschedule_reason;

      // Handle time slot updates
      if (updates.scheduled_time_slot !== undefined) {
        const timeSlot = updates.scheduled_time_slot.split('-');
        if (timeSlot.length === 2) {
          updateData.scheduled_pickup_time_start = timeSlot[0].trim();
          updateData.scheduled_pickup_time_end = timeSlot[1].trim();
        }
      }

      const { error } = await (supabaseAdmin as any)
        .from('scheduled_pickups')
        .update(updateData)
        .eq('id', pickupId);

      if (error) {
        console.error('❌ Failed to update pickup details:', error);
        return false;
      }

      console.log(`✅ Pickup ${pickupId} details updated successfully`);
      return true;
    } catch (error) {
      console.error('💥 Error updating pickup details:', error);
      return false;
    }
  }

  /**
   * Create pickup route
   */
  async createPickupRoute(route: Omit<PickupRoute, 'id' | 'created_at' | 'updated_at'>): Promise<PickupRoute> {
    try {
      const { data, error } = await (supabaseAdmin as any)
        .from('pickup_routes')
        .insert({
          route_name: `${route.pickup_day} Route - ${route.route_date}`,
          pickup_date: route.route_date,
          pickup_day: route.pickup_day,
          assigned_driver_name: route.driver_name,
          assigned_driver_phone: route.driver_phone,
          total_planned_pickups: route.planned_pickups,
          total_completed_pickups: route.completed_pickups,
          route_status: route.route_status,
          covered_pincodes: route.covered_pincodes,
          estimated_duration_minutes: route.estimated_duration.includes('h') ? 
            parseInt(route.estimated_duration) * 60 : 240 // Default 4 hours
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating pickup route:', error);
        throw error;
      }

      return {
        ...route,
        id: data.id,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Failed to create pickup route:', error);
      throw error;
    }
  }

  /**
   * Update pickup route status
   */
  async updatePickupRouteStatus(routeId: string, status: PickupRoute['route_status']): Promise<boolean> {
    try {
      const { error } = await (supabaseAdmin as any)
        .from('pickup_routes')
        .update({ 
          route_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', routeId);

      if (error) {
        console.error('Error updating route status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update route status:', error);
      return false;
    }
  }

  /**
   * Get pincodes for pickup day from database
   */
  async getPincodesForPickupDay(pickupDay: PickupDay): Promise<string[]> {
    try {
      const { data, error } = await (supabaseAdmin as any)
        .from('pincode_pickup_schedule')
        .select('pincode')
        .eq('pickup_day', pickupDay)
        .eq('is_active', true)
        .order('pincode');

      if (error) {
        console.error('Error fetching pincodes for pickup day:', error);
        return [];
      }

      return (data as any[]).map(item => item.pincode);
    } catch (error) {
      console.error('Failed to fetch pincodes for pickup day:', error);
      return [];
    }
  }

  /**
   * Get pickup performance metrics from database
   */
  async getPickupPerformanceMetrics(): Promise<PickupPerformanceMetrics> {
    try {
      // Calculate metrics from scheduled_pickups table
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await (supabaseAdmin as any)
        .from('scheduled_pickups')
        .select('pickup_status, pickup_day, pincode')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('Error fetching performance metrics:', error);
        // Return default metrics
        return {
          total_scheduled: 0,
          total_completed: 0,
          total_failed: 0,
          completion_rate: 0,
          average_pickups_per_day: 0,
          peak_pickup_day: 'monday',
          coverage_by_pincode: {}
        };
      }

      const pickups = data as any[];
      const total = pickups.length;
      const completed = pickups.filter(p => p.pickup_status === 'completed').length;
      const failed = pickups.filter(p => p.pickup_status === 'failed').length;

      // Calculate peak day
      const dayCount = pickups.reduce((acc, p) => {
        if (!acc[p.pickup_day]) acc[p.pickup_day] = 0;
        acc[p.pickup_day]++;
        return acc;
      }, {} as Record<string, number>);

      const peakDay = Object.entries(dayCount).reduce((a, b) => 
        dayCount[a[0]] > dayCount[b[0]] ? a : b, ['monday', 0])[0] as PickupDay;

      // Calculate coverage by pincode
      const pincodeCount = pickups.reduce((acc, p) => {
        if (!acc[p.pincode]) acc[p.pincode] = 0;
        acc[p.pincode]++;
        return acc;
      }, {} as Record<string, number>);

      return {
        total_scheduled: total,
        total_completed: completed,
        total_failed: failed,
        completion_rate: total > 0 ? (completed / total) * 100 : 0,
        average_pickups_per_day: total / 30,
        peak_pickup_day: peakDay,
        coverage_by_pincode: pincodeCount
      };
    } catch (error) {
      console.error('Failed to fetch pickup performance metrics:', error);
      // Return default metrics
      return {
        total_scheduled: 0,
        total_completed: 0,
        total_failed: 0,
        completion_rate: 0,
        average_pickups_per_day: 0,
        peak_pickup_day: 'monday',
        coverage_by_pincode: {}
      };
    }
  }

  /**
   * Get system configuration from database
   */
  async getSystemConfig(): Promise<SystemConfig> {
    try {
      const { data, error } = await (supabaseAdmin as any)
        .from('pickup_system_config')
        .select('config_key, config_value, config_type')
        .eq('is_active', true);

      if (error || !data) {
        console.error('Error fetching system config:', error);
        // Return default config if no data found
        return {
          advance_notice_days: 5,
          max_daily_capacity: 25,
          pickup_cycle_days: 30,
          auto_schedule_enabled: true,
          min_pickups_per_day: 10,
          max_pickups_per_day: 25
        };
      }

      // Convert key-value pairs to config object
      const config: Partial<SystemConfig> = {};
      (data as any[]).forEach((item: any) => {
        const { config_key, config_value, config_type } = item;
        let value: any = config_value;

        // Parse value based on type
        if (config_type === 'integer') {
          value = parseInt(config_value);
        } else if (config_type === 'boolean') {
          value = config_value === 'true';
        } else if (config_type === 'json') {
          try {
            value = JSON.parse(config_value);
          } catch {
            value = config_value;
          }
        }

        // Map config keys to SystemConfig properties
        switch (config_key) {
          case 'advance_notice_days':
            config.advance_notice_days = value;
            break;
          case 'max_daily_capacity':
            config.max_daily_capacity = value;
            break;
          case 'pickup_cycle_days':
            config.pickup_cycle_days = Array.isArray(value) ? value.length : value;
            break;
          case 'auto_schedule_enabled':
            config.auto_schedule_enabled = value;
            break;
          case 'min_daily_capacity':
            config.min_pickups_per_day = value;
            break;
          case 'max_pickups_per_day':
            config.max_pickups_per_day = value;
            break;
        }
      });

      // Return config with defaults for missing values
      return {
        advance_notice_days: config.advance_notice_days ?? 5,
        max_daily_capacity: config.max_daily_capacity ?? 25,
        pickup_cycle_days: config.pickup_cycle_days ?? 30,
        auto_schedule_enabled: config.auto_schedule_enabled ?? true,
        min_pickups_per_day: config.min_pickups_per_day ?? 10,
        max_pickups_per_day: config.max_pickups_per_day ?? 25
      };
    } catch (error) {
      console.error('Failed to fetch system config:', error);
      // Return default config
      return {
        advance_notice_days: 5,
        max_daily_capacity: 25,
        pickup_cycle_days: 30,
        auto_schedule_enabled: true,
        min_pickups_per_day: 10,
        max_pickups_per_day: 25
      };
    }
  }

  // ========================================
  // AUTOMATIC PICKUP SCHEDULING FUNCTIONS
  // ========================================

  /**
   * Auto-schedule pickup for a rental order (integrates with database function)
   */
  async autoSchedulePickupForOrder(rentalOrderId: string): Promise<{
    success: boolean;
    scheduledPickupId?: string;
    error?: string;
  }> {
    try {
      console.log('🔄 Auto-scheduling pickup for rental order:', rentalOrderId);

      // Get rental order details
      const { data: orderData, error: orderError } = await (supabaseAdmin as any)
        .from('rental_orders')
        .select(`
          id, user_id, shipping_address, rental_start_date, rental_end_date,
          cycle_number, toys_data, subscription_id,
          custom_users!inner(phone, full_name, zip_code)
        `)
        .eq('id', rentalOrderId)
        .single();

      if (orderError || !orderData) {
        return {
          success: false,
          error: orderError?.message || 'Rental order not found'
        };
      }

      // Get customer pincode
      const customerPincode = orderData.shipping_address?.pincode || 
                             orderData.custom_users?.zip_code;

      if (!customerPincode) {
        return {
          success: false,
          error: 'Customer pincode not found'
        };
      }

      // Get pickup day for pincode
      const pickupDay = await this.getPickupDayForPincode(customerPincode);
      if (!pickupDay) {
        return {
          success: false,
          error: `No pickup day configured for pincode ${customerPincode}`
        };
      }

      // Calculate pickup date (day 28 of cycle)
      const startDate = new Date(orderData.rental_start_date);
      const pickupDate = new Date(startDate);
      pickupDate.setDate(startDate.getDate() + 28);

      // Create scheduled pickup
      const { data: scheduledPickup, error: createError } = await (supabaseAdmin as any)
        .from('scheduled_pickups')
        .insert({
          rental_order_id: rentalOrderId,
          user_id: orderData.user_id,
          scheduled_pickup_date: pickupDate.toISOString().split('T')[0],
          pickup_day: pickupDay,
          customer_name: orderData.custom_users?.full_name || 'Unknown Customer',
          customer_phone: orderData.custom_users?.phone || '',
          customer_address: orderData.shipping_address,
          pincode: customerPincode,
          subscription_id: orderData.subscription_id,
          cycle_number: orderData.cycle_number,
          cycle_end_date: orderData.rental_end_date,
          days_into_cycle: 28,
          toys_to_pickup: orderData.toys_data || [],
          toys_count: Array.isArray(orderData.toys_data) ? orderData.toys_data.length : 0,
          notification_sent_date: new Date(pickupDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          pickup_status: 'scheduled'
        })
        .select()
        .single();

      if (createError) {
        return {
          success: false,
          error: createError.message
        };
      }

      // Update rental order with pickup info
      await (supabaseAdmin as any)
        .from('rental_orders')
        .update({
          pickup_scheduled_date: pickupDate.toISOString().split('T')[0],
          pickup_status: 'scheduled',
          scheduled_pickup_id: scheduledPickup.id,
          customer_pickup_day: pickupDay,
          pickup_cycle_day: 28
        })
        .eq('id', rentalOrderId);

      console.log('✅ Auto-scheduled pickup successfully:', scheduledPickup.id);
      return {
        success: true,
        scheduledPickupId: scheduledPickup.id
      };
    } catch (error: any) {
      console.error('💥 Failed to auto-schedule pickup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get pickup day for a pincode using database query
   */
  async getPickupDayForPincode(pincode: string): Promise<PickupDay | null> {
    try {
      const { data, error } = await (supabaseAdmin as any)
        .from('pincode_pickup_schedule')
        .select('pickup_day')
        .eq('pincode', pincode)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('Error getting pickup day for pincode:', error);
        return null;
      }

      return data.pickup_day as PickupDay;
    } catch (error) {
      console.error('Failed to get pickup day for pincode:', error);
      return null;
    }
  }

  /**
   * Calculate next pickup date for a pincode
   */
  async calculateNextPickupDate(pincode: string, startDate: string, cycleDay: number = 28): Promise<string | null> {
    try {
      // Get pickup day for pincode
      const pickupDay = await this.getPickupDayForPincode(pincode);
      if (!pickupDay) {
        return null;
      }

      // Calculate target date
      const start = new Date(startDate);
      const targetDate = new Date(start);
      targetDate.setDate(start.getDate() + cycleDay);

      // Find the next occurrence of the pickup day
      const dayMap: Record<string, number> = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
      };

      const targetDayOfWeek = dayMap[pickupDay.toLowerCase()];
      const currentDayOfWeek = targetDate.getDay();
      
      let daysToAdd = targetDayOfWeek - currentDayOfWeek;
      if (daysToAdd < 0) {
        daysToAdd += 7; // Next week
      }

      targetDate.setDate(targetDate.getDate() + daysToAdd);
      return targetDate.toISOString().split('T')[0];
    } catch (error) {
      console.error('Failed to calculate next pickup date:', error);
      return null;
    }
  }

  /**
   * Get pickup capacity for a specific date and pincode
   */
  async getPickupCapacityForDate(date: string, pincode?: string): Promise<{
    totalCapacity: number;
    usedCapacity: number;
    availableCapacity: number;
    pickupDay: PickupDay | null;
  }> {
    try {
      let totalCapacity = 25; // Default capacity
      let pickupDay: PickupDay | null = null;

      // Get pincode schedule info if pincode provided
      if (pincode) {
        const { data: scheduleData } = await (supabaseAdmin as any)
          .from('pincode_pickup_schedule')
          .select('max_pickups_per_day, pickup_day')
          .eq('pincode', pincode)
          .eq('is_active', true)
          .single();

        if (scheduleData) {
          totalCapacity = scheduleData.max_pickups_per_day || 25;
          pickupDay = scheduleData.pickup_day;
        }
      }

      // Count used capacity for the date
      let query = (supabaseAdmin as any)
        .from('scheduled_pickups')
        .select('id', { count: 'exact' })
        .eq('scheduled_pickup_date', date)
        .in('pickup_status', ['scheduled', 'confirmed', 'in_progress']);

      if (pincode) {
        query = query.eq('pincode', pincode);
      }

      const { count: usedCapacity, error } = await query;

      if (error) {
        console.error('Error getting pickup capacity:', error);
        throw error;
      }

      return {
        totalCapacity,
        usedCapacity: usedCapacity || 0,
        availableCapacity: totalCapacity - (usedCapacity || 0),
        pickupDay
      };
    } catch (error) {
      console.error('Failed to get pickup capacity:', error);
      return {
        totalCapacity: 25,
        usedCapacity: 0,
        availableCapacity: 25,
        pickupDay: null
      };
    }
  }

  /**
   * Send pickup notifications for upcoming pickups
   */
  async sendPickupNotifications(advanceDays: number = 5): Promise<{
    success: boolean;
    notificationsSent: number;
    errors: string[];
  }> {
    try {
      console.log(`🔔 Sending pickup notifications for pickups in ${advanceDays} days`);

      const notificationDate = new Date();
      notificationDate.setDate(notificationDate.getDate() + advanceDays);
      const targetDate = notificationDate.toISOString().split('T')[0];

      // Get pickups scheduled for the target date that haven't been notified
      const { data: pickups, error } = await (supabaseAdmin as any)
        .from('scheduled_pickups')
        .select('*')
        .eq('scheduled_pickup_date', targetDate)
        .eq('pickup_status', 'scheduled')
        .is('notification_sent_date', null);

      if (error) {
        console.error('Error fetching pickups for notification:', error);
        return {
          success: false,
          notificationsSent: 0,
          errors: [error.message]
        };
      }

      if (!pickups || pickups.length === 0) {
        console.log('📭 No pickups found for notification');
        return {
          success: true,
          notificationsSent: 0,
          errors: []
        };
      }

      const errors: string[] = [];
      let notificationsSent = 0;

      // Process each pickup notification
      for (const pickup of pickups) {
        try {
          // Here you would integrate with your notification service (SMS, email, etc.)
          // For now, we'll just mark as notified
          console.log(`📤 Sending notification to ${pickup.customer_phone} for pickup on ${pickup.scheduled_pickup_date}`);

          // Update pickup with notification sent
          const { error: updateError } = await (supabaseAdmin as any)
            .from('scheduled_pickups')
            .update({
              notification_sent_date: new Date().toISOString(),
              reminder_sent: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', pickup.id);

          if (updateError) {
            errors.push(`Failed to update pickup ${pickup.id}: ${updateError.message}`);
          } else {
            notificationsSent++;
          }
        } catch (pickupError: any) {
          errors.push(`Failed to process pickup ${pickup.id}: ${pickupError.message}`);
        }
      }

      console.log(`✅ Sent ${notificationsSent} pickup notifications`);
      return {
        success: errors.length === 0,
        notificationsSent,
        errors
      };
    } catch (error: any) {
      console.error('💥 Failed to send pickup notifications:', error);
      return {
        success: false,
        notificationsSent: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Get daily pickup schedule (uses database view)
   */
  async getDailyPickupSchedule(date?: string): Promise<Array<{
    routeId: string;
    routeName: string;
    pickupDate: string;
    pickupDay: PickupDay;
    driverName: string | null;
    routeStatus: string;
    totalPickups: number;
    completedPickups: number;
    failedPickups: number;
    coveredPincodes: string;
    totalToysToCollect: number;
  }>> {
    try {
      let query = (supabaseAdmin as any)
        .from('daily_pickup_schedule')
        .select('*')
        .order('pickup_date');

      if (date) {
        query = query.eq('pickup_date', date);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching daily pickup schedule:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        routeId: item.route_id,
        routeName: item.route_name,
        pickupDate: item.pickup_date,
        pickupDay: item.pickup_day as PickupDay,
        driverName: item.assigned_driver_name,
        routeStatus: item.route_status,
        totalPickups: item.total_pickups || 0,
        completedPickups: item.completed_pickups || 0,
        failedPickups: item.failed_pickups || 0,
        coveredPincodes: item.covered_pincodes || '',
        totalToysToCollect: item.total_toys_to_collect || 0
      }));
    } catch (error) {
      console.error('Failed to fetch daily pickup schedule:', error);
      return [];
    }
  }

  /**
   * Get pickup performance metrics by day (uses database view)
   */
  async getPickupPerformanceByDay(): Promise<Array<{
    pickupDay: PickupDay;
    totalScheduledPickups: number;
    completedPickups: number;
    failedPickups: number;
    successRate: number;
    avgCustomerSatisfaction: number;
    totalToysCollected: number;
  }>> {
    try {
      const { data, error } = await (supabaseAdmin as any)
        .from('pickup_performance_metrics')
        .select('*')
        .order('pickup_day');

      if (error) {
        console.error('Error fetching pickup performance metrics:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        pickupDay: item.pickup_day as PickupDay,
        totalScheduledPickups: item.total_scheduled_pickups || 0,
        completedPickups: item.completed_pickups || 0,
        failedPickups: item.failed_pickups || 0,
        successRate: item.success_rate || 0,
        avgCustomerSatisfaction: item.avg_customer_satisfaction || 0,
        totalToysCollected: item.total_toys_collected || 0
      }));
    } catch (error) {
      console.error('Failed to fetch pickup performance by day:', error);
      return [];
    }
  }

  /**
   * Process batch pickup updates (status changes, completions, etc.)
   */
  async processBatchPickupUpdates(updates: Array<{
    pickupId: string;
    status?: ScheduledPickup['pickup_status'];
    actualPickupDate?: string;
    actualPickupTime?: string;
    toysCollected?: any[];
    customerFeedback?: string;
    customerSatisfaction?: number;
  }>): Promise<{
    success: boolean;
    processedCount: number;
    errors: string[];
  }> {
    try {
      console.log(`🔄 Processing ${updates.length} pickup updates`);

      const errors: string[] = [];
      let processedCount = 0;

      for (const update of updates) {
        try {
          const updateData: any = {
            updated_at: new Date().toISOString()
          };

          if (update.status) updateData.pickup_status = update.status;
          if (update.actualPickupDate) updateData.actual_pickup_date = update.actualPickupDate;
          if (update.actualPickupTime) updateData.actual_pickup_time = update.actualPickupTime;
          if (update.toysCollected) {
            updateData.toys_actually_collected = update.toysCollected;
            updateData.toys_collected_count = update.toysCollected.length;
          }
          if (update.customerFeedback) updateData.customer_feedback = update.customerFeedback;
          if (update.customerSatisfaction) updateData.customer_satisfaction = update.customerSatisfaction;

          const { error } = await (supabaseAdmin as any)
            .from('scheduled_pickups')
            .update(updateData)
            .eq('id', update.pickupId);

          if (error) {
            errors.push(`Pickup ${update.pickupId}: ${error.message}`);
          } else {
            processedCount++;
          }
        } catch (updateError: any) {
          errors.push(`Pickup ${update.pickupId}: ${updateError.message}`);
        }
      }

      console.log(`✅ Processed ${processedCount}/${updates.length} pickup updates`);
      return {
        success: errors.length === 0,
        processedCount,
        errors
      };
    } catch (error: any) {
      console.error('💥 Failed to process batch pickup updates:', error);
      return {
        success: false,
        processedCount: 0,
        errors: [error.message]
      };
    }
  }
} 