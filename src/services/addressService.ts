import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CustomerAddress {
  id: string;
  label: string;
  first_name: string;
  last_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  plus_code?: string;
  is_default: boolean;
  delivery_instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface AddressFormData {
  label: string;
  first_name: string;
  last_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  plus_code?: string;
  delivery_instructions?: string;
  is_default?: boolean;
}

export class AddressService {
  /**
   * Get all saved addresses for a customer
   */
  static async getCustomerAddresses(userId: string): Promise<CustomerAddress[]> {
    try {
      console.log('📍 Fetching addresses for user:', userId);

      // First, try to get addresses from customer_addresses table (if it exists)
      const { data: customerAddresses, error: customerAddressError } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', userId)
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false });

      if (!customerAddressError && customerAddresses && customerAddresses.length > 0) {
        console.log('✅ Found addresses in customer_addresses table:', customerAddresses.length);
        return customerAddresses.map(addr => ({
          id: addr.id,
          label: addr.address_type || 'Home',
          first_name: addr.first_name || '',
          last_name: addr.last_name || '',
          address_line1: addr.address_line_1 || '',
          address_line2: addr.address_line_2 || '',
          city: addr.city || '',
          state: addr.state || '',
          pincode: addr.postal_code || '',
          country: addr.country || 'India',
          latitude: addr.latitude,
          longitude: addr.longitude,
          plus_code: undefined,
          is_default: addr.is_default || false,
          delivery_instructions: addr.delivery_instructions || '',
          created_at: addr.created_at,
          updated_at: addr.updated_at
        }));
      }

      // Fallback: Get addresses from user profile and previous orders
      console.log('📍 Fetching addresses from user profile and orders...');
      
      // Get user profile address
      const { data: userProfile, error: profileError } = await supabase
        .from('custom_users')
        .select('*')
        .eq('id', userId)
        .single();

      // Get unique addresses from previous orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('shipping_address')
        .eq('user_id', userId)
        .not('shipping_address', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      const addresses: CustomerAddress[] = [];

      // Add profile address if available
      if (!profileError && userProfile && userProfile.address_line1) {
        addresses.push({
          id: 'profile-address',
          label: 'Profile Address',
          first_name: userProfile.first_name || '',
          last_name: userProfile.last_name || '',
          address_line1: userProfile.address_line1,
          address_line2: userProfile.address_line2 || '',
          city: userProfile.city || '',
          state: userProfile.state || '',
          pincode: userProfile.zip_code || userProfile.pincode || '',
          country: 'India',
          latitude: userProfile.latitude,
          longitude: userProfile.longitude,
          is_default: true,
          created_at: userProfile.created_at,
          updated_at: userProfile.updated_at
        });
      }

      // Add unique addresses from orders
      if (!ordersError && orders) {
        const uniqueAddresses = new Map<string, any>();
        
        orders.forEach(order => {
          if (order.shipping_address) {
            const addr = order.shipping_address;
            const key = `${addr.address_line1}-${addr.city}-${addr.postcode || addr.zip_code}`;
            
            if (!uniqueAddresses.has(key) && addr.address_line1) {
              uniqueAddresses.set(key, {
                id: `order-address-${key.replace(/[^a-zA-Z0-9]/g, '-')}`,
                label: 'Previous Order Address',
                first_name: addr.first_name || '',
                last_name: addr.last_name || '',
                address_line1: addr.address_line1,
                address_line2: addr.address_line2 || addr.apartment || '',
                city: addr.city || '',
                state: addr.state || '',
                pincode: addr.postcode || addr.zip_code || '',
                country: addr.country || 'India',
                latitude: addr.latitude,
                longitude: addr.longitude,
                plus_code: addr.plus_code,
                is_default: false,
                delivery_instructions: addr.delivery_instructions || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
          }
        });

        addresses.push(...Array.from(uniqueAddresses.values()));
      }

      console.log('✅ Retrieved addresses:', addresses.length);
      return addresses;

    } catch (error) {
      console.error('❌ Error fetching customer addresses:', error);
      toast.error('Failed to load saved addresses');
      return [];
    }
  }

  /**
   * Get default address for a customer (for prefilling forms)
   */
  static async getDefaultAddress(userId: string): Promise<CustomerAddress | null> {
    try {
      console.log('📍 Fetching default address for user:', userId);

      // First, try to get default address from customer_addresses table
      const { data: defaultAddress, error: defaultAddressError } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', userId)
        .eq('is_default', true)
        .single();

      if (!defaultAddressError && defaultAddress) {
        console.log('✅ Found default address in customer_addresses table');
        return {
          id: defaultAddress.id,
          label: defaultAddress.address_type || 'Home',
          first_name: defaultAddress.first_name || '',
          last_name: defaultAddress.last_name || '',
          address_line1: defaultAddress.address_line_1 || '',
          address_line2: defaultAddress.address_line_2 || '',
          city: defaultAddress.city || '',
          state: defaultAddress.state || '',
          pincode: defaultAddress.postal_code || '',
          country: defaultAddress.country || 'India',
          latitude: defaultAddress.latitude,
          longitude: defaultAddress.longitude,
          plus_code: defaultAddress.plus_code,
          is_default: true,
          delivery_instructions: defaultAddress.delivery_instructions || '',
          created_at: defaultAddress.created_at,
          updated_at: defaultAddress.updated_at
        };
      }

      // Fallback: Get most recent address if no default
      const addresses = await this.getCustomerAddresses(userId);
      if (addresses && addresses.length > 0) {
        console.log('✅ Using most recent address as default');
        return addresses[0];
      }

      // Final fallback: Get address from user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('custom_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profileError && userProfile && userProfile.address_line1) {
        console.log('✅ Using user profile address as default');
        return {
          id: 'profile-address',
          label: 'Profile Address',
          first_name: userProfile.first_name || '',
          last_name: userProfile.last_name || '',
          address_line1: userProfile.address_line1 || '',
          address_line2: userProfile.address_line2 || '',
          city: userProfile.city || '',
          state: userProfile.state || '',
          pincode: userProfile.zip_code || '',
          country: 'India',
          latitude: userProfile.latitude,
          longitude: userProfile.longitude,
          plus_code: undefined,
          is_default: false,
          delivery_instructions: '',
          created_at: userProfile.created_at,
          updated_at: userProfile.updated_at
        };
      }

      console.log('📍 No address data found for user');
      return null;

    } catch (error) {
      console.error('❌ Error fetching default address:', error);
      return null;
    }
  }

  /**
   * Save a new address for a customer
   */
  static async saveCustomerAddress(userId: string, addressData: AddressFormData): Promise<{ success: boolean; addressId?: string; message?: string }> {
    try {
      console.log('💾 Saving new address for user:', userId);

      // Try to save to customer_addresses table first (if it exists)
      const { data: newAddress, error: saveError } = await supabase
        .from('customer_addresses')
        .insert({
          customer_id: userId,
          address_type: addressData.label || 'Home',
          first_name: addressData.first_name,
          last_name: addressData.last_name,
          address_line_1: addressData.address_line1,
          address_line_2: addressData.address_line2 || '',
          city: addressData.city,
          state: addressData.state,
          postal_code: addressData.pincode,
          country: addressData.country || 'India',
          latitude: addressData.latitude,
          longitude: addressData.longitude,
          is_default: addressData.is_default || false,
          delivery_instructions: addressData.delivery_instructions || ''
        })
        .select()
        .single();

      if (!saveError && newAddress) {
        console.log('✅ Address saved to customer_addresses table');
        return {
          success: true,
          addressId: newAddress.id,
          message: 'Address saved successfully'
        };
      }

      // Fallback: Update user profile with the address
      console.log('📍 Fallback: Updating user profile with address');
      const { error: profileUpdateError } = await supabase
        .from('custom_users')
        .update({
          first_name: addressData.first_name,
          last_name: addressData.last_name,
          address_line1: addressData.address_line1,
          address_line2: addressData.address_line2,
          city: addressData.city,
          state: addressData.state,
          zip_code: addressData.pincode,
          latitude: addressData.latitude,
          longitude: addressData.longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileUpdateError) {
        throw profileUpdateError;
      }

      console.log('✅ Address saved to user profile');
      return {
        success: true,
        addressId: 'profile-address',
        message: 'Address saved to profile successfully'
      };

    } catch (error) {
      console.error('❌ Error saving address:', error);
      return {
        success: false,
        message: 'Failed to save address'
      };
    }
  }

  /**
   * Update an existing address
   */
  static async updateCustomerAddress(addressId: string, addressData: Partial<AddressFormData>): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('✏️ Updating address:', addressId);

      if (addressId === 'profile-address') {
        // Handle profile address update
        const { error } = await supabase
          .from('custom_users')
          .update({
            first_name: addressData.first_name,
            last_name: addressData.last_name,
            address_line1: addressData.address_line1,
            address_line2: addressData.address_line2,
            city: addressData.city,
            state: addressData.state,
            zip_code: addressData.pincode,
            latitude: addressData.latitude,
            longitude: addressData.longitude,
            updated_at: new Date().toISOString()
          })
          .eq('id', addressId.replace('profile-address-', ''));

        if (error) throw error;
      } else {
        // Handle customer_addresses table update
        const { error } = await supabase
          .from('customer_addresses')
          .update({
            address_type: addressData.label,
            first_name: addressData.first_name,
            last_name: addressData.last_name,
            address_line_1: addressData.address_line1,
            address_line_2: addressData.address_line2,
            city: addressData.city,
            state: addressData.state,
            postal_code: addressData.pincode,
            country: addressData.country,
            latitude: addressData.latitude,
            longitude: addressData.longitude,
            is_default: addressData.is_default,
            delivery_instructions: addressData.delivery_instructions,
            updated_at: new Date().toISOString()
          })
          .eq('id', addressId);

        if (error) throw error;
      }

      console.log('✅ Address updated successfully');
      return {
        success: true,
        message: 'Address updated successfully'
      };

    } catch (error) {
      console.error('❌ Error updating address:', error);
      return {
        success: false,
        message: 'Failed to update address'
      };
    }
  }

  /**
   * Delete an address
   */
  static async deleteCustomerAddress(addressId: string): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('🗑️ Deleting address:', addressId);

      if (addressId.startsWith('profile-address') || addressId.startsWith('order-address')) {
        return {
          success: false,
          message: 'Cannot delete profile or order addresses'
        };
      }

      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      console.log('✅ Address deleted successfully');
      return {
        success: true,
        message: 'Address deleted successfully'
      };

    } catch (error) {
      console.error('❌ Error deleting address:', error);
      return {
        success: false,
        message: 'Failed to delete address'
      };
    }
  }

  /**
   * Set an address as default
   */
  static async setDefaultAddress(userId: string, addressId: string): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('⭐ Setting default address:', addressId);

      // First, unset all other addresses as default
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', userId);

      // Set the selected address as default
      const { error } = await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;

      console.log('✅ Default address set successfully');
      return {
        success: true,
        message: 'Default address updated'
      };

    } catch (error) {
      console.error('❌ Error setting default address:', error);
      return {
        success: false,
        message: 'Failed to set default address'
      };
    }
  }

  /**
   * Convert address to standardized shipping format
   */
  static standardizeAddress(address: CustomerAddress): any {
    return {
      first_name: address.first_name,
      last_name: address.last_name,
      phone: '', // Will be filled from user profile
      email: '', // Will be filled from user profile
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state: address.state,
      postcode: address.pincode,
      country: address.country,
      latitude: address.latitude,
      longitude: address.longitude,
      plus_code: address.plus_code,
      delivery_instructions: address.delivery_instructions
    };
  }
}
