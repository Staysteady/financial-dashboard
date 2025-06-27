'use client';

import { useState, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BanknotesIcon,
  TagIcon,
  CalendarDaysIcon
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
  status: 'pending' | 'completed' | 'failed';
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Salary Payment',
    merchant: 'Acme Corp',
    amount: 3200.00,
    currency: 'GBP',
    type: 'income',
    category: 'Salary',
    account: 'HSBC Current Account',
    status: 'completed'
  },
  {
    id: '2',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Grocery Shopping',
    merchant: 'Tesco',
    amount: 85.42,
    currency: 'GBP',
    type: 'expense',
    category: 'Groceries',
    account: 'HSBC Current Account',
    location: 'London, UK',
    status: 'completed'
  },
  {
    id: '3',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Coffee Shop',
    merchant: 'Starbucks',
    amount: 4.50,
    currency: 'GBP',
    type: 'expense',
    category: 'Food & Drink',
    account: 'Revolut Business',
    location: 'London, UK',
    status: 'completed'
  },
  {
    id: '4',
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Transfer to Savings',
    amount: 500.00,
    currency: 'GBP',
    type: 'transfer',
    category: 'Transfer',
    account: 'HSBC Current Account',
    status: 'completed'
  },
  {
    id: '5',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Rent Payment',
    merchant: 'Property Management Ltd',
    amount: 1200.00,
    currency: 'GBP',
    type: 'expense',
    category: 'Housing',
    account: 'HSBC Current Account',
    status: 'completed'
  }
];

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

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [sortField, setSortField] = useState<keyof Transaction>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = mockTransactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.merchant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || transaction.type === filterType;
      
      return matchesSearch && matchesType;
    });

    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'amount') {
        aValue = Math.abs(aValue as number);
        bValue = Math.abs(bValue as number);
      }

      if (sortField === 'date') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [searchTerm, filterType, sortField, sortDirection]);

  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const totalIncome = mockTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = mockTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-600">View and manage your financial transactions</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <ArrowDownIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-50 rounded-lg">
              <ArrowUpIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Net Flow</p>
              <p className={cn("text-2xl font-bold", totalIncome - totalExpenses >= 0 ? "text-green-600" : "text-red-600")}>
                {formatCurrency(totalIncome - totalExpenses)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
              <option value="transfer">Transfers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                    {sortField === 'date' && (
                      <ChevronDownIcon className={cn("h-4 w-4", sortDirection === 'desc' ? '' : 'transform rotate-180')} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('description')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Description</span>
                    {sortField === 'description' && (
                      <ChevronDownIcon className={cn("h-4 w-4", sortDirection === 'desc' ? '' : 'transform rotate-180')} />
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
                    {sortField === 'amount' && (
                      <ChevronDownIcon className={cn("h-4 w-4", sortDirection === 'desc' ? '' : 'transform rotate-180')} />
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
                <tr key={transaction.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredAndSortedTransactions.length === 0 && (
          <div className="p-8 text-center">
            <BanknotesIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
