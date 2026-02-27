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

  // Load current settings
  useEffect(() => {
    if (settings) {
      const keyIdSetting = settings.find(s => s.setting_key === 'razorpay_key_id');
      const keySecretSetting = settings.find(s => s.setting_key === 'razorpay_key_secret');
      const twilioSidSetting = settings.find(s => s.setting_key === 'twilio_account_sid');
      const twilioTokenSetting = settings.find(s => s.setting_key === 'twilio_auth_token');
      const twilioPhoneSetting = settings.find(s => s.setting_key === 'twilio_phone_number');
      
      if (keyIdSetting?.setting_value) {
        setRazorpayKeyId(keyIdSetting.setting_value);
      }
      if (keySecretSetting?.setting_value) {
        setRazorpayKeySecret(keySecretSetting.setting_value);
      }
      if (twilioSidSetting?.setting_value) {
        setTwilioAccountSid(twilioSidSetting.setting_value);
      }
      if (twilioTokenSetting?.setting_value) {
        setTwilioAuthToken(twilioTokenSetting.setting_value);
      }
      if (twilioPhoneSetting?.setting_value) {
        setTwilioPhoneNumber(twilioPhoneSetting.setting_value);
      }
    }
  }, [settings]);

  const handleSaveRazorpaySettings = async () => {
    try {
      await updateSetting.mutateAsync({ key: 'razorpay_key_id', value: razorpayKeyId });
      await updateSetting.mutateAsync({ key: 'razorpay_key_secret', value: razorpayKeySecret });
    } catch (error) {
      console.error('Failed to save Razorpay settings:', error);
    }
  };

  const handleSaveTwilioSettings = async () => {
    try {
      await updateSetting.mutateAsync({ key: 'twilio_account_sid', value: twilioAccountSid });
      await updateSetting.mutateAsync({ key: 'twilio_auth_token', value: twilioAuthToken });
      await updateSetting.mutateAsync({ key: 'twilio_phone_number', value: twilioPhoneNumber });
    } catch (error) {
      console.error('Failed to save Twilio settings:', error);
    }
  };

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
      toast({
        title: "Success",
        description: `Found ${roleChecks.length} users. Admins: ${roleChecks.filter(u => u.isAdmin).length}`,
      });
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
      // Grant admin access with multiple phone number formats
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

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${isMobile ? 'py-8' : 'py-12'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-${isMobile ? '4' : '6'}`}>
      <Card>
        <CardHeader className={isMobile ? 'pb-3' : ''}>
          <CardTitle className={isMobile ? 'text-base' : ''}>Razorpay Configuration</CardTitle>
          <CardDescription className={isMobile ? 'text-sm' : ''}>
            Configure your Razorpay payment gateway settings
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'pt-0 space-y-3' : 'space-y-4'}>
          <div className="space-y-2">
            <Label htmlFor="razorpay-key-id" className={isMobile ? 'text-sm' : ''}>Razorpay Key ID</Label>
            <Input
              id="razorpay-key-id"
              type="text"
              placeholder="Enter your Razorpay Key ID"
              value={razorpayKeyId}
              onChange={(e) => setRazorpayKeyId(e.target.value)}
              className={isMobile ? 'text-sm' : ''}
            />
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
              Your Razorpay Key ID (public key) - safe to expose
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="razorpay-key-secret" className={isMobile ? 'text-sm' : ''}>Razorpay Key Secret</Label>
            <div className="relative">
              <Input
                id="razorpay-key-secret"
                type={showRazorpaySecret ? "text" : "password"}
                placeholder="Enter your Razorpay Key Secret"
                value={razorpayKeySecret}
                onChange={(e) => setRazorpayKeySecret(e.target.value)}
                className={`pr-10 ${isMobile ? 'text-sm' : ''}`}
              />
              <Button
                type="button"
                variant="ghost"
                size={isMobile ? "sm" : "sm"}
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
              >
                {showRazorpaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
              Your Razorpay Key Secret - keep this secure
            </p>
          </div>

          <Button 
            onClick={handleSaveRazorpaySettings} 
            className={`w-full ${isMobile ? 'mt-4' : 'mt-6'}`}
            size={isMobile ? "sm" : "default"}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Razorpay Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className={isMobile ? 'pb-3' : ''}>
          <CardTitle className={isMobile ? 'text-base' : ''}>Twilio SMS Configuration</CardTitle>
          <CardDescription className={isMobile ? 'text-sm' : ''}>
            Configure SMS/OTP functionality using Twilio
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'pt-0 space-y-3' : 'space-y-4'}>
          <div className="space-y-2">
            <Label htmlFor="twilio-account-sid" className={isMobile ? 'text-sm' : ''}>Twilio Account SID</Label>
            <Input
              id="twilio-account-sid"
              type="text"
              placeholder="Enter your Twilio Account SID"
              value={twilioAccountSid}
              onChange={(e) => setTwilioAccountSid(e.target.value)}
              className={isMobile ? 'text-sm' : ''}
            />
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
              Your Twilio Account SID - found in your Twilio console
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="twilio-auth-token" className={isMobile ? 'text-sm' : ''}>Twilio Auth Token</Label>
            <div className="relative">
              <Input
                id="twilio-auth-token"
                type={showTwilioToken ? "text" : "password"}
                placeholder="Enter your Twilio Auth Token"
                value={twilioAuthToken}
                onChange={(e) => setTwilioAuthToken(e.target.value)}
                className={`pr-10 ${isMobile ? 'text-sm' : ''}`}
              />
              <Button
                type="button"
                variant="ghost"
                size={isMobile ? "sm" : "sm"}
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowTwilioToken(!showTwilioToken)}
              >
                {showTwilioToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
              Your Twilio Auth Token (secret) - keep this secure
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="twilio-phone-number" className={isMobile ? 'text-sm' : ''}>Twilio Phone Number</Label>
            <Input
              id="twilio-phone-number"
              type="text"
              placeholder="+1234567890"
              value={twilioPhoneNumber}
              onChange={(e) => setTwilioPhoneNumber(e.target.value)}
              className={isMobile ? 'text-sm' : ''}
            />
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
              Your Twilio phone number (with country code) for sending SMS
            </p>
          </div>

          <Button 
            onClick={handleSaveTwilioSettings} 
            className={`w-full ${isMobile ? 'mt-4' : 'mt-6'}`}
            size={isMobile ? "sm" : "default"}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Twilio Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className={isMobile ? 'pb-3' : ''}>
          <CardTitle className={isMobile ? 'text-base' : ''}>Integration Status</CardTitle>
          <CardDescription className={isMobile ? 'text-sm' : ''}>
            Current status of your service integrations
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'pt-0' : ''}>
          <div className={`space-y-${isMobile ? '3' : '4'}`}>
            <div>
              <h4 className={`font-medium ${isMobile ? 'text-sm mb-2' : 'mb-2'}`}>Payment Configuration:</h4>
              <div className={`space-y-${isMobile ? '1' : '2'}`}>
                <div className="flex items-center justify-between">
                  <span className={isMobile ? 'text-sm' : ''}>Razorpay Key ID:</span>
                  <span className={`${razorpayKeyId ? "text-green-600" : "text-red-600"} ${isMobile ? 'text-sm' : ''}`}>
                    {razorpayKeyId ? "✓ Configured" : "✗ Not configured"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isMobile ? 'text-sm' : ''}>Razorpay Key Secret:</span>
                  <span className={`${razorpayKeySecret ? "text-green-600" : "text-red-600"} ${isMobile ? 'text-sm' : ''}`}>
                    {razorpayKeySecret ? "✓ Configured" : "✗ Not configured"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isMobile ? 'text-sm' : ''}>Payment Integration:</span>
                  <span className={`${razorpayKeyId && razorpayKeySecret ? "text-green-600" : "text-orange-600"} ${isMobile ? 'text-sm' : ''}`}>
                    {razorpayKeyId && razorpayKeySecret ? "✓ Ready" : "⚠ Incomplete"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className={`font-medium ${isMobile ? 'text-sm mb-2' : 'mb-2'}`}>SMS/OTP Configuration:</h4>
              <div className={`space-y-${isMobile ? '1' : '2'}`}>
                <div className="flex items-center justify-between">
                  <span className={isMobile ? 'text-sm' : ''}>Twilio Account SID:</span>
                  <span className={`${twilioAccountSid ? "text-green-600" : "text-red-600"} ${isMobile ? 'text-sm' : ''}`}>
                    {twilioAccountSid ? "✓ Configured" : "✗ Not configured"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isMobile ? 'text-sm' : ''}>Twilio Auth Token:</span>
                  <span className={`${twilioAuthToken ? "text-green-600" : "text-red-600"} ${isMobile ? 'text-sm' : ''}`}>
                    {twilioAuthToken ? "✓ Configured" : "✗ Not configured"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isMobile ? 'text-sm' : ''}>Twilio Phone Number:</span>
                  <span className={`${twilioPhoneNumber ? "text-green-600" : "text-red-600"} ${isMobile ? 'text-sm' : ''}`}>
                    {twilioPhoneNumber ? "✓ Configured" : "✗ Not configured"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isMobile ? 'text-sm' : ''}>SMS Integration:</span>
                  <span className={`${twilioAccountSid && twilioAuthToken && twilioPhoneNumber ? "text-green-600" : "text-orange-600"} ${isMobile ? 'text-sm' : ''}`}>
                    {twilioAccountSid && twilioAuthToken && twilioPhoneNumber ? "✓ Ready" : "⚠ Incomplete"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className={isMobile ? 'pb-3' : ''}>
          <CardTitle className={isMobile ? 'text-base' : ''}>Admin Role Management</CardTitle>
          <CardDescription className={isMobile ? 'text-sm' : ''}>
            Manage admin roles and access
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile ? 'pt-0 space-y-3' : 'space-y-4'}>
          <div className="space-y-2">
            <Label htmlFor="admin-phone-number" className={isMobile ? 'text-sm' : ''}>Admin Phone Number</Label>
            <Input
              id="admin-phone-number"
              type="text"
              placeholder="Enter admin phone number"
              value={adminPhoneNumber}
              onChange={(e) => setAdminPhoneNumber(e.target.value)}
              className={isMobile ? 'text-sm' : ''}
            />
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
              Enter the phone number of the admin to check or grant access
            </p>
          </div>

                     <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
             <Button 
               onClick={checkAdminRoles}
               variant="outline"
               disabled={isCheckingRoles}
               className={isMobile ? 'w-full' : 'flex-1'}
               size={isMobile ? "sm" : "default"}
             >
               <RefreshCw className={`w-4 h-4 mr-2 ${isCheckingRoles ? 'animate-spin' : ''}`} />
               Check All Roles
             </Button>
             
             <Button 
               onClick={grantAdminAccess}
               disabled={isGrantingAccess || !adminPhoneNumber.trim()}
               className={isMobile ? 'w-full' : 'flex-1'}
               size={isMobile ? "sm" : "default"}
             >
               <Shield className={`w-4 h-4 mr-2 ${isGrantingAccess ? 'animate-spin' : ''}`} />
               Grant Admin Access
             </Button>
           </div>

           {adminRoleChecks.length > 0 && (
             <Alert>
               <Shield className="h-4 w-4" />
               <AlertDescription>
                 <div className="space-y-2">
                   <div className="flex justify-between items-center">
                     <strong>Total Users: {adminRoleChecks.length}</strong>
                     <strong>Admins: {adminRoleChecks.filter(u => u.isAdmin).length}</strong>
                   </div>
                   <div className={`space-y-1 max-h-${isMobile ? '32' : '40'} overflow-y-auto`}>
                     {adminRoleChecks.slice(0, 10).map((check) => (
                       <div key={check.phone} className="flex items-center justify-between text-sm">
                         <span className="truncate flex-1 mr-2">
                           {check.name} ({check.phone})
                         </span>
                         <Badge variant={check.isAdmin ? 'default' : 'secondary'} className="text-xs">
                           {check.currentRole}
                         </Badge>
                       </div>
                     ))}
                     {adminRoleChecks.length > 10 && (
                       <div className="text-sm text-muted-foreground text-center">
                         ...and {adminRoleChecks.length - 10} more users
                       </div>
                     )}
                   </div>
                 </div>
               </AlertDescription>
             </Alert>
           )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
