
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProductBreadcrumbProps {
  toyName: string;
  category: string;
  onBackClick: () => void;
  customBackText?: string;
}

const ProductBreadcrumb = ({ 
  toyName, 
  category, 
  onBackClick,
  customBackText 
}: ProductBreadcrumbProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={`flex items-center gap-2 ${isMobile ? 'mb-4' : 'mb-6'}`}>
      <Button 
        variant="ghost" 
        size={isMobile ? "sm" : "default"}
        onClick={onBackClick}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        {customBackText || (isMobile ? "Back" : "Back to Toys")}
      </Button>
      
      {!isMobile && (
        <>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground capitalize">{category}</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium truncate max-w-[200px]">{toyName}</span>
        </>
      )}
    </div>
  );
};

export default ProductBreadcrumb;
