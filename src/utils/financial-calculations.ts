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
