'use client';

import { useState, useMemo } from 'react';
import {
  CalendarIcon,
  ChartBarIcon,
  CurrencyPoundIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon
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
  Area,
  AreaChart,
  ComposedChart
} from 'recharts';
import { cn } from '@/lib/utils';

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
  location?: string;
  isRecurring?: boolean;
  tags?: string[];
  status: 'pending' | 'completed' | 'failed';
}

interface SpendingAnalysis {
  totalSpending: number;
  averageDaily: number;
  averageWeekly: number;
  averageMonthly: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    transactionCount: number;
    averageAmount: number;
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    spending: number;
    income: number;
    net: number;
    categories: { [category: string]: number };
  }>;
  spendingPatterns: {
    dayOfWeek: Array<{ day: string; amount: number }>;
    timeOfMonth: Array<{ week: string; amount: number }>;
    merchantAnalysis: Array<{
      merchant: string;
      amount: number;
      frequency: number;
      category: string;
    }>;
  };
  insights: Array<{
    type: 'warning' | 'info' | 'success' | 'alert';
    title: string;
    description: string;
    value?: number;
    change?: number;
    category?: string;
  }>;
}

interface SpendingAnalysisDashboardProps {
  transactions: Transaction[];
  dateRange: 'all' | '7d' | '30d' | '90d' | '1y';
  onDateRangeChange?: (range: 'all' | '7d' | '30d' | '90d' | '1y') => void;
}

const formatCurrency = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
};

const getDateRange = (range: string) => {
  const now = new Date();
  const start = new Date();
  
  switch (range) {
    case '7d':
      start.setDate(now.getDate() - 7);
      break;
    case '30d':
      start.setDate(now.getDate() - 30);
      break;
    case '90d':
      start.setDate(now.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setFullYear(2020);
  }
  
  return { start, end: now };
};

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
];

export function SpendingAnalysisDashboard({ 
  transactions, 
  dateRange, 
  onDateRangeChange 
}: SpendingAnalysisDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const analysis = useMemo(() => {
    const { start, end } = getDateRange(dateRange);
    
    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= start && transactionDate <= end && t.type === 'expense';
    });

    const totalSpending = filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const daysDifference = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    
    const categoryMap = new Map<string, {
      amount: number;
      count: number;
      transactions: Transaction[];
    }>();

    filteredTransactions.forEach(transaction => {
      const existing = categoryMap.get(transaction.category) || { amount: 0, count: 0, transactions: [] };
      categoryMap.set(transaction.category, {
        amount: existing.amount + Math.abs(transaction.amount),
        count: existing.count + 1,
        transactions: [...existing.transactions, transaction]
      });
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => {
      const percentage = totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0;
      const averageAmount = data.amount / data.count;
      
      const previousPeriodStart = new Date(start);
      previousPeriodStart.setTime(start.getTime() - (end.getTime() - start.getTime()));
      
      const previousTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= previousPeriodStart && tDate < start && 
               t.type === 'expense' && t.category === category;
      });
      
      const previousAmount = previousTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercentage = 0;
      
      if (previousAmount > 0) {
        trendPercentage = ((data.amount - previousAmount) / previousAmount) * 100;
        if (Math.abs(trendPercentage) > 5) {
          trend = trendPercentage > 0 ? 'up' : 'down';
        }
      } else if (data.amount > 0) {
        trend = 'up';
        trendPercentage = 100;
      }

      return {
        category,
        amount: data.amount,
        percentage,
        transactionCount: data.count,
        averageAmount,
        trend,
        trendPercentage: Math.abs(trendPercentage)
      };
    }).sort((a, b) => b.amount - a.amount);

    const monthlyTrends = (() => {
      const months = new Map<string, {
        spending: number;
        income: number;
        categories: { [category: string]: number };
      }>();

      transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        if (date >= start && date <= end) {
          const monthKey = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' });
          
          const existing = months.get(monthKey) || { spending: 0, income: 0, categories: {} };
          
          if (transaction.type === 'expense') {
            existing.spending += Math.abs(transaction.amount);
            existing.categories[transaction.category] = (existing.categories[transaction.category] || 0) + Math.abs(transaction.amount);
          } else if (transaction.type === 'income') {
            existing.income += Math.abs(transaction.amount);
          }
          
          months.set(monthKey, existing);
        }
      });

      return Array.from(months.entries()).map(([month, data]) => ({
        month,
        spending: data.spending,
        income: data.income,
        net: data.income - data.spending,
        categories: data.categories
      })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    })();

    const spendingPatterns = (() => {
      const dayOfWeekMap = new Map<string, number>();
      const timeOfMonthMap = new Map<string, number>();
      const merchantMap = new Map<string, { amount: number; frequency: number; category: string }>();

      filteredTransactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
        const weekOfMonth = Math.ceil(date.getDate() / 7);
        
        dayOfWeekMap.set(dayName, (dayOfWeekMap.get(dayName) || 0) + Math.abs(transaction.amount));
        timeOfMonthMap.set(`Week ${weekOfMonth}`, (timeOfMonthMap.get(`Week ${weekOfMonth}`) || 0) + Math.abs(transaction.amount));
        
        if (transaction.merchant) {
          const existing = merchantMap.get(transaction.merchant) || { amount: 0, frequency: 0, category: transaction.category };
          merchantMap.set(transaction.merchant, {
            amount: existing.amount + Math.abs(transaction.amount),
            frequency: existing.frequency + 1,
            category: transaction.category
          });
        }
      });

      const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      return {
        dayOfWeek: dayOrder.map(day => ({
          day,
          amount: dayOfWeekMap.get(day) || 0
        })),
        timeOfMonth: Array.from(timeOfMonthMap.entries()).map(([week, amount]) => ({
          week,
          amount
        })).sort((a, b) => a.week.localeCompare(b.week)),
        merchantAnalysis: Array.from(merchantMap.entries())
          .map(([merchant, data]) => ({
            merchant,
            amount: data.amount,
            frequency: data.frequency,
            category: data.category
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10)
      };
    })();

    const insights = (() => {
      const insights: SpendingAnalysis['insights'] = [];
      
      const averageDaily = totalSpending / daysDifference;
      const previousPeriodSpending = (() => {
        const prevStart = new Date(start);
        prevStart.setTime(start.getTime() - (end.getTime() - start.getTime()));
        return transactions
          .filter(t => {
            const tDate = new Date(t.date);
            return tDate >= prevStart && tDate < start && t.type === 'expense';
          })
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      })();

      if (previousPeriodSpending > 0) {
        const spendingChange = ((totalSpending - previousPeriodSpending) / previousPeriodSpending) * 100;
        if (Math.abs(spendingChange) > 10) {
          insights.push({
            type: spendingChange > 0 ? 'warning' : 'success',
            title: `Spending ${spendingChange > 0 ? 'increased' : 'decreased'} significantly`,
            description: `Your spending has ${spendingChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(spendingChange).toFixed(1)}% compared to the previous period.`,
            change: spendingChange
          });
        }
      }

      const topCategory = categoryBreakdown[0];
      if (topCategory && topCategory.percentage > 40) {
        insights.push({
          type: 'info',
          title: `High spending in ${topCategory.category}`,
          description: `${topCategory.category} accounts for ${topCategory.percentage.toFixed(1)}% of your total spending.`,
          category: topCategory.category,
          value: topCategory.amount
        });
      }

      const highTrendCategories = categoryBreakdown.filter(c => c.trend === 'up' && c.trendPercentage > 25);
      if (highTrendCategories.length > 0) {
        const category = highTrendCategories[0];
        insights.push({
          type: 'alert',
          title: `Spending spike in ${category.category}`,
          description: `Your ${category.category} spending has increased by ${category.trendPercentage.toFixed(1)}% recently.`,
          category: category.category,
          change: category.trendPercentage
        });
      }

      if (averageDaily > 100) {
        insights.push({
          type: 'info',
          title: 'Daily spending overview',
          description: `You're spending an average of ${formatCurrency(averageDaily)} per day.`,
          value: averageDaily
        });
      }

      return insights;
    })();

    return {
      totalSpending,
      averageDaily: totalSpending / daysDifference,
      averageWeekly: totalSpending / Math.max(1, daysDifference / 7),
      averageMonthly: totalSpending / Math.max(1, daysDifference / 30),
      categoryBreakdown,
      monthlyTrends,
      spendingPatterns,
      insights
    };
  }, [transactions, dateRange]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon className="h-4 w-4 text-red-500" />;
      case 'down':
        return <TrendingDownIcon className="h-4 w-4 text-green-500" />;
      default:
        return <ArrowUpIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'alert':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'success':
        return <ArrowDownIcon className="h-5 w-5 text-green-500" />;
      default:
        return <ChartBarIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Spending Analysis</h1>
        
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange?.(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <CurrencyPoundIcon className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Spending</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analysis.totalSpending)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Daily Average</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analysis.averageDaily)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Average</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analysis.averageMonthly)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.categoryBreakdown.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h2>
          <div className="space-y-3">
            {analysis.insights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{insight.title}</h3>
                  <p className="text-sm text-gray-600">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analysis.categoryBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="amount"
                label={({ percentage }) => `${percentage.toFixed(1)}%`}
                labelLine={false}
              >
                {analysis.categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Category Legend */}
          <div className="mt-4 grid grid-cols-1 gap-2">
            {analysis.categoryBreakdown.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-gray-700">{item.category}</span>
                  {getTrendIcon(item.trend)}
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Spending Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analysis.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `£${(value / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="spending"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: '#ef4444', strokeWidth: 2 }}
                name="Spending"
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2 }}
                name="Income"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Day of Week Pattern */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Day of Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analysis.spendingPatterns.dayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `£${value}`} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Merchants */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Merchants</h3>
          <div className="space-y-3">
            {analysis.spendingPatterns.merchantAnalysis.slice(0, 8).map((merchant, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{merchant.merchant}</div>
                  <div className="text-sm text-gray-500">
                    {merchant.category} • {merchant.frequency} transactions
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {formatCurrency(merchant.amount)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatCurrency(merchant.amount / merchant.frequency)} avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}