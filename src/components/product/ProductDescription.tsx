
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductDescriptionProps {
  description: string | null;
}

const ProductDescription = ({ description }: ProductDescriptionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Description</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">
          {description || "No description available for this toy."}
        </p>
      </CardContent>
    </Card>
  );
};

export default ProductDescription;
