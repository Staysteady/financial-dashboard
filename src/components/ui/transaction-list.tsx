'use client';

import { useState, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarDaysIcon,
  TagIcon,
  BanknotesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant?: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  account: string;
  location?: string;
  isRecurring?: boolean;
  tags?: string[];
  status: 'pending' | 'completed' | 'failed';
}

interface TransactionFilters {
  search: string;
  type: 'all' | 'income' | 'expense' | 'transfer';
  category: string;
  account: string;
  dateRange: 'all' | '7d' | '30d' | '90d' | 'custom';
  amountRange: {
    min: number | null;
    max: number | null;
  };
  status: 'all' | 'pending' | 'completed' | 'failed';
}

interface SortConfig {
  field: keyof Transaction;
  direction: 'asc' | 'desc';
}

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  onTransactionClick?: (transaction: Transaction) => void;
  showFilters?: boolean;
  compact?: boolean;
}

const formatCurrency = (amount: number, currency: string = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getTransactionIcon = (type: Transaction['type']) => {
  switch (type) {
    case 'income':
      return <ArrowDownIcon className="h-4 w-4 text-green-600" />;
    case 'expense':
      return <ArrowUpIcon className="h-4 w-4 text-red-600" />;
    case 'transfer':
      return <BanknotesIcon className="h-4 w-4 text-blue-600" />;
    default:
      return <BanknotesIcon className="h-4 w-4 text-gray-600" />;
  }
};

const getAmountColor = (type: Transaction['type']) => {
  switch (type) {
    case 'income':
      return 'text-green-600';
    case 'expense':
      return 'text-red-600';
    case 'transfer':
      return 'text-blue-600';
    default:
      return 'text-gray-900';
  }
};

const getStatusBadge = (status: Transaction['status']) => {
  const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
  
  switch (status) {
    case 'completed':
      return <span className={cn(baseClasses, "bg-green-100 text-green-800")}>Completed</span>;
    case 'pending':
      return <span className={cn(baseClasses, "bg-yellow-100 text-yellow-800")}>Pending</span>;
    case 'failed':
      return <span className={cn(baseClasses, "bg-red-100 text-red-800")}>Failed</span>;
    default:
      return null;
  }
};

export function TransactionList({
  transactions,
  accounts,
  categories,
  onTransactionClick,
  showFilters = true,
  compact = false
}: TransactionListProps) {
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    type: 'all',
    category: '',
    account: '',
    dateRange: 'all',
    amountRange: { min: null, max: null },
    status: 'all'
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'date',
    direction: 'desc'
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter(transaction => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchMatch = 
          transaction.description.toLowerCase().includes(searchLower) ||
          transaction.merchant?.toLowerCase().includes(searchLower) ||
          transaction.category.toLowerCase().includes(searchLower);
        
        if (!searchMatch) return false;
      }

      // Type filter
      if (filters.type !== 'all' && transaction.type !== filters.type) {
        return false;
      }

      // Category filter
      if (filters.category && transaction.category !== filters.category) {
        return false;
      }

      // Account filter
      if (filters.account && transaction.account !== filters.account) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && transaction.status !== filters.status) {
        return false;
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const transactionDate = new Date(transaction.date);
        const now = new Date();
        let cutoffDate = new Date();

        switch (filters.dateRange) {
          case '7d':
            cutoffDate.setDate(now.getDate() - 7);
            break;
          case '30d':
            cutoffDate.setDate(now.getDate() - 30);
            break;
          case '90d':
            cutoffDate.setDate(now.getDate() - 90);
            break;
        }

        if (transactionDate < cutoffDate) return false;
      }

      // Amount range filter
      if (filters.amountRange.min !== null && Math.abs(transaction.amount) < filters.amountRange.min) {
        return false;
      }
      if (filters.amountRange.max !== null && Math.abs(transaction.amount) > filters.amountRange.max) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.field];
      let bValue = b[sortConfig.field];

      if (sortConfig.field === 'amount') {
        aValue = Math.abs(aValue as number);
        bValue = Math.abs(bValue as number);
      }

      if (sortConfig.field === 'date') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [transactions, filters, sortConfig]);

  const handleSort = (field: keyof Transaction) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      category: '',
      account: '',
      dateRange: 'all',
      amountRange: { min: null, max: null },
      status: 'all'
    });
  };

  const activeFiltersCount = Object.values(filters).reduce((count, value) => {
    if (typeof value === 'string' && value && value !== 'all') return count + 1;
    if (typeof value === 'object' && value !== null && (value.min !== null || value.max !== null)) return count + 1;
    return count;
  }, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Transactions
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredAndSortedTransactions.length})
            </span>
          </h2>
          
          {showFilters && (
            <div className="flex items-center space-x-2">
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear filters ({activeFiltersCount})
                </button>
              )}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
              >
                <FunnelIcon className="h-4 w-4" />
                <span className="text-sm">Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-1">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        {showFilters && (
          <div className="mt-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Advanced Filters */}
        {showFilters && showAdvancedFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    type: e.target.value as TransactionFilters['type'] 
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                <select
                  value={filters.account}
                  onChange={(e) => setFilters(prev => ({ ...prev, account: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All accounts</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.name}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: e.target.value as TransactionFilters['dateRange'] 
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All time</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction List */}
      <div className="overflow-hidden">
        {filteredAndSortedTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
              <BanknotesIcon className="w-full h-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-500">
              {activeFiltersCount > 0 
                ? "Try adjusting your filters to see more results."
                : "Your transactions will appear here once you connect your accounts."
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      {sortConfig.field === 'date' && (
                        sortConfig.direction === 'asc' ? 
                        <ChevronDownIcon className="h-4 w-4" /> : 
                        <ChevronDownIcon className="h-4 w-4 transform rotate-180" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Description</span>
                      {sortConfig.field === 'description' && (
                        sortConfig.direction === 'asc' ? 
                        <ChevronDownIcon className="h-4 w-4" /> : 
                        <ChevronDownIcon className="h-4 w-4 transform rotate-180" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Amount</span>
                      {sortConfig.field === 'amount' && (
                        sortConfig.direction === 'asc' ? 
                        <ChevronDownIcon className="h-4 w-4" /> : 
                        <ChevronDownIcon className="h-4 w-4 transform rotate-180" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={cn(
                      "hover:bg-gray-50 cursor-pointer transition-colors",
                      compact && "py-2"
                    )}
                    onClick={() => onTransactionClick?.(transaction)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getTransactionIcon(transaction.type)}
                        <span className="text-sm text-gray-900">
                          {formatDate(transaction.date)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </div>
                        {transaction.merchant && (
                          <div className="text-sm text-gray-500">
                            {transaction.merchant}
                          </div>
                        )}
                        {transaction.location && (
                          <div className="text-xs text-gray-400">
                            📍 {transaction.location}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <TagIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {transaction.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.account}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={cn("text-sm font-semibold", getAmountColor(transaction.type))}>
                        {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.status)}
                      {transaction.isRecurring && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Recurring
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}