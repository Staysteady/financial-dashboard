'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ReportBuilder from '@/components/ui/report-builder';
import CSVExportService from '@/services/export-service';
import ExcelExportService from '@/services/excel-export-service';
import PDFExportService from '@/services/pdf-export-service';
import { Account, Transaction, Budget, FinancialGoal, SpendingByCategory, MonthlyTrend } from '@/types';
import { 
  DocumentTextIcon,
  TableCellsIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  PresentationChartBarIcon,
  BuildingLibraryIcon,
  CreditCardIcon,
  TrophyIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Mock data for demonstration
const mockAccounts: Account[] = [
  { 
    id: 'acc-1', 
    user_id: 'user1',
    institution_name: 'HSBC',
    account_name: 'HSBC Current Account', 
    balance: 2840.32, 
    account_type: 'current',
    currency: 'GBP',
    last_updated: new Date().toISOString(),
    is_active: true,
    api_connected: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  { 
    id: 'acc-2', 
    user_id: 'user1',
    institution_name: 'Atom Bank',
    account_name: 'Atom Bank Savings', 
    balance: 15750.00, 
    account_type: 'savings',
    currency: 'GBP',
    last_updated: new Date().toISOString(),
    is_active: true,
    api_connected: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  { 
    id: 'acc-3', 
    user_id: 'user1',
    institution_name: 'Zopa Bank',
    account_name: 'Zopa Credit Card', 
    balance: -1250.45, 
    account_type: 'credit',
    currency: 'GBP',
    last_updated: new Date().toISOString(),
    is_active: true,
    api_connected: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const generateMockTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const categories = ['Shopping', 'Groceries', 'Transport', 'Entertainment', 'Bills', 'Salary', 'Freelance'];
  const merchants = ['Tesco', 'ASDA', 'Amazon', 'Uber', 'Netflix', 'British Gas', 'Acme Corp', 'TfL'];
  
  for (let i = 0; i < 150; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 90)); // Last 3 months
    
    const isIncome = Math.random() < 0.15; // 15% chance of income
    const category = categories[Math.floor(Math.random() * categories.length)];
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    
    transactions.push({
      id: `txn-${i}`,
      account_id: mockAccounts[Math.floor(Math.random() * mockAccounts.length)].id,
      amount: isIncome ? 1000 + Math.random() * 2000 : 10 + Math.random() * 300,
      currency: 'GBP',
      description: isIncome ? `${merchant} Salary Payment` : `${merchant} Purchase`,
      category: isIncome ? 'Salary' : category,
      date: date.toISOString(),
      type: isIncome ? 'income' : 'expense',
      is_recurring: Math.random() < 0.2,
      merchant,
      location: 'London, UK',
      created_at: date.toISOString(),
      updated_at: date.toISOString()
    });
  }
  
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const mockTransactions = generateMockTransactions();

const mockBudgets: Budget[] = [
  {
    id: 'budget-1',
    user_id: 'user1',
    category_id: 'cat-shopping',
    amount: 500,
    period: 'monthly',
    start_date: startOfMonth(new Date()).toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'budget-2',
    user_id: 'user1',
    category_id: 'cat-groceries',
    amount: 400,
    period: 'monthly',
    start_date: startOfMonth(new Date()).toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const mockGoals: FinancialGoal[] = [
  {
    id: 'goal-1',
    user_id: 'user1',
    name: 'Emergency Fund',
    description: 'Save 6 months of expenses',
    target_amount: 20000,
    current_amount: 15750,
    target_date: new Date(2024, 11, 31).toISOString(),
    category: 'emergency_fund',
    is_achieved: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'goal-2',
    user_id: 'user1',
    name: 'Holiday Fund',
    description: 'Summer vacation savings',
    target_amount: 3000,
    current_amount: 1200,
    target_date: new Date(2024, 6, 1).toISOString(),
    category: 'savings',
    is_achieved: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const generateSpendingAnalysis = (transactions: Transaction[]): SpendingByCategory[] => {
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const categoryTotals = expenseTransactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  
  const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
  
  return Object.entries(categoryTotals)
    .map(([category, amount], index) => ({
      category,
      amount,
      percentage: (amount / totalExpenses) * 100,
      color: colors[index % colors.length]
    }))
    .sort((a, b) => b.amount - a.amount);
};

const generateMonthlyTrends = (transactions: Transaction[]): MonthlyTrend[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const trends: MonthlyTrend[] = [];
  
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    
    const monthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= monthStart && transactionDate <= monthEnd;
    });
    
    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    trends.push({
      month: format(monthDate, 'MMM yyyy'),
      income,
      expenses,
      netFlow: income - expenses
    });
  }
  
  return trends;
};

const mockSpendingAnalysis = generateSpendingAnalysis(mockTransactions);
const mockMonthlyTrends = generateMonthlyTrends(mockTransactions);

type ReportSection = 'builder' | 'quick-exports' | 'templates';

const quickExportOptions = [
  {
    id: 'current-month-csv',
    title: 'Current Month Transactions',
    description: 'Export this month\'s transactions to CSV',
    icon: TableCellsIcon,
    format: 'CSV',
    action: 'exportCurrentMonthCSV'
  },
  {
    id: 'all-accounts-excel',
    title: 'Account Summary',
    description: 'Export all account details to Excel',
    icon: BuildingLibraryIcon,
    format: 'Excel',
    action: 'exportAccountsExcel'
  },
  {
    id: 'spending-analysis-pdf',
    title: 'Spending Analysis',
    description: 'Generate spending analysis PDF report',
    icon: ChartBarIcon,
    format: 'PDF',
    action: 'exportSpendingPDF'
  },
  {
    id: 'monthly-summary-pdf',
    title: 'Monthly Summary',
    description: 'Complete monthly financial summary',
    icon: CalendarDaysIcon,
    format: 'PDF',
    action: 'exportMonthlySummary'
  }
];

export default function ReportsPage() {
  const [activeSection, setActiveSection] = useState<ReportSection>('builder');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [exportStats, setExportStats] = useState({
    totalExports: 0,
    lastExport: null as string | null
  });

  const handleQuickExport = async (action: string) => {
    setIsExporting(action);
    
    try {
      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const currentMonthTransactions = mockTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      });

      switch (action) {
        case 'exportCurrentMonthCSV':
          CSVExportService.exportTransactions(
            currentMonthTransactions, 
            mockAccounts, 
            {
              includeAccountNames: true,
              filename: `transactions_${format(currentMonth, 'yyyy-MM')}.csv`
            }
          );
          break;
          
        case 'exportAccountsExcel':
          await ExcelExportService.exportAccounts(mockAccounts, {
            filename: `accounts_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
          });
          break;
          
        case 'exportSpendingPDF':
          await PDFExportService.exportDashboardSummary({
            accounts: mockAccounts,
            transactions: mockTransactions,
            spendingAnalysis: mockSpendingAnalysis,
            monthlyTrends: mockMonthlyTrends
          }, {
            filename: `spending_analysis_${format(new Date(), 'yyyy-MM-dd')}.pdf`
          });
          break;
          
        case 'exportMonthlySummary':
          await PDFExportService.exportMonthlyReport({
            accounts: mockAccounts,
            transactions: mockTransactions,
            spendingAnalysis: mockSpendingAnalysis
          }, currentMonth, {
            filename: `monthly_summary_${format(currentMonth, 'yyyy-MM')}.pdf`
          });
          break;
      }
      
      // Update export stats
      setExportStats(prev => ({
        totalExports: prev.totalExports + 1,
        lastExport: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      }));
      
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const sections = [
    { id: 'builder' as ReportSection, label: 'Report Builder', icon: DocumentTextIcon },
    { id: 'quick-exports' as ReportSection, label: 'Quick Exports', icon: ArrowDownTrayIcon },
    { id: 'templates' as ReportSection, label: 'Templates', icon: DocumentIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Export & Reporting</h1>
            <p className="text-gray-600">Export your financial data and generate comprehensive reports</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Exports</div>
            <div className="text-2xl font-bold text-blue-600">{exportStats.totalExports}</div>
            {exportStats.lastExport && (
              <div className="text-xs text-gray-400">Last: {exportStats.lastExport}</div>
            )}
          </div>
        </div>
      </div>

      {/* Data Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BuildingLibraryIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{mockAccounts.length}</p>
                <p className="text-sm text-gray-600">Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCardIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{mockTransactions.length}</p>
                <p className="text-sm text-gray-600">Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrophyIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{mockGoals.length}</p>
                <p className="text-sm text-gray-600">Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(mockAccounts.reduce((sum, acc) => sum + acc.balance, 0))}
                </p>
                <p className="text-sm text-gray-600">Total Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {sections.map((section) => {
                const IconComponent = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeSection === section.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </CardContent>
      </Card>

      {/* Section Content */}
      {activeSection === 'builder' && (
        <ReportBuilder
          accounts={mockAccounts}
          transactions={mockTransactions}
          budgets={mockBudgets}
          goals={mockGoals}
          spendingAnalysis={mockSpendingAnalysis}
          monthlyTrends={mockMonthlyTrends}
        />
      )}

      {activeSection === 'quick-exports' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Export Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickExportOptions.map((option) => {
                  const IconComponent = option.icon;
                  const isExportingThis = isExporting === option.action;
                  
                  return (
                    <div
                      key={option.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <IconComponent className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{option.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                            <span className="inline-block mt-2 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded">
                              {option.format}
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleQuickExport(option.action)}
                          disabled={isExporting !== null}
                          size="sm"
                          className="ml-4"
                        >
                          {isExportingThis ? (
                            'Exporting...'
                          ) : (
                            <>
                              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                              Export
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Data Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recent Transactions</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      {mockTransactions.slice(0, 5).map(transaction => (
                        <div key={transaction.id} className="flex justify-between items-center text-sm">
                          <div>
                            <span className="font-medium">{transaction.description}</span>
                            <span className="text-gray-500 ml-2">{transaction.category}</span>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${
                              transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(transaction.date), 'MMM dd')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === 'templates' && (
        <Card>
          <CardHeader>
            <CardTitle>Report Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <PresentationChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Custom Templates Coming Soon</h3>
              <p className="text-gray-600 mb-4">
                Save your favorite report configurations as reusable templates.
              </p>
              <p className="text-sm text-gray-500">
                Use the Report Builder to create custom reports for now.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}