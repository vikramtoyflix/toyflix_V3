import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AGE_GROUP_CHECKBOX_OPTIONS } from '@/constants/ageGroups';
import { getSubscriptionCategoryForCategory, CATEGORY_LABELS, ToyCategory } from '@/constants/categoryMapping';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Download, 
  Upload,
  RefreshCw,
  Filter,
  MoreHorizontal,
  Package,
  AlertTriangle,
  Check,
  X,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  useSearchToys,
  useCreateToy,
  useUpdateToy,
  useDeleteToy,
  useBulkDeleteToys,
  useBulkUpdateQuantities,
  useToyCategories,
  useToyAgeRanges,
  useToyImages,
  useSaveToyImages,
  ToyFormData,
  ToyUpdateData
} from '@/hooks/useInventoryManagement';
import { ToyImageDisplay } from '@/components/admin/ToyImageDisplay';
import { ToyImageManager } from '@/components/admin/ToyImageManager';

interface Toy {
  id: string;
  name: string;
  description?: string;
  category: string;
  age_range: string;
  brand?: string;
  retail_price?: number;
  rental_price?: number;
  total_quantity: number;
  available_quantity: number;
  image_url?: string;
  is_featured: boolean;
  rating?: number;
  pack?: string;
  min_age?: number;
  max_age?: number;
  show_strikethrough_pricing?: boolean;
  display_order?: number;
  subscription_category?: string;
  sku?: string;
  created_at: string;
  updated_at?: string;
}

const InventoryCRUD: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State for filters and search
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    age_range: '',
    is_featured: undefined as boolean | undefined,
    low_stock: false,
    out_of_stock: false,
    include_deleted: false, // Add option to show deleted toys
    limit: 50,
    offset: 0
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Update filters when pagination changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize
    }));
  }, [currentPage, pageSize]);

  // Reset to first page when filters change
  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, ...newFilters, offset: 0 }));
  };
  
  // State for modals and forms
  const [selectedToys, setSelectedToys] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<ToyFormData>({
    name: '',
    description: '',
    category: '',
    subscription_category: 'educational_toys', // Add default value
    age_range: '',
    brand: '',
    retail_price: 0,
    rental_price: 0,
    total_quantity: 0,
    available_quantity: 0,
    image_url: '',
    is_featured: false
  });

  // Image management state
  const [images, setImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);

  // Hooks
  const { data: toysData, isLoading, refetch } = useSearchToys(filters);
  const { data: categories } = useToyCategories();
  const { data: ageRanges } = useToyAgeRanges();
  const createToyMutation = useCreateToy();
  const updateToyMutation = useUpdateToy();
  const deleteToyMutation = useDeleteToy();
  const bulkDeleteMutation = useBulkDeleteToys();
  const bulkUpdateMutation = useBulkUpdateQuantities();
  const saveToyImagesMutation = useSaveToyImages();

  // Load toy images when editing
  const { data: editingToyImages } = useToyImages(''); // No longer needed

  // No longer needed - remove the useEffect for editing toy images
  // React.useEffect(() => {
  //   if (editingToyImages && editingToyImages.length > 0 && editingToy) {
  //     console.log('📸 Loading existing images for toy:', editingToy.name, editingToyImages);
  //     const imageUrls = editingToyImages
  //       .sort((a, b) => a.display_order - b.display_order)
  //       .map(img => img.image_url);
      
  //     setImages(imageUrls);
      
  //     // Find primary image index
  //     const primaryIndex = editingToyImages.findIndex(img => img.is_primary);
  //     setPrimaryImageIndex(primaryIndex >= 0 ? primaryIndex : 0);
  //   } else if (!editingToy) {
  //     // Reset when not editing
  //     setImages([]);
  //     setPrimaryImageIndex(0);
  //   }
  // }, [editingToyImages, editingToy]);

  const toys = toysData?.toys || [];
  const totalCount = toysData?.totalCount || 0;

  // Calculate pagination values
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      subscription_category: 'educational_toys', // Add default value
      age_range: '',
      brand: '',
      retail_price: 0,
      rental_price: 0,
      total_quantity: 0,
      available_quantity: 0,
      image_url: '',
      is_featured: false
    });
    
    // Reset image state
    setImages([]);
    setPrimaryImageIndex(0);
  };

  // Handle form submission (only for creating new toys)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate quantities
    if (formData.available_quantity < 0) {
      toast({
        title: "Error",
        description: "Available quantity cannot be negative",
        variant: "destructive",
      });
      return;
    }

    if (formData.total_quantity < formData.available_quantity) {
      toast({
        title: "Error",
        description: "Total quantity cannot be less than available quantity",
        variant: "destructive",
      });
      return;
    }

    try {
      // Process age_range for database storage
      const ageRangeArray = formData.age_range
        ?.split(',')
        .map(range => range.trim())
        .filter(range => range.length > 0) || [];
      
      const processedFormData = {
        ...formData,
        age_range: JSON.stringify(ageRangeArray)
      };
      
      // Create new toy
      const newToy = await createToyMutation.mutateAsync(processedFormData);
      
      // Save images if any
      if (images.length > 0 && newToy?.id) {
        await saveToyImagesMutation.mutateAsync({
          toyId: newToy.id,
          images,
          primaryImageIndex
        });
      }
      
      toast({
        title: "Success",
        description: "Toy created successfully",
      });
      
      setIsAddDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Handle edit
  const handleEdit = (toy: Toy) => {
    console.log('📝 Navigating to edit toy:', toy.name, toy.id);
    navigate(`/admin/inventory/edit/${toy.id}`);
  };

  // Handle delete
  const handleDelete = async (toyId: string) => {
    if (window.confirm('Are you sure you want to delete this toy?')) {
      try {
        await deleteToyMutation.mutateAsync(toyId);
        toast({
          title: "Success",
          description: "Toy deleted successfully",
        });
        refetch();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete toy",
          variant: "destructive",
        });
      }
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedToys.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedToys.length} toys?`)) {
      try {
        await bulkDeleteMutation.mutateAsync(selectedToys);
        toast({
          title: "Success",
          description: `${selectedToys.length} toys deleted successfully`,
        });
        setSelectedToys([]);
        refetch();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete toys",
          variant: "destructive",
        });
      }
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Name', 'Category', 'Age Range', 'Brand', 'Retail Price', 'Rental Price',
      'Total Quantity', 'Available Quantity', 'Featured', 'Rating', 'Created'
    ];

    const rows = toys.map(toy => [
      toy.name,
      toy.category,
      toy.age_range,
      toy.brand || '',
      toy.retail_price || 0,
      toy.rental_price || 0,
      toy.total_quantity,
      toy.available_quantity,
      toy.is_featured ? 'Yes' : 'No',
      toy.rating || 'N/A',
      format(new Date(toy.created_at), 'yyyy-MM-dd')
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Toggle selection
  const toggleSelection = (toyId: string) => {
    setSelectedToys(prev => 
      prev.includes(toyId) 
        ? prev.filter(id => id !== toyId)
        : [...prev, toyId]
    );
  };

  // Select all
  const toggleSelectAll = () => {
    setSelectedToys(
      selectedToys.length === toys.length ? [] : toys.map(toy => toy.id)
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Add, edit, and manage your toy inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Toy
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Toys</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {toys.filter(toy => toy.available_quantity > 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {toys.filter(toy => toy.available_quantity <= 2 && toy.available_quantity > 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <X className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {toys.filter(toy => toy.available_quantity === 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search toys..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="pl-9"
              />
            </div>
            
            <Select value={filters.category || "all"} onValueChange={(value) => updateFilters({ category: value === "all" ? "" : value })}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.filter(category => category && category.trim()).map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.age_range || "all"} onValueChange={(value) => updateFilters({ age_range: value === "all" ? "" : value })}>
              <SelectTrigger>
                <SelectValue placeholder="Age Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                {ageRanges?.filter(range => range && range.trim()).map(range => (
                  <SelectItem key={range} value={range}>{range}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="low-stock"
                checked={filters.low_stock}
                onCheckedChange={(checked) => updateFilters({ low_stock: !!checked })}
              />
              <Label htmlFor="low-stock">Low Stock</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="out-of-stock"
                checked={filters.out_of_stock}
                onCheckedChange={(checked) => updateFilters({ out_of_stock: !!checked })}
              />
              <Label htmlFor="out-of-stock">Out of Stock</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="featured"
                checked={filters.is_featured || false}
                onCheckedChange={(checked) => updateFilters({ is_featured: checked ? true : undefined })}
              />
              <Label htmlFor="featured">Featured Only</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-deleted"
                checked={filters.include_deleted}
                onCheckedChange={(checked) => updateFilters({ include_deleted: !!checked })}
              />
              <Label htmlFor="include-deleted">Include Deleted Toys</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedToys.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedToys.length} toy(s) selected
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedToys([])}>
                  Clear Selection
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toys Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Toys ({totalCount})</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedToys.length === toys.length && toys.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <Label>Select All</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : toys.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No toys found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {toys.map((toy) => (
                <div key={toy.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedToys.includes(toy.id)}
                      onCheckedChange={() => toggleSelection(toy.id)}
                    />
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                      {/* Add Image Column */}
                      <div className="flex items-center gap-2">
                        {toy.image_url ? (
                          <img
                            src={toy.image_url.includes('/storage/v1/s3/') 
                              ? toy.image_url.replace('/storage/v1/s3/', '/storage/v1/object/public/')
                              : toy.image_url
                            }
                            alt={toy.name}
                            className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-cover rounded-lg border transition-all hover:scale-105 flex-shrink-0"
                            onError={(e) => {
                              // Fallback to placeholder
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?q=80&w=400";
                            }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-muted rounded-lg border flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="font-medium">{toy.name}</div>
                        <div className="text-sm text-muted-foreground">{toy.brand}</div>
                      </div>
                      
                      <div className="text-sm">
                        <Badge variant="outline">{toy.category}</Badge>
                      </div>
                      
                      <div className="text-sm">{toy.age_range}</div>
                      
                      <div className="text-sm">
                        <div>Total: {toy.total_quantity}</div>
                        <div className={`${toy.available_quantity === 0 ? 'text-red-600' : toy.available_quantity <= 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                          Available: {toy.available_quantity}
                        </div>
                      </div>
                      
                      <div>
                        {toy.is_featured && <Badge className="mr-1">Featured</Badge>}
                        <Badge variant={toy.available_quantity > 0 ? "default" : "secondary"}>
                          {toy.available_quantity > 0 ? "In Stock" : "Out of Stock"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(toy)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(toy.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        
        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center space-x-2">
              <p className="text-sm text-muted-foreground">
                Showing {startItem} to {endItem} of {totalCount} toys
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">Rows per page:</p>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => handlePageSizeChange(Number(value))}
                >
                  <SelectTrigger className="h-8 w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Add Dialog (Edit is now on separate page) */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Toy</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="Enter brand name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category || "select-category"} onValueChange={(value) => {
                  if (value === "select-category") {
                    setFormData(prev => ({ ...prev, category: "", subscription_category: 'educational_toys' }));
                  } else {
                    const newCategory = value as ToyCategory;
                    const autoSubscriptionCategory = getSubscriptionCategoryForCategory(newCategory);
                    
                    setFormData(prev => ({ 
                      ...prev, 
                      category: newCategory,
                      subscription_category: autoSubscriptionCategory  // Auto-sync here
                    }));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select-category">Select category</SelectItem>
                    {categories?.filter(category => category && category.trim()).map(category => (
                      <SelectItem key={category} value={category}>
                        {CATEGORY_LABELS[category as ToyCategory] || category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="age_range">Age Range *</Label>
                <p className="text-sm text-gray-600 mb-2">Select all applicable age groups</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2 p-3 border rounded-lg bg-gray-50">
                  {AGE_GROUP_CHECKBOX_OPTIONS.map(ageGroup => (
                    <div key={ageGroup.value} className="flex items-center space-x-2 p-2 rounded hover:bg-white transition-colors">
                      <Checkbox
                        id={ageGroup.value}
                        checked={formData.age_range
                          ?.split(',')
                          .map(range => range.trim())
                          .includes(ageGroup.label) || false}
                        onCheckedChange={(checked) => {
                          const currentAgeRanges = formData.age_range
                            ?.split(',')
                            .map(range => range.trim())
                            .filter(range => range.length > 0) || [];
                          
                          let updatedAgeRanges: string[];
                          if (checked) {
                            updatedAgeRanges = [...currentAgeRanges, ageGroup.label];
                          } else {
                            updatedAgeRanges = currentAgeRanges.filter(range => range !== ageGroup.label);
                          }
                          
                          setFormData(prev => ({ 
                            ...prev, 
                            age_range: updatedAgeRanges.join(', ') 
                          }));
                        }}
                      />
                      <Label htmlFor={ageGroup.value} className="text-sm font-medium cursor-pointer">
                        {ageGroup.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subscription_category">
                  Subscription Category * 
                  <span className="text-xs text-blue-600 ml-2">✓ Auto-synced</span>
                </Label>
                <Select value={formData.subscription_category || "educational_toys"} onValueChange={(value) => setFormData(prev => ({ ...prev, subscription_category: value }))}>
                  <SelectTrigger className="bg-blue-50 border-blue-200">
                    <SelectValue placeholder="Auto-selected from category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="Enter brand name"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="retail_price">Retail Price</Label>
                <Input
                  id="retail_price"
                  type="number"
                  step="0.01"
                  value={formData.retail_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, retail_price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="rental_price">Rental Price</Label>
                <Input
                  id="rental_price"
                  type="number"
                  step="0.01"
                  value={formData.rental_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, rental_price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="total_quantity">Total Quantity *</Label>
                <Input
                  id="total_quantity"
                  type="number"
                  value={formData.total_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_quantity: parseInt(e.target.value) || 0 }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="available_quantity">Available Quantity *</Label>
                <Input
                  id="available_quantity"
                  type="number"
                  value={formData.available_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, available_quantity: parseInt(e.target.value) || 0 }))}
                  required
                />
              </div>
              
              {/* Image Management Section */}
              <ToyImageManager
                images={images}
                onImagesChange={setImages}
                primaryImageIndex={primaryImageIndex}
                onPrimaryImageChange={setPrimaryImageIndex}
                maxImages={8}
              />
            </div>

            {/* Legacy Image URL Field (for backward compatibility) */}
            <div>
              <Label htmlFor="image_url">Legacy Image URL (optional)</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://example.com/image.jpg (optional - use image manager above)"
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: !!checked }))}
                />
                <Label htmlFor="is_featured">Featured</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                disabled={createToyMutation.isPending || updateToyMutation.isPending}
              >
                {createToyMutation.isPending || updateToyMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryCRUD; 