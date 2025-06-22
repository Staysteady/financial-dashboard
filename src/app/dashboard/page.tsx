import { 
  BanknotesIcon, 
  ChartBarIcon, 
  CreditCardIcon, 
  ArrowTrendingUpIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
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

export default function DashboardPage() {
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
      name: 'HSBC Current Account', 
      balance: 2450.32, 
      type: 'current' as const,
      currency: 'GBP',
      lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      isActive: true,
      provider: 'HSBC',
      accountNumber: '12345678',
      sortCode: '40-01-23',
      availableBalance: 2450.32,
      change24h: 125.50,
      changePercent: 5.4
    },
    { 
      id: '2', 
      name: 'Atom Bank Savings', 
      balance: 15000.00, 
      type: 'savings' as const,
      currency: 'GBP',
      lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      isActive: true,
      provider: 'Atom Bank',
      accountNumber: '87654321',
      sortCode: '60-83-01',
      change24h: 2.50,
      changePercent: 0.02
    },
    { 
      id: '3', 
      name: 'Zopa Savings', 
      balance: 8500.00, 
      type: 'savings' as const,
      currency: 'GBP',
      lastUpdated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      isActive: true,
      provider: 'Zopa',
      accountNumber: '11223344',
      change24h: 1.85,
      changePercent: 0.02
    },
    { 
      id: '4', 
      name: 'Hargreaves Lansdown ISA', 
      balance: 19800.00, 
      type: 'investment' as const,
      currency: 'GBP',
      lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      isActive: true,
      provider: 'Hargreaves Lansdown',
      accountNumber: '55667788',
      change24h: -150.25,
      changePercent: -0.75
    },
    { 
      id: '5', 
      name: 'Amex Credit Card', 
      balance: -850.00, 
      type: 'credit' as const,
      currency: 'GBP',
      lastUpdated: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      isActive: true,
      provider: 'American Express',
      accountNumber: '99887766',
      availableBalance: 5000.00,
      change24h: -45.20,
      changePercent: 5.6
    }
  ];

  const mockTransactions = [
    {
      id: '1',
      date: '2024-01-15',
      description: 'Grocery Shopping',
      merchant: 'Tesco Express',
      amount: 85.32,
      currency: 'GBP',
      type: 'expense' as const,
      category: 'Groceries',
      account: 'HSBC Current Account',
      location: 'London, UK',
      isRecurring: false,
      tags: ['essential'],
      status: 'completed' as const
    },
    {
      id: '2',
      date: '2024-01-15',
      description: 'Salary Payment',
      merchant: 'TechCorp Ltd',
      amount: 3200.00,
      currency: 'GBP',
      type: 'income' as const,
      category: 'Salary',
      account: 'HSBC Current Account',
      isRecurring: true,
      tags: ['salary', 'monthly'],
      status: 'completed' as const
    },
    {
      id: '3',
      date: '2024-01-14',
      description: 'Utility Bill',
      merchant: 'British Gas',
      amount: 120.50,
      currency: 'GBP',
      type: 'expense' as const,
      category: 'Bills',
      account: 'HSBC Current Account',
      isRecurring: true,
      tags: ['bills', 'essential'],
      status: 'completed' as const
    },
    {
      id: '4',
      date: '2024-01-14',
      description: 'Coffee Shop',
      merchant: 'Costa Coffee',
      amount: 4.50,
      currency: 'GBP',
      type: 'expense' as const,
      category: 'Food & Drink',
      account: 'HSBC Current Account',
      location: 'Central London',
      status: 'completed' as const
    },
    {
      id: '5',
      date: '2024-01-13',
      description: 'Netflix Subscription',
      merchant: 'Netflix',
      amount: 10.99,
      currency: 'GBP',
      type: 'expense' as const,
      category: 'Entertainment',
      account: 'HSBC Current Account',
      isRecurring: true,
      tags: ['subscription'],
      status: 'completed' as const
    },
    {
      id: '6',
      date: '2024-01-12',
      description: 'Fuel',
      merchant: 'Shell',
      amount: 75.20,
      currency: 'GBP',
      type: 'expense' as const,
      category: 'Transport',
      account: 'HSBC Current Account',
      location: 'M25 Services',
      status: 'completed' as const
    },
    {
      id: '7',
      date: '2024-01-12',
      description: 'Freelance Payment',
      merchant: 'Client ABC',
      amount: 500.00,
      currency: 'GBP',
      type: 'income' as const,
      category: 'Freelance',
      account: 'HSBC Current Account',
      tags: ['freelance'],
      status: 'pending' as const
    },
    {
      id: '8',
      date: '2024-01-10',
      description: 'Transfer to Savings',
      amount: 500.00,
      currency: 'GBP',
      type: 'transfer' as const,
      category: 'Savings',
      account: 'HSBC Current Account',
      status: 'completed' as const
    }
  ];

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

  const mockAccountOptions = mockAccounts.map(account => ({
    id: account.id,
    name: account.name
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
            accounts={mockAccounts}
            onAddAccount={() => console.log('Add account clicked')}
            onViewAccount={(accountId) => console.log('View account:', accountId)}
          />
        </div>

        {/* Recent Transactions */}
        <div className="mb-8">
          <TransactionList
            transactions={mockTransactions}
            accounts={mockAccountOptions}
            categories={mockCategories}
            onTransactionClick={(transaction) => console.log('Transaction clicked:', transaction)}
            showFilters={true}
            compact={false}
          />
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
