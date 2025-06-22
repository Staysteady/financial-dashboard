'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/types';
import { NotificationHistory } from '@/services/notification-service';
import { 
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TrashIcon,
  EyeIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import { format, isToday, isYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface AlertHistoryRecord {
  id: string;
  alertId: string;
  alertType: Alert['type'];
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggeredAt: string;
  acknowledgedAt?: string;
  dismissedAt?: string;
  status: 'active' | 'acknowledged' | 'dismissed' | 'resolved';
  notificationsSent: NotificationHistory[];
  data?: any;
}

interface AlertHistoryProps {
  history: AlertHistoryRecord[];
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
  onDelete: (id: string) => void;
  onBulkAction: (ids: string[], action: 'acknowledge' | 'dismiss' | 'delete') => void;
  onExport?: (filters: AlertHistoryFilters) => void;
  className?: string;
}

interface AlertHistoryFilters {
  search: string;
  alertTypes: Set<Alert['type']>;
  severities: Set<'low' | 'medium' | 'high' | 'critical'>;
  statuses: Set<AlertHistoryRecord['status']>;
  dateRange: {
    start?: Date;
    end?: Date;
    preset: 'all' | 'today' | 'week' | 'month' | 'custom';
  };
}

const defaultFilters: AlertHistoryFilters = {
  search: '',
  alertTypes: new Set(['low_balance', 'high_spending', 'projection_warning', 'goal_milestone']),
  severities: new Set(['low', 'medium', 'high', 'critical']),
  statuses: new Set(['active', 'acknowledged', 'dismissed', 'resolved']),
  dateRange: {
    preset: 'all'
  }
};

const alertTypeLabels = {
  low_balance: 'Low Balance',
  high_spending: 'High Spending',
  projection_warning: 'Projection Warning',
  goal_milestone: 'Goal Milestone'
};

const statusLabels = {
  active: 'Active',
  acknowledged: 'Acknowledged',
  dismissed: 'Dismissed',
  resolved: 'Resolved'
};

const severityColors = {
  critical: 'text-red-600 bg-red-50 border-red-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  medium: 'text-blue-600 bg-blue-50 border-blue-200',
  low: 'text-green-600 bg-green-50 border-green-200'
};

const statusColors = {
  active: 'text-red-600 bg-red-50',
  acknowledged: 'text-blue-600 bg-blue-50',
  dismissed: 'text-gray-600 bg-gray-50',
  resolved: 'text-green-600 bg-green-50'
};

const getSeverityIcon = (severity: 'low' | 'medium' | 'high' | 'critical') => {
  const iconClass = "h-4 w-4";
  
  switch (severity) {
    case 'critical':
      return <ExclamationTriangleIcon className={`${iconClass} text-red-500`} />;
    case 'high':
      return <ExclamationCircleIcon className={`${iconClass} text-orange-500`} />;
    case 'medium':
      return <InformationCircleIcon className={`${iconClass} text-blue-500`} />;
    case 'low':
      return <CheckCircleIcon className={`${iconClass} text-green-500`} />;
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return `Today at ${format(date, 'HH:mm')}`;
  } else if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'HH:mm')}`;
  } else {
    return format(date, 'MMM d, yyyy HH:mm');
  }
};

const ITEMS_PER_PAGE = 20;

export function AlertHistory({
  history,
  onAcknowledge,
  onDismiss,
  onDelete,
  onBulkAction,
  onExport,
  className = ''
}: AlertHistoryProps) {
  const [filters, setFilters] = useState<AlertHistoryFilters>(defaultFilters);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Filter and search logic
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!item.title.toLowerCase().includes(searchLower) &&
            !item.message.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Type filter
      if (!filters.alertTypes.has(item.alertType)) {
        return false;
      }

      // Severity filter
      if (!filters.severities.has(item.severity)) {
        return false;
      }

      // Status filter
      if (!filters.statuses.has(item.status)) {
        return false;
      }

      // Date range filter
      const itemDate = new Date(item.triggeredAt);
      if (filters.dateRange.preset !== 'all') {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;

        switch (filters.dateRange.preset) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = startOfWeek(now);
            endDate = endOfWeek(now);
            break;
          case 'month':
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            break;
          case 'custom':
            if (!filters.dateRange.start || !filters.dateRange.end) return true;
            startDate = filters.dateRange.start;
            endDate = filters.dateRange.end;
            break;
          default:
            return true;
        }

        if (itemDate < startDate || itemDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }, [history, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(paginatedHistory.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkAction = (action: 'acknowledge' | 'dismiss' | 'delete') => {
    if (selectedItems.size === 0) return;
    onBulkAction(Array.from(selectedItems), action);
    setSelectedItems(new Set());
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const updateFilters = (updates: Partial<AlertHistoryFilters>) => {
    setFilters({ ...filters, ...updates });
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              Alert History
              <span className="text-sm font-normal text-gray-500">
                ({filteredHistory.length} alerts)
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FunnelIcon className="h-4 w-4 mr-1" />
                Filters
              </Button>
              {onExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExport(filters)}
                >
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="border-t">
            <div className="space-y-4">
              {/* Search */}
              <div>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search alerts..."
                    value={filters.search}
                    onChange={(e) => updateFilters({ search: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quick Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Alert Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Types
                  </label>
                  <div className="space-y-1">
                    {Object.entries(alertTypeLabels).map(([type, label]) => (
                      <label key={type} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={filters.alertTypes.has(type as Alert['type'])}
                          onChange={(e) => {
                            const newTypes = new Set(filters.alertTypes);
                            if (e.target.checked) {
                              newTypes.add(type as Alert['type']);
                            } else {
                              newTypes.delete(type as Alert['type']);
                            }
                            updateFilters({ alertTypes: newTypes });
                          }}
                          className="h-3 w-3 text-blue-600 rounded mr-2"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Severities */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Severity
                  </label>
                  <div className="space-y-1">
                    {(['critical', 'high', 'medium', 'low'] as const).map(severity => (
                      <label key={severity} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={filters.severities.has(severity)}
                          onChange={(e) => {
                            const newSeverities = new Set(filters.severities);
                            if (e.target.checked) {
                              newSeverities.add(severity);
                            } else {
                              newSeverities.delete(severity);
                            }
                            updateFilters({ severities: newSeverities });
                          }}
                          className="h-3 w-3 text-blue-600 rounded mr-2"
                        />
                        <span className={severity === 'critical' ? 'text-red-600' :
                                        severity === 'high' ? 'text-orange-600' :
                                        severity === 'medium' ? 'text-blue-600' :
                                        'text-green-600'}>
                          {severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="space-y-1">
                    {Object.entries(statusLabels).map(([status, label]) => (
                      <label key={status} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={filters.statuses.has(status as AlertHistoryRecord['status'])}
                          onChange={(e) => {
                            const newStatuses = new Set(filters.statuses);
                            if (e.target.checked) {
                              newStatuses.add(status as AlertHistoryRecord['status']);
                            } else {
                              newStatuses.delete(status as AlertHistoryRecord['status']);
                            }
                            updateFilters({ statuses: newStatuses });
                          }}
                          className="h-3 w-3 text-blue-600 rounded mr-2"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <select
                    value={filters.dateRange.preset}
                    onChange={(e) => {
                      const preset = e.target.value as AlertHistoryFilters['dateRange']['preset'];
                      updateFilters({
                        dateRange: { ...filters.dateRange, preset }
                      });
                    }}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                {selectedItems.size} alert{selectedItems.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('acknowledge')}
                >
                  Acknowledge
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('dismiss')}
                >
                  Dismiss
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History List */}
      <div className="space-y-2">
        {paginatedHistory.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ArchiveBoxIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
              <p className="text-gray-600">
                {history.length === 0 
                  ? "No alert history available yet."
                  : "No alerts match your current filters."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select All */}
            <Card className="bg-gray-50">
              <CardContent className="p-3">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={paginatedHistory.length > 0 && selectedItems.size === paginatedHistory.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded mr-3"
                  />
                  Select all on this page
                </label>
              </CardContent>
            </Card>

            {/* Alert Items */}
            {paginatedHistory.map((item) => (
              <Card key={item.id} className={`transition-all ${selectedItems.has(item.id) ? 'ring-2 ring-blue-500' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded mt-1"
                    />
                    
                    {getSeverityIcon(item.severity)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{item.title}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${severityColors[item.severity]}`}>
                              {item.severity}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${statusColors[item.status]}`}>
                              {statusLabels[item.status]}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-2">{item.message}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{alertTypeLabels[item.alertType]}</span>
                            <span>•</span>
                            <span>{formatDate(item.triggeredAt)}</span>
                            {item.acknowledgedAt && (
                              <>
                                <span>•</span>
                                <span>Acknowledged {formatDate(item.acknowledgedAt)}</span>
                              </>
                            )}
                          </div>

                          {expandedItems.has(item.id) && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-md">
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="font-medium">Alert ID:</span> {item.alertId}
                                </div>
                                <div>
                                  <span className="font-medium">Notifications sent:</span> {item.notificationsSent.length}
                                </div>
                                {item.data && (
                                  <div className="col-span-2">
                                    <span className="font-medium">Data:</span>
                                    <pre className="text-xs mt-1 bg-white p-2 rounded border overflow-auto">
                                      {JSON.stringify(item.data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(item.id)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          
                          {item.status === 'active' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onAcknowledge(item.id)}
                              >
                                Acknowledge
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDismiss(item.id)}
                              >
                                Dismiss
                              </Button>
                            </>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredHistory.length)} of{' '}
                {filteredHistory.length} alerts
              </span>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AlertHistory;