import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const TestDBConnection = () => {
  const [connection, setConnection] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testConnection = async () => {
    setIsLoading(true);
    try {
      // Test basic connection
      const { data, error } = await supabase
        .from('custom_users')
        .select('id, phone, first_name, last_name, created_at')
        .limit(5);
      
      if (error) {
        setConnection({ 
          status: 'error', 
          message: error.message,
          database: 'Unknown'
        });
      } else {
        setConnection({ 
          status: 'success', 
          message: 'Connected successfully!',
          database: 'Production Supabase',
          url: 'https://wucwpyitzqjukcphczhr.supabase.co',
          userCount: data.length
        });
        setUsers(data);
      }
    } catch (error: any) {
      setConnection({ 
        status: 'error', 
        message: error.message,
        database: 'Connection failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testOTPFunction = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone: '+919876543210' }
      });
      
      console.log('OTP Function Test:', { data, error });
      alert(`OTP Function Result: ${JSON.stringify({ data, error }, null, 2)}`);
    } catch (error) {
      console.error('OTP Function Error:', error);
      alert(`OTP Function Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Database Connection Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testConnection} disabled={isLoading}>
              Test DB Connection
            </Button>
            <Button onClick={testOTPFunction} disabled={isLoading} variant="outline">
              Test OTP Function
            </Button>
          </div>

          {connection && (
            <Card className={`${connection.status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div><strong>Status:</strong> {connection.status}</div>
                  <div><strong>Database:</strong> {connection.database}</div>
                  <div><strong>URL:</strong> {connection.url}</div>
                  <div><strong>Message:</strong> {connection.message}</div>
                  {connection.userCount !== undefined && (
                    <div><strong>Users Found:</strong> {connection.userCount}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {users.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sample Users from Database</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="p-2 bg-slate-100 rounded">
                      <div><strong>Phone:</strong> {user.phone}</div>
                      <div><strong>Name:</strong> {user.first_name} {user.last_name}</div>
                      <div><strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">🎯 What This Tests:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Database connection to production Supabase</li>
              <li>• Custom users table accessibility</li>
              <li>• Edge functions connectivity</li>
              <li>• Current user data in production</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestDBConnection; 