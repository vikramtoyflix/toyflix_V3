import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabaseAdmin } from '@/integrations/supabase/adminClient';
import type { Database } from '@/integrations/supabase/types';
import { useToysWithAgeBands } from '@/hooks/useToysWithAgeBands';
import { 
  ArrowLeft, 
  Save, 
  AlertCircle, 
  RefreshCw, 
  Upload, 
  X, 
  GripVertical,
  Star,
  ImageIcon,
  Package,
  Loader2
} from 'lucide-react';
import { imageService } from '@/services/imageService';
import { compressImage, validateImageFile, formatFileSize } from '@/utils/imageOptimization';
import { getSubscriptionCategoryForCategory, CATEGORY_LABELS, ToyCategory } from '@/constants/categoryMapping';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface ToyFormData {
  // Basic Information
  name: string;
  description: string;
  category: string;
  subscription_category: string;
  brand: string;
  sku: string;
  
  // Age & Pack Information
  age_range: string[];
  min_age: number | null;
  max_age: number | null;
  pack: string[];
  
  // Images (managed through toy_images table)
  images: string[];
  
  // Pricing
  retail_price: number | null;
  rental_price: number | null;
  purchase_cost: number | null;
  
  // Inventory Management
  total_quantity: number;
  available_quantity: number;
  reorder_level: number;
  reorder_quantity: number;
  inventory_status: string;
  supplier_id: string;
  last_restocked_date: string;
  
  // Physical Properties
  weight_kg: number | null;
  dimensions_cm: string;
  barcode: string;
  condition_rating: number;
  
  // Advanced Settings
  rating: number;
  show_strikethrough_pricing: boolean;
  display_order: number;
  is_featured: boolean;
  
  // Management & Notes
  maintenance_required: boolean;
  last_maintenance_date: string;
  internal_notes: string;
  seasonal_availability: Record<string, any>;
}

interface ValidationErrors {
  [key: string]: string;
}

const categories = [
  { value: 'big_toys', label: 'Big Toys' },
  { value: 'stem_toys', label: 'STEM Toys' },
  { value: 'educational_toys', label: 'Educational Toys' },
  { value: 'books', label: 'Books' },
  { value: 'developmental_toys', label: 'Developmental Toys' },
  { value: 'ride_on_toys', label: 'Ride-On Toys' }
];

const subscriptionCategories = [
  { value: 'big_toys', label: 'Big Toys' },
  { value: 'stem_toys', label: 'STEM Toys' },
  { value: 'educational_toys', label: 'Educational Toys' },
  { value: 'books', label: 'Books' },
  { value: 'developmental_toys', label: 'Developmental Toys' }
];

const ageRanges = [
  '6m-2 years', '2-3 years', '3-4 years', '4-6 years', '6-8 years'
];

const packs = [
  { value: 'Discovery Delight', label: 'Discovery Delight' },
  { value: 'Silver Pack', label: 'Silver Pack' },
  { value: 'Gold Pack', label: 'Gold Pack' }
];

const NewToyEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refetch: refetchToys } = useToysWithAgeBands();
  const isNewToy = !id || id === 'new';
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<ToyFormData>({
    // Basic Information
    name: '',
    description: '',
    category: 'educational_toys',
    subscription_category: 'educational_toys',
    brand: '',
    sku: '',
    
    // Age & Pack Information
    age_range: [],
    min_age: null,
    max_age: null,
    pack: [],
    
    // Images (managed through toy_images table)
    images: [],
    
    // Pricing
    retail_price: null,
    rental_price: null,
    purchase_cost: null,
    
    // Inventory Management
    total_quantity: 0,
    available_quantity: 0,
    reorder_level: 5,
    reorder_quantity: 10,
    inventory_status: 'active',
    supplier_id: '',
    last_restocked_date: '',
    
    // Physical Properties
    weight_kg: null,
    dimensions_cm: '',
    barcode: '',
    condition_rating: 5,
    
    // Advanced Settings
    rating: 0,
    show_strikethrough_pricing: true,
    display_order: 9999,
    is_featured: false,
    
    // Management & Notes
    maintenance_required: false,
    last_maintenance_date: '',
    internal_notes: '',
    seasonal_availability: {}
  });

  // Load toy data for editing
  useEffect(() => {
    if (!isNewToy && id) {
      loadToyData(id);
    }
  }, [id, isNewToy]);

  const loadToyData = async (toyId: string) => {
    setIsLoading(true);
    try {
      console.log('🔍 Loading toy data for ID:', toyId);
      
      const { data: toyData, error } = await supabaseAdmin
        .from('toys')
        .select('*')
        .eq('id', toyId)
        .single();

      if (error) {
        console.error('❌ Error loading toy:', error);
        toast({
          title: "Error",
          description: "Failed to load toy data",
          variant: "destructive"
        });
        return;
      }

      // Load toy images ONLY from toy_images table (no legacy fallbacks)
      const { data: imageData, error: imageError } = await supabaseAdmin
        .from('toy_images')
        .select('image_url, is_primary, display_order')
        .eq('toy_id', toyId)
        .order('display_order', { ascending: true })
        .order('is_primary', { ascending: false });

      let images: string[] = [];
      let primaryIndex = 0;

      if (imageData && imageData.length > 0) {
        console.log('✅ Loaded images from toy_images table:', imageData);
        
        // Sort images: primary first, then by display_order
        const sortedImages = [...imageData].sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return a.display_order - b.display_order;
        });
        
        images = sortedImages.map(img => img.image_url);
        primaryIndex = sortedImages.findIndex(img => img.is_primary);
        if (primaryIndex === -1) primaryIndex = 0; // First image as primary fallback
        
        console.log('🖼️ Processed images order:', {
          totalImages: images.length,
          primaryIndex: primaryIndex,
          images: images
        });
      } else {
        console.log('ℹ️ No images found in toy_images table for toy:', toyId);
        // No fallback - if no images in toy_images table, then no images for this toy
        images = [];
        primaryIndex = 0;
      }

      if (imageError) {
        console.error('❌ Error loading images from toy_images table:', imageError);
        throw new Error(`Failed to load images: ${imageError.message}`);
      }

      console.log('✅ Loaded toy data:', toyData);
      console.log('✅ Loaded images:', images);
      
      // Debug image URLs
      if (images.length > 0) {
        console.log('🔍 Debugging image URLs:');
        images.forEach((img, idx) => {
          console.log(`  Image ${idx + 1}:`, img);
          console.log(`  Corrected URL:`, getImageUrl(img));
        });
      }

      setFormData({
        // Basic Information
        name: toyData.name || '',
        description: toyData.description || '',
        category: toyData.category || 'educational_toys',
        subscription_category: toyData.subscription_category || 'educational_toys',
        brand: toyData.brand || '',
        sku: toyData.sku || '',
        
        // Age & Pack Information
        age_range: toyData.age_range ? 
          (Array.isArray(toyData.age_range) ? toyData.age_range : 
           (() => {
             try {
               return JSON.parse(toyData.age_range);
             } catch {
               return []; // Fallback to empty array
             }
           })()) : [],
        min_age: toyData.min_age,
        max_age: toyData.max_age,
        pack: toyData.pack ? 
          (Array.isArray(toyData.pack) ? toyData.pack : 
           (() => {
             try {
               return JSON.parse(toyData.pack);
             } catch {
               return [];
             }
           })()) : [],
        
        // Images (loaded from toy_images table)
        images: images,
        
        // Pricing
        retail_price: toyData.retail_price,
        rental_price: toyData.rental_price,
        purchase_cost: (toyData as any).purchase_cost,
        
        // Inventory Management
        total_quantity: toyData.total_quantity || 0,
        available_quantity: toyData.available_quantity || 0,
        reorder_level: (toyData as any).reorder_level || 5,
        reorder_quantity: (toyData as any).reorder_quantity || 10,
        inventory_status: (toyData as any).inventory_status || 'active',
        supplier_id: (toyData as any).supplier_id || '',
        last_restocked_date: (toyData as any).last_restocked_date || '',
        
        // Physical Properties
        weight_kg: (toyData as any).weight_kg,
        dimensions_cm: (toyData as any).dimensions_cm || '',
        barcode: (toyData as any).barcode || '',
        condition_rating: (toyData as any).condition_rating || 5,
        
        // Advanced Settings
        rating: toyData.rating || 0,
        show_strikethrough_pricing: toyData.show_strikethrough_pricing ?? true,
        display_order: toyData.display_order || 9999,
        is_featured: toyData.is_featured ?? false,
        
        // Management & Notes
        maintenance_required: (toyData as any).maintenance_required ?? false,
        last_maintenance_date: (toyData as any).last_maintenance_date || '',
        internal_notes: (toyData as any).internal_notes || '',
        seasonal_availability: (toyData as any).seasonal_availability || {}
      });

      setPrimaryImageIndex(primaryIndex);
    } catch (error) {
      console.error('❌ Error loading toy data:', error);
      toast({
        title: "Error",
        description: "Failed to load toy data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!formData.name.trim()) {
      errors.name = 'Toy name is required';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    // ✅ ADDED: Validate category against allowed values
    const validCategories = ['big_toys', 'stem_toys', 'educational_toys', 'books', 'developmental_toys', 'ride_on_toys'];
    if (formData.category && !validCategories.includes(formData.category)) {
      errors.category = `Invalid category. Must be one of: ${validCategories.join(', ')}`;
    }

    if (formData.rental_price && formData.rental_price < 0) {
      errors.rental_price = 'Rental price cannot be negative';
    }

    if (formData.retail_price && formData.retail_price < 0) {
      errors.retail_price = 'Retail price cannot be negative';
    }

    if (formData.total_quantity < 0) {
      errors.total_quantity = 'Total quantity cannot be negative';
    }

    if (formData.available_quantity < 0) {
      errors.available_quantity = 'Available quantity cannot be negative';
    }

    if (formData.available_quantity > formData.total_quantity) {
      errors.available_quantity = 'Available quantity cannot exceed total quantity';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper function to get the correct image URL for Supabase S3 storage
  const getImageUrl = (url: string): string => {
    if (!url) return '/placeholder.svg';
    
    console.log('🔍 Processing image URL:', url);
    
    // If it's already a full HTTP URL, return as-is
    if (url.startsWith('http')) {
      console.log('🖼️ Using full URL as-is:', url);
      return url;
    }
    
    // If it's a relative path starting with /, use as is (local asset)
    if (url.startsWith('/')) {
      console.log('🖼️ Using relative path:', url);
      return url;
    }
    
    // ✅ IMPROVED: Handle Supabase S3 storage URLs
    // Format: https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/{filename}
    
    // If it contains full S3 endpoint path, extract just the filename
    if (url.includes('storage/v1/s3/toy-images/')) {
      const filename = url.split('storage/v1/s3/toy-images/').pop();
      const publicUrl = `https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/${filename}`;
      console.log('🔗 Converted S3 URL from:', url, 'to:', publicUrl);
      return publicUrl;
    }
    
    // If it contains public storage reference, use as-is
    if (url.includes('storage/v1/object/public/toy-images/')) {
      const publicUrl = url.startsWith('https://') ? url : `https://wucwpyitzqjukcphczhr.supabase.co/${url}`;
      console.log('🔗 Using public storage URL:', publicUrl);
      return publicUrl;
    }
    
    // If it contains 'toy-images/' anywhere, extract the path after it
    if (url.includes('toy-images/')) {
      const toyImagesIndex = url.indexOf('toy-images/');
      const pathAfterToyImages = url.substring(toyImagesIndex + 'toy-images/'.length);
      const publicUrl = `https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/${pathAfterToyImages}`;
      console.log('🔗 Extracted from toy-images path:', url, 'to:', publicUrl);
      return publicUrl;
    }
    
    // If it looks like just a filename (no path separators or starts with standard prefixes)
    if (!url.includes('/') || url.startsWith('toy_') || url.startsWith('image_')) {
      const publicUrl = `https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/${url}`;
      console.log('🔗 Constructed public URL for filename:', url, 'result:', publicUrl);
      return publicUrl;
    }
    
    // Fallback: treat as filename in toy-images bucket
    const publicUrl = `https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/${url}`;
    console.log('🔗 Fallback: treating as filename in toy-images bucket:', url, 'result:', publicUrl);
    return publicUrl;
  };

  const handleImageUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    // Check for network connectivity
    if (!navigator.onLine) {
      toast({
        title: "No Internet Connection",
        description: "Please check your internet connection and try again",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        try {
          const validation = validateImageFile(file, {
            maxSize: 10 * 1024 * 1024,
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
          });

          if (!validation.valid) {
            throw new Error(`File ${file.name}: ${validation.error}`);
          }

          const optimized = await compressImage(file, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.85
          });

          // Generate a meaningful filename for the toy image
          const toyName = formData.name || 'untitled';
          const safeFileName = imageService.generateSafeFileName(toyName);
          const uniqueFileName = `${safeFileName}_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
          
          const result = await imageService.uploadFile(
            new File([optimized.blob], file.name, { type: optimized.blob.type }),
            uniqueFileName
          );

          if (result.success && result.url) {
            setUploadProgress((prev) => prev + (100 / files.length));
                      return result.url;
        } else {
          console.error(`Upload failed for ${file.name}:`, result.error);
          throw new Error(result.error || 'Upload failed');
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        throw new Error(`Failed to process ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
      }
          });

      const uploadedUrls = await Promise.all(uploadPromises);
      console.log('✅ All uploads completed successfully:', uploadedUrls);
      const newImages = [...formData.images, ...uploadedUrls];
      
      setFormData(prev => ({
        ...prev,
        images: newImages
      }));

      toast({
        title: "Images uploaded successfully! ✨",
        description: `${uploadedUrls.length} image(s) uploaded and optimized.`
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      
      let errorMessage = 'Failed to upload images';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error during upload. Please check your connection';
        } else if (error.message.includes('size')) {
          errorMessage = 'File size too large. Please use smaller images';
        } else if (error.message.includes('type')) {
          errorMessage = 'Invalid file type. Please use JPEG, PNG, or WebP images';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
    
    if (index === primaryImageIndex) {
      setPrimaryImageIndex(0);
    } else if (index < primaryImageIndex) {
      setPrimaryImageIndex(primaryImageIndex - 1);
    }
  };

  const setPrimaryImage = (index: number) => {
    setPrimaryImageIndex(index);
    // Primary image is now managed by primaryImageIndex state only
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const newImages = Array.from(formData.images);
    const [reorderedItem] = newImages.splice(result.source.index, 1);
    newImages.splice(result.destination.index, 0, reorderedItem);

    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSaving) return;
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive"
      });
      // Switch to the tab with errors
      if (validationErrors.name || validationErrors.category) {
        setActiveTab('basic');
      } else if (validationErrors.retail_price || validationErrors.rental_price) {
        setActiveTab('pricing');
      }
      return;
    }

    setIsSaving(true);
    console.log('💾 Starting save operation...');
    
    // ✅ DEBUG: Using admin client with service role (bypasses RLS)
    console.log('🔐 Using supabaseAdmin client with service role for', isNewToy ? 'CREATE' : 'UPDATE');

    try {
      // ✅ DEBUG: Check if toy_id is in formData before processing
      console.log('🔍 RAW FORM DATA BEFORE PROCESSING:');
      console.log('FormData keys:', Object.keys(formData));
      console.log('FormData values:', JSON.stringify(formData, null, 2));
      
      if ('toy_id' in formData) {
        console.error('🚨 FOUND toy_id IN FORM DATA!', (formData as any).toy_id);
      }
      
      // ✅ FIXED: Ultra-conservative approach - build clean object from scratch
      const cleanData: any = {};
      
      // Basic Information
      cleanData.name = formData.name.trim();
      cleanData.description = formData.description?.trim() || null;
      cleanData.category = formData.category;
      cleanData.subscription_category = formData.subscription_category;
      cleanData.brand = formData.brand?.trim() || null;
      cleanData.sku = formData.sku?.trim() || null;
      
      // Age & Pack Information
      cleanData.age_range = formData.age_range.length > 0 
        ? JSON.stringify(formData.age_range) 
        : JSON.stringify([]);
      cleanData.min_age = formData.min_age;
      cleanData.max_age = formData.max_age;
      cleanData.pack = formData.pack.length > 0 ? JSON.stringify(formData.pack) : null;
      
      // Images - managed exclusively through toy_images table, no image_url in toys table
      
      // Pricing
      cleanData.retail_price = formData.retail_price;
      cleanData.rental_price = formData.rental_price;
      cleanData.purchase_cost = formData.purchase_cost;
      
      // Inventory Management
      cleanData.total_quantity = formData.total_quantity;
      cleanData.available_quantity = formData.available_quantity;
      cleanData.reorder_level = formData.reorder_level;
      cleanData.reorder_quantity = formData.reorder_quantity;
      cleanData.inventory_status = formData.inventory_status;
      cleanData.supplier_id = formData.supplier_id?.trim() || null;
      cleanData.last_restocked_date = formData.last_restocked_date || null;
      
      // Physical Properties
      cleanData.weight_kg = formData.weight_kg;
      cleanData.dimensions_cm = formData.dimensions_cm?.trim() || null;
      cleanData.barcode = formData.barcode?.trim() || null;
      cleanData.condition_rating = formData.condition_rating;
      
      // Advanced Settings
      cleanData.rating = formData.rating;
      cleanData.show_strikethrough_pricing = formData.show_strikethrough_pricing;
      cleanData.display_order = formData.display_order;
      cleanData.is_featured = formData.is_featured;
      
      // Management & Notes
      cleanData.maintenance_required = formData.maintenance_required;
      cleanData.last_maintenance_date = formData.last_maintenance_date || null;
      cleanData.internal_notes = formData.internal_notes?.trim() || null;
      cleanData.seasonal_availability = formData.seasonal_availability;

      // ✅ DEBUG: Log exact data being sent
      console.log('🔍 Data being sent to database:');
      console.log('Field count:', Object.keys(cleanData).length);
      console.log('Fields:', Object.keys(cleanData));
      console.log('Full data:', JSON.stringify(cleanData, null, 2));
      
      // ✅ CHECK: Verify no invalid fields
      const validToysFields = [
        'id', 'name', 'description', 'category', 'age_range', 'brand', 'retail_price', 
        'rental_price', 'available_quantity', 'total_quantity', 'rating',
        'created_at', 'updated_at', 'pack', 'min_age', 'max_age', 'show_strikethrough_pricing',
        'display_order', 'is_featured', 'subscription_category', 'sku', 'reorder_level',
        'reorder_quantity', 'supplier_id', 'purchase_cost', 'last_restocked_date',
        'inventory_status', 'weight_kg', 'dimensions_cm', 'barcode', 'internal_notes',
        'seasonal_availability', 'condition_rating', 'maintenance_required', 'last_maintenance_date'
      ];
      
      const invalidFields = Object.keys(cleanData).filter(field => !validToysFields.includes(field));
      if (invalidFields.length > 0) {
        console.error('❌ INVALID FIELDS DETECTED:', invalidFields);
        throw new Error(`Invalid fields for toys table: ${invalidFields.join(', ')}`);
      }

      // ✅ IMPROVED: Better validation before save
      if (!cleanData.name || !cleanData.category) {
        throw new Error('Missing required fields: name and category are required');
      }

      // ✅ IMPROVED: Validate category against allowed values
      const validCategories = ['big_toys', 'stem_toys', 'educational_toys', 'books', 'developmental_toys', 'ride_on_toys'];
      if (!validCategories.includes(cleanData.category)) {
        throw new Error(`Invalid category: ${cleanData.category}. Must be one of: ${validCategories.join(', ')}`);
      }

      console.log('🎯 Clean data for database:', cleanData);

      // ✅ EMERGENCY CHECK: Look for toy_id field specifically
      if ('toy_id' in cleanData) {
        console.error('🚨 CRITICAL ERROR: toy_id field found in cleanData!');
        console.error('🚨 This would cause database error. Removing it now.');
        delete (cleanData as any).toy_id;
      }

      // ✅ EMERGENCY CHECK: Scan for any unexpected fields
      const actualKeys = Object.keys(cleanData);
      console.log('🔍 FINAL FIELD CHECK - Keys being sent:', actualKeys);
      
      let toyId: string;
      
      // Step 1: Save/update the toy
      if (isNewToy) {
        console.log('➕ Creating new toy...');
        
        // ✅ NUCLEAR OPTION: Create absolutely minimal clean object for INSERT
        const ultraCleanData = {
          // Basic Information
          name: cleanData.name,
          description: cleanData.description,
          category: cleanData.category,
          subscription_category: cleanData.subscription_category,
          brand: cleanData.brand,
          sku: cleanData.sku,
          
          // Age & Pack Information
          age_range: cleanData.age_range,
          min_age: cleanData.min_age,
          max_age: cleanData.max_age,
          pack: cleanData.pack,
          
          // Images managed through toy_images table only
          
          // Pricing
          retail_price: cleanData.retail_price,
          rental_price: cleanData.rental_price,
          purchase_cost: cleanData.purchase_cost,
          
          // Inventory Management
          total_quantity: cleanData.total_quantity,
          available_quantity: cleanData.available_quantity,
          reorder_level: cleanData.reorder_level,
          reorder_quantity: cleanData.reorder_quantity,
          inventory_status: cleanData.inventory_status,
          supplier_id: cleanData.supplier_id,
          last_restocked_date: cleanData.last_restocked_date,
          
          // Physical Properties
          weight_kg: cleanData.weight_kg,
          dimensions_cm: cleanData.dimensions_cm,
          barcode: cleanData.barcode,
          condition_rating: cleanData.condition_rating,
          
          // Advanced Settings
          rating: cleanData.rating,
          show_strikethrough_pricing: cleanData.show_strikethrough_pricing,
          display_order: cleanData.display_order,
          is_featured: cleanData.is_featured,
          
          // Management & Notes
          maintenance_required: cleanData.maintenance_required,
          last_maintenance_date: cleanData.last_maintenance_date,
          internal_notes: cleanData.internal_notes,
          seasonal_availability: cleanData.seasonal_availability
        };
        
        // ✅ FINAL CHECK: Remove any toy_id field that might have snuck in
        delete (ultraCleanData as any).toy_id;
        delete (ultraCleanData as any).id;
        
        console.log('🧪 INSERT with ultra clean data:', JSON.stringify(ultraCleanData, null, 2));
        console.log('🧪 Ultra clean data keys for INSERT:', Object.keys(ultraCleanData));
        
        const { data: newToy, error } = await supabaseAdmin
          .from('toys')
          .insert(ultraCleanData)
          .select('id')
          .single();

        if (error) {
          console.error('❌ Database error creating toy:', error);
          console.error('❌ Error details:', JSON.stringify(error, null, 2));
          throw new Error(`Failed to create toy: ${error.message}`);
        }
        toyId = newToy.id;
        console.log('✅ Toy created with ID:', toyId);
      } else {
        console.log('✏️ Updating existing toy...');
        
        // ✅ NUCLEAR OPTION: Create absolutely minimal clean object
        const ultraCleanData = {
          // Basic Information
          name: cleanData.name,
          description: cleanData.description,
          category: cleanData.category,
          subscription_category: cleanData.subscription_category,
          brand: cleanData.brand,
          sku: cleanData.sku,
          
          // Age & Pack Information
          age_range: cleanData.age_range,
          min_age: cleanData.min_age,
          max_age: cleanData.max_age,
          pack: cleanData.pack,
          
          // Images managed through toy_images table only
          
          // Pricing
          retail_price: cleanData.retail_price,
          rental_price: cleanData.rental_price,
          purchase_cost: cleanData.purchase_cost,
          
          // Inventory Management
          total_quantity: cleanData.total_quantity,
          available_quantity: cleanData.available_quantity,
          reorder_level: cleanData.reorder_level,
          reorder_quantity: cleanData.reorder_quantity,
          inventory_status: cleanData.inventory_status,
          supplier_id: cleanData.supplier_id,
          last_restocked_date: cleanData.last_restocked_date,
          
          // Physical Properties
          weight_kg: cleanData.weight_kg,
          dimensions_cm: cleanData.dimensions_cm,
          barcode: cleanData.barcode,
          condition_rating: cleanData.condition_rating,
          
          // Advanced Settings
          rating: cleanData.rating,
          show_strikethrough_pricing: cleanData.show_strikethrough_pricing,
          display_order: cleanData.display_order,
          is_featured: cleanData.is_featured,
          
          // Management & Notes
          maintenance_required: cleanData.maintenance_required,
          last_maintenance_date: cleanData.last_maintenance_date,
          internal_notes: cleanData.internal_notes,
          seasonal_availability: cleanData.seasonal_availability
        };
        
        // ✅ FINAL CHECK: Remove any toy_id field that might have snuck in
        delete (ultraCleanData as any).toy_id;
        delete (ultraCleanData as any).id;
        
        // ✅ TEST: Log the exact update operation
        console.log('🔄 Attempting update with ULTRA CLEAN data:', JSON.stringify(ultraCleanData, null, 2));
        console.log('🔄 Updating toy ID:', id);
        console.log('🔄 Ultra clean data keys:', Object.keys(ultraCleanData));
        
        const { error } = await supabaseAdmin
          .from('toys')
          .update(ultraCleanData)
          .eq('id', id);

        if (error) {
          console.error('❌ Database error updating toy:', error);
          console.error('❌ Error code:', error.code);
          console.error('❌ Error details:', JSON.stringify(error, null, 2));
          console.error('❌ Data that caused error:', JSON.stringify(cleanData, null, 2));
          throw new Error(`Failed to update toy: ${error.message}`);
        }
        toyId = id!;
        console.log('✅ Toy updated with ID:', toyId);
      }

      // Step 2: Handle images with better error handling
      if (formData.images.length > 0) {
        console.log('🖼️ Saving toy images to toy_images table...');
        
        try {
          // Clear existing images if editing
          if (!isNewToy) {
            const { error: deleteError } = await supabaseAdmin
              .from('toy_images')
              .delete()
              .eq('toy_id', toyId);

            if (deleteError) {
              console.warn('⚠️ Warning deleting existing images:', deleteError);
            } else {
              console.log('✅ Cleared existing images from toy_images table');
            }
          }

          // Insert new images with validation
          const imageRecords = formData.images.map((imageUrl, index) => ({
            toy_id: toyId,
            image_url: imageUrl,
            display_order: index,
            is_primary: index === primaryImageIndex,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          console.log('🖼️ Inserting image records into toy_images table:', imageRecords);

          const { error: imageError } = await supabaseAdmin
            .from('toy_images')
            .insert(imageRecords);

          if (imageError) {
            console.error('❌ Error saving images to toy_images table:', imageError);
            // Don't fail the entire operation for image errors, but warn the user
            toast({
              title: "Warning",
              description: "Toy saved but some images may not have been saved properly",
              variant: "destructive"
            });
          } else {
            console.log(`✅ Successfully saved ${imageRecords.length} images to toy_images table`);
            // Images are now managed exclusively through toy_images table
          }
        } catch (imageError) {
          console.error('❌ Image operation failed:', imageError);
          // Continue with success since the toy was saved
        }
      } else {
        console.log('📷 No images to save, clearing toy_images records');
        
        // If no images, remove all toy_images records for this toy
        try {
          if (!isNewToy) {
            await supabaseAdmin.from('toy_images').delete().eq('toy_id', toyId);
            console.log('✅ Cleared all images from toy_images table');
          }
        } catch (clearError) {
          console.warn('⚠️ Warning clearing images:', clearError);
        }
      }

      console.log('✅ Save operation completed successfully');
      
      toast({
        title: "Success! 🎉",
        description: `Toy ${isNewToy ? 'created' : 'updated'} successfully`,
      });

      // Step 3: Refresh and navigate
      try {
        await refetchToys();
      } catch (refreshError) {
        console.warn('⚠️ Warning: Failed to refresh toys list:', refreshError);
      }
      
      // Navigate back to admin
      navigate('/admin?tab=toys');
      
    } catch (error) {
      console.error('❌ Save failed:', error);
      
      let errorMessage = 'Failed to save toy';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // ✅ IMPROVED: Better error message handling
        if (error.message.includes('duplicate key')) {
          errorDetails = 'A toy with this name already exists';
        } else if (error.message.includes('foreign key')) {
          errorDetails = 'Invalid reference data';
        } else if (error.message.includes('check constraint')) {
          errorDetails = 'Invalid category or field value';
        } else if (error.message.includes('null value')) {
          errorDetails = 'Missing required field';
        } else if (error.message.includes('network')) {
          errorDetails = 'Network connection issue. Please check your internet connection';
        } else if (error.message.includes('permission')) {
          errorDetails = 'Permission denied. Please refresh and try again';
        }
      }
      
      toast({
        title: "Error",
        description: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin?tab=toys');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
              <span>Loading toy data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="flex items-center gap-2"
          disabled={isSaving}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Toys
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {isNewToy ? 'Add New Toy' : 'Edit Toy'}
          </CardTitle>
          {!isNewToy && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">ID: {id}</Badge>
              {formData.is_featured && <Badge variant="default">Featured</Badge>}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="physical">Physical</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">
                      Name *
                      {validationErrors.name && (
                        <span className="text-red-500 text-sm ml-2">{validationErrors.name}</span>
                      )}
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={validationErrors.name ? 'border-red-500' : ''}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="sku">SKU / Product Code</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="e.g., TOY-001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                      placeholder="e.g., 1234567890123"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => {
                      const newCategory = value as ToyCategory;
                      const autoSubscriptionCategory = getSubscriptionCategoryForCategory(newCategory);
                      
                      setFormData(prev => ({ 
                        ...prev, 
                        category: newCategory,
                        subscription_category: autoSubscriptionCategory  // Auto-sync here
                      }));
                    }}>
                      <SelectTrigger className={validationErrors.category ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.category && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.category}</p>
                    )}
                  </div>

                  <div>
                    <Label>
                      Subscription Category
                      <span className="text-xs text-green-600 ml-2">✓ Auto-synced from Category</span>
                    </Label>
                    <Select value={formData.subscription_category} onValueChange={(value) => setFormData(prev => ({ ...prev, subscription_category: value }))}>
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
                </div>

                <div>
                  <Label>Age Range</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {ageRanges.map(age => (
                      <div key={age} className="flex items-center space-x-2">
                        <Checkbox
                          id={age}
                          checked={formData.age_range.includes(age)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({ ...prev, age_range: [...prev.age_range, age] }));
                            } else {
                              setFormData(prev => ({ ...prev, age_range: prev.age_range.filter(a => a !== age) }));
                            }
                          }}
                        />
                        <Label htmlFor={age} className="text-sm">{age}</Label>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="min_age">Minimum Age (years)</Label>
                      <Input
                        id="min_age"
                        type="number"
                        value={formData.min_age || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, min_age: e.target.value ? Number(e.target.value) : null }))}
                        min="0"
                        max="18"
                        placeholder="e.g., 3"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="max_age">Maximum Age (years)</Label>
                      <Input
                        id="max_age"
                        type="number"
                        value={formData.max_age || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_age: e.target.value ? Number(e.target.value) : null }))}
                        min="0"
                        max="18"
                        placeholder="e.g., 8"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Pack Compatibility</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    {packs.map(pack => (
                      <div key={pack.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={pack.value}
                          checked={formData.pack.includes(pack.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({ ...prev, pack: [...prev.pack, pack.value] }));
                            } else {
                              setFormData(prev => ({ ...prev, pack: prev.pack.filter(p => p !== pack.value) }));
                            }
                          }}
                        />
                        <Label htmlFor={pack.value} className="text-sm">{pack.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Images Tab - Enhanced Image Upload */}
              <TabsContent value="images" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Product Images
                    </Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
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
                        {isUploading ? 'Uploading...' : 'Upload Images'}
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      <p>Upload multiple images. Images will be automatically optimized.</p>
                      <p>Supported formats: JPEG, PNG, WebP • Max size: 10MB per image</p>
                      {process.env.NODE_ENV === 'development' && (
                        <div className="pt-2 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Test with toy-related images and S3 URLs
                              const testUrls = [
                                'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop&q=80', // toy blocks
                                'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=400&fit=crop&q=80', // building blocks
                                'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=400&fit=crop&q=80', // toy car
                                'https://images.unsplash.com/photo-1566844911516-6e309ed5d155?w=400&h=400&fit=crop&q=80', // educational toy
                                'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/test_image_sample.jpg',
                                '/placeholder.svg'
                              ];
                              
                              const testUrl = testUrls[Math.floor(Math.random() * testUrls.length)];
                              console.log('🧪 Adding test image URL:', testUrl);
                              console.log('🧪 Processed URL will be:', getImageUrl(testUrl));
                              setFormData(prev => ({ 
                                ...prev, 
                                images: [...prev.images, testUrl]
                              }));
                            }}
                            className="mr-2"
                          >
                            🧪 Add Test Image
                          </Button>
                                                    <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              console.log('🔍 Current form images:', formData.images);
                              console.log('🔍 Image service test:', imageService);
                              
                              // Test each image URL using img element loading (bypasses CORS)
                              const testResults: { url: string; status: 'loading' | 'success' | 'error' }[] = [];
                              
                              for (let i = 0; i < formData.images.length; i++) {
                                const originalUrl = formData.images[i];
                                const correctedUrl = getImageUrl(originalUrl);
                                
                                console.log(`🔍 Testing image ${i + 1}:`, {
                                  original: originalUrl,
                                  corrected: correctedUrl
                                });
                                
                                testResults.push({ url: correctedUrl, status: 'loading' });
                                
                                // Test image loading without CORS issues
                                const testImg = new Image();
                                testImg.onload = () => {
                                  console.log(`✅ Image ${i + 1} loads successfully:`, {
                                    url: correctedUrl,
                                    width: testImg.naturalWidth,
                                    height: testImg.naturalHeight
                                  });
                                  testResults[i].status = 'success';
                                };
                                testImg.onerror = () => {
                                  console.error(`❌ Image ${i + 1} failed to load:`, correctedUrl);
                                  testResults[i].status = 'error';
                                  
                                  // Try alternative URLs for failed images
                                  const alternatives = [
                                    originalUrl.replace(/^https?:\/\/[^\/]+/, 'https://wucwpyitzqjukcphczhr.supabase.co'),
                                    originalUrl.includes('toys/') ? `https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/${originalUrl}` : null,
                                    `https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/${originalUrl.split('/').pop()}`
                                  ].filter(Boolean);
                                  
                                  console.log(`🔄 Trying ${alternatives.length} alternative URLs for image ${i + 1}:`, alternatives);
                                };
                                testImg.src = correctedUrl;
                              }
                              
                              // Also show direct URLs for manual testing
                              console.log('📋 Direct URLs for manual testing:');
                              formData.images.forEach((url, i) => {
                                console.log(`${i + 1}. ${getImageUrl(url)}`);
                              });
                              
                              // Show summary after a delay
                              setTimeout(() => {
                                const successful = testResults.filter(r => r.status === 'success').length;
                                const failed = testResults.filter(r => r.status === 'error').length;
                                const loading = testResults.filter(r => r.status === 'loading').length;
                                
                                console.log('📊 Test Results Summary:', {
                                  successful,
                                  failed,
                                  loading,
                                  total: testResults.length
                                });
                                
                                if (failed > 0) {
                                  console.log('⚠️ Failed images may need URL correction or re-upload');
                                }
                              }, 3000);
                            }}
                          >
                            🔍 Test All URLs
                          </Button>
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={() => {
                               console.log('🗑️ Clearing all images');
                               setFormData(prev => ({ 
                                 ...prev, 
                                 images: []
                               }));
                               setPrimaryImageIndex(0);
                             }}
                             className="ml-2"
                           >
                             🗑️ Clear All
                           </Button>
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={() => {
                               console.log('🔧 Fixing broken image URLs');
                               
                               // Test each image and fix broken ones
                               const fixedImages = formData.images.map(url => {
                                 const correctedUrl = getImageUrl(url);
                                 console.log(`🔧 Fixing URL: ${url} -> ${correctedUrl}`);
                                 return correctedUrl;
                               });
                               
                               setFormData(prev => ({
                                 ...prev,
                                 images: fixedImages
                               }));
                               
                               toast({
                                 title: "URLs Fixed",
                                 description: `Applied URL corrections to ${formData.images.length} image(s)`,
                                 duration: 2000
                               });
                             }}
                             className="ml-2 text-blue-600 hover:text-blue-700"
                           >
                             🔧 Fix URLs
                           </Button>
                         </div>
                       )}
                    </div>
                  </div>

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Uploading images...</span>
                        <span className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                  )}

                  {formData.images.length > 0 && (
                    <div>
                      <Label>Uploaded Images (drag to reorder) - {formData.images.length} image(s)</Label>
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="images">
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2"
                            >
                              {formData.images.map((imageUrl, index) => (
                                <Draggable key={`${imageUrl}-${index}`} draggableId={`${imageUrl}-${index}`} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`relative group border rounded-lg overflow-hidden ${
                                        snapshot.isDragging ? 'shadow-lg scale-105' : ''
                                      } ${index === primaryImageIndex ? 'ring-2 ring-primary' : ''} transition-all duration-200`}
                                    >
                                      <div {...provided.dragHandleProps} className="absolute top-2 left-2 z-10">
                                        <GripVertical className="w-4 h-4 text-white bg-black/50 rounded p-0.5" />
                                      </div>
                                      
                                      {index === primaryImageIndex && (
                                        <div className="absolute top-2 left-8 z-10">
                                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                        </div>
                                      )}

                                                                              <div className="relative w-full h-32 bg-gray-100 rounded overflow-hidden">
                                        <img
                                          src={getImageUrl(imageUrl)}
                                          alt={`Product image ${index + 1}`}
                                          className="w-full h-full object-cover"
                                          loading={index === primaryImageIndex ? "eager" : "lazy"}
                                          onLoad={(e) => {
                                            console.log('✅ Image loaded successfully:', imageUrl);
                                            // Hide loading indicator
                                            const loadingDiv = e.currentTarget.nextElementSibling as HTMLElement;
                                            if (loadingDiv) {
                                              loadingDiv.style.display = 'none';
                                            }
                                          }}
                                          onError={(e) => {
                                            const correctedUrl = getImageUrl(imageUrl);
                                            console.error('❌ Image failed to load:', {
                                              originalUrl: imageUrl,
                                              correctedUrl: correctedUrl,
                                              naturalWidth: e.currentTarget.naturalWidth,
                                              naturalHeight: e.currentTarget.naturalHeight,
                                              complete: e.currentTarget.complete
                                            });
                                            
                                            // Try one more time with a different approach
                                            if (!e.currentTarget.dataset.retried) {
                                              e.currentTarget.dataset.retried = 'true';
                                              
                                              // Try alternative URL formats
                                              const alternatives = [
                                                imageUrl.replace(/^https?:\/\/[^\/]+/, 'https://wucwpyitzqjukcphczhr.supabase.co'),
                                                imageUrl.includes('toys/') ? `https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/${imageUrl}` : null,
                                                '/placeholder.svg'
                                              ].filter(Boolean);
                                              
                                              if (alternatives.length > 0) {
                                                console.log('🔄 Trying alternative URL:', alternatives[0]);
                                                e.currentTarget.src = alternatives[0]!;
                                                return;
                                              }
                                            }
                                            
                                            // Set fallback image and hide loading indicator
                                            e.currentTarget.src = '/placeholder.svg';
                                            const loadingDiv = e.currentTarget.nextElementSibling as HTMLElement;
                                            if (loadingDiv) {
                                              loadingDiv.style.display = 'none';
                                            }
                                          }}
                                        />
                                        
                                        {/* Loading indicator */}
                                        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                                          <ImageIcon className="w-8 h-8 text-gray-400" />
                                        </div>
                                      </div>
                                      
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                          {index !== primaryImageIndex && (
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="secondary"
                                              onClick={() => setPrimaryImage(index)}
                                              className="text-xs"
                                            >
                                              Set Primary
                                            </Button>
                                          )}
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => removeImage(index)}
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
                  
                  {formData.images.length === 0 && !isUploading && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No images uploaded</h3>
                      <p className="text-gray-500 mb-4">Upload images to showcase this toy</p>
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                          className="flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Choose Images
                        </Button>
                        {process.env.NODE_ENV === 'development' && (
                          <p className="text-xs text-muted-foreground">
                            💡 Tip: Use the debug tools above to test image loading
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="retail_price">
                      Retail Price (₹)
                      {validationErrors.retail_price && (
                        <span className="text-red-500 text-sm ml-2">{validationErrors.retail_price}</span>
                      )}
                    </Label>
                    <Input
                      id="retail_price"
                      type="number"
                      value={formData.retail_price || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, retail_price: e.target.value ? Number(e.target.value) : null }))}
                      className={validationErrors.retail_price ? 'border-red-500' : ''}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Label htmlFor="rental_price">
                      Rental Price (₹)
                      {validationErrors.rental_price && (
                        <span className="text-red-500 text-sm ml-2">{validationErrors.rental_price}</span>
                      )}
                    </Label>
                    <Input
                      id="rental_price"
                      type="number"
                      value={formData.rental_price || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, rental_price: e.target.value ? Number(e.target.value) : null }))}
                      className={validationErrors.rental_price ? 'border-red-500' : ''}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="purchase_cost">
                      Purchase Cost (₹)
                    </Label>
                    <Input
                      id="purchase_cost"
                      type="number"
                      value={formData.purchase_cost || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchase_cost: e.target.value ? Number(e.target.value) : null }))}
                      min="0"
                      step="0.01"
                      placeholder="What you paid for this item"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="total_quantity">
                      Total Quantity
                      {validationErrors.total_quantity && (
                        <span className="text-red-500 text-sm ml-2">{validationErrors.total_quantity}</span>
                      )}
                    </Label>
                    <Input
                      id="total_quantity"
                      type="number"
                      value={formData.total_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_quantity: Number(e.target.value) }))}
                      className={validationErrors.total_quantity ? 'border-red-500' : ''}
                      min="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="available_quantity">
                      Available Quantity
                      {validationErrors.available_quantity && (
                        <span className="text-red-500 text-sm ml-2">{validationErrors.available_quantity}</span>
                      )}
                    </Label>
                    <Input
                      id="available_quantity"
                      type="number"
                      value={formData.available_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, available_quantity: Number(e.target.value) }))}
                      className={validationErrors.available_quantity ? 'border-red-500' : ''}
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rating">Rating (0-5)</Label>
                    <Input
                      id="rating"
                      type="number"
                      value={formData.rating}
                      onChange={(e) => setFormData(prev => ({ ...prev, rating: Number(e.target.value) }))}
                      min="0"
                      max="5"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="display_order">Display Order</Label>
                    <Input
                      id="display_order"
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, display_order: Number(e.target.value) }))}
                      min="0"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Inventory Tab */}
              <TabsContent value="inventory" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reorder_level">
                      Reorder Level
                    </Label>
                    <Input
                      id="reorder_level"
                      type="number"
                      value={formData.reorder_level}
                      onChange={(e) => setFormData(prev => ({ ...prev, reorder_level: Number(e.target.value) }))}
                      min="0"
                      placeholder="Alert when stock goes below this level"
                    />
                  </div>

                  <div>
                    <Label htmlFor="reorder_quantity">
                      Reorder Quantity
                    </Label>
                    <Input
                      id="reorder_quantity"
                      type="number"
                      value={formData.reorder_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, reorder_quantity: Number(e.target.value) }))}
                      min="0"
                      placeholder="How many to reorder"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="inventory_status">Inventory Status</Label>
                    <Select value={formData.inventory_status} onValueChange={(value) => setFormData(prev => ({ ...prev, inventory_status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select inventory status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="discontinued">Discontinued</SelectItem>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="supplier_id">Supplier ID</Label>
                    <Input
                      id="supplier_id"
                      value={formData.supplier_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: e.target.value }))}
                      placeholder="Internal supplier reference"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="last_restocked_date">Last Restocked Date</Label>
                  <Input
                    id="last_restocked_date"
                    type="date"
                    value={formData.last_restocked_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_restocked_date: e.target.value }))}
                  />
                </div>
              </TabsContent>

              {/* Physical Properties Tab */}
              <TabsContent value="physical" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="weight_kg">Weight (kg)</Label>
                    <Input
                      id="weight_kg"
                      type="number"
                      value={formData.weight_kg || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: e.target.value ? Number(e.target.value) : null }))}
                      min="0"
                      step="0.1"
                      placeholder="e.g., 2.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dimensions_cm">Dimensions (cm)</Label>
                    <Input
                      id="dimensions_cm"
                      value={formData.dimensions_cm}
                      onChange={(e) => setFormData(prev => ({ ...prev, dimensions_cm: e.target.value }))}
                      placeholder="e.g., 30x20x15"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="condition_rating">Condition Rating (1-5)</Label>
                    <Input
                      id="condition_rating"
                      type="number"
                      value={formData.condition_rating}
                      onChange={(e) => setFormData(prev => ({ ...prev, condition_rating: Number(e.target.value) }))}
                      min="1"
                      max="5"
                      placeholder="5 = Excellent, 1 = Poor"
                    />
                  </div>

                  <div>
                    <Label htmlFor="last_maintenance_date">Last Maintenance Date</Label>
                    <Input
                      id="last_maintenance_date"
                      type="date"
                      value={formData.last_maintenance_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_maintenance_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="maintenance_required"
                    checked={formData.maintenance_required}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, maintenance_required: checked as boolean }))}
                  />
                  <Label htmlFor="maintenance_required">Maintenance Required</Label>
                </div>

                <div>
                  <Label htmlFor="internal_notes">Internal Notes</Label>
                  <Textarea
                    id="internal_notes"
                    value={formData.internal_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
                    rows={3}
                    placeholder="Internal notes about this toy (not visible to customers)"
                  />
                </div>
              </TabsContent>

              {/* Advanced Tab */}
              <TabsContent value="advanced" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show_strikethrough_pricing"
                      checked={formData.show_strikethrough_pricing}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_strikethrough_pricing: checked as boolean }))}
                    />
                    <Label htmlFor="show_strikethrough_pricing">Show strikethrough pricing</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_featured"
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked as boolean }))}
                    />
                    <Label htmlFor="is_featured">Featured toy (carousel)</Label>
                  </div>
                </div>

                {Object.keys(validationErrors).length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium">Please fix the following errors:</p>
                      <ul className="mt-2 list-disc list-inside">
                        {Object.entries(validationErrors).map(([field, error]) => (
                          <li key={field}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Comprehensive Form Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium text-xs uppercase text-muted-foreground mb-1">Basic Info</h4>
                      <p><span className="font-medium">Name:</span> {formData.name || 'Not set'}</p>
                      <p><span className="font-medium">SKU:</span> {formData.sku || 'Not set'}</p>
                      <p><span className="font-medium">Brand:</span> {formData.brand || 'Not set'}</p>
                      <p><span className="font-medium">Category:</span> {formData.category}</p>
                      <p><span className="font-medium">Age Range:</span> {formData.age_range.length > 0 ? formData.age_range.join(', ') : 'Not set'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-xs uppercase text-muted-foreground mb-1">Inventory & Pricing</h4>
                      <p><span className="font-medium">Stock:</span> {formData.available_quantity}/{formData.total_quantity}</p>
                      <p><span className="font-medium">Rental Price:</span> ₹{formData.rental_price || 0}</p>
                      <p><span className="font-medium">Purchase Cost:</span> ₹{formData.purchase_cost || 0}</p>
                      <p><span className="font-medium">Reorder Level:</span> {formData.reorder_level}</p>
                      <p><span className="font-medium">Status:</span> {formData.inventory_status}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-xs uppercase text-muted-foreground mb-1">Physical & Other</h4>
                      <p><span className="font-medium">Images:</span> {formData.images.length}</p>
                      <p><span className="font-medium">Weight:</span> {formData.weight_kg ? `${formData.weight_kg}kg` : 'Not set'}</p>
                      <p><span className="font-medium">Dimensions:</span> {formData.dimensions_cm || 'Not set'}</p>
                      <p><span className="font-medium">Condition:</span> {formData.condition_rating}/5</p>
                      <p><span className="font-medium">Maintenance:</span> {formData.maintenance_required ? 'Required' : 'Not required'}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-4 text-xs">
                      <span className={`px-2 py-1 rounded ${formData.is_featured ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                        {formData.is_featured ? '⭐ Featured' : 'Standard'}
                      </span>
                      <span className="text-muted-foreground">Display Order: {formData.display_order}</span>
                      <span className="text-muted-foreground">Rating: {formData.rating}/5</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Network Status Warning */}
            {!navigator.onLine && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No internet connection detected. Please check your connection before saving.
                </AlertDescription>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex justify-between items-center pt-6 border-t">
              <Button 
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving || isUploading}
                className="min-w-[120px]"
              >
                Cancel
              </Button>
              
              <div className="flex items-center gap-2">
                {(isSaving || isUploading) && (
                  <div className="text-sm text-muted-foreground">
                    {isUploading ? `Uploading ${Math.round(uploadProgress)}%...` : 'Saving to database...'}
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  disabled={isSaving || isUploading || !navigator.onLine}
                  className="min-w-[120px]"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </div>
                  ) : isUploading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </div>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isNewToy ? 'Create Toy' : 'Update Toy'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewToyEdit; 