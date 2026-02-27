
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Package, Star, DollarSign } from "lucide-react";
import { useBulkSelection } from "./BulkSelectionProvider";

interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  requiresInput?: boolean;
}

interface BulkActionToolbarProps {
  actions: BulkAction[];
  onAction: (actionId: string, value?: string) => void;
  isLoading?: boolean;
}

export const BulkActionToolbar = ({ actions, onAction, isLoading }: BulkActionToolbarProps) => {
  const { selectedCount, clearSelection } = useBulkSelection();

  if (selectedCount === 0) return null;

  return (
    <div className="bg-muted/50 border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            {actions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant={action.variant || "outline"}
                onClick={() => onAction(action.id)}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={clearSelection}
          disabled={isLoading}
        >
          Clear Selection
        </Button>
      </div>
    </div>
  );
};
