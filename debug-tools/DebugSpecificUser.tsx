import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { sendOTP, verifyOTP } from "@/components/auth/custom-otp/otpService";

const DebugSpecificUser = () => {
  const [phone, setPhone] = useState("9008747619");
  const [otp, setOtp] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (step: string, data: any) => {
    const result = {
      step,
      data,
      timestamp: new Date().toISOString()
    };
    setResults(prev => [...prev, result]);
    console.log(`🔍 ${step}:`, data);
  };

  const clearResults = () => {
    setResults([]);
  };

  const checkUserInDB = async () => {
    setIsLoading(true);
    try {
      const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      
      // Check if user exists in custom_users table
      const { data: user, error } = await supabase
        .from('custom_users')
        .select('*')
        .eq('phone', fullPhone)
        .single();

      addResult('Database Check', {
        phone: fullPhone,
        userExists: !!user,
        user: user,
        error: error?.message
      });
    } catch (error) {
      addResult('Database Error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testSendOTP = async () => {
    setIsLoading(true);
    try {
      const result = await sendOTP(phone);
      addResult('Send OTP', result);
    } catch (error) {
      addResult('Send OTP Error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testVerifyOTP = async () => {
    setIsLoading(true);
    try {
      const result = await verifyOTP(phone, otp);
      addResult('Verify OTP', result);
      
      if (result.success && result.user) {
        const profileCheck = {
          first_name: result.user.first_name,
          last_name: result.user.last_name,
          isComplete: !!(result.user.first_name && result.user.last_name),
          shouldGoToSignup: !(result.user.first_name && result.user.last_name)
        };
        addResult('Profile Completeness', profileCheck);
      }
    } catch (error) {
      addResult('Verify OTP Error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUserFromDB = async () => {
    setIsLoading(true);
    try {
      const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      
      // Delete user sessions first
      const { error: sessionError } = await supabase
        .from('user_sessions')
        .delete()
        .match({ user_id: await getUserId(fullPhone) });

      // Delete user
      const { error: userError } = await supabase
        .from('custom_users')
        .delete()
        .eq('phone', fullPhone);

      addResult('Delete User', {
        phone: fullPhone,
        sessionError: sessionError?.message,
        userError: userError?.message,
        success: !userError
      });
    } catch (error) {
      addResult('Delete Error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserId = async (phone: string) => {
    const { data } = await supabase
      .from('custom_users')
      .select('id')
      .eq('phone', phone)
      .single();
    return data?.id;
  };

  const clearAuthCache = () => {
    localStorage.removeItem('sb-wucwpyitzqjukcphczhr-auth-token');
    localStorage.removeItem('customAuth');
    sessionStorage.clear();
    addResult('Cache Cleared', 'All auth caches cleared');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Debug Phone: {phone}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Phone Number:</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9008747619"
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
          
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={checkUserInDB} disabled={isLoading} size="sm">
              1. Check DB
            </Button>
            <Button onClick={deleteUserFromDB} disabled={isLoading} variant="destructive" size="sm">
              2. Delete User
            </Button>
            <Button onClick={clearAuthCache} disabled={isLoading} variant="outline" size="sm">
              3. Clear Cache
            </Button>
            <Button onClick={testSendOTP} disabled={isLoading} size="sm">
              4. Send OTP
            </Button>
            <Button onClick={testVerifyOTP} disabled={isLoading && !otp} size="sm">
              5. Verify OTP
            </Button>
            <Button onClick={clearResults} variant="secondary" size="sm">
              Clear Results
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <Card key={index} className="bg-slate-50">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <strong className="text-sm">{result.step}</strong>
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="bg-slate-100 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">🎯 Debug Steps:</h4>
            <ol className="text-sm text-yellow-700 space-y-1">
              <li>1. <strong>Check DB</strong> - See if user exists in production</li>
              <li>2. <strong>Delete User</strong> - Remove user from DB completely</li>
              <li>3. <strong>Clear Cache</strong> - Clear all authentication cache</li>
              <li>4. <strong>Send OTP</strong> - Test OTP sending</li>
              <li>5. <strong>Verify OTP</strong> - See what user data is created/returned</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugSpecificUser; 