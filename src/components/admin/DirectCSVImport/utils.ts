
import { validCategories, validSubscriptionCategories } from './constants';

export const parseCSV = (text: string): any[] => {
  const lines = text.split('\n');
  let headers: string[];
  
  // Try tab-separated first, then comma-separated
  if (lines[0].includes('\t')) {
    headers = lines[0].split('\t').map(h => h.trim());
  } else {
    headers = lines[0].split(',').map(h => h.trim());
  }
  
  const rows = [];
  const separator = lines[0].includes('\t') ? '\t' : ',';

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(separator);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      rows.push(row);
    }
  }
  return rows;
};

export const validateRow = (row: any, rowIndex: number): string[] => {
  const errors: string[] = [];

  // Required fields
  if (!row.name || row.name.trim() === '') {
    errors.push(`Row ${rowIndex + 2}: Name is required`);
  }
  if (!row.category || row.category.trim() === '') {
    errors.push(`Row ${rowIndex + 2}: Category is required`);
  }
  if (!row.subscription_category || row.subscription_category.trim() === '') {
    errors.push(`Row ${rowIndex + 2}: Subscription category is required`);
  }
  if (!row.age_range || row.age_range.trim() === '') {
    errors.push(`Row ${rowIndex + 2}: Age range is required`);
  }

  // Enum validation
  if (row.category && !validCategories.includes(row.category)) {
    errors.push(`Row ${rowIndex + 2}: Invalid category '${row.category}'. Valid values: ${validCategories.join(', ')}`);
  }
  if (row.subscription_category && !validSubscriptionCategories.includes(row.subscription_category)) {
    errors.push(`Row ${rowIndex + 2}: Invalid subscription category '${row.subscription_category}'. Valid values: ${validSubscriptionCategories.join(', ')}`);
  }

  // Numeric validation
  if (row.retail_price && isNaN(parseFloat(row.retail_price))) {
    errors.push(`Row ${rowIndex + 2}: Retail price must be a number`);
  }
  if (row.rental_price && isNaN(parseFloat(row.rental_price))) {
    errors.push(`Row ${rowIndex + 2}: Rental price must be a number`);
  }
  if (row.total_quantity && isNaN(parseInt(row.total_quantity))) {
    errors.push(`Row ${rowIndex + 2}: Total quantity must be a number`);
  }
  if (row.available_quantity && isNaN(parseInt(row.available_quantity))) {
    errors.push(`Row ${rowIndex + 2}: Available quantity must be a number`);
  }

  // Age validation
  if (row.min_age && row.max_age) {
    const minAge = parseInt(row.min_age);
    const maxAge = parseInt(row.max_age);
    if (!isNaN(minAge) && !isNaN(maxAge) && minAge > maxAge) {
      errors.push(`Row ${rowIndex + 2}: Minimum age cannot be greater than maximum age`);
    }
  }

  return errors;
};

export const downloadSampleCSV = (sampleData: string) => {
  const blob = new Blob([sampleData], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'direct_toys_import_sample.csv';
  a.click();
  window.URL.revokeObjectURL(url);
};
