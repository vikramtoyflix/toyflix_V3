
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ToyCarouselHeader from "./ToyCarouselHeader";

const ToyCarouselLoadingState = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <ToyCarouselHeader />
        
        <div className="w-full max-w-6xl mx-auto">
          <div className="flex gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-1">
                <Card className="h-full">
                  <CardContent className="p-0">
                    <Skeleton className="w-full h-48 rounded-t-lg" />
                    <div className="p-6">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-3" />
                      <Skeleton className="h-4 w-1/2 mb-4" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ToyCarouselLoadingState;
