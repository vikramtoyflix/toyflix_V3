import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAdminSettings, useUpdateAdminSetting } from "@/hooks/useAdminSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Save, Shield, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminRoleCheck {
  phone: string;
  email: string | null;
  name: string;
  currentRole: string;
  isAdmin: boolean;
}

const AdminSettings = () => {
  const { data: settings, isLoading } = useAdminSettings();
  const updateSetting = useUpdateAdminSetting();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState("");
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  
  // Admin role management
  const [adminPhoneNumber, setAdminPhoneNumber] = useState("");
  const [adminRoleChecks, setAdminRoleChecks] = useState<AdminRoleCheck[]>([]);
  const [isCheckingRoles, setIsCheckingRoles] = useState(false);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);

  // Load settings when data is available
  useEffect(() => {
    if (settings) {
      const keyId = settings.find(s => s.setting_key === 'razorpay_key_id')?.setting_value || '';
      const keySecret = settings.find(s => s.setting_key === 'razorpay_key_secret')?.setting_value || '';
      const accountSid = settings.find(s => s.setting_key === 'twilio_account_sid')?.setting_value || '';
      const authToken = settings.find(s => s.setting_key === 'twilio_auth_token')?.setting_value || '';
      const phoneNumber = settings.find(s => s.setting_key === 'twilio_phone_number')?.setting_value || '';
      
      setRazorpayKeyId(keyId);
      setRazorpayKeySecret(keySecret);
      setTwilioAccountSid(accountSid);
      setTwilioAuthToken(authToken);
      setTwilioPhoneNumber(phoneNumber);
    }
  }, [settings]);

  const checkAdminRoles = async () => {
    setIsCheckingRoles(true);
    try {
      const { data: users, error } = await supabase
        .from('custom_users')
        .select('phone, email, first_name, last_name, role')
        .in('role', ['admin', 'user'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const roleChecks: AdminRoleCheck[] = users.map(user => ({
        phone: user.phone,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No name',
        currentRole: user.role || 'user',
        isAdmin: user.role === 'admin'
      }));

      setAdminRoleChecks(roleChecks);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to check admin roles: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsCheckingRoles(false);
    }
  };

  const grantAdminAccess = async () => {
    if (!adminPhoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive"
      });
      return;
    }

    setIsGrantingAccess(true);
    try {
      // Grant admin access
      const { error } = await supabase
        .from('custom_users')
        .update({ role: 'admin' })
        .in('phone', [adminPhoneNumber, `+91${adminPhoneNumber}`, `91${adminPhoneNumber}`]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Admin access granted to ${adminPhoneNumber}`,
      });
      
      // Refresh the role checks
      await checkAdminRoles();
      setAdminPhoneNumber("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to grant admin access: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsGrantingAccess(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Rest of the component content */}
    </div>
  );
};

export default AdminSettings; 