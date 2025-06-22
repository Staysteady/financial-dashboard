'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BackupRestoreService from '@/services/backup-restore-service';
import { 
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  ShieldCheckIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface BackupRestoreProps {
  className?: string;
}

export function BackupRestore({ className = '' }: BackupRestoreProps) {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupOptions, setBackupOptions] = useState({
    includeTransactions: true,
    includeAccounts: true,
    includeBudgets: true,
    includeGoals: true,
    includeAlerts: true,
    includeSettings: true,
    encrypt: false,
    password: ''
  });
  const [restoreOptions, setRestoreOptions] = useState({
    validateOnly: false,
    mergeStrategy: 'merge' as 'replace' | 'merge' | 'skip_duplicates',
    password: ''
  });
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [backupHistory, setBackupHistory] = useState([
    {
      id: '1',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'full_backup',
      size: '2.5 MB',
      encrypted: true
    },
    {
      id: '2',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'full_backup',
      size: '2.3 MB',
      encrypted: false
    }
  ]);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setStatusMessage(null);

    try {
      const backupData = await BackupRestoreService.createBackup(backupOptions);
      
      BackupRestoreService.downloadBackup(backupData, {
        filename: `financial_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`,
        format: backupOptions.encrypt ? 'encrypted' : 'json'
      });

      // Add to backup history
      const newBackup = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: 'full_backup' as const,
        size: `${(backupData.length / 1024).toFixed(1)} KB`,
        encrypted: backupOptions.encrypt
      };
      setBackupHistory(prev => [newBackup, ...prev]);

      setStatusMessage({
        type: 'success',
        message: 'Backup created and downloaded successfully!'
      });
    } catch (error) {
      console.error('Backup creation error:', error);
      setStatusMessage({
        type: 'error',
        message: 'Failed to create backup. Please try again.'
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreFile) {
      setStatusMessage({
        type: 'error',
        message: 'Please select a backup file to restore.'
      });
      return;
    }

    setIsRestoring(true);
    setStatusMessage(null);

    try {
      const backupString = await BackupRestoreService.readFileAsText(restoreFile);
      
      const result = await BackupRestoreService.restoreFromBackup(
        backupString,
        restoreOptions.password,
        {
          validateOnly: restoreOptions.validateOnly,
          mergeStrategy: restoreOptions.mergeStrategy
        }
      );

      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: restoreOptions.validateOnly 
            ? 'Backup validation successful!' 
            : 'Data restored successfully!'
        });
      } else {
        setStatusMessage({
          type: 'error',
          message: result.message
        });
      }
    } catch (error) {
      console.error('Restore error:', error);
      setStatusMessage({
        type: 'error',
        message: 'Failed to restore backup. Please check the file and try again.'
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setRestoreFile(file);
      setStatusMessage(null);
    }
  };

  const formatFileSize = (sizeStr: string) => {
    return sizeStr;
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'MMM dd, yyyy HH:mm');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Message */}
      {statusMessage && (
        <Card className={`${
          statusMessage.type === 'success' ? 'border-green-200 bg-green-50' :
          statusMessage.type === 'error' ? 'border-red-200 bg-red-50' :
          'border-blue-200 bg-blue-50'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' && <CheckCircleIcon className="h-5 w-5 text-green-600" />}
              {statusMessage.type === 'error' && <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />}
              {statusMessage.type === 'info' && <ShieldCheckIcon className="h-5 w-5 text-blue-600" />}
              <span className={`font-medium ${
                statusMessage.type === 'success' ? 'text-green-800' :
                statusMessage.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {statusMessage.message}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudArrowUpIcon className="h-5 w-5" />
            Create Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data Selection */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Data to Include</h4>
              <div className="space-y-2">
                {[
                  { key: 'includeAccounts', label: 'Accounts' },
                  { key: 'includeTransactions', label: 'Transactions' },
                  { key: 'includeBudgets', label: 'Budgets' },
                  { key: 'includeGoals', label: 'Financial Goals' },
                  { key: 'includeAlerts', label: 'Alerts' },
                  { key: 'includeSettings', label: 'Settings' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={backupOptions[key as keyof typeof backupOptions] as boolean}
                      onChange={(e) => setBackupOptions(prev => ({
                        ...prev,
                        [key]: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Security Options */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Security Options</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={backupOptions.encrypt}
                    onChange={(e) => setBackupOptions(prev => ({
                      ...prev,
                      encrypt: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Encrypt backup</span>
                </label>

                {backupOptions.encrypt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Encryption Password
                    </label>
                    <input
                      type="password"
                      value={backupOptions.password}
                      onChange={(e) => setBackupOptions(prev => ({
                        ...prev,
                        password: e.target.value
                      }))}
                      placeholder="Enter a strong password"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup || (backupOptions.encrypt && !backupOptions.password)}
              className="flex items-center gap-2"
            >
              {isCreatingBackup ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <CloudArrowUpIcon className="h-4 w-4" />
              )}
              {isCreatingBackup ? 'Creating Backup...' : 'Create & Download Backup'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Restore Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudArrowDownIcon className="h-5 w-5" />
            Restore Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Selection */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Select Backup File</h4>
              <div className="space-y-3">
                <input
                  type="file"
                  accept=".json,.encrypted"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {restoreFile && (
                  <div className="text-sm text-gray-600">
                    Selected: {restoreFile.name} ({(restoreFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
            </div>

            {/* Restore Options */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Restore Options</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Merge Strategy
                  </label>
                  <select
                    value={restoreOptions.mergeStrategy}
                    onChange={(e) => setRestoreOptions(prev => ({
                      ...prev,
                      mergeStrategy: e.target.value as any
                    }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="merge">Merge with existing data</option>
                    <option value="replace">Replace existing data</option>
                    <option value="skip_duplicates">Skip duplicates</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Decryption Password (if encrypted)
                  </label>
                  <input
                    type="password"
                    value={restoreOptions.password}
                    onChange={(e) => setRestoreOptions(prev => ({
                      ...prev,
                      password: e.target.value
                    }))}
                    placeholder="Enter password if backup is encrypted"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={restoreOptions.validateOnly}
                    onChange={(e) => setRestoreOptions(prev => ({
                      ...prev,
                      validateOnly: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Validate only (don't restore)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={handleRestoreBackup}
              disabled={isRestoring || !restoreFile}
              className="flex items-center gap-2"
            >
              {isRestoring ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <CloudArrowDownIcon className="h-4 w-4" />
              )}
              {isRestoring ? 'Processing...' : 
               restoreOptions.validateOnly ? 'Validate Backup' : 'Restore Data'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Backup History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {backupHistory.length === 0 ? (
            <div className="text-center py-8">
              <DocumentDuplicateIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Backups Yet</h3>
              <p className="text-gray-600">Create your first backup to see it here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backupHistory.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      backup.encrypted ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {backup.encrypted ? (
                        <ShieldCheckIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <DocumentDuplicateIcon className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {backup.type === 'full_backup' ? 'Full Backup' : 'Incremental Backup'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(backup.date)} • {formatFileSize(backup.size)} • 
                        {backup.encrypted ? ' Encrypted' : ' Unencrypted'}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automatic Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog6ToothIcon className="h-5 w-5" />
            Automatic Backup Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Coming Soon</span>
            </div>
            <p className="text-yellow-700 text-sm mt-1">
              Automatic backup scheduling will be available in the next release.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BackupRestore;