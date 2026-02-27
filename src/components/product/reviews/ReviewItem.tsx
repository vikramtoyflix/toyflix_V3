
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ThumbsUp, MessageCircle } from "lucide-react";
import { Review } from "./types";

interface ReviewItemProps {
  review: Review;
}

const ReviewItem = ({ review }: ReviewItemProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{review.userName}</span>
              {review.verified && (
                <Badge variant="secondary" className="text-xs">Verified Purchase</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= review.rating ? "text-yellow-400 fill-current" : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {new Date(review.date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <p className="text-muted-foreground mb-4">{review.comment}</p>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ThumbsUp className="w-4 h-4 mr-1" />
            Helpful ({review.helpful})
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <MessageCircle className="w-4 h-4 mr-1" />
            Reply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewItem;
