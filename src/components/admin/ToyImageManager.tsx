import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { imageService } from '@/services/imageService';
import { 
  Upload, 
  X, 
  Star, 
  StarOff, 
  Image as ImageIcon,
  Loader2,
  Move,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToyImageManagerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  primaryImageIndex: number;
  onPrimaryImageChange: (index: number) => void;
  maxImages?: number;
}

export const ToyImageManager: React.FC<ToyImageManagerProps> = ({
  images,
  onImagesChange,
  primaryImageIndex,
  onPrimaryImageChange,
  maxImages = 10
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert S3 URLs to public URLs (same logic as ToyCard components)
  const convertToPublicUrl = (s3Url: string): string => {
    if (!s3Url) return '/placeholder.svg';
    
    console.log('🔍 ToyImageManager converting URL:', s3Url);
    
    // If it's already a full HTTP URL, return as-is
    if (s3Url.startsWith('http')) {
      console.log('✅ Using HTTP URL as-is:', s3Url);
      return s3Url;
    }
    
    // If it's a relative path starting with /, use as is (local asset)
    if (s3Url.startsWith('/')) {
      console.log('✅ Using relative path:', s3Url);
      return s3Url;
    }
    
    // Handle blob URLs (from file upload preview)
    if (s3Url.startsWith('blob:')) {
      console.log('✅ Using blob URL for preview:', s3Url);
      return s3Url;
    }
    
    // Simple URL conversion: replace s3 path with public path
    if (s3Url.includes('/storage/v1/s3/')) {
      const publicUrl = s3Url.replace('/storage/v1/s3/', '/storage/v1/object/public/');
      console.log('🔗 Converted S3 to public:', publicUrl);
      return publicUrl;
    }
    
    // If it contains public storage reference, use as-is
    if (s3Url.includes('storage/v1/object/public/')) {
      const publicUrl = s3Url.startsWith('https://') ? s3Url : `https://wucwpyitzqjukcphczhr.supabase.co/${s3Url.startsWith('/') ? s3Url.substring(1) : s3Url}`;
      console.log('✅ Using public storage URL:', publicUrl);
      return publicUrl;
    }
    
    // Fallback: treat as filename in toy-images bucket
    const fallbackUrl = `https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/${s3Url}`;
    console.log('🔄 Using fallback URL:', fallbackUrl);
    return fallbackUrl;
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    if (images.length + files.length > maxImages) {
      toast({
        title: "Too many images",
        description: `Maximum ${maxImages} images allowed`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const uploadedImages: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a valid image file`,
            variant: "destructive"
          });
          continue;
        }

        console.log(`🖼️ Uploading ${file.name}...`);
        
        // Upload the image using imageService
        const result = await imageService.uploadFile(
          file,
          `toy_image_${Date.now()}_${i}`
        );
        
        if (result.success && result.url) {
          console.log(`✅ Successfully uploaded: ${result.url}`);
          uploadedImages.push(result.url);
        } else {
          console.error(`❌ Failed to upload ${file.name}:`, result.error);
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}: ${result.error}`,
            variant: "destructive"
          });
        }
      }

      const updatedImages = [...images, ...uploadedImages];
      onImagesChange(updatedImages);
      
      toast({
        title: "Images uploaded",
        description: `${uploadedImages.length} image(s) uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    onImagesChange(updatedImages);
    
    // Adjust primary image index if needed
    if (index === primaryImageIndex) {
      onPrimaryImageChange(0);
    } else if (index < primaryImageIndex) {
      onPrimaryImageChange(primaryImageIndex - 1);
    }
  };

  const handleSetPrimary = (index: number) => {
    onPrimaryImageChange(index);
    toast({
      title: "Primary image updated",
      description: `Image ${index + 1} is now the primary image`,
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null) return;
    
    const updatedImages = [...images];
    const draggedImage = updatedImages[draggedIndex];
    
    // Remove the dragged image
    updatedImages.splice(draggedIndex, 1);
    
    // Insert at new position
    updatedImages.splice(dropIndex, 0, draggedImage);
    
    onImagesChange(updatedImages);
    
    // Update primary image index if needed
    if (draggedIndex === primaryImageIndex) {
      onPrimaryImageChange(dropIndex);
    } else if (draggedIndex < primaryImageIndex && dropIndex >= primaryImageIndex) {
      onPrimaryImageChange(primaryImageIndex - 1);
    } else if (draggedIndex > primaryImageIndex && dropIndex <= primaryImageIndex) {
      onPrimaryImageChange(primaryImageIndex + 1);
    }
    
    setDraggedIndex(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Toy Images ({images.length}/{maxImages})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || images.length >= maxImages}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {isUploading ? 'Uploading...' : 'Upload Images'}
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          
          <p className="text-xs text-muted-foreground text-center">
            Upload up to {maxImages} images. Drag to reorder. Click star to set primary.
          </p>
        </div>

        {/* Image Grid */}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={cn(
                  'relative group border-2 rounded-lg overflow-hidden cursor-move transition-all',
                  index === primaryImageIndex 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-muted hover:border-primary/50',
                  draggedIndex === index && 'opacity-50'
                )}
              >
                <div className="aspect-square relative">
                  <img
                    src={convertToPublicUrl(image)}
                    alt={`Toy image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Primary Badge */}
                  {index === primaryImageIndex && (
                    <Badge className="absolute top-1 left-1 text-xs">
                      Primary
                    </Badge>
                  )}
                  
                  {/* Image Order */}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-1 right-1 text-xs"
                  >
                    {index + 1}
                  </Badge>
                  
                  {/* Hover Controls */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSetPrimary(index)}
                      className="text-xs p-1 h-7"
                    >
                      {index === primaryImageIndex ? (
                        <Star className="w-3 h-3 fill-current" />
                      ) : (
                        <StarOff className="w-3 h-3" />
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveImage(index)}
                      className="text-xs p-1 h-7"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground mb-2">No images uploaded</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload First Image
            </Button>
          </div>
        )}
        
        {/* Image Instructions */}
        {images.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded">
            <p><strong>Instructions:</strong></p>
            <p>• <Star className="w-3 h-3 inline" /> = Set as primary image (shown first)</p>
            <p>• <Move className="w-3 h-3 inline" /> = Drag images to reorder</p>
            <p>• <X className="w-3 h-3 inline" /> = Remove image</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 