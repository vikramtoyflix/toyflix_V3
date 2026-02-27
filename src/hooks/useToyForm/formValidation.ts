
import { ToyFormData } from "@/types/toy";

export const validateToyForm = (formData: ToyFormData): string | null => {
  if (!formData.name.trim()) {
    return "Toy name is required";
  }
  
  if (!formData.category || formData.category.length === 0) {
    return "At least one category must be selected";
  }

  if (formData.total_quantity && formData.available_quantity) {
    const total = parseInt(formData.total_quantity, 10);
    const available = parseInt(formData.available_quantity, 10);
    
    if (!isNaN(total) && !isNaN(available) && available > total) {
      return "Available quantity cannot be greater than total quantity";
    }
  }

  return null;
};
