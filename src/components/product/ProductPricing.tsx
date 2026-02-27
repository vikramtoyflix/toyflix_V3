import PriceDisplay from "@/components/ui/PriceDisplay";

interface ProductPricingProps {
  rentalPrice: number | null;
  retailPrice: number | null;
}

const ProductPricing = ({ rentalPrice, retailPrice }: ProductPricingProps) => {
  // Strikethrough is always enabled on the product page for a consistent look.
  // The toggle has been moved to the admin panel.
  const showStrikethrough = true;

  return (
    <div>
      <h3 className="font-semibold mb-2">Pricing</h3>
      <PriceDisplay
        mrp={retailPrice}
        rentalPrice={rentalPrice}
        strikethrough={true}
        showFreeWithSubscription={true}
        variant="default"
      />
    </div>
  );
};

export default ProductPricing;
