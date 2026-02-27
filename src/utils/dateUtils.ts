/**
 * Utility functions for formatting dates in Indian Standard Time (IST)
 * Ensures consistent timezone display across the entire application
 */

export const INDIA_TIMEZONE = 'Asia/Kolkata';

/**
 * Format a date string to Indian date format (DD MMM YYYY)
 */
export const formatIndianDate = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      timeZone: INDIA_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting Indian date:', error);
    return 'Invalid date';
  }
};

/**
 * Format a date string to Indian time format (HH:MM AM/PM)
 */
export const formatIndianTime = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      timeZone: INDIA_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting Indian time:', error);
    return 'Invalid time';
  }
};

/**
 * Format a date string to Indian date and time format (DD MMM YYYY, HH:MM AM/PM)
 */
export const formatIndianDateTime = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: INDIA_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting Indian date time:', error);
    return 'Invalid date';
  }
};

/**
 * Format a date string to full Indian date format (DD MMMM YYYY)
 */
export const formatIndianDateFull = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      timeZone: INDIA_TIMEZONE,
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting Indian date full:', error);
    return 'Invalid date';
  }
};

/**
 * Get current Indian time
 */
export const getCurrentIndianTime = (): Date => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: INDIA_TIMEZONE }));
};

/**
 * Check if a date is today in Indian timezone
 */
export const isToday = (dateString: string | Date): boolean => {
  try {
    const date = new Date(dateString);
    const today = getCurrentIndianTime();
    
    const dateIndia = new Date(date.toLocaleString("en-US", { timeZone: INDIA_TIMEZONE }));
    
    return dateIndia.toDateString() === today.toDateString();
  } catch (error) {
    console.error('Error checking if date is today:', error);
    return false;
  }
};

/**
 * Format date for order display (compact format)
 */
export const formatOrderDate = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      timeZone: INDIA_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting order date:', error);
    return 'Invalid date';
  }
};

/**
 * Format time for order display (compact format)
 */
export const formatOrderTime = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      timeZone: INDIA_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // 24-hour format for admin
    });
  } catch (error) {
    console.error('Error formatting order time:', error);
    return 'Invalid time';
  }
}; 