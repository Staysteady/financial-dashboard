'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NotificationPreferences, NotificationChannel } from '@/services/notification-service';
import { 
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ClockIcon,
  Cog6ToothIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface NotificationPreferencesProps {
  preferences: NotificationPreferences;
  onUpdatePreferences: (preferences: NotificationPreferences) => void;
  onTestNotification?: (channel: NotificationChannel['type']) => void;
  className?: string;
}

const channelIcons = {
  email: EnvelopeIcon,
  sms: DevicePhoneMobileIcon,
  push: ComputerDesktopIcon,
  in_app: BellIcon
};

const channelLabels = {
  email: 'Email',
  sms: 'SMS',
  push: 'Push Notifications',
  in_app: 'In-App Notifications'
};

const channelDescriptions = {
  email: 'Receive alerts via email',
  sms: 'Receive alerts via text message',
  push: 'Browser push notifications',
  in_app: 'Notifications within the app'
};

const severityLabels = {
  low: 'Low Priority',
  medium: 'Medium Priority',
  high: 'High Priority',
  critical: 'Critical Alerts'
};

const severityDescriptions = {
  low: 'Goal milestones and positive updates',
  medium: 'Spending changes and general alerts',
  high: 'Important financial warnings',
  critical: 'Urgent issues requiring immediate attention'
};

const timezones = [
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
];

export function NotificationPreferencesSettings({
  preferences,
  onUpdatePreferences,
  onTestNotification,
  className = ''
}: NotificationPreferencesProps) {
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences>(preferences);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const updatePreferences = (updates: Partial<NotificationPreferences>) => {
    const newPreferences = { ...localPreferences, ...updates };
    setLocalPreferences(newPreferences);
    setUnsavedChanges(true);
  };

  const updateChannel = (channelType: NotificationChannel['type'], updates: Partial<NotificationChannel>) => {
    const newChannels = localPreferences.channels.map(channel =>
      channel.type === channelType ? { ...channel, ...updates } : channel
    );
    updatePreferences({ channels: newChannels });
  };

  const updateQuietHours = (updates: Partial<NotificationPreferences['quietHours']>) => {
    updatePreferences({
      quietHours: { ...localPreferences.quietHours, ...updates }
    });
  };

  const updateFrequency = (updates: Partial<NotificationPreferences['frequency']>) => {
    updatePreferences({
      frequency: { ...localPreferences.frequency, ...updates }
    });
  };

  const updateSeverityFilters = (updates: Partial<NotificationPreferences['severityFilters']>) => {
    updatePreferences({
      severityFilters: { ...localPreferences.severityFilters, ...updates }
    });
  };

  const handleSave = () => {
    onUpdatePreferences(localPreferences);
    setUnsavedChanges(false);
  };

  const handleReset = () => {
    setLocalPreferences(preferences);
    setUnsavedChanges(false);
  };

  const handleTestNotification = (channelType: NotificationChannel['type']) => {
    if (onTestNotification) {
      onTestNotification(channelType);
    }
  };

  const isChannelEnabled = (channelType: NotificationChannel['type']): boolean => {
    return localPreferences.channels.find(c => c.type === channelType)?.enabled || false;
  };

  const getChannelConfig = (channelType: NotificationChannel['type']): Record<string, any> => {
    return localPreferences.channels.find(c => c.type === channelType)?.config || {};
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Cog6ToothIcon className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            {unsavedChanges && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {localPreferences.channels.map((channel) => {
            const IconComponent = channelIcons[channel.type];
            const isEnabled = channel.enabled;
            
            return (
              <div key={channel.type} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <IconComponent className="h-5 w-5 text-gray-500 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {channelLabels[channel.type]}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {channelDescriptions[channel.type]}
                      </p>
                      
                      {/* Channel-specific configuration */}
                      {channel.type === 'email' && isEnabled && (
                        <div className="mt-2">
                          <input
                            type="email"
                            placeholder="Enter email address"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 w-64"
                          />
                        </div>
                      )}
                      
                      {channel.type === 'sms' && isEnabled && (
                        <div className="mt-2">
                          <input
                            type="tel"
                            placeholder="Enter phone number"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 w-64"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {onTestNotification && isEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestNotification(channel.type)}
                      >
                        Test
                      </Button>
                    )}
                    
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => updateChannel(channel.type, { enabled: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Enable Quiet Hours</h4>
              <p className="text-sm text-gray-600">
                Pause non-critical notifications during specified hours
              </p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localPreferences.quietHours.enabled}
                onChange={(e) => updateQuietHours({ enabled: e.target.checked })}
                className="sr-only"
              />
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localPreferences.quietHours.enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localPreferences.quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
            </label>
          </div>

          {localPreferences.quietHours.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={localPreferences.quietHours.start}
                  onChange={(e) => updateQuietHours({ start: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={localPreferences.quietHours.end}
                  onChange={(e) => updateQuietHours({ end: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  value={localPreferences.quietHours.timezone}
                  onChange={(e) => updateQuietHours({ timezone: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Frequency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={localPreferences.frequency.immediate}
                onChange={(e) => updateFrequency({ immediate: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">Immediate</span>
                <p className="text-sm text-gray-600">Send notifications as alerts are triggered</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={localPreferences.frequency.daily}
                onChange={(e) => updateFrequency({ daily: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">Daily Summary</span>
                <p className="text-sm text-gray-600">Daily digest of all alerts</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={localPreferences.frequency.weekly}
                onChange={(e) => updateFrequency({ weekly: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">Weekly Summary</span>
                <p className="text-sm text-gray-600">Weekly financial health report</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Severity Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Severity Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Choose which severity levels should trigger notifications
          </p>
          
          <div className="space-y-3">
            {Object.entries(severityLabels).map(([severity, label]) => (
              <label key={severity} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={localPreferences.severityFilters[severity as keyof typeof severityLabels]}
                  onChange={(e) => updateSeverityFilters({ 
                    [severity]: e.target.checked 
                  } as Partial<NotificationPreferences['severityFilters']>)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <div>
                  <span className={`font-medium ${
                    severity === 'critical' ? 'text-red-700' :
                    severity === 'high' ? 'text-orange-700' :
                    severity === 'medium' ? 'text-blue-700' :
                    'text-green-700'
                  }`}>
                    {label}
                  </span>
                  <p className="text-sm text-gray-600">
                    {severityDescriptions[severity as keyof typeof severityDescriptions]}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Changes Footer */}
      {unsavedChanges && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  You have unsaved changes
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Discard
                </Button>
                <Button onClick={handleSave}>
                  <CheckIcon className="h-4 w-4 mr-1" />
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default NotificationPreferencesSettings;