import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNextCycleManager } from '@/hooks/useNextCycle';
import { ToyData } from '@/services/nextCycleService';
import { useSearchToys } from "@/hooks/useInventoryManagement";
import { isToySelectable } from "@/utils/stockValidation";
import { toast } from "@/hooks/use-toast";
import { 
  Search, 
  Package, 
  Filter, 
  X, 
  Plus, 
  Minus,
  ShoppingCart,
  AlertCircle,
  Star
} from 'lucide-react';

interface NextCycleToySelectionProps {
  userId: string;
  toyLimit: number;
  existingToys: ToyData[];
  onClose: () => void;
  onSuccess: () => void;
}

// Removed hardcoded toy data - now using real inventory data

export const NextCycleToySelection = ({
  userId,
  toyLimit,
  existingToys,
  onClose,
  onSuccess
}: NextCycleToySelectionProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedToys, setSelectedToys] = useState<ToyData[]>(existingToys);
  const [activeTab, setActiveTab] = useState('browse');

  const nextCycleManager = useNextCycleManager(userId);

  // Fetch real toy data with stock validation
  const { data: toySearchData, isLoading: toysLoading } = useSearchToys({
    search: searchTerm,
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    include_deleted: false,
    limit: 50
  });

  // Convert toys to ToyData format and filter out-of-stock toys
  const availableToys = useMemo(() => {
    if (!toySearchData?.toys) return [];
    
    return toySearchData.toys
      .filter(toy => isToySelectable(toy)) // Only include in-stock toys
      .map(toy => ({
        toy_id: toy.id,
        name: toy.name,
        category: toy.category || 'Uncategorized',
        image_url: toy.image_url || '/placeholder.svg',
        unit_price: toy.rental_price || 0,
        total_price: toy.rental_price || 0,
        quantity: 1,
        returned: false
      })) as ToyData[];
  }, [toySearchData]);

  // Get unique categories from available toys
  const categories = useMemo(() => {
    const cats = Array.from(new Set(availableToys.map(toy => toy.category)));
    return ['all', ...cats.filter(cat => cat)];
  }, [availableToys]);

  // Filter toys based on search and category, then sort with out-of-stock toys last
  const filteredToys = useMemo(() => {
    const filtered = availableToys.filter(toy => {
      const matchesSearch = toy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           toy.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || toy.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort toys with out-of-stock toys displayed last
    return filtered.sort((a, b) => {
      const toyA = toySearchData?.toys.find(t => t.id === a.toy_id);
      const toyB = toySearchData?.toys.find(t => t.id === b.toy_id);
      
      const aInStock = toyA && (toyA.available_quantity || 0) > 0 ? 1 : 0;
      const bInStock = toyB && (toyB.available_quantity || 0) > 0 ? 1 : 0;
      
      // In-stock toys first (1), out-of-stock toys last (0)
      if (aInStock !== bInStock) {
        return bInStock - aInStock;
      }
      
      // Within same stock status, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [availableToys, searchTerm, selectedCategory, toySearchData]);

  // Check if toy is selected
  const isToySelected = (toyId: string) => {
    return selectedToys.some(toy => toy.toy_id === toyId);
  };

  // Toggle toy selection with stock validation
  const toggleToySelection = (toy: ToyData) => {
    if (isToySelected(toy.toy_id)) {
      setSelectedToys(prev => prev.filter(t => t.toy_id !== toy.toy_id));
    } else {
      if (selectedToys.length >= toyLimit) {
        toast({
          title: "Selection Limit Reached",
          description: `You can only select ${toyLimit} toys for your next cycle.`,
          variant: "destructive"
        });
        return;
      }
      
      // Additional check: Verify toy is still in stock before selection
      const toyData = toySearchData?.toys.find(t => t.id === toy.toy_id);
      if (!toyData || !isToySelectable(toyData)) {
        toast({
          title: "Toy Unavailable",
          description: `${toy.name} is currently out of stock and cannot be selected.`,
          variant: "destructive"
        });
        return;
      }
      
      setSelectedToys(prev => [...prev, toy]);
      toast({
        title: "Toy Selected",
        description: `${toy.name} has been added to your next cycle selection.`,
      });
    }
  };

  // Update toy quantity
  const updateToyQuantity = (toyId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedToys(prev => prev.filter(t => t.toy_id !== toyId));
      return;
    }

    setSelectedToys(prev => prev.map(toy => 
      toy.toy_id === toyId 
        ? { ...toy, quantity, total_price: toy.unit_price * quantity }
        : toy
    ));
  };

  // Calculate totals (keep for internal logic, don't display pricing)
  const totalToys = selectedToys.reduce((sum, toy) => sum + toy.quantity, 0);
  const totalValue = selectedToys.reduce((sum, toy) => sum + toy.total_price, 0);

  // Get category distribution for subscription insights
  const categoryCount = selectedToys.reduce((acc, toy) => {
    acc[toy.category] = (acc[toy.category] || 0) + toy.quantity;
    return acc;
  }, {} as Record<string, number>);

  // Handle queue submission
  const handleSubmit = async () => {
    if (selectedToys.length === 0) {
      return;
    }

    if (existingToys.length > 0) {
      // Update existing queue
      nextCycleManager.updateToys({ userId, toys: selectedToys });
    } else {
      // Create new queue
      nextCycleManager.queueToys({ userId, toys: selectedToys });
    }
  };

  // Handle successful queue action
  React.useEffect(() => {
    if (!nextCycleManager.isQueueing && !nextCycleManager.isUpdating) {
      // Check if operation was successful by checking if there are no errors
      // This is a simple way to detect success; in a real app you might want more robust state management
      if (nextCycleManager.hasQueue && selectedToys.length > 0) {
        onSuccess();
      }
    }
  }, [nextCycleManager.isQueueing, nextCycleManager.isUpdating, nextCycleManager.hasQueue, selectedToys.length, onSuccess]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Select Toys for Next Cycle
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Choose up to {toyLimit} toys for your next rental cycle
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="browse">Browse Toys</TabsTrigger>
              <TabsTrigger value="selected">
                Selected ({totalToys}/{toyLimit})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="browse" className="px-6 pb-6 space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search toys..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>

            {/* Toy Grid */}
            <ScrollArea className="h-96">
              {toysLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
                    <p className="text-muted-foreground">Loading available toys...</p>
                  </div>
                </div>
              ) : filteredToys.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No toys available matching your criteria</p>
                    <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or category filter</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                  {filteredToys.map(toy => {
                  const isSelected = isToySelected(toy.toy_id);
                  const canSelect = !isSelected && totalToys < toyLimit;

                  return (
                    <Card
                      key={toy.toy_id}
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : canSelect 
                            ? 'hover:shadow-md' 
                            : 'opacity-50 cursor-not-allowed'
                      }`}
                      onClick={() => canSelect || isSelected ? toggleToySelection(toy) : null}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <img
                              src={toy.image_url || '/placeholder.svg'}
                              alt={toy.name}
                              className="w-16 h-16 rounded object-cover"
                            />
                            {isSelected && (
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                <Plus className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <h3 className="font-medium text-sm">{toy.name}</h3>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {toy.category}
                            </Badge>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500" />
                                <span className="text-xs text-muted-foreground">Premium toy</span>
                              </div>
                              <Checkbox
                                checked={isSelected}
                                disabled={!canSelect && !isSelected}
                                className="pointer-events-none"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            {filteredToys.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No toys found matching your search.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="selected" className="px-6 pb-6 space-y-4">
            {selectedToys.length > 0 ? (
              <ScrollArea className="h-96">
                <div className="space-y-3 pr-4">
                  {selectedToys.map(toy => (
                    <Card key={toy.toy_id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={toy.image_url || '/placeholder.svg'}
                            alt={toy.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                          
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">{toy.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {toy.category}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => updateToyQuantity(toy.toy_id, toy.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            
                            <span className="w-8 text-center text-sm font-medium">
                              {toy.quantity}
                            </span>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => updateToyQuantity(toy.toy_id, toy.quantity + 1)}
                              disabled={totalToys >= toyLimit}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => updateToyQuantity(toy.toy_id, 0)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No toys selected yet.</p>
                <p className="text-sm text-muted-foreground">Browse toys to add to your queue.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm">
              <span className="font-medium">Selected: {totalToys}/{toyLimit} toys</span>
              {Object.keys(categoryCount).length > 1 && (
                <div className="text-xs text-muted-foreground mt-1">
                  Mix: {Object.entries(categoryCount).map(([cat, count]) => `${cat}(${count})`).join(', ')}
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {toyLimit - totalToys} slots remaining
            </div>
          </div>

          {totalToys > toyLimit && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have selected too many toys. Please remove {totalToys - toyLimit} toy(s).
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedToys.length === 0 || totalToys > toyLimit || nextCycleManager.isQueueing || nextCycleManager.isUpdating}
              className="flex-1"
            >
              {nextCycleManager.isQueueing || nextCycleManager.isUpdating
                ? 'Processing...'
                : existingToys.length > 0
                  ? 'Update Queue'
                  : 'Queue for Next Cycle'
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 