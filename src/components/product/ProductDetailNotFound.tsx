
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";

interface ProductDetailNotFoundProps {
  onBackClick: () => void;
}

const ProductDetailNotFound = ({ onBackClick }: ProductDetailNotFoundProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-20 container mx-auto px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Toy not found</h1>
        <Button onClick={onBackClick}>
          Return to Catalog
        </Button>
      </div>
    </div>
  );
};

export default ProductDetailNotFound;
