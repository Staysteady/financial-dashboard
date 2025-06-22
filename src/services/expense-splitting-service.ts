import { SharedExpense, ExpenseParticipant } from '@/types';

export interface ExpenseSplit {
  participantId: string;
  amount: number;
  percentage?: number;
}

export interface ExpenseSplitRequest {
  totalAmount: number;
  description: string;
  participants: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  splitMethod: 'equal' | 'percentage' | 'exact_amounts';
  customSplits?: ExpenseSplit[];
}

export interface ExpenseSettlement {
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  description: string;
}

export interface ExpenseGroup {
  id: string;
  name: string;
  description: string;
  participants: ExpenseParticipant[];
  expenses: SharedExpense[];
  totalExpenses: number;
  settlements: ExpenseSettlement[];
  created_at: string;
}

export class ExpenseSplittingService {
  calculateEqualSplit(totalAmount: number, participantCount: number): number {
    return Math.round((totalAmount / participantCount) * 100) / 100;
  }

  calculatePercentageSplit(
    totalAmount: number,
    percentages: Record<string, number>
  ): Record<string, number> {
    const splits: Record<string, number> = {};
    let totalPercentage = 0;

    // Validate percentages sum to 100
    Object.values(percentages).forEach(p => totalPercentage += p);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Percentages must sum to 100%');
    }

    // Calculate amounts
    Object.entries(percentages).forEach(([participantId, percentage]) => {
      splits[participantId] = Math.round((totalAmount * percentage / 100) * 100) / 100;
    });

    return splits;
  }

  createSharedExpense(request: ExpenseSplitRequest, userId: string): SharedExpense {
    const participants: ExpenseParticipant[] = request.participants.map(p => ({
      user_id: p.id,
      name: p.name,
      email: p.email,
      amount_owed: 0,
      amount_paid: 0,
      is_settled: false
    }));

    // Calculate splits based on method
    switch (request.splitMethod) {
      case 'equal':
        const equalAmount = this.calculateEqualSplit(request.totalAmount, participants.length);
        participants.forEach(p => {
          p.amount_owed = equalAmount;
          // Assuming the creator paid the full amount initially
          if (p.user_id === userId) {
            p.amount_paid = request.totalAmount;
          }
        });
        break;

      case 'percentage':
        if (!request.customSplits) {
          throw new Error('Custom splits required for percentage method');
        }
        const percentages: Record<string, number> = {};
        request.customSplits.forEach(split => {
          percentages[split.participantId] = split.percentage || 0;
        });
        const percentageSplits = this.calculatePercentageSplit(request.totalAmount, percentages);
        participants.forEach(p => {
          p.amount_owed = percentageSplits[p.user_id] || 0;
          if (p.user_id === userId) {
            p.amount_paid = request.totalAmount;
          }
        });
        break;

      case 'exact_amounts':
        if (!request.customSplits) {
          throw new Error('Custom splits required for exact amounts method');
        }
        // Validate amounts sum to total
        const totalSplits = request.customSplits.reduce((sum, split) => sum + split.amount, 0);
        if (Math.abs(totalSplits - request.totalAmount) > 0.01) {
          throw new Error('Split amounts must sum to total amount');
        }
        participants.forEach(p => {
          const split = request.customSplits!.find(s => s.participantId === p.user_id);
          p.amount_owed = split?.amount || 0;
          if (p.user_id === userId) {
            p.amount_paid = request.totalAmount;
          }
        });
        break;
    }

    return {
      id: `expense_${Date.now()}`,
      user_id: userId,
      transaction_id: `trans_${Date.now()}`, // Would link to actual transaction
      total_amount: request.totalAmount,
      participants,
      split_method: request.splitMethod,
      description: request.description,
      settled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  calculateSettlements(expenses: SharedExpense[]): ExpenseSettlement[] {
    // Calculate net balances for each participant
    const balances: Record<string, number> = {};
    
    expenses.forEach(expense => {
      expense.participants.forEach(participant => {
        const userId = participant.user_id;
        if (!balances[userId]) {
          balances[userId] = 0;
        }
        // Net balance = amount paid - amount owed
        balances[userId] += participant.amount_paid - participant.amount_owed;
      });
    });

    // Separate creditors (positive balance) and debtors (negative balance)
    const creditors: Array<{ id: string; amount: number }> = [];
    const debtors: Array<{ id: string; amount: number }> = [];

    Object.entries(balances).forEach(([userId, balance]) => {
      if (balance > 0.01) {
        creditors.push({ id: userId, amount: balance });
      } else if (balance < -0.01) {
        debtors.push({ id: userId, amount: Math.abs(balance) });
      }
    });

    // Calculate optimal settlements
    const settlements: ExpenseSettlement[] = [];
    
    // Sort by amount to optimize settlements
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    let creditorIndex = 0;
    let debtorIndex = 0;

    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];

      const settlementAmount = Math.min(creditor.amount, debtor.amount);

      if (settlementAmount > 0.01) {
        settlements.push({
          fromParticipantId: debtor.id,
          toParticipantId: creditor.id,
          amount: Math.round(settlementAmount * 100) / 100,
          description: `Settlement payment`
        });

        creditor.amount -= settlementAmount;
        debtor.amount -= settlementAmount;
      }

      if (creditor.amount <= 0.01) creditorIndex++;
      if (debtor.amount <= 0.01) debtorIndex++;
    }

    return settlements;
  }

  markExpenseAsSettled(expenseId: string, participantId: string): void {
    // In a real implementation, this would update the database
    console.log(`Marking expense ${expenseId} as settled for participant ${participantId}`);
  }

  getExpenseHistory(userId: string, days: number = 30): SharedExpense[] {
    // Generate mock expense history
    const mockExpenses: SharedExpense[] = [];
    const descriptions = [
      'Dinner at Pizza Express',
      'Uber ride to airport',
      'Grocery shopping',
      'Movie tickets',
      'Weekend getaway accommodation',
      'Concert tickets',
      'Office lunch',
      'Coffee meeting',
      'Birthday dinner',
      'Taxi fare'
    ];

    const mockParticipants = [
      { user_id: userId, name: 'You', email: 'you@example.com' },
      { user_id: 'user_2', name: 'Sarah Wilson', email: 'sarah@example.com' },
      { user_id: 'user_3', name: 'Mike Johnson', email: 'mike@example.com' },
      { user_id: 'user_4', name: 'Emma Davis', email: 'emma@example.com' }
    ];

    for (let i = 0; i < 15; i++) {
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * days));
      
      const totalAmount = Math.round((Math.random() * 200 + 20) * 100) / 100;
      const participantCount = Math.floor(Math.random() * 3) + 2; // 2-4 participants
      const selectedParticipants = mockParticipants.slice(0, participantCount);
      
      const participants: ExpenseParticipant[] = selectedParticipants.map(p => {
        const equalSplit = this.calculateEqualSplit(totalAmount, participantCount);
        return {
          user_id: p.user_id,
          name: p.name,
          email: p.email,
          amount_owed: equalSplit,
          amount_paid: p.user_id === userId ? totalAmount : 0,
          is_settled: Math.random() > 0.3 // 70% settled
        };
      });

      mockExpenses.push({
        id: `expense_${i}`,
        user_id: userId,
        transaction_id: `trans_${i}`,
        total_amount: totalAmount,
        participants,
        split_method: 'equal',
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        settled: participants.every(p => p.is_settled),
        created_at: randomDate.toISOString(),
        updated_at: randomDate.toISOString()
      });
    }

    return mockExpenses.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getExpenseGroups(userId: string): ExpenseGroup[] {
    const mockExpenses = this.getExpenseHistory(userId);
    
    // Group expenses by common participants
    const groups: ExpenseGroup[] = [
      {
        id: 'group_1',
        name: 'Flatmates',
        description: 'Shared household expenses',
        participants: [
          { user_id: userId, name: 'You', email: 'you@example.com', amount_owed: 0, amount_paid: 0, is_settled: false },
          { user_id: 'user_2', name: 'Sarah Wilson', email: 'sarah@example.com', amount_owed: 0, amount_paid: 0, is_settled: false },
          { user_id: 'user_3', name: 'Mike Johnson', email: 'mike@example.com', amount_owed: 0, amount_paid: 0, is_settled: false }
        ],
        expenses: mockExpenses.slice(0, 8),
        totalExpenses: mockExpenses.slice(0, 8).reduce((sum, exp) => sum + exp.total_amount, 0),
        settlements: [],
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'group_2',
        name: 'Work Team',
        description: 'Office meals and activities',
        participants: [
          { user_id: userId, name: 'You', email: 'you@example.com', amount_owed: 0, amount_paid: 0, is_settled: false },
          { user_id: 'user_4', name: 'Emma Davis', email: 'emma@example.com', amount_owed: 0, amount_paid: 0, is_settled: false }
        ],
        expenses: mockExpenses.slice(8, 12),
        totalExpenses: mockExpenses.slice(8, 12).reduce((sum, exp) => sum + exp.total_amount, 0),
        settlements: [],
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Calculate settlements for each group
    groups.forEach(group => {
      group.settlements = this.calculateSettlements(group.expenses);
    });

    return groups;
  }

  calculateUserBalance(userId: string): {
    totalOwed: number;
    totalOwing: number;
    netBalance: number;
  } {
    const expenses = this.getExpenseHistory(userId);
    let totalOwed = 0; // Money others owe you
    let totalOwing = 0; // Money you owe others

    expenses.forEach(expense => {
      const userParticipant = expense.participants.find(p => p.user_id === userId);
      if (userParticipant) {
        const netForExpense = userParticipant.amount_paid - userParticipant.amount_owed;
        if (netForExpense > 0) {
          totalOwed += netForExpense;
        } else {
          totalOwing += Math.abs(netForExpense);
        }
      }
    });

    return {
      totalOwed,
      totalOwing,
      netBalance: totalOwed - totalOwing
    };
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  }
}

export const expenseSplittingService = new ExpenseSplittingService();