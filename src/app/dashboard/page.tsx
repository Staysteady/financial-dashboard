'use client';
import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { AccountOverview } from '@/components/ui/account-card';
import { TransactionList } from '@/components/ui/transaction-list';
import { 
  SummaryStats, 
  BalanceTrendChart, 
  SpendingBreakdownChart, 
  MonthlyComparisonChart,
  CategoryTrendChart,
  QuickInsights 
} from '@/components/ui/financial-charts';
import { FinancialProjections } from '@/components/ui/financial-projections';

export default function DashboardPage() {
  // State for collapsible transaction section
  const [isTransactionSectionExpanded, setIsTransactionSectionExpanded] = useState(true);

  // Mock data for initial display
  const mockStats = {
    totalBalance: 45750.32,
    monthlyIncome: 3200.00,
    monthlyExpenses: 2850.75,
    burnRate: 2850.75,
    projectedRunway: 16.1, // months
    accountsCount: 8,
    lastUpdated: new Date().toISOString(),
  };

  const mockAccounts = [
    { 
      id: '1', 
      user_id: 'user1',
      institution_name: 'HSBC',
      account_name: 'HSBC Current Account', 
      balance: 2450.32, 
      account_type: 'current' as const,
      currency: 'GBP',
      last_updated: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      is_active: true,
      api_connected: true,
      created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    },
    { 
      id: '2', 
      user_id: 'user1',
      institution_name: 'Atom Bank',
      account_name: 'Atom Bank Savings', 
      balance: 15000.00, 
      account_type: 'savings' as const,
      currency: 'GBP',
      last_updated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      is_active: true,
      api_connected: true,
      created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    { 
      id: '3', 
      user_id: 'user1',
      institution_name: 'Zopa',
      account_name: 'Zopa Savings', 
      balance: 8500.00, 
      account_type: 'savings' as const,
      currency: 'GBP',
      last_updated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      is_active: true,
      api_connected: true,
      created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    },
    { 
      id: '4', 
      user_id: 'user1',
      institution_name: 'Hargreaves Lansdown',
      account_name: 'Hargreaves Lansdown ISA', 
      balance: 19800.00, 
      account_type: 'investment' as const,
      currency: 'GBP',
      last_updated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      is_active: true,
      api_connected: true,
      created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    { 
      id: '5', 
      user_id: 'user1',
      institution_name: 'American Express',
      account_name: 'Amex Credit Card', 
      balance: -850.00, 
      account_type: 'credit' as const,
      currency: 'GBP',
      last_updated: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      is_active: true,
      api_connected: true,
      created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Generate more extensive mock transaction data for better projections
  const generateMockTransactions = () => {
    const transactions = [];
    const categories = ['Groceries', 'Bills', 'Transport', 'Entertainment', 'Food & Drink', 'Shopping', 'Salary', 'Freelance'];
    const merchants = ['Tesco', 'ASDA', 'British Gas', 'Shell', 'Costa Coffee', 'Netflix', 'Amazon', 'TechCorp Ltd'];
    
    // Generate transactions for the last 12 months
    for (let month = 0; month < 12; month++) {
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() - month);
      
      // Monthly salary
      transactions.push({
        id: `sal-${month}`,
        account_id: '1',
        amount: 3200 + (Math.random() - 0.5) * 400, // £3000-3400
        currency: 'GBP',
        description: 'Monthly Salary',
        category: 'Salary',
        date: new Date(baseDate.getFullYear(), baseDate.getMonth(), 25).toISOString(),
        type: 'income' as const,
        is_recurring: true,
        merchant: 'TechCorp Ltd',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Monthly expenses (15-25 transactions per month)
      const expenseCount = 15 + Math.floor(Math.random() * 10);
      for (let i = 0; i < expenseCount; i++) {
        const day = 1 + Math.floor(Math.random() * 28);
        const category = categories[Math.floor(Math.random() * (categories.length - 2))]; // Exclude Salary, Freelance
        const amount = category === 'Bills' ? 80 + Math.random() * 200 : 
                     category === 'Groceries' ? 20 + Math.random() * 150 :
                     category === 'Transport' ? 10 + Math.random() * 100 :
                     5 + Math.random() * 100;
        
        transactions.push({
          id: `exp-${month}-${i}`,
          account_id: '1',
          amount: amount,
          currency: 'GBP',
          description: `${category} expense`,
          category,
          date: new Date(baseDate.getFullYear(), baseDate.getMonth(), day).toISOString(),
          type: 'expense' as const,
          is_recurring: category === 'Bills',
          merchant: merchants[Math.floor(Math.random() * merchants.length)],
          location: Math.random() > 0.5 ? 'London, UK' : undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      // Occasional freelance income
      if (Math.random() > 0.7) {
        transactions.push({
          id: `free-${month}`,
          account_id: '1',
          amount: 300 + Math.random() * 800,
          currency: 'GBP',
          description: 'Freelance Payment',
          category: 'Freelance',
          date: new Date(baseDate.getFullYear(), baseDate.getMonth(), 15).toISOString(),
          type: 'income' as const,
          is_recurring: false,
          merchant: 'Client ABC',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
    
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const mockTransactions = generateMockTransactions();

  const mockCategories = [
    { id: '1', name: 'Groceries' },
    { id: '2', name: 'Salary' },
    { id: '3', name: 'Bills' },
    { id: '4', name: 'Food & Drink' },
    { id: '5', name: 'Entertainment' },
    { id: '6', name: 'Transport' },
    { id: '7', name: 'Freelance' },
    { id: '8', name: 'Savings' }
  ];

  // Transform mock accounts to match Account interface
  const transformedAccounts = mockAccounts.map(account => ({
    id: account.id,
    name: account.account_name,
    type: account.account_type,
    balance: account.balance,
    currency: account.currency,
    lastUpdated: account.last_updated,
    isActive: account.is_active,
    provider: account.institution_name,
  }));

  const mockAccountOptions = transformedAccounts.map(account => ({
    id: account.id,
    name: account.name
  }));

  // Transform mock transactions to match Transaction interface
  const transformedTransactions = mockTransactions.map(transaction => ({
    id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    merchant: transaction.merchant,
    amount: transaction.amount,
    currency: transaction.currency,
    type: transaction.type,
    category: transaction.category,
    account: mockAccountOptions.find(acc => acc.id === transaction.account_id)?.name || 'Unknown Account',
    location: transaction.location,
    isRecurring: transaction.is_recurring,
    status: 'completed' as const, // Default status for mock data
  }));

  // Chart data
  const balanceTrendData = [
    { date: '2024-01-01', balance: 44500, income: 3200, expenses: 2800 },
    { date: '2024-01-02', balance: 44900, income: 0, expenses: 150 },
    { date: '2024-01-03', balance: 45100, income: 500, expenses: 300 },
    { date: '2024-01-04', balance: 45250, income: 0, expenses: 200 },
    { date: '2024-01-05', balance: 45600, income: 800, expenses: 450 },
    { date: '2024-01-06', balance: 45750, income: 0, expenses: 200 },
    { date: '2024-01-07', balance: 45750, income: 0, expenses: 0 }
  ];

  const spendingBreakdownData = [
    { category: 'Groceries', amount: 420, percentage: 25, color: '#3b82f6' },
    { category: 'Bills', amount: 350, percentage: 21, color: '#ef4444' },
    { category: 'Transport', amount: 280, percentage: 17, color: '#10b981' },
    { category: 'Entertainment', amount: 220, percentage: 13, color: '#f59e0b' },
    { category: 'Food & Drink', amount: 180, percentage: 11, color: '#8b5cf6' },
    { category: 'Shopping', amount: 150, percentage: 9, color: '#06b6d4' },
    { category: 'Other', amount: 50, percentage: 3, color: '#84cc16' }
  ];

  const monthlyComparisonData = [
    { month: 'Aug', income: 3200, expenses: 2650, net: 550 },
    { month: 'Sep', income: 3400, expenses: 2780, net: 620 },
    { month: 'Oct', income: 3200, expenses: 2950, net: 250 },
    { month: 'Nov', income: 3600, expenses: 2800, net: 800 },
    { month: 'Dec', income: 3800, expenses: 3200, net: 600 },
    { month: 'Jan', income: 3200, expenses: 2850, net: 350 }
  ];

  const categoryTrendData = [
    { month: 'Aug', Groceries: 380, Bills: 320, Transport: 250, Entertainment: 180 },
    { month: 'Sep', Groceries: 420, Bills: 340, Transport: 280, Entertainment: 200 },
    { month: 'Oct', Groceries: 450, Bills: 360, Transport: 320, Entertainment: 250 },
    { month: 'Nov', Groceries: 400, Bills: 330, Transport: 290, Entertainment: 190 },
    { month: 'Dec', Groceries: 480, Bills: 380, Transport: 350, Entertainment: 300 },
    { month: 'Jan', Groceries: 420, Bills: 350, Transport: 280, Entertainment: 220 }
  ];

  const insightsData = [
    {
      type: 'success' as const,
      title: 'Great savings month!',
      description: 'You saved 12% more than your target this month.',
      action: 'View savings goals'
    },
    {
      type: 'warning' as const,
      title: 'High spending on entertainment',
      description: 'Entertainment spending is 25% above your monthly budget.',
      action: 'Review entertainment expenses'
    },
    {
      type: 'info' as const,
      title: 'Recurring payment due',
      description: 'Your Netflix subscription will renew in 3 days.',
      action: 'Manage subscriptions'
    }
  ];

  return (
    <div>
        {/* Enhanced Stats Overview */}
        <SummaryStats
          totalBalance={mockStats.totalBalance}
          monthlyIncome={mockStats.monthlyIncome}
          monthlyExpenses={mockStats.monthlyExpenses}
          savingsRate={11.2}
          netWorth={mockStats.totalBalance}
        />

        {/* Accounts Overview */}
        <div className="mb-8">
          <AccountOverview
            accounts={transformedAccounts}
            onAddAccount={() => console.log('Add account clicked')}
            onViewAccount={(accountId) => console.log('View account:', accountId)}
          />
        </div>

        {/* Recent Transactions - Collapsible */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm">
            {/* Transaction Section Header */}
            <div 
              className="flex items-center justify-between p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setIsTransactionSectionExpanded(!isTransactionSectionExpanded)}
            >
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                <p className="text-sm text-gray-600">
                  {transformedTransactions.length} transactions • Last updated {new Date().toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {isTransactionSectionExpanded ? 'Hide' : 'Show'}
                </span>
                {isTransactionSectionExpanded ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
            
            {/* Collapsible Transaction Content */}
            {isTransactionSectionExpanded && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <TransactionList
                  transactions={transformedTransactions}
                  accounts={mockAccountOptions}
                  categories={mockCategories}
                  onTransactionClick={(transaction) => console.log('Transaction clicked:', transaction)}
                  showFilters={true}
                  compact={false}
                />
              </div>
            )}
            
            {/* Collapsed State Quick Summary */}
            {!isTransactionSectionExpanded && (
              <div className="p-6 bg-gray-50 animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-semibold text-green-600">
                      £{transformedTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Income This Month</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-red-600">
                      £{Math.abs(transformedTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Expenses This Month</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-blue-600">
                      {transformedTransactions.slice(0, 10).length}
                    </p>
                    <p className="text-sm text-gray-600">Recent Transactions</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Financial Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Balance Trend */}
          <BalanceTrendChart data={balanceTrendData} height={300} />
          
          {/* Spending Breakdown */}
          <SpendingBreakdownChart data={spendingBreakdownData} height={300} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Comparison */}
          <MonthlyComparisonChart data={monthlyComparisonData} height={300} />
          
          {/* Quick Insights */}
          <QuickInsights insights={insightsData} />
        </div>

        {/* Category Trends */}
        <div className="mb-8">
          <CategoryTrendChart 
            data={categoryTrendData} 
            categories={['Groceries', 'Bills', 'Transport', 'Entertainment']}
            height={350}
          />
        </div>

        {/* Financial Projections */}
        <div className="mb-8">
          <FinancialProjections 
            accounts={mockAccounts}
            transactions={mockTransactions}
          />
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <h3 className="font-medium text-gray-900">Add Transaction</h3>
              <p className="text-sm text-gray-600">Manually add income or expense</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <h3 className="font-medium text-gray-900">Import Data</h3>
              <p className="text-sm text-gray-600">Upload CSV or connect bank API</p>
            </button>
            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <h3 className="font-medium text-gray-900">View Projections</h3>
              <p className="text-sm text-gray-600">See cash flow forecasts</p>
            </button>
          </div>
        </div>
    </div>
  );
}
