import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useToysGroupedByAge, useToysForAgeGroup } from "@/hooks/useToysWithAgeBands";
import { Toy } from "@/hooks/useToys";
import ToyGrid from "./ToyGrid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Package, Users, Baby, GraduationCap, Gamepad2 } from "lucide-react";

interface AgeBandCatalogViewProps {
  onToyAction: (toy: Toy, e: React.MouseEvent) => void;
  onAddToWishlist: (toyId: string, e: React.MouseEvent) => void;
  onViewProduct: (toyId: string) => void;
}

const AgeBandCatalogView = ({
  onToyAction,
  onAddToWishlist,
  onViewProduct
}: AgeBandCatalogViewProps) => {
  const [selectedAgeGroup, setSelectedAgeGroup] = useState("1-2");
  const { user } = useCustomAuth();
  const navigate = useNavigate();
  
  // Get toys grouped by age bands for overview
  const { data: groupedToys, isLoading: isLoadingGrouped } = useToysGroupedByAge();
  
  // Get toys for the selected age group
  const { data: selectedAgeToys, isLoading: isLoadingSelected } = useToysForAgeGroup(selectedAgeGroup);

  const getAgeIcon = (ageGroup: string) => {
    if (ageGroup.includes('0-1')) return Baby;
    if (ageGroup.includes('1-2') || ageGroup.includes('2-3')) return Users;
    if (ageGroup.includes('3-4') || ageGroup.includes('4-6')) return GraduationCap;
    return Gamepad2;
  };

  const getAgeColor = (ageGroup: string) => {
    if (ageGroup.includes('0-1')) return 'bg-pink-100 text-pink-700 border-pink-200';
    if (ageGroup.includes('1-2') || ageGroup.includes('2-3')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (ageGroup.includes('3-4') || ageGroup.includes('4-6')) return 'bg-green-100 text-green-700 border-green-200';
    return 'bg-purple-100 text-purple-700 border-purple-200';
  };

  return (
    <div className="space-y-6">
      {/* Age Band Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {(groupedToys || []).map((ageGroup) => {
          const AgeIcon = getAgeIcon(ageGroup.ageGroup);
          const isSelected = selectedAgeGroup === ageGroup.ageGroup;
          
          return (
            <Card 
              key={ageGroup.ageGroup}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedAgeGroup(ageGroup.ageGroup)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex flex-col items-center space-y-2">
                  <div className={`p-2 rounded-full ${getAgeColor(ageGroup.ageGroup)}`}>
                    <AgeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{ageGroup.ageGroup} years</p>
                    <p className="text-xs text-muted-foreground">{ageGroup.count} toys</p>
                  </div>
                  {isSelected && (
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Selected
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Age Group Display */}
      <Card className="bg-gradient-to-r from-toy-sky/10 via-toy-mint/10 to-toy-sunshine/10 border-toy-mint/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-toy-mint" />
            Toys for {selectedAgeGroup} Years Old
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-toy-sunshine/20 text-toy-sunshine border-toy-sunshine/30 px-3 py-1">
                <Sparkles className="w-3 h-3 mr-1" />
                Age: {selectedAgeGroup} years
              </Badge>
              <div className="text-sm text-muted-foreground">
                {isLoadingSelected ? "Loading..." : `${selectedAgeToys?.length || 0} toys available`}
              </div>
            </div>
            
            {/* Quick age group switcher */}
            <div className="flex gap-1">
              {['1-2', '2-3', '3-4', '4-6', '6-8'].map((age) => (
                <Button
                  key={age}
                  variant={selectedAgeGroup === age ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedAgeGroup(age)}
                  className="text-xs"
                >
                  {age}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User subscription prompts */}
      {user && (
        <Alert className="mb-6">
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Browse toys perfectly matched for your child's age. Subscribe to get age-appropriate toys delivered monthly.
              </span>
              <Button onClick={() => navigate('/subscription-flow')}>
                Subscribe Now
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Not logged in info */}
      {!user && (
        <Alert className="mb-6">
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Discover age-appropriate toys for your child. Sign in to subscribe and get toys delivered monthly.
              </span>
              <div className="flex gap-2 ml-4">
                <Button variant="outline" onClick={() => navigate('/auth?mode=signin')}>
                  Sign In
                </Button>
                <Button onClick={() => navigate('/auth?redirect=%2Fsubscription-flow')}>
                  Subscribe
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Toys Grid for Selected Age Group */}
      <ToyGrid
        toys={selectedAgeToys || []}
        isLoading={isLoadingSelected}
        onToyAction={onToyAction}
        onAddToWishlist={onAddToWishlist}
        onViewProduct={onViewProduct}
        isSubscriptionView={false}
      />

      {/* Age Group Information */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">About {selectedAgeGroup} Years Development</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Developmental Milestones</h4>
              <ul className="space-y-1">
                {selectedAgeGroup === '1-2' && (
                  <>
                    <li>• Walking and climbing</li>
                    <li>• Simple word recognition</li>
                    <li>• Hand-eye coordination</li>
                    <li>• Cause and effect learning</li>
                  </>
                )}
                {selectedAgeGroup === '2-3' && (
                  <>
                    <li>• Running and jumping</li>
                    <li>• Two-word sentences</li>
                    <li>• Pretend play begins</li>
                    <li>• Shape and color recognition</li>
                  </>
                )}
                {selectedAgeGroup === '3-4' && (
                  <>
                    <li>• Complex physical activities</li>
                    <li>• Storytelling and imagination</li>
                    <li>• Social play with others</li>
                    <li>• Basic counting and letters</li>
                  </>
                )}
                {selectedAgeGroup === '4-6' && (
                  <>
                    <li>• Advanced motor skills</li>
                    <li>• Creative expression</li>
                    <li>• Problem-solving abilities</li>
                    <li>• Pre-reading skills</li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Perfect Toy Types</h4>
              <ul className="space-y-1">
                {selectedAgeGroup === '1-2' && (
                  <>
                    <li>• Stacking and nesting toys</li>
                    <li>• Push and pull toys</li>
                    <li>• Musical instruments</li>
                    <li>• Soft books and textures</li>
                  </>
                )}
                {selectedAgeGroup === '2-3' && (
                  <>
                    <li>• Building blocks</li>
                    <li>• Art and craft supplies</li>
                    <li>• Dress-up costumes</li>
                    <li>• Simple puzzles</li>
                  </>
                )}
                {selectedAgeGroup === '3-4' && (
                  <>
                    <li>• Educational games</li>
                    <li>• Construction sets</li>
                    <li>• Role-play toys</li>
                    <li>• Interactive books</li>
                  </>
                )}
                {selectedAgeGroup === '4-6' && (
                  <>
                    <li>• STEM learning toys</li>
                    <li>• Advanced building sets</li>
                    <li>• Board games</li>
                    <li>• Science experiments</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgeBandCatalogView; 