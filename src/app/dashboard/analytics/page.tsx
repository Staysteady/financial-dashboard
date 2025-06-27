'use client';

import { useState } from 'react';
import {
  ChartBarIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// Mock data for analytics
const mockAnalyticsData = {
  monthlySpending: [
    { month: 'Jan', amount: 2800 },
    { month: 'Feb', amount: 3200 },
    { month: 'Mar', amount: 2900 },
    { month: 'Apr', amount: 3100 },
    { month: 'May', amount: 2750 },
    { month: 'Jun', amount: 3050 }
  ],
  categoryBreakdown: [
    { category: 'Housing', amount: 1200, percentage: 38.7 },
    { category: 'Food & Drink', amount: 450, percentage: 14.5 },
    { category: 'Transport', amount: 320, percentage: 10.3 },
    { category: 'Shopping', amount: 280, percentage: 9.0 },
    { category: 'Entertainment', amount: 180, percentage: 5.8 },
    { category: 'Utilities', amount: 150, percentage: 4.8 },
    { category: 'Other', amount: 520, percentage: 16.8 }
  ],
  trends: {
    totalSpending: { current: 3100, previous: 2900, change: 6.9 },
    avgTransaction: { current: 45.50, previous: 42.30, change: 7.6 },
    transactionCount: { current: 68, previous: 72, change: -5.6 }
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercentage = (value: number) => {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
};

function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  format = 'currency' 
}: { 
  title: string; 
  value: number; 
  change: number; 
  icon: any; 
  format?: 'currency' | 'number' | 'percentage';
}) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toString();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{formatValue(value)}</p>
        </div>
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
      <div className="mt-4 flex items-center">
        {change >= 0 ? (
          <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
        ) : (
          <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
        )}
        <span className={cn(
          "ml-1 text-sm font-medium",
          change >= 0 ? "text-green-600" : "text-red-600"
        )}>
          {formatPercentage(change)}
        </span>
        <span className="ml-1 text-sm text-gray-500">vs last month</span>
      </div>
    </div>
  );
}

function CategoryChart() {
  const maxAmount = Math.max(...mockAnalyticsData.categoryBreakdown.map(c => c.amount));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Spending by Category</h3>
        <ChartPieIcon className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {mockAnalyticsData.categoryBreakdown.map((category, index) => (
          <div key={category.category} className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ 
                  backgroundColor: `hsl(${(index * 360) / mockAnalyticsData.categoryBreakdown.length}, 70%, 50%)` 
                }}
              />
              <span className="text-sm font-medium text-gray-900">{category.category}</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(category.amount / maxAmount) * 100}%`,
                    backgroundColor: `hsl(${(index * 360) / mockAnalyticsData.categoryBreakdown.length}, 70%, 50%)`
                  }}
                />
              </div>
              <div className="text-right min-w-0">
                <div className="text-sm font-semibold text-gray-900">
                  {formatCurrency(category.amount)}
                </div>
                <div className="text-xs text-gray-500">
                  {category.percentage}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpendingTrendChart() {
  const maxAmount = Math.max(...mockAnalyticsData.monthlySpending.map(m => m.amount));
  const minAmount = Math.min(...mockAnalyticsData.monthlySpending.map(m => m.amount));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Monthly Spending Trend</h3>
        <ChartBarIcon className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {mockAnalyticsData.monthlySpending.map((month, index) => {
          const heightPercentage = ((month.amount - minAmount) / (maxAmount - minAmount)) * 100;
          
          return (
            <div key={month.month} className="flex items-end justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-600 w-8">{month.month}</span>
                <div className="w-32 bg-gray-200 rounded-full h-6 flex items-end">
                  <div
                    className="bg-blue-500 rounded-full h-full transition-all duration-300"
                    style={{ width: `${heightPercentage}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(month.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Insights into your spending patterns and financial trends</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Spending"
          value={mockAnalyticsData.trends.totalSpending.current}
          change={mockAnalyticsData.trends.totalSpending.change}
          icon={CurrencyDollarIcon}
          format="currency"
        />
        
        <MetricCard
          title="Avg Transaction"
          value={mockAnalyticsData.trends.avgTransaction.current}
          change={mockAnalyticsData.trends.avgTransaction.change}
          icon={ChartBarIcon}
          format="currency"
        />
        
        <MetricCard
          title="Transactions"
          value={mockAnalyticsData.trends.transactionCount.current}
          change={mockAnalyticsData.trends.transactionCount.change}
          icon={ChartPieIcon}
          format="number"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart />
        <SpendingTrendChart />
      </div>

      {/* Additional Insights */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Spending Increase</p>
              <p className="text-sm text-gray-600">
                Your spending increased by 6.9% this month, primarily due to higher housing costs.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Category Trends</p>
              <p className="text-sm text-gray-600">
                Housing remains your largest expense category at 38.7% of total spending.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Transaction Patterns</p>
              <p className="text-sm text-gray-600">
                You made 4 fewer transactions this month, but your average transaction size increased.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
