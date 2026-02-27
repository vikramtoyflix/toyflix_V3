import React from 'react';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useUserRole } from '@/hooks/useUserRole';
import CycleManagement from '@/components/admin/CycleManagement';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Settings } from 'lucide-react';

const AdminCycleTesting = () => {
  const { user } = useCustomAuth();
  const { data: userRole, isLoading } = useUserRole();

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (userRole !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-600">Admin access required to test cycle management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Cycle Management Testing
        </h1>
        <p className="text-gray-600">
          Test the new subscription cycle management system
        </p>
      </div>

      {/* Migration Success Status */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            Migration Completed Successfully
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">1,782</div>
              <div className="text-sm text-green-600">Closed Cycles</div>
              <Badge variant="secondary" className="mt-1">Past Selection Window</Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">538</div>
              <div className="text-sm text-blue-600">Upcoming Cycles</div>
              <Badge variant="outline" className="mt-1">Future Selection Window</Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-700">10</div>
              <div className="text-sm text-orange-600">Open Cycles</div>
              <Badge variant="default" className="mt-1 bg-orange-500">Ready for Testing!</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Testing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Testing Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">🧪 How to Test:</h4>
            <ol className="list-decimal list-inside space-y-2 text-blue-700">
              <li>Use the cycle management tool below to find a user with an "open" selection window</li>
              <li>Note their email address</li>
              <li>Login as that user in another browser/incognito window</li>
              <li>Check if they see the "Select Toys" option in their dashboard</li>
              <li>Test toy selection - it should update their current cycle (not create new order)</li>
              <li>Return here and verify the cycle was updated</li>
            </ol>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-800 mb-2">🔧 Admin Override Testing:</h4>
            <ol className="list-decimal list-inside space-y-2 text-orange-700">
              <li>Find a user with "closed" selection window status</li>
              <li>Use admin override to enable their cycle update</li>
              <li>Login as that user and test toy selection</li>
              <li>Verify the override worked correctly</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Cycle Management Tool */}
      <CycleManagement adminUserId={user?.id || ''} />

      {/* Test Users with Open Windows */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quick Test Users (Open Selection Windows)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 mb-2">
              <strong>10 users currently have open selection windows</strong> - perfect for testing!
            </p>
            <p className="text-yellow-700 text-sm">
              Use the cycle management tool above to find their email addresses, 
              then test the toy selection flow with these users.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCycleTesting; 