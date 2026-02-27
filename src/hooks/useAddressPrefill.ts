import { useState, useEffect } from 'react';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { toast } from 'sonner';

export interface AddressData {
  first_name: string;
  last_name: string;
  address_line1: string;
  apartment: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  plus_code?: string | null;
}

export interface UseAddressPrefillReturn {
  addressData: AddressData;
  setAddressData: React.Dispatch<React.SetStateAction<AddressData>>;
  isLoadingAddress: boolean;
  hasPrefilledAddress: boolean;
  refreshAddress: () => Promise<void>;
}

/**
 * Hook for prefilling customer addresses in order flows
 * Automatically loads and prefills saved addresses for returning customers
 */
export const useAddressPrefill = (
  enablePrefill: boolean = true,
  showToastMessages: boolean = true
): UseAddressPrefillReturn => {
  const { user } = useCustomAuth();
  
  const [addressData, setAddressData] = useState<AddressData>({
    first_name: '',
    last_name: '',
    address_line1: '',
    apartment: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'India',
    latitude: null,
    longitude: null,
    plus_code: null,
  });
  
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [hasPrefilledAddress, setHasPrefilledAddress] = useState(false);

  const loadCustomerAddress = async () => {
    if (!user?.id || !enablePrefill) {
      setIsLoadingAddress(false);
      return;
    }
    
    setIsLoadingAddress(true);
    setHasPrefilledAddress(false);
    
    try {
      console.log('📍 [useAddressPrefill] Loading saved addresses for user:', user.id);
      
      // Import AddressService dynamically to avoid circular imports
      const { AddressService } = await import('@/services/addressService');
      const defaultAddress = await AddressService.getDefaultAddress(user.id);
      
      if (defaultAddress) {
        console.log('✅ [useAddressPrefill] Found address, prefilling:', {
          addressId: defaultAddress.id,
          city: defaultAddress.city,
          isDefault: defaultAddress.is_default,
          source: defaultAddress.id === 'profile-address' ? 'profile' : 'saved_address'
        });
        
        // Prefill the address data
        setAddressData({
          first_name: defaultAddress.first_name || user.first_name || '',
          last_name: defaultAddress.last_name || user.last_name || '',
          address_line1: defaultAddress.address_line1 || '',
          apartment: defaultAddress.address_line2 || '',
          city: defaultAddress.city || '',
          state: defaultAddress.state || '',
          zip_code: defaultAddress.pincode || '',
          country: defaultAddress.country || 'India',
          latitude: defaultAddress.latitude || null,
          longitude: defaultAddress.longitude || null,
          plus_code: defaultAddress.plus_code || null,
        });
        
        setHasPrefilledAddress(true);
        
        // Show appropriate toast message
        if (showToastMessages) {
          if (defaultAddress.id === 'profile-address') {
            toast.info('📍 Address prefilled from your profile');
          } else {
            toast.success('📍 Address prefilled from your saved addresses');
          }
        }
        
      } else {
        console.log('📍 [useAddressPrefill] No saved addresses found for user');
        
        // Try to prefill at least name from user profile
        if (user.first_name || user.last_name) {
          setAddressData(prev => ({
            ...prev,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
          }));
          
          if (showToastMessages && (user.first_name || user.last_name)) {
            toast.info('📝 Name prefilled from your account');
          }
        }
      }
      
    } catch (error) {
      console.error('❌ [useAddressPrefill] Error loading saved addresses:', error);
      
      // Fallback: Try to prefill name at least
      if (user.first_name || user.last_name) {
        setAddressData(prev => ({
          ...prev,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
        }));
      }
      
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Load address when user changes
  useEffect(() => {
    loadCustomerAddress();
  }, [user?.id, enablePrefill]);

  const refreshAddress = async () => {
    await loadCustomerAddress();
  };

  return {
    addressData,
    setAddressData,
    isLoadingAddress,
    hasPrefilledAddress,
    refreshAddress
  };
};

/**
 * Utility function to check if address is complete
 */
export const isAddressComplete = (addr: AddressData): boolean => {
  return !!(
    addr?.first_name?.trim() && 
    addr?.last_name?.trim() && 
    addr?.address_line1?.trim() && 
    addr?.apartment?.trim() && 
    addr?.city?.trim() && 
    addr?.state?.trim() && 
    addr?.zip_code?.trim()
  );
};

/**
 * Utility function to standardize address for backend compatibility
 */
export const standardizeShippingAddress = (addr: AddressData, userProfile?: any) => {
  return {
    first_name: addr.first_name?.trim() || '',
    last_name: addr.last_name?.trim() || '',
    phone: userProfile?.phone || '',
    email: userProfile?.email || '',
    address_line1: addr.address_line1?.trim() || '',
    address_line2: addr.apartment?.trim() || '',
    city: addr.city?.trim() || '',
    state: addr.state?.trim() || '',
    postcode: addr.zip_code?.trim() || '',
    country: addr.country || 'India',
    latitude: addr.latitude,
    longitude: addr.longitude,
    plus_code: addr.plus_code,
  };
};


