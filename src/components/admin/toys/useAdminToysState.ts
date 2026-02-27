import { useState, useMemo } from "react";
import { useToysWithAgeBands } from "@/hooks/useToysWithAgeBands";
import { useBulkSelection } from "../bulk/BulkSelectionProvider";
import { useToyActions } from "./useToyActions";

// Dialog state types
interface DialogState {
  open: boolean;
  title: string;
  description: string;
  actionLabel: string;
  action: () => void;
  destructive?: boolean;
}

interface DeleteDialogState {
  open: boolean;
  toyId: string;
  toyName: string;
}

interface InputDialogState {
  open: boolean;
  title: string;
  description: string;
  inputType: "text" | "number" | "select" | "percentage";
  options?: { value: string; label: string }[];
  placeholder?: string;
  action: (value: string) => void;
}

export const useAdminToysState = () => {
  const { data: toys, isLoading, error, refetch } = useToysWithAgeBands();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<DialogState>({
    open: false,
    title: "",
    description: "",
    actionLabel: "",
    action: () => {},
    destructive: false
  });

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    toyId: "",
    toyName: ""
  });

  const [inputDialog, setInputDialog] = useState<InputDialogState>({
    open: false,
    title: "",
    description: "",
    inputType: "text",
    options: undefined,
    placeholder: "",
    action: (value: string) => {}
  });

  const {
    selectedItems,
    selectedCount,
    selectAll,
    selectItem,
    clearSelection,
    isSelected
  } = useBulkSelection();

  const {
    isOperationLoading,
    deletingToyId,
    handleRefresh,
    handleEditToy,
    handleDeleteToy,
    handleBulkAction
  } = useToyActions(refetch, clearSelection);

  // Memoized filtered toys to prevent expensive filtering on every render
  const filteredToys = useMemo(() => {
    if (!toys) return undefined;
    
    return toys.filter(toy => {
      const matchesSearch = searchTerm === "" || 
        toy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        toy.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        toy.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || toy.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [toys, searchTerm, categoryFilter]);

  // Memoized categories to prevent recalculation on every render
  const categories = useMemo(() => {
    if (!toys) return [];
    return [...new Set(toys.map(toy => toy.category))].sort();
  }, [toys]);

  return {
    // Data
    toys,
    filteredToys,
    categories,
    isLoading,
    error,
    isRefreshing,
    setIsRefreshing,
    
    // Search and filters
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    
    // Dialog states
    confirmDialog,
    setConfirmDialog,
    deleteDialog,
    setDeleteDialog,
    inputDialog,
    setInputDialog,
    
    // Selection
    selectedItems,
    selectedCount,
    selectAll,
    selectItem,
    clearSelection,
    isSelected,
    
    // Actions
    isOperationLoading,
    deletingToyId,
    handleRefresh,
    handleEditToy,
    handleDeleteToy,
    handleBulkAction,
    forceRefresh: refetch
  };
};
