import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, ImageIcon, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { imageService } from "@/services/imageService";
import OptimizedImage from '@/components/ui/OptimizedImage';
import { 
  compressImage, 
  validateImageFile, 
  formatFileSize, 
  getOptimalFormat 
} from '@/utils/imageOptimization';

interface ToyImageUploadProps {
  imageUrl: string;
  onImageChange: (url: string) => void;
}

const ToyImageUpload: React.FC<ToyImageUploadProps> = ({ imageUrl, onImageChange }) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [optimizationStats, setOptimizationStats] = useState<{
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
  } | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file before processing
    const validation = validateImageFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    if (!validation.valid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      console.log(`🖼️ Processing image: ${file.name}, size: ${formatFileSize(file.size)}`);

      // Compress image before upload for better performance
      const optimized = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
        format: getOptimalFormat()
      });

      console.log(`✨ Optimized image: ${formatFileSize(optimized.originalSize)} → ${formatFileSize(optimized.optimizedSize)} (${optimized.compressionRatio.toFixed(1)}% saved)`);

      // Upload the optimized image using the new imageService with S3 integration
      const result = await imageService.uploadFile(
        new File([optimized.blob], file.name, { type: optimized.blob.type }),
        `toy_${Date.now()}`
      );
      
      if (result.success && result.url) {
        onImageChange(result.url);
        
        // Update optimization stats
        setOptimizationStats({
          originalSize: optimized.originalSize,
          optimizedSize: optimized.optimizedSize,
          compressionRatio: optimized.compressionRatio
        });

        toast({
          title: "Image Optimized & Uploaded! ✨",
          description: `Image uploaded successfully. Saved ${optimized.compressionRatio.toFixed(1)}% file size through optimization.`
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Error uploading optimized image:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="image" className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Image
        </Label>
        <div className="flex items-center gap-4 mt-2">
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isUploading}
            className="cursor-pointer"
          />
          <Button 
            type="button" 
            disabled={isUploading} 
            size="sm"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Optimizing...' : 'Upload'}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground mt-1 space-y-1">
          <p>Upload an image. It will be automatically optimized for better performance.</p>
          {optimizationStats && (
            <p className="flex items-center gap-1 text-green-600 font-medium">
              <Zap className="w-3 h-3" />
              Last upload saved {optimizationStats.compressionRatio.toFixed(1)}% file size 
              ({formatFileSize(optimizationStats.originalSize)} → {formatFileSize(optimizationStats.optimizedSize)})
            </p>
          )}
        </div>
      </div>
      
      {imageUrl && (
        <div className="border rounded-lg overflow-hidden bg-muted">
          <OptimizedImage
            src={imageUrl}
            alt="Toy preview"
            className="w-full h-48"
            aspectRatio="auto"
            priority={true}
            showLoadingState={true}
          />
        </div>
      )}
    </div>
  );
};

export default ToyImageUpload;
