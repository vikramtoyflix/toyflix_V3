
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

interface ReviewSummaryProps {
  averageRating: number;
  reviewCount: number;
  ratingDistribution: number[];
}

const ReviewSummary = ({ averageRating, reviewCount, ratingDistribution }: ReviewSummaryProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{averageRating.toFixed(1)}</div>
            <div className="flex items-center justify-center mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= averageRating ? "text-yellow-400 fill-current" : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Based on {reviewCount} reviews</p>
          </div>
          
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-sm w-8">{rating}★</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full"
                    style={{
                      width: `${reviewCount > 0 ? (ratingDistribution[rating - 1] / reviewCount) * 100 : 0}%`
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-8">
                  {ratingDistribution[rating - 1]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewSummary;
