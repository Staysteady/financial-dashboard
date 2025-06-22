'use client';

import { useState, useMemo } from 'react';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  CurrencyPoundIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import { cn } from '@/lib/utils';

interface Budget {
  id: string;
  name: string;
  description?: string;
  category?: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  amount: number;
  spent: number;
  remaining: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  alertThreshold: number; // Percentage (e.g., 80 for 80%)
  rollover: boolean; // Whether unused budget rolls over to next period
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant?: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  account: string;
  status: 'pending' | 'completed' | 'failed';
}

interface BudgetAnalysis {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  overallUtilization: number;
  budgetsOnTrack: number;
  budgetsAtRisk: number;
  budgetsOverspent: number;
  projectedEndOfPeriod: {
    totalSpending: number;
    budgetStatus: 'under' | 'on-track' | 'over';
    variance: number;
  };
  categoryBreakdown: Array<{
    category: string;
    budgeted: number;
    spent: number;
    remaining: number;
    utilization: number;
    status: 'on-track' | 'at-risk' | 'overspent';
    projection: number;
  }>;
  trends: Array<{
    period: string;
    budgeted: number;
    spent: number;
    variance: number;
  }>;
}

interface BudgetComparisonProps {
  budgets: Budget[];
  transactions: Transaction[];
  onBudgetCreate?: (budget: Omit<Budget, 'id' | 'spent' | 'remaining' | 'createdAt' | 'updatedAt'>) => void;
  onBudgetUpdate?: (id: string, updates: Partial<Budget>) => void;
  onBudgetDelete?: (id: string) => void;
  currentPeriod?: string;
}

const formatCurrency = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
};

const getBudgetStatus = (budget: Budget): 'on-track' | 'at-risk' | 'overspent' => {
  const utilization = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
  
  if (budget.spent > budget.amount) return 'overspent';
  if (utilization >= budget.alertThreshold) return 'at-risk';
  return 'on-track';
};

const getBudgetUtilization = (budget: Budget): number => {
  return budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
};

const CHART_COLORS = {
  budgeted: '#3b82f6',
  spent: '#ef4444',
  remaining: '#10b981',
  onTrack: '#10b981',
  atRisk: '#f59e0b',
  overspent: '#ef4444'
};

export function BudgetComparison({
  budgets,
  transactions,
  onBudgetCreate,
  onBudgetUpdate,
  onBudgetDelete,
  currentPeriod
}: BudgetComparisonProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod || 'monthly');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'trends'>('overview');

  const analysis = useMemo(() => {
    const activeBudgets = budgets.filter(b => b.isActive);
    
    const totalBudgeted = activeBudgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalBudgeted - totalSpent;
    const overallUtilization = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

    let budgetsOnTrack = 0;
    let budgetsAtRisk = 0;
    let budgetsOverspent = 0;

    const categoryBreakdown = activeBudgets.map(budget => {
      const status = getBudgetStatus(budget);
      const utilization = getBudgetUtilization(budget);
      
      switch (status) {
        case 'on-track': budgetsOnTrack++; break;
        case 'at-risk': budgetsAtRisk++; break;
        case 'overspent': budgetsOverspent++; break;
      }

      // Simple projection based on current pace
      const now = new Date();
      const startDate = new Date(budget.startDate);
      const endDate = new Date(budget.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = totalDays - elapsedDays;
      
      let projection = budget.spent;
      if (elapsedDays > 0 && remainingDays > 0) {
        const dailySpendRate = budget.spent / elapsedDays;
        projection = budget.spent + (dailySpendRate * remainingDays);
      }

      return {
        category: budget.category || budget.name,
        budgeted: budget.amount,
        spent: budget.spent,
        remaining: budget.remaining,
        utilization,
        status,
        projection: Math.max(projection, budget.spent)
      };
    });

    // Calculate overall projection
    const totalProjection = categoryBreakdown.reduce((sum, item) => sum + item.projection, 0);
    const projectedVariance = totalProjection - totalBudgeted;
    
    let budgetStatus: 'under' | 'on-track' | 'over';
    if (projectedVariance > totalBudgeted * 0.1) budgetStatus = 'over';
    else if (projectedVariance < -totalBudgeted * 0.1) budgetStatus = 'under';
    else budgetStatus = 'on-track';

    // Generate trend data (mock for demonstration)
    const trends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const period = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' });
      
      // In a real implementation, this would calculate actual historical data
      const budgeted = totalBudgeted * (0.9 + Math.random() * 0.2);
      const spent = budgeted * (0.7 + Math.random() * 0.4);
      
      trends.push({
        period,
        budgeted,
        spent,
        variance: spent - budgeted
      });
    }

    return {
      totalBudgeted,
      totalSpent,
      totalRemaining,
      overallUtilization,
      budgetsOnTrack,
      budgetsAtRisk,
      budgetsOverspent,
      projectedEndOfPeriod: {
        totalSpending: totalProjection,
        budgetStatus,
        variance: projectedVariance
      },
      categoryBreakdown,
      trends
    };
  }, [budgets, transactions]);

  const filteredBudgets = useMemo(() => {
    return budgets.filter(budget => 
      budget.isActive && 
      (selectedPeriod === 'all' || budget.period === selectedPeriod)
    );
  }, [budgets, selectedPeriod]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-track':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'at-risk':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'overspent':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'text-green-600 bg-green-50 border-green-200';
      case 'at-risk': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'overspent': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget vs Actual</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track your spending against budgets and projections
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Period Filter */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="all">All Periods</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>

          {/* View Mode */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {['overview', 'detailed', 'trends'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={cn(
                  "px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize",
                  viewMode === mode 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Budget</span>
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CurrencyPoundIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Budgeted</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(analysis.totalBudgeted)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analysis.overallUtilization.toFixed(1)}% utilized
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingUpIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(analysis.totalSpent)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Projected: {formatCurrency(analysis.projectedEndOfPeriod.totalSpending)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingDownIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Remaining</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(analysis.totalRemaining)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Variance: {analysis.projectedEndOfPeriod.variance >= 0 ? '+' : ''}{formatCurrency(analysis.projectedEndOfPeriod.variance)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Budget Status</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm font-medium text-green-600">{analysis.budgetsOnTrack}</span>
                <span className="text-sm font-medium text-orange-600">{analysis.budgetsAtRisk}</span>
                <span className="text-sm font-medium text-red-600">{analysis.budgetsOverspent}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                On track / At risk / Overspent
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content based on view mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget vs Actual Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget vs Actual by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysis.categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="category" 
                  stroke="#6b7280" 
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `£${(value / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="budgeted" fill={CHART_COLORS.budgeted} name="Budgeted" />
                <Bar dataKey="spent" fill={CHART_COLORS.spent} name="Spent" />
                <Bar dataKey="projection" fill="#94a3b8" name="Projected" opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Budget Status Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'On Track', value: analysis.budgetsOnTrack, color: CHART_COLORS.onTrack },
                    { name: 'At Risk', value: analysis.budgetsAtRisk, color: CHART_COLORS.atRisk },
                    { name: 'Overspent', value: analysis.budgetsOverspent, color: CHART_COLORS.overspent }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ value }) => value > 0 ? value.toString() : ''}
                >
                  {[
                    { name: 'On Track', value: analysis.budgetsOnTrack, color: CHART_COLORS.onTrack },
                    { name: 'At Risk', value: analysis.budgetsAtRisk, color: CHART_COLORS.atRisk },
                    { name: 'Overspent', value: analysis.budgetsOverspent, color: CHART_COLORS.overspent }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="mt-4 space-y-2">
              {[
                { name: 'On Track', value: analysis.budgetsOnTrack, color: CHART_COLORS.onTrack },
                { name: 'At Risk', value: analysis.budgetsAtRisk, color: CHART_COLORS.atRisk },
                { name: 'Overspent', value: analysis.budgetsOverspent, color: CHART_COLORS.overspent }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-700">{item.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'detailed' && (
        <div className="space-y-6">
          {/* Individual Budget Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBudgets.map((budget) => {
              const status = getBudgetStatus(budget);
              const utilization = getBudgetUtilization(budget);
              
              return (
                <div key={budget.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{budget.name}</h3>
                      {budget.description && (
                        <p className="text-sm text-gray-600 mt-1">{budget.description}</p>
                      )}
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-2">
                        {budget.period}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(status)}
                      <button
                        onClick={() => {
                          setSelectedBudget(budget);
                          setShowEditModal(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Budget:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(budget.amount)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Spent:</span>
                      <span className={cn(
                        "font-medium",
                        status === 'overspent' ? "text-red-600" : "text-gray-900"
                      )}>
                        {formatCurrency(budget.spent)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Remaining:</span>
                      <span className={cn(
                        "font-medium",
                        budget.remaining < 0 ? "text-red-600" : "text-green-600"
                      )}>
                        {formatCurrency(budget.remaining)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{utilization.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={cn(
                            "h-2 rounded-full transition-all",
                            status === 'overspent' ? "bg-red-500" :
                            status === 'at-risk' ? "bg-orange-500" : "bg-green-500"
                          )}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                        {utilization > 100 && (
                          <div 
                            className="h-2 bg-red-500 rounded-full"
                            style={{ 
                              width: `${Math.min(utilization - 100, 100)}%`,
                              marginTop: '-8px',
                              opacity: 0.7
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border",
                      getStatusColor(status)
                    )}>
                      {status.replace('-', ' ').toUpperCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'trends' && (
        <div className="space-y-6">
          {/* Spending Trends */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget vs Actual Trends</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={analysis.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `£${(value / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="budgeted" fill={CHART_COLORS.budgeted} name="Budgeted" />
                <Bar dataKey="spent" fill={CHART_COLORS.spent} name="Spent" />
                <Line
                  type="monotone"
                  dataKey="variance"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                  name="Variance"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Projection Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">End of Period Projection</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className={cn(
                  "inline-flex items-center justify-center w-16 h-16 rounded-full mb-3",
                  analysis.projectedEndOfPeriod.budgetStatus === 'under' ? "bg-green-100" :
                  analysis.projectedEndOfPeriod.budgetStatus === 'on-track' ? "bg-blue-100" : "bg-red-100"
                )}>
                  {analysis.projectedEndOfPeriod.budgetStatus === 'under' ? (
                    <TrendingDownIcon className="h-8 w-8 text-green-600" />
                  ) : analysis.projectedEndOfPeriod.budgetStatus === 'on-track' ? (
                    <ArrowRightIcon className="h-8 w-8 text-blue-600" />
                  ) : (
                    <TrendingUpIcon className="h-8 w-8 text-red-600" />
                  )}
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Projected Status</h4>
                <p className={cn(
                  "text-sm font-medium",
                  analysis.projectedEndOfPeriod.budgetStatus === 'under' ? "text-green-600" :
                  analysis.projectedEndOfPeriod.budgetStatus === 'on-track' ? "text-blue-600" : "text-red-600"
                )}>
                  {analysis.projectedEndOfPeriod.budgetStatus.replace('-', ' ').toUpperCase()}
                </p>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatCurrency(analysis.projectedEndOfPeriod.totalSpending)}
                </div>
                <h4 className="font-semibold text-gray-600 mb-1">Projected Spending</h4>
                <p className="text-sm text-gray-500">
                  vs {formatCurrency(analysis.totalBudgeted)} budgeted
                </p>
              </div>

              <div className="text-center">
                <div className={cn(
                  "text-2xl font-bold mb-1",
                  analysis.projectedEndOfPeriod.variance >= 0 ? "text-red-600" : "text-green-600"
                )}>
                  {analysis.projectedEndOfPeriod.variance >= 0 ? '+' : ''}{formatCurrency(analysis.projectedEndOfPeriod.variance)}
                </div>
                <h4 className="font-semibold text-gray-600 mb-1">Variance</h4>
                <p className="text-sm text-gray-500">
                  {Math.abs((analysis.projectedEndOfPeriod.variance / analysis.totalBudgeted) * 100).toFixed(1)}% {analysis.projectedEndOfPeriod.variance >= 0 ? 'over' : 'under'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Form Modals */}
      {showCreateModal && (
        <BudgetFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSave={(budgetData) => {
            onBudgetCreate?.(budgetData);
            setShowCreateModal(false);
          }}
        />
      )}

      {showEditModal && selectedBudget && (
        <BudgetFormModal
          mode="edit"
          budget={selectedBudget}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBudget(null);
          }}
          onSave={(budgetData) => {
            onBudgetUpdate?.(selectedBudget.id, budgetData);
            setShowEditModal(false);
            setSelectedBudget(null);
          }}
          onDelete={() => {
            onBudgetDelete?.(selectedBudget.id);
            setShowEditModal(false);
            setSelectedBudget(null);
          }}
        />
      )}
    </div>
  );
}

// Budget Form Modal Component
function BudgetFormModal({ 
  mode, 
  budget, 
  onClose, 
  onSave,
  onDelete 
}: {
  mode: 'create' | 'edit';
  budget?: Budget;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: () => void;
}) {
  const [formData, setFormData] = useState({
    name: budget?.name || '',
    description: budget?.description || '',
    category: budget?.category || '',
    period: budget?.period || 'monthly',
    amount: budget?.amount?.toString() || '',
    alertThreshold: budget?.alertThreshold?.toString() || '80',
    rollover: budget?.rollover ?? false,
    startDate: budget?.startDate || new Date().toISOString().split('T')[0],
    endDate: budget?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: budget?.isActive ?? true,
    tags: budget?.tags?.join(', ') || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const budgetData = {
      ...formData,
      amount: parseFloat(formData.amount),
      alertThreshold: parseFloat(formData.alertThreshold),
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    };

    onSave(budgetData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'create' ? 'Create Budget' : 'Edit Budget'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Groceries, Entertainment"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period
                </label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alert Threshold (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.alertThreshold}
                onChange={(e) => setFormData(prev => ({ ...prev, alertThreshold: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Get alerts when spending reaches this percentage</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., essential, variable, goal"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.rollover}
                  onChange={(e) => setFormData(prev => ({ ...prev, rollover: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Rollover unused budget to next period</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div>
              {mode === 'edit' && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex items-center space-x-1 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {mode === 'create' ? 'Create' : 'Update'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}