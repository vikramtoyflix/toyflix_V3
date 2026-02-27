/**
 * Centralized Age Groups Constants for Toyflix
 * These are the ONLY 5 age groups that correspond to the age-based database tables:
 * toys_1_2_years, toys_2_3_years, toys_3_4_years, toys_4_6_years, toys_6_8_years
 */

export interface AgeGroup {
  value: string;
  label: string;
  displayLabel: string;
  minAge: number;
  maxAge: number;
  tableName: string;
  description: string;
}

/**
 * The CANONICAL 5 age groups for Toyflix
 * These match exactly with the age-based database tables
 */
export const AGE_GROUPS: readonly AgeGroup[] = [
  {
    value: '1-2',
    label: '6m-2 years',
    displayLabel: '1-2 YR',
    minAge: 1,
    maxAge: 2,
    tableName: 'toys_1_2_years',
    description: 'Toddlers beginning to walk and explore'
  },
  {
    value: '2-3',
    label: '2-3 years',
    displayLabel: '2-3 YR',
    minAge: 2,
    maxAge: 3,
    tableName: 'toys_2_3_years',
    description: 'Active toddlers with developing motor skills'
  },
  {
    value: '3-4',
    label: '3-4 years',
    displayLabel: '3-4 YR',
    minAge: 3,
    maxAge: 4,
    tableName: 'toys_3_4_years',
    description: 'Preschoolers learning through play'
  },
  {
    value: '4-6',
    label: '4-6 years',
    displayLabel: '4-6 YR',
    minAge: 4,
    maxAge: 6,
    tableName: 'toys_4_6_years',
    description: 'Learning and play toys for growing minds'
  },
  {
    value: '6-8',
    label: '6-8 years',
    displayLabel: '6-8 YR',
    minAge: 6,
    maxAge: 8,
    tableName: 'toys_6_8_years',
    description: 'School age children with advanced skills'
  }
] as const;

/**
 * Age group values only - for validation and selection
 */
export const AGE_GROUP_VALUES = AGE_GROUPS.map(group => group.value);

/**
 * Age group labels for display in dropdowns
 */
export const AGE_GROUP_LABELS = AGE_GROUPS.map(group => group.label);

/**
 * Age group display labels for compact UI (like filter buttons)
 */
export const AGE_GROUP_DISPLAY_LABELS = AGE_GROUPS.map(group => group.displayLabel);

/**
 * Map age group value to full age group object
 */
export const AGE_GROUP_MAP = new Map(
  AGE_GROUPS.map(group => [group.value, group])
);

/**
 * Default age group for fallbacks
 */
export const DEFAULT_AGE_GROUP = '3-4';

/**
 * Validate if an age group value is valid
 */
export function isValidAgeGroup(value: string): boolean {
  return AGE_GROUP_VALUES.includes(value as any);
}

/**
 * Get age group by value with fallback
 */
export function getAgeGroup(value: string): AgeGroup {
  return AGE_GROUP_MAP.get(value) || AGE_GROUP_MAP.get(DEFAULT_AGE_GROUP)!;
}

/**
 * Convert months to age group value
 */
export function monthsToAgeGroup(months: number): string {
  const years = months / 12;
  
  if (years < 2) return '1-2';
  if (years < 3) return '2-3';
  if (years < 4) return '3-4';
  if (years < 6) return '4-6';
  return '6-8';
}

/**
 * Get multiple selection checkboxes options for forms
 */
export const AGE_GROUP_CHECKBOX_OPTIONS = AGE_GROUPS.map(group => ({
  id: group.value,
  value: group.value,
  label: group.label,
  description: group.description
})); 