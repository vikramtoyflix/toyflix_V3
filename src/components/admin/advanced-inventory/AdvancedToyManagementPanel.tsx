import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, Upload, Download, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToysWithAgeBands } from '@/hooks/useToysWithAgeBands';
import { useNavigate } from 'react-router-dom';

export const AdvancedToyManagementPanel: React.FC = () => {
  const navigate = useNavigate();
  const { data: toys, isLoading } = useToysWithAgeBands();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Memoized filtered toys
  const filteredToys = useMemo(() => {
    if (!toys) return [];
    
    return toys.filter(toy => {
      const matchesSearch = !searchTerm || 
        toy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        toy.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        toy.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || toy.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [toys, searchTerm, categoryFilter]);

  // Get unique categories
  const categories = useMemo(() => {
    if (!toys) return [];
    return [...new Set(toys.map(toy => toy.category))].sort();
  }, [toys]);

  const handleSelectItem = (toyId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(toyId);
    } else {
      newSelected.delete(toyId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredToys.map(toy => toy.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleEditToy = (toyId: string) => {
    navigate(`/admin/new-toy-edit/${toyId}`);
  };

  const bulkActions = [
    { id: 'update_price', label: 'Update Price', icon: Edit },
    { id: 'update_category', label: 'Update Category', icon: Edit },
    { id: 'update_supplier', label: 'Update Supplier', icon: Edit },
    { id: 'export_selected', label: 'Export Selected', icon: Download },
  ];

  const handleBulkAction = (actionId: string) => {
    console.log('Bulk action:', actionId, 'for toys:', Array.from(selectedItems));
    // Implementation for bulk actions will be added here
  };

  const getStockStatus = (toy: any) => {
    if (toy.available_quantity === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (toy.available_quantity <= 5) return { label: 'Low Stock', variant: 'secondary' as const };
    return { label: 'In Stock', variant: 'default' as const };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Advanced Toy Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading toys...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Toy Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search toys..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Supplier Filter */}
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                <SelectItem value="toymart">ToyMart Suppliers</SelectItem>
                <SelectItem value="educational">Educational Toys Co.</SelectItem>
                <SelectItem value="premium">Premium Toy Distributors</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedItems.size > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedItems.size} toy{selectedItems.size > 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  {bulkActions.map((action) => (
                    <Button
                      key={action.id}
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkAction(action.id)}
                    >
                      <action.icon className="h-4 w-4 mr-1" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toys Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Toys ({filteredToys.length})</CardTitle>
            <Button onClick={() => navigate('/admin/new-toy-edit/new')}>
              <Package className="h-4 w-4 mr-2" />
              Add New Toy
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredToys.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No toys found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search filters or add some toys to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.size === filteredToys.length && filteredToys.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredToys.map((toy) => {
                  const stockStatus = getStockStatus(toy);
                  return (
                    <TableRow key={toy.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(toy.id)}
                          onCheckedChange={(checked) => handleSelectItem(toy.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {toy.image_url && (
                            <img
                              src={toy.image_url.includes('/storage/v1/s3/') 
                                ? toy.image_url.replace('/storage/v1/s3/', '/storage/v1/object/public/')
                                : toy.image_url
                              }
                              alt={toy.name}
                              className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded transition-all hover:scale-105"
                              loading="lazy"
                            />
                          )}
                          <div>
                            <p className="font-medium">{toy.name}</p>
                            {toy.brand && (
                              <p className="text-sm text-muted-foreground">{toy.brand}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{toy.category}</TableCell>
                      <TableCell>₹{toy.rental_price}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={toy.available_quantity > 0 ? "text-green-600" : "text-red-600"}>
                            {toy.available_quantity}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            of {toy.total_quantity}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={stockStatus.variant}>
                          {stockStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditToy(toy.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 