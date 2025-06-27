'use client';

import { useState } from 'react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// Mock projection data
const mockProjectionData = {
  currentBalance: 45750.32,
  monthlyIncome: 3200.00,
  monthlyExpenses: 2850.75,
  projectedBalances: [
    { month: 'Jul 2024', balance: 46099.57, income: 3200, expenses: 2850.75 },
    { month: 'Aug 2024', balance: 46448.82, income: 3200, expenses: 2850.75 },
    { month: 'Sep 2024', balance: 46798.07, income: 3200, expenses: 2850.75 },
    { month: 'Oct 2024', balance: 47147.32, income: 3200, expenses: 2850.75 },
    { month: 'Nov 2024', balance: 47496.57, income: 3200, expenses: 2850.75 },
    { month: 'Dec 2024', balance: 47845.82, income: 3200, expenses: 2850.75 },
    { month: 'Jan 2025', balance: 48195.07, income: 3200, expenses: 2850.75 },
    { month: 'Feb 2025', balance: 48544.32, income: 3200, expenses: 2850.75 },
    { month: 'Mar 2025', balance: 48893.57, income: 3200, expenses: 2850.75 },
    { month: 'Apr 2025', balance: 49242.82, income: 3200, expenses: 2850.75 },
    { month: 'May 2025', balance: 49592.07, income: 3200, expenses: 2850.75 },
    { month: 'Jun 2025', balance: 49941.32, income: 3200, expenses: 2850.75 }
  ],
  scenarios: {
    conservative: { growthRate: 0.02, riskLevel: 'Low' },
    moderate: { growthRate: 0.05, riskLevel: 'Medium' },
    aggressive: { growthRate: 0.08, riskLevel: 'High' }
  },
  businessRunway: {
    currentRunway: 16.1, // months
    projectedRunway: 17.5, // months with current savings rate
    burnRate: 2850.75
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount);
};

function ProjectionCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  color = 'blue'
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  icon: any; 
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'orange' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={cn("p-3 rounded-lg", colorClasses[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center">
          {trend === 'up' && <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />}
          {trend === 'down' && <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />}
          <span className={cn(
            "ml-1 text-sm font-medium",
            trend === 'up' ? "text-green-600" : trend === 'down' ? "text-red-600" : "text-gray-600"
          )}>
            {trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}
          </span>
        </div>
      )}
    </div>
  );
}

function ProjectionChart() {
  const maxBalance = Math.max(...mockProjectionData.projectedBalances.map(p => p.balance));
  const minBalance = Math.min(...mockProjectionData.projectedBalances.map(p => p.balance));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">12-Month Balance Projection</h3>
        <ChartBarIcon className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-3">
        {mockProjectionData.projectedBalances.map((projection, index) => {
          const heightPercentage = ((projection.balance - minBalance) / (maxBalance - minBalance)) * 100;
          const isCurrentMonth = index === 0;
          
          return (
            <div key={projection.month} className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <span className={cn(
                  "text-xs font-medium w-16",
                  isCurrentMonth ? "text-blue-600" : "text-gray-600"
                )}>
                  {projection.month}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-4 flex items-center">
                  <div
                    className={cn(
                      "rounded-full h-full transition-all duration-300",
                      isCurrentMonth ? "bg-blue-500" : "bg-green-400"
                    )}
                    style={{ width: `${Math.max(heightPercentage, 5)}%` }}
                  />
                </div>
              </div>
              <span className={cn(
                "text-sm font-semibold ml-4",
                isCurrentMonth ? "text-blue-600" : "text-gray-900"
              )}>
                {formatCurrency(projection.balance)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScenarioAnalysis() {
  const [selectedScenario, setSelectedScenario] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  
  const calculateProjectedValue = (scenario: keyof typeof mockProjectionData.scenarios, months: number) => {
    const { growthRate } = mockProjectionData.scenarios[scenario];
    const monthlyGrowthRate = growthRate / 12;
    return mockProjectionData.currentBalance * Math.pow(1 + monthlyGrowthRate, months);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Investment Scenario Analysis</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(mockProjectionData.scenarios).map(([key, scenario]) => (
          <button
            key={key}
            onClick={() => setSelectedScenario(key as typeof selectedScenario)}
            className={cn(
              "p-4 rounded-lg border-2 text-left transition-colors",
              selectedScenario === key
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <div className="font-medium text-gray-900 capitalize">{key}</div>
            <div className="text-sm text-gray-600">{scenario.growthRate * 100}% annual return</div>
            <div className="text-xs text-gray-500">{scenario.riskLevel} risk</div>
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">1 Year</div>
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(calculateProjectedValue(selectedScenario, 12))}
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">3 Years</div>
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(calculateProjectedValue(selectedScenario, 36))}
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">5 Years</div>
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(calculateProjectedValue(selectedScenario, 60))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectionsPage() {
  const [timeHorizon, setTimeHorizon] = useState<'1y' | '3y' | '5y'>('1y');
  const netMonthlyCashFlow = mockProjectionData.monthlyIncome - mockProjectionData.monthlyExpenses;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Projections</h1>
          <p className="text-gray-600">Forecast your financial future with scenario planning</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
          <select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value as typeof timeHorizon)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1y">1 Year</option>
            <option value="3y">3 Years</option>
            <option value="5y">5 Years</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ProjectionCard
          title="Current Balance"
          value={formatCurrency(mockProjectionData.currentBalance)}
          subtitle="Across all accounts"
          icon={CurrencyDollarIcon}
          color="blue"
        />
        
        <ProjectionCard
          title="Monthly Cash Flow"
          value={formatCurrency(netMonthlyCashFlow)}
          subtitle="Income minus expenses"
          icon={ArrowTrendingUpIcon}
          trend="up"
          color="green"
        />
        
        <ProjectionCard
          title="Business Runway"
          value={`${mockProjectionData.businessRunway.currentRunway} months`}
          subtitle="At current burn rate"
          icon={ClockIcon}
          trend="up"
          color="orange"
        />
        
        <ProjectionCard
          title="Projected Growth"
          value="8.7%"
          subtitle="Next 12 months"
          icon={ChartBarIcon}
          trend="up"
          color="green"
        />
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectionChart />
        <ScenarioAnalysis />
      </div>

      {/* Business Runway Analysis */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Business Runway Analysis</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-orange-600 font-medium">Current Runway</div>
            <div className="text-2xl font-bold text-orange-700">
              {mockProjectionData.businessRunway.currentRunway} months
            </div>
            <div className="text-sm text-orange-600">
              At {formatCurrency(mockProjectionData.businessRunway.burnRate)}/month
            </div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Projected Runway</div>
            <div className="text-2xl font-bold text-green-700">
              {mockProjectionData.businessRunway.projectedRunway} months
            </div>
            <div className="text-sm text-green-600">
              With current savings rate
            </div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Improvement</div>
            <div className="text-2xl font-bold text-blue-700">
              +{(mockProjectionData.businessRunway.projectedRunway - mockProjectionData.businessRunway.currentRunway).toFixed(1)} months
            </div>
            <div className="text-sm text-blue-600">
              Additional runway
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Maintain Current Savings Rate</p>
              <p className="text-sm text-gray-600">
                Your current monthly surplus of {formatCurrency(netMonthlyCashFlow)} is helping extend your runway.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Consider Investment Diversification</p>
              <p className="text-sm text-gray-600">
                A moderate investment strategy could potentially increase your 5-year projection by 15-20%.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Monitor Expense Growth</p>
              <p className="text-sm text-gray-600">
                Keep monthly expenses below {formatCurrency(mockProjectionData.monthlyIncome * 0.9)} to maintain healthy cash flow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
