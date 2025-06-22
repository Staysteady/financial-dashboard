import { Transaction, Account, ProjectionScenario, FinancialGoal } from '@/types';
import { 
  calculateMonthlyIncome, 
  calculateMonthlyExpenses, 
  calculateAverageMonthlyExpenses,
  calculateBurnRate 
} from '@/utils/financial-calculations';
import { addMonths, subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

export interface AdvancedProjectionScenario extends ProjectionScenario {
  variability: number; // Standard deviation for Monte Carlo
  emergencyFundMonths?: number;
  incomeReduction?: number; // Percentage reduction (0-1)
  expenseIncrease?: number; // Percentage increase
}

export interface ProjectionResult {
  scenario: string;
  projections: MonthlyProjection[];
  summary: ProjectionSummary;
  riskMetrics: RiskMetrics;
}

export interface MonthlyProjection {
  month: string;
  date: Date;
  balance: number;
  income: number;
  expenses: number;
  netFlow: number;
  cumulativeFlow: number;
  runwayMonths?: number;
}

export interface ProjectionSummary {
  endBalance: number;
  totalIncome: number;
  totalExpenses: number;
  averageMonthlyNetFlow: number;
  minimumBalance: number;
  maximumBalance: number;
  monthsToDepletion: number | null;
  breakEvenMonth: string | null;
}

export interface RiskMetrics {
  confidenceInterval: {
    lower: number; // 5th percentile
    upper: number; // 95th percentile
  };
  probabilityOfSuccess: number; // Probability of maintaining positive balance
  worstCaseScenario: number;
  bestCaseScenario: number;
  volatilityScore: number; // 0-100
}

export interface MonteCarloConfig {
  iterations: number;
  confidenceLevel: number;
  variabilityFactor: number;
}

export class FinancialProjectionsEngine {
  private transactions: Transaction[];
  private accounts: Account[];

  constructor(transactions: Transaction[], accounts: Account[]) {
    this.transactions = transactions;
    this.accounts = accounts;
  }

  /**
   * Generate advanced cash flow projections with multiple scenarios
   */
  generateAdvancedProjections(
    scenarios: AdvancedProjectionScenario[],
    baselineMonths: number = 6
  ): ProjectionResult[] {
    const currentBalance = this.accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const historicalIncome = this.calculateHistoricalAverage('income', baselineMonths);
    const historicalExpenses = this.calculateHistoricalAverage('expense', baselineMonths);

    return scenarios.map(scenario => this.projectScenario(
      scenario, 
      currentBalance, 
      historicalIncome, 
      historicalExpenses
    ));
  }

  /**
   * Calculate burn rate with seasonal adjustments
   */
  calculateEnhancedBurnRate(months: number = 12): {
    currentBurnRate: number;
    seasonalAdjusted: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
  } {
    const monthlyData = [];
    const currentDate = new Date();

    for (let i = 0; i < months; i++) {
      const targetMonth = subMonths(currentDate, i);
      const income = calculateMonthlyIncome(this.transactions, targetMonth);
      const expenses = calculateMonthlyExpenses(this.transactions, targetMonth);
      const netFlow = income - expenses;
      
      monthlyData.push({
        month: i,
        netFlow,
        expenses,
        seasonality: this.getSeasonalityFactor(targetMonth)
      });
    }

    const currentBurnRate = calculateBurnRate(this.transactions, 3);
    const seasonalAdjusted = this.adjustForSeasonality(currentBurnRate, new Date());
    const trend = this.calculateTrend(monthlyData);
    const confidence = this.calculateConfidence(monthlyData);

    return {
      currentBurnRate,
      seasonalAdjusted,
      trend,
      confidence
    };
  }

  /**
   * Calculate financial runway with confidence intervals
   */
  calculateEnhancedRunway(
    currentBalance?: number,
    emergencyFundTarget?: number
  ): {
    baselineRunway: number;
    conservativeRunway: number;
    optimisticRunway: number;
    emergencyFundRunway: number;
    criticalDate: Date | null;
  } {
    const balance = currentBalance || this.accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const burnRate = this.calculateEnhancedBurnRate();
    const emergencyFund = emergencyFundTarget || (burnRate.seasonalAdjusted * 6);

    const baselineRunway = balance / burnRate.currentBurnRate;
    const conservativeRunway = balance / (burnRate.seasonalAdjusted * 1.2);
    const optimisticRunway = balance / (burnRate.seasonalAdjusted * 0.8);
    const emergencyFundRunway = Math.max(0, (balance - emergencyFund) / burnRate.seasonalAdjusted);

    const criticalDate = conservativeRunway > 0 
      ? addMonths(new Date(), Math.floor(conservativeRunway))
      : null;

    return {
      baselineRunway,
      conservativeRunway,
      optimisticRunway,
      emergencyFundRunway,
      criticalDate
    };
  }

  /**
   * Run Monte Carlo simulation for projection uncertainty
   */
  runMonteCarloSimulation(
    scenario: AdvancedProjectionScenario,
    config: MonteCarloConfig = {
      iterations: 1000,
      confidenceLevel: 0.9,
      variabilityFactor: 0.15
    }
  ): RiskMetrics {
    const results: number[] = [];
    const currentBalance = this.accounts.reduce((sum, acc) => sum + acc.balance, 0);

    for (let i = 0; i < config.iterations; i++) {
      const endBalance = this.simulateScenario(scenario, currentBalance, config.variabilityFactor);
      results.push(endBalance);
    }

    results.sort((a, b) => a - b);

    const lowerPercentile = Math.floor((1 - config.confidenceLevel) / 2 * results.length);
    const upperPercentile = Math.floor((1 + config.confidenceLevel) / 2 * results.length);

    const successCount = results.filter(balance => balance > 0).length;
    const probabilityOfSuccess = successCount / results.length;

    return {
      confidenceInterval: {
        lower: results[lowerPercentile],
        upper: results[upperPercentile]
      },
      probabilityOfSuccess,
      worstCaseScenario: results[0],
      bestCaseScenario: results[results.length - 1],
      volatilityScore: this.calculateVolatilityScore(results)
    };
  }

  /**
   * Calculate goal achievement probability
   */
  calculateGoalAchievementProbability(
    goal: FinancialGoal,
    scenario: AdvancedProjectionScenario
  ): {
    probability: number;
    projectedDate: Date | null;
    requiredMonthlyContribution: number;
    feasibilityScore: number;
  } {
    const monthsToGoal = this.getMonthsBetween(new Date(), new Date(goal.target_date));
    const remainingAmount = goal.target_amount - goal.current_amount;
    const requiredMonthlyContribution = remainingAmount / monthsToGoal;

    const netFlow = scenario.monthlyIncome - scenario.monthlyExpenses;
    const availableForGoal = Math.max(0, netFlow - requiredMonthlyContribution);

    const feasibilityScore = availableForGoal > 0 ? 
      Math.min(100, (availableForGoal / requiredMonthlyContribution) * 100) : 0;

    // Run simulation to calculate probability
    const simulations = 1000;
    let successCount = 0;

    for (let i = 0; i < simulations; i++) {
      const achievedAmount = this.simulateGoalProgress(
        goal.current_amount,
        requiredMonthlyContribution,
        monthsToGoal,
        0.1 // variability
      );
      if (achievedAmount >= goal.target_amount) {
        successCount++;
      }
    }

    const probability = successCount / simulations;
    const projectedDate = probability > 0.5 ? new Date(goal.target_date) : null;

    return {
      probability,
      projectedDate,
      requiredMonthlyContribution,
      feasibilityScore
    };
  }

  /**
   * Generate stress testing scenarios
   */
  generateStressTestScenarios(): AdvancedProjectionScenario[] {
    const baseIncome = this.calculateHistoricalAverage('income', 6);
    const baseExpenses = this.calculateHistoricalAverage('expense', 6);

    return [
      {
        name: 'Economic Recession',
        monthlyIncome: baseIncome * 0.6,
        monthlyExpenses: baseExpenses * 1.1,
        projectedMonths: 18,
        endBalance: 0,
        variability: 0.25,
        incomeReduction: 0.4,
        expenseIncrease: 0.1
      },
      {
        name: 'Job Loss Scenario',
        monthlyIncome: baseIncome * 0.2, // Unemployment benefits
        monthlyExpenses: baseExpenses * 0.8, // Reduced spending
        projectedMonths: 12,
        endBalance: 0,
        variability: 0.15,
        incomeReduction: 0.8,
        expenseIncrease: -0.2
      },
      {
        name: 'Market Crash',
        monthlyIncome: baseIncome * 0.95,
        monthlyExpenses: baseExpenses * 1.05,
        projectedMonths: 24,
        endBalance: 0,
        variability: 0.35,
        incomeReduction: 0.05,
        expenseIncrease: 0.05
      },
      {
        name: 'Healthcare Emergency',
        monthlyIncome: baseIncome,
        monthlyExpenses: baseExpenses * 1.5,
        projectedMonths: 6,
        endBalance: 0,
        variability: 0.2,
        emergencyFundMonths: 3,
        expenseIncrease: 0.5
      }
    ];
  }

  // Private helper methods

  private projectScenario(
    scenario: AdvancedProjectionScenario,
    startBalance: number,
    historicalIncome: number,
    historicalExpenses: number
  ): ProjectionResult {
    const projections: MonthlyProjection[] = [];
    let balance = startBalance;
    let cumulativeFlow = 0;

    for (let i = 0; i < scenario.projectedMonths; i++) {
      const projectionDate = addMonths(new Date(), i);
      const monthlyIncome = scenario.monthlyIncome || historicalIncome;
      const monthlyExpenses = scenario.monthlyExpenses || historicalExpenses;
      const netFlow = monthlyIncome - monthlyExpenses;
      
      balance += netFlow;
      cumulativeFlow += netFlow;

      projections.push({
        month: format(projectionDate, 'MMM yyyy'),
        date: projectionDate,
        balance: Math.round(balance * 100) / 100,
        income: monthlyIncome,
        expenses: monthlyExpenses,
        netFlow,
        cumulativeFlow,
        runwayMonths: balance > 0 && monthlyExpenses > 0 ? balance / monthlyExpenses : undefined
      });
    }

    const summary = this.calculateProjectionSummary(projections);
    const riskMetrics = this.runMonteCarloSimulation(scenario);

    return {
      scenario: scenario.name,
      projections,
      summary,
      riskMetrics
    };
  }

  private calculateHistoricalAverage(type: 'income' | 'expense', months: number): number {
    const totals: number[] = [];
    const currentDate = new Date();

    for (let i = 0; i < months; i++) {
      const targetMonth = subMonths(currentDate, i);
      const amount = type === 'income' 
        ? calculateMonthlyIncome(this.transactions, targetMonth)
        : calculateMonthlyExpenses(this.transactions, targetMonth);
      totals.push(amount);
    }

    return totals.reduce((sum, amount) => sum + amount, 0) / totals.length;
  }

  private calculateProjectionSummary(projections: MonthlyProjection[]): ProjectionSummary {
    const balances = projections.map(p => p.balance);
    const totalIncome = projections.reduce((sum, p) => sum + p.income, 0);
    const totalExpenses = projections.reduce((sum, p) => sum + p.expenses, 0);
    
    const depletionProjection = projections.find(p => p.balance <= 0);
    const breakEvenProjection = projections.find(p => p.netFlow >= 0);

    return {
      endBalance: balances[balances.length - 1],
      totalIncome,
      totalExpenses,
      averageMonthlyNetFlow: (totalIncome - totalExpenses) / projections.length,
      minimumBalance: Math.min(...balances),
      maximumBalance: Math.max(...balances),
      monthsToDepletion: depletionProjection 
        ? projections.indexOf(depletionProjection) + 1 
        : null,
      breakEvenMonth: breakEvenProjection?.month || null
    };
  }

  private simulateScenario(
    scenario: AdvancedProjectionScenario, 
    startBalance: number, 
    variability: number
  ): number {
    let balance = startBalance;
    
    for (let month = 0; month < scenario.projectedMonths; month++) {
      const incomeVariation = this.generateRandomVariation(variability);
      const expenseVariation = this.generateRandomVariation(variability);
      
      const monthlyIncome = scenario.monthlyIncome * (1 + incomeVariation);
      const monthlyExpenses = scenario.monthlyExpenses * (1 + expenseVariation);
      
      balance += monthlyIncome - monthlyExpenses;
    }
    
    return balance;
  }

  private simulateGoalProgress(
    startAmount: number,
    monthlyContribution: number,
    months: number,
    variability: number
  ): number {
    let amount = startAmount;
    
    for (let month = 0; month < months; month++) {
      const variation = this.generateRandomVariation(variability);
      const contribution = monthlyContribution * (1 + variation);
      amount += contribution;
    }
    
    return amount;
  }

  private generateRandomVariation(variability: number): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * variability;
  }

  private getSeasonalityFactor(date: Date): number {
    const month = date.getMonth();
    // Seasonal factors for UK spending patterns
    const factors = [1.1, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 1.2];
    return factors[month];
  }

  private adjustForSeasonality(burnRate: number, date: Date): number {
    const factor = this.getSeasonalityFactor(date);
    return burnRate * factor;
  }

  private calculateTrend(monthlyData: Array<{month: number, netFlow: number}>): 'increasing' | 'decreasing' | 'stable' {
    if (monthlyData.length < 3) return 'stable';
    
    const recentAvg = monthlyData.slice(0, 3).reduce((sum, d) => sum + d.netFlow, 0) / 3;
    const olderAvg = monthlyData.slice(-3).reduce((sum, d) => sum + d.netFlow, 0) / 3;
    
    const change = (recentAvg - olderAvg) / Math.abs(olderAvg);
    
    if (change > 0.1) return 'decreasing'; // Worse burn rate
    if (change < -0.1) return 'increasing'; // Better burn rate
    return 'stable';
  }

  private calculateConfidence(monthlyData: Array<{netFlow: number}>): number {
    if (monthlyData.length < 2) return 0;
    
    const values = monthlyData.map(d => d.netFlow);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize confidence (lower volatility = higher confidence)
    return Math.max(0, Math.min(100, 100 - (stdDev / Math.abs(mean)) * 100));
  }

  private calculateVolatilityScore(results: number[]): number {
    const mean = results.reduce((sum, r) => sum + r, 0) / results.length;
    const variance = results.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / results.length;
    const stdDev = Math.sqrt(variance);
    
    return Math.min(100, (stdDev / Math.abs(mean)) * 100);
  }

  private getMonthsBetween(start: Date, end: Date): number {
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  }
}