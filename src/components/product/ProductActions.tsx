
import { Button } from "@/components/ui/button";
import { Users, Heart } from "lucide-react";

interface ProductActionsProps {
  availableQuantity: number;
  onAddToCart: () => void;
  onAddToWishlist: () => void;
}

const ProductActions = ({ availableQuantity, onAddToCart, onAddToWishlist }: ProductActionsProps) => {
  return (
    <div className="flex gap-3">
      <Button
        className="flex-1"
        onClick={onAddToCart}
      >
        <Users className="w-4 h-4 mr-2" />
        Subscribe Now
      </Button>
      <Button variant="outline" onClick={onAddToWishlist}>
        <Heart className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ProductActions;
