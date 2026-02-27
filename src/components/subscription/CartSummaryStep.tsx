import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Edit2, Loader2 } from "lucide-react";
import { Toy } from "@/hooks/useToys";
import { PlanService } from "@/services/planService";

interface CartSummaryStepProps {
  selectedPlan: string;
  selectedToys: Toy[];
  selectedAgeGroup: string;
  rideOnToyId?: string;
  onBack: () => void;
  onProceedToPayment: () => void;
  onEditToys: () => void;
  isCheckingPaymentEligibility?: boolean;
}

const CartSummaryStep = ({ 
  selectedPlan, 
  selectedToys, 
  selectedAgeGroup, 
  rideOnToyId,
  onBack, 
  onProceedToPayment,
  onEditToys,
  isCheckingPaymentEligibility = false
}: CartSummaryStepProps) => {
  const isRideOnPurchase = !!rideOnToyId;
  
  // For ride-on toys, use a custom plan object
  const plan = isRideOnPurchase 
    ? { 
        id: 'ride_on_fixed', 
        name: 'Ride-On Monthly', 
        description: 'Single ride-on toy rental with no age restrictions',
        price: 1999,
        duration: 1,
        features: {
          bigToys: 0,
          stemToys: 0,
          educationalToys: 0,
          books: 0,
          rideOnToys: 1
        }
      }
    : PlanService.getPlan(selectedPlan);

  if (!plan) {
    return <div>Plan not found</div>;
  }

  // Calculate GST and total amount (ride-on has fixed pricing)
  const baseAmount = plan.price;
  const gstAmount = isRideOnPurchase ? Math.round(1999 * 18 / 100) : PlanService.calculateGST(baseAmount);
  const totalAmount = isRideOnPurchase ? 2359 : PlanService.calculateTotalWithGST(baseAmount);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">
          Review Your Selection
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground px-4">
          Please review your plan and toy selections before proceeding to payment
        </p>
      </div>

      <div className="space-y-6">
        {/* Plan Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Selected Plan</span>
              <Badge variant="secondary">{selectedAgeGroup} years</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                <div className="space-y-1 text-sm">
                  {isRideOnPurchase ? (
                    <>
                      <p>• 1 Premium Ride-On Toy</p>
                      <p>• No age restrictions</p>
                      <p>• Monthly subscription</p>
                      <p>• Premium quality guaranteed</p>
                    </>
                  ) : (
                    <>
                      <p>• {plan.features.bigToys} Big Toy{plan.features.bigToys > 1 ? 's' : ''}</p>
                      <p>• {plan.features.stemToys} STEM Toy{plan.features.stemToys > 1 ? 's' : ''}</p>
                      <p>• {plan.features.educationalToys} Educational Toy{plan.features.educationalToys > 1 ? 's' : ''}</p>
                      <p>• {plan.features.books} Book{plan.features.books > 1 ? 's' : ''}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">₹{plan.price}</div>
                <div className="text-sm text-muted-foreground">/{plan.duration === 1 ? 'month' : `${plan.duration} months`}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Toys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isRideOnPurchase ? 'Selected Ride-On Toy' : `Selected Toys (${selectedToys.length})`}</span>
              {!isRideOnPurchase && (
                <Button variant="outline" size="sm" onClick={onEditToys}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Selection
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedToys.map((toy, index) => (
                <div key={toy.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <img
                    src={toy.image_url || "/placeholder.svg"}
                    alt={toy.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold">{toy.name}</h4>
                    <p className="text-sm text-muted-foreground">{toy.category}</p>
                    <p className="text-sm text-muted-foreground">{toy.brand}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      Selection #{index + 1}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Plan: {plan.name}</span>
                <span>₹{baseAmount}</span>
              </div>
              <div className="flex justify-between">
                <span>Age Group:</span>
                <span>{selectedAgeGroup} years</span>
              </div>
              <div className="flex justify-between">
                <span>Toys Selected:</span>
                <span>{selectedToys.length} toys</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span>Plan Amount:</span>
                  <span>₹{baseAmount}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>GST (18%):</span>
                  <span>₹{gstAmount}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total Amount:</span>
                    <span>₹{totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-between mt-8">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-full"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          {isRideOnPurchase ? 'Back to Toys' : 'Back to Toy Selection'}
        </Button>
        <Button 
          onClick={onProceedToPayment}
          disabled={isCheckingPaymentEligibility}
          className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
        >
          {isCheckingPaymentEligibility ? (
            <>
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
              Checking Subscription...
            </>
          ) : (
            <>
              Proceed to Payment
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CartSummaryStep;
