import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, X, Edit2, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
  description?: string;
}

interface InlineEditableSelectProps {
  value: string;
  options: SelectOption[];
  fieldName: string;
  onUpdate: (fieldName: string, value: string) => Promise<void>;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  showBadge?: boolean;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const InlineEditableSelect: React.FC<InlineEditableSelectProps> = ({
  value,
  options,
  fieldName,
  onUpdate,
  className = '',
  placeholder = 'Select option',
  disabled = false,
  showBadge = false,
  badgeVariant = 'outline'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentOption = options.find(opt => opt.value === value);

  const handleChange = async (newValue: string) => {
    if (newValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(fieldName, newValue);
      setIsEditing(false);
      const selectedOption = options.find(opt => opt.value === newValue);
      toast.success(`${fieldName.replace('_', ' ')} updated to ${selectedOption?.label || newValue}`);
    } catch (error) {
      console.error('Failed to update field:', error);
      toast.error(`Failed to update ${fieldName.replace('_', ' ')}`);
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (disabled) {
    if (showBadge && currentOption) {
      return (
        <Badge variant={badgeVariant} className={`${currentOption.color || ''} ${className}`}>
          {currentOption.label}
        </Badge>
      );
    }
    return (
      <div className={`p-2 ${className}`}>
        {currentOption?.label || value || <span className="text-gray-400 italic">{placeholder}</span>}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Select 
          value={value} 
          onValueChange={handleChange}
          disabled={isLoading}
        >
          <SelectTrigger className="h-8 text-sm min-w-32">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.color && (
                    <div className={`w-2 h-2 rounded-full ${option.color}`} />
                  )}
                  <span>{option.label}</span>
                  {option.description && (
                    <span className="text-xs text-gray-500 ml-2">
                      {option.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  if (showBadge && currentOption) {
    return (
      <div
        className={`cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors group ${className}`}
        onClick={() => setIsEditing(true)}
        title="Click to edit"
      >
        <Badge variant={badgeVariant} className={`${currentOption.color || ''} flex items-center gap-1`}>
          <span>{currentOption.label}</span>
          <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Badge>
      </div>
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors flex items-center gap-2 group ${className}`}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      <span className="flex-1">
        {currentOption?.label || value || <span className="text-gray-400 italic">{placeholder}</span>}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronDown className="w-3 h-3 text-gray-400" />
        <Edit2 className="w-3 h-3 text-gray-400" />
      </div>
    </div>
  );
}; 