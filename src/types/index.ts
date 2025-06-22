// Core financial data types
export interface Account {
  id: string;
  user_id: string;
  institution_name: string;
  account_name: string;
  account_type: 'savings' | 'current' | 'investment' | 'credit' | 'loan';
  balance: number;
  currency: string;
  last_updated: string;
  is_active: boolean;
  api_connected: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  subcategory?: string;
  date: string;
  type: 'income' | 'expense' | 'transfer';
  is_recurring: boolean;
  merchant?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
  parent_category_id?: string;
  is_system: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialGoal {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: 'emergency_fund' | 'investment' | 'savings' | 'debt_payoff' | 'other';
  is_achieved: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  goal: FinancialGoal;
  progressPercentage: number;
  remainingAmount: number;
  monthsRemaining: number;
  monthlyTarget: number;
  onTrack: boolean;
  projectedCompletionDate: string;
  recommendations: string[];
}

export interface GoalInsight {
  totalGoalsValue: number;
  completedGoals: number;
  activeGoals: number;
  averageProgress: number;
  topCategory: string;
  urgentGoals: FinancialGoal[];
  achievableThisYear: FinancialGoal[];
}

export interface CashFlowProjection {
  id: string;
  user_id: string;
  projection_date: string;
  projected_balance: number;
  projected_income: number;
  projected_expenses: number;
  scenario_name: string;
  confidence_level: number;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  type: 'low_balance' | 'high_spending' | 'goal_milestone' | 'projection_warning';
  title: string;
  message: string;
  threshold_value?: number;
  is_active: boolean;
  is_read: boolean;
  triggered_at?: string;
  created_at: string;
}

// Dashboard specific types
export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  burnRate: number;
  projectedRunway: number; // in months
  accountsCount: number;
  lastUpdated: string;
}

export interface SpendingByCategory {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  netFlow: number;
}

export interface ProjectionScenario {
  name: string;
  monthlyExpenses: number;
  monthlyIncome: number;
  projectedMonths: number;
  endBalance: number;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form types
export interface AccountFormData {
  institution_name: string;
  account_name: string;
  account_type: Account['account_type'];
  balance: number;
  currency: string;
}

export interface TransactionFormData {
  account_id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: Transaction['type'];
}

export interface BudgetFormData {
  category_id: string;
  amount: number;
  period: Budget['period'];
  start_date: string;
  end_date?: string;
}

// Investment and portfolio types
export interface Investment {
  id: string;
  user_id: string;
  account_id: string;
  symbol: string;
  name: string;
  type: 'stock' | 'bond' | 'etf' | 'mutual_fund' | 'crypto' | 'commodity' | 'real_estate' | 'other';
  quantity: number;
  purchase_price: number;
  current_price: number;
  purchase_date: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  dayChange: number;
  dayChangePercentage: number;
  diversification: PortfolioDiversification;
  topPerformers: Investment[];
  worstPerformers: Investment[];
}

export interface PortfolioDiversification {
  byType: { [key: string]: { value: number; percentage: number } };
  bySector: { [key: string]: { value: number; percentage: number } };
  byRegion: { [key: string]: { value: number; percentage: number } };
}

export interface InvestmentPerformance {
  investment: Investment;
  currentValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  dayChange: number;
  dayChangePercentage: number;
  priceHistory: PriceHistoryPoint[];
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
  volume?: number;
}

export interface DebtPayoffPlan {
  id: string;
  user_id: string;
  name: string;
  strategy: 'snowball' | 'avalanche' | 'custom';
  total_debt: number;
  monthly_payment: number;
  estimated_payoff_date: string;
  interest_saved: number;
  debts: DebtItem[];
  created_at: string;
  updated_at: string;
}

export interface DebtItem {
  id: string;
  name: string;
  balance: number;
  minimum_payment: number;
  interest_rate: number;
  type: 'credit_card' | 'personal_loan' | 'mortgage' | 'student_loan' | 'auto_loan' | 'other';
  account_id?: string;
}

export interface TaxCalculation {
  id: string;
  user_id: string;
  tax_year: number;
  income_categories: { [key: string]: number };
  deductions: { [key: string]: number };
  estimated_tax: number;
  refund_amount: number;
  quarterly_payments: number[];
  created_at: string;
  updated_at: string;
}

export interface RetirementPlan {
  id: string;
  user_id: string;
  name: string;
  current_age: number;
  retirement_age: number;
  current_savings: number;
  monthly_contribution: number;
  expected_return: number;
  inflation_rate: number;
  retirement_goal: number;
  projected_value: number;
  shortfall: number;
  created_at: string;
  updated_at: string;
}

export interface CurrencyRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  timestamp: string;
}

export interface SharedExpense {
  id: string;
  user_id: string;
  transaction_id: string;
  total_amount: number;
  participants: ExpenseParticipant[];
  split_method: 'equal' | 'percentage' | 'exact_amounts';
  description: string;
  settled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseParticipant {
  user_id: string;
  name: string;
  email: string;
  amount_owed: number;
  amount_paid: number;
  is_settled: boolean;
}

export interface Receipt {
  id: string;
  user_id: string;
  transaction_id?: string;
  image_url: string;
  merchant_name?: string;
  total_amount?: number;
  currency?: string;
  date?: string;
  items: ReceiptItem[];
  confidence_score: number;
  manual_review: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReceiptItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: string;
}

// User preferences
export interface UserPreferences {
  id: string;
  user_id: string;
  currency: string;
  date_format: string;
  theme: 'light' | 'dark' | 'system';
  notifications_enabled: boolean;
  email_alerts: boolean;
  dashboard_refresh_interval: number;
  created_at: string;
  updated_at: string;
}
