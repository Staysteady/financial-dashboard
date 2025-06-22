'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/types';
import { 
  BellIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BellSlashIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

interface NotificationItem extends Alert {
  timestamp: string;
  actions?: {
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }[];
}

interface NotificationCenterProps {
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onOpenSettings: () => void;
  className?: string;
}

interface NotificationFilters {
  showRead: boolean;
  types: Set<Alert['type']>;
  severity: Set<'low' | 'medium' | 'high' | 'critical'>;
}

const getSeverityFromType = (type: Alert['type']): 'low' | 'medium' | 'high' | 'critical' => {
  switch (type) {
    case 'low_balance':
      return 'critical';
    case 'high_spending':
      return 'medium';
    case 'projection_warning':
      return 'high';
    case 'goal_milestone':
      return 'low';
    default:
      return 'medium';
  }
};

const getNotificationIcon = (type: Alert['type'], severity: 'low' | 'medium' | 'high' | 'critical') => {
  const iconClass = "h-5 w-5";
  
  switch (severity) {
    case 'critical':
      return <ExclamationTriangleIcon className={`${iconClass} text-red-500`} />;
    case 'high':
      return <ExclamationCircleIcon className={`${iconClass} text-orange-500`} />;
    case 'medium':
      return <InformationCircleIcon className={`${iconClass} text-blue-500`} />;
    case 'low':
      return <CheckCircleIcon className={`${iconClass} text-green-500`} />;
    default:
      return <InformationCircleIcon className={`${iconClass} text-gray-500`} />;
  }
};

const getSeverityColor = (severity: 'low' | 'medium' | 'high' | 'critical') => {
  switch (severity) {
    case 'critical':
      return 'border-l-red-500 bg-red-50';
    case 'high':
      return 'border-l-orange-500 bg-orange-50';
    case 'medium':
      return 'border-l-blue-500 bg-blue-50';
    case 'low':
      return 'border-l-green-500 bg-green-50';
    default:
      return 'border-l-gray-500 bg-gray-50';
  }
};

const formatNotificationTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  
  if (isToday(date)) {
    return formatDistanceToNow(date, { addSuffix: true });
  } else if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'HH:mm')}`;
  } else {
    return format(date, 'MMM d, HH:mm');
  }
};

const getTypeDisplayName = (type: Alert['type']): string => {
  switch (type) {
    case 'low_balance':
      return 'Low Balance';
    case 'high_spending':
      return 'High Spending';
    case 'projection_warning':
      return 'Projection Warning';
    case 'goal_milestone':
      return 'Goal Milestone';
    default:
      return 'Alert';
  }
};

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onClearAll,
  onOpenSettings,
  className = ''
}: NotificationCenterProps) {
  const [filters, setFilters] = useState<NotificationFilters>({
    showRead: true,
    types: new Set(['low_balance', 'high_spending', 'projection_warning', 'goal_milestone']),
    severity: new Set(['low', 'medium', 'high', 'critical'])
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  const filteredNotifications = notifications.filter(notification => {
    const severity = getSeverityFromType(notification.type);
    
    if (!filters.showRead && notification.is_read) return false;
    if (!filters.types.has(notification.type)) return false;
    if (!filters.severity.has(severity)) return false;
    
    return true;
  });

  const handleTypeFilter = (type: Alert['type']) => {
    const newTypes = new Set(filters.types);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setFilters({ ...filters, types: newTypes });
  };

  const handleSeverityFilter = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    const newSeverity = new Set(filters.severity);
    if (newSeverity.has(severity)) {
      newSeverity.delete(severity);
    } else {
      newSeverity.add(severity);
    }
    setFilters({ ...filters, severity: newSeverity });
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BellIcon className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSettings}
              >
                <Cog6ToothIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent>
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onMarkAllAsRead}
                disabled={unreadCount === 0}
              >
                Mark All Read
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                disabled={notifications.length === 0}
              >
                Clear All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ ...filters, showRead: !filters.showRead })}
              >
                {filters.showRead ? <EyeSlashIcon className="h-4 w-4 mr-1" /> : <EyeIcon className="h-4 w-4 mr-1" />}
                {filters.showRead ? 'Hide Read' : 'Show Read'}
              </Button>
            </div>

            {/* Filters */}
            <div className="space-y-3 mb-4">
              {/* Type Filters */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Alert Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['low_balance', 'high_spending', 'projection_warning', 'goal_milestone'] as Alert['type'][]).map(type => (
                    <button
                      key={type}
                      onClick={() => handleTypeFilter(type)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        filters.types.has(type)
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {getTypeDisplayName(type)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity Filters */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Severity
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['critical', 'high', 'medium', 'low'] as const).map(severity => (
                    <button
                      key={severity}
                      onClick={() => handleSeverityFilter(severity)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        filters.severity.has(severity)
                          ? `${severity === 'critical' ? 'bg-red-100 border-red-300 text-red-800' :
                              severity === 'high' ? 'bg-orange-100 border-orange-300 text-orange-800' :
                              severity === 'medium' ? 'bg-blue-100 border-blue-300 text-blue-800' :
                              'bg-green-100 border-green-300 text-green-800'}`
                          : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {severity.charAt(0).toUpperCase() + severity.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BellSlashIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600">
                {notifications.length === 0 
                  ? "You're all caught up! No new alerts at the moment."
                  : "No notifications match your current filters."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => {
            const severity = getSeverityFromType(notification.type);
            const severityColorClass = getSeverityColor(severity);

            return (
              <Card 
                key={notification.id}
                className={`border-l-4 transition-all hover:shadow-md cursor-pointer ${severityColorClass} ${
                  notification.is_read ? 'opacity-75' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type, severity)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`text-sm font-medium ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                            {notification.title}
                          </h4>
                          <p className={`text-sm mt-1 ${notification.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>{getTypeDisplayName(notification.type)}</span>
                            <span>•</span>
                            <span>{formatNotificationTime(notification.timestamp)}</span>
                            {!notification.is_read && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600 font-medium">New</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-4">
                          {notification.actions && notification.actions.length > 0 && (
                            <div className="flex gap-1">
                              {notification.actions.map((action, index) => (
                                <Button
                                  key={index}
                                  variant={action.variant === 'danger' ? 'destructive' : 
                                          action.variant === 'primary' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    action.action();
                                  }}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDismiss(notification.id);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Load More / Pagination could be added here */}
      {filteredNotifications.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            Showing {filteredNotifications.length} of {notifications.length} notifications
          </p>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;