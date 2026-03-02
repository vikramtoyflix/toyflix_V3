import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { imageService } from '@/services/imageService';
import { AGE_GROUP_CHECKBOX_OPTIONS } from '@/constants/ageGroups';
import { getSubscriptionCategoryForCategory, CATEGORY_LABELS, ToyCategory } from '@/constants/categoryMapping';
import {
  useSearchToys,
  useUpdateToy,
  useToyCategories,
  useToyAgeRanges,
  useSaveToyImages,
  ToyFormData
} from '@/hooks/useInventoryManagement';
import { ToyImageManager } from '@/components/admin/ToyImageManager';

interface ToyImage {
  id: string;
  toy_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

interface Toy {
  id: string;
  name: string;
  description?: string;
  category: string;
  subscription_category?: string;
  age_range: string;
  brand?: string;
  retail_price?: number;
  rental_price?: number;
  total_quantity: number;
  available_quantity: number;
  image_url?: string;
  is_featured: boolean;
}

const EditToy: React.FC = () => {
  const { toyId } = useParams<{ toyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [formData, setFormData] = useState<ToyFormData>({
    name: '',
    description: '',
    category: '',
    subscription_category: 'educational_toys',
    age_range: '',
    brand: '',
    retail_price: 0,
    rental_price: 0,
    total_quantity: 0,
    available_quantity: 0,
    image_url: '',
    is_featured: false
  });

  const [images, setImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Image loading states - matching ToyCard pattern
  const [toyImages, setToyImages] = useState<ToyImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);

  // Hooks
  const { data: categories } = useToyCategories();
  const { data: ageRanges } = useToyAgeRanges();
  const updateToyMutation = useUpdateToy();
  const saveToyImagesMutation = useSaveToyImages();
  
  // Get toy data
  const { data: toysData, isError } = useSearchToys({
    search: '',
    limit: 1000 // Get all toys to find the one we need
  });

  // Find the current toy
  const currentToy = toysData?.toys?.find(toy => toy.id === toyId);

  // Fetch toy images - EXACT SAME LOGIC AS ToyCard
  useEffect(() => {
    const fetchImages = async () => {
      if (!toyId) {
        return;
      }
      
      setIsLoadingImages(true);
      try {
        const { data: imageData, error } = await supabase
          .from('toy_images')
          .select('*')
          .eq('toy_id', toyId)
          .order('display_order');

        if (error && error.code !== 'PGRST116') {
          console.warn('Error fetching toy images:', error);
        }

        if (imageData && imageData.length > 0) {
          setToyImages(imageData);
          // Set primary image or first image as current
          const primaryImage = imageData.find(img => img.is_primary) || imageData[0];
          const primaryIndex = imageData.findIndex(img => img.image_url === primaryImage.image_url);
          const finalPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;
          
          // Convert all images using the SAME logic as ToyCard
          const convertedImages = imageData.map(img => convertToPublicUrl(img.image_url));
          
          setImages(convertedImages);
          setPrimaryImageIndex(finalPrimaryIndex);
          
          console.log('✅ EditToy: Loaded images using ToyCard logic:', {
            rawImages: imageData,
            convertedImages,
            primaryIndex: finalPrimaryIndex
          });
        } else {
          setToyImages([]);
          setImages([]);
          setPrimaryImageIndex(0);
          console.log('ℹ️ EditToy: No images found for toy');
        }
      } catch (error) {
        console.error('EditToy: Error fetching images:', error);
        setToyImages([]);
        setImages([]);
        setPrimaryImageIndex(0);
      } finally {
        setIsLoadingImages(false);
      }
    };

    fetchImages();
  }, [toyId]);

  // Convert S3 URLs to public URLs - EXACT SAME LOGIC AS ToyCard
  const convertToPublicUrl = (s3Url: string): string => {
    if (!s3Url) return s3Url;
    return s3Url.replace('/storage/v1/s3/', '/storage/v1/object/public/');
  };

  // Load toy data when found
  useEffect(() => {
    if (currentToy) {
      console.log('📄 EditToy: Loading toy data:', currentToy);
      
      // Parse age_range - handle both string and JSON array formats
      let processedAgeRange = '';
      if (currentToy.age_range) {
        try {
          // Try to parse as JSON array (new format)
          const ageArray = JSON.parse(currentToy.age_range);
          if (Array.isArray(ageArray)) {
            processedAgeRange = ageArray.join(', ');
          } else {
            processedAgeRange = currentToy.age_range;
          }
        } catch {
          // If parsing fails, use as-is (old string format)
          processedAgeRange = currentToy.age_range;
        }
      }
      
      setFormData({
        name: currentToy.name,
        description: currentToy.description || '',
        category: currentToy.category || '',
        subscription_category: currentToy.subscription_category || 'educational_toys',
        age_range: processedAgeRange,
        brand: currentToy.brand || '',
        retail_price: currentToy.retail_price || 0,
        rental_price: currentToy.rental_price || 0,
        total_quantity: currentToy.total_quantity,
        available_quantity: currentToy.available_quantity,
        image_url: currentToy.image_url || '',
        is_featured: currentToy.is_featured
      });
      setIsLoading(false);
    }
  }, [currentToy]);

  // Prepare options for dropdowns
  const categoryOptions = categories?.filter(category => category && category.trim());
  const ageRangeOptions = ageRanges?.filter(range => range && range.trim());

  const handleSave = async () => {
    if (!toyId) {
      toast({
        title: "Error",
        description: "No toy ID provided",
        variant: "destructive"
      });
      return;
    }

    // Validate quantities
    if (formData.available_quantity < 0) {
      toast({
        title: "Error", 
        description: "Available quantity cannot be negative",
        variant: "destructive"
      });
      return;
    }

    if (formData.total_quantity < formData.available_quantity) {
      toast({
        title: "Error",
        description: "Total quantity cannot be less than available quantity", 
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    let toyUpdateSucceeded = false;
    let imageUpdateSucceeded = false;

    try {
      // Process age_range for database storage
      const ageRangeArray = formData.age_range
        .split(',')
        .map(range => range.trim())
        .filter(range => range.length > 0);
      
      const processedFormData = {
        ...formData,
        age_range: JSON.stringify(ageRangeArray)
      };
      
      // Update toy data first
      console.log('💾 Updating toy data:', processedFormData);
      await updateToyMutation.mutateAsync({ id: toyId, ...processedFormData });
      toyUpdateSucceeded = true;
      console.log('✅ Toy data updated successfully');
      
      // Save images if any exist (separate operation that can fail independently)
      if (images.length > 0) {
        try {
          console.log('💾 Saving images:', images.length);
          await saveToyImagesMutation.mutateAsync({
            toyId,
            images,
            primaryImageIndex
          });
          imageUpdateSucceeded = true;
          console.log('✅ Images updated successfully');
        } catch (imageError) {
          console.warn('⚠️ Image update failed but toy data was saved:', imageError);
          // Don't throw error, just log it - toy update succeeded
        }
      } else {
        imageUpdateSucceeded = true; // No images to update
      }

      // Show appropriate success message
      if (toyUpdateSucceeded && imageUpdateSucceeded) {
        toast({
          title: "Success",
          description: "Toy updated successfully",
        });
      } else if (toyUpdateSucceeded && !imageUpdateSucceeded) {
        toast({
          title: "Partially Updated",
          description: "Toy data updated successfully, but some images may not have been saved",
          variant: "default"
        });
      }

      // Navigate back to admin inventory management
      navigate('/admin?tab=inventory-management');
    } catch (error) {
      console.error('❌ Error updating toy:', error);
      
      // Provide more specific error messages
      if (toyUpdateSucceeded) {
        toast({
          title: "Partially Updated",
          description: "Toy data was saved but images may not have been updated",
          variant: "default"
        });
        // Still navigate since the core update succeeded
        navigate('/admin?tab=inventory-management');
      } else {
        // Core toy update failed – show actual error when available
        let errorMessage = "Failed to update toy";
        if (error instanceof Error) {
          if (error.message.includes('permission') || error.message.includes('policy') || error.message.includes('Admin')) {
            errorMessage = "Permission denied. Please check your admin access.";
          } else if (error.message.includes('network') || error.message.includes('connection') || error.message.includes('fetch')) {
            errorMessage = "Network error. Please check your connection and try again.";
          } else if (error.message.includes('validation') || error.message.includes('Invalid')) {
            errorMessage = "Invalid data. Please check all fields and try again.";
          } else if (error.message && error.message !== "Failed to update toy") {
            errorMessage = error.message;
          }
        }
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/admin?tab=inventory-management');
  };

  // Show loading state
  if (isLoading || isLoadingImages) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-4">Loading toy data...</p>
        </div>
      </div>
    );
  }

  // Show error if toy not found
  if (!currentToy) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Toy Not Found</h2>
            <p className="text-muted-foreground mb-4">The toy with ID {toyId} could not be found.</p>
            <Button onClick={handleCancel} className="mt-4">
              Return to Inventory
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if failed to load toy data
  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Error Loading Toy</h2>
            <p className="text-muted-foreground mb-4">Failed to load toy data. Please try again.</p>
            <Button onClick={handleCancel} className="mt-4">
              Return to Inventory
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with breadcrumb and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Edit Toy</span>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="min-w-[120px]"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Toy Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Toy Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={formData.brand || ''}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => {
                        const newCategory = value as ToyCategory;
                        const autoSubscriptionCategory = getSubscriptionCategoryForCategory(newCategory);
                        
                        setFormData({ 
                          ...formData, 
                          category: newCategory,
                          subscription_category: autoSubscriptionCategory  // Auto-sync here
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions?.map((category) => (
                          <SelectItem key={category} value={category}>
                            {CATEGORY_LABELS[category as ToyCategory] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                              
                              setFormData({ ...formData, age_range: updatedAgeRanges.join(', ') });
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
                    <Label htmlFor="retail_price">Retail Price</Label>
                    <Input
                      id="retail_price"
                      type="number"
                      step="0.01"
                      value={formData.retail_price || ''}
                      onChange={(e) => setFormData({ ...formData, retail_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rental_price">Rental Price</Label>
                    <Input
                      id="rental_price"
                      type="number"
                      step="0.01"
                      value={formData.rental_price || ''}
                      onChange={(e) => setFormData({ ...formData, rental_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="total_quantity">Total Quantity *</Label>
                    <Input
                      id="total_quantity"
                      type="number"
                      value={formData.total_quantity || ''}
                      onChange={(e) => setFormData({ ...formData, total_quantity: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="available_quantity">Available Quantity *</Label>
                    <Input
                      id="available_quantity"
                      type="number"
                      value={formData.available_quantity || ''}
                      onChange={(e) => setFormData({ ...formData, available_quantity: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="subscription_category">
                    Subscription Category * 
                    <span className="text-xs text-green-600 ml-2">✓ Auto-synced from Category</span>
                  </Label>
                  <Select
                    value={formData.subscription_category}
                    onValueChange={(value) => setFormData({ ...formData, subscription_category: value })}
                  >
                    <SelectTrigger className="bg-green-50 border-green-200">
                      <SelectValue placeholder="Auto-selected from category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked as boolean })}
                  />
                  <Label htmlFor="is_featured">Featured Toy</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Image Management */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Images ({images.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingImages ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading images...</p>
                </div>
              ) : (
                <ToyImageManager
                  images={images}
                  onImagesChange={setImages}
                  primaryImageIndex={primaryImageIndex}
                  onPrimaryImageChange={setPrimaryImageIndex}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditToy; 