'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Target, 
  TrendingUp,
  Calendar,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { FinancialGoal, GoalProgress, GoalInsight } from '@/types';
import { goalsService } from '@/services/goals-service';

interface GoalsDashboardProps {
  userId: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
const CATEGORY_COLORS = {
  emergency_fund: '#EF4444',
  investment: '#3B82F6', 
  savings: '#10B981',
  debt_payoff: '#F59E0B',
  other: '#8B5CF6'
};

export function GoalsDashboard({ userId }: GoalsDashboardProps) {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [goalProgresses, setGoalProgresses] = useState<GoalProgress[]>([]);
  const [insight, setInsight] = useState<GoalInsight | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'progress' | 'planning'>('overview');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(1000);

  const [newGoal, setNewGoal] = useState<Partial<FinancialGoal>>({
    name: '',
    description: '',
    target_amount: 0,
    current_amount: 0,
    target_date: '',
    category: 'savings'
  });

  useEffect(() => {
    loadGoalsData();
  }, [userId]);

  const loadGoalsData = async () => {
    try {
      // Generate mock data for demo
      const mockGoals = goalsService.generateMockGoals(userId);
      const progresses = mockGoals.map(goal => goalsService.calculateGoalProgress(goal));
      const goalInsight = goalsService.analyzeGoals(mockGoals);

      setGoals(mockGoals);
      setGoalProgresses(progresses);
      setInsight(goalInsight);
    } catch (error) {
      console.error('Error loading goals data:', error);
    }
  };

  const addGoal = () => {
    if (newGoal.name && newGoal.target_amount && newGoal.target_date) {
      const goal: FinancialGoal = {
        id: `goal_${Date.now()}`,
        user_id: userId,
        name: newGoal.name,
        description: newGoal.description || '',
        target_amount: newGoal.target_amount,
        current_amount: newGoal.current_amount || 0,
        target_date: newGoal.target_date,
        category: newGoal.category || 'savings',
        is_achieved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setGoals([...goals, goal]);
      setNewGoal({
        name: '',
        description: '',
        target_amount: 0,
        current_amount: 0,
        target_date: '',
        category: 'savings'
      });
      setShowAddForm(false);
      loadGoalsData(); // Refresh calculations
    }
  };

  const updateGoalProgress = (goalId: string, newAmount: number) => {
    const updatedGoals = goals.map(goal => 
      goal.id === goalId 
        ? { ...goal, current_amount: newAmount, updated_at: new Date().toISOString() }
        : goal
    );
    setGoals(updatedGoals);
    loadGoalsData(); // Refresh calculations
  };

  const deleteGoal = (goalId: string) => {
    setGoals(goals.filter(goal => goal.id !== goalId));
    loadGoalsData(); // Refresh calculations
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!insight) {
    return <div className="p-6">Loading goals data...</div>;
  }

  const categoryData = Object.entries(
    goals.reduce((acc, goal) => {
      acc[goal.category] = (acc[goal.category] || 0) + goal.target_amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([category, amount]) => ({
    name: category.replace('_', ' ').toUpperCase(),
    value: amount,
    color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#8B5CF6'
  }));

  const progressData = goalProgresses.map(progress => ({
    name: progress.goal.name.substring(0, 15) + (progress.goal.name.length > 15 ? '...' : ''),
    progress: progress.progressPercentage,
    target: progress.goal.target_amount,
    current: progress.goal.current_amount
  }));

  const allocationData = goalsService.calculateGoalAllocation(goals, monthlyBudget);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Financial Goals</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Goal
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Goals Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(insight.totalGoalsValue)}</div>
            <div className="text-sm text-gray-500">{goals.length} total goals</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insight.averageProgress.toFixed(1)}%</div>
            <div className="text-sm text-gray-500">Across all goals</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{insight.completedGoals}</div>
            <div className="text-sm text-gray-500">{insight.activeGoals} still active</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Urgent Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{insight.urgentGoals.length}</div>
            <div className="text-sm text-gray-500">Need attention</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: Target },
            { id: 'progress', name: 'Progress Tracking', icon: TrendingUp },
            { id: 'planning', name: 'Budget Planning', icon: DollarSign }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goals by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Goals by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Progress Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'progress' ? `${value.toFixed(1)}%` : formatCurrency(value),
                      name === 'progress' ? 'Progress' : name === 'current' ? 'Current' : 'Target'
                    ]}
                  />
                  <Bar dataKey="progress" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Urgent Goals */}
          {insight.urgentGoals.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Urgent Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insight.urgentGoals.map((goal) => {
                    const progress = goalsService.calculateGoalProgress(goal);
                    return (
                      <div key={goal.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div>
                          <div className="font-medium">{goal.name}</div>
                          <div className="text-sm text-gray-600">
                            Due: {formatDate(goal.target_date)} • {progress.progressPercentage.toFixed(1)}% complete
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-orange-600">{formatCurrency(progress.remainingAmount)}</div>
                          <div className="text-sm text-gray-600">remaining</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Progress Tab */}
      {selectedTab === 'progress' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {goalProgresses.map((progress) => (
              <Card key={progress.goal.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {progress.goal.is_achieved ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : progress.onTrack ? (
                          <Target className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-orange-500" />
                        )}
                        {progress.goal.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600">{progress.goal.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => deleteGoal(progress.goal.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm text-gray-500">{progress.progressPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            progress.goal.is_achieved ? 'bg-green-500' : 
                            progress.onTrack ? 'bg-blue-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${Math.min(progress.progressPercentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Current</div>
                        <div className="font-medium">{formatCurrency(progress.goal.current_amount)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Target</div>
                        <div className="font-medium">{formatCurrency(progress.goal.target_amount)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Remaining</div>
                        <div className="font-medium">{formatCurrency(progress.remainingAmount)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Monthly Target</div>
                        <div className="font-medium">{formatCurrency(progress.monthlyTarget)}</div>
                      </div>
                    </div>

                    {/* Update Progress */}
                    {!progress.goal.is_achieved && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Update amount"
                          className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const newAmount = Number((e.target as HTMLInputElement).value);
                              if (newAmount >= 0) {
                                updateGoalProgress(progress.goal.id, newAmount);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <button className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                          Update
                        </button>
                      </div>
                    )}

                    {/* Recommendations */}
                    {progress.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Recommendations:</div>
                        {progress.recommendations.map((rec, index) => (
                          <div key={index} className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                            {rec}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Planning Tab */}
      {selectedTab === 'planning' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Allocation Planning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Goals Budget
                </label>
                <input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="1000"
                />
              </div>
              
              <div className="space-y-4">
                {allocationData.map((allocation) => (
                  <div key={allocation.goal.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{allocation.goal.name}</div>
                      <div className="text-sm text-gray-600">
                        Priority: 
                        <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                          allocation.priority === 'high' ? 'bg-red-100 text-red-800' :
                          allocation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {allocation.priority}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(allocation.recommendedAllocation)}</div>
                      <div className="text-sm text-gray-600">per month</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Goal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Goal Name</label>
                <input
                  type="text"
                  value={newGoal.name || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Emergency Fund"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newGoal.description || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Amount</label>
                <input
                  type="number"
                  value={newGoal.target_amount || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, target_amount: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Amount</label>
                <input
                  type="number"
                  value={newGoal.current_amount || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, current_amount: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Date</label>
                <input
                  type="date"
                  value={newGoal.target_date || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={newGoal.category || 'savings'}
                  onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value as any })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="savings">Savings</option>
                  <option value="emergency_fund">Emergency Fund</option>
                  <option value="investment">Investment</option>
                  <option value="debt_payoff">Debt Payoff</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={addGoal}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                Add Goal
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}