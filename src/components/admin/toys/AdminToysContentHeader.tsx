import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Toy } from "@/hooks/useToys";

interface AdminToysContentHeaderProps {
  toys: Toy[] | undefined;
  filteredToys: Toy[] | undefined;
  isRefreshing: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}

export const AdminToysContentHeader = ({
  toys,
  filteredToys,
  isRefreshing,
  isLoading,
  onRefresh
}: AdminToysContentHeaderProps) => {
  const navigate = useNavigate();

  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle>Toy Management</CardTitle>
          <CardDescription>
            Manage your toy inventory and catalog
            {toys && (
              <span className="ml-2 text-sm font-medium">
                ({filteredToys?.length || 0} of {toys.length} toys)
              </span>
            )}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={onRefresh} 
            variant="outline" 
            size="sm"
            disabled={isRefreshing || isLoading}
          >
            {isRefreshing || isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button onClick={() => navigate('/admin/toys/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Toy
          </Button>
        </div>
      </div>
    </CardHeader>
  );
};
