
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { Review } from "./reviews/types";
import ReviewSummary from "./reviews/ReviewSummary";
import ReviewForm from "./reviews/ReviewForm";
import ReviewList from "./reviews/ReviewList";

interface ProductReviewsProps {
  toyId: string;
}

// Mock reviews data - in real app, this would come from API
const reviews: Review[] = [
  {
    id: "1",
    userName: "Priya S.",
    rating: 5,
    comment: "Excellent toy! My 6-year-old loves it. Great quality and arrived in perfect condition. Highly recommend for STEM learning.",
    date: "2024-01-15",
    helpful: 12,
    verified: true
  },
  {
    id: "2",
    userName: "Rajesh K.",
    rating: 4,
    comment: "Good product overall. The rental process was smooth and the toy was clean. Only minor issue was the delivery took a day longer than expected.",
    date: "2024-01-10",
    helpful: 8,
    verified: true
  },
  {
    id: "3",
    userName: "Meera P.",
    rating: 5,
    comment: "Amazing service! The toy kept my daughter engaged for hours. Perfect for developing problem-solving skills.",
    date: "2024-01-05",
    helpful: 15,
    verified: false
  }
];

const ProductReviews = ({ toyId }: ProductReviewsProps) => {
  const { user } = useCustomAuth();

  const handleSubmitReview = (rating: number, comment: string) => {
    if (!user) return;
    // TODO: Implement review submission
    console.log("Submit review:", { rating, comment, toyId });
  };
  
  const averageRating = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => 
    reviews.filter(review => review.rating === rating).length
  );

  return (
    <div className="space-y-6">
      <ReviewSummary 
        averageRating={averageRating}
        reviewCount={reviews.length}
        ratingDistribution={ratingDistribution}
      />

      {user && (
        <ReviewForm 
          toyId={toyId}
          onSubmit={handleSubmitReview}
        />
      )}

      <ReviewList reviews={reviews} />
    </div>
  );
};

export default ProductReviews;
