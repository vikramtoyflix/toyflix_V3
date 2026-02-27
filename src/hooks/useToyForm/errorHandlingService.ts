
export class ErrorHandlingService {
  static getUserFriendlyMessage(error: any): string {
    const errorMessage = error instanceof Error ? error.message : "Failed to save toy";
    
    if (errorMessage.toLowerCase().includes('name already exists')) {
      return "A toy with this name already exists. Please use a different name.";
    } else if (errorMessage.toLowerCase().includes('invalid category')) {
      return "Invalid category selected. Please choose a valid category.";
    } else if (errorMessage.toLowerCase().includes('quantity')) {
      return "Invalid quantity values. Please check that available quantity doesn't exceed total quantity.";
    } else if (errorMessage.toLowerCase().includes('price')) {
      return "Invalid price values. Please enter valid positive numbers for prices.";
    } else if (errorMessage.toLowerCase().includes('rating')) {
      return "Invalid rating. Please enter a value between 0 and 5.";
    } else if (errorMessage.toLowerCase().includes('permission')) {
      return "You don't have permission to perform this action. Please check your access rights.";
    } else if (errorMessage.toLowerCase().includes('not found')) {
      return "The toy you're trying to update was not found. It may have been deleted.";
    } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
      return "Network error occurred. Please check your connection and try again.";
    }
    
    return "Failed to save toy. Please try again.";
  }
}
