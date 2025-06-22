'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calculator, 
  PoundSterling,
  TrendingDown,
  FileText,
  Lightbulb,
  PiggyBank,
  Building
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
  ResponsiveContainer
} from 'recharts';
import { TaxCalculation } from '@/types';
import { taxService, TaxBreakdown } from '@/services/tax-service';

interface TaxCalculatorProps {
  userId: string;
}

const COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6'];

export function TaxCalculator({ userId }: TaxCalculatorProps) {
  const [grossIncome, setGrossIncome] = useState<number>(55000);
  const [pensionContributions, setPensionContributions] = useState<number>(2750);
  const [hasStudentLoan, setHasStudentLoan] = useState<boolean>(true);
  const [studentLoanPlan, setStudentLoanPlan] = useState<1 | 2 | 4>(2);
  const [charitableDonations, setCharitableDonations] = useState<number>(500);
  const [isEmployed, setIsEmployed] = useState<boolean>(true);
  const [businessExpenses, setBusinessExpenses] = useState<number>(0);
  
  const [taxBreakdown, setTaxBreakdown] = useState<TaxBreakdown | null>(null);
  const [mockTaxCalculation, setMockTaxCalculation] = useState<TaxCalculation | null>(null);
  const [selectedTab, setSelectedTab] = useState<'calculator' | 'planning' | 'tips'>('calculator');

  useEffect(() => {
    calculateTax();
  }, [grossIncome, pensionContributions, hasStudentLoan, studentLoanPlan, charitableDonations, isEmployed, businessExpenses]);

  const calculateTax = () => {
    if (isEmployed) {
      const breakdown = taxService.calculateTotalTax(grossIncome, {
        hasStudentLoan,
        studentLoanPlan,
        pensionContributions,
        charitableDonations
      });
      setTaxBreakdown(breakdown);
    } else {
      const selfEmployedResult = taxService.calculateSelfEmploymentTax(grossIncome, businessExpenses);
      const breakdown: TaxBreakdown = {
        basicRate: selfEmployedResult.incomeTax,
        higherRate: 0,
        additionalRate: 0,
        totalTax: selfEmployedResult.incomeTax,
        nationalInsurance: selfEmployedResult.nationalInsurance,
        studentLoan: hasStudentLoan ? taxService.calculateStudentLoan(grossIncome, studentLoanPlan) : undefined,
        netIncome: grossIncome - selfEmployedResult.totalTax,
        effectiveRate: grossIncome > 0 ? (selfEmployedResult.totalTax / grossIncome) * 100 : 0
      };
      setTaxBreakdown(breakdown);
    }

    const mockCalc = taxService.generateMockTaxCalculation(userId, grossIncome);
    setMockTaxCalculation(mockCalc);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (!taxBreakdown || !mockTaxCalculation) {
    return <div className="p-6">Loading tax calculator...</div>;
  }

  const taxBreakdownData = [
    { name: 'Income Tax', value: taxBreakdown.totalTax, color: '#EF4444' },
    { name: 'National Insurance', value: taxBreakdown.nationalInsurance, color: '#F97316' },
    ...(taxBreakdown.studentLoan ? [{ name: 'Student Loan', value: taxBreakdown.studentLoan, color: '#EAB308' }] : []),
    { name: 'Net Income', value: taxBreakdown.netIncome, color: '#22C55E' }
  ];

  const taxBandData = [
    { band: 'Basic Rate (20%)', amount: taxBreakdown.basicRate },
    { band: 'Higher Rate (40%)', amount: taxBreakdown.higherRate },
    { band: 'Additional Rate (45%)', amount: taxBreakdown.additionalRate }
  ].filter(item => item.amount > 0);

  const pensionOptimization = taxService.calculateOptimalPensionContribution(grossIncome, pensionContributions);
  const taxTips = taxService.calculateTaxEfficiencyTips(grossIncome);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Tax Calculator</h2>
        <div className="text-sm text-gray-500">UK Tax Year 2024/25</div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Gross Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(grossIncome)}</div>
            <div className="text-sm text-gray-500">Annual salary</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(taxBreakdown.totalTax + taxBreakdown.nationalInsurance + (taxBreakdown.studentLoan || 0))}
            </div>
            <div className="text-sm text-gray-500">
              {formatPercentage(taxBreakdown.effectiveRate)} effective rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Net Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(taxBreakdown.netIncome)}</div>
            <div className="text-sm text-gray-500">Take-home pay</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monthly Net</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(taxBreakdown.netIncome / 12)}</div>
            <div className="text-sm text-gray-500">Per month</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'calculator', name: 'Tax Calculator', icon: Calculator },
            { id: 'planning', name: 'Tax Planning', icon: PiggyBank },
            { id: 'tips', name: 'Efficiency Tips', icon: Lightbulb }
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

      {/* Calculator Tab */}
      {selectedTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>Income & Deductions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employment Status
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={isEmployed}
                      onChange={() => setIsEmployed(true)}
                      className="mr-2"
                    />
                    Employed
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!isEmployed}
                      onChange={() => setIsEmployed(false)}
                      className="mr-2"
                    />
                    Self-Employed
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isEmployed ? 'Annual Salary' : 'Annual Profit'}
                </label>
                <input
                  type="number"
                  value={grossIncome}
                  onChange={(e) => setGrossIncome(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="55000"
                />
              </div>

              {!isEmployed && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Expenses
                  </label>
                  <input
                    type="number"
                    value={businessExpenses}
                    onChange={(e) => setBusinessExpenses(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="5000"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pension Contributions (Annual)
                </label>
                <input
                  type="number"
                  value={pensionContributions}
                  onChange={(e) => setPensionContributions(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="2750"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Charitable Donations (Annual)
                </label>
                <input
                  type="number"
                  value={charitableDonations}
                  onChange={(e) => setCharitableDonations(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={hasStudentLoan}
                  onChange={(e) => setHasStudentLoan(e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">Student Loan</label>
              </div>

              {hasStudentLoan && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student Loan Plan
                  </label>
                  <select
                    value={studentLoanPlan}
                    onChange={(e) => setStudentLoanPlan(Number(e.target.value) as 1 | 2 | 4)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Plan 1 (Pre-2012)</option>
                    <option value={2}>Plan 2 (Post-2012)</option>
                    <option value={4}>Plan 4 (Postgraduate)</option>
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tax Breakdown Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taxBreakdownData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taxBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Breakdown */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Detailed Tax Calculation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Gross Income</span>
                    <span className="font-bold">{formatCurrency(grossIncome)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span>Pension Contributions</span>
                    <span className="text-blue-600">-{formatCurrency(pensionContributions)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span>Income Tax</span>
                    <span className="text-red-600">-{formatCurrency(taxBreakdown.totalTax)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span>National Insurance</span>
                    <span className="text-orange-600">-{formatCurrency(taxBreakdown.nationalInsurance)}</span>
                  </div>
                  {taxBreakdown.studentLoan && (
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span>Student Loan</span>
                      <span className="text-yellow-600">-{formatCurrency(taxBreakdown.studentLoan)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                    <span className="font-bold">Net Income</span>
                    <span className="font-bold text-green-600">{formatCurrency(taxBreakdown.netIncome)}</span>
                  </div>
                </div>

                {taxBandData.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Income Tax by Band</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={taxBandData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="band" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value: any) => formatCurrency(value)} />
                        <Bar dataKey="amount" fill="#EF4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Planning Tab */}
      {selectedTab === 'planning' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-blue-600" />
                Pension Optimization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Recommended Contribution</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(pensionOptimization.recommendation)}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    vs current: {formatCurrency(pensionContributions)}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Annual Tax Saving</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(pensionOptimization.taxSaving)}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    Net cost: {formatCurrency(pensionOptimization.netCost)}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Explanation</div>
                  <div className="text-sm text-gray-700 mt-2">
                    {pensionOptimization.explanation}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quarterly Tax Estimates</CardTitle>
              <p className="text-sm text-gray-600">For self-employed individuals</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {mockTaxCalculation.quarterly_payments.map((payment, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-sm text-gray-600">Q{index + 1} Payment</div>
                    <div className="text-lg font-bold">{formatCurrency(payment)}</div>
                    <div className="text-xs text-gray-500">
                      Due: {new Date(2024, index * 3 + 2, 31).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tips Tab */}
      {selectedTab === 'tips' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Tax Efficiency Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {taxTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{tip}</p>
                </div>
              ))}
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Important Dates for 2024/25</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Self-assessment deadline: 31st January 2025</li>
                  <li>• ISA subscription deadline: 5th April 2025</li>
                  <li>• Pension contribution deadline: 5th April 2025</li>
                  <li>• Capital gains tax payment deadline: 31st January 2025</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}