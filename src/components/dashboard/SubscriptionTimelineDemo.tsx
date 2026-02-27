import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubscriptionTimeline } from './SubscriptionTimeline';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Calendar,
  Clock,
  Gift,
  Package,
  Star,
  PlayCircle,
  Code,
  Eye,
  Download,
  Smartphone,
  Monitor,
  Zap
} from 'lucide-react';

export const SubscriptionTimelineDemo: React.FC = () => {
  const { user } = useCustomAuth();
  const isMobile = useIsMobile();
  const [selectedDemo, setSelectedDemo] = useState<'standard' | 'compact' | 'interactive'>('standard');
  const [showCode, setShowCode] = useState(false);

  const demoFeatures = [
    {
      icon: <Calendar className="w-5 h-5" />,
      title: "Visual Cycle Timeline",
      description: "Shows current position in cycle, selection windows, delivery dates, and next cycle start"
    },
    {
      icon: <Star className="w-5 h-5" />,
      title: "Subscription Milestones",
      description: "Displays subscription start, cycle anniversaries, plan upgrades, and customer journey"
    },
    {
      icon: <Eye className="w-5 h-5" />,
      title: "Interactive Features",
      description: "Click cycles for details, hover for info, navigate between past/future cycles"
    },
    {
      icon: <Smartphone className="w-5 h-5" />,
      title: "Mobile Responsive",
      description: "Compact timeline for mobile, swipe navigation, touch-friendly controls"
    },
    {
      icon: <Download className="w-5 h-5" />,
      title: "Export History",
      description: "Export complete subscription history as JSON with all cycle and milestone data"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Real-time Updates",
      description: "Live progress tracking, selection window status, and automated notifications"
    }
  ];

  const codeExample = `// Basic Usage
<SubscriptionTimeline
  userId={user.id}
  showCompact={isMobile}
  maxVisibleCycles={6}
  onCycleClick={(cycle) => {
    console.log('Cycle details:', cycle);
  }}
  onExportHistory={() => {
    // Handle export
  }}
/>

// Advanced Configuration
<SubscriptionTimeline
  userId={user.id}
  showCompact={false}
  maxVisibleCycles={8}
  onCycleClick={handleCycleDetails}
  onExportHistory={handleExport}
/>`;

  return (
    <div className="space-y-6">
      {/* Demo Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="w-6 h-6 text-blue-600" />
            SubscriptionTimeline Demo
          </CardTitle>
          <p className="text-gray-600">
            Interactive demonstration of the subscription timeline component with all features
          </p>
        </CardHeader>
        <CardContent>
          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {demoFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{feature.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Demo Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={selectedDemo === 'standard' ? 'default' : 'outline'}
                onClick={() => setSelectedDemo('standard')}
              >
                <Monitor className="w-4 h-4 mr-1" />
                Standard
              </Button>
              <Button
                size="sm"
                variant={selectedDemo === 'compact' ? 'default' : 'outline'}
                onClick={() => setSelectedDemo('compact')}
              >
                <Smartphone className="w-4 h-4 mr-1" />
                Mobile
              </Button>
              <Button
                size="sm"
                variant={selectedDemo === 'interactive' ? 'default' : 'outline'}
                onClick={() => setSelectedDemo('interactive')}
              >
                <Zap className="w-4 h-4 mr-1" />
                Interactive
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCode(!showCode)}
            >
              <Code className="w-4 h-4 mr-1" />
              {showCode ? 'Hide' : 'Show'} Code
            </Button>
          </div>

          {/* Code Example */}
          {showCode && (
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm mb-4 overflow-x-auto">
              <pre>{codeExample}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demo Implementation */}
      <Tabs value={selectedDemo} onValueChange={(value) => setSelectedDemo(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="standard" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Standard View
          </TabsTrigger>
          <TabsTrigger value="compact" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Mobile View
          </TabsTrigger>
          <TabsTrigger value="interactive" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Interactive Demo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Standard Desktop Timeline</h3>
                  <Badge variant="outline">Desktop Optimized</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Full-featured timeline with all cycles visible, detailed tooltips, and complete navigation controls.
                </p>
                
                {user?.id && (
                  <SubscriptionTimeline
                    userId={user.id}
                    showCompact={false}
                    maxVisibleCycles={6}
                    onCycleClick={(cycle) => {
                      console.log('Demo: Cycle clicked', cycle);
                      alert(`Clicked on Cycle ${cycle.cycleNumber}\nStatus: ${cycle.status}\nDates: ${cycle.startDate.toDateString()} - ${cycle.endDate.toDateString()}`);
                    }}
                    onExportHistory={() => {
                      console.log('Demo: Export history requested');
                      alert('Demo: Subscription history would be exported as JSON file');
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compact" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Mobile Compact Timeline</h3>
                  <Badge variant="outline">Mobile Optimized</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Compact mobile view with swipe navigation, touch-friendly controls, and optimized information display.
                </p>
                
                {user?.id && (
                  <div className="max-w-sm mx-auto">
                    <SubscriptionTimeline
                      userId={user.id}
                      showCompact={true}
                      maxVisibleCycles={3}
                      onCycleClick={(cycle) => {
                        console.log('Demo: Mobile cycle clicked', cycle);
                        alert(`Mobile Demo: Cycle ${cycle.cycleNumber}\nSwipe left/right to navigate`);
                      }}
                      onExportHistory={() => {
                        console.log('Demo: Mobile export requested');
                        alert('Demo: Mobile export feature activated');
                      }}
                    />
                  </div>
                )}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-blue-800">
                    📱 Mobile features: Swipe left/right to navigate between cycles, tap for details, touch-optimized controls
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interactive" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Interactive Features Demo</h3>
                  <Badge variant="outline">Full Interactivity</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Demonstrates all interactive features including cycle details, milestone view, export functionality, and real-time updates.
                </p>
                
                {user?.id && (
                  <SubscriptionTimeline
                    userId={user.id}
                    showCompact={false}
                    maxVisibleCycles={5}
                    onCycleClick={(cycle) => {
                      console.log('Demo: Interactive cycle clicked', cycle);
                      const details = `
🎯 Cycle ${cycle.cycleNumber} Details:
📅 Period: ${cycle.startDate.toDateString()} - ${cycle.endDate.toDateString()}
🎁 Selection: ${cycle.selectionWindowStart.toDateString()} - ${cycle.selectionWindowEnd.toDateString()}
📦 Delivery: ${cycle.deliveryDate?.toDateString() || 'TBD'}
✅ Status: ${cycle.status}
🏷️ Plan: ${cycle.planId}
${cycle.orderNumber ? `📋 Order: ${cycle.orderNumber}` : ''}
                      `;
                      alert(details);
                    }}
                    onExportHistory={() => {
                      console.log('Demo: Interactive export requested');
                      const exportData = {
                        timestamp: new Date().toISOString(),
                        demo: true,
                        features: ['Visual Timeline', 'Milestones', 'Export', 'Interactive'],
                        note: 'This is a demo export - real implementation would include actual subscription data'
                      };
                      
                      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `toyflix-timeline-demo-${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      
                      alert('Demo: Subscription history exported! Check your downloads folder.');
                    }}
                  />
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h4 className="font-medium text-green-800 mb-2">✨ Try These Features:</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Click any cycle card for detailed information</li>
                      <li>• Hover over cycles for quick tooltip preview</li>
                      <li>• Switch between Timeline and Milestones views</li>
                      <li>• Use navigation arrows to browse cycles</li>
                      <li>• Click Export to download history data</li>
                    </ul>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <h4 className="font-medium text-purple-800 mb-2">🎮 Interactive Elements:</h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      <li>• Real-time progress bars for current cycle</li>
                      <li>• Dynamic status badges and indicators</li>
                      <li>• Animated elements for active states</li>
                      <li>• Touch/swipe support on mobile devices</li>
                      <li>• Responsive design adapting to screen size</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feature Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Implementation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-green-800 mb-3">✅ Completed Features</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Visual cycle timeline with current position
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Selection window periods and delivery dates
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Subscription milestones and anniversaries
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Interactive cycle details and navigation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Mobile-responsive with swipe navigation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Export subscription history functionality
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-blue-800 mb-3">🎯 Key Benefits</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-blue-600" />
                  Clear visual representation of subscription journey
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-blue-600" />
                  Real-time progress tracking and updates
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-blue-600" />
                  Enhanced user engagement with interactive elements
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-blue-600" />
                  Mobile-first responsive design
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-blue-600" />
                  Data export for customer transparency
                </li>
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-blue-600" />
                  Seamless integration with existing systems
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionTimelineDemo; 