import { RetirementPlan } from '@/types';

export interface RetirementScenario {
  monthlyContribution: number;
  retirementAge: number;
  expectedReturn: number;
  inflationRate: number;
  finalValue: number;
  monthlyIncome: number;
  totalContributions: number;
  growthAmount: number;
}

export interface RetirementProjection {
  age: number;
  year: number;
  annualContribution: number;
  portfolioValue: number;
  realValue: number; // Adjusted for inflation
}

export class RetirementService {
  // Default assumptions
  private readonly DEFAULT_RETURN_RATE = 0.07; // 7% annual return
  private readonly DEFAULT_INFLATION_RATE = 0.025; // 2.5% inflation
  private readonly DEFAULT_WITHDRAWAL_RATE = 0.04; // 4% safe withdrawal rate

  calculateCompoundGrowth(
    principal: number,
    monthlyContribution: number,
    annualRate: number,
    years: number
  ): number {
    const monthlyRate = annualRate / 12;
    const months = years * 12;
    
    // Future value of initial principal
    const principalGrowth = principal * Math.pow(1 + monthlyRate, months);
    
    // Future value of monthly contributions (annuity)
    const contributionGrowth = monthlyContribution * 
      ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    
    return principalGrowth + contributionGrowth;
  }

  calculateRetirementProjection(
    currentAge: number,
    retirementAge: number,
    currentSavings: number,
    monthlyContribution: number,
    expectedReturn: number = this.DEFAULT_RETURN_RATE,
    inflationRate: number = this.DEFAULT_INFLATION_RATE
  ): RetirementProjection[] {
    const projections: RetirementProjection[] = [];
    const yearsToRetirement = retirementAge - currentAge;
    
    let portfolioValue = currentSavings;
    const monthlyRate = expectedReturn / 12;
    const annualContribution = monthlyContribution * 12;
    
    for (let year = 0; year <= yearsToRetirement; year++) {
      const currentYear = new Date().getFullYear() + year;
      const age = currentAge + year;
      
      // Calculate real value (inflation-adjusted)
      const realValue = portfolioValue / Math.pow(1 + inflationRate, year);
      
      projections.push({
        age,
        year: currentYear,
        annualContribution,
        portfolioValue,
        realValue
      });
      
      // Calculate next year's portfolio value
      if (year < yearsToRetirement) {
        // Add monthly contributions with compound growth throughout the year
        for (let month = 0; month < 12; month++) {
          portfolioValue = portfolioValue * (1 + monthlyRate) + monthlyContribution;
        }
      }
    }
    
    return projections;
  }

  calculateRetirementScenarios(
    currentAge: number,
    currentSavings: number,
    targetRetirementAge: number = 65
  ): RetirementScenario[] {
    const scenarios: RetirementScenario[] = [];
    const yearsToRetirement = targetRetirementAge - currentAge;
    
    // Different monthly contribution amounts to compare
    const contributionAmounts = [500, 750, 1000, 1500, 2000];
    
    contributionAmounts.forEach(monthlyContribution => {
      const finalValue = this.calculateCompoundGrowth(
        currentSavings,
        monthlyContribution,
        this.DEFAULT_RETURN_RATE,
        yearsToRetirement
      );
      
      const totalContributions = currentSavings + (monthlyContribution * 12 * yearsToRetirement);
      const growthAmount = finalValue - totalContributions;
      const monthlyIncome = (finalValue * this.DEFAULT_WITHDRAWAL_RATE) / 12;
      
      scenarios.push({
        monthlyContribution,
        retirementAge: targetRetirementAge,
        expectedReturn: this.DEFAULT_RETURN_RATE,
        inflationRate: this.DEFAULT_INFLATION_RATE,
        finalValue,
        monthlyIncome,
        totalContributions,
        growthAmount
      });
    });
    
    return scenarios;
  }

  calculateRetirementGoal(
    desiredMonthlyIncome: number,
    retirementAge: number,
    lifeExpectancy: number = 85
  ): number {
    // Calculate required portfolio size using 4% rule
    const annualIncome = desiredMonthlyIncome * 12;
    return annualIncome / this.DEFAULT_WITHDRAWAL_RATE;
  }

  calculateRequiredSavings(
    currentAge: number,
    retirementAge: number,
    retirementGoal: number,
    currentSavings: number = 0,
    expectedReturn: number = this.DEFAULT_RETURN_RATE
  ): {
    monthlyRequired: number;
    totalContributions: number;
    shortfall: number;
  } {
    const yearsToRetirement = retirementAge - currentAge;
    
    // Future value of current savings
    const futureValueOfSavings = currentSavings * 
      Math.pow(1 + expectedReturn, yearsToRetirement);
    
    // Amount still needed
    const shortfall = Math.max(0, retirementGoal - futureValueOfSavings);
    
    if (shortfall === 0) {
      return {
        monthlyRequired: 0,
        totalContributions: 0,
        shortfall: 0
      };
    }
    
    // Calculate required monthly contribution using annuity formula
    const monthlyRate = expectedReturn / 12;
    const months = yearsToRetirement * 12;
    
    const monthlyRequired = shortfall * monthlyRate / 
      (Math.pow(1 + monthlyRate, months) - 1);
    
    const totalContributions = monthlyRequired * months;
    
    return {
      monthlyRequired,
      totalContributions,
      shortfall
    };
  }

  calculateSafeWithdrawalRate(
    portfolioValue: number,
    retirementAge: number,
    lifeExpectancy: number = 85
  ): {
    safeWithdrawalRate: number;
    monthlyIncome: number;
    annualIncome: number;
  } {
    // Use 4% rule as baseline, adjust based on retirement length
    const retirementYears = lifeExpectancy - retirementAge;
    let safeRate = this.DEFAULT_WITHDRAWAL_RATE;
    
    // Adjust for longer/shorter retirement periods
    if (retirementYears > 30) {
      safeRate = 0.035; // More conservative for longer retirement
    } else if (retirementYears < 20) {
      safeRate = 0.045; // Slightly more aggressive for shorter retirement
    }
    
    const annualIncome = portfolioValue * safeRate;
    const monthlyIncome = annualIncome / 12;
    
    return {
      safeWithdrawalRate: safeRate,
      monthlyIncome,
      annualIncome
    };
  }

  calculateTaxAdvantages(
    monthlyContribution: number,
    marginalTaxRate: number = 0.4 // 40% higher rate taxpayer
  ): {
    monthlyTaxRelief: number;
    annualTaxRelief: number;
    netMonthlyCost: number;
  } {
    const monthlyTaxRelief = monthlyContribution * marginalTaxRate;
    const annualTaxRelief = monthlyTaxRelief * 12;
    const netMonthlyCost = monthlyContribution - monthlyTaxRelief;
    
    return {
      monthlyTaxRelief,
      annualTaxRelief,
      netMonthlyCost
    };
  }

  generateRetirementTips(
    currentAge: number,
    monthlyContribution: number,
    portfolioValue: number
  ): string[] {
    const tips: string[] = [];
    
    if (currentAge < 30) {
      tips.push('Start early - compound growth is most powerful when you have time on your side');
      tips.push('Consider aggressive growth investments with higher risk tolerance');
    } else if (currentAge < 40) {
      tips.push('Increase contributions with salary raises to maintain lifestyle in retirement');
      tips.push('Balance growth investments with some stability as you approach mid-career');
    } else if (currentAge < 50) {
      tips.push('Consider catch-up contributions if available in your pension scheme');
      tips.push('Review and rebalance your investment portfolio annually');
    } else {
      tips.push('Focus on capital preservation as you approach retirement');
      tips.push('Consider transitioning to more conservative investments');
    }
    
    if (monthlyContribution < 500) {
      tips.push('Try to increase contributions - even small increases compound significantly over time');
    }
    
    if (portfolioValue > 100000) {
      tips.push('Consider diversifying across different asset classes and geographical regions');
    }
    
    tips.push('Review your State Pension entitlement to factor into retirement planning');
    tips.push('Consider the impact of inflation on your retirement spending power');
    
    return tips;
  }

  // Generate mock retirement plan for demo
  generateMockRetirementPlan(userId: string): RetirementPlan {
    const currentAge = 35;
    const currentSavings = 45000;
    const monthlyContribution = 800;
    const retirementAge = 65;
    
    const projections = this.calculateRetirementProjection(
      currentAge,
      retirementAge,
      currentSavings,
      monthlyContribution
    );
    
    const finalProjection = projections[projections.length - 1];
    const scenarios = this.calculateRetirementScenarios(currentAge, currentSavings, retirementAge);
    
    return {
      id: `retirement_${Date.now()}`,
      user_id: userId,
      current_age: currentAge,
      retirement_age: retirementAge,
      current_savings: currentSavings,
      monthly_contribution: monthlyContribution,
      expected_return: this.DEFAULT_RETURN_RATE,
      projected_value: finalProjection.portfolioValue,
      monthly_retirement_income: (finalProjection.portfolioValue * this.DEFAULT_WITHDRAWAL_RATE) / 12,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}

export const retirementService = new RetirementService();