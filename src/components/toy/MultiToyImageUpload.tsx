import React, { useState, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, GripVertical, Star, ImageIcon, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { imageService } from "@/services/imageService";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { 
  compressImage, 
  validateImageFile, 
  formatFileSize, 
  getOptimalFormat 
} from '@/utils/imageOptimization';

interface MultiToyImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  primaryImageIndex?: number;
  onPrimaryImageChange?: (index: number) => void;
}

const MultiToyImageUpload: React.FC<MultiToyImageUploadProps> = ({ 
  images, 
  onImagesChange,
  primaryImageIndex = 0,
  onPrimaryImageChange
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [optimizationStats, setOptimizationStats] = useState<{
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert S3 URLs to public URLs for proper display
  const convertToPublicUrl = (s3Url: string): string => {
    if (!s3Url) return s3Url;
    // Convert from S3 format to public format
    if (s3Url.includes('/storage/v1/s3/')) {
      return s3Url.replace('/storage/v1/s3/', '/storage/v1/object/public/');
    }
    return s3Url;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;

    try {
      console.log(`🖼️ Starting optimized upload of ${files.length} files`);
      
      const uploadPromises = Array.from(files).map(async (file, index) => {
        // Validate file before processing
        const validation = validateImageFile(file, {
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
        });

        if (!validation.valid) {
          throw new Error(`File ${file.name}: ${validation.error}`);
        }

        console.log(`📁 Processing file ${index + 1}: ${file.name}, size: ${formatFileSize(file.size)}`);

        // Compress image before upload for better performance
        const optimized = await compressImage(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.85,
          format: getOptimalFormat()
        });

        totalOriginalSize += optimized.originalSize;
        totalOptimizedSize += optimized.optimizedSize;

        console.log(`✨ Optimized file ${index + 1}: ${formatFileSize(optimized.originalSize)} → ${formatFileSize(optimized.optimizedSize)} (${optimized.compressionRatio.toFixed(1)}% saved)`);

        // Upload the optimized image
        const result = await imageService.uploadFile(
          new File([optimized.blob], file.name, { type: optimized.blob.type }),
          `toy_${Date.now()}_${index}`
        );
        
        if (result.success && result.url) {
          console.log(`✅ Successfully uploaded optimized file ${index + 1}: ${result.url}`);
          return result.url;
        } else {
          console.error(`❌ Failed to upload file ${index + 1}:`, result.error);
          throw new Error(result.error || 'Upload failed');
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const newImages = [...images, ...uploadedUrls];
      onImagesChange(newImages);
      
      // Update optimization stats
      const compressionRatio = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100;
      setOptimizationStats({
        originalSize: totalOriginalSize,
        optimizedSize: totalOptimizedSize,
        compressionRatio
      });
      
      console.log(`🎉 All uploads completed successfully. Total compression: ${formatFileSize(totalOriginalSize)} → ${formatFileSize(totalOptimizedSize)} (${compressionRatio.toFixed(1)}% saved)`);
      
      toast({
        title: "Images Optimized & Uploaded! ✨",
        description: `${uploadedUrls.length} image(s) uploaded. Saved ${compressionRatio.toFixed(1)}% file size through optimization.`
      });
    } catch (error) {
      console.error('❌ Error uploading optimized images:', error);
      toast({
        title: "Upload Failed",
        description: `Failed to upload images: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset the input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    
    // Adjust primary image index if needed
    if (onPrimaryImageChange) {
      if (index === primaryImageIndex) {
        onPrimaryImageChange(0); // Set first image as primary
      } else if (index < primaryImageIndex) {
        onPrimaryImageChange(primaryImageIndex - 1);
      }
    }
  };

  const setPrimaryImage = (index: number) => {
    if (onPrimaryImageChange) {
      onPrimaryImageChange(index);
    }
  };

  const onDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onImagesChange(items);

    // Update primary image index if needed
    if (onPrimaryImageChange) {
      if (result.source.index === primaryImageIndex) {
        onPrimaryImageChange(result.destination.index);
      } else if (result.source.index < primaryImageIndex && result.destination.index >= primaryImageIndex) {
        onPrimaryImageChange(primaryImageIndex - 1);
      } else if (result.source.index > primaryImageIndex && result.destination.index <= primaryImageIndex) {
        onPrimaryImageChange(primaryImageIndex + 1);
      }
    }
  }, [images, onImagesChange, primaryImageIndex, onPrimaryImageChange]);

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="images" className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Product Images
        </Label>
        <div className="flex items-center gap-4 mt-2">
          <Input
            ref={fileInputRef}
            id="images"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            disabled={isUploading}
            className="cursor-pointer"
          />
          <Button 
            type="button" 
            onClick={triggerFileInput}
            disabled={isUploading} 
            size="sm"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Optimizing & Uploading...' : 'Upload Images'}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground mt-1 space-y-1">
          <p>Upload multiple images. Images will be automatically optimized for better performance.</p>
          {optimizationStats && (
            <p className="flex items-center gap-1 text-green-600 font-medium">
              <Zap className="w-3 h-3" />
              Last upload saved {optimizationStats.compressionRatio.toFixed(1)}% file size 
              ({formatFileSize(optimizationStats.originalSize)} → {formatFileSize(optimizationStats.optimizedSize)})
            </p>
          )}
        </div>
      </div>

      {images.length > 0 && (
        <div>
          <Label>Uploaded Images (drag to reorder)</Label>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="images">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2"
                >
                  {images.map((imageUrl, index) => (
                    <Draggable key={`${imageUrl}-${index}`} draggableId={`${imageUrl}-${index}`} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`relative group border rounded-lg overflow-hidden ${
                            snapshot.isDragging ? 'shadow-lg scale-105' : ''
                          } ${index === primaryImageIndex ? 'ring-2 ring-yellow-400' : ''} transition-all duration-200`}
                        >
                          <div {...provided.dragHandleProps} className="absolute top-2 left-2 z-10">
                            <GripVertical className="w-4 h-4 text-white bg-black/50 rounded p-0.5 backdrop-blur-sm" />
                          </div>
                          
                          {index === primaryImageIndex && (
                            <div className="absolute top-2 left-8 z-10">
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-md" />
                            </div>
                          )}

                          <OptimizedImage
                            src={convertToPublicUrl(imageUrl)}
                            alt={`Product image ${index + 1}`}
                            className="w-full h-32"
                            aspectRatio="auto"
                            lazy={index > 2} // Lazy load images after the first 3
                            priority={index === primaryImageIndex} // Prioritize primary image
                            showLoadingState={true}
                            fallbackSrc={imageService.getFallbackChain('toy')[0]}
                          />
                          
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 scale-90 group-hover:scale-100">
                              {index !== primaryImageIndex && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setPrimaryImage(index)}
                                  className="text-xs backdrop-blur-sm bg-white/90 hover:bg-white"
                                >
                                  Set Primary
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => removeImage(index)}
                                className="backdrop-blur-sm bg-red-500/90 hover:bg-red-600"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}
    </div>
  );
};

export default MultiToyImageUpload;
