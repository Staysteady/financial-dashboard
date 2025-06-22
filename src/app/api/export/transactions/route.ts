import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const accountIds = searchParams.get('accountIds')?.split(',') || [];
    const categories = searchParams.get('categories')?.split(',') || [];

    const supabase = createServerSupabaseClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query for transactions
    let query = supabase
      .from('transactions')
      .select(`
        *,
        accounts!inner(
          id,
          account_name,
          institution_name
        )
      `)
      .eq('accounts.user_id', user.id)
      .order('date', { ascending: false });

    // Apply filters
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (accountIds.length > 0) {
      query = query.in('account_id', accountIds);
    }
    if (categories.length > 0) {
      query = query.in('category', categories);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Format data based on requested format
    switch (format.toLowerCase()) {
      case 'csv':
        return handleCSVExport(transactions);
      case 'json':
        return handleJSONExport(transactions);
      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function handleCSVExport(transactions: any[]) {
  // Convert to CSV format
  const headers = [
    'Date',
    'Account',
    'Institution',
    'Description',
    'Category',
    'Amount',
    'Currency',
    'Type',
    'Merchant',
    'Location'
  ];

  const csvRows = [
    headers.join(','),
    ...transactions.map(t => [
      t.date,
      `"${t.accounts?.account_name || ''}"`,
      `"${t.accounts?.institution_name || ''}"`,
      `"${t.description || ''}"`,
      `"${t.category || ''}"`,
      t.amount,
      t.currency,
      t.type,
      `"${t.merchant || ''}"`,
      `"${t.location || ''}"`
    ].join(','))
  ];

  const csvContent = csvRows.join('\n');
  
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}

function handleJSONExport(transactions: any[]) {
  const exportData = {
    exportDate: new Date().toISOString(),
    totalTransactions: transactions.length,
    transactions: transactions.map(t => ({
      id: t.id,
      date: t.date,
      account: {
        id: t.account_id,
        name: t.accounts?.account_name,
        institution: t.accounts?.institution_name
      },
      description: t.description,
      category: t.category,
      subcategory: t.subcategory,
      amount: t.amount,
      currency: t.currency,
      type: t.type,
      merchant: t.merchant,
      location: t.location,
      isRecurring: t.is_recurring,
      createdAt: t.created_at
    }))
  };

  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.json"`
    }
  });
}