
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw } from "lucide-react";
import { Toy } from "@/hooks/useToys";

interface AdminToysStatsProps {
  toys: Toy[] | undefined;
  filteredToys: Toy[] | undefined;
  isRefreshing: boolean;
}

export const AdminToysStats = ({ toys, filteredToys, isRefreshing }: AdminToysStatsProps) => {
  if (isRefreshing) {
    return (
      <Alert className="mb-4">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Refreshing toy data...
        </AlertDescription>
      </Alert>
    );
  }

  if (!toys) return null;

  return (
    <div className="text-sm text-muted-foreground mb-4">
      Showing {filteredToys?.length || 0} of {toys.length} toys
    </div>
  );
};
