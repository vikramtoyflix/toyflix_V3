
export interface DirectImportOptions {
  downloadImages: boolean;
  clearExistingData: boolean;
  skipDuplicates: boolean;
}

export interface DirectImportResults {
  successful: number;
  failed: number;
  errors: string[];
  imported: any[];
  imageErrors: string[];
  duplicatesSkipped: number;
}

export interface DirectImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  sampleToys: any[];
  warnings: string[];
  validationSummary: {
    requiredFields: number;
    enumValidation: number;
    dataTypes: number;
  };
}
