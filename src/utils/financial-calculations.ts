import { Transaction, Account, ProjectionScenario } from '@/types';
import { startOfMonth, endOfMonth, subMonths, addMonths, differenceInMonths, format } from 'date-fns';

/**
 * Calculate total balance across all accounts
 */
export function calculateTotalBalance(accounts: Account[]): number {
  return accounts.reduce((total, account) => {
    if (account.is_active) {
      return total + account.balance;
    }
    return total;
  }, 0);
}

/**
 * Calculate monthly income from transactions
 */
export function calculateMonthlyIncome(transactions: Transaction[], month?: Date): number {
  const targetMonth = month || new Date();
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);

  return transactions
    .filter(t => {
      const transactionDate = new Date(t.date);
      return t.type === 'income' && 
             transactionDate >= monthStart && 
             transactionDate <= monthEnd;
    })
    .reduce((total, t) => total + Math.abs(t.amount), 0);
}

/**
 * Calculate monthly expenses from transactions
 */
export function calculateMonthlyExpenses(transactions: Transaction[], month?: Date): number {
  const targetMonth = month || new Date();
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);

  return transactions
    .filter(t => {
      const transactionDate = new Date(t.date);
      return t.type === 'expense' && 
             transactionDate >= monthStart && 
             transactionDate <= monthEnd;
    })
    .reduce((total, t) => total + Math.abs(t.amount), 0);
}

/**
 * Calculate average monthly expenses over a period
 */
export function calculateAverageMonthlyExpenses(transactions: Transaction[], months: number = 6): number {
  const currentDate = new Date();
  let totalExpenses = 0;
  let monthsWithData = 0;

  for (let i = 0; i < months; i++) {
    const targetMonth = subMonths(currentDate, i);
    const monthlyExpenses = calculateMonthlyExpenses(transactions, targetMonth);
    
    if (monthlyExpenses > 0) {
      totalExpenses += monthlyExpenses;
      monthsWithData++;
    }
  }

  return monthsWithData > 0 ? totalExpenses / monthsWithData : 0;
}

/**
 * Calculate burn rate (monthly cash outflow)
 */
export function calculateBurnRate(transactions: Transaction[], months: number = 3): number {
  const currentDate = new Date();
  let totalNetFlow = 0;
  let monthsWithData = 0;

  for (let i = 0; i < months; i++) {
    const targetMonth = subMonths(currentDate, i);
    const income = calculateMonthlyIncome(transactions, targetMonth);
    const expenses = calculateMonthlyExpenses(transactions, targetMonth);
    const netFlow = income - expenses;
    
    totalNetFlow += netFlow;
    monthsWithData++;
  }

  const averageNetFlow = monthsWithData > 0 ? totalNetFlow / monthsWithData : 0;
  return Math.abs(Math.min(averageNetFlow, 0)); // Return positive burn rate
}

/**
 * Calculate enhanced burn rate with trend analysis
 */
export function calculateEnhancedBurnRate(
  transactions: Transaction[], 
  months: number = 12
): {
  currentRate: number;
  trendingRate: number;
  trend: 'improving' | 'worsening' | 'stable';
  confidence: number;
} {
  const currentDate = new Date();
  const monthlyRates: number[] = [];

  for (let i = 0; i < months; i++) {
    const targetMonth = subMonths(currentDate, i);
    const income = calculateMonthlyIncome(transactions, targetMonth);
    const expenses = calculateMonthlyExpenses(transactions, targetMonth);
    const netFlow = income - expenses;
    monthlyRates.push(Math.abs(Math.min(netFlow, 0)));
  }

  const recentRates = monthlyRates.slice(0, 3);
  const olderRates = monthlyRates.slice(-3);
  
  const currentRate = recentRates.reduce((sum, rate) => sum + rate, 0) / recentRates.length;
  const olderRate = olderRates.reduce((sum, rate) => sum + rate, 0) / olderRates.length;
  
  // Linear regression for trending rate
  const trendingRate = calculateLinearTrend(monthlyRates.slice(0, 6));
  
  // Determine trend direction
  const changePercent = olderRate > 0 ? ((currentRate - olderRate) / olderRate) * 100 : 0;
  let trend: 'improving' | 'worsening' | 'stable' = 'stable';
  
  if (changePercent > 10) trend = 'worsening';
  else if (changePercent < -10) trend = 'improving';
  
  // Calculate confidence based on data consistency
  const variance = monthlyRates.reduce((sum, rate) => {
    const avg = monthlyRates.reduce((s, r) => s + r, 0) / monthlyRates.length;
    return sum + Math.pow(rate - avg, 2);
  }, 0) / monthlyRates.length;
  
  const standardDeviation = Math.sqrt(variance);
  const average = monthlyRates.reduce((sum, rate) => sum + rate, 0) / monthlyRates.length;
  const confidence = Math.max(0, Math.min(100, 100 - (standardDeviation / average) * 100));

  return {
    currentRate,
    trendingRate,
    trend,
    confidence
  };
}

/**
 * Calculate linear trend from array of values
 */
function calculateLinearTrend(values: number[]): number {
  const n = values.length;
  if (n < 2) return values[0] || 0;
  
  const xSum = n * (n - 1) / 2;
  const ySum = values.reduce((sum, val) => sum + val, 0);
  const xySum = values.reduce((sum, val, index) => sum + val * index, 0);
  const x2Sum = n * (n - 1) * (2 * n - 1) / 6;
  
  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
  const intercept = (ySum - slope * xSum) / n;
  
  return intercept + slope * (n - 1); // Projected next value
}

/**
 * Calculate financial runway (how long current balance will last)
 */
export function calculateFinancialRunway(
  currentBalance: number, 
  monthlyBurnRate: number
): number {
  if (monthlyBurnRate <= 0) return Infinity;
  return currentBalance / monthlyBurnRate;
}

/**
 * Calculate enhanced financial runway with multiple scenarios
 */
export function calculateEnhancedFinancialRunway(
  accounts: Account[],
  transactions: Transaction[],
  emergencyFundMonths: number = 6
): {
  totalBalance: number;
  emergencyFund: number;
  availableBalance: number;
  baselineRunway: number;
  conservativeRunway: number;
  optimisticRunway: number;
  criticalThresholds: {
    threeMonths: Date;
    sixMonths: Date;
    twelveMonths: Date;
  };
  recommendations: string[];
} {
  const totalBalance = accounts
    .filter(acc => acc.is_active)
    .reduce((sum, acc) => sum + acc.balance, 0);

  const burnRateData = calculateEnhancedBurnRate(transactions);
  const emergencyFund = burnRateData.currentRate * emergencyFundMonths;
  const availableBalance = Math.max(0, totalBalance - emergencyFund);

  const baselineRunway = totalBalance / burnRateData.currentRate;
  const conservativeRunway = availableBalance / (burnRateData.currentRate * 1.2);
  const optimisticRunway = availableBalance / (burnRateData.currentRate * 0.8);

  const currentDate = new Date();
  const criticalThresholds = {
    threeMonths: addMonths(currentDate, 3),
    sixMonths: addMonths(currentDate, 6),
    twelveMonths: addMonths(currentDate, 12)
  };

  const recommendations = generateFinancialRecommendations(
    baselineRunway,
    burnRateData,
    totalBalance,
    emergencyFund
  );

  return {
    totalBalance,
    emergencyFund,
    availableBalance,
    baselineRunway,
    conservativeRunway,
    optimisticRunway,
    criticalThresholds,
    recommendations
  };
}

/**
 * Generate personalized financial recommendations
 */
function generateFinancialRecommendations(
  runway: number,
  burnRateData: { trend: string; confidence: number },
  balance: number,
  emergencyFund: number
): string[] {
  const recommendations: string[] = [];

  if (runway < 3) {
    recommendations.push('URGENT: Less than 3 months runway - immediate action required');
    recommendations.push('Consider emergency income sources or major expense reduction');
  } else if (runway < 6) {
    recommendations.push('WARNING: Low runway - focus on increasing income or reducing expenses');
  }

  if (balance < emergencyFund) {
    recommendations.push('Build emergency fund to cover 6 months of expenses');
  }

  if (burnRateData.trend === 'worsening') {
    recommendations.push('Spending trend is increasing - review and control expenses');
  }

  if (burnRateData.confidence < 50) {
    recommendations.push('Income/expense patterns are inconsistent - create more predictable budget');
  }

  if (runway > 12) {
    recommendations.push('Strong financial position - consider investment opportunities');
  }

  return recommendations;
}

/**
 * Project future balance based on current trends
 */
export function projectFutureBalance(
  currentBalance: number,
  averageMonthlyIncome: number,
  averageMonthlyExpenses: number,
  monthsAhead: number
): number {
  const monthlyNetFlow = averageMonthlyIncome - averageMonthlyExpenses;
  return currentBalance + (monthlyNetFlow * monthsAhead);
}

/**
 * Generate cash flow projections for different scenarios
 */
export function generateCashFlowProjections(
  currentBalance: number,
  transactions: Transaction[],
  scenarios: ProjectionScenario[]
): Array<{
  scenario: string;
  projections: Array<{
    month: string;
    balance: number;
    income: number;
    expenses: number;
  }>;
}> {
  return scenarios.map(scenario => {
    const projections = [];
    let balance = currentBalance;

    for (let i = 0; i < scenario.projectedMonths; i++) {
      const projectionDate = addMonths(new Date(), i);
      const monthlyNetFlow = scenario.monthlyIncome - scenario.monthlyExpenses;
      balance += monthlyNetFlow;

      projections.push({
        month: format(projectionDate, 'MMM yyyy'),
        balance: Math.round(balance * 100) / 100,
        income: scenario.monthlyIncome,
        expenses: scenario.monthlyExpenses,
      });
    }

    return {
      scenario: scenario.name,
      projections,
    };
  });
}

/**
 * Calculate spending by category
 */
export function calculateSpendingByCategory(
  transactions: Transaction[],
  month?: Date
): Array<{ category: string; amount: number; percentage: number }> {
  const targetMonth = month || new Date();
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);

  const expenseTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return t.type === 'expense' && 
           transactionDate >= monthStart && 
           transactionDate <= monthEnd;
  });

  const totalExpenses = expenseTransactions.reduce((total, t) => total + Math.abs(t.amount), 0);

  const categoryTotals = expenseTransactions.reduce((acc, t) => {
    const category = t.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Calculate monthly trends over time
 */
export function calculateMonthlyTrends(
  transactions: Transaction[],
  months: number = 12
): Array<{
  month: string;
  income: number;
  expenses: number;
  netFlow: number;
}> {
  const trends = [];
  const currentDate = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const targetMonth = subMonths(currentDate, i);
    const income = calculateMonthlyIncome(transactions, targetMonth);
    const expenses = calculateMonthlyExpenses(transactions, targetMonth);

    trends.push({
      month: format(targetMonth, 'MMM yyyy'),
      income,
      expenses,
      netFlow: income - expenses,
    });
  }

  return trends;
}

/**
 * Detect unusual spending patterns
 */
export function detectSpendingAnomalies(
  transactions: Transaction[],
  thresholdMultiplier: number = 2
): Transaction[] {
  const currentMonth = new Date();
  const currentMonthExpenses = calculateMonthlyExpenses(transactions, currentMonth);
  const averageExpenses = calculateAverageMonthlyExpenses(transactions, 6);

  const threshold = averageExpenses * thresholdMultiplier;

  if (currentMonthExpenses > threshold) {
    // Return transactions from current month that are unusually large
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    return transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return t.type === 'expense' && 
               transactionDate >= monthStart && 
               transactionDate <= monthEnd &&
               Math.abs(t.amount) > (averageExpenses / 30); // Daily average threshold
      })
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  }

  return [];
}
