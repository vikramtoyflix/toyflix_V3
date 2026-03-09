import { SubscriptionCategory } from "@/types/toy";
import { checkToyStock } from "@/utils/stockValidation";

export interface ToySelectionStep {
  step: number;
  description: string;
  subscriptionCategory: SubscriptionCategory;
  icon: 'ToyBrick' | 'Bot' | 'BrainCircuit' | 'BookOpen' | string;
}

export class ToySelectionService {
  static getSelectionSteps(): ToySelectionStep[] {
    return [
      {
        step: 1,
        description: "Big Toys",
        subscriptionCategory: "big_toys",
        icon: "ToyBrick"
      },
      {
        step: 2,
        description: "Educational",
        subscriptionCategory: "educational_toys",
        icon: "BrainCircuit"
      },
      {
        step: 3,
        description: "Developmental",
        subscriptionCategory: "developmental_toys",
        icon: "Bot"
      },
      {
        step: 4,
        description: "Books",
        subscriptionCategory: "books",
        icon: "BookOpen"
      }
    ];
  }

  static getStepInfo(stepNumber: number): ToySelectionStep | null {
    const steps = this.getSelectionSteps();
    return steps.find(step => step.step === stepNumber) || null;
  }

  static async validateToySelection(toyId: string, stepInfo: ToySelectionStep): Promise<{
    isValid: boolean;
    message?: string;
    stockInfo?: any;
  }> {
    try {
      // Check toy stock availability
      const stockInfo = await checkToyStock(toyId);
      
      if (!stockInfo) {
        return {
          isValid: false,
          message: "Toy not found or unavailable",
          stockInfo: null
        };
      }
      
      if (!stockInfo.isInStock) {
        return {
          isValid: false,
          message: `${stockInfo.name} is currently out of stock`,
          stockInfo
        };
      }
      
      // Additional validation logic can be added here
      // For example, checking if toy category matches step requirements
      
      return {
        isValid: true,
        message: "Toy is available for selection",
        stockInfo
      };
      
    } catch (error) {
      console.error('Error validating toy selection:', error);
      return {
        isValid: false,
        message: "Error checking toy availability",
        stockInfo: null
      };
    }
  }

  static getUserSelections(userId: string, cycleMonth: string): Promise<any[]> {
    // Mock implementation - in real app this would fetch from database
    return Promise.resolve([]);
  }

  /**
   * Validate multiple toy selections at once
   */
  static async validateMultipleToySelections(
    toyIds: string[], 
    stepInfo?: ToySelectionStep
  ): Promise<{
    isValid: boolean;
    validToys: string[];
    invalidToys: string[];
    messages: string[];
  }> {
    const validToys: string[] = [];
    const invalidToys: string[] = [];
    const messages: string[] = [];

    for (const toyId of toyIds) {
      const validation = await this.validateToySelection(toyId, stepInfo || {} as ToySelectionStep);
      
      if (validation.isValid) {
        validToys.push(toyId);
      } else {
        invalidToys.push(toyId);
        if (validation.message) {
          messages.push(validation.message);
        }
      }
    }

    return {
      isValid: invalidToys.length === 0,
      validToys,
      invalidToys,
      messages
    };
  }
}
