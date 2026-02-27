
export interface BulkOperationRequest {
  operation: 'delete' | 'update-category' | 'toggle-featured' | 'update-price';
  toyIds: string[];
  data?: {
    category?: string;
    featured?: boolean;
    priceChangePercent?: number;
  };
}

export interface BulkOperationResult {
  success: boolean;
  message: string;
  processed: number;
  failed: number;
  errors: string[];
}
