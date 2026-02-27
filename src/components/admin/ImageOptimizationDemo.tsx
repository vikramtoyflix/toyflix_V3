import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Image as ImageIcon, 
  Zap, 
  BarChart3, 
  CheckCircle, 
  AlertCircle,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import OptimizedImage from '@/components/ui/OptimizedImage';
import {
  compressImage,
  validateImageFile,
  formatFileSize,
  getOptimalFormat,
  isWebPSupported,
  generateResponsiveImages
} from '@/utils/imageOptimization';

interface ComparisonResult {
  original: {
    file: File;
    dataUrl: string;
    size: number;
  };
  optimized: {
    blob: Blob;
    dataUrl: string;
    size: number;
    width: number;
    height: number;
    compressionRatio: number;
  };
  responsive?: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
  };
}

const ImageOptimizationDemo: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Create original image data URL
      const originalDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      // Compress the image
      const optimized = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
        format: getOptimalFormat()
      });

      // Generate responsive images
      const responsive = await generateResponsiveImages(file);

      setComparisonResult({
        original: {
          file,
          dataUrl: originalDataUrl,
          size: file.size
        },
        optimized,
        responsive
      });

      toast({
        title: "Image Processed Successfully! ✨",
        description: `Reduced file size by ${optimized.compressionRatio.toFixed(1)}%`
      });

    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Processing Failed",
        description: "Failed to process the image",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadOptimizedImage = () => {
    if (!comparisonResult) return;

    const link = document.createElement('a');
    link.href = comparisonResult.optimized.dataUrl;
    link.download = `optimized_${comparisonResult.original.file.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Image Optimization Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Browser Support Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              {isWebPSupported() ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              )}
              <span className="text-sm">
                WebP Support: {isWebPSupported() ? 'Enabled' : 'Fallback to JPEG'}
              </span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Canvas API: Enabled</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Lazy Loading: Enabled</span>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label>Select Image to Test Optimization</Label>
            <div className="flex items-center gap-4 mt-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="cursor-pointer"
              />
              <Button 
                onClick={triggerFileInput}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {isProcessing ? 'Processing...' : 'Select Image'}
              </Button>
            </div>
          </div>

          {/* Comparison Results */}
          {comparisonResult && (
            <div className="space-y-6">
              <Separator />
              
              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-500">
                    {formatFileSize(comparisonResult.original.size)}
                  </div>
                  <div className="text-sm text-muted-foreground">Original Size</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-500">
                    {formatFileSize(comparisonResult.optimized.size)}
                  </div>
                  <div className="text-sm text-muted-foreground">Optimized Size</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">
                    {comparisonResult.optimized.compressionRatio.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Size Reduction</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-500">
                    {comparisonResult.optimized.width}×{comparisonResult.optimized.height}
                  </div>
                  <div className="text-sm text-muted-foreground">Dimensions</div>
                </div>
              </div>

              {/* Image Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Original Image</Label>
                    <Badge variant="destructive">
                      {formatFileSize(comparisonResult.original.size)}
                    </Badge>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={comparisonResult.original.dataUrl}
                      alt="Original"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Optimized Image</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        {formatFileSize(comparisonResult.optimized.size)}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={downloadOptimizedImage}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <OptimizedImage
                      src={comparisonResult.optimized.dataUrl}
                      alt="Optimized"
                      className="w-full h-64"
                      priority={true}
                      showLoadingState={true}
                    />
                  </div>
                </div>
              </div>

              {/* Responsive Images */}
              {comparisonResult.responsive && (
                <div>
                  <Label className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4" />
                    Responsive Image Sizes
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(comparisonResult.responsive).map(([size, src]) => (
                      <div key={size} className="text-center">
                        <div className="border rounded-lg overflow-hidden mb-2">
                          <OptimizedImage
                            src={src}
                            alt={`${size} version`}
                            className="w-full h-20"
                            lazy={false}
                            showLoadingState={true}
                          />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {size.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Optimization Benefits:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Faster page load times</li>
                  <li>• Reduced bandwidth usage</li>
                  <li>• Better user experience on mobile devices</li>
                  <li>• Automatic format optimization (WebP when supported)</li>
                  <li>• Lazy loading for images below the fold</li>
                  <li>• Progressive image enhancement</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageOptimizationDemo; 