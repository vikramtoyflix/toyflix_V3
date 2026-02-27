
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";

const ProductDetailLoading = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-20 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
            <Skeleton className="h-20 w-full rounded" />
            <Skeleton className="h-12 w-1/3 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailLoading;
