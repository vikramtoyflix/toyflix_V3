import { Plan } from '@/types/subscription';

export class PlanService {
  private static plans: Map<string, Plan> = new Map([
    ['discovery-delight', {
      id: 'discovery-delight',
      name: 'Discovery Delight',
      description: 'Perfect for exploring new toys every month',
      price: 1299,
      duration: 1,
      type: 'monthly',
      features: {
        standardToys: 3,
        bigToys: 1,
        stemToys: 1,
        educationalToys: 1,
        books: 1,
        customizationPool: {
          toys: 30,
          books: 12
        },
        valueCapMin: 6000,
        valueCapMax: 6000,
        pauseMonthsAllowed: 0,
        specialPerks: ['no_damages', 'no_deposit']
      }
    }],
    ['silver-pack', {
      id: 'silver-pack',
      name: 'Silver Pack',
      description: 'Great value with bigger toys and more flexibility',
      price: 5999,
      duration: 6,
      type: 'six_month',
      features: {
        standardToys: 3,
        bigToys: 1,
        stemToys: 1,
        educationalToys: 1,
        books: 1,
        customizationPool: {
          toys: 110,
          bigToys: 15,
          books: 15
        },
        valueCapMin: 8000,
        valueCapMax: 10000,
        pauseMonthsAllowed: 2,
        specialPerks: ['no_damages', 'no_deposit', 'daily_cost_30']
      }
    }],
    ['gold-pack', {
      id: 'gold-pack',
      name: 'Gold Pack PRO',
      description: 'Premium experience with exclusive toys and perks',
      price: 7999,
      duration: 6,
      type: 'six_month',
      features: {
        standardToys: 0,
        bigToys: 1,
        stemToys: 1,
        educationalToys: 1,
        books: 1,
        customizationPool: {
          toys: 350,
          books: 60
        },
        valueCapMin: 8000,
        valueCapMax: 15000,
        pauseMonthsAllowed: 3,
        specialPerks: [
          'no_damages', 
          'no_deposit', 
          'roller_coaster_ride', 
          'coupe_ride_car',
          'early_access',
          'toy_reservation'
        ]
      }
    }]
  ]);

  static getPlan(planId: string): Plan | null {
    // Handle legacy plan ID mappings
    const legacyPlanMap: Record<string, string> = {
      'basic': 'discovery-delight',
      'premium': 'silver-pack',
      'family': 'gold-pack',
      'standard': 'silver-pack',
      'trial': 'discovery-delight'
    };
    
    // Use the mapped plan ID if it's a legacy ID, otherwise use the original
    const normalizedPlanId = legacyPlanMap[planId] || planId;
    
    return this.plans.get(normalizedPlanId) || null;
  }

  static getAllPlans(): Plan[] {
    return Array.from(this.plans.values());
  }

  static validatePlanId(planId: string): boolean {
    return this.plans.has(planId);
  }

  static calculateGST(amount: number, gstRate: number = 0.18): number {
    return Math.round(amount * gstRate);
  }

  static calculateTotalWithGST(amount: number, gstRate: number = 0.18): number {
    return amount + this.calculateGST(amount, gstRate);
  }

  static isPremiumPlan(planId: string): boolean {
    return planId === 'gold-pack';
  }

  static hasSpecialPerks(planId: string): boolean {
    const plan = this.getPlan(planId);
    return plan?.features.specialPerks?.some(perk => 
      ['roller_coaster_ride', 'coupe_ride_car', 'early_access', 'toy_reservation'].includes(perk)
    ) || false;
  }

  /**
   * Check if age selection should be skipped for a plan
   */
  static shouldSkipAgeSelection(planId: string): boolean {
    return this.isPremiumPlan(planId);
  }

  /**
   * Check if a toy's price makes it a premium toy (₹10,000-₹15,000)
   */
  static isPremiumPricedToy(retailPrice?: number): boolean {
    if (!retailPrice) return false;
    return retailPrice >= 10000 && retailPrice <= 15000;
  }

  /**
   * Check if a user can access premium-priced toys
   */
  static canAccessPremiumToys(planId: string): boolean {
    return this.isPremiumPlan(planId);
  }

  /**
   * Filter toys based on plan access and pricing
   */
  static filterToysByPlanAccess(toys: any[], planId: string): any[] {
    const canAccessPremium = this.canAccessPremiumToys(planId);
    
    return toys.filter(toy => {
      const isPremiumPriced = this.isPremiumPricedToy(toy.retail_price);
      
      // If toy is premium-priced, only Gold pack users can see it
      if (isPremiumPriced) {
        return canAccessPremium;
      }
      
      // All users can see non-premium toys
      return true;
    });
  }

  /**
   * Get display message for plan access
   */
  static getPlanAccessMessage(planId: string): string {
    if (this.isPremiumPlan(planId)) {
      return "Gold Pack: Access to ALL premium toys (no age restrictions)";
    }
    return "Age-appropriate toys for your selected age group";
  }
}
