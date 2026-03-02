import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SubscriptionCycleProgress } from '../subscription/SubscriptionCycleProgress';
import { SubscriptionCycleService } from '../../services/subscriptionCycleService';

// Mock the service
vi.mock('../../services/subscriptionCycleService');

const mockService = SubscriptionCycleService as any;

describe('SubscriptionCycleProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cycle Progress Display', () => {
    it('should display cycle progress accurately', async () => {
      const mockCycleData = {
        subscription_id: 'test-sub-id',
        user_id: 'test-user-id',
        current_cycle_number: 2,
        current_cycle_start: '2024-12-01',
        current_cycle_end: '2024-12-30',
        cycle_progress_percentage: 33.33,
        days_remaining: 20,
        selection_window_status: 'open',
        subscription_start_date: '2024-10-01',
        plan_id: 'Discovery Delight',
        subscription_status: 'active'
      };

      mockService.prototype.getCurrentCycle = vi.fn().mockResolvedValue(mockCycleData);

      render(<SubscriptionCycleProgress userId="test-user-id" />);

      await waitFor(() => {
        expect(screen.getByText('Cycle 2')).toBeInTheDocument();
        expect(screen.getByText('33%')).toBeInTheDocument();
        expect(screen.getByText('20 days remaining')).toBeInTheDocument();
      });
    });

    it('should show correct progress for new subscription (first cycle)', async () => {
      const mockNewCycleData = {
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
      };

      mockService.prototype.getCurrentCycle = vi.fn().mockResolvedValue(mockNewCycleData);

      render(<SubscriptionCycleProgress userId="new-user-id" />);

      await waitFor(() => {
        expect(screen.getByText('Cycle 1')).toBeInTheDocument();
        expect(screen.getByText('3%')).toBeInTheDocument();
        expect(screen.getByText('29 days remaining')).toBeInTheDocument();
        expect(screen.getByText('Just started!')).toBeInTheDocument();
      });
    });

    it('should show correct progress for long-term subscription', async () => {
      const mockLongTermCycleData = {
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
      };

      mockService.prototype.getCurrentCycle = vi.fn().mockResolvedValue(mockLongTermCycleData);

      render(<SubscriptionCycleProgress userId="longterm-user-id" />);

      await waitFor(() => {
        expect(screen.getByText('Cycle 12')).toBeInTheDocument();
        expect(screen.getByText('97%')).toBeInTheDocument();
        expect(screen.getByText('1 day remaining')).toBeInTheDocument();
        expect(screen.getByText('Almost done!')).toBeInTheDocument();
      });
    });
  });

  describe('Selection Window Status', () => {
    it('should display "Selection Open" when window is open', async () => {
      const mockOpenWindowData = {
        subscription_id: 'test-sub-id',
        user_id: 'test-user-id',
        current_cycle_number: 1,
        current_cycle_start: '2024-12-01',
        current_cycle_end: '2024-12-30',
        cycle_progress_percentage: 80.0,
        days_remaining: 6,
        selection_window_status: 'open',
        subscription_start_date: '2024-12-01',
        plan_id: 'Discovery Delight',
        subscription_status: 'active'
      };

      mockService.prototype.getCurrentCycle = vi.fn().mockResolvedValue(mockOpenWindowData);

      render(<SubscriptionCycleProgress userId="test-user-id" />);

      await waitFor(() => {
        expect(screen.getByText('Selection Window Open')).toBeInTheDocument();
        expect(screen.getByText('Choose your toys now!')).toBeInTheDocument();
      });
    });

    it('should display "Selection Upcoming" when window is upcoming', async () => {
      const mockUpcomingWindowData = {
        subscription_id: 'test-sub-id',
        user_id: 'test-user-id',
        current_cycle_number: 1,
        current_cycle_start: '2024-12-01',
        current_cycle_end: '2024-12-30',
        cycle_progress_percentage: 50.0,
        days_remaining: 15,
        selection_window_status: 'upcoming',
        subscription_start_date: '2024-12-01',
        plan_id: 'Discovery Delight',
        subscription_status: 'active'
      };

      mockService.prototype.getCurrentCycle = vi.fn().mockResolvedValue(mockUpcomingWindowData);

      render(<SubscriptionCycleProgress userId="test-user-id" />);

      await waitFor(() => {
        expect(screen.getByText('Selection Window Upcoming')).toBeInTheDocument();
        expect(screen.getByText('Get ready to choose!')).toBeInTheDocument();
      });
    });

    it('should display "Selection Closed" when window is closed', async () => {
      const mockClosedWindowData = {
        subscription_id: 'test-sub-id',
        user_id: 'test-user-id',
        current_cycle_number: 1,
        current_cycle_start: '2024-12-01',
        current_cycle_end: '2024-12-30',
        cycle_progress_percentage: 100.0,
        days_remaining: 0,
        selection_window_status: 'closed',
        subscription_start_date: '2024-12-01',
        plan_id: 'Discovery Delight',
        subscription_status: 'active'
      };

      mockService.prototype.getCurrentCycle = vi.fn().mockResolvedValue(mockClosedWindowData);

      render(<SubscriptionCycleProgress userId="test-user-id" />);

      await waitFor(() => {
        expect(screen.getByText('Selection Window Closed')).toBeInTheDocument();
        expect(screen.getByText('Cycle complete!')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle paused subscription', async () => {
      const mockPausedData = {
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
      };

      mockService.prototype.getCurrentCycle = vi.fn().mockResolvedValue(mockPausedData);

      render(<SubscriptionCycleProgress userId="paused-user-id" />);

      await waitFor(() => {
        expect(screen.getByText('Subscription Paused')).toBeInTheDocument();
        expect(screen.getByText('Cycle 3 - 50%')).toBeInTheDocument();
      });
    });

    it('should handle month-end subscription start', async () => {
      const mockMonthEndData = {
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
      };

      mockService.prototype.getCurrentCycle = vi.fn().mockResolvedValue(mockMonthEndData);

      render(<SubscriptionCycleProgress userId="monthend-user-id" />);

      await waitFor(() => {
        expect(screen.getByText('Cycle 1')).toBeInTheDocument();
        expect(screen.getByText('25%')).toBeInTheDocument();
        expect(screen.getByText('Started: Jan 31, 2024')).toBeInTheDocument();
      });
    });

    it('should handle leap year dates', async () => {
      const mockLeapYearData = {
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
      };

      mockService.prototype.getCurrentCycle = vi.fn().mockResolvedValue(mockLeapYearData);

      render(<SubscriptionCycleProgress userId="leapyear-user-id" />);

      await waitFor(() => {
        expect(screen.getByText('Started: Feb 29, 2024')).toBeInTheDocument();
        expect(screen.getByText('10%')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockService.prototype.getCurrentCycle = vi.fn().mockRejectedValue(new Error('API Error'));

      render(<SubscriptionCycleProgress userId="test-user-id" />);

      await waitFor(() => {
        expect(screen.getByText('Unable to load cycle information')).toBeInTheDocument();
      });
    });

    it('should handle missing subscription data', async () => {
      mockService.prototype.getCurrentCycle = vi.fn().mockResolvedValue(null);

      render(<SubscriptionCycleProgress userId="nonexistent-user-id" />);

      await waitFor(() => {
        expect(screen.getByText('No active subscription found')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner while fetching data', async () => {
      mockService.prototype.getCurrentCycle = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<SubscriptionCycleProgress userId="test-user-id" />);

      expect(screen.getByText('Loading cycle information...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for progress indicators', async () => {
      const mockCycleData = {
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
      };

      mockService.prototype.getCurrentCycle = vi.fn().mockResolvedValue(mockCycleData);

      render(<SubscriptionCycleProgress userId="test-user-id" />);

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuenow', '33');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');
        expect(progressBar).toHaveAttribute('aria-label', 'Cycle 1 progress: 33% complete');
      });
    });

    it('should have proper semantic structure', async () => {
      const mockCycleData = {
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
      };

      mockService.prototype.getCurrentCycle = vi.fn().mockResolvedValue(mockCycleData);

      render(<SubscriptionCycleProgress userId="test-user-id" />);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Subscription Cycle Progress' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Cycle 1' })).toBeInTheDocument();
      });
    });
  });

  describe('Visual Feedback', () => {
    it('should show appropriate visual indicators for cycle progress', async () => {
      const mockCycleData = {
        subscription_id: 'test-sub-id',
        user_id: 'test-user-id',
        current_cycle_number: 1,
        current_cycle_start: '2024-12-01',
        current_cycle_end: '2024-12-30',
        cycle_progress_percentage: 75.0,
        days_remaining: 7,
        selection_window_status: 'open',
        subscription_start_date: '2024-12-01',
        plan_id: 'Discovery Delight',
        subscription_status: 'active'
      };

      mockService.prototype.getCurrentCycle = vi.fn().mockResolvedValue(mockCycleData);

      render(<SubscriptionCycleProgress userId="test-user-id" />);

      await waitFor(() => {
        // Check for progress bar styling
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveClass('progress-bar');
        // Component uses data-progress-level for color coding (75% => progress-high)
        const progressContainer = screen.getByTestId('progress-container');
        expect(progressContainer).toHaveAttribute('data-progress-level', 'progress-high');
      });
    });

    it('should show warning indicators for urgent actions', async () => {
      const mockUrgentData = {
        subscription_id: 'test-sub-id',
        user_id: 'test-user-id',
        current_cycle_number: 1,
        current_cycle_start: '2024-12-01',
        current_cycle_end: '2024-12-30',
        cycle_progress_percentage: 95.0,
        days_remaining: 1,
        selection_window_status: 'open',
        subscription_start_date: '2024-12-01',
        plan_id: 'Discovery Delight',
        subscription_status: 'active'
      };

      mockService.prototype.getCurrentCycle = vi.fn().mockResolvedValue(mockUrgentData);

      render(<SubscriptionCycleProgress userId="test-user-id" />);

      await waitFor(() => {
        expect(screen.getAllByText(/Selection ends soon!/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Only 1 day remaining')).toBeInTheDocument();
      });
    });
  });
}); 