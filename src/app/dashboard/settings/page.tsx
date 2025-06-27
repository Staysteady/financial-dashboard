'use client';

import { useState } from 'react';
import {
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  EyeIcon,
  EyeSlashIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface SettingsSection {
  id: string;
  name: string;
  icon: any;
}

const settingsSections: SettingsSection[] = [
  { id: 'general', name: 'General', icon: Cog6ToothIcon },
  { id: 'notifications', name: 'Notifications', icon: BellIcon },
  { id: 'privacy', name: 'Privacy & Security', icon: ShieldCheckIcon },
  { id: 'currency', name: 'Currency & Region', icon: CurrencyDollarIcon },
];

function GeneralSettings() {
  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'en',
    dateFormat: 'dd/mm/yyyy',
    numberFormat: 'european',
    autoRefresh: true,
    compactView: false
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Theme</label>
              <p className="text-sm text-gray-600">Choose your preferred theme</p>
            </div>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({...settings, theme: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Language</label>
              <p className="text-sm text-gray-600">Select your preferred language</p>
            </div>
            <select
              value={settings.language}
              onChange={(e) => setSettings({...settings, language: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Date Format</label>
              <p className="text-sm text-gray-600">How dates are displayed</p>
            </div>
            <select
              value={settings.dateFormat}
              onChange={(e) => setSettings({...settings, dateFormat: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="dd/mm/yyyy">DD/MM/YYYY</option>
              <option value="mm/dd/yyyy">MM/DD/YYYY</option>
              <option value="yyyy-mm-dd">YYYY-MM-DD</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Auto Refresh</label>
              <p className="text-sm text-gray-600">Automatically refresh account data</p>
            </div>
            <button
              onClick={() => setSettings({...settings, autoRefresh: !settings.autoRefresh})}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                settings.autoRefresh ? "bg-blue-600" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  settings.autoRefresh ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Compact View</label>
              <p className="text-sm text-gray-600">Use compact layout for tables and lists</p>
            </div>
            <button
              onClick={() => setSettings({...settings, compactView: !settings.compactView})}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                settings.compactView ? "bg-blue-600" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  settings.compactView ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    budgetAlerts: true,
    transactionAlerts: true,
    securityAlerts: true,
    weeklyReports: true,
    monthlyReports: true
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
        
        <div className="space-y-6">
          {/* Notification Channels */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Notification Channels</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-900">Email Notifications</label>
                    <p className="text-sm text-gray-600">Receive notifications via email</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, email: !notifications.email})}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    notifications.email ? "bg-blue-600" : "bg-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      notifications.email ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <label className="text-sm font-medium text-gray-900">Push Notifications</label>
                    <p className="text-sm text-gray-600">Receive push notifications on your device</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, push: !notifications.push})}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    notifications.push ? "bg-blue-600" : "bg-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      notifications.push ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Alert Types */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Alert Types</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Budget Alerts</label>
                  <p className="text-sm text-gray-600">Get notified when approaching budget limits</p>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, budgetAlerts: !notifications.budgetAlerts})}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    notifications.budgetAlerts ? "bg-blue-600" : "bg-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      notifications.budgetAlerts ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Transaction Alerts</label>
                  <p className="text-sm text-gray-600">Get notified of new transactions</p>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, transactionAlerts: !notifications.transactionAlerts})}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    notifications.transactionAlerts ? "bg-blue-600" : "bg-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      notifications.transactionAlerts ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Security Alerts</label>
                  <p className="text-sm text-gray-600">Important security notifications</p>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, securityAlerts: !notifications.securityAlerts})}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    notifications.securityAlerts ? "bg-blue-600" : "bg-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      notifications.securityAlerts ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacySettings() {
  const [privacy, setPrivacy] = useState({
    twoFactorAuth: true,
    sessionTimeout: '30',
    dataSharing: false,
    analyticsTracking: true,
    balanceVisibility: true
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Security</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Two-Factor Authentication</label>
              <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
            </div>
            <button
              onClick={() => setPrivacy({...privacy, twoFactorAuth: !privacy.twoFactorAuth})}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                privacy.twoFactorAuth ? "bg-blue-600" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  privacy.twoFactorAuth ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Session Timeout</label>
              <p className="text-sm text-gray-600">Automatically log out after inactivity</p>
            </div>
            <select
              value={privacy.sessionTimeout}
              onChange={(e) => setPrivacy({...privacy, sessionTimeout: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="240">4 hours</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Balance Visibility</label>
              <p className="text-sm text-gray-600">Show account balances by default</p>
            </div>
            <button
              onClick={() => setPrivacy({...privacy, balanceVisibility: !privacy.balanceVisibility})}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                privacy.balanceVisibility ? "bg-blue-600" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  privacy.balanceVisibility ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrencySettings() {
  const [currency, setCurrency] = useState({
    primaryCurrency: 'GBP',
    region: 'UK',
    timezone: 'Europe/London',
    numberFormat: 'en-GB'
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Currency & Region</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Primary Currency</label>
              <p className="text-sm text-gray-600">Default currency for displaying amounts</p>
            </div>
            <select
              value={currency.primaryCurrency}
              onChange={(e) => setCurrency({...currency, primaryCurrency: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="GBP">GBP - British Pound</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="CAD">CAD - Canadian Dollar</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Region</label>
              <p className="text-sm text-gray-600">Your location for regional features</p>
            </div>
            <select
              value={currency.region}
              onChange={(e) => setCurrency({...currency, region: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="UK">United Kingdom</option>
              <option value="US">United States</option>
              <option value="EU">European Union</option>
              <option value="CA">Canada</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Timezone</label>
              <p className="text-sm text-gray-600">Your local timezone</p>
            </div>
            <select
              value={currency.timezone}
              onChange={(e) => setCurrency({...currency, timezone: e.target.value})}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Europe/London">London (GMT)</option>
              <option value="America/New_York">New York (EST)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="America/Toronto">Toronto (EST)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('general');

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return <GeneralSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'privacy':
        return <PrivacySettings />;
      case 'currency':
        return <CurrencySettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account preferences and configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors",
                    activeSection === section.id
                      ? "bg-blue-50 text-blue-600 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{section.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {renderContent()}
            
            {/* Save Button */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
