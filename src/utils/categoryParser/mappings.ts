
import { CategoryMapping } from './types';

// Enhanced category mapping with hierarchical structure
export const categoryMappings: Record<string, CategoryMapping> = {
  // High confidence mappings
  'big toys': { mapped: 'big_toys', confidence: 'high', hierarchy: ['Physical Play', 'Large Items'] },
  'developmental toys': { mapped: 'developmental_toys', confidence: 'high', hierarchy: ['Learning', 'Development'] },
  'developmental toy': { mapped: 'developmental_toys', confidence: 'high', hierarchy: ['Learning', 'Development'] },
  'educational toys': { mapped: 'educational_toys', confidence: 'high', hierarchy: ['Learning', 'Educational'] },
  'educational toy': { mapped: 'educational_toys', confidence: 'high', hierarchy: ['Learning', 'Educational'] },
  'stem toys': { mapped: 'stem_toys', confidence: 'high', hierarchy: ['Learning', 'STEM'] },
  'stem toy': { mapped: 'stem_toys', confidence: 'high', hierarchy: ['Learning', 'STEM'] },
  'ride on toys': { mapped: 'ride_on_toys', confidence: 'high', hierarchy: ['Physical Play', 'Ride-On'] },
  'ride-on toys': { mapped: 'ride_on_toys', confidence: 'high', hierarchy: ['Physical Play', 'Ride-On'] },
  'books': { mapped: 'books', confidence: 'high', hierarchy: ['Learning', 'Literature'] },
  
  // Medium confidence mappings
  'building': { mapped: 'developmental_toys', confidence: 'medium', hierarchy: ['Learning', 'Construction'] },
  'construction': { mapped: 'developmental_toys', confidence: 'medium', hierarchy: ['Learning', 'Construction'] },
  'blocks': { mapped: 'developmental_toys', confidence: 'medium', hierarchy: ['Learning', 'Construction'] },
  'lego': { mapped: 'developmental_toys', confidence: 'medium', hierarchy: ['Learning', 'Construction'] },
  
  'outdoor': { mapped: 'ride_on_toys', confidence: 'medium', hierarchy: ['Physical Play', 'Outdoor'] },
  'outdoor toys': { mapped: 'ride_on_toys', confidence: 'medium', hierarchy: ['Physical Play', 'Outdoor'] },
  'ride on': { mapped: 'ride_on_toys', confidence: 'medium', hierarchy: ['Physical Play', 'Ride-On'] },
  
  'stem': { mapped: 'stem_toys', confidence: 'medium', hierarchy: ['Learning', 'STEM'] },
  'science': { mapped: 'stem_toys', confidence: 'medium', hierarchy: ['Learning', 'STEM'] },
  'engineering': { mapped: 'stem_toys', confidence: 'medium', hierarchy: ['Learning', 'STEM'] },
  'robotics': { mapped: 'stem_toys', confidence: 'medium', hierarchy: ['Learning', 'STEM'] },
  
  'creative': { mapped: 'educational_toys', confidence: 'medium', hierarchy: ['Learning', 'Creative'] },
  'art': { mapped: 'educational_toys', confidence: 'medium', hierarchy: ['Learning', 'Creative'] },
  'craft': { mapped: 'educational_toys', confidence: 'medium', hierarchy: ['Learning', 'Creative'] },
  'musical': { mapped: 'educational_toys', confidence: 'medium', hierarchy: ['Learning', 'Creative'] },
  
  'puzzles': { mapped: 'educational_toys', confidence: 'medium', hierarchy: ['Learning', 'Puzzles'] },
  'puzzle': { mapped: 'educational_toys', confidence: 'medium', hierarchy: ['Learning', 'Puzzles'] },
  
  'electronics': { mapped: 'educational_toys', confidence: 'low', hierarchy: ['Learning', 'Technology'] },
  'electronic': { mapped: 'educational_toys', confidence: 'low', hierarchy: ['Learning', 'Technology'] },
  
  // Low confidence fallbacks
  'learning': { mapped: 'educational_toys', confidence: 'low', hierarchy: ['Learning', 'General'] },
  'educational': { mapped: 'educational_toys', confidence: 'low', hierarchy: ['Learning', 'General'] },
  'development': { mapped: 'developmental_toys', confidence: 'low', hierarchy: ['Learning', 'Development'] },
};
