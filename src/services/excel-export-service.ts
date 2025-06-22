'use client';

import { Account, Transaction, Budget, FinancialGoal, SpendingByCategory, MonthlyTrend } from '@/types';
import { format, parseISO } from 'date-fns';

// Excel Export Service using SheetJS
class ExcelExportService {
  private static loadSheetJS(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).XLSX) {
        resolve((window as any).XLSX);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.onload = () => {
        resolve((window as any).XLSX);
      };
      script.onerror = () => {
        reject(new Error('Failed to load SheetJS library'));
      };
      document.head.appendChild(script);
    });
  }

  private static async downloadExcel(workbook: any, filename: string): Promise<void> {
    const XLSX = await this.loadSheetJS();
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
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

  private static formatCurrency(value: number, currency: string = 'GBP'): string {
    return new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency 
    }).format(value);
  }

  private static createStyledWorksheet(XLSX: any, data: any[], headers: string[], title?: string): any {
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    
    let currentRow = 0;
    
    // Add title if provided
    if (title) {
      XLSX.utils.sheet_add_aoa(worksheet, [[title]], { origin: `A${currentRow + 1}` });
      currentRow += 2;
    }
    
    // Add headers
    if (headers.length > 0) {
      XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: `A${currentRow + 1}` });
      currentRow += 1;
    }
    
    // Add data
    if (data.length > 0) {
      const dataRows = data.map(item => 
        headers.map(header => item[header] || '')
      );
      XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: `A${currentRow + 1}` });
    }
    
    // Set column widths
    const colWidths = headers.map(() => ({ wch: 15 }));
    worksheet['!cols'] = colWidths;
    
    return worksheet;
  }

  // Export transactions to Excel
  static async exportTransactions(
    transactions: Transaction[],
    accounts: Account[],
    options?: {
      includeAccountNames?: boolean;
      filename?: string;
      includeCharts?: boolean;
    }
  ): Promise<void> {
    const XLSX = await this.loadSheetJS();
    const accountMap = new Map(accounts.map(acc => [acc.id, acc.account_name]));
    
    const workbook = XLSX.utils.book_new();
    
    // Process transactions data
    const transactionData = transactions.map(transaction => ({
      'Date': format(parseISO(transaction.date), 'yyyy-MM-dd'),
      'Account': options?.includeAccountNames ? accountMap.get(transaction.account_id) : transaction.account_id,
      'Description': transaction.description,
      'Category': transaction.category,
      'Subcategory': transaction.subcategory || '',
      'Amount': transaction.amount,
      'Currency': transaction.currency,
      'Type': transaction.type,
      'Formatted Amount': this.formatCurrency(transaction.amount, transaction.currency),
      'Merchant': transaction.merchant || '',
      'Location': transaction.location || '',
      'Recurring': transaction.is_recurring ? 'Yes' : 'No'
    }));
    
    const headers = Object.keys(transactionData[0] || {});
    const transactionSheet = this.createStyledWorksheet(
      XLSX, 
      transactionData, 
      headers, 
      'Transaction History'
    );
    
    XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transactions');
    
    // Add summary sheet
    const summaryData = [
      { 'Metric': 'Total Transactions', 'Value': transactions.length },
      { 'Metric': 'Total Income', 'Value': this.formatCurrency(
        transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
      )},
      { 'Metric': 'Total Expenses', 'Value': this.formatCurrency(
        transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      )},
      { 'Metric': 'Net Flow', 'Value': this.formatCurrency(
        transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)
      )}
    ];
    
    const summarySheet = this.createStyledWorksheet(
      XLSX, 
      summaryData, 
      ['Metric', 'Value'], 
      'Transaction Summary'
    );
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Category breakdown sheet
    const categoryBreakdown = transactions
      .reduce((acc, t) => {
        if (!acc[t.category]) {
          acc[t.category] = { total: 0, count: 0 };
        }
        acc[t.category].total += t.type === 'expense' ? t.amount : 0;
        acc[t.category].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);
    
    const categoryData = Object.entries(categoryBreakdown).map(([category, data]) => ({
      'Category': category,
      'Total Amount': this.formatCurrency(data.total),
      'Transaction Count': data.count,
      'Average Amount': this.formatCurrency(data.total / data.count)
    }));
    
    const categorySheet = this.createStyledWorksheet(
      XLSX, 
      categoryData, 
      ['Category', 'Total Amount', 'Transaction Count', 'Average Amount'], 
      'Spending by Category'
    );
    
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories');
    
    const filename = options?.filename || `transactions_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    await this.downloadExcel(workbook, filename);
  }

  // Export accounts to Excel
  static async exportAccounts(accounts: Account[], options?: { filename?: string }): Promise<void> {
    const XLSX = await this.loadSheetJS();
    const workbook = XLSX.utils.book_new();
    
    const accountData = accounts.map(account => ({
      'Institution': account.institution_name,
      'Account Name': account.account_name,
      'Account Type': account.account_type,
      'Balance': account.balance,
      'Formatted Balance': this.formatCurrency(account.balance, account.currency),
      'Currency': account.currency,
      'Status': account.is_active ? 'Active' : 'Inactive',
      'API Connected': account.api_connected ? 'Yes' : 'No',
      'Last Updated': format(parseISO(account.last_updated), 'yyyy-MM-dd HH:mm:ss')
    }));
    
    const headers = Object.keys(accountData[0] || {});
    const accountSheet = this.createStyledWorksheet(
      XLSX, 
      accountData, 
      headers, 
      'Account Overview'
    );
    
    XLSX.utils.book_append_sheet(workbook, accountSheet, 'Accounts');
    
    // Add summary
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const summaryData = [
      { 'Metric': 'Total Accounts', 'Value': accounts.length },
      { 'Metric': 'Active Accounts', 'Value': accounts.filter(a => a.is_active).length },
      { 'Metric': 'API Connected', 'Value': accounts.filter(a => a.api_connected).length },
      { 'Metric': 'Total Balance', 'Value': this.formatCurrency(totalBalance) }
    ];
    
    const summarySheet = this.createStyledWorksheet(
      XLSX, 
      summaryData, 
      ['Metric', 'Value'], 
      'Account Summary'
    );
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    const filename = options?.filename || `accounts_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    await this.downloadExcel(workbook, filename);
  }

  // Export budgets to Excel
  static async exportBudgets(budgets: Budget[], options?: { filename?: string }): Promise<void> {
    const XLSX = await this.loadSheetJS();
    const workbook = XLSX.utils.book_new();
    
    const budgetData = budgets.map(budget => ({
      'Category ID': budget.category_id,
      'Budget Amount': budget.amount,
      'Formatted Amount': this.formatCurrency(budget.amount),
      'Period': budget.period,
      'Start Date': format(parseISO(budget.start_date), 'yyyy-MM-dd'),
      'End Date': budget.end_date ? format(parseISO(budget.end_date), 'yyyy-MM-dd') : 'Ongoing',
      'Status': budget.is_active ? 'Active' : 'Inactive',
      'Created Date': format(parseISO(budget.created_at), 'yyyy-MM-dd')
    }));
    
    const headers = Object.keys(budgetData[0] || {});
    const budgetSheet = this.createStyledWorksheet(
      XLSX, 
      budgetData, 
      headers, 
      'Budget Overview'
    );
    
    XLSX.utils.book_append_sheet(workbook, budgetSheet, 'Budgets');
    
    const filename = options?.filename || `budgets_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    await this.downloadExcel(workbook, filename);
  }

  // Export financial goals to Excel
  static async exportGoals(goals: FinancialGoal[], options?: { filename?: string }): Promise<void> {
    const XLSX = await this.loadSheetJS();
    const workbook = XLSX.utils.book_new();
    
    const goalData = goals.map(goal => ({
      'Goal Name': goal.name,
      'Description': goal.description || '',
      'Target Amount': this.formatCurrency(goal.target_amount),
      'Current Amount': this.formatCurrency(goal.current_amount),
      'Progress': `${((goal.current_amount / goal.target_amount) * 100).toFixed(1)}%`,
      'Remaining': this.formatCurrency(goal.target_amount - goal.current_amount),
      'Target Date': format(parseISO(goal.target_date), 'yyyy-MM-dd'),
      'Category': goal.category,
      'Status': goal.is_achieved ? 'Achieved' : 'In Progress',
      'Created Date': format(parseISO(goal.created_at), 'yyyy-MM-dd')
    }));
    
    const headers = Object.keys(goalData[0] || {});
    const goalSheet = this.createStyledWorksheet(
      XLSX, 
      goalData, 
      headers, 
      'Financial Goals'
    );
    
    XLSX.utils.book_append_sheet(workbook, goalSheet, 'Goals');
    
    const filename = options?.filename || `financial_goals_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    await this.downloadExcel(workbook, filename);
  }

  // Export comprehensive financial report
  static async exportComprehensiveReport(
    data: {
      accounts: Account[];
      transactions: Transaction[];
      budgets: Budget[];
      goals: FinancialGoal[];
      spendingAnalysis: SpendingByCategory[];
      monthlyTrends: MonthlyTrend[];
    },
    options?: { filename?: string }
  ): Promise<void> {
    const XLSX = await this.loadSheetJS();
    const workbook = XLSX.utils.book_new();
    
    // Executive Summary Sheet
    const totalBalance = data.accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const monthlyIncome = data.transactions
      .filter(t => t.type === 'income' && new Date(t.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = data.transactions
      .filter(t => t.type === 'expense' && new Date(t.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const summaryData = [
      { 'Metric': 'Report Generated', 'Value': format(new Date(), 'yyyy-MM-dd HH:mm:ss') },
      { 'Metric': 'Total Accounts', 'Value': data.accounts.length },
      { 'Metric': 'Total Balance', 'Value': this.formatCurrency(totalBalance) },
      { 'Metric': 'Monthly Income', 'Value': this.formatCurrency(monthlyIncome) },
      { 'Metric': 'Monthly Expenses', 'Value': this.formatCurrency(monthlyExpenses) },
      { 'Metric': 'Net Monthly Flow', 'Value': this.formatCurrency(monthlyIncome - monthlyExpenses) },
      { 'Metric': 'Total Transactions', 'Value': data.transactions.length },
      { 'Metric': 'Active Budgets', 'Value': data.budgets.filter(b => b.is_active).length },
      { 'Metric': 'Financial Goals', 'Value': data.goals.length },
      { 'Metric': 'Achieved Goals', 'Value': data.goals.filter(g => g.is_achieved).length }
    ];
    
    const summarySheet = this.createStyledWorksheet(
      XLSX, 
      summaryData, 
      ['Metric', 'Value'], 
      'Executive Summary'
    );
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');
    
    // Accounts Sheet
    const accountData = data.accounts.map(account => ({
      'Institution': account.institution_name,
      'Account Name': account.account_name,
      'Type': account.account_type,
      'Balance': this.formatCurrency(account.balance, account.currency),
      'Currency': account.currency,
      'Status': account.is_active ? 'Active' : 'Inactive',
      'API Connected': account.api_connected ? 'Yes' : 'No'
    }));
    
    const accountSheet = this.createStyledWorksheet(
      XLSX, 
      accountData, 
      Object.keys(accountData[0] || {}), 
      'Account Overview'
    );
    XLSX.utils.book_append_sheet(workbook, accountSheet, 'Accounts');
    
    // Spending Analysis Sheet
    const spendingData = data.spendingAnalysis.map(item => ({
      'Category': item.category,
      'Amount': this.formatCurrency(item.amount),
      'Percentage': `${item.percentage.toFixed(1)}%`
    }));
    
    const spendingSheet = this.createStyledWorksheet(
      XLSX, 
      spendingData, 
      ['Category', 'Amount', 'Percentage'], 
      'Spending by Category'
    );
    XLSX.utils.book_append_sheet(workbook, spendingSheet, 'Spending Analysis');
    
    // Monthly Trends Sheet
    const trendData = data.monthlyTrends.map(trend => ({
      'Month': trend.month,
      'Income': this.formatCurrency(trend.income),
      'Expenses': this.formatCurrency(trend.expenses),
      'Net Flow': this.formatCurrency(trend.netFlow),
      'Status': trend.netFlow >= 0 ? 'Positive' : 'Negative'
    }));
    
    const trendSheet = this.createStyledWorksheet(
      XLSX, 
      trendData, 
      ['Month', 'Income', 'Expenses', 'Net Flow', 'Status'], 
      'Monthly Financial Trends'
    );
    XLSX.utils.book_append_sheet(workbook, trendSheet, 'Monthly Trends');
    
    // Goals Sheet
    if (data.goals.length > 0) {
      const goalData = data.goals.map(goal => ({
        'Goal': goal.name,
        'Target': this.formatCurrency(goal.target_amount),
        'Current': this.formatCurrency(goal.current_amount),
        'Progress': `${((goal.current_amount / goal.target_amount) * 100).toFixed(1)}%`,
        'Category': goal.category,
        'Status': goal.is_achieved ? 'Achieved' : 'In Progress'
      }));
      
      const goalSheet = this.createStyledWorksheet(
        XLSX, 
        goalData, 
        ['Goal', 'Target', 'Current', 'Progress', 'Category', 'Status'], 
        'Financial Goals Progress'
      );
      XLSX.utils.book_append_sheet(workbook, goalSheet, 'Goals');
    }
    
    const filename = options?.filename || `financial_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    await this.downloadExcel(workbook, filename);
  }

  // Export monthly financial report
  static async exportMonthlyReport(
    data: {
      accounts: Account[];
      transactions: Transaction[];
      spendingAnalysis: SpendingByCategory[];
    },
    month: Date,
    options?: { filename?: string }
  ): Promise<void> {
    const XLSX = await this.loadSheetJS();
    const workbook = XLSX.utils.book_new();
    
    const monthStr = format(month, 'MMMM yyyy');
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    
    // Filter transactions for the month
    const monthTransactions = data.transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return transactionDate >= monthStart && transactionDate <= monthEnd;
    });
    
    // Monthly Summary
    const monthlyIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    const summaryData = [
      { 'Metric': 'Report Period', 'Value': monthStr },
      { 'Metric': 'Total Income', 'Value': this.formatCurrency(monthlyIncome) },
      { 'Metric': 'Total Expenses', 'Value': this.formatCurrency(monthlyExpenses) },
      { 'Metric': 'Net Flow', 'Value': this.formatCurrency(monthlyIncome - monthlyExpenses) },
      { 'Metric': 'Transaction Count', 'Value': monthTransactions.length },
      { 'Metric': 'Average Transaction', 'Value': this.formatCurrency(
        monthTransactions.length > 0 ? monthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / monthTransactions.length : 0
      )}
    ];
    
    const summarySheet = this.createStyledWorksheet(
      XLSX, 
      summaryData, 
      ['Metric', 'Value'], 
      `${monthStr} Summary`
    );
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Monthly Summary');
    
    // Transactions for the month
    const transactionData = monthTransactions.map(t => ({
      'Date': format(parseISO(t.date), 'yyyy-MM-dd'),
      'Description': t.description,
      'Category': t.category,
      'Amount': this.formatCurrency(t.amount, t.currency),
      'Type': t.type,
      'Merchant': t.merchant || ''
    }));
    
    const transactionSheet = this.createStyledWorksheet(
      XLSX, 
      transactionData, 
      ['Date', 'Description', 'Category', 'Amount', 'Type', 'Merchant'], 
      `${monthStr} Transactions`
    );
    XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transactions');
    
    const filename = options?.filename || `monthly_report_${format(month, 'yyyy-MM')}.xlsx`;
    await this.downloadExcel(workbook, filename);
  }
}

export default ExcelExportService;