import React, { useState, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  X, 
  GripVertical, 
  Star, 
  ImageIcon, 
  Zap, 
  Crop,
  Palette,
  Sparkles,
  Eye,
  Copy,
  Download,
  RotateCcw,
  Maximize2
} from "lucide-react";
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
import { ImageAnalysis } from '@/types/inventory';

interface AdvancedImageUploadProps {
  toyId: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  primaryImageIndex?: number;
  onPrimaryImageChange?: (index: number) => void;
  // Advanced features
  allowBatchUpload?: boolean;
  enableImageOptimization?: boolean;
  supportedFormats?: string[];
  maxImages?: number;
  // AI-powered features
  enableAutoTagging?: boolean;
  enableDuplicateDetection?: boolean;
  onImageAnalysis?: (imageUrl: string) => Promise<ImageAnalysis>;
}

interface BatchOperation {
  type: 'compress' | 'resize' | 'watermark' | 'analyze';
  params: any;
}

export const AdvancedImageUpload: React.FC<AdvancedImageUploadProps> = ({ 
  toyId,
  images, 
  onImagesChange,
  primaryImageIndex = 0,
  onPrimaryImageChange,
  allowBatchUpload = true,
  enableImageOptimization = true,
  supportedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  maxImages = 10,
  enableAutoTagging = false,
  enableDuplicateDetection = false,
  onImageAnalysis
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [batchOperation, setBatchOperation] = useState<BatchOperation | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageAnalyses, setImageAnalyses] = useState<Record<string, ImageAnalysis>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert S3 URLs to public URLs for proper display
  const convertToPublicUrl = (s3Url: string): string => {
    if (!s3Url) return s3Url;
    if (s3Url.includes('/storage/v1/s3/')) {
      return s3Url.replace('/storage/v1/s3/', '/storage/v1/object/public/');
    }
    return s3Url;
  };

  const handleImageUpload = async (files: FileList) => {
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
    setUploadProgress(0);
    
    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        // Validate file
        const validation = validateImageFile(file, {
          maxSize: 10 * 1024 * 1024,
          allowedTypes: supportedFormats
        });

        if (!validation.valid) {
          throw new Error(`File ${file.name}: ${validation.error}`);
        }

        // Compress image if optimization is enabled
        let processedFile = file;
        if (enableImageOptimization) {
          const optimized = await compressImage(file, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.85,
            format: getOptimalFormat()
          });
          processedFile = new File([optimized.blob], file.name, { type: optimized.blob.type });
        }

        // Upload the image
        const result = await imageService.uploadFile(
          processedFile,
          `${toyId}_${Date.now()}_${index}`
        );
        
        if (result.success && result.url) {
          // Update progress
          setUploadProgress((prev) => prev + (100 / files.length));
          
          // Analyze image if enabled
          if (onImageAnalysis && enableAutoTagging) {
            try {
              const analysis = await onImageAnalysis(result.url);
              setImageAnalyses(prev => ({ ...prev, [result.url]: analysis }));
            } catch (error) {
              console.warn('Image analysis failed:', error);
            }
          }
          
          return result.url;
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const newImages = [...images, ...uploadedUrls];
      
      // Check for duplicates if enabled
      if (enableDuplicateDetection) {
        // Simple duplicate detection based on file size/name
        // More sophisticated detection would require image hash comparison
        console.log('Duplicate detection not yet implemented');
      }
      
      onImagesChange(newImages);
      
      toast({
        title: "Images uploaded successfully! ✨",
        description: `${uploadedUrls.length} image(s) uploaded and optimized.`
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Upload Failed",
        description: `Failed to upload images: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleImageUpload(files);
    }
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files && allowBatchUpload) {
      handleImageUpload(files);
    }
  }, [allowBatchUpload]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    
    // Adjust primary image index
    if (onPrimaryImageChange) {
      if (index === primaryImageIndex) {
        onPrimaryImageChange(0);
      } else if (index < primaryImageIndex) {
        onPrimaryImageChange(primaryImageIndex - 1);
      }
    }
    
    // Remove from selected images
    const newSelected = new Set(selectedImages);
    newSelected.delete(index);
    // Adjust selected indices
    const adjustedSelected = new Set<number>();
    newSelected.forEach(selectedIndex => {
      if (selectedIndex > index) {
        adjustedSelected.add(selectedIndex - 1);
      } else if (selectedIndex < index) {
        adjustedSelected.add(selectedIndex);
      }
    });
    setSelectedImages(adjustedSelected);
  };

  const setPrimaryImage = (index: number) => {
    if (onPrimaryImageChange) {
      onPrimaryImageChange(index);
    }
  };

  const toggleImageSelection = (index: number) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedImages(newSelected);
  };

  const selectAllImages = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(Array.from({ length: images.length }, (_, i) => i)));
    }
  };

  const handleBatchCompress = async (quality: number) => {
    if (selectedImages.size === 0) return;
    
    toast({
      title: "Batch Compression",
      description: `Compressing ${selectedImages.size} images...`
    });
    
    // Implementation for batch compression
    console.log('Batch compress with quality:', quality, 'for images:', Array.from(selectedImages));
  };

  const handleBatchResize = async (dimensions: { width: number; height: number }) => {
    if (selectedImages.size === 0) return;
    
    toast({
      title: "Batch Resize",
      description: `Resizing ${selectedImages.size} images...`
    });
    
    // Implementation for batch resize
    console.log('Batch resize to:', dimensions, 'for images:', Array.from(selectedImages));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const newImages = Array.from(images);
    const [reorderedItem] = newImages.splice(result.source.index, 1);
    newImages.splice(result.destination.index, 0, reorderedItem);

    onImagesChange(newImages);
    
    // Update primary image index if needed
    if (onPrimaryImageChange) {
      if (result.source.index === primaryImageIndex) {
        onPrimaryImageChange(result.destination.index);
      } else if (result.destination.index <= primaryImageIndex && result.source.index > primaryImageIndex) {
        onPrimaryImageChange(primaryImageIndex + 1);
      } else if (result.destination.index > primaryImageIndex && result.source.index < primaryImageIndex) {
        onPrimaryImageChange(primaryImageIndex - 1);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Label className="text-lg font-semibold">Advanced Image Management</Label>
      
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload & Organize</TabsTrigger>
          <TabsTrigger value="edit">Batch Operations</TabsTrigger>
          <TabsTrigger value="analyze">AI Analysis</TabsTrigger>
        </TabsList>

        {/* Upload & Organize Tab */}
        <TabsContent value="upload" className="space-y-4">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={supportedFormats.join(',')}
              multiple={allowBatchUpload}
              onChange={handleFileInputChange}
              className="hidden"
            />
            
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">
                  {allowBatchUpload ? 'Drop images here or click to upload' : 'Click to upload image'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Supports {supportedFormats.map(f => f.split('/')[1]).join(', ')} • Max {maxImages} images
                </p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || images.length >= maxImages}
              >
                <Upload className="h-4 w-4 mr-2" />
                {allowBatchUpload ? 'Choose Images' : 'Choose Image'}
              </Button>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uploading images...</span>
                <span className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Image Grid */}
          {images.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  Images ({images.length}/{maxImages})
                </Label>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={selectAllImages}>
                    {selectedImages.size === images.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedImages.size > 0 && (
                    <Badge variant="secondary">{selectedImages.size} selected</Badge>
                  )}
                </div>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="images" direction="horizontal">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    >
                      {images.map((imageUrl, index) => (
                        <Draggable key={imageUrl} draggableId={imageUrl} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`relative group border-2 rounded-lg overflow-hidden transition-all ${
                                index === primaryImageIndex ? 'border-primary ring-2 ring-primary/20' : 'border-muted'
                              } ${selectedImages.has(index) ? 'ring-2 ring-blue-500/50' : ''} ${
                                snapshot.isDragging ? 'shadow-lg scale-105' : ''
                              }`}
                            >
                              {/* Selection Checkbox */}
                              <div className="absolute top-2 left-2 z-10">
                                <Checkbox
                                  checked={selectedImages.has(index)}
                                  onCheckedChange={() => toggleImageSelection(index)}
                                  className="bg-white/80 border-gray-400"
                                />
                              </div>

                              {/* Primary Badge */}
                              {index === primaryImageIndex && (
                                <Badge className="absolute top-2 right-2 z-10" variant="default">
                                  <Star className="h-3 w-3 mr-1" />
                                  Primary
                                </Badge>
                              )}

                              {/* Drag Handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <GripVertical className="h-4 w-4 text-white drop-shadow" />
                              </div>

                              {/* Image */}
                              <OptimizedImage
                                src={convertToPublicUrl(imageUrl)}
                                alt={`Toy image ${index + 1}`}
                                className="w-full h-32 object-cover"
                                aspectRatio="auto"
                              />

                              {/* Actions Overlay */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setPrimaryImage(index)}
                                  disabled={index === primaryImageIndex}
                                >
                                  <Star className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => window.open(convertToPublicUrl(imageUrl), '_blank')}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeImage(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* Image Analysis Tags */}
                              {imageAnalyses[imageUrl] && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                  <div className="flex flex-wrap gap-1">
                                    {imageAnalyses[imageUrl].tags.slice(0, 2).map((tag) => (
                                      <Badge key={tag} variant="outline" className="text-xs bg-white/20 text-white border-white/30">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
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
        </TabsContent>

        {/* Batch Operations Tab */}
        <TabsContent value="edit" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Compress Images */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Batch Compression</h3>
              <p className="text-sm text-muted-foreground">
                Reduce file size while maintaining quality
              </p>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleBatchCompress(0.8)}
                  disabled={selectedImages.size === 0}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  High Quality (80%)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleBatchCompress(0.6)}
                  disabled={selectedImages.size === 0}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Medium Quality (60%)
                </Button>
              </div>
            </div>

            {/* Resize Images */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Batch Resize</h3>
              <p className="text-sm text-muted-foreground">
                Resize images to standard dimensions
              </p>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleBatchResize({ width: 800, height: 600 })}
                  disabled={selectedImages.size === 0}
                >
                  <Crop className="h-4 w-4 mr-2" />
                  Standard (800x600)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleBatchResize({ width: 1200, height: 900 })}
                  disabled={selectedImages.size === 0}
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Large (1200x900)
                </Button>
              </div>
            </div>
          </div>
          
          {selectedImages.size === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Select images from the Upload tab to enable batch operations
            </div>
          )}
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="analyze" className="space-y-4">
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">AI-Powered Image Analysis</h3>
            <p className="text-muted-foreground mb-4">
              Automatic tagging and categorization coming soon
            </p>
            {enableAutoTagging && (
              <Badge variant="outline">Auto-tagging enabled</Badge>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 