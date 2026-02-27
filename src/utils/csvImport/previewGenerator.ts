
import { CSVRow, EnhancedMappedToyData, ImportPreview, ImportOptions } from './types';
import { parseEnhancedCSVRow } from './dataProcessing';
import { validateToyData } from './validation';

export const generateImportPreview = (
  csvData: CSVRow[], 
  options: ImportOptions
): ImportPreview => {
  const preview: ImportPreview = {
    totalRows: csvData.length,
    validRows: 0,
    invalidRows: 0,
    categoryMappings: {},
    sampleToys: [],
    warnings: [],
    categoryParsingIssues: []
  };

  const categoryCounter = new Map<string, { mapped: string; confidence: string; count: number; hierarchy?: string[] }>();
  const processedToys: EnhancedMappedToyData[] = [];
  
  for (let i = 0; i < csvData.length && processedToys.length < 10; i++) {
    const row = csvData[i];
    
    try {
      const mappedToy = parseEnhancedCSVRow(row, options);
      const validationErrors = validateToyData(mappedToy);
      
      if (validationErrors.length === 0) {
        preview.validRows++;
        processedToys.push(mappedToy);
        
        // Track category mappings
        const originalCategory = mappedToy.original_categories || row.Categories || 'Unknown';
        const key = originalCategory.toLowerCase();
        
        if (categoryCounter.has(key)) {
          const existing = categoryCounter.get(key)!;
          existing.count++;
        } else {
          categoryCounter.set(key, {
            mapped: mappedToy.category,
            confidence: mappedToy.category_confidence || 'unknown',
            count: 1,
            hierarchy: mappedToy.category_hierarchy
          });
        }
        
        // Add any category parsing warnings
        if (mappedToy.category_confidence === 'low') {
          preview.categoryParsingIssues.push(
            `Low confidence mapping for "${originalCategory}" → ${mappedToy.category}`
          );
        }
      } else {
        preview.invalidRows++;
        preview.warnings.push(`Row ${i + 2}: ${validationErrors.join(', ')}`);
      }
    } catch (error) {
      preview.invalidRows++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      preview.warnings.push(`Row ${i + 2}: ${errorMessage}`);
      
      // Check if it's a strict mode category error
      if (options.categoryMappingMode === 'strict' && errorMessage.includes('category mapping')) {
        preview.categoryParsingIssues.push(`Row ${i + 2}: ${errorMessage}`);
      }
    }
  }
  
  // Convert category counter to the expected format
  categoryCounter.forEach((value, key) => {
    preview.categoryMappings[key] = value;
  });
  
  // Add sample toys (first 5 valid ones)
  preview.sampleToys = processedToys.slice(0, 5);
  
  // Add mode-specific warnings
  if (options.categoryMappingMode === 'strict' && preview.categoryParsingIssues.length > 0) {
    preview.warnings.push(
      `Strict mode: ${preview.categoryParsingIssues.length} rows have category mapping issues that will cause import failures.`
    );
  }
  
  // Add general category mapping summary
  const totalUniqueMappings = Object.keys(preview.categoryMappings).length;
  const highConfidenceMappings = Object.values(preview.categoryMappings)
    .filter(m => m.confidence === 'high').length;
  
  if (totalUniqueMappings > 0) {
    preview.warnings.push(
      `Category mappings: ${highConfidenceMappings}/${totalUniqueMappings} high confidence, ` +
      `${totalUniqueMappings - highConfidenceMappings} medium/low confidence`
    );
  }
  
  return preview;
};
