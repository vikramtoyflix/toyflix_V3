import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToyBrick, Bot, BrainCircuit, BookOpen, CheckCircle2, Crown } from "lucide-react";
import { ToySelectionStep } from "@/services/toySelectionService";
import { PlanService } from "@/services/planService";

interface ToySelectionStepInfoProps {
  stepInfo: ToySelectionStep;
  ageGroup: string;
  isQueueManagement?: boolean;
  required: number;
  selected: number;
  planId?: string;
}

export default function ToySelectionStepInfo({ 
  stepInfo, 
  ageGroup, 
  isQueueManagement = false, 
  required, 
  selected, 
  planId 
}: ToySelectionStepInfoProps) {
  const getIcon = (iconName: string) => {
    const iconProps = { className: "w-8 h-8" };
    switch (iconName) {
      case 'ToyBrick':
        return <ToyBrick {...iconProps} />;
      case 'Bot':
        return <Bot {...iconProps} />;
      case 'BrainCircuit':
        return <BrainCircuit {...iconProps} />;
      case 'BookOpen':
        return <BookOpen {...iconProps} />;
      default:
        return <ToyBrick {...iconProps} />;
    }
  };

  const getStepDescription = (subscriptionCategory: string) => {
    switch (subscriptionCategory) {
      case 'big_toys':
        return "Large toys perfect for physical play, outdoor activities, and building adventures.";
      case 'stem_toys':
        return "Learning-focused toys that develop creativity, language skills, and cognitive abilities.";
      case 'educational_toys':
        return "Toys that help kids build key skills—logic, problem-solving, and development across Bangalore.";
      case 'books':
        return "Educational books and reading materials to enhance language development and literacy skills.";
      case 'developmental_toys':
        return "Toys that help kids build key skills—logic, problem-solving, and development across Bangalore.";
      default:
        return "Select toys from this category for your monthly box.";
    }
  };

  const isComplete = selected >= required;
  const isGoldPack = planId ? PlanService.isPremiumPlan(planId) : false;
  
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center space-y-0 pb-4">
        <div className="flex items-center space-x-4 flex-1">
          <div className={`p-3 rounded-lg ${isComplete ? 'bg-green-100' : 'bg-primary/10'}`}>
            {isComplete ? (
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            ) : (
              getIcon(stepInfo.icon)
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl flex items-center gap-2">
              Step {stepInfo.step}: {stepInfo.description}
              {isComplete && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {!isGoldPack && <Badge variant="outline">Age Group: {ageGroup}</Badge>}
              {isGoldPack && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900 border-yellow-300">
                  <Crown className="w-3 h-3 mr-1" />
                  All Ages
                </Badge>
              )}
              <Badge variant="secondary" className="capitalize">
                {stepInfo.subscriptionCategory === 'stem_toys' ? 'Educational' : stepInfo.subscriptionCategory === 'educational_toys' ? 'Developmental' : stepInfo.subscriptionCategory === 'developmental_toys' ? 'Developmental' : stepInfo.subscriptionCategory.replace(/_/g, ' ')}
              </Badge>
              <Badge variant={isComplete ? "default" : "outline"}>
                {selected}/{required} Selected
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-3">
          {getStepDescription(stepInfo.subscriptionCategory)}
        </p>
        
        {/* Gold Pack Premium Access Info */}
        {isGoldPack && (
          <div className="mb-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800">Gold Pack PRO Benefits</span>
            </div>
            <div className="space-y-1 text-sm text-yellow-700">
              <p>✨ Access to premium toys worth ₹10,000-₹15,000</p>
              <p>🎯 All age groups available (no age restrictions)</p>
              <p>⭐ Exclusive high-value toy collection</p>
            </div>
          </div>
        )}
        
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
          <p className="text-sm text-blue-800">
            📋 <strong>Selection Required:</strong> Choose {required} toy{required > 1 ? 's' : ''} from this category to proceed to the next step.
          </p>
        </div>

      </CardContent>
    </Card>
  );
}
