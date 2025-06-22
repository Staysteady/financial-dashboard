'use client';

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

interface BalanceTrendData {
  date: string;
  balance: number;
  income: number;
  expenses: number;
}

interface SpendingBreakdownData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface MonthlyComparisonData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface CategoryTrendData {
  month: string;
  [category: string]: number | string;
}

// Custom tooltip component for better formatting
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: £{entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Format currency for chart axes
const formatCurrency = (value: number) => {
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(1)}k`;
  }
  return `£${value}`;
};

// Balance Trend Chart
interface BalanceTrendChartProps {
  data: BalanceTrendData[];
  height?: number;
}

export function BalanceTrendChart({ data, height = 300 }: BalanceTrendChartProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Trend</h3>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
          />
          <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatCurrency} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="balance"
            fill="#3b82f6"
            fillOpacity={0.1}
            stroke="#3b82f6"
            strokeWidth={2}
            name="Balance"
          />
          <Bar dataKey="income" fill="#10b981" name="Income" />
          <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Spending Breakdown Pie Chart
interface SpendingBreakdownChartProps {
  data: SpendingBreakdownData[];
  height?: number;
}

export function SpendingBreakdownChart({ data, height = 300 }: SpendingBreakdownChartProps) {
  const renderLabel = (entry: SpendingBreakdownData) => {
    if (entry.percentage < 5) return ''; // Hide labels for small slices
    return `${entry.percentage}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Breakdown</h3>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="amount"
            label={renderLabel}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any) => [`£${value.toLocaleString()}`, 'Amount']}
            labelFormatter={(label) => `Category: ${label}`}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-700">{item.category}</span>
            <span className="text-gray-500 ml-auto">£{item.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Monthly Income vs Expenses Chart
interface MonthlyComparisonChartProps {
  data: MonthlyComparisonData[];
  height?: number;
}

export function MonthlyComparisonChart({ data, height = 300 }: MonthlyComparisonChartProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Income vs Expenses</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
          <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatCurrency} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="income" fill="#10b981" name="Income" radius={[2, 2, 0, 0]} />
          <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      
      {/* Net Income Summary */}
      <div className="mt-4 flex justify-center">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-sm text-gray-600">Average Monthly Net</p>
          <p className="text-lg font-semibold text-gray-900">
            £{(data.reduce((sum, item) => sum + item.net, 0) / data.length).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// Category Spending Over Time
interface CategoryTrendChartProps {
  data: CategoryTrendData[];
  categories: string[];
  height?: number;
}

export function CategoryTrendChart({ data, categories, height = 300 }: CategoryTrendChartProps) {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Spending Trends</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
          <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatCurrency} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {categories.map((category, index) => (
            <Line
              key={category}
              type="monotone"
              dataKey={category}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ fill: colors[index % colors.length], strokeWidth: 2 }}
              name={category}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Summary Stats Cards
interface SummaryStatsProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  netWorth: number;
}

export function SummaryStats({
  totalBalance,
  monthlyIncome,
  monthlyExpenses,
  savingsRate,
  netWorth
}: SummaryStatsProps) {
  const stats = [
    {
      name: 'Total Balance',
      value: totalBalance,
      change: 5.4,
      changeType: 'positive' as const,
      icon: '💰'
    },
    {
      name: 'Monthly Income',
      value: monthlyIncome,
      change: 2.1,
      changeType: 'positive' as const,
      icon: '📈'
    },
    {
      name: 'Monthly Expenses',
      value: monthlyExpenses,
      change: -1.2,
      changeType: 'negative' as const,
      icon: '💸'
    },
    {
      name: 'Savings Rate',
      value: savingsRate,
      change: 3.2,
      changeType: 'positive' as const,
      icon: '🎯',
      isPercentage: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => (
        <div key={stat.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="text-2xl mr-3">{stat.icon}</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900">
                {stat.isPercentage 
                  ? `${stat.value}%` 
                  : `£${stat.value.toLocaleString()}`
                }
              </p>
              <div className={`flex items-center mt-1 text-sm ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                <span className="mr-1">
                  {stat.changeType === 'positive' ? '↗' : '↘'}
                </span>
                <span>{Math.abs(stat.change)}% from last month</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Quick Insights Component
interface QuickInsightsProps {
  insights: Array<{
    type: 'warning' | 'info' | 'success';
    title: string;
    description: string;
    action?: string;
  }>;
}

export function QuickInsights({ insights }: QuickInsightsProps) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-orange-200 bg-orange-50';
      case 'success': return 'border-green-200 bg-green-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div 
            key={index} 
            className={`border rounded-lg p-4 ${getInsightColor(insight.type)}`}
          >
            <div className="flex items-start space-x-3">
              <span className="text-lg">{getInsightIcon(insight.type)}</span>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{insight.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                {insight.action && (
                  <button className="text-sm text-blue-600 hover:text-blue-700 mt-2">
                    {insight.action}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}