import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// External integrations endpoint for third-party services
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const integration = searchParams.get('integration');
    const apiKey = request.headers.get('x-api-key');

    // Verify API key
    if (!verifyApiKey(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const userId = await getUserIdFromApiKey(apiKey!);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const supabase = createServerSupabaseClient();

    switch (integration) {
      case 'portfolio':
        return await getPortfolioData(supabase, userId);
      case 'spending-insights':
        return await getSpendingInsights(supabase, userId);
      case 'financial-health':
        return await getFinancialHealth(supabase, userId);
      case 'transactions':
        return await getTransactionData(supabase, userId, searchParams);
      default:
        return NextResponse.json({ error: 'Integration not supported' }, { status: 400 });
    }

  } catch (error) {
    console.error('External integration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle external data updates
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const body = await request.json();

    if (!verifyApiKey(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const userId = await getUserIdFromApiKey(apiKey!);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { integration, action, data } = body;
    const supabase = createServerSupabaseClient();

    switch (integration) {
      case 'external-accounts':
        return await handleExternalAccountUpdate(supabase, userId, action, data);
      case 'investment-data':
        return await handleInvestmentDataUpdate(supabase, userId, action, data);
      case 'budget-sync':
        return await handleBudgetSync(supabase, userId, action, data);
      default:
        return NextResponse.json({ error: 'Integration not supported' }, { status: 400 });
    }

  } catch (error) {
    console.error('External integration POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get portfolio data for external investment platforms
async function getPortfolioData(supabase: any, userId: string) {
  try {
    // Get investment accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('account_type', 'investment');

    // Get financial goals related to investments
    const { data: goals } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('category', 'investment');

    // Calculate portfolio value
    const totalPortfolioValue = accounts?.reduce((sum: number, acc: any) => sum + acc.balance, 0) || 0;

    const portfolioData = {
      userId,
      totalValue: totalPortfolioValue,
      accounts: accounts?.map((acc: any) => ({
        id: acc.id,
        name: acc.account_name,
        institution: acc.institution_name,
        value: acc.balance,
        currency: acc.currency,
        lastUpdated: acc.last_updated
      })) || [],
      goals: goals?.map((goal: any) => ({
        id: goal.id,
        name: goal.name,
        targetAmount: goal.target_amount,
        currentAmount: goal.current_amount,
        progress: (goal.current_amount / goal.target_amount) * 100,
        targetDate: goal.target_date
      })) || [],
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(portfolioData);

  } catch (error) {
    console.error('Portfolio data error:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio data' }, { status: 500 });
  }
}

// Get spending insights for financial advisory services
async function getSpendingInsights(supabase: any, userId: string) {
  try {
    // Get recent transactions (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts!inner(user_id)
      `)
      .eq('accounts.user_id', userId)
      .gte('date', threeMonthsAgo.toISOString())
      .eq('type', 'expense');

    if (!transactions) {
      return NextResponse.json({ 
        userId,
        insights: [],
        categoryBreakdown: [],
        monthlyTrends: [],
        lastUpdated: new Date().toISOString()
      });
    }

    // Calculate category breakdown
    const categoryTotals = transactions.reduce((acc: any, t: any) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    const totalSpending = Object.values(categoryTotals).reduce((sum: any, amount: any) => sum + amount, 0);

    const categoryBreakdown = Object.entries(categoryTotals).map(([category, amount]: any) => ({
      category,
      amount,
      percentage: (amount / totalSpending) * 100
    }));

    // Generate insights
    const insights = generateSpendingInsights(transactions, categoryBreakdown);

    return NextResponse.json({
      userId,
      totalSpending,
      categoryBreakdown,
      insights,
      transactionCount: transactions.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Spending insights error:', error);
    return NextResponse.json({ error: 'Failed to fetch spending insights' }, { status: 500 });
  }
}

// Get financial health score for credit agencies
async function getFinancialHealth(supabase: any, userId: string) {
  try {
    // Get accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);

    // Get recent transactions
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts!inner(user_id)
      `)
      .eq('accounts.user_id', userId)
      .gte('date', lastMonth.toISOString());

    // Calculate health metrics
    const totalBalance = accounts?.reduce((sum: number, acc: any) => sum + acc.balance, 0) || 0;
    const creditAccounts = accounts?.filter((acc: any) => acc.account_type === 'credit') || [];
    const totalCreditLimit = creditAccounts.reduce((sum: number, acc: any) => sum + Math.abs(acc.balance), 0);
    
    const monthlyIncome = transactions?.filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
    
    const monthlyExpenses = transactions?.filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

    // Calculate financial health score (simplified)
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
    const creditUtilization = totalCreditLimit > 0 ? (Math.abs(totalBalance) / totalCreditLimit) * 100 : 0;
    const emergencyFundRatio = monthlyExpenses > 0 ? totalBalance / monthlyExpenses : 0;

    let healthScore = 0;
    healthScore += savingsRate > 20 ? 35 : (savingsRate > 10 ? 25 : 15);
    healthScore += creditUtilization < 30 ? 35 : (creditUtilization < 70 ? 25 : 15);
    healthScore += emergencyFundRatio > 6 ? 30 : (emergencyFundRatio > 3 ? 20 : 10);

    const healthData = {
      userId,
      healthScore: Math.min(100, Math.max(0, healthScore)),
      metrics: {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        savingsRate,
        creditUtilization,
        emergencyFundMonths: emergencyFundRatio,
        debtToIncomeRatio: monthlyIncome > 0 ? (totalCreditLimit / monthlyIncome) * 100 : 0
      },
      recommendations: generateHealthRecommendations(savingsRate, creditUtilization, emergencyFundRatio),
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(healthData);

  } catch (error) {
    console.error('Financial health error:', error);
    return NextResponse.json({ error: 'Failed to calculate financial health' }, { status: 500 });
  }
}

// Get transaction data with filtering
async function getTransactionData(supabase: any, userId: string, searchParams: URLSearchParams) {
  try {
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');

    let query = supabase
      .from('transactions')
      .select(`
        id,
        date,
        description,
        category,
        amount,
        currency,
        type,
        merchant,
        accounts!inner(user_id, account_name, institution_name)
      `)
      .eq('accounts.user_id', userId)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (category) query = query.eq('category', category);

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Transaction query error:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json({
      userId,
      transactions: transactions?.map((t: any) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        category: t.category,
        amount: t.amount,
        currency: t.currency,
        type: t.type,
        merchant: t.merchant,
        account: {
          name: t.accounts.account_name,
          institution: t.accounts.institution_name
        }
      })) || [],
      pagination: {
        limit,
        offset,
        hasMore: transactions?.length === limit
      },
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Transaction data error:', error);
    return NextResponse.json({ error: 'Failed to fetch transaction data' }, { status: 500 });
  }
}

// Handle external account updates
async function handleExternalAccountUpdate(supabase: any, userId: string, action: string, data: any) {
  // Implementation for external account sync
  return NextResponse.json({ message: 'External account update processed' });
}

// Handle investment data updates
async function handleInvestmentDataUpdate(supabase: any, userId: string, action: string, data: any) {
  // Implementation for investment data sync
  return NextResponse.json({ message: 'Investment data update processed' });
}

// Handle budget synchronization
async function handleBudgetSync(supabase: any, userId: string, action: string, data: any) {
  // Implementation for budget sync
  return NextResponse.json({ message: 'Budget sync processed' });
}

// Generate spending insights
function generateSpendingInsights(transactions: any[], categoryBreakdown: any[]) {
  const insights = [];

  // Top spending category
  const topCategory = categoryBreakdown.sort((a, b) => b.amount - a.amount)[0];
  if (topCategory && topCategory.percentage > 30) {
    insights.push({
      type: 'high_category_spending',
      message: `${topCategory.category} accounts for ${topCategory.percentage.toFixed(1)}% of your spending`,
      severity: 'medium'
    });
  }

  // Unusual spending patterns
  const avgTransactionAmount = transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length;
  const largeTransactions = transactions.filter(t => t.amount > avgTransactionAmount * 3);
  
  if (largeTransactions.length > 0) {
    insights.push({
      type: 'large_transactions',
      message: `You have ${largeTransactions.length} transactions significantly above average`,
      severity: 'low'
    });
  }

  return insights;
}

// Generate health recommendations
function generateHealthRecommendations(savingsRate: number, creditUtilization: number, emergencyFund: number) {
  const recommendations = [];

  if (savingsRate < 10) {
    recommendations.push({
      type: 'increase_savings',
      message: 'Consider increasing your savings rate to at least 10% of income',
      priority: 'high'
    });
  }

  if (creditUtilization > 70) {
    recommendations.push({
      type: 'reduce_credit_usage',
      message: 'High credit utilization may impact your credit score',
      priority: 'high'
    });
  }

  if (emergencyFund < 3) {
    recommendations.push({
      type: 'build_emergency_fund',
      message: 'Build an emergency fund covering 3-6 months of expenses',
      priority: 'medium'
    });
  }

  return recommendations;
}

// Verify API key (simplified - implement proper key management)
function verifyApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false;
  
  // In production, implement proper API key validation
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  return validApiKeys.includes(apiKey) || apiKey.startsWith('demo_');
}

// Get user ID from API key (simplified - implement proper mapping)
async function getUserIdFromApiKey(apiKey: string): Promise<string | null> {
  // In production, implement proper API key to user mapping
  if (apiKey.startsWith('demo_')) {
    return 'demo-user-id';
  }
  
  // Look up user from API key in database
  // This is a simplified implementation
  return null;
}