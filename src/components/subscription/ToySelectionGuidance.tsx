
import React from 'react';
import { ToySelectionService, ToySelectionStep } from '@/services/toySelectionService';
import { ToyBrick, Bot, BrainCircuit, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const icons = {
  ToyBrick,
  Bot,
  BrainCircuit,
  BookOpen,
};

const benefitText: { [key: number]: string } = {
  1: 'Develops gross motor skills and physical coordination.',
  2: 'Enhances problem-solving and critical thinking abilities.',
  3: 'Boosts cognitive development and creativity.',
  4: 'Improves language skills and reading comprehension.',
};

const categoryExamples: { [key: string]: string[] } = {
  'big_toys': ['Ride-on toys', 'Large building sets', 'Outdoor play equipment'],
  'stem_toys': ['Robotics kits', 'Science experiments', 'Coding games'],
  'educational_toys': ['Puzzles', 'Learning games', 'Creative activities'],
  'books': ['Picture books', 'Activity books', 'Educational readers']
};

const StepCard = ({ step }: { step: ToySelectionStep }) => {
  const LucideIcon = icons[step.icon as keyof typeof icons];
  const examples = categoryExamples[step.subscriptionCategory] || [];
  
  return (
    <div className={cn("flex items-start space-x-4 rounded-lg border p-4 bg-background")}>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">
        {step.step}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold">{step.description}</h3>
        <p className="text-sm text-muted-foreground">{benefitText[step.step]}</p>
        <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-xs font-medium text-muted-foreground">e.g.</span>
            {examples.map((example) => (
              <div key={example} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                {example}
              </div>
            ))}
        </div>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-secondary-foreground flex-shrink-0">
        {LucideIcon && <LucideIcon className="h-6 w-6" />}
      </div>
    </div>
  )
}

const ToySelectionGuidance = () => {
  const selectionSteps = ToySelectionService.getSelectionSteps();

  return (
    <div>
      <div className="space-y-4">
        {selectionSteps.map((step) => (
          <StepCard key={step.step} step={step} />
        ))}
      </div>
    </div>
  );
};

export default ToySelectionGuidance;
