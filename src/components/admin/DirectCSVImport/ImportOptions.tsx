
import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Image, Trash2 } from "lucide-react";
import { DirectImportOptions } from './types';

interface ImportOptionsProps {
  options: DirectImportOptions;
  onChange: (options: DirectImportOptions) => void;
  disabled: boolean;
}

export const ImportOptions: React.FC<ImportOptionsProps> = ({ options, onChange, disabled }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="download-images"
          checked={options.downloadImages}
          onCheckedChange={(checked) => onChange({ ...options, downloadImages: checked as boolean })}
          disabled={disabled}
        />
        <Label htmlFor="download-images" className="flex items-center gap-2">
          <Image className="w-4 h-4" />
          Download and store images
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="clear-existing"
          checked={options.clearExistingData}
          onCheckedChange={(checked) => onChange({ ...options, clearExistingData: checked as boolean })}
          disabled={disabled}
        />
        <Label htmlFor="clear-existing" className="flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Clear existing data first
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="skip-duplicates"
          checked={options.skipDuplicates}
          onCheckedChange={(checked) => onChange({ ...options, skipDuplicates: checked as boolean })}
          disabled={disabled}
        />
        <Label htmlFor="skip-duplicates">Skip duplicates</Label>
      </div>
    </div>
  );
};
