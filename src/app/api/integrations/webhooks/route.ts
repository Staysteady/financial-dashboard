import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import crypto from 'crypto';

// Webhook endpoint for external integrations
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-webhook-signature');
    const timestamp = request.headers.get('x-webhook-timestamp');
    const source = request.headers.get('x-webhook-source') || 'unknown';

    // Verify webhook signature (implement your signature verification logic)
    if (!verifyWebhookSignature(body, signature, timestamp)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);
    const { event_type, user_id, payload } = data;

    const supabase = createServerSupabaseClient();

    // Process different webhook events
    switch (event_type) {
      case 'transaction.created':
        return await handleTransactionCreated(supabase, user_id, payload);
      
      case 'account.updated':
        return await handleAccountUpdated(supabase, user_id, payload);
      
      case 'bank.connection.status':
        return await handleBankConnectionStatus(supabase, user_id, payload);
      
      case 'alert.triggered':
        return await handleAlertTriggered(supabase, user_id, payload);
      
      default:
        console.log(`Unhandled webhook event: ${event_type}`);
        return NextResponse.json({ message: 'Event received but not processed' }, { status: 200 });
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle external transaction creation
async function handleTransactionCreated(supabase: any, userId: string, payload: any) {
  try {
    const {
      external_id,
      account_id,
      amount,
      currency,
      description,
      category,
      date,
      type,
      merchant,
      location
    } = payload;

    // Check if transaction already exists
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('external_id', external_id)
      .single();

    if (existingTransaction) {
      return NextResponse.json({ message: 'Transaction already exists' }, { status: 200 });
    }

    // Verify account belongs to user
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', account_id)
      .eq('user_id', userId)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 });
    }

    // Insert new transaction
    const { error } = await supabase
      .from('transactions')
      .insert({
        external_id,
        account_id,
        amount,
        currency,
        description,
        category: category || 'Other',
        date,
        type,
        merchant,
        location,
        is_recurring: false
      });

    if (error) {
      console.error('Transaction insert error:', error);
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
    }

    // Trigger account balance update
    await updateAccountBalance(supabase, account_id);

    return NextResponse.json({ message: 'Transaction created successfully' }, { status: 201 });

  } catch (error) {
    console.error('Transaction creation error:', error);
    return NextResponse.json({ error: 'Failed to process transaction' }, { status: 500 });
  }
}

// Handle account updates
async function handleAccountUpdated(supabase: any, userId: string, payload: any) {
  try {
    const { account_id, balance, last_updated } = payload;

    // Verify account belongs to user
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', account_id)
      .eq('user_id', userId)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 });
    }

    // Update account balance
    const { error } = await supabase
      .from('accounts')
      .update({
        balance,
        last_updated: last_updated || new Date().toISOString()
      })
      .eq('id', account_id);

    if (error) {
      console.error('Account update error:', error);
      return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Account updated successfully' }, { status: 200 });

  } catch (error) {
    console.error('Account update error:', error);
    return NextResponse.json({ error: 'Failed to process account update' }, { status: 500 });
  }
}

// Handle bank connection status updates
async function handleBankConnectionStatus(supabase: any, userId: string, payload: any) {
  try {
    const { connection_id, status, error_message, last_sync } = payload;

    // Update API connection status
    const { error } = await supabase
      .from('api_connections')
      .update({
        status,
        error_message,
        last_sync: last_sync || new Date().toISOString()
      })
      .eq('id', connection_id)
      .eq('user_id', userId);

    if (error) {
      console.error('Connection status update error:', error);
      return NextResponse.json({ error: 'Failed to update connection status' }, { status: 500 });
    }

    // Update related accounts if connection failed
    if (status === 'failed' || status === 'disconnected') {
      await supabase
        .from('accounts')
        .update({ api_connected: false })
        .eq('connection_id', connection_id);
    }

    return NextResponse.json({ message: 'Connection status updated successfully' }, { status: 200 });

  } catch (error) {
    console.error('Connection status error:', error);
    return NextResponse.json({ error: 'Failed to process connection status' }, { status: 500 });
  }
}

// Handle external alert triggers
async function handleAlertTriggered(supabase: any, userId: string, payload: any) {
  try {
    const {
      alert_type,
      title,
      message,
      threshold_value,
      trigger_data
    } = payload;

    // Create alert record
    const { error } = await supabase
      .from('alerts')
      .insert({
        user_id: userId,
        type: alert_type,
        title,
        message,
        threshold_value,
        is_active: true,
        is_read: false,
        triggered_at: new Date().toISOString(),
        trigger_data
      });

    if (error) {
      console.error('Alert creation error:', error);
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Alert created successfully' }, { status: 201 });

  } catch (error) {
    console.error('Alert trigger error:', error);
    return NextResponse.json({ error: 'Failed to process alert' }, { status: 500 });
  }
}

// Update account balance based on transactions
async function updateAccountBalance(supabase: any, accountId: string) {
  try {
    // Calculate balance from transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('account_id', accountId);

    if (transactions) {
      const balance = transactions.reduce((sum: number, t: any) => {
        return sum + (t.type === 'income' ? t.amount : -t.amount);
      }, 0);

      await supabase
        .from('accounts')
        .update({
          balance,
          last_updated: new Date().toISOString()
        })
        .eq('id', accountId);
    }
  } catch (error) {
    console.error('Balance update error:', error);
  }
}

// Verify webhook signature
function verifyWebhookSignature(body: string, signature: string | null, timestamp: string | null): boolean {
  if (!signature || !timestamp) {
    return false;
  }

  // Get webhook secret from environment
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('WEBHOOK_SECRET not configured');
    return true; // Allow in development
  }

  try {
    // Check timestamp to prevent replay attacks (within 5 minutes)
    const timestampMs = parseInt(timestamp) * 1000;
    const now = Date.now();
    if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
      return false;
    }

    // Verify HMAC signature
    const payload = `${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const receivedSignature = signature.startsWith('sha256=') 
      ? signature.slice(7) 
      : signature;

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}