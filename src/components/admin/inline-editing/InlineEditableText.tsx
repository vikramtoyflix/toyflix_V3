import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface InlineEditableTextProps {
  value: string;
  fieldName: string;
  onUpdate: (fieldName: string, value: string) => Promise<void>;
  validation?: (value: string) => boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  inputType?: 'text' | 'email' | 'tel' | 'number';
}

export const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  value,
  fieldName,
  onUpdate,
  validation,
  className = '',
  placeholder = 'Click to edit',
  disabled = false,
  inputType = 'text'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const [isLoading, setIsLoading] = useState(false);

  // Update local value when prop value changes
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleSave = async () => {
    if (validation && !validation(localValue)) {
      toast.error('Invalid input format');
      return;
    }

    if (localValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(fieldName, localValue);
      setIsEditing(false);
      toast.success(`${fieldName.replace('_', ' ')} updated successfully`);
    } catch (error) {
      console.error('Failed to update field:', error);
      toast.error(`Failed to update ${fieldName.replace('_', ' ')}`);
      setLocalValue(value || ''); // Revert to original value
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setLocalValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (disabled) {
    return (
      <div className={`p-2 ${className}`}>
        {value || <span className="text-gray-400 italic">{placeholder}</span>}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type={inputType}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          autoFocus
          className="h-8 text-sm"
          placeholder={placeholder}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3" />
          )}
        </Button>
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

  return (
    <div
      className={`cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors flex items-center gap-2 group ${className}`}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      <span className="flex-1">
        {value || <span className="text-gray-400 italic">{placeholder}</span>}
      </span>
      <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}; 