'use client';

import { useState } from 'react';
import { 
  BanknotesIcon,
  PiggyBankIcon,
  ChartBarIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
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

interface AccountCardProps {
  account: Account;
  showBalance?: boolean;
  onToggleVisibility?: () => void;
  onViewDetails?: (accountId: string) => void;
}

const getAccountIcon = (type: Account['type']) => {
  switch (type) {
    case 'current':
      return BanknotesIcon;
    case 'savings':
      return PiggyBankIcon;
    case 'investment':
      return ChartBarIcon;
    case 'credit':
      return BanknotesIcon;
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
  return date.toLocaleDateString();
};

export function AccountCard({ 
  account, 
  showBalance = true, 
  onToggleVisibility,
  onViewDetails 
}: AccountCardProps) {
  const [isBalanceVisible, setIsBalanceVisible] = useState(showBalance);
  const Icon = getAccountIcon(account.type);
  const typeColorClass = getAccountTypeColor(account.type);

  const handleToggleVisibility = () => {
    setIsBalanceVisible(!isBalanceVisible);
    onToggleVisibility?.();
  };

  const handleViewDetails = () => {
    onViewDetails?.(account.id);
  };

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
            onClick={handleToggleVisibility}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title={isBalanceVisible ? "Hide balance" : "Show balance"}
          >
            {isBalanceVisible ? (
              <EyeSlashIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
          <button 
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={handleViewDetails}
          >
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

        {/* Status Bar */}
        {account.type === 'credit' && account.availableBalance && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Used</span>
              <span>Limit</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${(Math.abs(account.balance) / account.availableBalance) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface AccountOverviewProps {
  accounts: Account[];
  onAddAccount?: () => void;
  onViewAccount?: (accountId: string) => void;
}

export function AccountOverview({ accounts, onAddAccount, onViewAccount }: AccountOverviewProps) {
  const totalBalance = accounts.reduce((sum, account) => {
    if (account.type === 'credit') {
      return sum - Math.abs(account.balance); // Credit balances are typically negative
    }
    return sum + account.balance;
  }, 0);

  const activeAccounts = accounts.filter(account => account.isActive);

  return (
    <div className="space-y-6">
      {/* Summary Header */}
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
            <button
              onClick={onAddAccount}
              className="bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-4 py-2 text-sm font-medium"
            >
              Add Account
            </button>
          </div>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            onViewDetails={onViewAccount}
          />
        ))}
      </div>
    </div>
  );
}