import { DebtPayoffPlan, DebtItem } from '@/types';
import { addMonths, differenceInMonths } from 'date-fns';

export interface PayoffScheduleItem {
  month: number;
  date: string;
  debtName: string;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface DebtAnalysis {
  totalDebt: number;
  totalMinimumPayment: number;
  weightedAverageAPR: number;
  highestAPR: DebtItem;
  lowestAPR: DebtItem;
  highestBalance: DebtItem;
}

export class DebtService {
  calculateMonthlyInterest(balance: number, annualRate: number): number {
    return (balance * (annualRate / 100)) / 12;
  }

  calculatePayoffTime(balance: number, payment: number, annualRate: number): number {
    if (payment <= 0 || annualRate < 0) return 0;
    
    const monthlyRate = (annualRate / 100) / 12;
    if (monthlyRate === 0) {
      return Math.ceil(balance / payment);
    }
    
    const monthlyInterest = this.calculateMonthlyInterest(balance, annualRate);
    if (payment <= monthlyInterest) {
      return Infinity; // Payment doesn't cover interest
    }
    
    return Math.ceil(Math.log(1 + (balance * monthlyRate) / payment) / Math.log(1 + monthlyRate));
  }

  analyzeDebts(debts: DebtItem[]): DebtAnalysis {
    const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const totalMinimumPayment = debts.reduce((sum, debt) => sum + debt.minimum_payment, 0);
    
    const weightedInterest = debts.reduce((sum, debt) => sum + (debt.balance * debt.interest_rate), 0);
    const weightedAverageAPR = totalDebt > 0 ? weightedInterest / totalDebt : 0;
    
    const sortedByAPR = [...debts].sort((a, b) => b.interest_rate - a.interest_rate);
    const sortedByBalance = [...debts].sort((a, b) => b.balance - a.balance);
    
    return {
      totalDebt,
      totalMinimumPayment,
      weightedAverageAPR,
      highestAPR: sortedByAPR[0],
      lowestAPR: sortedByAPR[sortedByAPR.length - 1],
      highestBalance: sortedByBalance[0]
    };
  }

  calculateSnowballPayoff(debts: DebtItem[], extraPayment: number = 0): DebtPayoffPlan {
    // Sort by balance (lowest first)
    const sortedDebts = [...debts].sort((a, b) => a.balance - b.balance);
    return this.calculatePayoffPlan(sortedDebts, extraPayment, 'snowball');
  }

  calculateAvalanchePayoff(debts: DebtItem[], extraPayment: number = 0): DebtPayoffPlan {
    // Sort by interest rate (highest first)
    const sortedDebts = [...debts].sort((a, b) => b.interest_rate - a.interest_rate);
    return this.calculatePayoffPlan(sortedDebts, extraPayment, 'avalanche');
  }

  calculateCustomPayoff(debts: DebtItem[], customOrder: string[], extraPayment: number = 0): DebtPayoffPlan {
    const sortedDebts = customOrder.map(id => debts.find(d => d.id === id)).filter(Boolean) as DebtItem[];
    return this.calculatePayoffPlan(sortedDebts, extraPayment, 'custom');
  }

  private calculatePayoffPlan(sortedDebts: DebtItem[], extraPayment: number, strategy: 'snowball' | 'avalanche' | 'custom'): DebtPayoffPlan {
    const workingDebts = sortedDebts.map(debt => ({ ...debt }));
    const totalMinimumPayment = workingDebts.reduce((sum, debt) => sum + debt.minimum_payment, 0);
    const totalPayment = totalMinimumPayment + extraPayment;
    
    let currentMonth = 0;
    let totalInterestPaid = 0;
    const schedule: PayoffScheduleItem[] = [];
    
    while (workingDebts.some(debt => debt.balance > 0)) {
      currentMonth++;
      const currentDate = addMonths(new Date(), currentMonth).toISOString().split('T')[0];
      
      // Calculate minimum payments and interest for all debts
      workingDebts.forEach(debt => {
        if (debt.balance > 0) {
          const monthlyInterest = this.calculateMonthlyInterest(debt.balance, debt.interest_rate);
          const principalPayment = Math.min(debt.minimum_payment - monthlyInterest, debt.balance);
          
          totalInterestPaid += monthlyInterest;
          debt.balance = Math.max(0, debt.balance - principalPayment);
          
          schedule.push({
            month: currentMonth,
            date: currentDate,
            debtName: debt.name,
            payment: debt.minimum_payment,
            principal: principalPayment,
            interest: monthlyInterest,
            remainingBalance: debt.balance
          });
        }
      });
      
      // Apply extra payment to the first debt with balance
      if (extraPayment > 0) {
        const targetDebt = workingDebts.find(debt => debt.balance > 0);
        if (targetDebt) {
          const extraPrincipal = Math.min(extraPayment, targetDebt.balance);
          targetDebt.balance -= extraPrincipal;
          
          // Update the schedule entry for this debt
          const scheduleEntry = schedule.find(s => 
            s.month === currentMonth && s.debtName === targetDebt.name
          );
          if (scheduleEntry) {
            scheduleEntry.payment += extraPayment;
            scheduleEntry.principal += extraPrincipal;
            scheduleEntry.remainingBalance = targetDebt.balance;
          }
        }
      }
      
      // Safety break to prevent infinite loops
      if (currentMonth > 600) break; // 50 years max
    }
    
    const totalDebt = sortedDebts.reduce((sum, debt) => sum + debt.balance, 0);
    const estimatedPayoffDate = addMonths(new Date(), currentMonth).toISOString().split('T')[0];
    
    // Calculate interest saved compared to minimum payments only
    const minimumOnlyInterest = this.calculateMinimumOnlyInterest(sortedDebts);
    const interestSaved = minimumOnlyInterest - totalInterestPaid;
    
    return {
      id: `plan_${Date.now()}`,
      user_id: '',
      name: `${strategy.charAt(0).toUpperCase() + strategy.slice(1)} Method`,
      strategy,
      total_debt: totalDebt,
      monthly_payment: totalPayment,
      estimated_payoff_date: estimatedPayoffDate,
      interest_saved: Math.max(0, interestSaved),
      debts: sortedDebts,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private calculateMinimumOnlyInterest(debts: DebtItem[]): number {
    return debts.reduce((total, debt) => {
      const months = this.calculatePayoffTime(debt.balance, debt.minimum_payment, debt.interest_rate);
      if (months === Infinity) return total + debt.balance; // Fallback for bad scenarios
      
      const totalPaid = debt.minimum_payment * months;
      const interestPaid = totalPaid - debt.balance;
      return total + interestPaid;
    }, 0);
  }

  generatePayoffSchedule(plan: DebtPayoffPlan): PayoffScheduleItem[] {
    // This would be implemented to generate the detailed monthly schedule
    // For now, return empty array as it's complex to regenerate
    return [];
  }

  compareStrategies(debts: DebtItem[], extraPayment: number = 0): {
    snowball: DebtPayoffPlan;
    avalanche: DebtPayoffPlan;
    comparison: {
      timeDifference: number;
      interestDifference: number;
      recommendedStrategy: 'snowball' | 'avalanche';
    };
  } {
    const snowball = this.calculateSnowballPayoff(debts, extraPayment);
    const avalanche = this.calculateAvalanchePayoff(debts, extraPayment);
    
    const snowballMonths = differenceInMonths(new Date(snowball.estimated_payoff_date), new Date());
    const avalancheMonths = differenceInMonths(new Date(avalanche.estimated_payoff_date), new Date());
    
    const timeDifference = snowballMonths - avalancheMonths;
    const interestDifference = (avalanche.total_debt - avalanche.interest_saved) - (snowball.total_debt - snowball.interest_saved);
    
    // Recommend avalanche if it saves significant interest, otherwise snowball for psychological benefits
    const recommendedStrategy = Math.abs(interestDifference) > 1000 && interestDifference > 0 ? 'avalanche' : 'snowball';
    
    return {
      snowball,
      avalanche,
      comparison: {
        timeDifference,
        interestDifference,
        recommendedStrategy
      }
    };
  }

  calculateDebtToIncomeRatio(totalDebt: number, monthlyIncome: number): number {
    return monthlyIncome > 0 ? (totalDebt / monthlyIncome) * 100 : 0;
  }

  generateRecommendations(analysis: DebtAnalysis, monthlyIncome: number): string[] {
    const recommendations: string[] = [];
    const debtToIncomeRatio = this.calculateDebtToIncomeRatio(analysis.totalDebt, monthlyIncome);
    
    if (debtToIncomeRatio > 40) {
      recommendations.push('Your debt-to-income ratio is high. Consider debt consolidation or speak with a financial advisor.');
    }
    
    if (analysis.highestAPR.interest_rate > 20) {
      recommendations.push(`Focus on paying off ${analysis.highestAPR.name} first - it has a very high interest rate of ${analysis.highestAPR.interest_rate}%.`);
    }
    
    if (analysis.totalMinimumPayment > monthlyIncome * 0.2) {
      recommendations.push('Your minimum payments exceed 20% of income. Look for ways to increase income or reduce expenses.');
    }
    
    const highInterestDebts = analysis.totalDebt > 0 ? 
      (analysis.weightedAverageAPR > 15 ? 'Consider the avalanche method to save on interest' : 'Consider the snowball method for motivation') : '';
    
    if (highInterestDebts) {
      recommendations.push(highInterestDebts);
    }
    
    recommendations.push('Make extra payments when possible to reduce total interest paid.');
    recommendations.push('Consider increasing payments by just £50/month to see significant time and interest savings.');
    
    return recommendations;
  }

  // Generate mock debt data for demo
  generateMockDebts(userId: string): DebtItem[] {
    return [
      {
        id: 'debt_1',
        name: 'Credit Card - Visa',
        balance: 5500,
        minimum_payment: 165,
        interest_rate: 22.99,
        type: 'credit_card'
      },
      {
        id: 'debt_2',
        name: 'Personal Loan',
        balance: 12000,
        minimum_payment: 320,
        interest_rate: 8.5,
        type: 'personal_loan'
      },
      {
        id: 'debt_3',
        name: 'Car Loan',
        balance: 18500,
        minimum_payment: 425,
        interest_rate: 5.2,
        type: 'auto_loan'
      },
      {
        id: 'debt_4',
        name: 'Credit Card - Mastercard',
        balance: 2800,
        minimum_payment: 85,
        interest_rate: 19.99,
        type: 'credit_card'
      },
      {
        id: 'debt_5',
        name: 'Student Loan',
        balance: 25000,
        minimum_payment: 180,
        interest_rate: 3.5,
        type: 'student_loan'
      }
    ];
  }
}

export const debtService = new DebtService();