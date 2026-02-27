
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToyFormData, ToyCategory, SubscriptionCategory, subscriptionPacks, ageRangeOptions, subscriptionCategoryOptions } from "@/types/toy";

interface ToyFormBasicInfoProps {
  formData: ToyFormData;
  onFormDataChange: (updates: Partial<ToyFormData>) => void;
  categories: string[] | undefined;
  categoriesLoading: boolean;
}

const ToyFormBasicInfo: React.FC<ToyFormBasicInfoProps> = ({ formData, onFormDataChange, categories, categoriesLoading }) => {
  const handlePackChange = (packName: string, checked: boolean) => {
    const currentPacks = formData.pack || [];
    let updatedPacks;
    
    if (checked) {
      updatedPacks = [...currentPacks, packName];
    } else {
      updatedPacks = currentPacks.filter(pack => pack !== packName);
    }
    
    onFormDataChange({ pack: updatedPacks });
  };

  const handleCategoryChange = (categoryValue: ToyCategory, checked: boolean) => {
    const currentCategories = formData.category || [];
    let updatedCategories;
    
    if (checked) {
      updatedCategories = [...currentCategories, categoryValue];
    } else {
      updatedCategories = currentCategories.filter(category => category !== categoryValue);
    }
    
    onFormDataChange({ category: updatedCategories });
  };

  const handleAgeRangeChange = (ageRange: string, checked: boolean) => {
    const currentAgeRanges = formData.age_range || [];
    let updatedAgeRanges;
    
    if (checked) {
      updatedAgeRanges = [...currentAgeRanges, ageRange];
    } else {
      updatedAgeRanges = currentAgeRanges.filter(range => range !== ageRange);
    }
    
    onFormDataChange({ age_range: updatedAgeRanges });
  };

  const handleSubscriptionCategoryChange = (value: SubscriptionCategory) => {
    onFormDataChange({ subscription_category: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => onFormDataChange({ name: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onFormDataChange({ description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Categories *</Label>
          <div className="space-y-2 mt-2">
            {categoriesLoading ? (
              <p className="text-sm text-muted-foreground">Loading categories...</p>
            ) : categories && categories.length > 0 ? (
              categories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={formData.category?.includes(category as ToyCategory) || false}
                    onCheckedChange={(checked) => handleCategoryChange(category as ToyCategory, checked as boolean)}
                  />
                  <Label htmlFor={`category-${category}`} className="text-sm font-normal capitalize">
                    {category}
                  </Label>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No categories available</p>
            )}
          </div>
        </div>

        <div>
          <Label>Subscription Category *</Label>
          <RadioGroup
            value={formData.subscription_category}
            onValueChange={handleSubscriptionCategoryChange}
            className="mt-2"
          >
            {subscriptionCategoryOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`sub-cat-${option.value}`} />
                <Label htmlFor={`sub-cat-${option.value}`} className="text-sm font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>

      <div>
        <Label>Age Range *</Label>
        <div className="space-y-2 mt-2">
          {ageRangeOptions.map((ageRange) => (
            <div key={ageRange} className="flex items-center space-x-2">
              <Checkbox
                id={`age-range-${ageRange}`}
                checked={formData.age_range?.includes(ageRange) || false}
                onCheckedChange={(checked) => handleAgeRangeChange(ageRange, checked as boolean)}
              />
              <Label htmlFor={`age-range-${ageRange}`} className="text-sm font-normal">
                {ageRange}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => onFormDataChange({ brand: e.target.value })}
          />
        </div>

        <div>
          <Label>Subscription Packs</Label>
          <div className="space-y-2 mt-2">
            {subscriptionPacks.map((pack) => (
              <div key={pack} className="flex items-center space-x-2">
                <Checkbox
                  id={`pack-${pack}`}
                  checked={formData.pack?.includes(pack) || false}
                  onCheckedChange={(checked) => handlePackChange(pack, checked as boolean)}
                />
                <Label htmlFor={`pack-${pack}`} className="text-sm font-normal">
                  {pack}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToyFormBasicInfo;
