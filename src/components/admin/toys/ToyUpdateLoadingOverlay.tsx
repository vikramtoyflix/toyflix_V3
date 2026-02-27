
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

interface ToyUpdateLoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export const ToyUpdateLoadingOverlay = ({ 
  isVisible, 
  message = "Updating toy data..." 
}: ToyUpdateLoadingOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-80">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-3">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <div>
              <h3 className="font-semibold">Please wait</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </div>
          <div className="mt-4 text-xs text-center text-muted-foreground">
            This may take a few moments...
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
