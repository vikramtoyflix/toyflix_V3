/**
 * Centralized error handling utilities
 * Handles network errors, API failures, and database issues gracefully
 */

// Types of errors we handle silently
const SILENT_ERROR_PATTERNS = [
  'fetch',
  'network',
  'CORS',
  'blocked',
  'permission',
  'RLS',
  'function',
  'does not exist',
  'PGRST202',
  'PGRST301',
  'PGRST116',
  '42883',
  '42501'
];

/**
 * Check if an error should be logged or handled silently
 */
export const isSilentError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString() || '';
  const errorCode = error.code || '';
  
  return SILENT_ERROR_PATTERNS.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase()) ||
    errorCode.includes(pattern)
  );
};

/**
 * Enhanced console.error that respects silent error patterns
 */
export const logError = (message: string, error?: any) => {
  // In production, only log truly critical errors
  if (process.env.NODE_ENV === 'production') {
    if (isSilentError(error)) {
      return; // Silent in production
    }
    console.error(message, error);
    return;
  }
  
  // In development, show warnings for silent errors, errors for others
  if (isSilentError(error)) {
    console.warn(`⚠️ ${message} (using fallback)`, error?.message || error);
  } else {
    console.error(`❌ ${message}`, error);
  }
};

/**
 * Wrapper for async operations that handles errors gracefully
 */
export const safeAsync = async <T>(
  operation: () => Promise<T>,
  fallback: T,
  errorContext?: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (errorContext) {
      logError(errorContext, error);
    }
    return fallback;
  }
};

/**
 * Enhanced fetch wrapper with silent error handling
 */
export const safeFetch = async (
  url: string,
  options?: RequestInit,
  fallback: any = null
): Promise<any> => {
  return safeAsync(
    async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    fallback,
    `Fetch failed for ${url}`
  );
}; 