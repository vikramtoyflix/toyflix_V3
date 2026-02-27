/**
 * Utility functions for validating service delivery areas
 * Currently supports only Bangalore, India
 * Extended with day-wise pickup scheduling functionality
 */

// Comprehensive list of Bangalore pincodes (2024 updated)
const BANGALORE_PINCODES = new Set([
  // Central Bangalore
  '560001', '560002', '560003', '560004', '560005', '560006', '560007', '560008', '560009',
  '560010', '560011', '560012', '560013', '560014', '560015', '560016', '560017', '560018', '560019',
  '560020', '560021', '560022', '560023', '560024', '560025', '560026', '560027', '560028', '560029',
  
  // South Bangalore
  '560030', '560031', '560032', '560033', '560034', '560035', '560036', '560037', '560038', '560039',
  '560040', '560041', '560042', '560043', '560044', '560045', '560046', '560047', '560048', '560049',
  '560050', '560051', '560052', '560053', '560054', '560055', '560056', '560057', '560058', '560059',
  
  // East Bangalore
  '560060', '560061', '560062', '560063', '560064', '560065', '560066', '560067', '560068', '560069',
  '560070', '560071', '560072', '560073', '560074', '560075', '560076', '560077', '560078', '560079',
  '560080', '560081', '560082', '560083', '560084', '560085', '560086', '560087', '560088', '560089',
  
  // West Bangalore
  '560090', '560091', '560092', '560093', '560094', '560095', '560096', '560097', '560098', '560099',
  
  // North Bangalore
  '560010', '560013', '560020', '560021', '560022', '560024', '560025', '560032', '560045', '560064',
  '560065', '560066', '560077', '560091', '560092', '560094', '560097',
  
  // Extended Bangalore (BBMP areas)
  '560100', '560102', '560103', '560104', '560105', '560106', '560107', '560108', '560109',
  '560110', '560111', '560112', '560113', '560114', '560115', '560116', '560117', '560118',
  '560125', '560127', '560129', '560130',
  
  // Whitefield and IT Corridor
  '560037', '560066', '560067', '560087', '560103', '560125', '560048', '560049', '560093',
  
  // Electronic City
  '560100', '560068', '560099',
  
  // Sarjapur Road
  '560034', '560035', '560087', '560102', '560103',
  
  // Bannerghatta Road
  '560029', '560034', '560076', '560083',
  
  // Outer Ring Road areas
  '560037', '560066', '560067', '560068', '560087', '560093', '560103', '560125'
]);

export interface PincodeValidationResult {
  isValid: boolean;
  isServiceable: boolean;
  area?: string;
  message: string;
}

export interface PincodePickupInfo {
  isValid: boolean;
  isServiceable: boolean;
  area?: string;
  pickupDay?: string;
  deliveryDay?: string;
  zone?: string;
  message: string;
  maxPickupsPerDay?: number;
  estimatedTravelTime?: number;
}

export interface PincodeScheduleEntry {
  id: string;
  pincode: string;
  area_name: string;
  zone: string;
  pickup_day: string;
  delivery_day: string;
  max_pickups_per_day: number;
  min_pickups_per_day: number;
  current_capacity_used: number;
  is_active: boolean;
  estimated_travel_time_minutes: number;
  pickup_window_start: string;
  pickup_window_end: string;
}

export type PickupDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DayWisePincodeMapping {
  [key: string]: PickupDay; // pincode -> pickup day
}

/**
 * Validate if a pincode is a valid Bangalore pincode where we deliver
 */
export function validateBangalorePincode(pincode: string): PincodeValidationResult {
  // Clean the pincode
  const cleanPincode = pincode.trim().replace(/\s+/g, '');
  
  // Basic format validation
  if (!cleanPincode) {
    return {
      isValid: false,
      isServiceable: false,
      message: 'Please enter your pincode'
    };
  }
  
  if (!/^\d{6}$/.test(cleanPincode)) {
    return {
      isValid: false,
      isServiceable: false,
      message: 'Please enter a valid 6-digit pincode'
    };
  }
  
  // Check if it's a Bangalore pincode
  if (BANGALORE_PINCODES.has(cleanPincode)) {
    return {
      isValid: true,
      isServiceable: true,
      area: getBangaloreAreaName(cleanPincode),
      message: 'Great! We deliver to your area in Bangalore'
    };
  }
  
  // Check if it's a Karnataka pincode (starts with 5)
  if (cleanPincode.startsWith('5')) {
    return {
      isValid: true,
      isServiceable: false,
      message: 'Sorry, we currently deliver only within Bangalore city limits. We\'re expanding soon!'
    };
  }
  
  // Not a Karnataka pincode
  return {
    isValid: true,
    isServiceable: false,
    message: 'Sorry, we currently deliver only in Bangalore, India. Stay tuned for expansion!'
  };
}

/**
 * Get area name for known Bangalore pincodes
 */
function getBangaloreAreaName(pincode: string): string {
  const areaMap: Record<string, string> = {
    '560001': 'Bangalore GPO',
    '560002': 'Bangalore City',
    '560003': 'Malleshwaram',
    '560004': 'Bangalore Cantonment',
    '560005': 'Seshadripuram',
    '560006': 'Rajajinagar',
    '560007': 'Chamarajpet',
    '560008': 'Chickpet',
    '560009': 'Bangalore Fort',
    '560010': 'Yeshwantpur',
    '560011': 'Shivajinagar',
    '560012': 'High Grounds',
    '560013': 'Sadashivanagar',
    '560020': 'Rajajinagar',
    '560021': 'Yeshwantpur',
    '560025': 'Jalahalli',
    '560034': 'Bommanahalli',
    '560037': 'Whitefield',
    '560040': 'Jayanagar',
    '560041': 'Jayanagar',
    '560042': 'Jayanagar',
    '560043': 'Jayanagar',
    '560047': 'Padmanabhanagar',
    '560048': 'ITPL',
    '560049': 'ITPL',
    '560050': 'Bilekahalli',
    '560066': 'Whitefield',
    '560067': 'Whitefield',
    '560068': 'Electronic City',
    '560076': 'BTM Layout',
    '560078': 'Koramangala',
    '560080': 'Indiranagar',
    '560087': 'Varthur',
    '560093': 'Jakkur',
    '560100': 'Electronic City',
    '560103': 'Sarjapur'
  };
  
  return areaMap[pincode] || 'Bangalore';
}

/**
 * Format pincode display
 */
export function formatPincode(pincode: string): string {
  const clean = pincode.replace(/\D/g, '');
  return clean.slice(0, 6);
}

/**
 * Get serviceable areas list for display
 */
export function getServiceableAreas(): string[] {
  return [
    'All Bangalore (BBMP) areas',
    'Central Bangalore - GPO, Shivajinagar, Malleshwaram',
    'South Bangalore - Jayanagar, BTM Layout, Koramangala',
    'East Bangalore - Whitefield, ITPL, Electronic City',
    'West Bangalore - Rajajinagar, Vijayanagar',
    'North Bangalore - Hebbal, Yeshwantpur, Jalahalli'
  ];
}

/**
 * Check if pincode looks like it might be Bangalore (for partial input)
 */
export function isPotentialBangalorePincode(partialPincode: string): boolean {
  const clean = partialPincode.replace(/\D/g, '');
  return clean.startsWith('560') || clean.startsWith('56') || clean.startsWith('5');
}

// ========================================
// PICKUP DAY MANAGEMENT FUNCTIONS
// ========================================

/**
 * Static fallback mapping for pickup days (matching WordPress system)
 * Used when database is not available or for initial setup
 */
export const STATIC_PICKUP_DAY_MAPPING: DayWisePincodeMapping = {
  // Monday - Central Bangalore
  '560002': 'monday', '560004': 'monday', '560011': 'monday', '560018': 'monday',
  '560001': 'monday', '560005': 'monday', '560012': 'monday', '560009': 'monday',
  
  // Tuesday - South Bangalore  
  '560041': 'tuesday', '560034': 'tuesday', '560047': 'tuesday', '560076': 'tuesday',
  '560040': 'tuesday', '560042': 'tuesday', '560043': 'tuesday', '560078': 'tuesday',
  '560029': 'tuesday', '560083': 'tuesday', '560050': 'tuesday',
  
  // Wednesday - East Bangalore
  '560037': 'wednesday', '560048': 'wednesday', '560066': 'wednesday', '560067': 'wednesday',
  '560049': 'wednesday', '560087': 'wednesday', '560068': 'wednesday', '560103': 'wednesday',
  '560100': 'wednesday', '560125': 'wednesday',
  
  // Thursday - West Bangalore
  '560020': 'thursday', '560010': 'thursday', '560022': 'thursday',
  '560006': 'thursday', '560021': 'thursday', '560091': 'thursday',
  
  // Friday - North Bangalore
  '560024': 'friday', '560077': 'friday', '560032': 'friday',
  '560013': 'friday', '560025': 'friday', '560064': 'friday',
  
  // Saturday - Extended Areas
  '560092': 'saturday', '560093': 'saturday', '560094': 'saturday',
  
  // Sunday - Backup/Overflow
  '560080': 'sunday', '560065': 'sunday'
};

/**
 * Get pickup day for a pincode (uses static mapping for now)
 * Database integration will be added in pickup service
 */
export function getPickupDayForPincode(pincode: string): PickupDay {
  const cleanPincode = pincode.trim().replace(/\s+/g, '');
  return STATIC_PICKUP_DAY_MAPPING[cleanPincode] || 'monday';
}

/**
 * Get pickup day for a pincode (synchronous static version)
 */
export function getPickupDayForPincodeStatic(pincode: string): PickupDay {
  const cleanPincode = pincode.trim().replace(/\s+/g, '');
  return STATIC_PICKUP_DAY_MAPPING[cleanPincode] || 'monday';
}

/**
 * Validate pincode with pickup day information (static version)
 */
export function validatePincodeWithPickupInfo(pincode: string): PincodePickupInfo {
  const cleanPincode = pincode.trim().replace(/\s+/g, '');
  
  // Basic validation first
  const basicValidation = validateBangalorePincode(cleanPincode);
  
  if (!basicValidation.isValid || !basicValidation.isServiceable) {
    return {
      isValid: basicValidation.isValid,
      isServiceable: basicValidation.isServiceable,
      message: basicValidation.message
    };
  }
  
  // Use static pickup day
  const pickupDay = getPickupDayForPincodeStatic(cleanPincode);
  
  return {
    isValid: true,
    isServiceable: true,
    area: basicValidation.area,
    pickupDay: pickupDay,
    deliveryDay: pickupDay, // Assume same day for delivery and pickup
    zone: getZoneForPincode(cleanPincode),
    maxPickupsPerDay: 25, // Default capacity
    estimatedTravelTime: 30, // Default 30 minutes
    message: `${basicValidation.message}. Pickup day: ${pickupDay}`
  };
}

/**
 * Get zone for a pincode
 */
function getZoneForPincode(pincode: string): string {
  const zoneMapping: Record<string, string> = {
    // Central Bangalore
    '560001': 'Central', '560002': 'Central', '560004': 'Central', '560005': 'Central',
    '560009': 'Central', '560011': 'Central', '560012': 'Central', '560018': 'Central',
    
    // South Bangalore
    '560029': 'South', '560034': 'South', '560040': 'South', '560041': 'South',
    '560042': 'South', '560043': 'South', '560047': 'South', '560050': 'South',
    '560076': 'South', '560078': 'South', '560083': 'South',
    
    // East Bangalore
    '560037': 'East', '560048': 'East', '560049': 'East', '560066': 'East',
    '560067': 'East', '560068': 'East', '560087': 'East', '560100': 'East',
    '560103': 'East', '560125': 'East',
    
    // West Bangalore
    '560006': 'West', '560010': 'West', '560020': 'West', '560021': 'West',
    '560022': 'West', '560091': 'West',
    
    // North Bangalore
    '560013': 'North', '560024': 'North', '560025': 'North', '560032': 'North',
    '560064': 'North', '560065': 'North', '560077': 'North', '560080': 'North',
    '560092': 'North', '560093': 'North', '560094': 'North'
  };
  
  return zoneMapping[pincode] || 'Bangalore';
}

/**
 * Get all pincodes for a specific pickup day (static version)
 */
export function getPincodesForPickupDay(pickupDay: PickupDay): string[] {
  return Object.entries(STATIC_PICKUP_DAY_MAPPING)
    .filter(([, day]) => day === pickupDay)
    .map(([pincode]) => pincode);
}

/**
 * Get pickup capacity for a specific day and pincode (static version)
 */
export function getPickupCapacityForPincode(pincode: string): {
  maxCapacity: number;
  currentUsed: number;
  available: number;
  pickupDay: PickupDay;
} {
  const cleanPincode = pincode.trim().replace(/\s+/g, '');
  
  // Default capacity
  return {
    maxCapacity: 25,
    currentUsed: 0,
    available: 25,
    pickupDay: getPickupDayForPincodeStatic(cleanPincode)
  };
}

/**
 * Check if pickup can be scheduled for a pincode on a specific date (static version)
 */
export function canSchedulePickupOnDate(pincode: string, date: Date): {
  canSchedule: boolean;
  reason?: string;
  suggestedDate?: Date;
} {
  const cleanPincode = pincode.trim().replace(/\s+/g, '');
  const pickupDay = getPickupDayForPincode(cleanPincode);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  const dayMapping: Record<PickupDay, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6
  };
  
  const expectedDayOfWeek = dayMapping[pickupDay];
  
  if (dayOfWeek === expectedDayOfWeek) {
    // Check capacity (using static version)
    const capacity = getPickupCapacityForPincode(cleanPincode);
    
    if (capacity.available > 0) {
      return { canSchedule: true };
    } else {
      // Find next available date
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 7); // Next week same day
      
      return {
        canSchedule: false,
        reason: 'Capacity full for this date',
        suggestedDate: nextDate
      };
    }
  } else {
    // Find next correct pickup day
    const daysUntilPickupDay = (expectedDayOfWeek - dayOfWeek + 7) % 7;
    const nextPickupDate = new Date(date);
    nextPickupDate.setDate(nextPickupDate.getDate() + (daysUntilPickupDay || 7));
    
    return {
      canSchedule: false,
      reason: `This area's pickup day is ${pickupDay}`,
      suggestedDate: nextPickupDate
    };
  }
}

/**
 * Get day-wise pickup summary for admin dashboard (static version)
 */
export function getDayWisePickupSummary(): Record<PickupDay, {
  totalPincodes: number;
  totalCapacity: number;
  currentUsed: number;
  availableCapacity: number;
  zones: string[];
}> {
  const summary: Record<string, any> = {};
  
  // Build summary from static mapping
  Object.entries(STATIC_PICKUP_DAY_MAPPING).forEach(([pincode, day]) => {
    if (!summary[day]) {
      summary[day] = {
        totalPincodes: 0,
        totalCapacity: 0,
        currentUsed: 0,
        availableCapacity: 0,
        zones: new Set()
      };
    }
    
    summary[day].totalPincodes += 1;
    summary[day].totalCapacity += 25; // Default capacity
    summary[day].currentUsed += 0; // No current usage yet
    summary[day].availableCapacity += 25;
    summary[day].zones.add(getZoneForPincode(pincode));
  });
  
  // Convert sets to arrays
  Object.keys(summary).forEach(day => {
    summary[day].zones = Array.from(summary[day].zones);
  });
  
  return summary;
}

/**
 * Calculate next pickup date for a pincode based on cycle timing (static version)
 */
export function calculateNextPickupDate(
  pincode: string, 
  cycleStartDate: Date, 
  cycleDayTarget: number = 28
): Date {
  const cleanPincode = pincode.trim().replace(/\s+/g, '');
  const pickupDay = getPickupDayForPincode(cleanPincode);
  
  // Calculate target date (cycle start + cycle day)
  const targetDate = new Date(cycleStartDate);
  targetDate.setDate(targetDate.getDate() + cycleDayTarget - 1);
  
  // Find next occurrence of pickup day on or after target date
  const dayMapping: Record<PickupDay, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6
  };
  
  const expectedDayOfWeek = dayMapping[pickupDay];
  const targetDayOfWeek = targetDate.getDay();
  
  const daysUntilPickupDay = (expectedDayOfWeek - targetDayOfWeek + 7) % 7;
  const pickupDate = new Date(targetDate);
  pickupDate.setDate(pickupDate.getDate() + daysUntilPickupDay);
  
  return pickupDate;
} 