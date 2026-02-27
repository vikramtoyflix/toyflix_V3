
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BulkSelectionContextType {
  selectedItems: Set<string>;
  selectItem: (id: string) => void;
  unselectItem: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
}

const BulkSelectionContext = createContext<BulkSelectionContextType | undefined>(undefined);

interface BulkSelectionProviderProps {
  children: ReactNode;
}

export const BulkSelectionProvider = ({ children }: BulkSelectionProviderProps) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const selectItem = (id: string) => {
    setSelectedItems(prev => new Set([...prev, id]));
  };

  const unselectItem = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const selectAll = (ids: string[]) => {
    setSelectedItems(new Set(ids));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const isSelected = (id: string) => {
    return selectedItems.has(id);
  };

  const selectedCount = selectedItems.size;

  return (
    <BulkSelectionContext.Provider value={{
      selectedItems,
      selectItem,
      unselectItem,
      selectAll,
      clearSelection,
      isSelected,
      selectedCount
    }}>
      {children}
    </BulkSelectionContext.Provider>
  );
};

export const useBulkSelection = () => {
  const context = useContext(BulkSelectionContext);
  if (!context) {
    throw new Error('useBulkSelection must be used within a BulkSelectionProvider');
  }
  return context;
};
