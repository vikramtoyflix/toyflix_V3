import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toy } from "@/hooks/useToys";
import PriceDisplay from "@/components/ui/PriceDisplay";

interface ProductSpecificationsProps {
  toy: Toy;
}

const ProductSpecifications = ({ toy }: ProductSpecificationsProps) => {
  const specifications = [
    { label: "Category", value: toy.category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) },
    { label: "Age Range", value: toy.age_range },
    { label: "Brand", value: toy.brand },
    { label: "Rating", value: toy.rating ? `${toy.rating}/5 ⭐` : null },
  ].filter(spec => spec.value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Specifications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-4 text-lg">Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {specifications.map((spec, index) => (
                <div key={index} className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <span className="text-muted-foreground">{spec.label}:</span>
                  <span className="font-medium">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Section */}
          {toy.retail_price && (
            <div>
              <h3 className="font-semibold mb-4 text-lg">Pricing</h3>
              <PriceDisplay
                mrp={toy.retail_price}
                variant="large"
                strikethrough={true}
                showFreeWithSubscription={true}
                showMRPLabel={true}
                showRentalLabel={false}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductSpecifications;
