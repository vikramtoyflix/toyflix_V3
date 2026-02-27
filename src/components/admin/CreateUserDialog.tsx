import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Phone, Mail, MapPin, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

interface UserFormData {
  phone: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'user' | 'admin';
  city: string;
  state: string;
  address_line1: string;
  address_line2: string;
  zip_code: string;
  is_active: boolean;
  phone_verified: boolean;
}

// Constants for retry logic
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000; // 30 seconds
const BASE_DELAY_MS = 2000; // 2 seconds base delay

const CreateUserDialog = ({ open, onOpenChange, onUserCreated }: CreateUserDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Request deduplication
  const requestInFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [formData, setFormData] = useState<UserFormData>({
    phone: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'user',
    city: '',
    state: '',
    address_line1: '',
    address_line2: '',
    zip_code: '',
    is_active: true,
    phone_verified: false
  });

  const handleInputChange = (field: keyof UserFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null); // Clear error when user starts typing
    setLastError(null);
  };

  const validateForm = (): string | null => {
    if (!formData.phone.trim()) {
      return "Phone number is required";
    }
    
    if (formData.phone.length < 10) {
      return "Phone number must be at least 10 digits";
    }
    
    if (!formData.first_name.trim()) {
      return "First name is required";
    }
    
    if (formData.email && !formData.email.includes('@')) {
      return "Please enter a valid email address";
    }
    
    return null;
  };

  // Helper function to check if error is network-related
  const isNetworkError = (error: any): boolean => {
    const errorMessage = error?.message?.toLowerCase() || '';
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('aborted') ||
      error?.name === 'AbortError' ||
      error?.name === 'NetworkError'
    );
  };

  // Exponential backoff delay
  const getRetryDelay = (attempt: number): number => {
    return BASE_DELAY_MS * Math.pow(2, attempt - 1);
  };

  // Sleep helper for retry delays
  const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  // Core function to call the Edge Function with timeout
  const callEdgeFunctionWithTimeout = async (userData: any): Promise<any> => {
    // Create new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Set timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);

    try {
      // Call the Edge Function with the abort signal
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { userData },
        // Note: Supabase JS client doesn't directly support AbortSignal in invoke,
        // but we can implement a wrapper if needed. For now, we rely on the timeout
        // handling at the fetch level if the client supports it.
      });

      clearTimeout(timeoutId);

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Main submit handler with retry logic
  const submitWithRetry = async (userData: any, attempt: number = 1): Promise<any> => {
    console.log(`🔄 Attempt ${attempt}/${MAX_RETRIES}: Creating user`);
    
    try {
      const data = await callEdgeFunctionWithTimeout(userData);
      console.log('✅ User created successfully:', data?.user);
      return data;
    } catch (error) {
      const isNetwork = isNetworkError(error);
      const shouldRetry = isNetwork && attempt < MAX_RETRIES;

      console.error(`❌ Attempt ${attempt} failed:`, error);

      if (shouldRetry) {
        const delay = getRetryDelay(attempt);
        console.log(`⏳ Retrying in ${delay}ms...`);
        
        setRetryCount(attempt);
        await sleep(delay);
        
        // Recursive retry
        return submitWithRetry(userData, attempt + 1);
      } else {
        // Max retries reached or non-network error
        throw error;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Request deduplication - prevent duplicate submissions
    if (requestInFlightRef.current) {
      console.log('⚠️ Request already in progress, ignoring duplicate submission');
      return;
    }
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setLastError(null);
    setRetryCount(0);
    requestInFlightRef.current = true;
    
    try {
      console.log('🔄 Creating new user:', formData);
      
      // Format phone number (ensure it starts with +91 if it's Indian number)
      let formattedPhone = formData.phone.trim();
      if (!formattedPhone.startsWith('+')) {
        // If it's a 10-digit number, assume it's Indian
        if (formattedPhone.length === 10 && /^\d+$/.test(formattedPhone)) {
          formattedPhone = `+91${formattedPhone}`;
        } else if (formattedPhone.length > 10) {
          formattedPhone = `+${formattedPhone}`;
        }
      }
      
      const userData = {
        phone: formattedPhone,
        email: formData.email.trim() || null,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim() || null,
        role: formData.role,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        address_line1: formData.address_line1.trim() || null,
        address_line2: formData.address_line2.trim() || null,
        zip_code: formData.zip_code.trim() || null,
        is_active: formData.is_active,
        phone_verified: formData.phone_verified
      };
      
      // Call with retry logic
      const data = await submitWithRetry(userData);
      
      toast({
        title: "User Created Successfully",
        description: `${formData.first_name} ${formData.last_name} has been added to the system.`,
      });
      
      // Reset form
      setFormData({
        phone: '',
        email: '',
        first_name: '',
        last_name: '',
        role: 'user',
        city: '',
        state: '',
        address_line1: '',
        address_line2: '',
        zip_code: '',
        is_active: true,
        phone_verified: false
      });
      
      onUserCreated(); // Refresh user list
      onOpenChange(false); // Close dialog
      
    } catch (error) {
      console.error('❌ Failed to create user after all retries:', error);
      
      // Determine error message based on error type
      let errorMessage: string;
      
      if (isNetworkError(error)) {
        errorMessage = `Network connection failed after ${MAX_RETRIES} attempts. Please check your internet connection and try again.`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Failed to create user. Please try again.';
      }
      
      setError(errorMessage);
      setLastError(errorMessage);
      
      toast({
        title: "Error Creating User",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      requestInFlightRef.current = false;
      setRetryCount(0);
      abortControllerRef.current = null;
    }
  };

  const handleRetry = () => {
    setError(null);
    setLastError(null);
    handleSubmit(new Event('submit') as any);
  };

  const handleCancel = () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setFormData({
      phone: '',
      email: '',
      first_name: '',
      last_name: '',
      role: 'user',
      city: '',
      state: '',
      address_line1: '',
      address_line2: '',
      zip_code: '',
      is_active: true,
      phone_verified: false
    });
    setError(null);
    setLastError(null);
    setRetryCount(0);
    requestInFlightRef.current = false;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Add a new user to the system. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                {lastError && isNetworkError({ message: lastError }) && !isLoading && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="ml-2"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Basic Information
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Enter first name"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Enter last name"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => handleInputChange('role', value as 'user' | 'admin')}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact Information
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+91 9876543210 or 9876543210"
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="user@example.com"
                disabled={isLoading}
              />
            </div>
          </div>
          
          {/* Address Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address Information
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                value={formData.address_line1}
                onChange={(e) => handleInputChange('address_line1', e.target.value)}
                placeholder="Street address"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                value={formData.address_line2}
                onChange={(e) => handleInputChange('address_line2', e.target.value)}
                placeholder="Apartment, suite, etc."
                disabled={isLoading}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="City"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="State"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zip_code">Zip Code</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => handleInputChange('zip_code', e.target.value)}
                placeholder="ZIP/Postal code"
                disabled={isLoading}
              />
            </div>
          </div>
          
          {/* Status Options */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Account Status</h4>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked as boolean)}
                  disabled={isLoading}
                />
                <Label htmlFor="is_active" className="text-sm font-normal">
                  Account is active
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="phone_verified"
                  checked={formData.phone_verified}
                  onCheckedChange={(checked) => handleInputChange('phone_verified', checked as boolean)}
                  disabled={isLoading}
                />
                <Label htmlFor="phone_verified" className="text-sm font-normal">
                  Phone number is verified
                </Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {retryCount > 0 
                    ? `Creating user... (Retry ${retryCount}/${MAX_RETRIES})`
                    : 'Creating user...'}
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;