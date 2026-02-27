import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Plus, Trash2, Star, RefreshCw, Package, Tag, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toy } from "@/hooks/useToys";
import { useState } from "react";

interface AdminToysTableProps {
  toys: Toy[] | undefined;
  isLoading: boolean;
  selectedItems: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectItem: (toyId: string, checked: boolean) => void;
  onEditToy: (toyId: string) => void;
  onDeleteToy: (toyId: string, toyName: string) => void;
  deletingToyId: string | null;
  selectedCount: number;
}

export const AdminToysTable = ({
  toys,
  isLoading,
  selectedItems,
  onSelectAll,
  onSelectItem,
  onEditToy,
  onDeleteToy,
  deletingToyId,
  selectedCount
}: AdminToysTableProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (toyId: string) => {
    setImageErrors(prev => ({ ...prev, [toyId]: true }));
  };

  const getImageSrc = (toy: any) => {
    if (imageErrors[toy.id] || !toy.image_url) {
      return "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?q=80&w=400";
    }
    
    // Simple URL conversion: replace s3 path with public path (same as ToyCard)
    let imageUrl = toy.image_url;
    if (imageUrl.includes('/storage/v1/s3/')) {
      imageUrl = imageUrl.replace('/storage/v1/s3/', '/storage/v1/object/public/');
    }
    
    console.log('🔍 AdminToysTable converting URL:', toy.image_url, '→', imageUrl);
    return imageUrl;
  };

  const isSelected = (id: string) => selectedItems.has(id);

  // Mobile card layout for toys
  const MobileToysList = () => (
    <div className="space-y-3">
      {toys?.map((toy) => (
        <Card key={toy.id} className="p-4">
          <div className="space-y-3">
            {/* Toy Image and Basic Info */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <img 
                  src={getImageSrc(toy)} 
                  alt={toy.name}
                  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-cover rounded-lg border transition-all hover:scale-105"
                  onError={() => handleImageError(toy.id)}
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm truncate flex items-center gap-2">
                      {toy.is_featured && (
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-400 flex-shrink-0" />
                      )}
                      {toy.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        <Tag className="w-3 h-3 mr-1" />
                        {toy.category}
                      </Badge>
                      {toy.is_featured && (
                        <Badge variant="default" className="text-xs">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Checkbox
                    checked={isSelected(toy.id)}
                    onCheckedChange={(checked) => onSelectItem(toy.id, checked as boolean)}
                  />
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3 text-muted-foreground" />
                <span className={toy.available_quantity > 0 ? "text-green-600" : "text-red-600"}>
                  {toy.available_quantity}/{toy.total_quantity}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">
                  {toy.rental_price ? `₹${toy.rental_price}` : "—"}
                </span>
              </div>
              <div className="text-muted-foreground">
                Age: {toy.display_order}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onEditToy(toy.id)}
                className="flex-1 text-xs"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onDeleteToy(toy.id, toy.name)}
                disabled={deletingToyId === toy.id}
                className="flex-1 text-xs"
              >
                {deletingToyId === toy.id ? (
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3 mr-1" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className={isMobile ? 'text-sm' : ''}>Loading toys...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (toys?.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className={`text-muted-foreground mb-4 ${isMobile ? 'text-sm' : ''}`}>No toys found</p>
            <Button onClick={() => navigate('/admin/toys/new')} size={isMobile ? "sm" : "default"}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Toy
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={toys && toys.length > 0 && selectedCount === toys.length}
              onCheckedChange={onSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedCount > 0 ? `${selectedCount} selected` : `${toys?.length || 0} toys`}
            </span>
          </div>
          <Button 
            onClick={() => navigate('/admin/toys/new')} 
            size="sm"
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </div>
        <MobileToysList />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={toys && toys.length > 0 && selectedCount === toys.length}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Age Range</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Rental Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {toys?.map((toy: Toy) => (
              <TableRow key={toy.id}>
                <TableCell>
                  <Checkbox
                    checked={isSelected(toy.id)}
                    onCheckedChange={(checked) => onSelectItem(toy.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <img 
                    src={getImageSrc(toy)} 
                    alt={toy.name}
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-cover rounded-lg transition-all hover:scale-105"
                    onError={() => handleImageError(toy.id)}
                    loading="lazy"
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {toy.is_featured && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                          Carousel
                        </span>
                      </div>
                    )}
                    {toy.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {toy.category}
                  </Badge>
                </TableCell>
                <TableCell>{toy.display_order}</TableCell>
                <TableCell>{toy.brand || "—"}</TableCell>
                <TableCell>
                  {toy.rental_price ? `₹${toy.rental_price}` : "—"}
                </TableCell>
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
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onEditToy(toy.id)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onDeleteToy(toy.id, toy.name)}
                      disabled={deletingToyId === toy.id}
                      className="flex items-center gap-1"
                    >
                      {deletingToyId === toy.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
