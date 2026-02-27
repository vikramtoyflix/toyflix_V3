
import React from 'react';
import { ToyFormData } from "@/types/toy";
import { useCatalogCategories } from "@/hooks/useCatalogCategories";
import ToyFormBasicInfo from './form/ToyFormBasicInfo';
import ToyFormPricing from './form/ToyFormPricing';
import ToyFormInventory from './form/ToyFormInventory';
import MultiToyImageUpload from './MultiToyImageUpload';

interface ToyFormFieldsProps {
  formData: ToyFormData;
  onFormDataChange: (updates: Partial<ToyFormData>) => void;
  primaryImageIndex?: number;
  onPrimaryImageChange?: (index: number) => void;
}

const ToyFormFields: React.FC<ToyFormFieldsProps> = ({ 
  formData, 
  onFormDataChange,
  primaryImageIndex = 0,
  onPrimaryImageChange
}) => {
  const { data: categories, isLoading: categoriesLoading } = useCatalogCategories();

  const handleImagesChange = (images: string[]) => {
    onFormDataChange({ 
      images,
      // Update legacy image_url field for backward compatibility
      image_url: images.length > 0 ? images[primaryImageIndex] || images[0] : ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Images */}
      <MultiToyImageUpload
        images={formData.images}
        onImagesChange={handleImagesChange}
        primaryImageIndex={primaryImageIndex}
        onPrimaryImageChange={onPrimaryImageChange}
      />

      {/* Basic Information */}
      <ToyFormBasicInfo
        formData={formData}
        onFormDataChange={onFormDataChange}
        categories={categories}
        categoriesLoading={categoriesLoading}
      />

      {/* Pricing */}
      <ToyFormPricing
        formData={formData}
        onFormDataChange={onFormDataChange}
      />

      {/* Inventory & Display */}
      <ToyFormInventory
        formData={formData}
        onFormDataChange={onFormDataChange}
      />
    </div>
  );
};

export default ToyFormFields;
