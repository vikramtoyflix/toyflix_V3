
import { EnhancedMappedToyData, CSVRow } from './types.ts';

export function parseCSVRow(row: any, options: { downloadImages?: boolean }): EnhancedMappedToyData {
  console.log('Parsing basic CSV row:', row.Name || row.name);
  
  const name = row.Name || row.name || '';
  const description = row.Description || row.description || '';
  const categories = row.Categories || row.categories || '';
  const images = row.Images || row.images || '';
  const price = parseFloat(row['Regular price'] || row.price || '0');
  const stock = parseInt(row.Stock || row.stock || '0');
  
  // Extract age range from categories
  const ageRangeMatch = categories.match(/(\d+)-(\d+)\s*years?/i);
  const ageRange = ageRangeMatch ? `${ageRangeMatch[1]}-${ageRangeMatch[2]} years` : '3-8 years';
  
  // Parse category
  const categoryParts = categories.split(',')[0]?.split('>');
  const category = categoryParts?.[categoryParts.length - 1]?.trim() || 'Educational Toys';
  
  // Parse images
  const imageUrls = images ? images.split(',').map((url: string) => url.trim()).filter(Boolean) : [];
  
  return {
    name,
    description,
    category,
    age_range: ageRange,
    brand: row.Brands || row.brand || null,
    pack: null,
    retail_price: price,
    rental_price: Math.round(price * 0.1), // 10% of retail price
    image_url: imageUrls[0] || null,
    all_images: imageUrls,
    total_quantity: stock,
    available_quantity: stock,
    rating: 4.0,
    min_age: ageRangeMatch ? parseInt(ageRangeMatch[1]) : 3,
    max_age: ageRangeMatch ? parseInt(ageRangeMatch[2]) : 8,
    sku: row.SKU || row.sku || null
  };
}

export function parseEnhancedCSVRow(row: any, options: { downloadImages?: boolean; categoryMappingMode?: string }): EnhancedMappedToyData {
  console.log('Parsing enhanced CSV row:', row.Name || row.name);
  
  // Start with basic parsing
  const basicData = parseCSVRow(row, options);
  
  // Enhanced category mapping
  const categories = row.Categories || row.categories || '';
  const categoryMapping = mapCategoryWithConfidence(categories, options.categoryMappingMode);
  
  return {
    ...basicData,
    category: categoryMapping.mapped,
    category_confidence: categoryMapping.confidence,
    category_hierarchy: categoryMapping.hierarchy,
    original_categories: categories
  };
}

export function parseDirectCSVRow(row: any): EnhancedMappedToyData {
  console.log('Parsing direct CSV row:', row.name);
  
  return {
    name: row.name || '',
    description: row.description || '',
    category: row.category || 'Educational Toys',
    age_range: row.age_range || '3-8 years',
    brand: row.brand || null,
    pack: row.pack || null,
    retail_price: parseFloat(row.retail_price || '0'),
    rental_price: parseFloat(row.rental_price || '0'),
    image_url: row.image_url || null,
    all_images: row.all_images ? row.all_images.split(',').map((url: string) => url.trim()) : [],
    total_quantity: parseInt(row.total_quantity || '0'),
    available_quantity: parseInt(row.available_quantity || '0'),
    rating: parseFloat(row.rating || '4.0'),
    min_age: parseInt(row.min_age || '3'),
    max_age: parseInt(row.max_age || '8'),
    sku: row.sku || null
  };
}

function mapCategoryWithConfidence(categories: string, mode?: string): { 
  mapped: string; 
  confidence: 'high' | 'medium' | 'low'; 
  hierarchy?: string[] 
} {
  const categoryMap: { [key: string]: { mapped: string; confidence: 'high' | 'medium' | 'low' } } = {
    'building blocks': { mapped: 'Building Blocks', confidence: 'high' },
    'educational toys': { mapped: 'Educational Toys', confidence: 'high' },
    'puzzles': { mapped: 'Puzzles & Games', confidence: 'high' },
    'games': { mapped: 'Puzzles & Games', confidence: 'high' },
    'big toys': { mapped: 'Ride-On Toys', confidence: 'medium' },
    'books': { mapped: 'Books & Learning', confidence: 'high' },
    'art': { mapped: 'Arts & Crafts', confidence: 'high' },
    'crafts': { mapped: 'Arts & Crafts', confidence: 'high' },
    'music': { mapped: 'Musical Toys', confidence: 'high' },
    'musical': { mapped: 'Musical Toys', confidence: 'high' }
  };
  
  const lowerCategories = categories.toLowerCase();
  
  for (const [key, value] of Object.entries(categoryMap)) {
    if (lowerCategories.includes(key)) {
      return {
        mapped: value.mapped,
        confidence: value.confidence,
        hierarchy: categories.split('>').map(c => c.trim())
      };
    }
  }
  
  // Default fallback
  return {
    mapped: 'Educational Toys',
    confidence: 'low',
    hierarchy: [categories]
  };
}
