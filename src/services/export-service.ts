'use client';

import { Account, Transaction, Budget, FinancialGoal, Alert, SpendingByCategory, MonthlyTrend } from '@/types';
import { format, parseISO } from 'date-fns';

// CSV Export Service
class CSVExportService {
  private static formatCSVValue(value: any): string {
    if (value === null || value === undefined) return '';
    
    const stringValue = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  private static convertToCSV<T extends Record<string, any>>(
    data: T[],
    headers?: string[]
  ): string {
    if (data.length === 0) return '';

    const csvHeaders = headers || Object.keys(data[0]);
    const headerRow = csvHeaders.join(',');

    const rows = data.map(item => 
      csvHeaders.map(header => this.formatCSVValue(item[header])).join(',')
    );

    return [headerRow, ...rows].join('\n');
  }

  private static downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  // Export transactions to CSV
  static exportTransactions(
    transactions: Transaction[],
    accounts: Account[],
    options?: {
      includeAccountNames?: boolean;
      dateFormat?: string;
      filename?: string;
    }
  ): void {
    const accountMap = new Map(accounts.map(acc => [acc.id, acc.account_name]));
    
    const processedData = transactions.map(transaction => ({
      'Transaction ID': transaction.id,
      'Date': format(parseISO(transaction.date), options?.dateFormat || 'yyyy-MM-dd'),
      'Account': options?.includeAccountNames ? accountMap.get(transaction.account_id) : transaction.account_id,
      'Description': transaction.description,
      'Category': transaction.category,
      'Subcategory': transaction.subcategory || '',
      'Amount': transaction.amount,
      'Currency': transaction.currency,
      'Type': transaction.type,
      'Merchant': transaction.merchant || '',
      'Location': transaction.location || '',
      'Is Recurring': transaction.is_recurring ? 'Yes' : 'No',
      'Created Date': format(parseISO(transaction.created_at), 'yyyy-MM-dd HH:mm:ss')
    }));

    const csv = this.convertToCSV(processedData);
    const filename = options?.filename || `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    this.downloadCSV(csv, filename);
  }

  // Export accounts to CSV
  static exportAccounts(accounts: Account[], options?: { filename?: string }): void {
    const processedData = accounts.map(account => ({
      'Account ID': account.id,
      'Institution': account.institution_name,
      'Account Name': account.account_name,
      'Account Type': account.account_type,
      'Balance': account.balance,
      'Currency': account.currency,
      'Is Active': account.is_active ? 'Yes' : 'No',
      'API Connected': account.api_connected ? 'Yes' : 'No',
      'Last Updated': format(parseISO(account.last_updated), 'yyyy-MM-dd HH:mm:ss'),
      'Created Date': format(parseISO(account.created_at), 'yyyy-MM-dd HH:mm:ss')
    }));

    const csv = this.convertToCSV(processedData);
    const filename = options?.filename || `accounts_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    this.downloadCSV(csv, filename);
  }

  // Export budgets to CSV
  static exportBudgets(budgets: Budget[], options?: { filename?: string }): void {
    const processedData = budgets.map(budget => ({
      'Budget ID': budget.id,
      'Category ID': budget.category_id,
      'Amount': budget.amount,
      'Period': budget.period,
      'Start Date': format(parseISO(budget.start_date), 'yyyy-MM-dd'),
      'End Date': budget.end_date ? format(parseISO(budget.end_date), 'yyyy-MM-dd') : '',
      'Is Active': budget.is_active ? 'Yes' : 'No',
      'Created Date': format(parseISO(budget.created_at), 'yyyy-MM-dd HH:mm:ss')
    }));

    const csv = this.convertToCSV(processedData);
    const filename = options?.filename || `budgets_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    this.downloadCSV(csv, filename);
  }

  // Export financial goals to CSV
  static exportGoals(goals: FinancialGoal[], options?: { filename?: string }): void {
    const processedData = goals.map(goal => ({
      'Goal ID': goal.id,
      'Name': goal.name,
      'Description': goal.description || '',
      'Target Amount': goal.target_amount,
      'Current Amount': goal.current_amount,
      'Progress': `${((goal.current_amount / goal.target_amount) * 100).toFixed(1)}%`,
      'Target Date': format(parseISO(goal.target_date), 'yyyy-MM-dd'),
      'Category': goal.category,
      'Is Achieved': goal.is_achieved ? 'Yes' : 'No',
      'Created Date': format(parseISO(goal.created_at), 'yyyy-MM-dd HH:mm:ss')
    }));

    const csv = this.convertToCSV(processedData);
    const filename = options?.filename || `financial_goals_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    this.downloadCSV(csv, filename);
  }

  // Export spending analysis to CSV
  static exportSpendingAnalysis(
    spendingData: SpendingByCategory[],
    options?: { filename?: string }
  ): void {
    const processedData = spendingData.map(item => ({
      'Category': item.category,
      'Amount': item.amount,
      'Percentage': `${item.percentage.toFixed(1)}%`,
      'Color': item.color
    }));

    const csv = this.convertToCSV(processedData);
    const filename = options?.filename || `spending_analysis_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    this.downloadCSV(csv, filename);
  }

  // Export monthly trends to CSV
  static exportMonthlyTrends(
    trendsData: MonthlyTrend[],
    options?: { filename?: string }
  ): void {
    const processedData = trendsData.map(trend => ({
      'Month': trend.month,
      'Income': trend.income,
      'Expenses': trend.expenses,
      'Net Flow': trend.netFlow,
      'Net Flow Status': trend.netFlow >= 0 ? 'Positive' : 'Negative'
    }));

    const csv = this.convertToCSV(processedData);
    const filename = options?.filename || `monthly_trends_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    this.downloadCSV(csv, filename);
  }

  // Export alerts to CSV
  static exportAlerts(alerts: Alert[], options?: { filename?: string }): void {
    const processedData = alerts.map(alert => ({
      'Alert ID': alert.id,
      'Type': alert.type,
      'Title': alert.title,
      'Message': alert.message,
      'Threshold Value': alert.threshold_value || '',
      'Is Active': alert.is_active ? 'Yes' : 'No',
      'Is Read': alert.is_read ? 'Yes' : 'No',
      'Triggered At': alert.triggered_at ? format(parseISO(alert.triggered_at), 'yyyy-MM-dd HH:mm:ss') : '',
      'Created Date': format(parseISO(alert.created_at), 'yyyy-MM-dd HH:mm:ss')
    }));

    const csv = this.convertToCSV(processedData);
    const filename = options?.filename || `alerts_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    this.downloadCSV(csv, filename);
  }

  // Export custom data to CSV (generic function)
  static exportCustomData<T extends Record<string, any>>(
    data: T[],
    headers: string[],
    filename: string
  ): void {
    const csv = this.convertToCSV(data, headers);
    this.downloadCSV(csv, filename);
  }

  // Generate comprehensive financial report CSV
  static exportComprehensiveReport(
    data: {
      accounts: Account[];
      transactions: Transaction[];
      budgets: Budget[];
      goals: FinancialGoal[];
      spendingAnalysis: SpendingByCategory[];
      monthlyTrends: MonthlyTrend[];
    },
    options?: { 
      filename?: string;
      includeMetadata?: boolean;
    }
  ): void {
    const reportDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const filename = options?.filename || `financial_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    let csvContent = '';
    
    // Add metadata if requested
    if (options?.includeMetadata) {
      csvContent += `Financial Dashboard Report\n`;
      csvContent += `Generated: ${reportDate}\n`;
      csvContent += `Accounts: ${data.accounts.length}\n`;
      csvContent += `Transactions: ${data.transactions.length}\n`;
      csvContent += `Active Budgets: ${data.budgets.filter(b => b.is_active).length}\n`;
      csvContent += `Goals: ${data.goals.length}\n`;
      csvContent += `\n`;
    }

    // Summary section
    const totalBalance = data.accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const monthlyIncome = data.transactions
      .filter(t => t.type === 'income' && new Date(t.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = data.transactions
      .filter(t => t.type === 'expense' && new Date(t.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reduce((sum, t) => sum + t.amount, 0);

    csvContent += `FINANCIAL SUMMARY\n`;
    csvContent += `Metric,Value\n`;
    csvContent += `Total Balance,${totalBalance}\n`;
    csvContent += `Monthly Income,${monthlyIncome}\n`;
    csvContent += `Monthly Expenses,${monthlyExpenses}\n`;
    csvContent += `Net Monthly Flow,${monthlyIncome - monthlyExpenses}\n`;
    csvContent += `\n`;

    // Add each section
    csvContent += `ACCOUNTS\n`;
    csvContent += this.convertToCSV(data.accounts.map(acc => ({
      'Institution': acc.institution_name,
      'Account Name': acc.account_name,
      'Type': acc.account_type,
      'Balance': acc.balance,
      'Currency': acc.currency,
      'Status': acc.is_active ? 'Active' : 'Inactive'
    })));
    csvContent += `\n\n`;

    csvContent += `SPENDING BY CATEGORY\n`;
    csvContent += this.convertToCSV(data.spendingAnalysis);
    csvContent += `\n\n`;

    csvContent += `MONTHLY TRENDS\n`;
    csvContent += this.convertToCSV(data.monthlyTrends);
    csvContent += `\n\n`;

    this.downloadCSV(csvContent, filename);
  }
}

export default CSVExportService;