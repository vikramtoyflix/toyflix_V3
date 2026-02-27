/**
 * Exchange Management Comparison View
 * Simple view switcher between Calendar and Day-Based views
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  BarChart3
} from 'lucide-react';

import ExchangeCalendarView from './ExchangeCalendarView';
import ExchangeManagementDashboard from './ExchangeManagementDashboard';

interface ExchangeManagementComparisonProps {
  className?: string;
}

const ExchangeManagementComparison: React.FC<ExchangeManagementComparisonProps> = ({ className }) => {
  const [activeView, setActiveView] = useState<'calendar' | 'day-based'>('calendar');

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exchange Management</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={activeView === 'calendar' ? 'default' : 'outline'}
            onClick={() => setActiveView('calendar')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Calendar View
          </Button>
          <Button
            variant={activeView === 'day-based' ? 'default' : 'outline'}
            onClick={() => setActiveView('day-based')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Day-Based View
          </Button>
        </div>
      </div>

      {/* Active View Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {activeView === 'calendar' ? (
              <>
                <Calendar className="w-5 h-5" />
                Calendar View
              </>
            ) : (
              <>
                <BarChart3 className="w-5 h-5" />
                Day-Based View
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeView === 'calendar' ? (
            <ExchangeCalendarView />
          ) : (
            <ExchangeManagementDashboard />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExchangeManagementComparison;