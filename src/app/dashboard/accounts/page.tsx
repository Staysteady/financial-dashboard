'use client';

import { useState } from 'react';
import { 
  BanknotesIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CreditCardIcon,
  ChartBarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
  type: 'current' | 'savings' | 'investment' | 'credit';
  balance: number;
  currency: string;
  lastUpdated: string;
  isActive: boolean;
  provider: string;
  accountNumber?: string;
  sortCode?: string;
  availableBalance?: number;
  change24h?: number;
  changePercent?: number;
}

const mockAccounts: Account[] = [
  {
    id: '1',
    name: 'HSBC Current Account',
    type: 'current',
    balance: 2450.32,
    currency: 'GBP',
    lastUpdated: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    isActive: true,
    provider: 'HSBC',
    accountNumber: '12345678',
    sortCode: '40-47-84',
    change24h: 125.50,
    changePercent: 5.4
  },
  {
    id: '2',
    name: 'Revolut Business',
    type: 'current',
    balance: 8750.00,
    currency: 'GBP',
    lastUpdated: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    isActive: true,
    provider: 'Revolut',
    accountNumber: '87654321',
    change24h: -45.20,
    changePercent: -0.5
  },
  {
    id: '3',
    name: 'Savings Account',
    type: 'savings',
    balance: 15000.00,
    currency: 'GBP',
    lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    provider: 'Atom Bank',
    accountNumber: '11223344',
    change24h: 12.50,
    changePercent: 0.08
  },
  {
    id: '4',
    name: 'Investment ISA',
    type: 'investment',
    balance: 25000.00,
    currency: 'GBP',
    lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    provider: 'Hargreaves Lansdown',
    accountNumber: '55667788',
    change24h: 450.00,
    changePercent: 1.8
  }
];

const formatCurrency = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatLastUpdated = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const getAccountIcon = (type: Account['type']) => {
  switch (type) {
    case 'current':
      return BanknotesIcon;
    case 'savings':
      return CurrencyDollarIcon;
    case 'investment':
      return ChartBarIcon;
    case 'credit':
      return CreditCardIcon;
    default:
      return BanknotesIcon;
  }
};

const getAccountTypeColor = (type: Account['type']) => {
  switch (type) {
    case 'current':
      return 'text-blue-600 bg-blue-50';
    case 'savings':
      return 'text-green-600 bg-green-50';
    case 'investment':
      return 'text-purple-600 bg-purple-50';
    case 'credit':
      return 'text-orange-600 bg-orange-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

function AccountCard({ account }: { account: Account }) {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const Icon = getAccountIcon(account.type);
  const typeColorClass = getAccountTypeColor(account.type);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn("p-2 rounded-lg", typeColorClass)}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{account.name}</h3>
            <p className="text-sm text-gray-600 capitalize">{account.type} account</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsBalanceVisible(!isBalanceVisible)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title={isBalanceVisible ? "Hide balance" : "Show balance"}
          >
            {isBalanceVisible ? (
              <EyeSlashIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <EllipsisHorizontalIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Main Balance */}
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {isBalanceVisible ? formatCurrency(account.balance, account.currency) : '••••••'}
            </p>
            {account.availableBalance !== undefined && account.availableBalance !== account.balance && (
              <p className="text-sm text-gray-600">
                Available: {isBalanceVisible ? formatCurrency(account.availableBalance, account.currency) : '••••••'}
              </p>
            )}
          </div>
          
          {/* 24h Change */}
          {account.change24h !== undefined && isBalanceVisible && (
            <div className={cn(
              "flex items-center space-x-1 text-sm font-medium",
              account.change24h >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {account.change24h >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4" />
              )}
              <span>
                {formatCurrency(Math.abs(account.change24h), account.currency)}
                {account.changePercent && (
                  <span className="ml-1">
                    ({account.changePercent > 0 ? '+' : ''}{account.changePercent.toFixed(2)}%)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Account Details */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <span>•</span>
              <span>{account.provider}</span>
            </span>
            {account.accountNumber && (
              <span>••••{account.accountNumber.slice(-4)}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              account.isActive ? "bg-green-400" : "bg-gray-300"
            )} />
            <span className="text-xs">
              {formatLastUpdated(account.lastUpdated)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const totalBalance = mockAccounts.reduce((sum, account) => sum + account.balance, 0);
  const activeAccounts = mockAccounts.filter(account => account.isActive);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-600">Manage your connected bank accounts</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <PlusIcon className="h-4 w-4" />
          <span>Add Account</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Total Balance</h2>
            <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
            <p className="text-blue-100 mt-1">
              Across {activeAccounts.length} active accounts
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">Last updated</div>
            <div className="text-lg font-semibold">Just now</div>
          </div>
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockAccounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}
