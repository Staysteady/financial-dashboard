'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PiggyBank, 
  TrendingUp,
  Calendar,
  Target,
  Calculator,
  Lightbulb,
  DollarSign
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { RetirementPlan } from '@/types';
import { retirementService, RetirementScenario, RetirementProjection } from '@/services/retirement-service';

interface RetirementPlannerProps {
  userId: string;
}

export function RetirementPlanner({ userId }: RetirementPlannerProps) {
  const [currentAge, setCurrentAge] = useState<number>(35);
  const [retirementAge, setRetirementAge] = useState<number>(65);
  const [currentSavings, setCurrentSavings] = useState<number>(45000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(800);
  const [desiredMonthlyIncome, setDesiredMonthlyIncome] = useState<number>(3000);
  const [expectedReturn, setExpectedReturn] = useState<number>(7);
  
  const [projections, setProjections] = useState<RetirementProjection[]>([]);
  const [scenarios, setScenarios] = useState<RetirementScenario[]>([]);
  const [mockRetirementPlan, setMockRetirementPlan] = useState<RetirementPlan | null>(null);
  const [selectedTab, setSelectedTab] = useState<'planner' | 'scenarios' | 'tips'>('planner');

  useEffect(() => {
    calculateRetirement();
  }, [currentAge, retirementAge, currentSavings, monthlyContribution, expectedReturn]);

  const calculateRetirement = () => {
    const newProjections = retirementService.calculateRetirementProjection(
      currentAge,
      retirementAge,
      currentSavings,
      monthlyContribution,
      expectedReturn / 100
    );
    setProjections(newProjections);

    const newScenarios = retirementService.calculateRetirementScenarios(
      currentAge,
      currentSavings,
      retirementAge
    );
    setScenarios(newScenarios);

    const mockPlan = retirementService.generateMockRetirementPlan(userId);
    setMockRetirementPlan(mockPlan);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const finalProjection = projections[projections.length - 1];
  const retirementGoal = retirementService.calculateRetirementGoal(desiredMonthlyIncome, retirementAge);
  const requiredSavings = retirementService.calculateRequiredSavings(
    currentAge,
    retirementAge,
    retirementGoal,
    currentSavings,
    expectedReturn / 100
  );
  const safeWithdrawal = finalProjection ? 
    retirementService.calculateSafeWithdrawalRate(finalProjection.portfolioValue, retirementAge) :
    { monthlyIncome: 0, annualIncome: 0, safeWithdrawalRate: 0.04 };
  const taxAdvantages = retirementService.calculateTaxAdvantages(monthlyContribution, 0.4);

  // Format data for charts
  const chartData = projections.map(p => ({
    age: p.age,
    portfolio: p.portfolioValue,
    realValue: p.realValue,
    contributions: currentSavings + ((p.age - currentAge) * monthlyContribution * 12)
  }));

  const scenarioData = scenarios.map(s => ({
    contribution: s.monthlyContribution,
    finalValue: s.finalValue,
    monthlyIncome: s.monthlyIncome,
    totalContributions: s.totalContributions
  }));

  if (!finalProjection || !mockRetirementPlan) {
    return <div className="p-6">Loading retirement planner...</div>;
  }

  const tips = retirementService.generateRetirementTips(currentAge, monthlyContribution, currentSavings);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Retirement Planner</h2>
        <div className="text-sm text-gray-500">Plan your financial future</div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Current Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(currentSavings)}</div>
            <div className="text-sm text-gray-500">Age {currentAge}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Projected Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(finalProjection.portfolioValue)}</div>
            <div className="text-sm text-gray-500">At retirement (age {retirementAge})</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monthly Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(safeWithdrawal.monthlyIncome)}</div>
            <div className="text-sm text-gray-500">Safe withdrawal (4% rule)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Years to Retirement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{retirementAge - currentAge}</div>
            <div className="text-sm text-gray-500">Time to build wealth</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'planner', name: 'Retirement Planner', icon: Calculator },
            { id: 'scenarios', name: 'Scenarios', icon: TrendingUp },
            { id: 'tips', name: 'Planning Tips', icon: Lightbulb }
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

      {/* Planner Tab */}
      {selectedTab === 'planner' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>Retirement Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Age
                  </label>
                  <input
                    type="number"
                    value={currentAge}
                    onChange={(e) => setCurrentAge(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    min="18"
                    max="80"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retirement Age
                  </label>
                  <input
                    type="number"
                    value={retirementAge}
                    onChange={(e) => setRetirementAge(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    min="50"
                    max="80"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Savings (£)
                </label>
                <input
                  type="number"
                  value={currentSavings}
                  onChange={(e) => setCurrentSavings(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="45000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Contribution (£)
                </label>
                <input
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Annual Return (%)
                </label>
                <input
                  type="number"
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="15"
                  step="0.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desired Monthly Retirement Income (£)
                </label>
                <input
                  type="number"
                  value={desiredMonthlyIncome}
                  onChange={(e) => setDesiredMonthlyIncome(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="3000"
                />
              </div>
            </CardContent>
          </Card>

          {/* Projection Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Growth Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" />
                  <YAxis tickFormatter={(value) => `£${(value / 1000)}k`} />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      formatCurrency(value), 
                      name === 'portfolio' ? 'Portfolio Value' : 
                      name === 'realValue' ? 'Real Value (inflation-adjusted)' : 'Total Contributions'
                    ]} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="contributions" 
                    stackId="1"
                    stroke="#94A3B8" 
                    fill="#94A3B8" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="portfolio" 
                    stackId="2"
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.6}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="realValue" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Analysis */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Retirement Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800">Current Plan</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Years to retirement:</span>
                      <span className="font-medium">{retirementAge - currentAge}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total contributions:</span>
                      <span className="font-medium">{formatCurrency(currentSavings + (monthlyContribution * 12 * (retirementAge - currentAge)))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Investment growth:</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(finalProjection.portfolioValue - currentSavings - (monthlyContribution * 12 * (retirementAge - currentAge)))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800">Tax Benefits</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Monthly tax relief:</span>
                      <span className="font-medium text-green-600">{formatCurrency(taxAdvantages.monthlyTaxRelief)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net monthly cost:</span>
                      <span className="font-medium">{formatCurrency(taxAdvantages.netMonthlyCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Annual tax relief:</span>
                      <span className="font-medium text-green-600">{formatCurrency(taxAdvantages.annualTaxRelief)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800">Goal Assessment</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Target portfolio:</span>
                      <span className="font-medium">{formatCurrency(retirementGoal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Projected portfolio:</span>
                      <span className="font-medium">{formatCurrency(finalProjection.portfolioValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shortfall/Surplus:</span>
                      <span className={`font-medium ${finalProjection.portfolioValue >= retirementGoal ? 'text-green-600' : 'text-red-600'}`}>
                        {finalProjection.portfolioValue >= retirementGoal ? '+' : ''}{formatCurrency(finalProjection.portfolioValue - retirementGoal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {requiredSavings.shortfall > 0 && (
                <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2">Recommendation</h4>
                  <p className="text-sm text-amber-700">
                    To reach your desired retirement income of {formatCurrency(desiredMonthlyIncome)} per month, 
                    you need to contribute {formatCurrency(requiredSavings.monthlyRequired)} monthly instead of {formatCurrency(monthlyContribution)}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scenarios Tab */}
      {selectedTab === 'scenarios' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contribution Scenarios</CardTitle>
              <p className="text-sm text-gray-600">Compare different monthly contribution amounts</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={scenarioData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="contribution" 
                    tickFormatter={(value) => `£${value}`}
                  />
                  <YAxis tickFormatter={(value) => `£${(value / 1000)}k`} />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      formatCurrency(value), 
                      name === 'finalValue' ? 'Final Value' : 'Monthly Income'
                    ]} 
                  />
                  <Bar dataKey="finalValue" fill="#3B82F6" name="finalValue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenarios.map((scenario, index) => (
              <Card key={index} className={monthlyContribution === scenario.monthlyContribution ? 'ring-2 ring-blue-500' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{formatCurrency(scenario.monthlyContribution)}/month</CardTitle>
                  {monthlyContribution === scenario.monthlyContribution && (
                    <div className="text-xs text-blue-600 font-medium">Current Plan</div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Final value:</span>
                      <span className="font-medium">{formatCurrency(scenario.finalValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly income:</span>
                      <span className="font-medium text-green-600">{formatCurrency(scenario.monthlyIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total contributed:</span>
                      <span className="font-medium">{formatCurrency(scenario.totalContributions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Investment growth:</span>
                      <span className="font-medium text-blue-600">{formatCurrency(scenario.growthAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tips Tab */}
      {selectedTab === 'tips' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Retirement Planning Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{tip}</p>
                </div>
              ))}
              
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Key Retirement Planning Principles</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Start as early as possible to maximize compound growth</li>
                  <li>• Take advantage of employer pension matching if available</li>
                  <li>• Consider your State Pension in your overall planning</li>
                  <li>• Review and adjust your plan annually</li>
                  <li>• Don't forget to factor in inflation and healthcare costs</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}