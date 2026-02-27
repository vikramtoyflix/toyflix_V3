import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Edit2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface InlineEditableDateProps {
  value: string;
  fieldName: string;
  onUpdate: (fieldName: string, value: string) => Promise<void>;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  dateFormat?: string;
}

export const InlineEditableDate: React.FC<InlineEditableDateProps> = ({
  value,
  fieldName,
  onUpdate,
  className = '',
  placeholder = 'Select date',
  disabled = false,
  dateFormat = 'MMM dd, yyyy'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Convert database date to input format and vice versa
  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        setLocalValue(format(date, 'yyyy-MM-dd'));
      } catch {
        setLocalValue('');
      }
    } else {
      setLocalValue('');
    }
  }, [value]);

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), dateFormat);
    } catch {
      return dateString;
    }
  };

  const handleSave = async () => {
    if (!localValue) {
      toast.error('Please select a valid date');
      return;
    }

    // Convert to ISO date format for database
    const dbValue = localValue; // Input already gives us YYYY-MM-DD

    if (dbValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(fieldName, dbValue);
      setIsEditing(false);
      toast.success(`${fieldName.replace('_', ' ')} updated successfully`);
    } catch (error) {
      console.error('Failed to update field:', error);
      toast.error(`Failed to update ${fieldName.replace('_', ' ')}`);
      // Revert to original value
      if (value) {
        try {
          const date = new Date(value);
          setLocalValue(format(date, 'yyyy-MM-dd'));
        } catch {
          setLocalValue('');
        }
      } else {
        setLocalValue('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (value) {
      try {
        const date = new Date(value);
        setLocalValue(format(date, 'yyyy-MM-dd'));
      } catch {
        setLocalValue('');
      }
    } else {
      setLocalValue('');
    }
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
      <div className={`p-2 flex items-center gap-2 ${className}`}>
        <Calendar className="w-4 h-4 text-gray-400" />
        {value ? formatDisplayDate(value) : <span className="text-gray-400 italic">{placeholder}</span>}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          autoFocus
          className="h-8 text-sm"
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
      <Calendar className="w-4 h-4 text-gray-400" />
      <span className="flex-1">
        {value ? formatDisplayDate(value) : <span className="text-gray-400 italic">{placeholder}</span>}
      </span>
      <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}; 