'use client';

import { useState, useMemo } from 'react';
import {
  MapPinIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyPoundIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StarIcon,
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
  ScatterChart,
  Scatter,
  ComposedChart,
  Area,
  AreaChart
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

interface MerchantAnalysis {
  merchant: string;
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  category: string;
  firstTransaction: string;
  lastTransaction: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'irregular';
  trend: 'increasing' | 'decreasing' | 'stable';
  locations: string[];
  monthlySpending: { [month: string]: number };
  riskScore: number; // 0-100, based on frequency and amount changes
  isRecurring: boolean;
}

interface LocationAnalysis {
  location: string;
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  merchants: string[];
  categories: { [category: string]: number };
  visitFrequency: number; // visits per month
  spendingPattern: 'consistent' | 'variable' | 'seasonal';
  popularTimes: { [timeFrame: string]: number };
  proximityScore: number; // 0-100, how close to other frequent locations
}

interface MerchantLocationAnalysisProps {
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

export function MerchantLocationAnalysis({ 
  transactions, 
  dateRange, 
  onDateRangeChange 
}: MerchantLocationAnalysisProps) {
  const [activeTab, setActiveTab] = useState<'merchants' | 'locations' | 'insights'>('merchants');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'amount' | 'frequency' | 'average' | 'recent'>('amount');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const { merchantAnalysis, locationAnalysis, insights, filteredTransactions } = useMemo(() => {
    const { start, end } = getDateRange(dateRange);
    
    const filtered = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= start && transactionDate <= end && t.type === 'expense';
    });

    // Merchant Analysis
    const merchantMap = new Map<string, {
      transactions: Transaction[];
      totalSpent: number;
      monthlySpending: { [month: string]: number };
    }>();

    filtered.forEach(transaction => {
      if (!transaction.merchant) return;
      
      const merchant = transaction.merchant;
      if (!merchantMap.has(merchant)) {
        merchantMap.set(merchant, {
          transactions: [],
          totalSpent: 0,
          monthlySpending: {}
        });
      }

      const data = merchantMap.get(merchant)!;
      data.transactions.push(transaction);
      data.totalSpent += Math.abs(transaction.amount);
      
      const monthKey = new Date(transaction.date).toISOString().slice(0, 7);
      data.monthlySpending[monthKey] = (data.monthlySpending[monthKey] || 0) + Math.abs(transaction.amount);
    });

    const merchants: MerchantAnalysis[] = Array.from(merchantMap.entries()).map(([merchant, data]) => {
      const transactions = data.transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const amounts = transactions.map(t => Math.abs(t.amount));
      const dates = transactions.map(t => new Date(t.date));
      
      // Calculate frequency
      let frequency: MerchantAnalysis['frequency'] = 'irregular';
      if (dates.length > 1) {
        const daysBetween = (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24);
        const avgDaysBetween = daysBetween / (dates.length - 1);
        
        if (avgDaysBetween <= 3) frequency = 'daily';
        else if (avgDaysBetween <= 10) frequency = 'weekly';
        else if (avgDaysBetween <= 40) frequency = 'monthly';
      }

      // Calculate trend
      let trend: MerchantAnalysis['trend'] = 'stable';
      if (amounts.length >= 3) {
        const firstHalf = amounts.slice(0, Math.floor(amounts.length / 2));
        const secondHalf = amounts.slice(Math.floor(amounts.length / 2));
        const firstAvg = firstHalf.reduce((sum, amt) => sum + amt, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, amt) => sum + amt, 0) / secondHalf.length;
        
        const change = (secondAvg - firstAvg) / firstAvg;
        if (change > 0.2) trend = 'increasing';
        else if (change < -0.2) trend = 'decreasing';
      }

      // Calculate risk score
      let riskScore = 0;
      if (frequency === 'daily') riskScore += 30;
      else if (frequency === 'weekly') riskScore += 20;
      else if (frequency === 'monthly') riskScore += 10;
      
      if (trend === 'increasing') riskScore += 40;
      else if (trend === 'decreasing') riskScore -= 20;
      
      const avgTransaction = data.totalSpent / transactions.length;
      if (avgTransaction > 100) riskScore += 20;
      else if (avgTransaction > 50) riskScore += 10;

      riskScore = Math.max(0, Math.min(100, riskScore));

      return {
        merchant,
        totalSpent: data.totalSpent,
        transactionCount: transactions.length,
        averageTransaction: avgTransaction,
        category: transactions[0].category,
        firstTransaction: transactions[0].date,
        lastTransaction: transactions[transactions.length - 1].date,
        frequency,
        trend,
        locations: Array.from(new Set(transactions.map(t => t.location).filter(Boolean))) as string[],
        monthlySpending: data.monthlySpending,
        riskScore,
        isRecurring: transactions.some(t => t.isRecurring) || frequency !== 'irregular'
      };
    });

    // Location Analysis
    const locationMap = new Map<string, {
      transactions: Transaction[];
      totalSpent: number;
      merchants: Set<string>;
      categories: { [category: string]: number };
    }>();

    filtered.forEach(transaction => {
      if (!transaction.location) return;
      
      const location = transaction.location;
      if (!locationMap.has(location)) {
        locationMap.set(location, {
          transactions: [],
          totalSpent: 0,
          merchants: new Set(),
          categories: {}
        });
      }

      const data = locationMap.get(location)!;
      data.transactions.push(transaction);
      data.totalSpent += Math.abs(transaction.amount);
      if (transaction.merchant) data.merchants.add(transaction.merchant);
      data.categories[transaction.category] = (data.categories[transaction.category] || 0) + Math.abs(transaction.amount);
    });

    const locations: LocationAnalysis[] = Array.from(locationMap.entries()).map(([location, data]) => {
      const transactions = data.transactions;
      const daySpan = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const visitFrequency = (transactions.length / daySpan) * 30; // visits per month

      // Determine spending pattern
      const monthlyAmounts = Object.values(data.categories);
      const avgAmount = monthlyAmounts.reduce((sum, amt) => sum + amt, 0) / monthlyAmounts.length;
      const variance = monthlyAmounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / monthlyAmounts.length;
      const coefficient = Math.sqrt(variance) / avgAmount;
      
      let spendingPattern: LocationAnalysis['spendingPattern'] = 'consistent';
      if (coefficient > 0.5) spendingPattern = 'variable';
      if (coefficient > 1) spendingPattern = 'seasonal';

      return {
        location,
        totalSpent: data.totalSpent,
        transactionCount: transactions.length,
        averageTransaction: data.totalSpent / transactions.length,
        merchants: Array.from(data.merchants),
        categories: data.categories,
        visitFrequency,
        spendingPattern,
        popularTimes: {}, // Would need time data to implement
        proximityScore: 50 // Would need geographical data to implement
      };
    });

    // Generate insights
    const merchantInsights: Array<{
      type: 'warning' | 'info' | 'success' | 'alert';
      title: string;
      description: string;
      value?: number;
      merchant?: string;
      location?: string;
    }> = [];

    // High-risk merchants
    const highRiskMerchants = merchants.filter(m => m.riskScore > 70);
    if (highRiskMerchants.length > 0) {
      merchantInsights.push({
        type: 'alert',
        title: 'High-risk spending detected',
        description: `${highRiskMerchants.length} merchants show concerning spending patterns`,
        value: highRiskMerchants.reduce((sum, m) => sum + m.totalSpent, 0),
        merchant: highRiskMerchants[0].merchant
      });
    }

    // Top spending merchant
    const topMerchant = merchants.sort((a, b) => b.totalSpent - a.totalSpent)[0];
    if (topMerchant) {
      merchantInsights.push({
        type: 'info',
        title: `Highest spending: ${topMerchant.merchant}`,
        description: `${formatCurrency(topMerchant.totalSpent)} across ${topMerchant.transactionCount} transactions`,
        value: topMerchant.totalSpent,
        merchant: topMerchant.merchant
      });
    }

    // Location with most variety
    const diverseLocation = locations.sort((a, b) => b.merchants.length - a.merchants.length)[0];
    if (diverseLocation && diverseLocation.merchants.length > 5) {
      merchantInsights.push({
        type: 'info',
        title: `Most diverse location: ${diverseLocation.location}`,
        description: `${diverseLocation.merchants.length} different merchants visited`,
        location: diverseLocation.location
      });
    }

    // Increasing trend merchants
    const increasingMerchants = merchants.filter(m => m.trend === 'increasing');
    if (increasingMerchants.length > 0) {
      merchantInsights.push({
        type: 'warning',
        title: 'Spending trends increasing',
        description: `${increasingMerchants.length} merchants show increasing spending patterns`,
        value: increasingMerchants.reduce((sum, m) => sum + m.totalSpent, 0)
      });
    }

    return {
      merchantAnalysis: merchants,
      locationAnalysis: locations,
      insights: merchantInsights,
      filteredTransactions: filtered
    };
  }, [transactions, dateRange]);

  const filteredMerchants = useMemo(() => {
    let filtered = merchantAnalysis.filter(merchant => {
      const matchesSearch = merchant.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           merchant.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || merchant.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.totalSpent - a.totalSpent;
        case 'frequency':
          return b.transactionCount - a.transactionCount;
        case 'average':
          return b.averageTransaction - a.averageTransaction;
        case 'recent':
          return new Date(b.lastTransaction).getTime() - new Date(a.lastTransaction).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [merchantAnalysis, searchTerm, filterCategory, sortBy]);

  const filteredLocations = useMemo(() => {
    let filtered = locationAnalysis.filter(location => {
      return location.location.toLowerCase().includes(searchTerm.toLowerCase());
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.totalSpent - a.totalSpent;
        case 'frequency':
          return b.transactionCount - a.transactionCount;
        case 'average':
          return b.averageTransaction - a.averageTransaction;
        default:
          return 0;
      }
    });

    return filtered;
  }, [locationAnalysis, searchTerm, sortBy]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(merchantAnalysis.map(m => m.category)));
    return cats.sort();
  }, [merchantAnalysis]);

  const chartData = useMemo(() => {
    if (activeTab === 'merchants') {
      return filteredMerchants.slice(0, 10).map(merchant => ({
        name: merchant.merchant.length > 15 ? merchant.merchant.slice(0, 15) + '...' : merchant.merchant,
        amount: merchant.totalSpent,
        transactions: merchant.transactionCount,
        average: merchant.averageTransaction,
        riskScore: merchant.riskScore
      }));
    } else {
      return filteredLocations.slice(0, 10).map(location => ({
        name: location.location.length > 15 ? location.location.slice(0, 15) + '...' : location.location,
        amount: location.totalSpent,
        transactions: location.transactionCount,
        merchants: location.merchants.length,
        frequency: location.visitFrequency
      }));
    }
  }, [activeTab, filteredMerchants, filteredLocations]);

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return 'text-red-600 bg-red-50 border-red-200';
    if (riskScore >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getRiskLabel = (riskScore: number) => {
    if (riskScore >= 70) return 'High Risk';
    if (riskScore >= 40) return 'Medium Risk';
    return 'Low Risk';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUpIcon className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDownIcon className="h-4 w-4 text-green-500" />;
      default:
        return <ArrowUpIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchant & Location Analysis</h1>
          <p className="text-sm text-gray-600 mt-1">
            Analyze your spending patterns by merchant and location
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
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

      {/* Insights Summary */}
      {insights.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.slice(0, 3).map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                <div className="flex-shrink-0">
                  {insight.type === 'alert' && <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />}
                  {insight.type === 'warning' && <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />}
                  {insight.type === 'info' && <ChartBarIcon className="h-5 w-5 text-blue-500" />}
                  {insight.type === 'success' && <StarIcon className="h-5 w-5 text-green-500" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{insight.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  {insight.value && (
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {formatCurrency(insight.value)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'merchants', label: 'Merchants', icon: BuildingStorefrontIcon },
              { id: 'locations', label: 'Locations', icon: MapPinIcon },
              { id: 'insights', label: 'Detailed Insights', icon: ChartBarIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab.id
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

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter (for merchants) */}
            {activeTab === 'merchants' && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            )}

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="amount">Sort by Amount</option>
              <option value="frequency">Sort by Frequency</option>
              <option value="average">Sort by Average</option>
              {activeTab === 'merchants' && <option value="recent">Sort by Recent</option>}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'merchants' && (
            <div className="space-y-6">
              {/* Chart */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Merchants by Spending</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280" 
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `£${(value / 1000).toFixed(1)}k`} />
                    <Tooltip formatter={(value: any, name: string) => {
                      if (name === 'amount') return formatCurrency(Number(value));
                      return value;
                    }} />
                    <Legend />
                    <Bar dataKey="amount" fill="#3b82f6" name="Total Spent" />
                    <Line
                      type="monotone"
                      dataKey="riskScore"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', strokeWidth: 2 }}
                      name="Risk Score"
                      yAxisId="right"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Merchant List */}
              <div className="space-y-3">
                {filteredMerchants.map((merchant) => (
                  <div key={merchant.merchant} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-gray-900">{merchant.merchant}</h3>
                          {getTrendIcon(merchant.trend)}
                          <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border",
                            getRiskColor(merchant.riskScore)
                          )}>
                            {getRiskLabel(merchant.riskScore)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{merchant.category}</p>
                        {merchant.locations.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            📍 {merchant.locations.slice(0, 2).join(', ')}
                            {merchant.locations.length > 2 && ` +${merchant.locations.length - 2} more`}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(merchant.totalSpent)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {merchant.transactionCount} transactions
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(merchant.averageTransaction)} avg
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Frequency:</span>
                        <span className="ml-2 font-medium capitalize">{merchant.frequency}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Trend:</span>
                        <span className="ml-2 font-medium capitalize">{merchant.trend}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">First:</span>
                        <span className="ml-2 font-medium">
                          {new Date(merchant.firstTransaction).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Recent:</span>
                        <span className="ml-2 font-medium">
                          {new Date(merchant.lastTransaction).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'locations' && (
            <div className="space-y-6">
              {/* Chart */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Locations by Spending</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280" 
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => `£${(value / 1000).toFixed(1)}k`} />
                    <Tooltip formatter={(value: any) => {
                      if (typeof value === 'number' && value > 1000) {
                        return formatCurrency(value);
                      }
                      return value;
                    }} />
                    <Legend />
                    <Bar dataKey="amount" fill="#10b981" name="Total Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Location List */}
              <div className="space-y-3">
                {filteredLocations.map((location) => (
                  <div key={location.location} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <MapPinIcon className="h-5 w-5 text-gray-400" />
                          <h3 className="font-semibold text-gray-900">{location.location}</h3>
                          <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            location.spendingPattern === 'consistent' ? "bg-green-100 text-green-800" :
                            location.spendingPattern === 'variable' ? "bg-orange-100 text-orange-800" :
                            "bg-blue-100 text-blue-800"
                          )}>
                            {location.spendingPattern}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {location.merchants.length} merchants • {location.transactionCount} visits
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          🏪 {location.merchants.slice(0, 3).join(', ')}
                          {location.merchants.length > 3 && ` +${location.merchants.length - 3} more`}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(location.totalSpent)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(location.averageTransaction)} avg
                        </div>
                        <div className="text-sm text-gray-500">
                          {location.visitFrequency.toFixed(1)} visits/month
                        </div>
                      </div>
                    </div>
                    
                    {/* Category Breakdown */}
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(location.categories).slice(0, 5).map(([category, amount]) => (
                          <span
                            key={category}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                          >
                            {category}: {formatCurrency(amount)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-6">
              {/* All Insights */}
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {insight.type === 'alert' && <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />}
                        {insight.type === 'warning' && <ExclamationTriangleIcon className="h-6 w-6 text-orange-500" />}
                        {insight.type === 'info' && <ChartBarIcon className="h-6 w-6 text-blue-500" />}
                        {insight.type === 'success' && <StarIcon className="h-6 w-6 text-green-500" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
                        <p className="text-gray-600 mt-1">{insight.description}</p>
                        {insight.value && (
                          <p className="text-xl font-bold text-gray-900 mt-2">
                            {formatCurrency(insight.value)}
                          </p>
                        )}
                        {(insight.merchant || insight.location) && (
                          <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                            {insight.merchant && (
                              <span className="flex items-center space-x-1">
                                <BuildingStorefrontIcon className="h-4 w-4" />
                                <span>{insight.merchant}</span>
                              </span>
                            )}
                            {insight.location && (
                              <span className="flex items-center space-x-1">
                                <MapPinIcon className="h-4 w-4" />
                                <span>{insight.location}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {insights.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ChartBarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No insights available</h3>
                  <p>Add more transactions to generate meaningful insights about your spending patterns.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}