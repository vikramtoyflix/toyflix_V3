
export const validateToyData = (toyData: any) => {
  console.log('Validating toy data:', toyData);
  
  if (!toyData.name || !toyData.name.trim()) {
    throw new Error('Toy name is required and cannot be empty');
  }
  
  if (!toyData.category) {
    throw new Error('Category is required');
  }

  // Validate numeric fields
  if (toyData.total_quantity < 0) {
    throw new Error('Total quantity cannot be negative');
  }
  
  if (toyData.available_quantity < 0) {
    throw new Error('Available quantity cannot be negative');
  }
  
  if (toyData.available_quantity > toyData.total_quantity) {
    throw new Error('Available quantity cannot exceed total quantity');
  }
  
  if (toyData.retail_price !== null && toyData.retail_price < 0) {
    throw new Error('Retail price cannot be negative');
  }
  
  if (toyData.rental_price !== null && toyData.rental_price < 0) {
    throw new Error('Rental price cannot be negative');
  }
  
  if (toyData.rating < 0 || toyData.rating > 5) {
    throw new Error('Rating must be between 0 and 5');
  }
  
  console.log('Toy data validation passed');
};
