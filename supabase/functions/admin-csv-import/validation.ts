
import { EnhancedMappedToyData } from './types.ts';

export function validateToyData(toy: EnhancedMappedToyData): string[] {
  const errors: string[] = [];

  if (!toy.name || toy.name.trim() === '') {
    errors.push('Name is required');
  }

  if (!toy.category) {
    errors.push('Category is required');
  }

  if (!toy.age_range || toy.age_range.trim() === '') {
    errors.push('Age range is required');
  }

  if (toy.retail_price !== null && toy.retail_price < 0) {
    errors.push('Retail price cannot be negative');
  }

  if (toy.rental_price !== null && toy.rental_price < 0) {
    errors.push('Rental price cannot be negative');
  }

  if (toy.total_quantity < 0) {
    errors.push('Total quantity cannot be negative');
  }

  if (toy.available_quantity < 0) {
    errors.push('Available quantity cannot be negative');
  }

  if (toy.available_quantity > toy.total_quantity) {
    errors.push('Available quantity cannot exceed total quantity');
  }

  return errors;
}
