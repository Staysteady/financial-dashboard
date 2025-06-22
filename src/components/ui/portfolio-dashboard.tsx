'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  PieChartIcon,
  BarChart3Icon,
  DollarSignIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  RefreshCwIcon
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { Investment, PortfolioSummary, InvestmentPerformance } from '@/types';
import { portfolioService } from '@/services/portfolio-service';

interface PortfolioDashboardProps {
  userId: string;
  accountId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function PortfolioDashboard({ userId, accountId }: PortfolioDashboardProps) {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [performances, setPerformances] = useState<InvestmentPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'holdings' | 'performance' | 'rebalance'>('overview');

  useEffect(() => {
    loadPortfolioData();
  }, [userId, accountId]);

  const loadPortfolioData = async () => {
    setIsLoading(true);
    try {
      // Generate mock data for demo
      const mockInvestments = portfolioService.generateMockInvestments(userId, accountId);
      const updatedInvestments = await portfolioService.updateInvestmentPrices(mockInvestments);
      const summary = await portfolioService.calculatePortfolioSummary(updatedInvestments);
      const performanceData = updatedInvestments.map(inv => portfolioService.calculateInvestmentPerformance(inv));

      setInvestments(updatedInvestments);
      setPortfolioSummary(summary);
      setPerformances(performanceData);
    } catch (error) {
      console.error('Error loading portfolio data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCwIcon className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!portfolioSummary) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No portfolio data available</p>
      </div>
    );
  }

  const diversificationChartData = Object.entries(portfolioSummary.diversification.byType).map(([type, data]) => ({
    name: type.replace('_', ' ').toUpperCase(),
    value: data.percentage,
    amount: data.value
  }));

  const performanceChartData = performances.map(perf => ({
    name: perf.investment.symbol,
    value: perf.currentValue,
    gainLoss: perf.gainLoss,
    gainLossPercentage: perf.gainLossPercentage
  }));

  const rebalancingSuggestions = portfolioService.calculateRebalancingSuggestions(investments, {
    stock: 60,
    etf: 25,
    bond: 10,
    crypto: 5
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Investment Portfolio</h2>
        <button
          onClick={loadPortfolioData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCwIcon className="h-4 w-4" />
          Refresh Prices
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: PieChartIcon },
            { id: 'holdings', name: 'Holdings', icon: BarChart3Icon },
            { id: 'performance', name: 'Performance', icon: TrendingUpIcon },
            { id: 'rebalance', name: 'Rebalance', icon: DollarSignIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Summary Cards */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(portfolioSummary.totalValue)}</div>
              <div className={`flex items-center text-sm ${
                portfolioSummary.dayChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {portfolioSummary.dayChange >= 0 ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                {formatCurrency(Math.abs(portfolioSummary.dayChange))} ({formatPercentage(portfolioSummary.dayChangePercentage)})
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Gain/Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                portfolioSummary.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(portfolioSummary.totalGainLoss)}
              </div>
              <div className={`text-sm ${
                portfolioSummary.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercentage(portfolioSummary.totalGainLossPercentage)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cost Basis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(portfolioSummary.totalCost)}</div>
              <div className="text-sm text-gray-500">Original Investment</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{investments.length}</div>
              <div className="text-sm text-gray-500">Total Positions</div>
            </CardContent>
          </Card>

          {/* Diversification Chart */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Portfolio Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={diversificationChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {diversificationChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance Chart */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Holdings Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'gainLossPercentage' ? `${value.toFixed(2)}%` : formatCurrency(value),
                      name === 'gainLoss' ? 'Gain/Loss' : name === 'gainLossPercentage' ? 'Return %' : 'Value'
                    ]}
                  />
                  <Bar dataKey="gainLossPercentage" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Holdings Tab */}
      {selectedTab === 'holdings' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Investment Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Symbol</th>
                      <th className="text-left py-2">Name</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-right py-2">Quantity</th>
                      <th className="text-right py-2">Current Price</th>
                      <th className="text-right py-2">Market Value</th>
                      <th className="text-right py-2">Gain/Loss</th>
                      <th className="text-right py-2">Return %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performances.map((perf, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 font-medium">{perf.investment.symbol}</td>
                        <td className="py-3">{perf.investment.name}</td>
                        <td className="py-3 capitalize">{perf.investment.type.replace('_', ' ')}</td>
                        <td className="py-3 text-right">{perf.investment.quantity}</td>
                        <td className="py-3 text-right">{formatCurrency(perf.investment.current_price)}</td>
                        <td className="py-3 text-right font-medium">{formatCurrency(perf.currentValue)}</td>
                        <td className={`py-3 text-right font-medium ${
                          perf.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(perf.gainLoss)}
                        </td>
                        <td className={`py-3 text-right font-medium ${
                          perf.gainLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPercentage(perf.gainLossPercentage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Tab */}
      {selectedTab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {portfolioSummary.topPerformers.slice(0, 5).map((investment, index) => {
                  const perf = performances.find(p => p.investment.id === investment.id);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium">{investment.symbol}</div>
                        <div className="text-sm text-gray-600">{investment.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          {perf ? formatPercentage(perf.gainLossPercentage) : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {perf ? formatCurrency(perf.gainLoss) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Worst Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {portfolioSummary.worstPerformers.slice(0, 5).map((investment, index) => {
                  const perf = performances.find(p => p.investment.id === investment.id);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <div className="font-medium">{investment.symbol}</div>
                        <div className="text-sm text-gray-600">{investment.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          {perf ? formatPercentage(perf.gainLossPercentage) : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {perf ? formatCurrency(perf.gainLoss) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rebalance Tab */}
      {selectedTab === 'rebalance' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rebalancing Suggestions</CardTitle>
              <p className="text-sm text-gray-600">
                Based on target allocation: 60% Stocks, 25% ETFs, 10% Bonds, 5% Crypto
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rebalancingSuggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium capitalize">{suggestion.type.replace('_', ' ')}</div>
                      <div className="text-sm text-gray-600">
                        Current: {suggestion.current.toFixed(1)}% | Target: {suggestion.target.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${
                        suggestion.action === 'Buy' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {suggestion.action} {formatCurrency(suggestion.amount)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {Math.abs(suggestion.current - suggestion.target).toFixed(1)}% off target
                      </div>
                    </div>
                  </div>
                ))}
                {rebalancingSuggestions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Your portfolio is well-balanced! No rebalancing needed.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}