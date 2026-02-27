
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductDescription from "@/components/product/ProductDescription";
import ProductSpecifications from "@/components/product/ProductSpecifications";
import ProductReviews from "@/components/product/ProductReviews";
import { Toy } from "@/hooks/useToys";

interface ProductDetailsTabsProps {
  toy: Toy;
  subscriptionPlanName: string | null;
}

const ProductDetailsTabs = ({ toy, subscriptionPlanName }: ProductDetailsTabsProps) => {
  return (
    <Tabs defaultValue="description" className="mb-12">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="description">Description</TabsTrigger>
        <TabsTrigger value="specifications">Specifications</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
      </TabsList>
      
      <TabsContent value="description" className="mt-6">
        <ProductDescription description={toy.description} />
      </TabsContent>
      
      <TabsContent value="specifications" className="mt-6">
        <ProductSpecifications toy={toy} subscriptionPlanName={subscriptionPlanName} />
      </TabsContent>
      
      <TabsContent value="reviews" className="mt-6">
        <ProductReviews toyId={toy.id} />
      </TabsContent>
    </Tabs>
  );
};

export default ProductDetailsTabs;
