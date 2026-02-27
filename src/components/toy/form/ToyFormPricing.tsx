import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ToyFormData } from "@/types/toy";

interface ToyFormPricingProps {
  formData: ToyFormData;
  onFormDataChange: (updates: Partial<ToyFormData>) => void;
}

const ToyFormPricing: React.FC<ToyFormPricingProps> = ({ formData, onFormDataChange }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="retail_price">MRP (Maximum Retail Price) ₹</Label>
          <Input
            id="retail_price"
            type="number"
            value={formData.retail_price}
            onChange={(e) => onFormDataChange({ retail_price: e.target.value })}
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <Label htmlFor="rental_price">Rental Price (₹/month)</Label>
          <Input
            id="rental_price"
            type="number"
            value={formData.rental_price}
            onChange={(e) => onFormDataChange({ rental_price: e.target.value })}
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show_strikethrough_pricing"
            checked={formData.show_strikethrough_pricing}
            onCheckedChange={(checked) => onFormDataChange({ show_strikethrough_pricing: checked as boolean })}
          />
          <Label htmlFor="show_strikethrough_pricing" className="text-sm font-normal">
            Show strikethrough pricing on product display
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_featured"
            checked={formData.is_featured}
            onCheckedChange={(checked) => onFormDataChange({ is_featured: checked as boolean })}
          />
          <Label htmlFor="is_featured" className="text-sm font-normal">
            Feature this toy (appears in featured sections)
          </Label>
        </div>
      </div>
    </div>
  );
};

export default ToyFormPricing;
