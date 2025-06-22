import { TaxCalculation } from '@/types';

export interface TaxBand {
  min: number;
  max: number;
  rate: number;
  name: string;
}

export interface TaxBreakdown {
  basicRate: number;
  higherRate: number;
  additionalRate: number;
  totalTax: number;
  nationalInsurance: number;
  studentLoan?: number;
  netIncome: number;
  effectiveRate: number;
}

export interface TaxAllowances {
  personalAllowance: number;
  basicRateLimit: number;
  higherRateLimit: number;
  niThreshold: number;
  niUpperLimit: number;
  studentLoanThreshold: number;
}

export class TaxService {
  // UK Tax rates for 2024/25 tax year
  private readonly TAX_YEAR = '2024/25';
  
  private readonly allowances2024: TaxAllowances = {
    personalAllowance: 12570,
    basicRateLimit: 37700,
    higherRateLimit: 125140,
    niThreshold: 12570,
    niUpperLimit: 50270,
    studentLoanThreshold: 22015
  };

  private readonly incomeTaxBands2024: TaxBand[] = [
    { min: 0, max: 12570, rate: 0, name: 'Personal Allowance' },
    { min: 12570, max: 50270, rate: 20, name: 'Basic Rate' },
    { min: 50270, max: 125140, rate: 40, name: 'Higher Rate' },
    { min: 125140, max: Infinity, rate: 45, name: 'Additional Rate' }
  ];

  private readonly nationalInsuranceBands2024: TaxBand[] = [
    { min: 0, max: 12570, rate: 0, name: 'NI Threshold' },
    { min: 12570, max: 50270, rate: 12, name: 'Main Rate' },
    { min: 50270, max: Infinity, rate: 2, name: 'Additional Rate' }
  ];

  calculateIncomeTax(grossIncome: number): { tax: number; breakdown: any } {
    let tax = 0;
    const breakdown = {
      personalAllowance: 0,
      basicRate: 0,
      higherRate: 0,
      additionalRate: 0
    };

    // Adjust personal allowance for high earners
    let personalAllowance = this.allowances2024.personalAllowance;
    if (grossIncome > 100000) {
      const reduction = Math.min(personalAllowance, (grossIncome - 100000) / 2);
      personalAllowance -= reduction;
    }

    breakdown.personalAllowance = personalAllowance;

    for (const band of this.incomeTaxBands2024) {
      if (grossIncome <= band.min) break;

      const taxableInBand = Math.min(grossIncome, band.max) - Math.max(band.min, personalAllowance);
      if (taxableInBand > 0) {
        const bandTax = taxableInBand * (band.rate / 100);
        tax += bandTax;

        if (band.name === 'Basic Rate') breakdown.basicRate = bandTax;
        else if (band.name === 'Higher Rate') breakdown.higherRate = bandTax;
        else if (band.name === 'Additional Rate') breakdown.additionalRate = bandTax;
      }
    }

    return { tax, breakdown };
  }

  calculateNationalInsurance(grossIncome: number): number {
    let ni = 0;

    for (const band of this.nationalInsuranceBands2024) {
      if (grossIncome <= band.min) break;

      const niableInBand = Math.min(grossIncome, band.max) - band.min;
      if (niableInBand > 0) {
        ni += niableInBand * (band.rate / 100);
      }
    }

    return ni;
  }

  calculateStudentLoan(grossIncome: number, planType: 1 | 2 | 4 = 2): number {
    const thresholds = {
      1: 22015, // Plan 1
      2: 27295, // Plan 2
      4: 25000  // Plan 4 (Postgraduate)
    };

    const rates = {
      1: 9,
      2: 9,
      4: 6
    };

    const threshold = thresholds[planType];
    const rate = rates[planType];

    if (grossIncome <= threshold) return 0;
    return (grossIncome - threshold) * (rate / 100);
  }

  calculateTotalTax(
    grossIncome: number, 
    options: {
      hasStudentLoan?: boolean;
      studentLoanPlan?: 1 | 2 | 4;
      pensionContributions?: number;
      charitableDonations?: number;
    } = {}
  ): TaxBreakdown {
    // Adjust for pension contributions (reduce taxable income)
    const pensionContributions = options.pensionContributions || 0;
    const taxableIncome = Math.max(0, grossIncome - pensionContributions);

    const incomeTaxResult = this.calculateIncomeTax(taxableIncome);
    const nationalInsurance = this.calculateNationalInsurance(grossIncome); // NI on gross income
    const studentLoan = options.hasStudentLoan 
      ? this.calculateStudentLoan(grossIncome, options.studentLoanPlan)
      : 0;

    const totalTax = incomeTaxResult.tax + nationalInsurance + studentLoan;
    const netIncome = grossIncome - totalTax;
    const effectiveRate = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0;

    return {
      basicRate: incomeTaxResult.breakdown.basicRate,
      higherRate: incomeTaxResult.breakdown.higherRate,
      additionalRate: incomeTaxResult.breakdown.additionalRate,
      totalTax: incomeTaxResult.tax,
      nationalInsurance,
      studentLoan: options.hasStudentLoan ? studentLoan : undefined,
      netIncome,
      effectiveRate
    };
  }

  calculateTaxOnDividends(dividendIncome: number): number {
    const dividendAllowance = 1000; // 2024/25 allowance
    const taxableDividends = Math.max(0, dividendIncome - dividendAllowance);
    
    // Simplified - assumes basic rate taxpayer
    // In reality, need to consider total income to determine tax band
    return taxableDividends * 0.0875; // 8.75% for basic rate
  }

  calculateCapitalGainsTax(
    gain: number, 
    assetType: 'property' | 'shares' | 'other' = 'shares'
  ): number {
    const annualExemption = 6000; // 2024/25 allowance
    const taxableGain = Math.max(0, gain - annualExemption);
    
    if (taxableGain === 0) return 0;

    // Simplified rates for basic rate taxpayers
    const rates = {
      property: 0.18, // 18% for basic rate, 24% for higher rate
      shares: 0.10,   // 10% for basic rate, 20% for higher rate
      other: 0.10
    };

    return taxableGain * rates[assetType];
  }

  calculateOptimalPensionContribution(
    grossIncome: number,
    currentContribution: number = 0
  ): {
    recommendation: number;
    taxSaving: number;
    netCost: number;
    explanation: string;
  } {
    const currentTax = this.calculateTotalTax(grossIncome);
    
    // Calculate optimal contribution to avoid higher rate tax
    let recommendation = currentContribution;
    let explanation = '';

    if (grossIncome > 50270) {
      // In higher rate band - recommend contributing to bring income below £50,270
      const excessIncome = grossIncome - 50270;
      recommendation = Math.max(currentContribution, excessIncome);
      explanation = 'Reduce income to basic rate band to save 40% tax on contributions';
    } else if (grossIncome > 100000) {
      // Very high earner - recommend contributing to preserve personal allowance
      const excessIncome = grossIncome - 100000;
      recommendation = Math.max(currentContribution, excessIncome);
      explanation = 'Preserve personal allowance and avoid 60% effective tax rate';
    } else {
      // Basic rate taxpayer
      const maxContribution = Math.min(grossIncome * 0.2, 40000); // 20% or annual allowance
      recommendation = Math.max(currentContribution, maxContribution);
      explanation = 'Maximize pension contributions for 20% tax relief';
    }

    const newTax = this.calculateTotalTax(grossIncome, { pensionContributions: recommendation });
    const taxSaving = currentTax.totalTax - newTax.totalTax;
    const netCost = recommendation - taxSaving;

    return {
      recommendation,
      taxSaving,
      netCost,
      explanation
    };
  }

  calculateTaxEfficiencyTips(grossIncome: number): string[] {
    const tips: string[] = [];
    
    if (grossIncome > 100000) {
      tips.push('Consider pension contributions to preserve your personal allowance');
      tips.push('Gift Aid donations can help reduce effective tax rate');
    }
    
    if (grossIncome > 50270) {
      tips.push('Maximize pension contributions to reduce higher rate tax');
      tips.push('Consider salary sacrifice schemes (cycle to work, electric car)');
    }
    
    tips.push('Use your £20,000 ISA allowance for tax-free savings');
    tips.push('Consider your spouse\'s tax position for joint investments');
    
    if (grossIncome < 50270) {
      tips.push('You have unused basic rate band for potential tax-efficient investments');
    }
    
    return tips;
  }

  // Generate mock tax calculation for demo
  generateMockTaxCalculation(userId: string, grossIncome: number = 55000): TaxCalculation {
    const breakdown = this.calculateTotalTax(grossIncome, {
      hasStudentLoan: true,
      studentLoanPlan: 2,
      pensionContributions: 2750 // 5% contribution
    });

    const incomeCategories = {
      salary: grossIncome * 0.9,
      bonus: grossIncome * 0.05,
      investment_income: grossIncome * 0.03,
      rental_income: grossIncome * 0.02
    };

    const deductions = {
      pension_contributions: 2750,
      charitable_donations: 500,
      professional_subscriptions: 240
    };

    return {
      id: `tax_${Date.now()}`,
      user_id: userId,
      tax_year: 2024,
      income_categories: incomeCategories,
      deductions,
      estimated_tax: breakdown.totalTax + breakdown.nationalInsurance,
      refund_amount: 0,
      quarterly_payments: [
        breakdown.totalTax * 0.25,
        breakdown.totalTax * 0.25,
        breakdown.totalTax * 0.25,
        breakdown.totalTax * 0.25
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  calculateEstimatedQuarterlyPayments(annualTax: number): number[] {
    // Self-employed quarterly payment calculator
    const quarterly = annualTax / 4;
    return [quarterly, quarterly, quarterly, quarterly];
  }

  calculateSelfEmploymentTax(
    profit: number,
    expenses: number = 0
  ): {
    taxableProfit: number;
    incomeTax: number;
    nationalInsurance: number;
    totalTax: number;
  } {
    const taxableProfit = Math.max(0, profit - expenses);
    const incomeTaxResult = this.calculateIncomeTax(taxableProfit);
    
    // Class 2 NI (flat rate for profits over £6,515)
    const class2NI = taxableProfit > 6515 ? 179.40 : 0;
    
    // Class 4 NI (9% on profits £12,570 - £50,270, 2% above)
    let class4NI = 0;
    if (taxableProfit > 12570) {
      const class4Profit = Math.min(taxableProfit, 50270) - 12570;
      class4NI += class4Profit * 0.09;
      
      if (taxableProfit > 50270) {
        class4NI += (taxableProfit - 50270) * 0.02;
      }
    }
    
    const nationalInsurance = class2NI + class4NI;
    const totalTax = incomeTaxResult.tax + nationalInsurance;

    return {
      taxableProfit,
      incomeTax: incomeTaxResult.tax,
      nationalInsurance,
      totalTax
    };
  }
}

export const taxService = new TaxService();