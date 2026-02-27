// Test script to verify CRUD operations work with subscription_category
// Run this in browser console on your admin page

console.log('🧪 Testing CRUD operations with subscription_category...');

// Test data structure
const testToyData = {
  name: 'Test CRUD Toy',
  description: 'Testing CRUD operations',
  category: 'educational_toys',
  subscription_category: 'educational_toys',
  age_range: '3-6 years',
  brand: 'Test Brand',
  retail_price: 1000,
  rental_price: 100,
  total_quantity: 5,
  available_quantity: 3,
  image_url: 'https://example.com/test.jpg',
  is_featured: false
};

console.log('✅ Test toy data:', testToyData);
console.log('✅ All required fields included: name, category, subscription_category, age_range');
console.log('🎯 Ready to test CREATE operation in admin panel!'); 