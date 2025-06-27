'use client';

import { useState } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  status: 'on-track' | 'warning' | 'exceeded';
}

const mockBudgets: Budget[] = [
  {
    id: '1',
    name: 'Monthly Groceries',
    category: 'Food & Drink',
    amount: 400,
    spent: 285.50,
    period: 'monthly',
    startDate: '2024-06-01',
    endDate: '2024-06-30',
    status: 'on-track'
  },
  {
    id: '2',
    name: 'Entertainment Budget',
    category: 'Entertainment',
    amount: 200,
    spent: 185.75,
    period: 'monthly',
    startDate: '2024-06-01',
    endDate: '2024-06-30',
    status: 'warning'
  },
  {
    id: '3',
    name: 'Transportation',
    category: 'Transport',
    amount: 300,
    spent: 245.20,
    period: 'monthly',
    startDate: '2024-06-01',
    endDate: '2024-06-30',
    status: 'on-track'
  },
  {
    id: '4',
    name: 'Shopping Allowance',
    category: 'Shopping',
    amount: 150,
    spent: 165.30,
    period: 'monthly',
    startDate: '2024-06-01',
    endDate: '2024-06-30',
    status: 'exceeded'
  },
  {
    id: '5',
    name: 'Annual Vacation Fund',
    category: 'Travel',
    amount: 2400,
    spent: 1200,
    period: 'yearly',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'on-track'
  }
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount);
};

const getStatusColor = (status: Budget['status']) => {
  switch (status) {
    case 'on-track':
      return 'text-green-600 bg-green-50';
    case 'warning':
      return 'text-orange-600 bg-orange-50';
    case 'exceeded':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const getStatusIcon = (status: Budget['status']) => {
  switch (status) {
    case 'on-track':
      return CheckCircleIcon;
    case 'warning':
      return ExclamationTriangleIcon;
    case 'exceeded':
      return ExclamationTriangleIcon;
    default:
      return ClockIcon;
  }
};

function BudgetCard({ budget }: { budget: Budget }) {
  const percentage = (budget.spent / budget.amount) * 100;
  const remaining = budget.amount - budget.spent;
  const StatusIcon = getStatusIcon(budget.status);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{budget.name}</h3>
          <p className="text-sm text-gray-600">{budget.category}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={cn("flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium", getStatusColor(budget.status))}>
            <StatusIcon className="h-3 w-3" />
            <span className="capitalize">{budget.status.replace('-', ' ')}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <PencilIcon className="h-4 w-4" />
            </button>
            <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Spent: {formatCurrency(budget.spent)}</span>
            <span>Budget: {formatCurrency(budget.amount)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={cn(
                "h-3 rounded-full transition-all duration-300",
                budget.status === 'exceeded' ? "bg-red-500" :
                budget.status === 'warning' ? "bg-orange-500" : "bg-green-500"
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{percentage.toFixed(1)}% used</span>
            <span className={cn(
              remaining >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {remaining >= 0 ? formatCurrency(remaining) + ' remaining' : formatCurrency(Math.abs(remaining)) + ' over budget'}
            </span>
          </div>
        </div>

        {/* Period Info */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="capitalize">{budget.period} budget</span>
          <span>
            {new Date(budget.startDate).toLocaleDateString('en-GB')} - {new Date(budget.endDate).toLocaleDateString('en-GB')}
          </span>
        </div>
      </div>
    </div>
  );
}

function BudgetSummary() {
  const totalBudget = mockBudgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = mockBudgets.reduce((sum, budget) => sum + budget.spent, 0);
  const onTrackCount = mockBudgets.filter(b => b.status === 'on-track').length;
  const exceededCount = mockBudgets.filter(b => b.status === 'exceeded').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-2 bg-blue-50 rounded-lg">
            <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Budget</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-2 bg-orange-50 rounded-lg">
            <CalendarDaysIcon className="h-6 w-6 text-orange-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Spent</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-2 bg-green-50 rounded-lg">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">On Track</p>
            <p className="text-2xl font-bold text-green-600">{onTrackCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-2 bg-red-50 rounded-lg">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Over Budget</p>
            <p className="text-2xl font-bold text-red-600">{exceededCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'weekly' | 'monthly' | 'yearly'>('all');

  const filteredBudgets = mockBudgets.filter(budget => 
    filterPeriod === 'all' || budget.period === filterPeriod
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-600">Track and manage your spending budgets</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value as typeof filterPeriod)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Periods</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Create Budget</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <BudgetSummary />

      {/* Budget Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredBudgets.map((budget) => (
          <BudgetCard key={budget.id} budget={budget} />
        ))}
      </div>

      {filteredBudgets.length === 0 && (
        <div className="text-center py-12">
          <CalendarDaysIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No budgets found</h3>
          <p className="text-gray-500 mb-4">
            {filterPeriod === 'all' 
              ? "Create your first budget to start tracking your spending."
              : `No ${filterPeriod} budgets found. Try a different filter or create a new budget.`
            }
          </p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Create Budget</span>
          </button>
        </div>
      )}

      {/* Budget Tips */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Tips</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Use the 50/30/20 Rule</p>
                <p className="text-sm text-gray-600">
                  Allocate 50% for needs, 30% for wants, and 20% for savings and debt repayment.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Review Monthly</p>
                <p className="text-sm text-gray-600">
                  Regularly review and adjust your budgets based on actual spending patterns.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Set Realistic Goals</p>
                <p className="text-sm text-gray-600">
                  Base your budgets on historical spending data rather than wishful thinking.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Build in Flexibility</p>
                <p className="text-sm text-gray-600">
                  Include a buffer for unexpected expenses in each category.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
