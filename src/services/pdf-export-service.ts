'use client';

import { Account, Transaction, Budget, FinancialGoal, SpendingByCategory, MonthlyTrend } from '@/types';
import { format, parseISO } from 'date-fns';

// PDF Export Service using jsPDF
class PDFExportService {
  private static loadJsPDF(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).jsPDF) {
        resolve((window as any).jsPDF);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        resolve((window as any).jsPDF);
      };
      script.onerror = () => {
        reject(new Error('Failed to load jsPDF library'));
      };
      document.head.appendChild(script);
    });
  }

  private static formatCurrency(value: number, currency: string = 'GBP'): string {
    return new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency 
    }).format(value);
  }

  private static addHeader(doc: any, title: string, subtitle?: string): number {
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 20;
    
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
    
    // Subtitle
    if (subtitle) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;
    }
    
    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;
    
    return currentY;
  }

  private static addSection(doc: any, title: string, currentY: number): number {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, currentY);
    return currentY + 8;
  }

  private static addTable(
    doc: any, 
    headers: string[], 
    data: any[][], 
    startY: number,
    options?: {
      columnWidths?: number[];
      maxRowsPerPage?: number;
    }
  ): number {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const tableWidth = pageWidth - (margin * 2);
    
    const columnWidths = options?.columnWidths || headers.map(() => tableWidth / headers.length);
    const rowHeight = 8;
    const maxRowsPerPage = options?.maxRowsPerPage || Math.floor((pageHeight - startY - 40) / rowHeight);
    
    let currentY = startY;
    
    // Helper function to draw table headers
    const drawHeaders = (y: number) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      let currentX = margin;
      headers.forEach((header, index) => {
        doc.rect(currentX, y - 6, columnWidths[index], rowHeight);
        doc.text(header, currentX + 2, y, { maxWidth: columnWidths[index] - 4 });
        currentX += columnWidths[index];
      });
      
      return y + rowHeight;
    };
    
    // Helper function to draw data row
    const drawRow = (rowData: any[], y: number) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      let currentX = margin;
      rowData.forEach((cell, index) => {
        doc.rect(currentX, y - 6, columnWidths[index], rowHeight);
        const cellText = String(cell || '');
        doc.text(cellText, currentX + 2, y, { maxWidth: columnWidths[index] - 4 });
        currentX += columnWidths[index];
      });
      
      return y + rowHeight;
    };
    
    // Draw headers
    currentY = drawHeaders(currentY);
    
    // Draw data rows
    let rowCount = 0;
    for (const row of data) {
      if (rowCount >= maxRowsPerPage) {
        // Start new page
        doc.addPage();
        currentY = 30;
        currentY = drawHeaders(currentY);
        rowCount = 0;
      }
      
      currentY = drawRow(row, currentY);
      rowCount++;
    }
    
    return currentY + 10;
  }

  private static addSummaryBox(
    doc: any, 
    title: string, 
    items: { label: string; value: string }[], 
    x: number, 
    y: number, 
    width: number = 80
  ): void {
    const height = items.length * 6 + 15;
    
    // Draw box
    doc.setDrawColor(200);
    doc.rect(x, y, width, height);
    
    // Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, x + 5, y + 10);
    
    // Items
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let itemY = y + 18;
    
    items.forEach(item => {
      doc.text(item.label + ':', x + 5, itemY);
      doc.text(item.value, x + width - 5, itemY, { align: 'right' });
      itemY += 6;
    });
  }

  // Export transaction report to PDF
  static async exportTransactionReport(
    transactions: Transaction[],
    accounts: Account[],
    options?: {
      filename?: string;
      includeCharts?: boolean;
      dateRange?: { start: Date; end: Date };
    }
  ): Promise<void> {
    const { jsPDF } = await this.loadJsPDF();
    const doc = new jsPDF();
    
    const accountMap = new Map(accounts.map(acc => [acc.id, acc.account_name]));
    
    // Filter transactions by date range if provided
    let filteredTransactions = transactions;
    if (options?.dateRange) {
      filteredTransactions = transactions.filter(t => {
        const transactionDate = parseISO(t.date);
        return transactionDate >= options.dateRange!.start && transactionDate <= options.dateRange!.end;
      });
    }
    
    // Header
    let currentY = this.addHeader(
      doc, 
      'Transaction Report', 
      options?.dateRange 
        ? `${format(options.dateRange.start, 'MMM dd, yyyy')} - ${format(options.dateRange.end, 'MMM dd, yyyy')}`
        : 'All Transactions'
    );
    
    // Summary section
    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netFlow = totalIncome - totalExpenses;
    
    this.addSummaryBox(doc, 'Summary', [
      { label: 'Total Transactions', value: filteredTransactions.length.toString() },
      { label: 'Total Income', value: this.formatCurrency(totalIncome) },
      { label: 'Total Expenses', value: this.formatCurrency(totalExpenses) },
      { label: 'Net Flow', value: this.formatCurrency(netFlow) }
    ], 20, currentY, 80);
    
    currentY += 70;
    
    // Transactions table
    currentY = this.addSection(doc, 'Transaction Details', currentY);
    
    const headers = ['Date', 'Account', 'Description', 'Category', 'Amount', 'Type'];
    const tableData = filteredTransactions.slice(0, 50).map(transaction => [
      format(parseISO(transaction.date), 'MMM dd'),
      accountMap.get(transaction.account_id)?.substring(0, 15) || 'Unknown',
      transaction.description.substring(0, 25),
      transaction.category.substring(0, 15),
      this.formatCurrency(transaction.amount, transaction.currency),
      transaction.type
    ]);
    
    currentY = this.addTable(doc, headers, tableData, currentY, {
      columnWidths: [25, 35, 50, 30, 30, 20]
    });
    
    if (filteredTransactions.length > 50) {
      doc.setFontSize(10);
      doc.text(`... and ${filteredTransactions.length - 50} more transactions`, 20, currentY);
    }
    
    const filename = options?.filename || `transaction_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  }

  // Export financial dashboard summary
  static async exportDashboardSummary(
    data: {
      accounts: Account[];
      transactions: Transaction[];
      spendingAnalysis: SpendingByCategory[];
      monthlyTrends: MonthlyTrend[];
    },
    options?: { filename?: string }
  ): Promise<void> {
    const { jsPDF } = await this.loadJsPDF();
    const doc = new jsPDF();
    
    // Header
    let currentY = this.addHeader(doc, 'Financial Dashboard', 'Monthly Summary Report');
    
    // Account Summary
    const totalBalance = data.accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const activeAccounts = data.accounts.filter(acc => acc.is_active).length;
    
    this.addSummaryBox(doc, 'Account Summary', [
      { label: 'Total Accounts', value: data.accounts.length.toString() },
      { label: 'Active Accounts', value: activeAccounts.toString() },
      { label: 'Total Balance', value: this.formatCurrency(totalBalance) }
    ], 20, currentY, 80);
    
    // Monthly Flow Summary
    const recentTransactions = data.transactions.filter(t => 
      new Date(t.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const monthlyIncome = recentTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = recentTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    this.addSummaryBox(doc, 'Monthly Flow', [
      { label: 'Income', value: this.formatCurrency(monthlyIncome) },
      { label: 'Expenses', value: this.formatCurrency(monthlyExpenses) },
      { label: 'Net Flow', value: this.formatCurrency(monthlyIncome - monthlyExpenses) }
    ], 110, currentY, 80);
    
    currentY += 70;
    
    // Accounts table
    currentY = this.addSection(doc, 'Account Details', currentY);
    
    const accountHeaders = ['Institution', 'Account Name', 'Type', 'Balance'];
    const accountData = data.accounts.map(acc => [
      acc.institution_name.substring(0, 20),
      acc.account_name.substring(0, 25),
      acc.account_type,
      this.formatCurrency(acc.balance, acc.currency)
    ]);
    
    currentY = this.addTable(doc, accountHeaders, accountData, currentY, {
      columnWidths: [45, 60, 30, 35]
    });
    
    // Spending by category
    if (data.spendingAnalysis.length > 0) {
      currentY = this.addSection(doc, 'Top Spending Categories', currentY);
      
      const spendingHeaders = ['Category', 'Amount', 'Percentage'];
      const spendingData = data.spendingAnalysis.slice(0, 10).map(item => [
        item.category,
        this.formatCurrency(item.amount),
        `${item.percentage.toFixed(1)}%`
      ]);
      
      currentY = this.addTable(doc, spendingHeaders, spendingData, currentY, {
        columnWidths: [70, 50, 30]
      });
    }
    
    const filename = options?.filename || `dashboard_summary_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
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
    const { jsPDF } = await this.loadJsPDF();
    const doc = new jsPDF();
    
    // Page 1: Executive Summary
    let currentY = this.addHeader(doc, 'Comprehensive Financial Report', 'Executive Summary');
    
    // Key metrics
    const totalBalance = data.accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const recentTransactions = data.transactions.filter(t => 
      new Date(t.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const monthlyIncome = recentTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = recentTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    this.addSummaryBox(doc, 'Financial Overview', [
      { label: 'Total Balance', value: this.formatCurrency(totalBalance) },
      { label: 'Monthly Income', value: this.formatCurrency(monthlyIncome) },
      { label: 'Monthly Expenses', value: this.formatCurrency(monthlyExpenses) },
      { label: 'Net Monthly Flow', value: this.formatCurrency(monthlyIncome - monthlyExpenses) },
      { label: 'Burn Rate', value: monthlyIncome > 0 ? `${(totalBalance / monthlyExpenses).toFixed(1)} months` : 'N/A' }
    ], 20, currentY, 90);
    
    this.addSummaryBox(doc, 'Account & Goal Summary', [
      { label: 'Total Accounts', value: data.accounts.length.toString() },
      { label: 'Active Accounts', value: data.accounts.filter(a => a.is_active).length.toString() },
      { label: 'Financial Goals', value: data.goals.length.toString() },
      { label: 'Achieved Goals', value: data.goals.filter(g => g.is_achieved).length.toString() },
      { label: 'Active Budgets', value: data.budgets.filter(b => b.is_active).length.toString() }
    ], 120, currentY, 70);
    
    currentY += 80;
    
    // Monthly trends summary
    if (data.monthlyTrends.length > 0) {
      currentY = this.addSection(doc, 'Recent Monthly Trends', currentY);
      
      const trendHeaders = ['Month', 'Income', 'Expenses', 'Net Flow'];
      const trendData = data.monthlyTrends.slice(-6).map(trend => [
        trend.month,
        this.formatCurrency(trend.income),
        this.formatCurrency(trend.expenses),
        this.formatCurrency(trend.netFlow)
      ]);
      
      currentY = this.addTable(doc, trendHeaders, trendData, currentY, {
        columnWidths: [40, 40, 40, 40]
      });
    }
    
    // Page 2: Detailed Analysis
    doc.addPage();
    currentY = this.addHeader(doc, 'Detailed Financial Analysis');
    
    // Top spending categories
    if (data.spendingAnalysis.length > 0) {
      currentY = this.addSection(doc, 'Spending by Category', currentY);
      
      const spendingHeaders = ['Category', 'Amount', 'Percentage'];
      const spendingData = data.spendingAnalysis.map(item => [
        item.category,
        this.formatCurrency(item.amount),
        `${item.percentage.toFixed(1)}%`
      ]);
      
      currentY = this.addTable(doc, spendingHeaders, spendingData, currentY, {
        columnWidths: [80, 40, 30]
      });
    }
    
    // Financial goals
    if (data.goals.length > 0) {
      currentY = this.addSection(doc, 'Financial Goals Progress', currentY);
      
      const goalHeaders = ['Goal', 'Target', 'Current', 'Progress', 'Status'];
      const goalData = data.goals.map(goal => [
        goal.name.substring(0, 25),
        this.formatCurrency(goal.target_amount),
        this.formatCurrency(goal.current_amount),
        `${((goal.current_amount / goal.target_amount) * 100).toFixed(1)}%`,
        goal.is_achieved ? 'Achieved' : 'In Progress'
      ]);
      
      currentY = this.addTable(doc, goalHeaders, goalData, currentY, {
        columnWidths: [40, 30, 30, 25, 25]
      });
    }
    
    const filename = options?.filename || `comprehensive_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
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
    const { jsPDF } = await this.loadJsPDF();
    const doc = new jsPDF();
    
    const monthStr = format(month, 'MMMM yyyy');
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    
    // Filter transactions for the month
    const monthTransactions = data.transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return transactionDate >= monthStart && transactionDate <= monthEnd;
    });
    
    // Header
    let currentY = this.addHeader(doc, `Monthly Financial Report`, monthStr);
    
    // Monthly summary
    const monthlyIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const averageTransaction = monthTransactions.length > 0 
      ? monthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / monthTransactions.length 
      : 0;
    
    this.addSummaryBox(doc, 'Monthly Summary', [
      { label: 'Total Income', value: this.formatCurrency(monthlyIncome) },
      { label: 'Total Expenses', value: this.formatCurrency(monthlyExpenses) },
      { label: 'Net Flow', value: this.formatCurrency(monthlyIncome - monthlyExpenses) },
      { label: 'Transactions', value: monthTransactions.length.toString() },
      { label: 'Avg Transaction', value: this.formatCurrency(averageTransaction) }
    ], 20, currentY, 80);
    
    // Account balances (current)
    const totalBalance = data.accounts.reduce((sum, acc) => sum + acc.balance, 0);
    this.addSummaryBox(doc, 'Current Account Status', [
      { label: 'Total Balance', value: this.formatCurrency(totalBalance) },
      { label: 'Active Accounts', value: data.accounts.filter(a => a.is_active).length.toString() },
      { label: 'Connected APIs', value: data.accounts.filter(a => a.api_connected).length.toString() }
    ], 110, currentY, 70);
    
    currentY += 70;
    
    // Category breakdown for the month
    const monthlyCategories = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
    
    const categoryData = Object.entries(monthlyCategories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([category, amount]) => [
        category,
        this.formatCurrency(amount),
        `${((amount / monthlyExpenses) * 100).toFixed(1)}%`
      ]);
    
    if (categoryData.length > 0) {
      currentY = this.addSection(doc, 'Spending by Category', currentY);
      currentY = this.addTable(doc, ['Category', 'Amount', 'Percentage'], categoryData, currentY, {
        columnWidths: [80, 40, 30]
      });
    }
    
    const filename = options?.filename || `monthly_report_${format(month, 'yyyy-MM')}.pdf`;
    doc.save(filename);
  }
}

export default PDFExportService;