
import { ToyFormData } from "@/types/toy";

// Define valid toy table columns to prevent invalid fields from being sent
const VALID_TOY_COLUMNS = [
  'name',
  'description', 
  'category',
  'subscription_category',
  'age_range',
  'brand',
  'pack',
  'retail_price',
  'rental_price',
  'image_url',
  'total_quantity',
  'available_quantity',
  'rating',
  'show_strikethrough_pricing',
  'display_order',
  'is_featured',
  'sku',
  'min_age',
  'max_age',
  // Advanced inventory fields
  'reorder_level',
  'reorder_quantity',
  'supplier_id',
  'purchase_cost',
  'last_restocked_date',
  'inventory_status',
  'weight_kg',
  'dimensions_cm',
  'barcode',
  'internal_notes',
  'seasonal_availability',
  'condition_rating',
  'maintenance_required',
  'last_maintenance_date'
];

export const prepareToyData = (formData: ToyFormData, primaryImageIndex: number) => {
  console.log('Preparing toy data:', { formData, primaryImageIndex });
  
  // Validate and prepare category - ensure we have at least one category
  if (!formData.category || formData.category.length === 0) {
    throw new Error('At least one category must be selected');
  }

  // Use the first category as the primary category (database expects single value)
  const primaryCategory = formData.category[0];

  // Safely parse numeric values with validation
  let totalQuantity = 0;
  let availableQuantity = 0;
  let retailPrice = null;
  let rentalPrice = null;
  let rating = 0;
  let displayOrder = 9999;

  // Parse total quantity
  if (formData.total_quantity && formData.total_quantity.trim()) {
    const parsed = parseInt(formData.total_quantity, 10);
    if (isNaN(parsed) || parsed < 0) {
      throw new Error('Total quantity must be a valid non-negative number');
    }
    totalQuantity = parsed;
  }

  // Parse available quantity
  if (formData.available_quantity && formData.available_quantity.trim()) {
    const parsed = parseInt(formData.available_quantity, 10);
    if (isNaN(parsed) || parsed < 0) {
      throw new Error('Available quantity must be a valid non-negative number');
    }
    if (parsed > totalQuantity) {
      throw new Error('Available quantity cannot exceed total quantity');
    }
    availableQuantity = parsed;
  }

  // Parse retail price
  if (formData.retail_price && formData.retail_price.trim()) {
    const parsed = parseFloat(formData.retail_price);
    if (isNaN(parsed) || parsed < 0) {
      throw new Error('Retail price must be a valid non-negative number');
    }
    retailPrice = parsed;
  }

  // Parse rental price
  if (formData.rental_price && formData.rental_price.trim()) {
    const parsed = parseFloat(formData.rental_price);
    if (isNaN(parsed) || parsed < 0) {
      throw new Error('Rental price must be a valid non-negative number');
    }
    rentalPrice = parsed;
  }

  // Parse rating
  if (formData.rating && formData.rating.trim()) {
    const parsed = parseFloat(formData.rating);
    if (isNaN(parsed) || parsed < 0 || parsed > 5) {
      throw new Error('Rating must be a valid number between 0 and 5');
    }
    rating = parsed;
  }

  // Parse display order
  if (formData.display_order && formData.display_order.trim()) {
    const parsed = parseInt(formData.display_order, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error('Display order must be a positive number');
    }
    displayOrder = parsed;
  }

  // Set primary image URL
  const primaryImageUrl = formData.images.length > 0 && primaryImageIndex < formData.images.length 
    ? formData.images[primaryImageIndex] 
    : (formData.images.length > 0 ? formData.images[0] : formData.image_url || null);
  
  const preparedData = {
    name: formData.name.trim(),
    description: formData.description?.trim() || null,
    category: primaryCategory,
    subscription_category: formData.subscription_category,
    age_range: formData.age_range.length > 0 ? JSON.stringify(formData.age_range) : null,
    brand: formData.brand?.trim() || null,
    pack: formData.pack.length > 0 ? JSON.stringify(formData.pack) : null,
    retail_price: retailPrice,
    rental_price: rentalPrice,
    image_url: primaryImageUrl,
    total_quantity: totalQuantity,
    available_quantity: availableQuantity,
    rating: rating,
    show_strikethrough_pricing: formData.show_strikethrough_pricing,
    display_order: displayOrder,
    is_featured: formData.is_featured,
  };
  
  // Filter out any invalid fields that might have been accidentally included
  const cleanedData = Object.keys(preparedData).reduce((acc, key) => {
    if (VALID_TOY_COLUMNS.includes(key)) {
      acc[key] = preparedData[key];
    } else {
      console.warn(`Filtered out invalid field: ${key}`);
    }
    return acc;
  }, {} as any);
  
  // Additional safety check - ensure no toy_id field exists
  if ('toy_id' in cleanedData) {
    console.error('❌ Found invalid toy_id field in prepared data, removing it');
    delete cleanedData.toy_id;
  }
  
  console.log('Prepared toy data:', cleanedData);
  console.log('✅ Data validation passed - no invalid fields detected');
  
  return cleanedData;
};
