'use client';

import { useState, useMemo } from 'react';
import {
  CalendarIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  FunnelIcon,
  DocumentArrowDownIcon
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

interface MonthlyBreakdown {
  month: string;
  year: number;
  totalSpending: number;
  totalIncome: number;
  netAmount: number;
  categories: { [category: string]: number };
  transactionCount: number;
  averageTransaction: number;
  recurringAmount: number;
  recurringPercentage: number;
}

interface YearlyBreakdown {
  year: number;
  totalSpending: number;
  totalIncome: number;
  netAmount: number;
  monthlyData: MonthlyBreakdown[];
  categories: { [category: string]: number };
  quarterlyData: Array<{
    quarter: string;
    spending: number;
    income: number;
    net: number;
  }>;
}

interface ExpenditureBreakdownProps {
  transactions: Transaction[];
  view: 'monthly' | 'yearly';
  onViewChange?: (view: 'monthly' | 'yearly') => void;
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
}

const formatCurrency = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
};

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
];

export function ExpenditureBreakdown({ 
  transactions, 
  view, 
  onViewChange,
  selectedPeriod,
  onPeriodChange 
}: ExpenditureBreakdownProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const { monthlyData, yearlyData, availablePeriods } = useMemo(() => {
    const monthlyMap = new Map<string, MonthlyBreakdown>();
    const yearlyMap = new Map<number, YearlyBreakdown>();

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const year = date.getFullYear();
      const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });

      // Monthly data
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthName,
          year,
          totalSpending: 0,
          totalIncome: 0,
          netAmount: 0,
          categories: {},
          transactionCount: 0,
          averageTransaction: 0,
          recurringAmount: 0,
          recurringPercentage: 0
        });
      }

      const monthData = monthlyMap.get(monthKey)!;
      monthData.transactionCount++;

      if (transaction.type === 'income') {
        monthData.totalIncome += Math.abs(transaction.amount);
      } else if (transaction.type === 'expense') {
        monthData.totalSpending += Math.abs(transaction.amount);
        monthData.categories[transaction.category] = 
          (monthData.categories[transaction.category] || 0) + Math.abs(transaction.amount);
        
        if (transaction.isRecurring) {
          monthData.recurringAmount += Math.abs(transaction.amount);
        }
      }

      // Yearly data
      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, {
          year,
          totalSpending: 0,
          totalIncome: 0,
          netAmount: 0,
          monthlyData: [],
          categories: {},
          quarterlyData: [
            { quarter: 'Q1', spending: 0, income: 0, net: 0 },
            { quarter: 'Q2', spending: 0, income: 0, net: 0 },
            { quarter: 'Q3', spending: 0, income: 0, net: 0 },
            { quarter: 'Q4', spending: 0, income: 0, net: 0 }
          ]
        });
      }

      const yearData = yearlyMap.get(year)!;
      const quarter = Math.floor(date.getMonth() / 3);

      if (transaction.type === 'income') {
        yearData.totalIncome += Math.abs(transaction.amount);
        yearData.quarterlyData[quarter].income += Math.abs(transaction.amount);
      } else if (transaction.type === 'expense') {
        yearData.totalSpending += Math.abs(transaction.amount);
        yearData.categories[transaction.category] = 
          (yearData.categories[transaction.category] || 0) + Math.abs(transaction.amount);
        yearData.quarterlyData[quarter].spending += Math.abs(transaction.amount);
      }
    });

    // Calculate derived values
    monthlyMap.forEach((monthData, key) => {
      monthData.netAmount = monthData.totalIncome - monthData.totalSpending;
      monthData.averageTransaction = monthData.totalSpending / Math.max(1, monthData.transactionCount);
      monthData.recurringPercentage = monthData.totalSpending > 0 
        ? (monthData.recurringAmount / monthData.totalSpending) * 100 
        : 0;
    });

    yearlyMap.forEach((yearData, year) => {
      yearData.netAmount = yearData.totalIncome - yearData.totalSpending;
      yearData.quarterlyData.forEach(q => {
        q.net = q.income - q.spending;
      });
    });

    const sortedMonthly = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => ({ key, ...data }));

    const sortedYearly = Array.from(yearlyMap.values())
      .sort((a, b) => b.year - a.year);

    const periods = view === 'monthly' 
      ? sortedMonthly.map(d => ({ key: d.key, label: d.month }))
      : sortedYearly.map(d => ({ key: d.year.toString(), label: d.year.toString() }));

    return {
      monthlyData: sortedMonthly,
      yearlyData: sortedYearly,
      availablePeriods: periods
    };
  }, [transactions, view]);

  const currentData = useMemo(() => {
    if (view === 'monthly') {
      return selectedPeriod 
        ? monthlyData.find(d => d.key === selectedPeriod) || monthlyData[0]
        : monthlyData[0];
    } else {
      return selectedPeriod 
        ? yearlyData.find(d => d.year.toString() === selectedPeriod) || yearlyData[0]
        : yearlyData[0];
    }
  }, [view, selectedPeriod, monthlyData, yearlyData]);

  const comparisonData = useMemo(() => {
    if (!showComparison || !currentData) return null;

    if (view === 'monthly') {
      const currentIndex = monthlyData.findIndex(d => d.key === (currentData as any).key);
      return currentIndex < monthlyData.length - 1 ? monthlyData[currentIndex + 1] : null;
    } else {
      const currentIndex = yearlyData.findIndex(d => d.year === (currentData as any).year);
      return currentIndex < yearlyData.length - 1 ? yearlyData[currentIndex + 1] : null;
    }
  }, [view, currentData, monthlyData, yearlyData, showComparison]);

  const chartData = useMemo(() => {
    if (!currentData) return [];

    if (view === 'monthly') {
      return Object.entries((currentData as any).categories || {})
        .map(([category, amount]) => ({
          category,
          amount: amount as number,
          percentage: ((amount as number) / (currentData as any).totalSpending) * 100
        }))
        .sort((a, b) => b.amount - a.amount);
    } else {
      const yearData = currentData as YearlyBreakdown;
      return Object.entries(yearData.categories || {})
        .map(([category, amount]) => ({
          category,
          amount: amount as number,
          percentage: (amount / yearData.totalSpending) * 100
        }))
        .sort((a, b) => b.amount - a.amount);
    }
  }, [currentData, view]);

  const trendData = useMemo(() => {
    if (view === 'monthly') {
      return monthlyData.slice(0, 12).reverse().map(d => ({
        period: d.month.split(' ')[0],
        spending: d.totalSpending,
        income: d.totalIncome,
        net: d.netAmount
      }));
    } else {
      return yearlyData.slice(0, 5).reverse().map(d => ({
        period: d.year.toString(),
        spending: d.totalSpending,
        income: d.totalIncome,
        net: d.netAmount
      }));
    }
  }, [view, monthlyData, yearlyData]);

  const quarterlyData = useMemo(() => {
    if (view !== 'yearly' || !currentData) return [];
    return (currentData as YearlyBreakdown).quarterlyData || [];
  }, [view, currentData]);

  const exportData = () => {
    const dataToExport = view === 'monthly' ? monthlyData : yearlyData;
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenditure-breakdown-${view}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!currentData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
        <p className="text-gray-500">Add some transactions to see your expenditure breakdown.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenditure Breakdown</h1>
          <p className="text-sm text-gray-600 mt-1">
            Detailed analysis of your {view} spending patterns
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onViewChange?.('monthly')}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                view === 'monthly' 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => onViewChange?.('yearly')}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                view === 'yearly' 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Yearly
            </button>
          </div>

          {/* Period Selector */}
          <select
            value={selectedPeriod || availablePeriods[0]?.key || ''}
            onChange={(e) => onPeriodChange?.(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white min-w-[150px]"
          >
            {availablePeriods.map(period => (
              <option key={period.key} value={period.key}>
                {period.label}
              </option>
            ))}
          </select>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={cn(
                "flex items-center space-x-1 px-3 py-2 text-sm rounded-md border transition-colors",
                showComparison 
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              <FunnelIcon className="h-4 w-4" />
              <span>Compare</span>
            </button>
            
            <button
              onClick={exportData}
              className="flex items-center space-x-1 px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ArrowUpIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Spending</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency((currentData as any).totalSpending || 0)}
              </p>
              {comparisonData && (
                <p className="text-xs text-gray-500 mt-1">
                  {((((currentData as any).totalSpending - (comparisonData as any).totalSpending) / (comparisonData as any).totalSpending) * 100).toFixed(1)}% vs prev
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowDownIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency((currentData as any).totalIncome || 0)}
              </p>
              {comparisonData && (
                <p className="text-xs text-gray-500 mt-1">
                  {((((currentData as any).totalIncome - (comparisonData as any).totalIncome) / (comparisonData as any).totalIncome) * 100).toFixed(1)}% vs prev
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={cn(
              "p-2 rounded-lg",
              (currentData as any).netAmount >= 0 ? "bg-green-100" : "bg-red-100"
            )}>
              {(currentData as any).netAmount >= 0 ? (
                <TrendingUpIcon className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDownIcon className="h-6 w-6 text-red-600" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Net Amount</p>
              <p className={cn(
                "text-xl font-bold",
                (currentData as any).netAmount >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency((currentData as any).netAmount || 0)}
              </p>
            </div>
          </div>
        </div>

        {view === 'monthly' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recurring</p>
                <p className="text-xl font-bold text-gray-900">
                  {((currentData as any).recurringPercentage || 0).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency((currentData as any).recurringAmount || 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Category Breakdown - {view === 'monthly' ? (currentData as any).month : (currentData as any).year}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.slice(0, 8)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="amount"
                label={({ percentage }) => percentage > 5 ? `${percentage.toFixed(1)}%` : ''}
                labelLine={false}
              >
                {chartData.slice(0, 8).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Category List */}
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-gray-700">{item.category}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-gray-900">
                    {formatCurrency(item.amount)}
                  </span>
                  <span className="text-gray-500 ml-2">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trend Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Spending Trend ({view === 'monthly' ? 'Last 12 Months' : 'Last 5 Years'})
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `£${(value / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="spending" fill="#ef4444" name="Spending" />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2 }}
                name="Net"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Quarterly Data (Yearly view only) */}
        {view === 'yearly' && quarterlyData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quarterly Breakdown - {(currentData as any).year}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quarterlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="quarter" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `£${(value / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="spending" fill="#ef4444" name="Spending" radius={[2, 2, 0, 0]} />
                <Bar dataKey="income" fill="#10b981" name="Income" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Comparison Panel */}
        {showComparison && comparisonData && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Period Comparison
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Period</span>
                <span className="font-medium">
                  {view === 'monthly' ? (currentData as any).month : (currentData as any).year}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Previous Period</span>
                <span className="font-medium">
                  {view === 'monthly' ? (comparisonData as any).month : (comparisonData as any).year}
                </span>
              </div>
              
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Spending Change</span>
                  <span className={cn(
                    "font-medium",
                    (currentData as any).totalSpending > (comparisonData as any).totalSpending 
                      ? "text-red-600" : "text-green-600"
                  )}>
                    {((((currentData as any).totalSpending - (comparisonData as any).totalSpending) / (comparisonData as any).totalSpending) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Income Change</span>
                  <span className={cn(
                    "font-medium",
                    (currentData as any).totalIncome > (comparisonData as any).totalIncome 
                      ? "text-green-600" : "text-red-600"
                  )}>
                    {((((currentData as any).totalIncome - (comparisonData as any).totalIncome) / (comparisonData as any).totalIncome) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}