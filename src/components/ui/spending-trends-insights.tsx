'use client';

import { useState, useMemo } from 'react';
import {
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  CalendarIcon,
  CurrencyPoundIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  InformationCircleIcon,
  StarIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
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

interface TrendAnalysis {
  period: string;
  totalSpending: number;
  totalIncome: number;
  netAmount: number;
  transactionCount: number;
  averageTransaction: number;
  categories: { [category: string]: number };
  weekdaySpending: number;
  weekendSpending: number;
  recurringAmount: number;
  oneTimeAmount: number;
}

interface SpendingInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'prediction' | 'opportunity' | 'warning' | 'achievement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
  impact: {
    financial?: number;
    timeframe?: string;
    category?: string;
  };
  confidence: number; // 0-100
  trend?: {
    direction: 'up' | 'down' | 'stable';
    magnitude: number; // percentage change
    period: string;
  };
  metadata: {
    generatedAt: string;
    dataPoints: number;
    accuracy?: number;
  };
}

interface SpendingTrendsInsightsProps {
  transactions: Transaction[];
  timeframe: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  onTimeframeChange?: (timeframe: 'weekly' | 'monthly' | 'quarterly' | 'yearly') => void;
}

const formatCurrency = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
};

const CHART_COLORS = {
  spending: '#ef4444',
  income: '#10b981',
  net: '#3b82f6',
  trend: '#8b5cf6',
  prediction: '#f59e0b',
  categories: [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
  ]
};

export function SpendingTrendsInsights({ 
  transactions, 
  timeframe, 
  onTimeframeChange 
}: SpendingTrendsInsightsProps) {
  const [selectedInsightType, setSelectedInsightType] = useState<string>('all');
  const [showPredictions, setShowPredictions] = useState(true);
  const [viewMode, setViewMode] = useState<'trends' | 'insights' | 'predictions'>('trends');

  const { trendData, insights, predictions, summary } = useMemo(() => {
    // Group transactions by time period
    const groupByPeriod = (transactions: Transaction[], timeframe: string) => {
      const groups = new Map<string, Transaction[]>();
      
      transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        let key: string;
        
        switch (timeframe) {
          case 'weekly':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
            break;
          case 'monthly':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          case 'quarterly':
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            key = `${date.getFullYear()}-Q${quarter}`;
            break;
          case 'yearly':
            key = date.getFullYear().toString();
            break;
          default:
            key = date.toISOString().split('T')[0];
        }
        
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(transaction);
      });
      
      return groups;
    };

    const periodGroups = groupByPeriod(transactions, timeframe);
    
    // Generate trend analysis
    const trendAnalysis: TrendAnalysis[] = Array.from(periodGroups.entries())
      .map(([period, transactions]) => {
        const expenses = transactions.filter(t => t.type === 'expense');
        const income = transactions.filter(t => t.type === 'income');
        
        const totalSpending = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalIncome = income.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        const categories: { [category: string]: number } = {};
        expenses.forEach(t => {
          categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount);
        });

        // Weekend vs weekday analysis
        const weekendTransactions = expenses.filter(t => {
          const day = new Date(t.date).getDay();
          return day === 0 || day === 6;
        });
        const weekdayTransactions = expenses.filter(t => {
          const day = new Date(t.date).getDay();
          return day >= 1 && day <= 5;
        });

        const weekendSpending = weekendTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const weekdaySpending = weekdayTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

        // Recurring vs one-time
        const recurringTransactions = expenses.filter(t => t.isRecurring);
        const oneTimeTransactions = expenses.filter(t => !t.isRecurring);

        return {
          period,
          totalSpending,
          totalIncome,
          netAmount: totalIncome - totalSpending,
          transactionCount: transactions.length,
          averageTransaction: totalSpending / Math.max(1, expenses.length),
          categories,
          weekdaySpending,
          weekendSpending,
          recurringAmount: recurringTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
          oneTimeAmount: oneTimeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));

    // Generate insights
    const generateInsights = (data: TrendAnalysis[]): SpendingInsight[] => {
      const insights: SpendingInsight[] = [];
      
      if (data.length < 2) return insights;

      // Spending trend analysis
      const recentSpending = data.slice(-3).map(d => d.totalSpending);
      const earlierSpending = data.slice(-6, -3).map(d => d.totalSpending);
      
      if (recentSpending.length >= 2 && earlierSpending.length >= 2) {
        const recentAvg = recentSpending.reduce((sum, val) => sum + val, 0) / recentSpending.length;
        const earlierAvg = earlierSpending.reduce((sum, val) => sum + val, 0) / earlierSpending.length;
        const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;

        if (Math.abs(change) > 10) {
          insights.push({
            id: 'spending-trend',
            type: 'trend',
            severity: Math.abs(change) > 30 ? 'high' : 'medium',
            title: `Spending ${change > 0 ? 'increased' : 'decreased'} significantly`,
            description: `Your spending has ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% in recent ${timeframe}s`,
            recommendation: change > 0 
              ? 'Review your recent expenses and consider creating a stricter budget'
              : 'Great progress! Continue monitoring to maintain this downward trend',
            impact: {
              financial: Math.abs(recentAvg - earlierAvg),
              timeframe: `per ${timeframe}`,
            },
            confidence: 85,
            trend: {
              direction: change > 0 ? 'up' : 'down',
              magnitude: Math.abs(change),
              period: timeframe
            },
            metadata: {
              generatedAt: new Date().toISOString(),
              dataPoints: recentSpending.length + earlierSpending.length,
              accuracy: 85
            }
          });
        }
      }

      // Category analysis
      const latestData = data[data.length - 1];
      if (latestData && data.length > 1) {
        const previousData = data[data.length - 2];
        
        Object.entries(latestData.categories).forEach(([category, amount]) => {
          const previousAmount = previousData.categories[category] || 0;
          if (previousAmount > 0) {
            const categoryChange = ((amount - previousAmount) / previousAmount) * 100;
            
            if (Math.abs(categoryChange) > 25 && amount > 100) {
              insights.push({
                id: `category-change-${category}`,
                type: categoryChange > 0 ? 'warning' : 'achievement',
                severity: Math.abs(categoryChange) > 50 ? 'high' : 'medium',
                title: `${category} spending ${categoryChange > 0 ? 'spike' : 'reduction'}`,
                description: `Your ${category} spending ${categoryChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(categoryChange).toFixed(1)}%`,
                recommendation: categoryChange > 0 
                  ? `Review your ${category} expenses and consider setting a budget limit`
                  : `Excellent reduction in ${category} spending! Keep up the good work`,
                impact: {
                  financial: Math.abs(amount - previousAmount),
                  category,
                  timeframe: timeframe
                },
                confidence: 75,
                trend: {
                  direction: categoryChange > 0 ? 'up' : 'down',
                  magnitude: Math.abs(categoryChange),
                  period: timeframe
                },
                metadata: {
                  generatedAt: new Date().toISOString(),
                  dataPoints: 2
                }
              });
            }
          }
        });
      }

      // Weekend vs weekday spending
      if (latestData) {
        const weekendRatio = latestData.weekendSpending / (latestData.weekendSpending + latestData.weekdaySpending);
        if (weekendRatio > 0.4) { // More than 40% on weekends
          insights.push({
            id: 'weekend-spending',
            type: 'opportunity',
            severity: 'medium',
            title: 'High weekend spending detected',
            description: `${(weekendRatio * 100).toFixed(1)}% of your spending occurs on weekends`,
            recommendation: 'Consider planning weekend activities with a set budget to control impulse purchases',
            impact: {
              financial: latestData.weekendSpending,
              timeframe: timeframe
            },
            confidence: 70,
            metadata: {
              generatedAt: new Date().toISOString(),
              dataPoints: 1
            }
          });
        }
      }

      // Recurring vs one-time spending balance
      if (latestData) {
        const recurringRatio = latestData.recurringAmount / latestData.totalSpending;
        if (recurringRatio < 0.3) { // Less than 30% recurring
          insights.push({
            id: 'irregular-spending',
            type: 'warning',
            severity: 'medium',
            title: 'High variable spending detected',
            description: `Only ${(recurringRatio * 100).toFixed(1)}% of your spending is from regular, predictable expenses`,
            recommendation: 'Consider setting up more regular budgets and reducing discretionary spending',
            impact: {
              financial: latestData.oneTimeAmount,
              timeframe: timeframe
            },
            confidence: 80,
            metadata: {
              generatedAt: new Date().toISOString(),
              dataPoints: 1
            }
          });
        }
      }

      // Income stability analysis
      const incomeData = data.slice(-6).map(d => d.totalIncome).filter(income => income > 0);
      if (incomeData.length >= 3) {
        const incomeAvg = incomeData.reduce((sum, val) => sum + val, 0) / incomeData.length;
        const incomeVariance = incomeData.reduce((sum, val) => sum + Math.pow(val - incomeAvg, 2), 0) / incomeData.length;
        const incomeStdDev = Math.sqrt(incomeVariance);
        const coefficientOfVariation = incomeStdDev / incomeAvg;

        if (coefficientOfVariation > 0.3) {
          insights.push({
            id: 'income-volatility',
            type: 'warning',
            severity: 'high',
            title: 'Income volatility detected',
            description: `Your income varies significantly between ${timeframe}s`,
            recommendation: 'Consider building a larger emergency fund to handle income fluctuations',
            impact: {
              financial: incomeStdDev,
              timeframe: timeframe
            },
            confidence: 85,
            metadata: {
              generatedAt: new Date().toISOString(),
              dataPoints: incomeData.length
            }
          });
        }
      }

      // Savings rate analysis
      if (latestData && latestData.totalIncome > 0) {
        const savingsRate = ((latestData.totalIncome - latestData.totalSpending) / latestData.totalIncome) * 100;
        
        if (savingsRate < 10) {
          insights.push({
            id: 'low-savings-rate',
            type: 'warning',
            severity: savingsRate < 0 ? 'critical' : 'high',
            title: savingsRate < 0 ? 'Spending exceeds income' : 'Low savings rate',
            description: `Your savings rate is ${savingsRate.toFixed(1)}%, ${savingsRate < 0 ? 'meaning you\'re spending more than you earn' : 'which is below the recommended 20%'}`,
            recommendation: savingsRate < 0 
              ? 'Immediate action needed: reduce expenses or increase income to avoid debt'
              : 'Try to reduce expenses or increase income to save at least 20% of your income',
            impact: {
              financial: Math.abs(latestData.netAmount),
              timeframe: timeframe
            },
            confidence: 95,
            metadata: {
              generatedAt: new Date().toISOString(),
              dataPoints: 1
            }
          });
        } else if (savingsRate > 30) {
          insights.push({
            id: 'high-savings-rate',
            type: 'achievement',
            severity: 'low',
            title: 'Excellent savings rate',
            description: `Your savings rate of ${savingsRate.toFixed(1)}% is outstanding!`,
            recommendation: 'Consider investing your surplus savings for long-term wealth building',
            impact: {
              financial: latestData.netAmount,
              timeframe: timeframe
            },
            confidence: 95,
            metadata: {
              generatedAt: new Date().toISOString(),
              dataPoints: 1
            }
          });
        }
      }

      return insights.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
    };

    // Generate predictions
    const generatePredictions = (data: TrendAnalysis[]): Array<{
      period: string;
      predictedSpending: number;
      predictedIncome: number;
      confidence: number;
      trend: 'up' | 'down' | 'stable';
    }> => {
      if (data.length < 3) return [];

      const predictions = [];
      const recentData = data.slice(-6); // Use last 6 periods for prediction

      // Simple linear regression for spending
      const spendingValues = recentData.map(d => d.totalSpending);
      const incomeValues = recentData.map(d => d.totalIncome);

      // Calculate trend for spending
      const spendingSlope = calculateSlope(spendingValues);
      const incomeSlope = calculateSlope(incomeValues);

      // Generate next 3 periods predictions
      for (let i = 1; i <= 3; i++) {
        const lastSpending = spendingValues[spendingValues.length - 1];
        const lastIncome = incomeValues[incomeValues.length - 1];

        const predictedSpending = Math.max(0, lastSpending + (spendingSlope * i));
        const predictedIncome = Math.max(0, lastIncome + (incomeSlope * i));

        let confidence = 80 - (i * 15); // Confidence decreases for further predictions
        confidence = Math.max(40, confidence);

        const spendingTrend = spendingSlope > 5 ? 'up' : spendingSlope < -5 ? 'down' : 'stable';

        predictions.push({
          period: `Future ${i}`,
          predictedSpending,
          predictedIncome,
          confidence,
          trend: spendingTrend
        });
      }

      return predictions;
    };

    const calculateSlope = (values: number[]): number => {
      const n = values.length;
      const indices = Array.from({ length: n }, (_, i) => i);
      
      const sumX = indices.reduce((sum, x) => sum + x, 0);
      const sumY = values.reduce((sum, y) => sum + y, 0);
      const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
      const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
      
      return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    };

    const insights = generateInsights(trendAnalysis);
    const predictions = generatePredictions(trendAnalysis);

    // Summary statistics
    const summary = {
      totalPeriods: trendAnalysis.length,
      avgSpending: trendAnalysis.reduce((sum, d) => sum + d.totalSpending, 0) / trendAnalysis.length,
      avgIncome: trendAnalysis.reduce((sum, d) => sum + d.totalIncome, 0) / trendAnalysis.length,
      overallTrend: trendAnalysis.length > 1 
        ? (trendAnalysis[trendAnalysis.length - 1].totalSpending > trendAnalysis[0].totalSpending ? 'increasing' : 'decreasing')
        : 'stable',
      totalInsights: insights.length,
      criticalInsights: insights.filter(i => i.severity === 'critical').length,
      highInsights: insights.filter(i => i.severity === 'high').length
    };

    return {
      trendData: trendAnalysis,
      insights,
      predictions,
      summary
    };
  }, [transactions, timeframe]);

  const getInsightIcon = (type: SpendingInsight['type']) => {
    switch (type) {
      case 'trend':
        return <TrendingUpIcon className="h-5 w-5" />;
      case 'anomaly':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'prediction':
        return <ClockIcon className="h-5 w-5" />;
      case 'opportunity':
        return <LightBulbIcon className="h-5 w-5" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'achievement':
        return <CheckCircleIcon className="h-5 w-5" />;
      default:
        return <InformationCircleIcon className="h-5 w-5" />;
    }
  };

  const getInsightColor = (type: SpendingInsight['type'], severity: SpendingInsight['severity']) => {
    if (severity === 'critical') return 'text-red-600 bg-red-50 border-red-200';
    
    switch (type) {
      case 'warning':
      case 'anomaly':
        return severity === 'high' ? 'text-red-600 bg-red-50 border-red-200' : 'text-orange-600 bg-orange-50 border-orange-200';
      case 'achievement':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'opportunity':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'prediction':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredInsights = useMemo(() => {
    if (selectedInsightType === 'all') return insights;
    return insights.filter(insight => insight.type === selectedInsightType);
  }, [insights, selectedInsightType]);

  const chartData = useMemo(() => {
    const baseData = trendData.map(d => ({
      period: d.period,
      spending: d.totalSpending,
      income: d.totalIncome,
      net: d.netAmount,
      transactions: d.transactionCount,
      average: d.averageTransaction
    }));

    if (showPredictions && predictions.length > 0) {
      return [
        ...baseData,
        ...predictions.map(p => ({
          period: p.period,
          spending: p.predictedSpending,
          income: p.predictedIncome,
          net: p.predictedIncome - p.predictedSpending,
          transactions: 0,
          average: 0,
          isPrediction: true,
          confidence: p.confidence
        }))
      ];
    }

    return baseData;
  }, [trendData, predictions, showPredictions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Spending Trends & Insights</h1>
          <p className="text-sm text-gray-600 mt-1">
            Analyze patterns and get personalized recommendations
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={timeframe}
            onChange={(e) => onTimeframeChange?.(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Time Periods</p>
              <p className="text-xl font-bold text-gray-900">{summary.totalPeriods}</p>
              <p className="text-xs text-gray-500 mt-1">Analyzed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <CurrencyPoundIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Spending</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(summary.avgSpending)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Per {timeframe.slice(0, -2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={cn(
              "p-2 rounded-lg",
              summary.overallTrend === 'increasing' ? "bg-red-100" : "bg-green-100"
            )}>
              {summary.overallTrend === 'increasing' ? (
                <TrendingUpIcon className="h-6 w-6 text-red-600" />
              ) : (
                <TrendingDownIcon className="h-6 w-6 text-green-600" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overall Trend</p>
              <p className={cn(
                "text-xl font-bold capitalize",
                summary.overallTrend === 'increasing' ? "text-red-600" : "text-green-600"
              )}>
                {summary.overallTrend}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <LightBulbIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Insights</p>
              <p className="text-xl font-bold text-gray-900">{summary.totalInsights}</p>
              <p className="text-xs text-gray-500 mt-1">
                {summary.criticalInsights} critical, {summary.highInsights} high
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'trends', label: 'Spending Trends', icon: TrendingUpIcon },
              { id: 'insights', label: 'Smart Insights', icon: LightBulbIcon },
              { id: 'predictions', label: 'Predictions', icon: ClockIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as any)}
                className={cn(
                  "flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors",
                  viewMode === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {viewMode === 'trends' && (
            <div className="space-y-6">
              {/* Main Trend Chart */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Spending & Income Trends</h3>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={showPredictions}
                      onChange={(e) => setShowPredictions(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Show Predictions</span>
                  </label>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `£${(value / 1000).toFixed(1)}k`} />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name.includes('spending') || name.includes('income') || name.includes('net')) {
                          return formatCurrency(Number(value));
                        }
                        return value;
                      }}
                      labelFormatter={(label) => `Period: ${label}`}
                    />
                    <Legend />
                    <Bar 
                      dataKey="spending" 
                      fill={CHART_COLORS.spending} 
                      name="Spending"
                      fillOpacity={(entry: any) => entry?.isPrediction ? 0.5 : 1}
                    />
                    <Bar 
                      dataKey="income" 
                      fill={CHART_COLORS.income} 
                      name="Income"
                      fillOpacity={(entry: any) => entry?.isPrediction ? 0.5 : 1}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke={CHART_COLORS.net}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS.net, strokeWidth: 2 }}
                      name="Net Amount"
                      strokeDasharray={(entry: any) => entry?.isPrediction ? "5 5" : "0"}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Category Trends */}
              {trendData.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Spending Trends</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `£${(value / 1000).toFixed(1)}k`} />
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      <Legend />
                      {Object.keys(trendData[0]?.categories || {}).slice(0, 5).map((category, index) => (
                        <Area
                          key={category}
                          type="monotone"
                          dataKey={(data: any) => data.categories[category] || 0}
                          stackId="1"
                          stroke={CHART_COLORS.categories[index]}
                          fill={CHART_COLORS.categories[index]}
                          name={category}
                          fillOpacity={0.6}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {viewMode === 'insights' && (
            <div className="space-y-6">
              {/* Insight Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Filter by type:</span>
                {['all', 'trend', 'warning', 'opportunity', 'achievement', 'anomaly'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedInsightType(type)}
                    className={cn(
                      "px-3 py-1 text-sm rounded-full border transition-colors capitalize",
                      selectedInsightType === type
                        ? "bg-blue-100 text-blue-700 border-blue-300"
                        : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Insights List */}
              <div className="space-y-4">
                {filteredInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className={cn(
                      "border rounded-lg p-6 transition-all",
                      getInsightColor(insight.type, insight.severity)
                    )}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold mb-2">{insight.title}</h3>
                            <p className="text-sm mb-3">{insight.description}</p>
                            {insight.recommendation && (
                              <div className="bg-white/50 rounded-lg p-3 mb-3">
                                <p className="text-sm font-medium">💡 Recommendation:</p>
                                <p className="text-sm mt-1">{insight.recommendation}</p>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/70">
                              {insight.confidence}% confidence
                            </span>
                            {insight.trend && (
                              <div className="mt-2 flex items-center space-x-1">
                                {insight.trend.direction === 'up' ? (
                                  <ArrowUpIcon className="h-4 w-4" />
                                ) : insight.trend.direction === 'down' ? (
                                  <ArrowDownIcon className="h-4 w-4" />
                                ) : (
                                  <ArrowRightIcon className="h-4 w-4" />
                                )}
                                <span className="text-xs">{insight.trend.magnitude.toFixed(1)}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {insight.impact && (
                          <div className="flex flex-wrap items-center gap-4 text-xs text-black/70 mt-3">
                            {insight.impact.financial && (
                              <span>💰 Impact: {formatCurrency(insight.impact.financial)}</span>
                            )}
                            {insight.impact.category && (
                              <span>📂 Category: {insight.impact.category}</span>
                            )}
                            {insight.impact.timeframe && (
                              <span>⏱️ Timeframe: {insight.impact.timeframe}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredInsights.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <LightBulbIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No insights available</h3>
                  <p>
                    {selectedInsightType === 'all' 
                      ? "Add more transactions to generate insights about your spending patterns."
                      : `No ${selectedInsightType} insights found. Try selecting a different filter.`}
                  </p>
                </div>
              )}
            </div>
          )}

          {viewMode === 'predictions' && (
            <div className="space-y-6">
              {/* Predictions Chart */}
              {predictions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Predictions</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={[...trendData.slice(-6), ...predictions.map((p, i) => ({
                      period: p.period,
                      totalSpending: p.predictedSpending,
                      totalIncome: p.predictedIncome,
                      confidence: p.confidence,
                      isPrediction: true
                    }))]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `£${(value / 1000).toFixed(1)}k`} />
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="totalSpending"
                        stroke={CHART_COLORS.spending}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.spending, strokeWidth: 2 }}
                        name="Actual Spending"
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="totalIncome"
                        stroke={CHART_COLORS.income}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.income, strokeWidth: 2 }}
                        name="Actual Income"
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Predictions List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Prediction Details</h3>
                {predictions.map((prediction, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{prediction.period}</h4>
                        <p className="text-sm text-gray-600">
                          Predicted spending: {formatCurrency(prediction.predictedSpending)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Predicted income: {formatCurrency(prediction.predictedIncome)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                          prediction.trend === 'up' ? "bg-red-100 text-red-800" :
                          prediction.trend === 'down' ? "bg-green-100 text-green-800" :
                          "bg-gray-100 text-gray-800"
                        )}>
                          {prediction.trend === 'up' && <TrendingUpIcon className="h-3 w-3 mr-1" />}
                          {prediction.trend === 'down' && <TrendingDownIcon className="h-3 w-3 mr-1" />}
                          {prediction.trend === 'stable' && <ArrowRightIcon className="h-3 w-3 mr-1" />}
                          {prediction.trend}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {prediction.confidence}% confidence
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {predictions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ClockIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No predictions available</h3>
                  <p>Add more transaction history to generate spending predictions.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}