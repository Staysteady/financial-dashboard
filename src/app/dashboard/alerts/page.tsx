'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import NotificationCenter from '@/components/ui/notification-center';
import AlertRulesManager from '@/components/ui/alert-rules-manager';
import NotificationPreferencesSettings from '@/components/ui/notification-preferences';
import AlertHistory from '@/components/ui/alert-history';
import AlertEngine, { AlertRule, AlertContext, AlertResult } from '@/services/alert-engine';
import NotificationService, { NotificationPreferences } from '@/services/notification-service';
import { Account, Transaction, Alert } from '@/types';
import { 
  BellIcon,
  Cog6ToothIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// Mock data for demonstration
const mockAccounts: Account[] = [
  { 
    id: '1', 
    user_id: 'user1',
    institution_name: 'HSBC',
    account_name: 'HSBC Current Account', 
    balance: 150.32, // Low balance to trigger alert
    account_type: 'current',
    currency: 'GBP',
    last_updated: new Date().toISOString(),
    is_active: true,
    api_connected: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  { 
    id: '2', 
    user_id: 'user1',
    institution_name: 'Atom Bank',
    account_name: 'Atom Bank Savings', 
    balance: 15000.00, 
    account_type: 'savings',
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
  const currentDate = new Date();
  
  // Recent high spending to trigger alerts
  for (let i = 0; i < 30; i++) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - i);
    
    transactions.push({
      id: `txn-${i}`,
      account_id: '1',
      amount: 50 + Math.random() * 200, // Higher amounts recently
      currency: 'GBP',
      description: `Transaction ${i}`,
      category: 'Shopping',
      date: date.toISOString(),
      type: 'expense',
      is_recurring: false,
      created_at: date.toISOString(),
      updated_at: date.toISOString()
    });
  }
  
  return transactions;
};

const mockTransactions = generateMockTransactions();

type TabType = 'notifications' | 'rules' | 'preferences' | 'history';

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('notifications');
  const [alertEngine] = useState(() => new AlertEngine());
  const [notificationService] = useState(() => new NotificationService({
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpUser: 'user@example.com',
    smtpPass: 'password',
    fromEmail: 'alerts@financialdashboard.com',
    fromName: 'Financial Dashboard'
  }));
  
  const [alertResults, setAlertResults] = useState<AlertResult[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    NotificationService.getDefaultPreferences()
  );
  const [alertHistory, setAlertHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize and evaluate alerts on component mount
  useEffect(() => {
    evaluateAlerts();
    generateMockNotifications();
    generateMockHistory();
  }, []);

  const evaluateAlerts = async () => {
    setLoading(true);
    try {
      const context: AlertContext = {
        accounts: mockAccounts,
        transactions: mockTransactions
      };
      
      const results = await alertEngine.evaluateAlerts(context);
      setAlertResults(results);
      
      // Send notifications for triggered alerts
      if (results.some(r => r.triggered)) {
        await notificationService.sendNotifications('user1', results, preferences);
      }
    } catch (error) {
      console.error('Error evaluating alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockNotifications = () => {
    const mockNotifs = [
      {
        id: 'notif-1',
        user_id: 'user1',
        type: 'low_balance' as const,
        title: 'Low Balance Alert',
        message: 'Your HSBC Current Account balance is below £500',
        threshold_value: 500,
        is_active: true,
        is_read: false,
        triggered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        created_at: new Date().toISOString(),
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        actions: [
          {
            label: 'Transfer Funds',
            action: () => console.log('Transfer funds'),
            variant: 'primary' as const
          },
          {
            label: 'View Account',
            action: () => console.log('View account'),
            variant: 'secondary' as const
          }
        ]
      },
      {
        id: 'notif-2',
        user_id: 'user1',
        type: 'high_spending' as const,
        title: 'High Spending Alert',
        message: 'Monthly shopping expenses have increased by 45% compared to last month',
        threshold_value: 25,
        is_active: true,
        is_read: true,
        triggered_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        created_at: new Date().toISOString(),
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        actions: [
          {
            label: 'Review Transactions',
            action: () => console.log('Review transactions'),
            variant: 'primary' as const
          }
        ]
      },
      {
        id: 'notif-3',
        user_id: 'user1',
        type: 'goal_milestone' as const,
        title: 'Goal Milestone Reached!',
        message: 'You\'ve reached 75% of your Emergency Fund savings goal',
        threshold_value: 75,
        is_active: true,
        is_read: false,
        triggered_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        created_at: new Date().toISOString(),
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        actions: [
          {
            label: 'View Goals',
            action: () => console.log('View goals'),
            variant: 'primary' as const
          }
        ]
      }
    ];
    
    setNotifications(mockNotifs);
  };

  const generateMockHistory = () => {
    const mockHistoryData = [
      {
        id: 'hist-1',
        alertId: 'low-balance',
        alertType: 'low_balance' as const,
        title: 'Low Balance Alert',
        message: 'Account balance below £500 threshold',
        severity: 'high' as const,
        triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'active' as const,
        notificationsSent: []
      },
      {
        id: 'hist-2',
        alertId: 'high-spending',
        alertType: 'high_spending' as const,
        title: 'High Spending Alert',
        message: 'Shopping expenses increased significantly',
        severity: 'medium' as const,
        triggeredAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        acknowledgedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        status: 'acknowledged' as const,
        notificationsSent: []
      },
      {
        id: 'hist-3',
        alertId: 'goal-milestone',
        alertType: 'goal_milestone' as const,
        title: 'Goal Milestone',
        message: 'Emergency fund milestone reached',
        severity: 'low' as const,
        triggeredAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        status: 'resolved' as const,
        notificationsSent: []
      }
    ];
    
    setAlertHistory(mockHistoryData);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, is_read: true } : notif
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, is_read: true }))
    );
  };

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const handleAddRule = (rule: Omit<AlertRule, 'id'>) => {
    alertEngine.addCustomRule({ ...rule, id: `custom-${Date.now()}` });
    evaluateAlerts(); // Re-evaluate with new rule
  };

  const handleUpdateRule = (id: string, updates: Partial<AlertRule>) => {
    alertEngine.updateRule(id, updates);
    evaluateAlerts(); // Re-evaluate with updated rule
  };

  const handleDeleteRule = (id: string) => {
    alertEngine.deleteCustomRule(id);
    evaluateAlerts(); // Re-evaluate without deleted rule
  };

  const handleTestRule = (rule: AlertRule) => {
    console.log('Testing rule:', rule);
    // In a real implementation, this would test the rule against current data
  };

  const handleUpdatePreferences = (newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences);
    // In a real implementation, this would save to database
    console.log('Updated preferences:', newPreferences);
  };

  const handleTestNotification = (channel: string) => {
    console.log('Testing notification channel:', channel);
    // In a real implementation, this would send a test notification
  };

  const handleHistoryAction = (id: string, action: string) => {
    setAlertHistory(prev => 
      prev.map(item => 
        item.id === id 
          ? { 
              ...item, 
              status: action === 'acknowledge' ? 'acknowledged' : 'dismissed',
              [`${action}dAt`]: new Date().toISOString()
            }
          : item
      )
    );
  };

  const handleBulkHistoryAction = (ids: string[], action: string) => {
    if (action === 'delete') {
      setAlertHistory(prev => prev.filter(item => !ids.includes(item.id)));
    } else {
      ids.forEach(id => handleHistoryAction(id, action));
    }
  };

  const getAlertSummary = () => {
    const active = alertResults.filter(r => r.triggered).length;
    const total = notifications.length;
    const unread = notifications.filter(n => !n.is_read).length;
    
    return { active, total, unread };
  };

  const summary = getAlertSummary();

  const tabs = [
    { 
      id: 'notifications' as TabType, 
      label: 'Notifications', 
      icon: BellIcon, 
      badge: summary.unread > 0 ? summary.unread : undefined 
    },
    { 
      id: 'rules' as TabType, 
      label: 'Alert Rules', 
      icon: Cog6ToothIcon 
    },
    { 
      id: 'preferences' as TabType, 
      label: 'Preferences', 
      icon: Cog6ToothIcon 
    },
    { 
      id: 'history' as TabType, 
      label: 'History', 
      icon: ClockIcon 
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alerts & Notifications</h1>
            <p className="text-gray-600">Manage your financial alerts and notification preferences</p>
          </div>
          <Button onClick={evaluateAlerts} disabled={loading}>
            {loading ? 'Evaluating...' : 'Check Alerts'}
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary.active}</p>
                <p className="text-sm text-gray-600">Active Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BellIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary.unread}</p>
                <p className="text-sm text-gray-600">Unread Notifications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{alertEngine.getAllRules().length}</p>
                <p className="text-sm text-gray-600">Alert Rules</p>
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
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    {tab.label}
                    {tab.badge && (
                      <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      <div>
        {activeTab === 'notifications' && (
          <NotificationCenter
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onDismiss={handleDismissNotification}
            onClearAll={handleClearAllNotifications}
            onOpenSettings={() => setActiveTab('preferences')}
          />
        )}

        {activeTab === 'rules' && (
          <AlertRulesManager
            rules={alertEngine.getAllRules()}
            onAddRule={handleAddRule}
            onUpdateRule={handleUpdateRule}
            onDeleteRule={handleDeleteRule}
            onTestRule={handleTestRule}
          />
        )}

        {activeTab === 'preferences' && (
          <NotificationPreferencesSettings
            preferences={preferences}
            onUpdatePreferences={handleUpdatePreferences}
            onTestNotification={handleTestNotification}
          />
        )}

        {activeTab === 'history' && (
          <AlertHistory
            history={alertHistory}
            onAcknowledge={(id) => handleHistoryAction(id, 'acknowledge')}
            onDismiss={(id) => handleHistoryAction(id, 'dismiss')}
            onDelete={(id) => handleBulkHistoryAction([id], 'delete')}
            onBulkAction={handleBulkHistoryAction}
            onExport={(filters) => console.log('Export with filters:', filters)}
          />
        )}
      </div>
    </div>
  );
}