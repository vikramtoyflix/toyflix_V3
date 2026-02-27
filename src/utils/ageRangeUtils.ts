/**
 * Utility functions for handling age range filtering
 * Supports toys with multiple age ranges stored as comma-separated strings
 */

export interface AgeRange {
  min: number;
  max: number;
}

/**
 * Parse a single age range string (e.g., "6m-2 years", "3+ years")
 */
export function parseAgeRange(ageRangeStr: string): AgeRange | null {
  if (!ageRangeStr || typeof ageRangeStr !== 'string') return null;
  
  const cleanStr = ageRangeStr.toLowerCase().trim()
    .replace(/years?/g, '') // Remove "year" or "years"
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  // Handle "X+ years" format
  if (cleanStr.includes('+')) {
    const min = parseInt(cleanStr.replace('+', '').trim());
    if (!isNaN(min)) {
      return { min, max: 99 }; // Assume max age of 99 for "X+" ranges
    }
  }
  
  // Handle "X-Y" format (most common)
  if (cleanStr.includes('-')) {
    const parts = cleanStr.split('-').map(part => parseInt(part.trim()));
    if (parts.length === 2 && !parts.some(isNaN)) {
      return { min: Math.min(parts[0], parts[1]), max: Math.max(parts[0], parts[1]) };
    }
  }
  
  // Handle single age "X" format
  const singleAge = parseInt(cleanStr);
  if (!isNaN(singleAge) && singleAge > 0) {
    return { min: singleAge, max: singleAge };
  }
  
  // Handle special cases
  const lowerStr = cleanStr.toLowerCase();
  if (lowerStr.includes('ride on no age') || 
      lowerStr.includes('no age') || 
      lowerStr.includes('all ages') ||
      lowerStr.includes('any age')) {
    return { min: 0, max: 99 }; // Suitable for all ages
  }
  
  // Handle "toddler", "infant", etc.
  if (lowerStr.includes('infant') || lowerStr.includes('baby')) {
    return { min: 0, max: 2 };
  }
  if (lowerStr.includes('toddler')) {
    return { min: 1, max: 3 };
  }
  if (lowerStr.includes('preschool')) {
    return { min: 3, max: 5 };
  }
  if (lowerStr.includes('school')) {
    return { min: 5, max: 12 };
  }
  
  return null;
}

/**
 * Parse multiple age ranges from a comma-separated string
 * e.g., "6m-2 years, 2-3 years, 3-4 years"
 */
export function parseMultipleAgeRanges(ageRangesStr: string): AgeRange[] {
  if (!ageRangesStr || typeof ageRangesStr !== 'string') return [];
  
  // Split by comma, semicolon, or pipe and clean up each range
  const ranges = ageRangesStr.split(/[,;|]/).map(range => range.trim()).filter(Boolean);
  
  const parsedRanges: AgeRange[] = [];
  
  for (const range of ranges) {
    const parsed = parseAgeRange(range);
    if (parsed) {
      parsedRanges.push(parsed);
    }
  }
  
  return parsedRanges;
}

/**
 * Enhanced age range matching with improved logic
 * This function uses more inclusive matching while still maintaining safety
 */
export function matchesAgeRange(toyAgeRangesStr: string, selectedAgeStr: string): boolean {
  if (!toyAgeRangesStr || !selectedAgeStr) {
    console.warn('matchesAgeRange: Missing parameters', { toyAgeRangesStr, selectedAgeStr });
    return false;
  }
  if (selectedAgeStr === "all") return true;
  
  // Parse the selected age range
  const selectedRange = parseAgeRange(selectedAgeStr);
  if (!selectedRange) {
    console.warn(`Unable to parse selected age range: ${selectedAgeStr}`);
    return false;
  }
  
  // Parse the toy's age ranges
  const toyRanges = parseMultipleAgeRanges(toyAgeRangesStr);
  if (toyRanges.length === 0) {
    console.warn(`Unable to parse toy age ranges: ${toyAgeRangesStr}`);
    return false;
  }
  
  // IMPROVED AGE FILTERING LOGIC - More inclusive but still safe
  const matches = toyRanges.some(toyRange => {
    // Calculate overlap between toy range and selected range
    const overlapStart = Math.max(toyRange.min, selectedRange.min);
    const overlapEnd = Math.min(toyRange.max, selectedRange.max);
    const overlapSize = Math.max(0, overlapEnd - overlapStart);
    
    // If there's any meaningful overlap, consider it a match
    if (overlapSize > 0) {
      // For young children (0-4 years), be more strict about age appropriateness
      if (selectedRange.max <= 4) {
        // Toy shouldn't start more than 0.5 years before the selected range
        const toyNotTooYoung = toyRange.min >= selectedRange.min - 0.5;
        // Toy shouldn't extend more than 1 year beyond selected range
        const toyNotTooAdvanced = toyRange.max <= selectedRange.max + 1;
        
        // Require at least 50% overlap of the selected range
        const selectedRangeSize = selectedRange.max - selectedRange.min;
        const overlapRatio = selectedRangeSize > 0 ? overlapSize / selectedRangeSize : 1;
        
        const result = toyNotTooYoung && toyNotTooAdvanced && overlapRatio >= 0.5;
        
        // Debug logging for young children
        if (import.meta.env.MODE === 'development') {
          console.debug(`Young child filter (${selectedAgeStr}): toy "${toyAgeRangesStr}"`, {
            toyRange,
            selectedRange,
            overlapSize,
            overlapRatio,
            toyNotTooYoung,
            toyNotTooAdvanced,
            result
          });
        }
        
        return result;
      }
      
      // For older children (4+ years), be more flexible
      // Just require meaningful overlap (at least 25% of selected range)
      const selectedRangeSize = selectedRange.max - selectedRange.min;
      const overlapRatio = selectedRangeSize > 0 ? overlapSize / selectedRangeSize : 1;
      
      const result = overlapRatio >= 0.25;
      
      // Debug logging for older children
      if (import.meta.env.MODE === 'development') {
        console.debug(`Older child filter (${selectedAgeStr}): toy "${toyAgeRangesStr}"`, {
          toyRange,
          selectedRange,
          overlapSize,
          overlapRatio,
          result
        });
      }
      
      return result;
    }
    
    return false;
  });
  
  // Enhanced production logging for troubleshooting
  if (!matches && (toyAgeRangesStr.includes('Hi Life') || toyAgeRangesStr.includes('Roll'))) {
    console.log(`🔍 Age Filter Debug - Toy NOT matched:`, {
      toyAgeRangesStr,
      selectedAgeStr,
      toyRanges,
      selectedRange,
      matches
    });
  }
  
  return matches;
}

/**
 * Get a display-friendly string for age ranges
 */
export function formatAgeRanges(ageRangesStr: string): string {
  const ranges = parseMultipleAgeRanges(ageRangesStr);
  
  if (ranges.length === 0) return "All ages";
  if (ranges.length === 1) {
    const range = ranges[0];
    if (range.min === range.max) {
      return `${range.min} year${range.min !== 1 ? 's' : ''}`;
    }
    if (range.max === 99) {
      return `${range.min}+ years`;
    }
    return `${range.min}-${range.max} years`;
  }
  
  // Multiple ranges - format them nicely
  const formattedRanges = ranges.map(range => {
    if (range.min === range.max) {
      return `${range.min} year${range.min !== 1 ? 's' : ''}`;
    }
    if (range.max === 99) {
      return `${range.min}+ years`;
    }
    return `${range.min}-${range.max} years`;
  });
  
  if (import.meta.env.MODE === 'development') {
    console.log('[ageRangeUtils] Final age ranges for display:', formattedRanges.join(', '));
  }
  
  return formattedRanges.join(', ');
}

/**
 * Check if a toy is suitable for a specific age
 */
export function isToySuitableForAge(toyAgeRangesStr: string, childAge: number): boolean {
  const toyRanges = parseMultipleAgeRanges(toyAgeRangesStr);
  
  return toyRanges.some(range => {
    return childAge >= range.min && childAge <= range.max;
  });
}

/**
 * Normalize age range string for consistent formatting
 */
export function normalizeAgeRangeString(ageRangeStr: string): string {
  const ranges = parseMultipleAgeRanges(ageRangeStr);
  return formatAgeRanges(ranges.map(r => `${r.min}-${r.max}`).join(', '));
} 