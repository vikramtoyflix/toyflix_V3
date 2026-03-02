import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface CatalogErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

const CatalogErrorState = ({ message, onRetry }: CatalogErrorStateProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-20 container mx-auto px-4 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Error loading toys</h1>
        <p className="text-muted-foreground mb-4">{message || "Something went wrong. Please try again."}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
};

export default CatalogErrorState;
