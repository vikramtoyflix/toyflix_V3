/**
 * Stock validation utilities to ensure out-of-stock toys cannot be selected
 */

import { supabase } from "@/integrations/supabase/client";

export interface ToyStockInfo {
  id: string;
  name: string;
  available_quantity: number;
  total_quantity: number;
  inventory_status?: string;
  isInStock: boolean;
  isLowStock: boolean;
}

/**
 * Check if a toy is available for selection
 */
export async function checkToyStock(toyId: string): Promise<ToyStockInfo | null> {
  try {
    const { data: toy, error } = await supabase
      .from('toys')
      .select('id, name, available_quantity, total_quantity, inventory_status')
      .eq('id', toyId)
      .single();

    if (error || !toy) {
      console.error('Error fetching toy stock:', error);
      return null;
    }

    const available = toy.available_quantity || 0;
    
    return {
      id: toy.id,
      name: toy.name,
      available_quantity: available,
      total_quantity: toy.total_quantity || 0,
      inventory_status: toy.inventory_status,
      isInStock: available > 0,
      isLowStock: available <= 3 && available > 0
    };
  } catch (error) {
    console.error('Error checking toy stock:', error);
    return null;
  }
}

/**
 * Check stock for multiple toys
 */
export async function checkMultipleToyStock(toyIds: string[]): Promise<ToyStockInfo[]> {
  try {
    const { data: toys, error } = await supabase
      .from('toys')
      .select('id, name, available_quantity, total_quantity, inventory_status')
      .in('id', toyIds);

    if (error) {
      console.error('Error fetching multiple toy stock:', error);
      return [];
    }

    return (toys || []).map(toy => {
      const available = toy.available_quantity || 0;
      return {
        id: toy.id,
        name: toy.name,
        available_quantity: available,
        total_quantity: toy.total_quantity || 0,
        inventory_status: toy.inventory_status,
        isInStock: available > 0,
        isLowStock: available <= 3 && available > 0
      };
    });
  } catch (error) {
    console.error('Error checking multiple toy stock:', error);
    return [];
  }
}

/**
 * Validate toy selection for orders - returns validation result
 */
export async function validateToySelectionForOrder(toyIds: string[]): Promise<{
  isValid: boolean;
  outOfStockToys: string[];
  stockInfo: ToyStockInfo[];
}> {
  const stockInfo = await checkMultipleToyStock(toyIds);
  const outOfStockToys = stockInfo
    .filter(toy => !toy.isInStock)
    .map(toy => toy.name);

  return {
    isValid: outOfStockToys.length === 0,
    outOfStockToys,
    stockInfo
  };
}

/**
 * Filter toys to only include in-stock items
 */
export function filterInStockToys<T extends { id: string; available_quantity?: number }>(toys: T[]): T[] {
  return toys.filter(toy => (toy.available_quantity || 0) > 0);
}

/**
 * Check if toy is selectable (in stock and not discontinued)
 */
export function isToySelectable(toy: { available_quantity?: number; inventory_status?: string }): boolean {
  const available = toy.available_quantity || 0;
  const status = toy.inventory_status;
  
  return available > 0 && status !== 'discontinued';
}