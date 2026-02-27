/**
 * Address formatting utilities
 * Converts address objects to readable formatted strings
 */

export interface AddressObject {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  postcode?: string;
  country?: string;
  // Legacy field support
  address1?: string;
  address2?: string;
  zip_code?: string;
}

export function formatAddress(address: any): string {
  if (!address) {
    return 'No address provided';
  }

  // Handle string addresses (JSON parsing)
  let addr = address;
  if (typeof address === 'string') {
    try {
      addr = JSON.parse(address);
    } catch {
      return address || 'Invalid address format';
    }
  }

  // Handle all possible field name variations (rental_orders + queue_orders)
  const addressParts = [
    // Address line 1 variations
    addr.address_line1 || addr.address1 || addr.line1,
    // Address line 2 variations  
    addr.address_line2 || addr.address2 || addr.apartment || addr.line2,
    addr.city,
    addr.state,
    // Postal code variations
    addr.postal_code || addr.postcode || addr.zip_code || addr.pincode
  ].filter(Boolean);

  return addressParts.length > 0 ? addressParts.join(', ') : 'No address available';
}

function formatAddressObject(addr: AddressObject): string {
  const parts = [
    addr.address_line1 || addr.address1,
    addr.address_line2 || addr.address2,
    addr.city,
    addr.state,
    addr.postal_code || addr.postcode || addr.zip_code
  ].filter(Boolean);

  return parts.join(', ');
}

export function formatAddressShort(address: any): string {
  if (!address) {
    return 'No address';
  }

  // Handle string addresses (JSON parsing)
  let addr = address;
  if (typeof address === 'string') {
    try {
      addr = JSON.parse(address);
    } catch {
      return address || 'Invalid address format';
    }
  }

  // For short format, include first line, city and postcode (handle all variations)
  const parts = [
    addr.address_line1 || addr.address1 || addr.line1,
    addr.city,
    addr.postal_code || addr.postcode || addr.zip_code || addr.pincode
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'No address';
}

export function formatFullAddress(address: any): string {
  if (!address) {
    return 'No address provided';
  }

  // Handle string addresses (JSON parsing)
  let addr = address;
  if (typeof address === 'string') {
    try {
      addr = JSON.parse(address);
    } catch {
      return address || 'Invalid address format';
    }
  }

  const parts = [
    addr.address_line1 || addr.address1 || addr.line1,
    addr.address_line2 || addr.address2 || addr.apartment || addr.line2,
    addr.city,
    addr.state,
    addr.postal_code || addr.postcode || addr.zip_code || addr.pincode,
    addr.country || 'India'
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Get main address parts for display
 */
export function getAddressParts(address: any): {
  mainAddress: string;
  location: string;
} {
  if (!address) return { mainAddress: 'No address', location: '' };
  
  let addr: AddressObject;
  
  // Parse if it's a string
  if (typeof address === 'string') {
    try {
      addr = JSON.parse(address);
    } catch {
      return { mainAddress: address || 'No address', location: '' };
    }
  } else {
    addr = address;
  }
  
  // Main address (street address) - handle all field variations
  const mainParts: string[] = [];
  const address1 = addr.address1?.trim() || addr.address_line1?.trim() || (addr as any).line1?.trim();
  const address2 = addr.address2?.trim() || addr.address_line2?.trim() || (addr as any).apartment?.trim() || (addr as any).line2?.trim();
  
  if (address1) mainParts.push(address1);
  if (address2) mainParts.push(address2);
  if ((addr as any).landmark?.trim()) mainParts.push(`Near ${(addr as any).landmark.trim()}`);
  
  // Location (city, state, pincode)
  const locationParts: string[] = [];
  if (addr.city?.trim()) locationParts.push(addr.city.trim());
  if (addr.state?.trim()) locationParts.push(addr.state.trim());
  
  // Handle all postal code variations (rental_orders + queue_orders)
  const postalCode = (addr as any).postalCode?.trim() || 
                    addr.postcode?.trim() || 
                    addr.postal_code?.trim() || 
                    (addr as any).pincode?.trim() ||
                    (addr as any).zip_code?.trim();
  if (postalCode) locationParts.push(postalCode);
  
  return {
    mainAddress: mainParts.join(', ') || 'No address',
    location: locationParts.join(', ')
  };
} 