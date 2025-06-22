'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertRule } from '@/services/alert-engine';
import { Alert } from '@/types';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface AlertRulesManagerProps {
  rules: AlertRule[];
  onAddRule: (rule: Omit<AlertRule, 'id'>) => void;
  onUpdateRule: (id: string, updates: Partial<AlertRule>) => void;
  onDeleteRule: (id: string) => void;
  onTestRule?: (rule: AlertRule) => void;
  className?: string;
}

interface RuleFormData {
  type: Alert['type'];
  enabled: boolean;
  threshold: number;
  comparison: AlertRule['comparison'];
  message: string;
  severity: AlertRule['severity'];
  cooldownHours: number;
}

const defaultFormData: RuleFormData = {
  type: 'low_balance',
  enabled: true,
  threshold: 500,
  comparison: 'less_than',
  message: 'Custom alert triggered',
  severity: 'medium',
  cooldownHours: 24
};

const alertTypeOptions: { value: Alert['type']; label: string; description: string }[] = [
  {
    value: 'low_balance',
    label: 'Low Balance',
    description: 'Alert when account balance falls below threshold'
  },
  {
    value: 'high_spending',
    label: 'High Spending',
    description: 'Alert when spending increases significantly'
  },
  {
    value: 'projection_warning',
    label: 'Projection Warning',
    description: 'Alert when financial projections indicate problems'
  },
  {
    value: 'goal_milestone',
    label: 'Goal Milestone',
    description: 'Alert when financial goals reach milestones'
  }
];

const comparisonOptions: { value: AlertRule['comparison']; label: string }[] = [
  { value: 'less_than', label: 'Less than' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'equal_to', label: 'Equal to' },
  { value: 'percentage_change', label: 'Percentage change' }
];

const severityOptions: { value: AlertRule['severity']; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-blue-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' }
];

const getSeverityIcon = (severity: AlertRule['severity']) => {
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

export function AlertRulesManager({
  rules,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onTestRule,
  className = ''
}: AlertRulesManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRule) {
      onUpdateRule(editingRule.id, {
        ...formData,
        lastTriggered: editingRule.lastTriggered
      });
    } else {
      onAddRule({
        ...formData,
        id: `custom-${Date.now()}`
      });
    }
    
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormData(defaultFormData);
  };

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setFormData({
      type: rule.type,
      enabled: rule.enabled,
      threshold: rule.threshold,
      comparison: rule.comparison,
      message: rule.message,
      severity: rule.severity,
      cooldownHours: rule.cooldownHours
    });
    setShowForm(true);
  };

  const handleToggleEnabled = (rule: AlertRule) => {
    onUpdateRule(rule.id, { enabled: !rule.enabled });
  };

  const toggleRuleExpansion = (ruleId: string) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId);
    } else {
      newExpanded.add(ruleId);
    }
    setExpandedRules(newExpanded);
  };

  const formatLastTriggered = (timestamp?: string): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  const isCustomRule = (ruleId: string): boolean => {
    return ruleId.startsWith('custom-');
  };

  const getThresholdLabel = (type: Alert['type'], comparison: AlertRule['comparison']): string => {
    switch (type) {
      case 'low_balance':
        return 'Balance (£)';
      case 'high_spending':
        return comparison === 'percentage_change' ? 'Increase (%)' : 'Amount (£)';
      case 'projection_warning':
        return comparison === 'percentage_change' ? 'Change (%)' : 'Months';
      case 'goal_milestone':
        return 'Progress (%)';
      default:
        return 'Threshold';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Cog6ToothIcon className="h-5 w-5" />
              Alert Rules Management
            </CardTitle>
            <Button onClick={() => setShowForm(true)} disabled={showForm}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Rule Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRule ? 'Edit Alert Rule' : 'Create New Alert Rule'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Alert Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Alert['type'] })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {alertTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {alertTypeOptions.find(opt => opt.value === formData.type)?.description}
                  </p>
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Severity
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as AlertRule['severity'] })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {severityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Comparison */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condition
                  </label>
                  <select
                    value={formData.comparison}
                    onChange={(e) => setFormData({ ...formData, comparison: e.target.value as AlertRule['comparison'] })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {comparisonOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {getThresholdLabel(formData.type, formData.comparison)}
                  </label>
                  <input
                    type="number"
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Cooldown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cooldown (hours)
                  </label>
                  <input
                    type="number"
                    value={formData.cooldownHours}
                    onChange={(e) => setFormData({ ...formData, cooldownHours: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min="0"
                  />
                </div>

                {/* Enabled */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
                    Enable this rule
                  </label>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                  placeholder="Enter the message to display when this alert is triggered..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 pt-4">
                <Button type="submit">
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Rules List */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Cog6ToothIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No alert rules</h3>
              <p className="text-gray-600 mb-4">
                Create your first alert rule to start monitoring your finances.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className={`transition-all ${rule.enabled ? '' : 'opacity-60'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSeverityIcon(rule.severity)}
                      <h4 className="font-medium text-gray-900">
                        {alertTypeOptions.find(opt => opt.value === rule.type)?.label}
                      </h4>
                      {!rule.enabled && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          Disabled
                        </span>
                      )}
                      {!isCustomRule(rule.id) && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                          System
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">
                      {rule.message}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        {comparisonOptions.find(opt => opt.value === rule.comparison)?.label} {rule.threshold}
                        {rule.comparison === 'percentage_change' ? '%' : 
                         rule.type === 'low_balance' ? '£' : ''}
                      </span>
                      <span>•</span>
                      <span>Cooldown: {rule.cooldownHours}h</span>
                      <span>•</span>
                      <span>Last triggered: {formatLastTriggered(rule.lastTriggered)}</span>
                    </div>

                    {expandedRules.has(rule.id) && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="font-medium">Type:</span> {rule.type}
                          </div>
                          <div>
                            <span className="font-medium">Severity:</span> {rule.severity}
                          </div>
                          <div>
                            <span className="font-medium">Comparison:</span> {rule.comparison}
                          </div>
                          <div>
                            <span className="font-medium">Threshold:</span> {rule.threshold}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRuleExpansion(rule.id)}
                      title={expandedRules.has(rule.id) ? 'Collapse' : 'Expand'}
                    >
                      {expandedRules.has(rule.id) ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleEnabled(rule)}
                      title={rule.enabled ? 'Disable' : 'Enable'}
                    >
                      {rule.enabled ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </Button>

                    {onTestRule && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTestRule(rule)}
                        title="Test Rule"
                      >
                        Test
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(rule)}
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    
                    {isCustomRule(rule.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteRule(rule.id)}
                        title="Delete"
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default AlertRulesManager;