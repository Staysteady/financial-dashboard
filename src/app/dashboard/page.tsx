import { 
  BanknotesIcon, 
  ChartBarIcon, 
  CreditCardIcon, 
  ArrowTrendingUpIcon,
  PlusIcon,
  Cog6ToothIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";

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
    { id: '1', name: 'HSBC Current Account', balance: 2450.32, type: 'current' },
    { id: '2', name: 'Atom Bank Savings', balance: 15000.00, type: 'savings' },
    { id: '3', name: 'Zopa Savings', balance: 8500.00, type: 'savings' },
    { id: '4', name: 'Hargreaves Lansdown ISA', balance: 19800.00, type: 'investment' },
  ];

  const mockRecentTransactions = [
    { id: '1', description: 'Grocery Shopping', amount: -85.32, date: '2024-01-15', category: 'Food' },
    { id: '2', description: 'Salary Payment', amount: 3200.00, date: '2024-01-15', category: 'Income' },
    { id: '3', description: 'Utility Bill', amount: -120.50, date: '2024-01-14', category: 'Bills' },
    { id: '4', description: 'Coffee Shop', amount: -4.50, date: '2024-01-14', category: 'Food' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BanknotesIcon className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Cog6ToothIcon className="h-6 w-6" />
              </button>
              <Link 
                href="/"
                className="text-gray-600 hover:text-gray-900"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <BanknotesIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  £{mockStats.totalBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Income</p>
                <p className="text-2xl font-bold text-gray-900">
                  £{mockStats.monthlyIncome.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Monthly Expenses</p>
                <p className="text-2xl font-bold text-gray-900">
                  £{mockStats.monthlyExpenses.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <CreditCardIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Financial Runway</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockStats.projectedRunway} months
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Accounts Overview */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Accounts</h2>
                <button className="flex items-center text-blue-600 hover:text-blue-700">
                  <PlusIcon className="h-5 w-5 mr-1" />
                  Add Account
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {mockAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{account.name}</p>
                      <p className="text-sm text-gray-600 capitalize">{account.type} account</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      £{account.balance.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                <button className="text-blue-600 hover:text-blue-700">View All</button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {mockRecentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-600">{transaction.category} • {transaction.date}</p>
                    </div>
                    <p className={`font-semibold ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}£{Math.abs(transaction.amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
    </div>
  );
}
