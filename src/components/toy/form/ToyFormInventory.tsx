
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToyFormData } from "@/types/toy";

interface ToyFormInventoryProps {
  formData: ToyFormData;
  onFormDataChange: (updates: Partial<ToyFormData>) => void;
}

const ToyFormInventory: React.FC<ToyFormInventoryProps> = ({ formData, onFormDataChange }) => {
  const handleTotalQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTotalValue = e.target.value;
    const newTotal = parseInt(newTotalValue, 10);
    const available = parseInt(formData.available_quantity, 10);

    if (!isNaN(newTotal) && !isNaN(available) && available > newTotal) {
      onFormDataChange({ total_quantity: newTotalValue, available_quantity: newTotalValue });
    } else {
      onFormDataChange({ total_quantity: newTotalValue });
    }
  };

  const handleAvailableQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAvailableValue = e.target.value;
    const newAvailable = parseInt(newAvailableValue, 10);
    const total = parseInt(formData.total_quantity, 10);

    if (!isNaN(newAvailable) && !isNaN(total) && newAvailable > total) {
      onFormDataChange({ available_quantity: formData.total_quantity });
    } else {
      onFormDataChange({ available_quantity: newAvailableValue });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <Label htmlFor="total_quantity">Total Quantity *</Label>
        <Input
          id="total_quantity"
          type="number"
          value={formData.total_quantity}
          onChange={handleTotalQuantityChange}
          min="0"
          required
        />
      </div>

      <div>
        <Label htmlFor="available_quantity">Available Quantity *</Label>
        <Input
          id="available_quantity"
          type="number"
          value={formData.available_quantity}
          onChange={handleAvailableQuantityChange}
          min="0"
          required
        />
      </div>

      <div>
        <Label htmlFor="rating">Rating</Label>
        <Input
          id="rating"
          type="number"
          value={formData.rating}
          onChange={(e) => onFormDataChange({ rating: e.target.value })}
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
          onChange={(e) => onFormDataChange({ display_order: e.target.value })}
          min="1"
          placeholder="e.g. 1"
        />
      </div>
    </div>
  );
};

export default ToyFormInventory;
