
interface ToyCardPricingProps {
  toy: {
    retail_price: number | null;
    show_strikethrough_pricing: boolean;
  };
  isSubscriptionView?: boolean;
}

const ToyCardPricing = ({ toy, isSubscriptionView = false }: ToyCardPricingProps) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        {isSubscriptionView ? (
          <div>
            <p className="text-lg font-bold text-green-600">
              Included in Plan
            </p>
            {toy.retail_price && (
              <p className="text-sm text-muted-foreground line-through">
                Was ₹{toy.retail_price}
              </p>
            )}
          </div>
        ) : (
          <div>
            {toy.retail_price && (
               <p className={`text-lg font-bold ${toy.show_strikethrough_pricing ? 'text-muted-foreground line-through' : 'text-primary'}`}>
                ₹{toy.retail_price}
              </p>
            )}
            <p className="text-sm text-fun-blue font-medium">
              Available with subscription
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToyCardPricing;
