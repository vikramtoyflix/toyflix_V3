
// Re-export all functionality from the smaller modules - use admin operations by default
export { fetchToyDataAdmin as fetchToyData, saveToyAdmin as saveToy } from './adminToyOperations';
export { fetchToyImagesAdmin as fetchToyImages, saveToyImagesAdmin as saveToyImages } from './adminToyOperations';
export { prepareToyData } from './toyDataProcessor';
export { validateToyData } from './toyDataValidation';

// Export admin operations with their original names too
export { 
  fetchToyDataAdmin, 
  saveToyAdmin, 
  fetchToyImagesAdmin, 
  saveToyImagesAdmin 
} from './adminToyOperations';

// Export role checker
export { useAdminRoleChecker } from './roleChecker';
