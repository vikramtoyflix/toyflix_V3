
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BulkInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  inputType: "text" | "number" | "select" | "percentage";
  options?: { value: string; label: string }[];
  placeholder?: string;
  onConfirm: (value: string) => void;
  selectedCount: number;
}

export const BulkInputDialog = ({
  open,
  onOpenChange,
  title,
  description,
  inputType,
  options,
  placeholder,
  onConfirm,
  selectedCount
}: BulkInputDialogProps) => {
  const [value, setValue] = useState("");

  const handleConfirm = () => {
    if (value.trim()) {
      onConfirm(value);
      setValue("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            <br />
            <strong>{selectedCount} item{selectedCount > 1 ? 's' : ''} will be updated.</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-input">Value</Label>
            {inputType === "select" ? (
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="bulk-input"
                type={inputType === "percentage" ? "number" : inputType}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                min={inputType === "number" || inputType === "percentage" ? "0" : undefined}
                max={inputType === "percentage" ? "100" : undefined}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!value.trim()}>
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
