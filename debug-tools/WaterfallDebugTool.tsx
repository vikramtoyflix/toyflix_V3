import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StaticWebAppWooCommerceService } from '@/services/staticWebAppWooCommerceService';
import { useUserDataWaterfall } from '@/hooks/useUserDataWaterfall';
import { useCustomAuth } from '@/hooks/useCustomAuth';

const WaterfallDebugTool = () => {
  const { user } = useCustomAuth();
  const { data: waterfallData, isLoading: waterfallLoading, error: waterfallError } = useUserDataWaterfall();
  const [testPhone, setTestPhone] = useState('9108734535');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTestingService, setIsTestingService] = useState(false);

  const addTestResult = (step: string, result: any, success: boolean = true) => {
    const timestamp = new Date().toISOString();
    setTestResults(prev => [...prev, {
      step,
      result: typeof result === 'object' ? JSON.stringify(result, null, 2) : result,
      success,
      timestamp: timestamp.split('T')[1].split('.')[0] // Just time
    }]);
  };

  const testStaticWebAppService = async () => {
    setIsTestingService(true);
    setTestResults([]);
    
    try {
      addTestResult('🌐 Environment Info', StaticWebAppWooCommerceService.getEnvironmentInfo());
      
      // Test health check
      try {
        const health = await StaticWebAppWooCommerceService.healthCheck();
        addTestResult('🏥 Health Check', health, health.success);
      } catch (error: any) {
        addTestResult('🏥 Health Check', `ERROR: ${error.message}`, false);
      }
      
      // Test user lookup
      try {
        const userResponse = await StaticWebAppWooCommerceService.getUserByPhone(testPhone);
        addTestResult('👤 User Lookup', userResponse, userResponse?.success);
        
        // If user found, test subscription cycle
        if (userResponse?.success && userResponse.data?.ID) {
          try {
            const subscriptions = await StaticWebAppWooCommerceService.getSubscriptionCycle(userResponse.data.ID);
            addTestResult('📦 Subscriptions', subscriptions, !!subscriptions);
          } catch (subError: any) {
            addTestResult('📦 Subscriptions', `ERROR: ${subError.message}`, false);
          }
        }
        
      } catch (error: any) {
        addTestResult('👤 User Lookup', `ERROR: ${error.message}`, false);
      }
      
      // Test complete profile
      try {
        const completeProfile = await StaticWebAppWooCommerceService.getCompleteUserProfile(testPhone);
        addTestResult('🔍 Complete Profile', completeProfile, completeProfile?.success);
      } catch (error: any) {
        addTestResult('🔍 Complete Profile', `ERROR: ${error.message}`, false);
      }
      
    } catch (error: any) {
      addTestResult('💥 Service Test', `FATAL ERROR: ${error.message}`, false);
    } finally {
      setIsTestingService(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">🔍 Waterfall Model Debug Tool</h1>
      
      {/* Current User Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>👤 Current User & Waterfall Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>User:</strong> {user ? `${user.phone} (${user.first_name} ${user.last_name})` : 'Not logged in'}
            </div>
            <div>
              <strong>Waterfall Loading:</strong> {waterfallLoading ? 'YES' : 'NO'}
            </div>
            <div>
              <strong>Waterfall Data:</strong> {waterfallData ? `${waterfallData.userType} user` : 'None'}
            </div>
            <div>
              <strong>Error:</strong> {waterfallError ? 'YES' : 'NO'}
            </div>
          </div>
          
          {waterfallData && (
            <div className="mt-4 p-3 bg-blue-50 rounded border">
              <strong>🌊 Waterfall Result:</strong>
              <div className="text-xs mt-2">
                <div>Type: <span className="font-mono">{waterfallData.userType}</span></div>
                <div>WooCommerce: <span className="font-mono">{waterfallData.hasWooCommerceData ? 'YES' : 'NO'}</span></div>
                <div>Supabase: <span className="font-mono">{waterfallData.hasSupabaseData ? 'YES' : 'NO'}</span></div>
                <div>New User: <span className="font-mono">{waterfallData.isNewUser ? 'YES' : 'NO'}</span></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Testing */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🧪 Service Testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Test Phone Number:</label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="9108734535"
              />
            </div>
            <Button 
              onClick={testStaticWebAppService}
              disabled={isTestingService}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isTestingService ? 'Testing...' : 'Test StaticWebApp Service'}
            </Button>
            <Button 
              onClick={clearResults}
              variant="outline"
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className={`p-3 rounded border-l-4 ${
                  result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <strong className="text-sm">{result.step}</strong>
                    <span className="text-xs text-gray-500">{result.timestamp}</span>
                  </div>
                  <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                    {result.result}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>💡 Debug Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>1. <strong>Login</strong> with phone 9108734535 to test the waterfall</div>
          <div>2. <strong>Check browser console</strong> for detailed waterfall logs</div>
          <div>3. <strong>Test the service</strong> using the button above</div>
          <div>4. <strong>Expected result:</strong> If WordPress data exists, should show "woocommerce" user type</div>
          <div>5. <strong>Current issue:</strong> WordPress API server is down, causing waterfall to fail</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WaterfallDebugTool; 