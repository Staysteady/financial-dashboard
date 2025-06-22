'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  Legend
} from 'recharts';
import { 
  FinancialProjectionsEngine, 
  AdvancedProjectionScenario, 
  ProjectionResult,
  MonteCarloConfig 
} from '@/services/financial-projections';
import { calculateEnhancedFinancialRunway } from '@/utils/financial-calculations';
import { Transaction, Account, FinancialGoal } from '@/types';
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CurrencyPoundIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface FinancialProjectionsProps {
  accounts: Account[];
  transactions: Transaction[];
  goals?: FinancialGoal[];
  className?: string;
}

interface ScenarioConfig {
  name: string;
  incomeMultiplier: number;
  expenseMultiplier: number;
  duration: number;
  description: string;
  enabled: boolean;
}

const defaultScenarios: ScenarioConfig[] = [
  {
    name: 'Current Trajectory',
    incomeMultiplier: 1.0,
    expenseMultiplier: 1.0,
    duration: 24,
    description: 'Continue current income and spending patterns',
    enabled: true
  },
  {
    name: 'Economic Downturn',
    incomeMultiplier: 0.7,
    expenseMultiplier: 1.1,
    duration: 18,
    description: '30% income reduction, 10% expense increase',
    enabled: true
  },
  {
    name: 'Job Loss',
    incomeMultiplier: 0.2,
    expenseMultiplier: 0.8,
    duration: 12,
    description: 'Emergency benefits only, reduced spending',
    enabled: true
  },
  {
    name: 'Aggressive Savings',
    incomeMultiplier: 1.0,
    expenseMultiplier: 0.7,
    duration: 36,
    description: 'Same income, 30% expense reduction',
    enabled: true
  },
  {
    name: 'Income Growth',
    incomeMultiplier: 1.3,
    expenseMultiplier: 1.05,
    duration: 24,
    description: '30% income increase, slight lifestyle inflation',
    enabled: false
  }
];

export function FinancialProjections({ 
  accounts, 
  transactions, 
  goals = [],
  className = '' 
}: FinancialProjectionsProps) {
  const [projectionResults, setProjectionResults] = useState<ProjectionResult[]>([]);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>(['Current Trajectory', 'Economic Downturn']);
  const [runwayData, setRunwayData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'table' | 'runway'>('chart');

  useEffect(() => {
    generateProjections();
    calculateRunwayData();
  }, [accounts, transactions, selectedScenarios]);

  const generateProjections = async () => {
    if (!accounts.length || !transactions.length) return;
    
    setLoading(true);
    try {
      const engine = new FinancialProjectionsEngine(transactions, accounts);
      
      // Calculate baseline metrics
      const currentBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
      const avgIncome = calculateAverageTransactionAmount(transactions, 'income');
      const avgExpenses = calculateAverageTransactionAmount(transactions, 'expense');

      // Generate scenarios
      const scenarios: AdvancedProjectionScenario[] = defaultScenarios
        .filter(config => selectedScenarios.includes(config.name))
        .map(config => ({
          name: config.name,
          monthlyIncome: avgIncome * config.incomeMultiplier,
          monthlyExpenses: avgExpenses * config.expenseMultiplier,
          projectedMonths: config.duration,
          endBalance: 0,
          variability: config.name === 'Economic Downturn' ? 0.25 : 0.15
        }));

      const results = engine.generateAdvancedProjections(scenarios);
      setProjectionResults(results);

    } catch (error) {
      console.error('Error generating projections:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRunwayData = () => {
    if (!accounts.length || !transactions.length) return;
    
    const runway = calculateEnhancedFinancialRunway(accounts, transactions);
    setRunwayData(runway);
  };

  const calculateAverageTransactionAmount = (transactions: Transaction[], type: 'income' | 'expense'): number => {
    const filteredTxns = transactions.filter(t => t.type === type);
    const total = filteredTxns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return filteredTxns.length > 0 ? total / filteredTxns.length : 0;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatMonths = (months: number): string => {
    if (months === Infinity) return 'Indefinite';
    if (months < 1) return `${Math.round(months * 30)} days`;
    if (months < 12) return `${Math.round(months)} months`;
    const years = Math.floor(months / 12);
    const remainingMonths = Math.round(months % 12);
    return `${years}y ${remainingMonths}m`;
  };

  const getRunwayStatusColor = (months: number): string => {
    if (months < 3) return 'text-red-600';
    if (months < 6) return 'text-orange-600';
    if (months < 12) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRunwayStatusIcon = (months: number) => {
    if (months < 6) return <ExclamationTriangleIcon className="h-5 w-5" />;
    if (months < 12) return <InformationCircleIcon className="h-5 w-5" />;
    return <ArrowTrendingUpIcon className="h-5 w-5" />;
  };

  const chartData = projectionResults.length > 0 
    ? projectionResults[0].projections.map((projection, index) => {
        const dataPoint: any = {
          month: projection.month,
          date: projection.date
        };
        
        projectionResults.forEach(result => {
          dataPoint[result.scenario] = result.projections[index]?.balance || 0;
        });
        
        return dataPoint;
      })
    : [];

  const scenarioColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red  
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#8B5CF6'  // Violet
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            Financial Projections & Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* View Mode Selector */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'chart' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('chart')}
              >
                Chart View
              </Button>
              <Button
                variant={viewMode === 'runway' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('runway')}
              >
                Runway Analysis
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Data Table
              </Button>
            </div>

            {/* Scenario Selector */}
            <div>
              <h4 className="font-medium mb-2">Select Scenarios to Compare:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {defaultScenarios.map((scenario) => (
                  <label key={scenario.name} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedScenarios.includes(scenario.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedScenarios([...selectedScenarios, scenario.name]);
                        } else {
                          setSelectedScenarios(selectedScenarios.filter(s => s !== scenario.name));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="truncate" title={scenario.description}>
                      {scenario.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Runway Summary */}
      {runwayData && viewMode === 'runway' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Runway</p>
                  <p className={`text-2xl font-bold ${getRunwayStatusColor(runwayData.baselineRunway)}`}>
                    {formatMonths(runwayData.baselineRunway)}
                  </p>
                </div>
                {getRunwayStatusIcon(runwayData.baselineRunway)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Conservative</p>
                  <p className={`text-2xl font-bold ${getRunwayStatusColor(runwayData.conservativeRunway)}`}>
                    {formatMonths(runwayData.conservativeRunway)}
                  </p>
                </div>
                <ArrowTrendingDownIcon className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Balance</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(runwayData.totalBalance)}
                  </p>
                </div>
                <CurrencyPoundIcon className="h-5 w-5 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Emergency Fund</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(runwayData.emergencyFund)}
                  </p>
                </div>
                <CalendarIcon className="h-5 w-5 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {runwayData?.recommendations && viewMode === 'runway' && (
        <Card>
          <CardHeader>
            <CardTitle>Financial Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {runwayData.recommendations.map((recommendation: string, index: number) => (
                <div 
                  key={index}
                  className={`flex items-start gap-2 p-3 rounded-lg ${
                    recommendation.includes('URGENT') 
                      ? 'bg-red-50 border border-red-200'
                      : recommendation.includes('WARNING')
                      ? 'bg-orange-50 border border-orange-200'  
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  {recommendation.includes('URGENT') && <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />}
                  {recommendation.includes('WARNING') && <InformationCircleIcon className="h-5 w-5 text-orange-500 mt-0.5" />}
                  {!recommendation.includes('URGENT') && !recommendation.includes('WARNING') && 
                    <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                  }
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projections Chart */}
      {viewMode === 'chart' && (
        <Card>
          <CardHeader>
            <CardTitle>Balance Projections Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      tickMargin={8}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), '']}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="2 2" />
                    <Legend />
                    {selectedScenarios.map((scenario, index) => (
                      <Line
                        key={scenario}
                        type="monotone"
                        dataKey={scenario}
                        stroke={scenarioColors[index % scenarioColors.length]}
                        strokeWidth={2}
                        dot={false}
                        name={scenario}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No projection data available. Please check your account and transaction data.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {viewMode === 'table' && projectionResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Projection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Scenario</th>
                    <th className="text-right p-2">End Balance</th>
                    <th className="text-right p-2">Min Balance</th>
                    <th className="text-right p-2">Avg Monthly Flow</th>
                    <th className="text-right p-2">Months to Depletion</th>
                    <th className="text-right p-2">Success Probability</th>
                  </tr>
                </thead>
                <tbody>
                  {projectionResults.map((result, index) => (
                    <tr key={result.scenario} className="border-b">
                      <td className="p-2 font-medium">{result.scenario}</td>
                      <td className={`p-2 text-right font-mono ${result.summary.endBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(result.summary.endBalance)}
                      </td>
                      <td className={`p-2 text-right font-mono ${result.summary.minimumBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(result.summary.minimumBalance)}
                      </td>
                      <td className={`p-2 text-right font-mono ${result.summary.averageMonthlyNetFlow < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(result.summary.averageMonthlyNetFlow)}
                      </td>
                      <td className="p-2 text-right">
                        {result.summary.monthsToDepletion ? `${result.summary.monthsToDepletion} months` : 'Never'}
                      </td>
                      <td className={`p-2 text-right ${result.riskMetrics.probabilityOfSuccess > 0.7 ? 'text-green-600' : result.riskMetrics.probabilityOfSuccess > 0.4 ? 'text-orange-600' : 'text-red-600'}`}>
                        {Math.round(result.riskMetrics.probabilityOfSuccess * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}