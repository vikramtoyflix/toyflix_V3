
import { ToyFormData, SubscriptionCategory } from "@/types/toy";
import { fetchToyData, fetchToyImages } from './toyService';
import { parsePack, parseCategory, parseAgeRange, parseImages } from './dataUtils';

export const loadToyFormData = async (id: string): Promise<ToyFormData & { primaryImageIndex: number }> => {
  console.log('Loading toy data for ID:', id);
  const [toyData, imageData] = await Promise.all([
    fetchToyData(id),
    fetchToyImages(id)
  ]);

  if (!toyData) {
    throw new Error('Toy data not found');
  }

  console.log('Raw toy data loaded:', toyData);
  
  // Check for any invalid fields that might cause issues
  if ('toy_id' in toyData) {
    console.warn('⚠️ Found toy_id field in raw toy data, this should not exist');
    delete toyData.toy_id;
  }
  
  const packArray = parsePack(toyData.pack);
  const categoryArray = parseCategory(toyData.category);
  const ageRangeArray = parseAgeRange(toyData.age_range);
  const { images, primaryIndex } = parseImages(imageData, toyData.image_url);

  const loadedFormData: ToyFormData = {
    name: toyData.name || '',
    description: toyData.description || '',
    category: categoryArray as ToyFormData['category'],
    subscription_category: toyData.subscription_category || 'educational_toys' as SubscriptionCategory,
    age_range: ageRangeArray,
    brand: toyData.brand || '',
    pack: packArray,
    retail_price: toyData.retail_price?.toString() || '',
    rental_price: toyData.rental_price?.toString() || '',
    image_url: toyData.image_url || '',
    images: images,
    total_quantity: toyData.total_quantity?.toString() || '',
    available_quantity: toyData.available_quantity?.toString() || '',
    rating: toyData.rating?.toString() || '0',
    show_strikethrough_pricing: toyData.show_strikethrough_pricing ?? true,
    display_order: toyData.display_order?.toString() || '9999',
    is_featured: toyData.is_featured ?? false,
  };

  // Additional safety check to ensure no invalid fields are in the form data
  const validFormFields = [
    'name', 'description', 'category', 'subscription_category', 'age_range', 
    'brand', 'pack', 'retail_price', 'rental_price', 'image_url', 'images',
    'total_quantity', 'available_quantity', 'rating', 'show_strikethrough_pricing',
    'display_order', 'is_featured'
  ];
  
  const cleanFormData = Object.keys(loadedFormData).reduce((acc, key) => {
    if (validFormFields.includes(key)) {
      acc[key] = loadedFormData[key as keyof ToyFormData];
    } else {
      console.warn(`Filtered out invalid form field: ${key}`);
    }
    return acc;
  }, {} as any) as ToyFormData;

  console.log('Processed form data:', cleanFormData);
  console.log('✅ Form data validation passed - no invalid fields detected');
  
  return { ...cleanFormData, primaryImageIndex: primaryIndex };
};
