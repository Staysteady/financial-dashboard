'use client';

import { useState, useMemo } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  TagIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { CategoryRule, AutoCategorizationEngine } from '@/lib/categorization';

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parentId?: string;
  isActive: boolean;
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
  lastUsed?: string;
  rules: CategoryRule[];
}

interface CategoryManagementProps {
  categories: Category[];
  onCategoryCreate?: (category: Omit<Category, 'id' | 'transactionCount' | 'totalAmount' | 'averageAmount' | 'rules'>) => void;
  onCategoryUpdate?: (id: string, updates: Partial<Category>) => void;
  onCategoryDelete?: (id: string) => void;
  onRuleCreate?: (categoryId: string, rule: Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onRuleUpdate?: (categoryId: string, ruleId: string, updates: Partial<CategoryRule>) => void;
  onRuleDelete?: (categoryId: string, ruleId: string) => void;
  categorizationEngine?: AutoCategorizationEngine;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280',
  '#0ea5e9', '#22c55e', '#eab308', '#dc2626', '#a855f7'
];

const DEFAULT_ICONS = [
  '🏪', '🍕', '⛽', '🏠', '💊', '👕', '🎬', '🚗', '📱', '💰',
  '🎯', '🍔', '☕', '🏥', '🎮', '📚', '🎵', '🏃', '✈️', '🛒'
];

export function CategoryManagement({
  categories,
  onCategoryCreate,
  onCategoryUpdate,
  onCategoryDelete,
  onRuleCreate,
  onRuleUpdate,
  onRuleDelete,
  categorizationEngine
}: CategoryManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'count' | 'lastUsed'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<CategoryRule | null>(null);

  const filteredAndSortedCategories = useMemo(() => {
    let filtered = categories.filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           category.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesActive = showInactive || category.isActive;
      return matchesSearch && matchesActive;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'amount':
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
        case 'count':
          aValue = a.transactionCount;
          bValue = b.transactionCount;
          break;
        case 'lastUsed':
          aValue = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
          bValue = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [categories, searchTerm, showInactive, sortBy, sortDirection]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your transaction categories and automation rules
          </p>
        </div>
        
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show inactive</span>
            </label>

            <select
              value={`${sortBy}-${sortDirection}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                setSortBy(field as typeof sortBy);
                setSortDirection(direction as typeof sortDirection);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="name-asc">Name (A→Z)</option>
              <option value="name-desc">Name (Z→A)</option>
              <option value="amount-desc">Amount (High→Low)</option>
              <option value="amount-asc">Amount (Low→High)</option>
              <option value="count-desc">Usage (High→Low)</option>
              <option value="count-asc">Usage (Low→High)</option>
              <option value="lastUsed-desc">Recently Used</option>
              <option value="lastUsed-asc">Least Used</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSortedCategories.map((category) => (
          <div
            key={category.id}
            className={cn(
              "bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer",
              !category.isActive && "opacity-60"
            )}
            onClick={() => setSelectedCategory(category)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: category.color }}
                >
                  {category.icon || category.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                {!category.isActive && (
                  <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategory(category);
                    setIsEditModalOpen(true);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Spent:</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(category.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Transactions:</span>
                <span className="font-medium text-gray-900">
                  {category.transactionCount}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Average:</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(category.averageAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last Used:</span>
                <span className="font-medium text-gray-900">
                  {formatDate(category.lastUsed)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Rules:</span>
                <span className="font-medium text-gray-900">
                  {category.rules.length}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAndSortedCategories.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <TagIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm 
              ? "Try adjusting your search terms or filters."
              : "Create your first category to get started."}
          </p>
        </div>
      )}

      {/* Category Detail Modal */}
      {selectedCategory && !isEditModalOpen && (
        <CategoryDetailModal
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
          onEdit={() => setIsEditModalOpen(true)}
          onDelete={() => {
            onCategoryDelete?.(selectedCategory.id);
            setSelectedCategory(null);
          }}
          onCreateRule={() => setIsRuleModalOpen(true)}
          onEditRule={(rule) => {
            setSelectedRule(rule);
            setIsRuleModalOpen(true);
          }}
          onDeleteRule={(ruleId) => {
            onRuleDelete?.(selectedCategory.id, ruleId);
            setSelectedCategory(prev => prev ? {
              ...prev,
              rules: prev.rules.filter(r => r.id !== ruleId)
            } : null);
          }}
        />
      )}

      {/* Create Category Modal */}
      {isCreateModalOpen && (
        <CategoryFormModal
          mode="create"
          onClose={() => setIsCreateModalOpen(false)}
          onSave={(categoryData) => {
            onCategoryCreate?.(categoryData);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* Edit Category Modal */}
      {isEditModalOpen && selectedCategory && (
        <CategoryFormModal
          mode="edit"
          category={selectedCategory}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedCategory(null);
          }}
          onSave={(categoryData) => {
            onCategoryUpdate?.(selectedCategory.id, categoryData);
            setIsEditModalOpen(false);
            setSelectedCategory(null);
          }}
        />
      )}

      {/* Rule Modal */}
      {isRuleModalOpen && selectedCategory && (
        <RuleFormModal
          mode={selectedRule ? 'edit' : 'create'}
          categoryId={selectedCategory.id}
          rule={selectedRule}
          onClose={() => {
            setIsRuleModalOpen(false);
            setSelectedRule(null);
          }}
          onSave={(ruleData) => {
            if (selectedRule) {
              onRuleUpdate?.(selectedCategory.id, selectedRule.id, ruleData);
            } else {
              onRuleCreate?.(selectedCategory.id, ruleData);
            }
            setIsRuleModalOpen(false);
            setSelectedRule(null);
          }}
        />
      )}
    </div>
  );
}

// Category Detail Modal Component
function CategoryDetailModal({ 
  category, 
  onClose, 
  onEdit, 
  onDelete, 
  onCreateRule, 
  onEditRule, 
  onDeleteRule 
}: {
  category: Category;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateRule: () => void;
  onEditRule: (rule: CategoryRule) => void;
  onDeleteRule: (ruleId: string) => void;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-lg"
                style={{ backgroundColor: category.color }}
              >
                {category.icon || category.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{category.name}</h2>
                {category.description && (
                  <p className="text-gray-600">{category.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(category.totalAmount)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-lg font-semibold text-gray-900">
                {category.transactionCount}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Average</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(category.averageAmount)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Rules</p>
              <p className="text-lg font-semibold text-gray-900">
                {category.rules.length}
              </p>
            </div>
          </div>

          {/* Automation Rules */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Automation Rules</h3>
              <button
                onClick={onCreateRule}
                className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Rule</span>
              </button>
            </div>

            {category.rules.length > 0 ? (
              <div className="space-y-3">
                {category.rules.map((rule) => (
                  <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{rule.name}</h4>
                      <div className="flex items-center space-x-2">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          rule.isActive 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        )}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => onEditRule(rule)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteRule(rule.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {rule.conditions.merchantPatterns && (
                        <p>Merchants: {rule.conditions.merchantPatterns.join(', ')}</p>
                      )}
                      {rule.conditions.keywords && (
                        <p>Keywords: {rule.conditions.keywords.join(', ')}</p>
                      )}
                      {rule.conditions.amountRange && (
                        <p>
                          Amount: {rule.conditions.amountRange.min ? `£${rule.conditions.amountRange.min}` : '£0'} - {rule.conditions.amountRange.max ? `£${rule.conditions.amountRange.max}` : '∞'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Cog6ToothIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No automation rules configured</p>
                <p className="text-sm">Add rules to automatically categorize transactions</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onDelete}
              className="flex items-center space-x-1 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Delete</span>
            </button>
            <button
              onClick={onEdit}
              className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PencilIcon className="h-4 w-4" />
              <span>Edit Category</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Category Form Modal Component
function CategoryFormModal({ 
  mode, 
  category, 
  onClose, 
  onSave 
}: {
  mode: 'create' | 'edit';
  category?: Category;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    color: category?.color || DEFAULT_COLORS[0],
    icon: category?.icon || '',
    isActive: category?.isActive ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'create' ? 'Create Category' : 'Edit Category'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="grid grid-cols-5 gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-colors",
                      formData.color === color ? "border-gray-400" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon (Emoji)
              </label>
              <div className="grid grid-cols-10 gap-1 mb-2">
                {DEFAULT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                    className={cn(
                      "w-8 h-8 rounded border text-lg flex items-center justify-center hover:bg-gray-100",
                      formData.icon === icon ? "bg-blue-100 border-blue-300" : "border-gray-200"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="Or enter custom emoji"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {mode === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Rule Form Modal Component
function RuleFormModal({ 
  mode, 
  categoryId, 
  rule, 
  onClose, 
  onSave 
}: {
  mode: 'create' | 'edit';
  categoryId: string;
  rule?: CategoryRule;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    merchantPatterns: rule?.conditions.merchantPatterns?.join(', ') || '',
    descriptionPatterns: rule?.conditions.descriptionPatterns?.join(', ') || '',
    keywords: rule?.conditions.keywords?.join(', ') || '',
    excludeKeywords: rule?.conditions.excludeKeywords?.join(', ') || '',
    minAmount: rule?.conditions.amountRange?.min?.toString() || '',
    maxAmount: rule?.conditions.amountRange?.max?.toString() || '',
    priority: rule?.priority.toString() || '50',
    isActive: rule?.isActive ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const conditions: any = {};
    
    if (formData.merchantPatterns.trim()) {
      conditions.merchantPatterns = formData.merchantPatterns.split(',').map(s => s.trim()).filter(s => s);
    }
    
    if (formData.descriptionPatterns.trim()) {
      conditions.descriptionPatterns = formData.descriptionPatterns.split(',').map(s => s.trim()).filter(s => s);
    }
    
    if (formData.keywords.trim()) {
      conditions.keywords = formData.keywords.split(',').map(s => s.trim()).filter(s => s);
    }
    
    if (formData.excludeKeywords.trim()) {
      conditions.excludeKeywords = formData.excludeKeywords.split(',').map(s => s.trim()).filter(s => s);
    }
    
    if (formData.minAmount || formData.maxAmount) {
      conditions.amountRange = {};
      if (formData.minAmount) conditions.amountRange.min = parseFloat(formData.minAmount);
      if (formData.maxAmount) conditions.amountRange.max = parseFloat(formData.maxAmount);
    }

    onSave({
      name: formData.name,
      category: categoryId,
      conditions,
      priority: parseInt(formData.priority),
      isActive: formData.isActive
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'create' ? 'Create Rule' : 'Edit Rule'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Merchant Patterns (comma-separated)
              </label>
              <input
                type="text"
                value={formData.merchantPatterns}
                onChange={(e) => setFormData(prev => ({ ...prev, merchantPatterns: e.target.value }))}
                placeholder="e.g., tesco, sainsbury, asda"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description Patterns (comma-separated)
              </label>
              <input
                type="text"
                value={formData.descriptionPatterns}
                onChange={(e) => setFormData(prev => ({ ...prev, descriptionPatterns: e.target.value }))}
                placeholder="e.g., grocery, supermarket, food"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                placeholder="e.g., food, shopping, essentials"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exclude Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={formData.excludeKeywords}
                onChange={(e) => setFormData(prev => ({ ...prev, excludeKeywords: e.target.value }))}
                placeholder="e.g., gift, refund, return"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Amount (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.minAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, minAmount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Amount (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.maxAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxAmount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority (1-100)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Higher numbers = higher priority</p>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {mode === 'create' ? 'Create Rule' : 'Update Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}