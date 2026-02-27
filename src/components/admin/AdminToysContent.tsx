import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BulkActionToolbar } from "./bulk/BulkActionToolbar";
import { AdminToysTable } from "./toys/AdminToysTable";
import { AdminToysDialogs } from "./toys/AdminToysDialogs";
import { AdminToysFilters } from "./toys/AdminToysFilters";
import { AdminToysStats } from "./toys/AdminToysStats";
import { AdminToysContentHeader } from "./toys/AdminToysContentHeader";
import { useAdminToysState } from "./toys/useAdminToysState";
import { useCallback, useState } from "react";

export const AdminToysContent = () => {
  const { toast } = useToast();
  const {
    toys,
    filteredToys,
    categories,
    isLoading,
    error,
    isRefreshing,
    setIsRefreshing,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    confirmDialog,
    setConfirmDialog,
    deleteDialog,
    setDeleteDialog,
    inputDialog,
    setInputDialog,
    selectedItems,
    selectedCount,
    selectAll,
    selectItem,
    isOperationLoading,
    deletingToyId,
    handleRefresh,
    handleEditToy,
    handleDeleteToy,
    handleBulkAction,
    forceRefresh
  } = useAdminToysState();

  const handleForceRefresh = useCallback(async () => {
    if (isRefreshing) {
      console.log('Refresh already in progress, skipping...');
      return;
    }

    setIsRefreshing(true);
    try {
      console.log('Admin force refresh initiated...');
      await handleRefresh();
      console.log('Toys data refreshed successfully');
      toast({
        title: "Success",
        description: "Toy data refreshed successfully",
      });
    } catch (error) {
      console.error('Failed to refresh toys data:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh toy data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, handleRefresh, toast]);

  const handleBulkActionClick = useCallback(async (actionId: string) => {
    if (isOperationLoading) {
      console.log('Bulk operation already in progress, skipping...');
      return;
    }

    const selectedIds = Array.from(selectedItems);
    const result = await handleBulkAction(actionId, selectedIds);
    
    if (result) {
      if ('inputType' in result) {
        setInputDialog({
          open: true,
          title: result.title,
          description: result.description,
          inputType: result.inputType,
          options: result.options,
          placeholder: result.placeholder || "",
          action: result.action
        });
      } else {
        setConfirmDialog({
          open: true,
          title: result.title,
          description: result.description,
          actionLabel: result.actionLabel,
          action: result.action,
          destructive: result.destructive || false
        });
      }
    }
  }, [isOperationLoading, selectedItems, handleBulkAction, setInputDialog, setConfirmDialog]);

  const onConfirmDeleteToy = useCallback(async () => {
    if (deleteDialog.toyId) {
      await handleDeleteToy(deleteDialog.toyId);
      setDeleteDialog({ open: false, toyId: "", toyName: "" });
    }
  }, [deleteDialog.toyId, handleDeleteToy, setDeleteDialog]);

  const handleDeleteToyClick = useCallback((toyId: string, toyName: string) => {
    setDeleteDialog({
      open: true,
      toyId,
      toyName
    });
  }, [setDeleteDialog]);

  const bulkActions = [
    {
      id: 'delete',
      label: 'Delete',
      icon: <AlertCircle className="w-4 h-4" />,
      variant: 'destructive' as const
    },
    {
      id: 'update-category',
      label: 'Update Category',
      icon: <AlertCircle className="w-4 h-4" />,
      variant: 'outline' as const
    },
    {
      id: 'toggle-featured',
      label: 'Toggle Carousel Featured',
      icon: <AlertCircle className="w-4 h-4" />,
      variant: 'outline' as const
    }
  ];

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error loading toys:</strong> {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <AdminToysContentHeader
          toys={toys}
          filteredToys={filteredToys}
          isRefreshing={isRefreshing}
          isLoading={isLoading}
          onRefresh={handleForceRefresh}
        />

        <CardContent>
          <AdminToysStats
            toys={toys}
            filteredToys={filteredToys}
            isRefreshing={isRefreshing}
          />

          <AdminToysFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            categories={categories}
          />

          {selectedCount > 0 && (
            <BulkActionToolbar
              actions={bulkActions}
              onAction={handleBulkActionClick}
              isLoading={isOperationLoading}
            />
          )}

          <AdminToysTable
            toys={filteredToys}
            isLoading={isLoading || isRefreshing}
            selectedItems={selectedItems}
            onSelectAll={(checked) => selectAll(toys?.map(t => t.id) || [])}
            onSelectItem={selectItem}
            onEditToy={handleEditToy}
            onDeleteToy={handleDeleteToyClick}
            deletingToyId={deletingToyId}
            selectedCount={selectedCount}
          />
        </CardContent>
      </Card>

      <AdminToysDialogs
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        deleteDialog={deleteDialog}
        setDeleteDialog={setDeleteDialog}
        inputDialog={inputDialog}
        setInputDialog={setInputDialog}
        selectedCount={selectedCount}
        onConfirmDeleteToy={onConfirmDeleteToy}
      />
    </div>
  );
};
