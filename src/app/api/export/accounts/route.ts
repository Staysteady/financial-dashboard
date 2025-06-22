import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    const includeTransactionCounts = searchParams.get('includeTransactionCounts') === 'true';

    const supabase = createServerSupabaseClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch accounts
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    // Optionally include transaction counts
    let enrichedAccounts = accounts;
    if (includeTransactionCounts) {
      enrichedAccounts = await Promise.all(
        accounts.map(async (account) => {
          const { count } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('account_id', account.id);
          
          return {
            ...account,
            transactionCount: count || 0
          };
        })
      );
    }

    // Format data based on requested format
    switch (format.toLowerCase()) {
      case 'csv':
        return handleCSVExport(enrichedAccounts);
      case 'json':
        return handleJSONExport(enrichedAccounts);
      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function handleCSVExport(accounts: any[]) {
  const headers = [
    'ID',
    'Institution',
    'Account Name',
    'Account Type',
    'Balance',
    'Currency',
    'Status',
    'API Connected',
    'Transaction Count',
    'Last Updated',
    'Created Date'
  ];

  const csvRows = [
    headers.join(','),
    ...accounts.map(acc => [
      acc.id,
      `"${acc.institution_name || ''}"`,
      `"${acc.account_name || ''}"`,
      acc.account_type,
      acc.balance,
      acc.currency,
      acc.is_active ? 'Active' : 'Inactive',
      acc.api_connected ? 'Yes' : 'No',
      acc.transactionCount || 0,
      acc.last_updated,
      acc.created_at
    ].join(','))
  ];

  const csvContent = csvRows.join('\n');
  
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="accounts_${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}

function handleJSONExport(accounts: any[]) {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const activeAccounts = accounts.filter(acc => acc.is_active).length;
  const connectedAccounts = accounts.filter(acc => acc.api_connected).length;

  const exportData = {
    exportDate: new Date().toISOString(),
    summary: {
      totalAccounts: accounts.length,
      activeAccounts,
      connectedAccounts,
      totalBalance,
      currencies: [...new Set(accounts.map(acc => acc.currency))]
    },
    accounts: accounts.map(acc => ({
      id: acc.id,
      institution: acc.institution_name,
      accountName: acc.account_name,
      accountType: acc.account_type,
      balance: acc.balance,
      currency: acc.currency,
      isActive: acc.is_active,
      apiConnected: acc.api_connected,
      transactionCount: acc.transactionCount,
      lastUpdated: acc.last_updated,
      createdAt: acc.created_at
    }))
  };

  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="accounts_${new Date().toISOString().split('T')[0]}.json"`
    }
  });
}