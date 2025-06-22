'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Account, Transaction, Budget, FinancialGoal, SpendingByCategory, MonthlyTrend } from '@/types';
import CSVExportService from '@/services/export-service';
import ExcelExportService from '@/services/excel-export-service';
import PDFExportService from '@/services/pdf-export-service';
import { 
  DocumentTextIcon,
  TableCellsIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  FunnelIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  DocumentIcon,
  PresentationChartBarIcon
} from '@heroicons/react/24/outline';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: 'csv' | 'excel' | 'pdf';
  sections: ReportSection[];
  filters: ReportFilters;
  scheduling?: ReportScheduling;
}

interface ReportSection {
  id: string;
  type: 'summary' | 'transactions' | 'accounts' | 'spending' | 'trends' | 'goals' | 'budgets';
  title: string;
  enabled: boolean;
  config?: any;
}

interface ReportFilters {
  dateRange: {
    type: 'all' | 'last_month' | 'last_3_months' | 'last_6_months' | 'last_year' | 'custom';
    startDate?: string;
    endDate?: string;
  };
  accounts: string[];
  categories: string[];
  transactionTypes: ('income' | 'expense' | 'transfer')[];
  amountRange?: {
    min?: number;
    max?: number;
  };
}

interface ReportScheduling {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  recipients: string[];
}

interface ReportBuilderProps {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: FinancialGoal[];
  spendingAnalysis: SpendingByCategory[];
  monthlyTrends: MonthlyTrend[];
  className?: string;
}

const defaultReportConfig: ReportConfig = {
  id: 'custom-report',
  name: 'Custom Financial Report',
  description: 'Customizable financial report',
  type: 'pdf',
  sections: [
    { id: 'summary', type: 'summary', title: 'Executive Summary', enabled: true },
    { id: 'accounts', type: 'accounts', title: 'Account Overview', enabled: true },
    { id: 'transactions', type: 'transactions', title: 'Recent Transactions', enabled: true },
    { id: 'spending', type: 'spending', title: 'Spending Analysis', enabled: true },
    { id: 'trends', type: 'trends', title: 'Monthly Trends', enabled: false },
    { id: 'goals', type: 'goals', title: 'Financial Goals', enabled: false },
    { id: 'budgets', type: 'budgets', title: 'Budget Overview', enabled: false }
  ],
  filters: {
    dateRange: { type: 'last_month' },
    accounts: [],
    categories: [],
    transactionTypes: ['income', 'expense', 'transfer']
  }
};

const reportTemplates = [
  {
    id: 'monthly-summary',
    name: 'Monthly Summary',
    description: 'Comprehensive monthly financial overview',
    config: {
      ...defaultReportConfig,
      name: 'Monthly Summary Report',
      type: 'pdf' as const,
      filters: { ...defaultReportConfig.filters, dateRange: { type: 'last_month' as const } }
    }
  },
  {
    id: 'transaction-export',
    name: 'Transaction Export',
    description: 'Detailed transaction list for analysis',
    config: {
      ...defaultReportConfig,
      name: 'Transaction Export',
      type: 'excel' as const,
      sections: [
        { id: 'transactions', type: 'transactions' as const, title: 'All Transactions', enabled: true },
        { id: 'spending', type: 'spending' as const, title: 'Category Summary', enabled: true }
      ]
    }
  },
  {
    id: 'quarterly-review',
    name: 'Quarterly Review',
    description: 'Quarterly financial performance review',
    config: {
      ...defaultReportConfig,
      name: 'Quarterly Review',
      type: 'pdf' as const,
      filters: { ...defaultReportConfig.filters, dateRange: { type: 'last_3_months' as const } },
      sections: defaultReportConfig.sections.map(s => ({ ...s, enabled: true }))
    }
  },
  {
    id: 'goal-progress',
    name: 'Goal Progress Report',
    description: 'Track progress towards financial goals',
    config: {
      ...defaultReportConfig,
      name: 'Goal Progress Report',
      type: 'pdf' as const,
      sections: [
        { id: 'summary', type: 'summary' as const, title: 'Financial Overview', enabled: true },
        { id: 'goals', type: 'goals' as const, title: 'Goal Progress', enabled: true },
        { id: 'trends', type: 'trends' as const, title: 'Monthly Trends', enabled: true }
      ]
    }
  }
];

export function ReportBuilder({
  accounts,
  transactions,
  budgets,
  goals,
  spendingAnalysis,
  monthlyTrends,
  className = ''
}: ReportBuilderProps) {
  const [reportConfig, setReportConfig] = useState<ReportConfig>(defaultReportConfig);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'preview' | 'schedule'>('config');
  const [previewData, setPreviewData] = useState<any>(null);

  const updateReportConfig = (updates: Partial<ReportConfig>) => {
    setReportConfig(prev => ({ ...prev, ...updates }));
  };

  const updateSection = (sectionId: string, updates: Partial<ReportSection>) => {
    setReportConfig(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  const updateFilters = (updates: Partial<ReportFilters>) => {
    setReportConfig(prev => ({
      ...prev,
      filters: { ...prev.filters, ...updates }
    }));
  };

  const loadTemplate = (templateId: string) => {
    const template = reportTemplates.find(t => t.id === templateId);
    if (template) {
      setReportConfig({ ...template.config, id: `${templateId}-${Date.now()}` });
    }
  };

  const getFilteredData = () => {
    const { filters } = reportConfig;
    let filteredTransactions = transactions;

    // Date filtering
    if (filters.dateRange.type !== 'all') {
      let startDate: Date;
      let endDate = new Date();

      switch (filters.dateRange.type) {
        case 'last_month':
          startDate = startOfMonth(subMonths(new Date(), 1));
          endDate = endOfMonth(subMonths(new Date(), 1));
          break;
        case 'last_3_months':
          startDate = startOfMonth(subMonths(new Date(), 3));
          break;
        case 'last_6_months':
          startDate = startOfMonth(subMonths(new Date(), 6));
          break;
        case 'last_year':
          startDate = startOfMonth(subMonths(new Date(), 12));
          break;
        case 'custom':
          if (filters.dateRange.startDate && filters.dateRange.endDate) {
            startDate = new Date(filters.dateRange.startDate);
            endDate = new Date(filters.dateRange.endDate);
          } else {
            startDate = new Date(0);
          }
          break;
        default:
          startDate = new Date(0);
      }

      filteredTransactions = filteredTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    // Account filtering
    if (filters.accounts.length > 0) {
      filteredTransactions = filteredTransactions.filter(t => 
        filters.accounts.includes(t.account_id)
      );
    }

    // Category filtering
    if (filters.categories.length > 0) {
      filteredTransactions = filteredTransactions.filter(t => 
        filters.categories.includes(t.category)
      );
    }

    // Transaction type filtering
    if (filters.transactionTypes.length > 0) {
      filteredTransactions = filteredTransactions.filter(t => 
        filters.transactionTypes.includes(t.type)
      );
    }

    // Amount range filtering
    if (filters.amountRange?.min !== undefined || filters.amountRange?.max !== undefined) {
      filteredTransactions = filteredTransactions.filter(t => {
        const amount = Math.abs(t.amount);
        const min = filters.amountRange?.min || 0;
        const max = filters.amountRange?.max || Infinity;
        return amount >= min && amount <= max;
      });
    }

    return {
      accounts: filters.accounts.length > 0 
        ? accounts.filter(a => filters.accounts.includes(a.id))
        : accounts,
      transactions: filteredTransactions,
      budgets,
      goals,
      spendingAnalysis,
      monthlyTrends
    };
  };

  const generatePreview = () => {
    const filteredData = getFilteredData();
    const enabledSections = reportConfig.sections.filter(s => s.enabled);
    
    setPreviewData({
      sections: enabledSections,
      data: filteredData,
      summary: {
        totalTransactions: filteredData.transactions.length,
        totalAccounts: filteredData.accounts.length,
        dateRange: reportConfig.filters.dateRange,
        reportType: reportConfig.type
      }
    });
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const filteredData = getFilteredData();
      const filename = `${reportConfig.name.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}`;

      switch (reportConfig.type) {
        case 'csv':
          if (reportConfig.sections.find(s => s.type === 'transactions' && s.enabled)) {
            CSVExportService.exportTransactions(filteredData.transactions, filteredData.accounts, {
              filename: `${filename}.csv`,
              includeAccountNames: true
            });
          } else {
            CSVExportService.exportComprehensiveReport(filteredData, {
              filename: `${filename}.csv`
            });
          }
          break;

        case 'excel':
          await ExcelExportService.exportComprehensiveReport(filteredData, {
            filename: `${filename}.xlsx`
          });
          break;

        case 'pdf':
          await PDFExportService.exportComprehensiveReport(filteredData, {
            filename: `${filename}.pdf`
          });
          break;
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generatePreview();
  }, [reportConfig]);

  const getDateRangeDescription = () => {
    const { dateRange } = reportConfig.filters;
    switch (dateRange.type) {
      case 'all': return 'All time';
      case 'last_month': return 'Last month';
      case 'last_3_months': return 'Last 3 months';
      case 'last_6_months': return 'Last 6 months';
      case 'last_year': return 'Last year';
      case 'custom': 
        return dateRange.startDate && dateRange.endDate 
          ? `${format(new Date(dateRange.startDate), 'MMM dd, yyyy')} - ${format(new Date(dateRange.endDate), 'MMM dd, yyyy')}`
          : 'Custom range';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5" />
              Report Builder
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={generatePreview}
                className="flex items-center gap-2"
              >
                <PresentationChartBarIcon className="h-4 w-4" />
                Preview
              </Button>
              <Button
                onClick={generateReport}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Navigation Tabs */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'config', label: 'Configuration', icon: Cog6ToothIcon },
                { id: 'preview', label: 'Preview', icon: DocumentIcon },
                { id: 'schedule', label: 'Schedule', icon: CalendarDaysIcon }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Report Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Report Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportTemplates.map(template => (
                <div
                  key={template.id}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => loadTemplate(template.id)}
                >
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Report Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Name
                </label>
                <input
                  type="text"
                  value={reportConfig.name}
                  onChange={(e) => updateReportConfig({ name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <select
                  value={reportConfig.type}
                  onChange={(e) => updateReportConfig({ type: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="pdf">PDF Report</option>
                  <option value="excel">Excel Spreadsheet</option>
                  <option value="csv">CSV Data</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  value={reportConfig.filters.dateRange.type}
                  onChange={(e) => updateFilters({
                    dateRange: { type: e.target.value as any }
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">All Time</option>
                  <option value="last_month">Last Month</option>
                  <option value="last_3_months">Last 3 Months</option>
                  <option value="last_6_months">Last 6 Months</option>
                  <option value="last_year">Last Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {reportConfig.filters.dateRange.type === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={reportConfig.filters.dateRange.startDate || ''}
                      onChange={(e) => updateFilters({
                        dateRange: {
                          ...reportConfig.filters.dateRange,
                          startDate: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={reportConfig.filters.dateRange.endDate || ''}
                      onChange={(e) => updateFilters({
                        dateRange: {
                          ...reportConfig.filters.dateRange,
                          endDate: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Sections */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Report Sections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportConfig.sections.map(section => (
                  <div
                    key={section.id}
                    className={`p-4 border rounded-lg ${
                      section.enabled ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{section.title}</h4>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={section.enabled}
                          onChange={(e) => updateSection(section.id, { enabled: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          section.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            section.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </div>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600">
                      {section.type === 'summary' && 'Executive summary with key metrics'}
                      {section.type === 'accounts' && 'Account balances and overview'}
                      {section.type === 'transactions' && 'Detailed transaction listing'}
                      {section.type === 'spending' && 'Spending breakdown by category'}
                      {section.type === 'trends' && 'Monthly financial trends'}
                      {section.type === 'goals' && 'Financial goals progress'}
                      {section.type === 'budgets' && 'Budget vs actual spending'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'preview' && previewData && (
        <Card>
          <CardHeader>
            <CardTitle>Report Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preview Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Report Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Format:</span>
                  <span className="ml-2 font-medium">{reportConfig.type.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Date Range:</span>
                  <span className="ml-2 font-medium">{getDateRangeDescription()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Transactions:</span>
                  <span className="ml-2 font-medium">{previewData.summary.totalTransactions}</span>
                </div>
                <div>
                  <span className="text-gray-600">Sections:</span>
                  <span className="ml-2 font-medium">{previewData.sections.length}</span>
                </div>
              </div>
            </div>

            {/* Preview Sections */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Included Sections:</h3>
              {previewData.sections.map((section: any) => (
                <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{section.title}</h4>
                  <div className="text-sm text-gray-600">
                    {section.type === 'summary' && (
                      <div>Executive summary with key financial metrics and totals</div>
                    )}
                    {section.type === 'accounts' && (
                      <div>Account overview: {previewData.data.accounts.length} accounts</div>
                    )}
                    {section.type === 'transactions' && (
                      <div>Transaction details: {previewData.data.transactions.length} transactions</div>
                    )}
                    {section.type === 'spending' && (
                      <div>Spending analysis: {previewData.data.spendingAnalysis.length} categories</div>
                    )}
                    {section.type === 'trends' && (
                      <div>Monthly trends: {previewData.data.monthlyTrends.length} months</div>
                    )}
                    {section.type === 'goals' && (
                      <div>Financial goals: {previewData.data.goals.length} goals</div>
                    )}
                    {section.type === 'budgets' && (
                      <div>Budget overview: {previewData.data.budgets.length} budgets</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'schedule' && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Report Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Coming Soon</span>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  Scheduled report delivery will be available in the next release. 
                  You can currently generate reports on-demand.
                </p>
              </div>
              
              <div className="text-gray-500">
                <p>Planned features:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Daily, weekly, monthly, and quarterly scheduling</li>
                  <li>Email delivery to multiple recipients</li>
                  <li>Custom report templates</li>
                  <li>Automatic data filtering by date ranges</li>
                  <li>Report archiving and history</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ReportBuilder;