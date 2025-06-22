import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'current_month'; // current_month, last_month, last_3_months, last_6_months, last_year
    const includeGoals = searchParams.get('includeGoals') === 'true';
    const includeBudgets = searchParams.get('includeBudgets') === 'true';

    const supabase = createServerSupabaseClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate date range based on period
    const { startDate, endDate, periodLabel } = calculateDateRange(period);

    // Fetch accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id);

    if (accountsError) {
      console.error('Accounts error:', accountsError);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    // Fetch transactions for the period
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts!inner(user_id)
      `)
      .eq('accounts.user_id', user.id)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: false });

    if (transactionsError) {
      console.error('Transactions error:', transactionsError);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Calculate financial metrics
    const metrics = calculateFinancialMetrics(accounts, transactions);

    // Generate spending by category
    const spendingByCategory = generateSpendingByCategory(transactions);

    // Generate monthly trends (last 6 months)
    const monthlyTrends = await generateMonthlyTrends(supabase, user.id);

    let exportData: any = {
      exportDate: new Date().toISOString(),
      period: {
        label: periodLabel,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      summary: metrics,
      accounts: accounts.map(acc => ({
        id: acc.id,
        institution: acc.institution_name,
        accountName: acc.account_name,
        accountType: acc.account_type,
        balance: acc.balance,
        currency: acc.currency,
        isActive: acc.is_active
      })),
      transactions: transactions.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        category: t.category,
        amount: t.amount,
        currency: t.currency,
        type: t.type,
        merchant: t.merchant
      })),
      spendingByCategory,
      monthlyTrends
    };

    // Optionally include goals
    if (includeGoals) {
      const { data: goals } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id);

      exportData.goals = goals?.map(goal => ({
        id: goal.id,
        name: goal.name,
        description: goal.description,
        targetAmount: goal.target_amount,
        currentAmount: goal.current_amount,
        progress: (goal.current_amount / goal.target_amount) * 100,
        targetDate: goal.target_date,
        category: goal.category,
        isAchieved: goal.is_achieved
      })) || [];
    }

    // Optionally include budgets
    if (includeBudgets) {
      const { data: budgets } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id);

      exportData.budgets = budgets?.map(budget => ({
        id: budget.id,
        categoryId: budget.category_id,
        amount: budget.amount,
        period: budget.period,
        startDate: budget.start_date,
        endDate: budget.end_date,
        isActive: budget.is_active
      })) || [];
    }

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="financial_summary_${format(new Date(), 'yyyy-MM-dd')}.json"`
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateDateRange(period: string) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;
  let periodLabel: string;

  switch (period) {
    case 'current_month':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      periodLabel = 'Current Month';
      break;
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
      periodLabel = 'Last Month';
      break;
    case 'last_3_months':
      startDate = startOfMonth(subMonths(now, 3));
      periodLabel = 'Last 3 Months';
      break;
    case 'last_6_months':
      startDate = startOfMonth(subMonths(now, 6));
      periodLabel = 'Last 6 Months';
      break;
    case 'last_year':
      startDate = startOfMonth(subMonths(now, 12));
      periodLabel = 'Last Year';
      break;
    default:
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      periodLabel = 'Current Month';
  }

  return { startDate, endDate, periodLabel };
}

function calculateFinancialMetrics(accounts: any[], transactions: any[]) {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const activeAccounts = accounts.filter(acc => acc.is_active).length;
  
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const netFlow = income - expenses;
  const avgTransactionAmount = transactions.length > 0 
    ? transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length 
    : 0;

  return {
    totalBalance,
    totalAccounts: accounts.length,
    activeAccounts,
    connectedAccounts: accounts.filter(acc => acc.api_connected).length,
    totalIncome: income,
    totalExpenses: expenses,
    netFlow,
    transactionCount: transactions.length,
    averageTransactionAmount: avgTransactionAmount,
    burnRate: income > 0 ? totalBalance / expenses : 0
  };
}

function generateSpendingByCategory(transactions: any[]) {
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const categoryTotals = expenseTransactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      transactionCount: expenseTransactions.filter(t => t.category === category).length
    }))
    .sort((a, b) => b.amount - a.amount);
}

async function generateMonthlyTrends(supabase: any, userId: string) {
  const trends = [];
  
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    
    const { data: monthTransactions } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts!inner(user_id)
      `)
      .eq('accounts.user_id', userId)
      .gte('date', monthStart.toISOString())
      .lte('date', monthEnd.toISOString());

    if (monthTransactions) {
      const income = monthTransactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      const expenses = monthTransactions
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      trends.push({
        month: format(monthDate, 'MMM yyyy'),
        income,
        expenses,
        netFlow: income - expenses,
        transactionCount: monthTransactions.length
      });
    }
  }
  
  return trends;
}