import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface InlineEditableTextareaProps {
  value: string;
  fieldName: string;
  onUpdate: (fieldName: string, value: string) => Promise<void>;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
}

export const InlineEditableTextarea: React.FC<InlineEditableTextareaProps> = ({
  value,
  fieldName,
  onUpdate,
  className = '',
  placeholder = 'Click to add notes...',
  disabled = false,
  rows = 3,
  maxLength = 500
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const [isLoading, setIsLoading] = useState(false);

  // Update local value when prop value changes
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleSave = async () => {
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
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
    // Allow Ctrl+Enter or Cmd+Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  if (disabled) {
    return (
      <div className={`p-2 whitespace-pre-wrap ${className}`}>
        {value || <span className="text-gray-400 italic">{placeholder}</span>}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          autoFocus
          rows={rows}
          maxLength={maxLength}
          className="text-sm resize-none"
          placeholder={placeholder}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSave}
              disabled={isLoading}
              className="h-8"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin mr-2" />
              ) : (
                <Check className="w-3 h-3 mr-2" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="h-8"
            >
              <X className="w-3 h-3 mr-2" />
              Cancel
            </Button>
          </div>
          <div className="text-xs text-gray-500">
            {localValue.length}/{maxLength} • Ctrl+Enter to save
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-gray-100 p-3 rounded transition-colors border border-transparent hover:border-gray-200 group min-h-16 ${className}`}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 whitespace-pre-wrap text-sm">
          {value || <span className="text-gray-400 italic">{placeholder}</span>}
        </div>
        <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 mt-0.5 flex-shrink-0" />
      </div>
    </div>
  );
}; 