// Advanced Inventory Management Types

export interface SupplierInfo {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: Record<string, any>;
  lead_time_days: number;
  minimum_order_value: number;
  reliability_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  toy_id: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'damaged' | 'maintenance' | 'lost' | 'returned';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string;
  reference_order_id?: string;
  created_by?: string;
  created_at: string;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier?: SupplierInfo;
  status: 'draft' | 'pending' | 'approved' | 'ordered' | 'shipped' | 'received' | 'cancelled';
  total_amount: number;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  toy_id: string;
  toy?: {
    id: string;
    name: string;
    category: string;
  };
  quantity: number;
  unit_cost: number;
  total_cost: number;
  received_quantity: number;
  created_at: string;
}

export interface StockAlert {
  id: string;
  toy_id: string;
  toy?: {
    id: string;
    name: string;
    category: string;
    available_quantity: number;
  };
  alert_type: 'low_stock' | 'out_of_stock' | 'reorder_needed' | 'overstock';
  threshold_quantity: number;
  current_quantity: number;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  notes?: string;
}

export interface AdvancedToyFilters {
  inventoryStatus: 'all' | 'active' | 'low_stock' | 'out_of_stock' | 'discontinued';
  priceRange: [number, number];
  supplier: string;
  lastRestocked: {
    start?: string;
    end?: string;
  };
  condition: number;
  category: string;
  ageGroup: string;
}

export interface BulkOperation {
  type: 'price_update' | 'category_update' | 'supplier_update' | 'status_update' | 'reorder_level_update';
  value: any;
  reason?: string;
}

export interface InventoryAnalytics {
  totalInventoryValue: number;
  turnoverRate: number;
  lowStockItems: number;
  popularToys: Array<{
    toyId: string;
    name: string;
    rentals: number;
    revenue: number;
    turnoverRate: number;
  }>;
  ageGroupPerformance: Record<string, {
    totalToys: number;
    utilization: number;
    revenue: number;
  }>;
  seasonalTrends: Array<{
    month: string;
    orders: number;
    revenue: number;
    popularCategories: string[];
  }>;
  profitabilityAnalysis: Array<{
    toyId: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }>;
}

export interface ReorderRecommendation {
  toyId: string;
  toyName: string;
  currentStock: number;
  recommendedOrderQuantity: number;
  urgency: 'high' | 'medium' | 'low';
  reasoning: string;
  expectedDeliveryDate: Date;
  costAnalysis: {
    unitCost: number;
    totalCost: number;
    expectedRevenue: number;
    projectedProfit: number;
  };
}

export interface InventorySummary {
  total_toys: number;
  total_inventory_value: number;
  total_available: number;
  total_reserved: number;
  total_rented: number;
  low_stock_toys: number;
  out_of_stock_toys: number;
  pending_purchase_orders: number;
  unresolved_alerts: number;
}

export interface ToyCondition {
  toyId: string;
  condition: number; // 1-5 scale
  maintenanceRequired: boolean;
  lastMaintenanceDate?: string;
  notes?: string;
}

export interface ImageAnalysis {
  tags: string[];
  dominantColors: string[];
  quality: number;
  duplicates: string[];
  suggestedCategory: string;
  dimensions?: {
    width: number;
    height: number;
  };
  fileSize: number;
} 