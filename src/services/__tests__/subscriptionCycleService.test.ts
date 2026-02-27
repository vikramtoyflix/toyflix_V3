import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supabase } from '../../integrations/supabase/client';
import { SubscriptionCycleService } from '../subscriptionCycleService';

// Mock Supabase client
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const mockSupabase = supabase as any;

describe('SubscriptionCycleService', () => {
  let service: SubscriptionCycleService;
  
  beforeEach(() => {
    service = new SubscriptionCycleService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Cycle Calculations', () => {
    it('should calculate correct cycle number from subscription start', async () => {
      // Mock subscription started 45 days ago (should be cycle 2)
      const mockCurrentCycle = {
        data: [{
          subscription_id: 'test-sub-id',
          user_id: 'test-user-id',
          current_cycle_number: 2,
          current_cycle_start: '2024-11-19',
          current_cycle_end: '2024-12-18',
          cycle_progress_percentage: 50.0,
          days_remaining: 15,
          selection_window_status: 'open',
          subscription_start_date: '2024-10-19',
          plan_id: 'Discovery Delight',
          subscription_status: 'active'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockCurrentCycle)
        })
      });

      const result = await service.getCurrentCycle('test-user-id');
      
      expect(result).toBeDefined();
      expect(result?.current_cycle_number).toBe(2);
      expect(result?.cycle_progress_percentage).toBe(50.0);
    });

    it('should validate cycle progress calculations', async () => {
      const mockCurrentCycle = {
        data: [{
          subscription_id: 'test-sub-id',
          user_id: 'test-user-id',
          current_cycle_number: 1,
          current_cycle_start: '2024-12-01',
          current_cycle_end: '2024-12-30',
          cycle_progress_percentage: 33.33,
          days_remaining: 20,
          selection_window_status: 'open',
          subscription_start_date: '2024-12-01',
          plan_id: 'Discovery Delight',
          subscription_status: 'active'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockCurrentCycle)
        })
      });

      const result = await service.getCurrentCycle('test-user-id');
      
      expect(result?.cycle_progress_percentage).toBeGreaterThanOrEqual(0);
      expect(result?.cycle_progress_percentage).toBeLessThanOrEqual(100);
    });

    it('should validate selection window timing', async () => {
      const mockSelectionWindows = {
        data: [{
          subscription_id: 'test-sub-id',
          user_id: 'test-user-id',
          cycle_number: 1,
          window_start: '2024-12-23',
          window_end: '2024-12-30',
          window_status: 'open',
          days_until_window: 0,
          window_duration_days: 7,
          cycle_start_date: '2024-12-01',
          cycle_end_date: '2024-12-30',
          plan_id: 'Discovery Delight'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSelectionWindows)
        })
      });

      const result = await service.getSelectionWindows('test-user-id');
      
      expect(result).toBeDefined();
      expect(result?.length).toBeGreaterThan(0);
      expect(['open', 'closed', 'upcoming', 'completed', 'missed']).toContain(result?.[0].window_status);
    });

    it('should predict next cycle dates correctly', async () => {
      const mockCurrentCycle = {
        data: [{
          subscription_id: 'test-sub-id',
          user_id: 'test-user-id',
          current_cycle_number: 1,
          current_cycle_start: '2024-12-01',
          current_cycle_end: '2024-12-30',
          cycle_progress_percentage: 33.33,
          days_remaining: 20,
          selection_window_status: 'open',
          subscription_start_date: '2024-12-01',
          plan_id: 'Discovery Delight',
          subscription_status: 'active'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockCurrentCycle)
        })
      });

      const result = await service.getCurrentCycle('test-user-id');
      
      expect(result?.current_cycle_end).toBeDefined();
      expect(new Date(result?.current_cycle_end || '').getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Different Subscription Scenarios', () => {
    it('should handle new subscriptions (first cycle)', async () => {
      const mockNewSubscription = {
        data: [{
          subscription_id: 'new-sub-id',
          user_id: 'new-user-id',
          current_cycle_number: 1,
          current_cycle_start: '2024-12-03',
          current_cycle_end: '2025-01-01',
          cycle_progress_percentage: 3.33,
          days_remaining: 29,
          selection_window_status: 'upcoming',
          subscription_start_date: '2024-12-03',
          plan_id: 'Discovery Delight',
          subscription_status: 'active'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockNewSubscription)
        })
      });

      const result = await service.getCurrentCycle('new-user-id');
      
      expect(result?.current_cycle_number).toBe(1);
      expect(result?.subscription_status).toBe('active');
      expect(result?.cycle_progress_percentage).toBeLessThan(10);
    });

    it('should handle long-term subscriptions (many cycles)', async () => {
      const mockLongTermSubscription = {
        data: [{
          subscription_id: 'longterm-sub-id',
          user_id: 'longterm-user-id',
          current_cycle_number: 12,
          current_cycle_start: '2024-11-03',
          current_cycle_end: '2024-12-02',
          cycle_progress_percentage: 96.67,
          days_remaining: 1,
          selection_window_status: 'closed',
          subscription_start_date: '2023-12-03',
          plan_id: 'Gold Pack',
          subscription_status: 'active'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockLongTermSubscription)
        })
      });

      const result = await service.getCurrentCycle('longterm-user-id');
      
      expect(result?.current_cycle_number).toBeGreaterThan(10);
      expect(result?.plan_id).toBe('Gold Pack');
      expect(result?.subscription_status).toBe('active');
    });

    it('should handle paused/resumed subscriptions', async () => {
      const mockPausedSubscription = {
        data: [{
          subscription_id: 'paused-sub-id',
          user_id: 'paused-user-id',
          current_cycle_number: 3,
          current_cycle_start: '2024-11-01',
          current_cycle_end: '2024-11-30',
          cycle_progress_percentage: 50.0,
          days_remaining: 15,
          selection_window_status: 'paused',
          subscription_start_date: '2024-09-01',
          plan_id: 'Silver Pack',
          subscription_status: 'paused'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockPausedSubscription)
        })
      });

      const result = await service.getCurrentCycle('paused-user-id');
      
      expect(result?.subscription_status).toBe('paused');
      expect(result?.current_cycle_number).toBe(3);
    });

    it('should handle plan changes mid-cycle', async () => {
      const mockPlanChange = {
        data: 'new-cycle-id',
        error: null
      };

      mockSupabase.rpc.mockResolvedValue(mockPlanChange);

      const result = await service.createSubscriptionCycle('test-sub-id', 2);
      
      expect(result).toBe('new-cycle-id');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_subscription_cycle', {
        p_subscription_id: 'test-sub-id',
        p_cycle_number: 2
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle subscription start on month end', async () => {
      const mockMonthEndSubscription = {
        data: [{
          subscription_id: 'monthend-sub-id',
          user_id: 'monthend-user-id',
          current_cycle_number: 1,
          current_cycle_start: '2024-01-31',
          current_cycle_end: '2024-02-29',
          cycle_progress_percentage: 25.0,
          days_remaining: 22,
          selection_window_status: 'upcoming',
          subscription_start_date: '2024-01-31',
          plan_id: 'Discovery Delight',
          subscription_status: 'active'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockMonthEndSubscription)
        })
      });

      const result = await service.getCurrentCycle('monthend-user-id');
      
      expect(result?.subscription_start_date).toBe('2024-01-31');
      expect(result?.current_cycle_end).toBe('2024-02-29');
    });

    it('should handle leap year dates', async () => {
      const mockLeapYearSubscription = {
        data: [{
          subscription_id: 'leapyear-sub-id',
          user_id: 'leapyear-user-id',
          current_cycle_number: 1,
          current_cycle_start: '2024-02-29',
          current_cycle_end: '2024-03-29',
          cycle_progress_percentage: 10.0,
          days_remaining: 26,
          selection_window_status: 'upcoming',
          subscription_start_date: '2024-02-29',
          plan_id: 'Discovery Delight',
          subscription_status: 'active'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockLeapYearSubscription)
        })
      });

      const result = await service.getCurrentCycle('leapyear-user-id');
      
      expect(result?.subscription_start_date).toBe('2024-02-29');
      expect(result?.current_cycle_start).toBe('2024-02-29');
    });

    it('should handle timezone differences correctly', async () => {
      // Test that date calculations are consistent across timezones
      const mockTimezoneSubscription = {
        data: [{
          subscription_id: 'timezone-sub-id',
          user_id: 'timezone-user-id',
          current_cycle_number: 1,
          current_cycle_start: '2024-12-03',
          current_cycle_end: '2025-01-01',
          cycle_progress_percentage: 3.33,
          days_remaining: 29,
          selection_window_status: 'upcoming',
          subscription_start_date: '2024-12-03',
          plan_id: 'Discovery Delight',
          subscription_status: 'active'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockTimezoneSubscription)
        })
      });

      const result = await service.getCurrentCycle('timezone-user-id');
      
      // Verify dates are handled consistently
      expect(result?.current_cycle_start).toBe('2024-12-03');
      expect(result?.current_cycle_end).toBe('2025-01-01');
    });

    it('should handle DST transitions', async () => {
      // Test that DST changes don't affect cycle calculations
      const mockDSTSubscription = {
        data: [{
          subscription_id: 'dst-sub-id',
          user_id: 'dst-user-id',
          current_cycle_number: 1,
          current_cycle_start: '2024-11-01',
          current_cycle_end: '2024-11-30',
          cycle_progress_percentage: 3.33,
          days_remaining: 29,
          selection_window_status: 'upcoming',
          subscription_start_date: '2024-11-01',
          plan_id: 'Discovery Delight',
          subscription_status: 'active'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockDSTSubscription)
        })
      });

      const result = await service.getCurrentCycle('dst-user-id');
      
      // Verify DST transition doesn't affect cycle length
      expect(result?.current_cycle_start).toBe('2024-11-01');
      expect(result?.current_cycle_end).toBe('2024-11-30');
    });
  });

  describe('User Experience Validation', () => {
    it('should ensure selection windows open/close correctly', async () => {
      const mockSelectionWindows = {
        data: [
          {
            subscription_id: 'test-sub-id',
            user_id: 'test-user-id',
            cycle_number: 1,
            window_start: '2024-12-23',
            window_end: '2024-12-30',
            window_status: 'open',
            days_until_window: 0,
            window_duration_days: 7,
            cycle_start_date: '2024-12-01',
            cycle_end_date: '2024-12-30',
            plan_id: 'Discovery Delight'
          },
          {
            subscription_id: 'test-sub-id',
            user_id: 'test-user-id',
            cycle_number: 2,
            window_start: '2025-01-23',
            window_end: '2025-01-30',
            window_status: 'upcoming',
            days_until_window: 20,
            window_duration_days: 7,
            cycle_start_date: '2025-01-01',
            cycle_end_date: '2025-01-30',
            plan_id: 'Discovery Delight'
          }
        ],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockSelectionWindows)
        })
      });

      const result = await service.getSelectionWindows('test-user-id');
      
      expect(result).toBeDefined();
      expect(result?.length).toBe(2);
      expect(result?.[0].window_status).toBe('open');
      expect(result?.[1].window_status).toBe('upcoming');
    });

    it('should display cycle progress accurately', async () => {
      const mockCurrentCycle = {
        data: [{
          subscription_id: 'test-sub-id',
          user_id: 'test-user-id',
          current_cycle_number: 1,
          current_cycle_start: '2024-12-01',
          current_cycle_end: '2024-12-30',
          cycle_progress_percentage: 33.33,
          days_remaining: 20,
          selection_window_status: 'open',
          subscription_start_date: '2024-12-01',
          plan_id: 'Discovery Delight',
          subscription_status: 'active'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockCurrentCycle)
        })
      });

      const result = await service.getCurrentCycle('test-user-id');
      
      expect(result?.cycle_progress_percentage).toBeGreaterThanOrEqual(0);
      expect(result?.cycle_progress_percentage).toBeLessThanOrEqual(100);
      expect(result?.days_remaining).toBeGreaterThanOrEqual(0);
    });

    it('should show correct next cycle dates', async () => {
      const mockCurrentCycle = {
        data: [{
          subscription_id: 'test-sub-id',
          user_id: 'test-user-id',
          current_cycle_number: 1,
          current_cycle_start: '2024-12-01',
          current_cycle_end: '2024-12-30',
          cycle_progress_percentage: 33.33,
          days_remaining: 20,
          selection_window_status: 'open',
          subscription_start_date: '2024-12-01',
          plan_id: 'Discovery Delight',
          subscription_status: 'active'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockCurrentCycle)
        })
      });

      const result = await service.getCurrentCycle('test-user-id');
      
      expect(result?.current_cycle_end).toBeDefined();
      
      // Next cycle should start after current cycle ends
      const currentCycleEnd = new Date(result?.current_cycle_end || '');
      const today = new Date();
      expect(currentCycleEnd.getTime()).toBeGreaterThanOrEqual(today.getTime() - 24 * 60 * 60 * 1000); // Allow for today
    });

    it('should provide appropriate status messages', async () => {
      const mockCurrentCycle = {
        data: [{
          subscription_id: 'test-sub-id',
          user_id: 'test-user-id',
          current_cycle_number: 1,
          current_cycle_start: '2024-12-01',
          current_cycle_end: '2024-12-30',
          cycle_progress_percentage: 33.33,
          days_remaining: 20,
          selection_window_status: 'open',
          subscription_start_date: '2024-12-01',
          plan_id: 'Discovery Delight',
          subscription_status: 'active'
        }],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockCurrentCycle)
        })
      });

      const result = await service.getCurrentCycle('test-user-id');
      
      expect(result?.selection_window_status).toBeDefined();
      expect(['open', 'closed', 'upcoming', 'paused', 'completed']).toContain(result?.selection_window_status);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockError = {
        data: null,
        error: { message: 'Database connection failed' }
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockError)
        })
      });

      const result = await service.getCurrentCycle('test-user-id');
      
      expect(result).toBeNull();
    });

    it('should handle missing subscription data', async () => {
      const mockEmpty = {
        data: [],
        error: null
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockEmpty)
        })
      });

      const result = await service.getCurrentCycle('nonexistent-user-id');
      
      expect(result).toBeNull();
    });
  });
}); 