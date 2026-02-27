/**
 * Enhanced Address Formatter - Handles all ToyFlix address field variations
 * This fixes the issue where complete addresses aren't showing in orders
 */

export interface EnhancedAddressObject {
  // Primary address fields
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  
  // Postal code variations
  postal_code?: string;
  postcode?: string;
  zip_code?: string;
  
  // Legacy field support
  address1?: string;
  address2?: string;
  apartment?: string;
  
  // Additional fields
  country?: string;
  landmark?: string;
  
  // Customer info (sometimes stored in address object)
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
}

/**
 * Enhanced formatAddress function that handles all field variations
 */
export function formatAddressEnhanced(address: any): string {
  if (!address) {
    return 'No address provided';
  }

  // Handle string addresses (JSON parsing)
  let addr: EnhancedAddressObject;
  if (typeof address === 'string') {
    try {
      addr = JSON.parse(address);
    } catch {
      return address || 'Invalid address format';
    }
  } else {
    addr = address;
  }

  // Get address line 1 (try all possible field names)
  const addressLine1 = addr.address_line1?.trim() || 
                      addr.address1?.trim() || 
                      addr.address_line_1?.trim();
  
  // Get address line 2 (try all possible field names)
  const addressLine2 = addr.address_line2?.trim() || 
                      addr.address2?.trim() || 
                      addr.apartment?.trim() ||
                      addr.address_line_2?.trim();
  
  // Get postal code (try all possible field names)
  const postalCode = addr.postal_code?.trim() || 
                    addr.postcode?.trim() || 
                    addr.zip_code?.trim();

  // Build address parts
  const addressParts: string[] = [];
  
  if (addressLine1) addressParts.push(addressLine1);
  if (addressLine2) addressParts.push(addressLine2);
  if (addr.landmark?.trim()) addressParts.push(`Near ${addr.landmark.trim()}`);
  if (addr.city?.trim()) addressParts.push(addr.city.trim());
  if (addr.state?.trim()) addressParts.push(addr.state.trim());
  if (postalCode) addressParts.push(postalCode);

  const result = addressParts.length > 0 ? addressParts.join(', ') : 'Incomplete address data';
  
  // Log for debugging
  console.log('🏠 Address formatting:', { 
    input: addr, 
    result, 
    foundFields: {
      addressLine1: !!addressLine1,
      addressLine2: !!addressLine2,
      city: !!addr.city,
      state: !!addr.state,
      postalCode: !!postalCode
    }
  });
  
  return result;
}

/**
 * Get structured address parts for detailed display
 */
export function getAddressPartsEnhanced(address: any): {
  name: string;
  streetAddress: string;
  location: string;
  fullAddress: string;
} {
  if (!address) {
    return { 
      name: 'Unknown Customer', 
      streetAddress: 'No address provided', 
      location: '', 
      fullAddress: 'No address provided' 
    };
  }

  // Handle string addresses
  let addr: EnhancedAddressObject;
  if (typeof address === 'string') {
    try {
      addr = JSON.parse(address);
    } catch {
      return { 
        name: 'Unknown Customer', 
        streetAddress: address, 
        location: '', 
        fullAddress: address 
      };
    }
  } else {
    addr = address;
  }

  // Customer name
  const name = addr.first_name && addr.last_name 
    ? `${addr.first_name} ${addr.last_name}`.trim()
    : addr.first_name || addr.last_name || 'Unknown Customer';

  // Street address (address lines + landmark)
  const streetParts: string[] = [];
  const addressLine1 = addr.address_line1?.trim() || addr.address1?.trim();
  const addressLine2 = addr.address_line2?.trim() || addr.address2?.trim() || addr.apartment?.trim();
  
  if (addressLine1) streetParts.push(addressLine1);
  if (addressLine2) streetParts.push(addressLine2);
  if (addr.landmark?.trim()) streetParts.push(`Near ${addr.landmark.trim()}`);
  
  const streetAddress = streetParts.length > 0 ? streetParts.join(', ') : 'No street address';

  // Location (city, state, postal code)
  const locationParts: string[] = [];
  if (addr.city?.trim()) locationParts.push(addr.city.trim());
  if (addr.state?.trim()) locationParts.push(addr.state.trim());
  
  const postalCode = addr.postal_code?.trim() || addr.postcode?.trim() || addr.zip_code?.trim();
  if (postalCode) locationParts.push(postalCode);
  
  const location = locationParts.join(', ');

  // Full address
  const fullParts = [...streetParts, ...locationParts];
  if (addr.country?.trim() && addr.country !== 'India') {
    fullParts.push(addr.country.trim());
  }
  const fullAddress = fullParts.length > 0 ? fullParts.join(', ') : 'Incomplete address';

  return { name, streetAddress, location, fullAddress };
}

/**
 * Format address for admin display with fallbacks
 */
export function formatAddressForAdmin(address: any, userProfile?: any): string {
  // Try order address first
  const orderAddress = formatAddressEnhanced(address);
  if (orderAddress && orderAddress !== 'No address provided' && orderAddress !== 'Incomplete address data') {
    return orderAddress;
  }

  // Fallback to user profile address
  if (userProfile) {
    const profileAddress = formatAddressEnhanced({
      address_line1: userProfile.address_line1,
      address_line2: userProfile.address_line2,
      city: userProfile.city,
      state: userProfile.state,
      zip_code: userProfile.zip_code
    });
    
    if (profileAddress && profileAddress !== 'No address provided' && profileAddress !== 'Incomplete address data') {
      return `${profileAddress} (from profile)`;
    }
  }

  return 'Address not available';
}
