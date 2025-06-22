'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PlusIcon,
  UsersIcon,
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowsRightLeftIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline';
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
  ResponsiveContainer
} from 'recharts';
import { 
  expenseSplittingService, 
  ExpenseSplitRequest, 
  ExpenseGroup,
  ExpenseSettlement 
} from '@/services/expense-splitting-service';
import { SharedExpense } from '@/types';

interface ExpenseSplitterProps {
  userId: string;
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316'];

export function ExpenseSplitter({ userId }: ExpenseSplitterProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'split' | 'groups' | 'history'>('overview');
  
  // State for expense splitting
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'percentage' | 'exact_amounts'>('equal');
  const [participants, setParticipants] = useState<Array<{ id: string; name: string; email: string }>>([
    { id: userId, name: 'You', email: 'you@example.com' }
  ]);
  const [customSplits, setCustomSplits] = useState<Array<{ participantId: string; amount: number; percentage: number }>>([]);

  // Data state
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroup[]>([]);
  const [userBalance, setUserBalance] = useState<{ totalOwed: number; totalOwing: number; netBalance: number }>({
    totalOwed: 0,
    totalOwing: 0,
    netBalance: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Initialize custom splits when participants change
    const newCustomSplits = participants.map(p => ({
      participantId: p.id,
      amount: splitMethod === 'equal' ? expenseSplittingService.calculateEqualSplit(totalAmount, participants.length) : 0,
      percentage: splitMethod === 'percentage' ? Math.round(100 / participants.length) : 0
    }));
    setCustomSplits(newCustomSplits);
  }, [participants, splitMethod, totalAmount]);

  const loadData = () => {
    const expenseHistory = expenseSplittingService.getExpenseHistory(userId);
    setExpenses(expenseHistory);

    const groups = expenseSplittingService.getExpenseGroups(userId);
    setExpenseGroups(groups);

    const balance = expenseSplittingService.calculateUserBalance(userId);
    setUserBalance(balance);
  };

  const addParticipant = () => {
    const newParticipant = {
      id: `user_${Date.now()}`,
      name: '',
      email: ''
    };
    setParticipants([...participants, newParticipant]);
  };

  const updateParticipant = (index: number, field: 'name' | 'email', value: string) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index][field] = value;
    setParticipants(updatedParticipants);
  };

  const removeParticipant = (index: number) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };

  const updateCustomSplit = (participantId: string, field: 'amount' | 'percentage', value: number) => {
    const updatedSplits = customSplits.map(split => 
      split.participantId === participantId 
        ? { ...split, [field]: value }
        : split
    );
    setCustomSplits(updatedSplits);
  };

  const createExpense = () => {
    try {
      const request: ExpenseSplitRequest = {
        totalAmount,
        description,
        participants,
        splitMethod,
        customSplits: splitMethod !== 'equal' ? customSplits : undefined
      };

      const newExpense = expenseSplittingService.createSharedExpense(request, userId);
      setExpenses([newExpense, ...expenses]);
      
      // Reset form
      setTotalAmount(0);
      setDescription('');
      setParticipants([{ id: userId, name: 'You', email: 'you@example.com' }]);
      setSplitMethod('equal');

      // Refresh data
      loadData();
    } catch (error) {
      alert(`Error creating expense: ${error}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return expenseSplittingService.formatCurrency(amount);
  };

  const getRecentExpenses = () => expenses.slice(0, 5);
  const getPendingSettlements = () => {
    const allSettlements: ExpenseSettlement[] = [];
    expenseGroups.forEach(group => {
      allSettlements.push(...group.settlements);
    });
    return allSettlements.filter(s => s.fromParticipantId === userId || s.toParticipantId === userId);
  };

  // Chart data
  const expensesByMonth = expenses.reduce((acc: Record<string, number>, expense) => {
    const month = new Date(expense.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    acc[month] = (acc[month] || 0) + expense.total_amount;
    return acc;
  }, {});

  const monthlyData = Object.entries(expensesByMonth).map(([month, amount]) => ({
    month,
    amount
  }));

  const balanceData = [
    { name: 'Owed to you', value: userBalance.totalOwed, color: '#10B981' },
    { name: 'You owe', value: userBalance.totalOwing, color: '#EF4444' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Expense Splitter</h2>
        <div className="text-sm text-gray-500">Manage shared expenses</div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${userBalance.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(userBalance.netBalance))}
            </div>
            <div className="text-sm text-gray-500">
              {userBalance.netBalance >= 0 ? 'You are owed' : 'You owe'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{expenseGroups.length}</div>
            <div className="text-sm text-gray-500">Expense groups</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(expenses.reduce((sum, exp) => sum + exp.total_amount, 0))}
            </div>
            <div className="text-sm text-gray-500">Last 30 days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Settlements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{getPendingSettlements().length}</div>
            <div className="text-sm text-gray-500">Require action</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: UsersIcon },
            { id: 'split', name: 'Split Expense', icon: CalculatorIcon },
            { id: 'groups', name: 'Groups', icon: UsersIcon },
            { id: 'history', name: 'History', icon: CreditCardIcon }
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
          {/* Balance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Balance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={balanceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {balanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `£${value}`} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getRecentExpenses().map(expense => (
                  <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{expense.description}</div>
                      <div className="text-sm text-gray-500">
                        {expense.participants.length} people • {new Date(expense.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(expense.total_amount)}</div>
                      <div className={`text-sm ${expense.settled ? 'text-green-600' : 'text-orange-600'}`}>
                        {expense.settled ? 'Settled' : 'Pending'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Settlements */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Settlements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getPendingSettlements().length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No pending settlements</div>
                ) : (
                  getPendingSettlements().map((settlement, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                      <div>
                        <div className="font-medium text-gray-900">
                          {settlement.fromParticipantId === userId ? 'Pay' : 'Receive from'} {settlement.fromParticipantId === userId ? settlement.toParticipantId : settlement.fromParticipantId}
                        </div>
                        <div className="text-sm text-gray-500">{settlement.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(settlement.amount)}</div>
                        <button className="text-sm text-blue-600 hover:text-blue-800">
                          Mark as paid
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Split Expense Tab */}
      {selectedTab === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusIcon className="h-5 w-5 text-blue-600" />
                Split New Expense
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount (£)
                </label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="What was this expense for?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Split Method
                </label>
                <select
                  value={splitMethod}
                  onChange={(e) => setSplitMethod(e.target.value as any)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="equal">Split equally</option>
                  <option value="percentage">Split by percentage</option>
                  <option value="exact_amounts">Exact amounts</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Participants
                  </label>
                  <button
                    onClick={addParticipant}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Add person
                  </button>
                </div>
                
                <div className="space-y-2">
                  {participants.map((participant, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={participant.name}
                        onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="Name"
                        disabled={participant.id === userId}
                      />
                      <input
                        type="email"
                        value={participant.email}
                        onChange={(e) => updateParticipant(index, 'email', e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="Email"
                        disabled={participant.id === userId}
                      />
                      {index > 0 && (
                        <button
                          onClick={() => removeParticipant(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {splitMethod !== 'equal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {splitMethod === 'percentage' ? 'Percentages' : 'Amounts'}
                  </label>
                  <div className="space-y-2">
                    {customSplits.map((split, index) => (
                      <div key={split.participantId} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">
                          {participants.find(p => p.participantId === split.participantId)?.name || 'Unknown'}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={splitMethod === 'percentage' ? split.percentage : split.amount}
                            onChange={(e) => updateCustomSplit(
                              split.participantId, 
                              splitMethod === 'percentage' ? 'percentage' : 'amount', 
                              Number(e.target.value)
                            )}
                            className="w-20 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            step={splitMethod === 'percentage' ? '1' : '0.01'}
                          />
                          <span className="text-sm text-gray-500">
                            {splitMethod === 'percentage' ? '%' : '£'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={createExpense}
                disabled={!totalAmount || !description || participants.length < 2}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Split Expense
              </button>
            </CardContent>
          </Card>

          {/* Split Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Split Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {totalAmount > 0 && participants.length > 1 ? (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">{formatCurrency(totalAmount)}</div>
                    <div className="text-sm text-blue-700">Total expense</div>
                  </div>
                  
                  <div className="space-y-2">
                    {customSplits.map(split => {
                      const participant = participants.find(p => p.id === split.participantId);
                      const amount = splitMethod === 'equal' 
                        ? expenseSplittingService.calculateEqualSplit(totalAmount, participants.length)
                        : splitMethod === 'percentage'
                        ? (totalAmount * split.percentage / 100)
                        : split.amount;
                      
                      return (
                        <div key={split.participantId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{participant?.name || 'Unknown'}</span>
                          <span className="font-bold">{formatCurrency(amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Enter expense details to see split preview
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Groups Tab */}
      {selectedTab === 'groups' && (
        <div className="space-y-6">
          {expenseGroups.map(group => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{group.name}</CardTitle>
                    <p className="text-sm text-gray-600">{group.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(group.totalExpenses)}</div>
                    <div className="text-sm text-gray-500">{group.expenses.length} expenses</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">Participants</h4>
                    <div className="space-y-2">
                      {group.participants.map(participant => (
                        <div key={participant.user_id} className="flex justify-between items-center text-sm">
                          <span>{participant.name}</span>
                          <span className="text-gray-500">{participant.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">Settlements</h4>
                    <div className="space-y-2">
                      {group.settlements.length === 0 ? (
                        <div className="text-sm text-gray-500">All settled up!</div>
                      ) : (
                        group.settlements.map((settlement, index) => (
                          <div key={index} className="flex justify-between items-center text-sm p-2 bg-yellow-50 rounded">
                            <span>
                              {settlement.fromParticipantId === userId ? 'You pay' : 'Receives'} {formatCurrency(settlement.amount)}
                            </span>
                            <button className="text-blue-600 hover:text-blue-800">
                              Settle
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* History Tab */}
      {selectedTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Expense History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenses.map(expense => (
                <div key={expense.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{expense.description}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(expense.created_at).toLocaleDateString()} • {expense.participants.length} people
                    </div>
                    <div className="text-xs text-gray-400">
                      Split {expense.split_method === 'equal' ? 'equally' : `by ${expense.split_method}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(expense.total_amount)}</div>
                    <div className={`text-sm flex items-center gap-1 ${expense.settled ? 'text-green-600' : 'text-orange-600'}`}>
                      {expense.settled ? (
                        <CheckCircleIcon className="h-4 w-4" />
                      ) : (
                        <ArrowsRightLeftIcon className="h-4 w-4" />
                      )}
                      {expense.settled ? 'Settled' : 'Pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}