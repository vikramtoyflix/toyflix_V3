
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

interface ReviewFormProps {
  toyId: string;
  onSubmit: (rating: number, comment: string) => void;
}

const ReviewForm = ({ toyId, onSubmit }: ReviewFormProps) => {
  const [newReview, setNewReview] = useState("");
  const [newRating, setNewRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = () => {
    onSubmit(newRating, newReview);
    setNewReview("");
    setNewRating(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Your Rating</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setNewRating(star)}
                className="p-1"
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= (hoveredRating || newRating)
                      ? "text-yellow-400 fill-current"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Your Review</label>
          <Textarea
            placeholder="Share your experience with this toy..."
            value={newReview}
            onChange={(e) => setNewReview(e.target.value)}
            rows={4}
          />
        </div>
        
        <Button 
          onClick={handleSubmit}
          disabled={!newRating || !newReview.trim()}
        >
          Submit Review
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
