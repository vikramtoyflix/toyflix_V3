
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToysWithAgeBands } from "@/hooks/useToysWithAgeBands";

interface AdminToysHeaderProps {
  isFetching: boolean;
  onRefresh: () => void;
}

export const AdminToysHeader = ({ isFetching, onRefresh }: AdminToysHeaderProps) => {
  const navigate = useNavigate();
  const { refetch } = useToysWithAgeBands();

  const handleRefresh = async () => {
    console.log('Manual refresh triggered by user');
    onRefresh();
    // Also force refresh the toys hook
    await refetch();
  };

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-bold">Toy Management</h2>
        {isFetching && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Updating...
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button 
          onClick={handleRefresh} 
          variant="outline"
          disabled={isFetching}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button 
          onClick={() => navigate('/admin/new-toy-edit/new')} 
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Toy
        </Button>
      </div>
    </div>
  );
};
