'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CreditCardIcon,
  CalculatorIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PlusIcon,
  TrashIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { DebtItem, DebtPayoffPlan } from '@/types';
import { debtService } from '@/services/debt-service';

interface DebtCalculatorProps {
  userId: string;
}

const COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6'];

export function DebtCalculator({ userId }: DebtCalculatorProps) {
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [extraPayment, setExtraPayment] = useState<number>(0);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(5000);
  const [selectedStrategy, setSelectedStrategy] = useState<'snowball' | 'avalanche' | 'comparison'>('comparison');
  const [snowballPlan, setSnowballPlan] = useState<DebtPayoffPlan | null>(null);
  const [avalanchePlan, setAvalanchePlan] = useState<DebtPayoffPlan | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDebt, setNewDebt] = useState<Partial<DebtItem>>({
    name: '',
    balance: 0,
    minimum_payment: 0,
    interest_rate: 0,
    type: 'credit_card'
  });

  useEffect(() => {
    // Load mock data
    const mockDebts = debtService.generateMockDebts(userId);
    setDebts(mockDebts);
  }, [userId]);

  useEffect(() => {
    if (debts.length > 0) {
      calculatePayoffPlans();
    }
  }, [debts, extraPayment]);

  const calculatePayoffPlans = () => {
    const strategies = debtService.compareStrategies(debts, extraPayment);
    setSnowballPlan(strategies.snowball);
    setAvalanchePlan(strategies.avalanche);
  };

  const addDebt = () => {
    if (newDebt.name && newDebt.balance && newDebt.minimum_payment && newDebt.interest_rate) {
      const debt: DebtItem = {
        id: `debt_${Date.now()}`,
        name: newDebt.name,
        balance: newDebt.balance,
        minimum_payment: newDebt.minimum_payment,
        interest_rate: newDebt.interest_rate,
        type: newDebt.type || 'credit_card'
      };
      setDebts([...debts, debt]);
      setNewDebt({
        name: '',
        balance: 0,
        minimum_payment: 0,
        interest_rate: 0,
        type: 'credit_card'
      });
      setShowAddForm(false);
    }
  };

  const removeDebt = (id: string) => {
    setDebts(debts.filter(debt => debt.id !== id));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatMonths = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years > 0) {
      return `${years}y ${remainingMonths}m`;
    }
    return `${months}m`;
  };

  const analysis = debtService.analyzeDebts(debts);
  const recommendations = debtService.generateRecommendations(analysis, monthlyIncome);
  const debtToIncomeRatio = debtService.calculateDebtToIncomeRatio(analysis.totalDebt, monthlyIncome);

  const debtBreakdownData = debts.map((debt, index) => ({
    name: debt.name,
    balance: debt.balance,
    interestRate: debt.interest_rate,
    minimumPayment: debt.minimum_payment,
    color: COLORS[index % COLORS.length]
  }));

  const comparisonData = snowballPlan && avalanchePlan ? [
    {
      strategy: 'Snowball',
      months: new Date(snowballPlan.estimated_payoff_date).getTime() - new Date().getTime(),
      interestSaved: snowballPlan.interest_saved,
      payoffDate: snowballPlan.estimated_payoff_date
    },
    {
      strategy: 'Avalanche',
      months: new Date(avalanchePlan.estimated_payoff_date).getTime() - new Date().getTime(),
      interestSaved: avalanchePlan.interest_saved,
      payoffDate: avalanchePlan.estimated_payoff_date
    }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Debt Payoff Calculator</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" />
          Add Debt
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Debt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(analysis.totalDebt)}</div>
            <div className="text-sm text-gray-500">{debts.length} debts</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monthly Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analysis.totalMinimumPayment + extraPayment)}</div>
            <div className="text-sm text-gray-500">
              {formatCurrency(analysis.totalMinimumPayment)} minimum + {formatCurrency(extraPayment)} extra
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Interest Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.weightedAverageAPR.toFixed(2)}%</div>
            <div className="text-sm text-gray-500">Weighted average</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Debt-to-Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              debtToIncomeRatio > 40 ? 'text-red-600' : debtToIncomeRatio > 20 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {debtToIncomeRatio.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              {debtToIncomeRatio > 40 ? 'High risk' : debtToIncomeRatio > 20 ? 'Moderate' : 'Good'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Income
              </label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Extra Monthly Payment
              </label>
              <input
                type="number"
                value={extraPayment}
                onChange={(e) => setExtraPayment(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Selection */}
      <div className="flex space-x-4 border-b border-gray-200">
        {[
          { id: 'comparison', name: 'Strategy Comparison', icon: CalculatorIcon },
          { id: 'snowball', name: 'Debt Snowball', icon: ArrowTrendingDownIcon },
          { id: 'avalanche', name: 'Debt Avalanche', icon: ClockIcon }
        ].map((strategy) => (
          <button
            key={strategy.id}
            onClick={() => setSelectedStrategy(strategy.id as any)}
            className={`flex items-center gap-2 py-2 px-4 border-b-2 font-medium text-sm ${
              selectedStrategy === strategy.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <strategy.icon className="h-4 w-4" />
            {strategy.name}
          </button>
        ))}
      </div>

      {/* Strategy Comparison */}
      {selectedStrategy === 'comparison' && snowballPlan && avalanchePlan && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowTrendingDownIcon className="h-5 w-5 text-blue-600" />
                Debt Snowball Method
              </CardTitle>
              <p className="text-sm text-gray-600">Pay off smallest balances first for psychological wins</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payoff Time:</span>
                  <span className="font-semibold">
                    {formatMonths(Math.ceil((new Date(snowballPlan.estimated_payoff_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Interest Saved:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(snowballPlan.interest_saved)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Paid:</span>
                  <span className="font-semibold">{formatCurrency(analysis.totalDebt + (analysis.totalDebt - snowballPlan.interest_saved))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-green-600" />
                Debt Avalanche Method
              </CardTitle>
              <p className="text-sm text-gray-600">Pay off highest interest rates first to save money</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payoff Time:</span>
                  <span className="font-semibold">
                    {formatMonths(Math.ceil((new Date(avalanchePlan.estimated_payoff_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Interest Saved:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(avalanchePlan.interest_saved)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Paid:</span>
                  <span className="font-semibold">{formatCurrency(analysis.totalDebt + (analysis.totalDebt - avalanchePlan.interest_saved))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Debt Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Debt Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={debtBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, balance }) => `${name}: ${formatCurrency(balance)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="balance"
                >
                  {debtBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interest Rates by Debt</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={debtBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value: any) => `${value}%`} />
                <Bar dataKey="interestRate" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Current Debts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Debts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Debt Name</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-right py-2">Balance</th>
                  <th className="text-right py-2">Interest Rate</th>
                  <th className="text-right py-2">Min Payment</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((debt, index) => (
                  <tr key={debt.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 font-medium">{debt.name}</td>
                    <td className="py-3 capitalize">{debt.type.replace('_', ' ')}</td>
                    <td className="py-3 text-right font-medium">{formatCurrency(debt.balance)}</td>
                    <td className="py-3 text-right">{debt.interest_rate}%</td>
                    <td className="py-3 text-right">{formatCurrency(debt.minimum_payment)}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => removeDebt(debt.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LightBulbIcon className="h-5 w-5 text-yellow-500" />
            Personalized Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <LightBulbIcon className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Debt Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Debt</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Debt Name</label>
                <input
                  type="text"
                  value={newDebt.name || ''}
                  onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Credit Card - Visa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Balance</label>
                <input
                  type="number"
                  value={newDebt.balance || ''}
                  onChange={(e) => setNewDebt({ ...newDebt, balance: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Payment</label>
                <input
                  type="number"
                  value={newDebt.minimum_payment || ''}
                  onChange={(e) => setNewDebt({ ...newDebt, minimum_payment: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newDebt.interest_rate || ''}
                  onChange={(e) => setNewDebt({ ...newDebt, interest_rate: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Debt Type</label>
                <select
                  value={newDebt.type || 'credit_card'}
                  onChange={(e) => setNewDebt({ ...newDebt, type: e.target.value as any })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="credit_card">Credit Card</option>
                  <option value="personal_loan">Personal Loan</option>
                  <option value="auto_loan">Auto Loan</option>
                  <option value="student_loan">Student Loan</option>
                  <option value="mortgage">Mortgage</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={addDebt}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                Add Debt
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}