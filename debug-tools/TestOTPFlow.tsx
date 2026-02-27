import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendOTP, verifyOTP } from "@/components/auth/custom-otp/otpService";

const TestOTPFlow = () => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (step: string, result: any) => {
    setTestResults(prev => [...prev, { step, result, timestamp: new Date().toISOString() }]);
  };

  const testSendOTP = async () => {
    if (!phone) return;
    setIsLoading(true);
    
    try {
      console.log('🧪 Testing sendOTP...');
      const result = await sendOTP(phone);
      addResult('Send OTP', result);
      console.log('🧪 sendOTP result:', result);
    } catch (error) {
      addResult('Send OTP Error', error);
      console.error('🧪 sendOTP error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testVerifyOTP = async () => {
    if (!phone || !otp) return;
    setIsLoading(true);
    
    try {
      console.log('🧪 Testing verifyOTP...');
      const result = await verifyOTP(phone, otp);
      addResult('Verify OTP', result);
      console.log('🧪 verifyOTP result:', result);
      
      if (result.success && result.user) {
        const isComplete = result.user.first_name && result.user.last_name;
        addResult('Profile Check', {
          first_name: result.user.first_name,
          last_name: result.user.last_name,
          isComplete,
          shouldGoToSignup: !isComplete
        });
      }
    } catch (error) {
      addResult('Verify OTP Error', error);
      console.error('🧪 verifyOTP error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🧪 OTP Flow Debugging Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Phone Number:</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
              />
            </div>
            <div>
              <label>OTP Code:</label>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder=""
              />
            </div>
          </div>
          
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={testSendOTP} 
              disabled={isLoading || !phone}
              variant="outline"
            >
              1. Test Send OTP
            </Button>
            <Button 
              onClick={testVerifyOTP} 
              disabled={isLoading || !phone || !otp}
              variant="outline"
            >
              2. Test Verify OTP  
            </Button>
            <Button 
              onClick={clearResults} 
              variant="secondary"
            >
              Clear Results
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Test Results:</h3>
              <div className="space-y-4">
                {testResults.map((test, index) => (
                  <Card key={index} className="bg-slate-50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <strong>{test.step}</strong>
                        <span className="text-xs text-muted-foreground">
                          {new Date(test.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="bg-slate-100 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(test.result, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">🔍 What to Check:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>Send OTP:</strong> Should return success: true and maybe an OTP code for testing</li>
              <li><strong>Verify OTP:</strong> Should return success: true, user object, and session</li>
              <li><strong>New User:</strong> Should have first_name: null, last_name: null (requires signup)</li>
              <li><strong>Existing User:</strong> Should have first_name and last_name (direct signin)</li>
              <li><strong>Profile Check:</strong> Should show shouldGoToSignup: true for new users</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestOTPFlow; 