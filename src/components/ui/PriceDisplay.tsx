import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  mrp?: number | null;
  rentalPrice?: number | null;
  className?: string;
  showMRPLabel?: boolean;
  showRentalLabel?: boolean;
  strikethrough?: boolean;
  variant?: "default" | "compact" | "large" | "minimal";
  showFreeWithSubscription?: boolean;
}

export const PriceDisplay = ({
  mrp,
  rentalPrice,
  className,
  showMRPLabel = true,
  showRentalLabel = false,
  strikethrough = true,
  variant = "default",
  showFreeWithSubscription = true
}: PriceDisplayProps) => {
  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString()}`;
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "compact":
        return {
          container: "space-y-1",
          mrp: "text-sm",
          rental: "text-sm font-semibold",
          label: "text-xs",
          freeMessage: "text-xs font-bold"
        };
      case "large":
        return {
          container: "space-y-3",
          mrp: "text-lg",
          rental: "text-xl font-bold",
          label: "text-sm",
          freeMessage: "text-lg font-bold"
        };
      case "minimal":
        return {
          container: "flex items-center gap-2",
          mrp: "text-sm",
          rental: "text-sm font-semibold",
          label: "text-xs",
          freeMessage: "text-xs font-bold"
        };
      default:
        return {
          container: "space-y-2",
          mrp: "text-base",
          rental: "text-lg font-semibold",
          label: "text-sm",
          freeMessage: "text-base font-bold"
        };
    }
  };

  const styles = getVariantStyles();

  if (!mrp && !rentalPrice) {
    return null;
  }

  return (
    <div className={cn(styles.container, className)}>
      {/* MRP Display */}
      {mrp && (
        <div className={cn(
          styles.mrp,
          strikethrough ? "text-muted-foreground line-through" : "text-gray-700",
          variant === "minimal" ? "flex items-center gap-1" : ""
        )}>
          {showMRPLabel && (
            <span className={cn(styles.label, "text-muted-foreground")}>
              MRP: 
            </span>
          )}
          <span className={variant === "minimal" ? "" : "ml-1"}>
            {formatPrice(mrp)}
          </span>
        </div>
      )}

      {/* Free with Subscription Message */}
      {showFreeWithSubscription && strikethrough && mrp && (
        <div className={cn(
          styles.freeMessage,
          variant === "compact" ? "text-green-600" : variant === "large" ? "text-green-700" : "text-green-600",
          "bg-green-50 px-3 py-1 rounded-full inline-block border border-green-200"
        )}>
          🎉 Free with subscription
        </div>
      )}

      {/* Rental Price Display */}
      {rentalPrice && showRentalLabel && (
        <div className={cn(styles.rental, "text-primary")}>
          <span className={cn(styles.label, "text-muted-foreground")}>
            Rental: 
          </span>
          <span className={variant === "minimal" ? "" : "ml-1"}>
            {formatPrice(rentalPrice)}/month
          </span>
        </div>
      )}
    </div>
  );
};

export default PriceDisplay; 