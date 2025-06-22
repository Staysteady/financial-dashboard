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
