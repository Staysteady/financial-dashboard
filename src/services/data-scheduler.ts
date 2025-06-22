import { createServerSupabaseClient } from '@/lib/supabase';
import { TransactionProcessor } from './transaction-processor';
import { BalanceSynchronizer } from './balance-sync';
import { TransactionEnricher } from './transaction-enrichment';
import { DataValidator } from './data-validator';

export interface ScheduleConfig {
  id: string;
  userId: string;
  name: string;
  type: 'transaction_sync' | 'balance_sync' | 'data_enrichment' | 'data_cleanup' | 'full_sync';
  schedule: SchedulePattern;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  options: ScheduleOptions;
  priority: 'high' | 'medium' | 'low';
}

export interface SchedulePattern {
  type: 'interval' | 'cron' | 'once';
  interval?: number; // minutes
  cronExpression?: string;
  timezone?: string;
  runTime?: string; // HH:MM format for daily schedules
}

export interface ScheduleOptions {
  accountIds?: string[];
  autoClean?: boolean;
  autoEnrich?: boolean;
  maxRetries?: number;
  retryDelay?: number; // minutes
  notifyOnError?: boolean;
  notifyOnSuccess?: boolean;
  batchSize?: number;
  timeoutMinutes?: number;
}

export interface ScheduleExecution {
  id: string;
  scheduleId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  result?: ScheduleExecutionResult;
  error?: string;
  retryCount: number;
}

export interface ScheduleExecutionResult {
  type: string;
  accountsProcessed: number;
  transactionsImported: number;
  transactionsEnriched: number;
  duplicatesDetected: number;
  balancesUpdated: number;
  errorsEncountered: number;
  warnings: string[];
  executionTimeMs: number;
}

export class DataScheduler {
  private supabase = createServerSupabaseClient();
  private transactionProcessor = new TransactionProcessor();
  private balanceSync = new BalanceSynchronizer();
  private enricher = new TransactionEnricher();
  private validator = new DataValidator();
  
  private runningExecutions = new Map<string, AbortController>();

  async createSchedule(config: Omit<ScheduleConfig, 'id'>): Promise<string> {
    const scheduleId = crypto.randomUUID();
    
    // Calculate next run time
    const nextRun = this.calculateNextRun(config.schedule);
    
    const scheduleWithId: ScheduleConfig = {
      ...config,
      id: scheduleId,
      nextRun
    };

    // Store schedule in database
    const { error } = await this.supabase
      .from('data_schedules')
      .insert({
        id: scheduleId,
        user_id: config.userId,
        name: config.name,
        type: config.type,
        schedule_pattern: JSON.stringify(config.schedule),
        options: JSON.stringify(config.options),
        is_active: config.isActive,
        next_run: nextRun,
        priority: config.priority,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to create schedule: ${error.message}`);
    }

    return scheduleId;
  }

  async updateSchedule(scheduleId: string, updates: Partial<ScheduleConfig>): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.type) updateData.type = updates.type;
      if (updates.schedule) {
        updateData.schedule_pattern = JSON.stringify(updates.schedule);
        updateData.next_run = this.calculateNextRun(updates.schedule);
      }
      if (updates.options) updateData.options = JSON.stringify(updates.options);
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.priority) updateData.priority = updates.priority;

      updateData.updated_at = new Date().toISOString();

      const { error } = await this.supabase
        .from('data_schedules')
        .update(updateData)
        .eq('id', scheduleId);

      return !error;
    } catch (error) {
      console.error('Failed to update schedule:', error);
      return false;
    }
  }

  async deleteSchedule(scheduleId: string, userId: string): Promise<boolean> {
    try {
      // Cancel if currently running
      if (this.runningExecutions.has(scheduleId)) {
        this.runningExecutions.get(scheduleId)?.abort();
        this.runningExecutions.delete(scheduleId);
      }

      const { error } = await this.supabase
        .from('data_schedules')
        .delete()
        .eq('id', scheduleId)
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      return false;
    }
  }

  async executeSchedule(scheduleId: string): Promise<ScheduleExecutionResult> {
    const startTime = new Date();
    const executionId = crypto.randomUUID();
    
    // Get schedule configuration
    const { data: schedule, error } = await this.supabase
      .from('data_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (error || !schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    if (!schedule.is_active) {
      throw new Error(`Schedule is not active: ${scheduleId}`);
    }

    // Create execution record
    await this.supabase
      .from('schedule_executions')
      .insert({
        id: executionId,
        schedule_id: scheduleId,
        start_time: startTime.toISOString(),
        status: 'running',
        retry_count: 0
      });

    const abortController = new AbortController();
    this.runningExecutions.set(scheduleId, abortController);

    try {
      const scheduleConfig: ScheduleConfig = {
        id: schedule.id,
        userId: schedule.user_id,
        name: schedule.name,
        type: schedule.type,
        schedule: JSON.parse(schedule.schedule_pattern),
        isActive: schedule.is_active,
        lastRun: schedule.last_run,
        nextRun: schedule.next_run,
        options: JSON.parse(schedule.options || '{}'),
        priority: schedule.priority
      };

      // Execute based on schedule type
      const result = await this.executeScheduleType(scheduleConfig, abortController.signal);
      
      // Update execution record
      const endTime = new Date();
      result.executionTimeMs = endTime.getTime() - startTime.getTime();

      await this.supabase
        .from('schedule_executions')
        .update({
          end_time: endTime.toISOString(),
          status: 'completed',
          result: JSON.stringify(result)
        })
        .eq('id', executionId);

      // Update schedule last run and next run
      const nextRun = this.calculateNextRun(scheduleConfig.schedule);
      await this.supabase
        .from('data_schedules')
        .update({
          last_run: startTime.toISOString(),
          next_run: nextRun
        })
        .eq('id', scheduleId);

      this.runningExecutions.delete(scheduleId);
      
      return result;

    } catch (error) {
      const endTime = new Date();
      
      await this.supabase
        .from('schedule_executions')
        .update({
          end_time: endTime.toISOString(),
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', executionId);

      this.runningExecutions.delete(scheduleId);
      
      throw error;
    }
  }

  private async executeScheduleType(
    config: ScheduleConfig,
    signal: AbortSignal
  ): Promise<ScheduleExecutionResult> {
    
    const result: ScheduleExecutionResult = {
      type: config.type,
      accountsProcessed: 0,
      transactionsImported: 0,
      transactionsEnriched: 0,
      duplicatesDetected: 0,
      balancesUpdated: 0,
      errorsEncountered: 0,
      warnings: [],
      executionTimeMs: 0
    };

    // Get accounts to process
    const accountIds = config.options.accountIds || await this.getAllUserAccounts(config.userId);
    
    switch (config.type) {
      case 'transaction_sync':
        await this.executeTransactionSync(config.userId, accountIds, config.options, result, signal);
        break;
      
      case 'balance_sync':
        await this.executeBalanceSync(config.userId, accountIds, config.options, result, signal);
        break;
      
      case 'data_enrichment':
        await this.executeDataEnrichment(config.userId, accountIds, config.options, result, signal);
        break;
      
      case 'data_cleanup':
        await this.executeDataCleanup(config.userId, accountIds, config.options, result, signal);
        break;
      
      case 'full_sync':
        await this.executeFullSync(config.userId, accountIds, config.options, result, signal);
        break;
      
      default:
        throw new Error(`Unknown schedule type: ${config.type}`);
    }

    return result;
  }

  private async executeTransactionSync(
    userId: string,
    accountIds: string[],
    options: ScheduleOptions,
    result: ScheduleExecutionResult,
    signal: AbortSignal
  ): Promise<void> {
    
    for (const accountId of accountIds) {
      if (signal.aborted) break;
      
      try {
        const importResult = await this.transactionProcessor.importTransactionsFromAPI(userId, accountId);
        
        result.accountsProcessed++;
        result.transactionsImported += importResult.imported;
        result.duplicatesDetected += importResult.duplicates;
        result.errorsEncountered += importResult.errors;
        
        if (importResult.errorDetails.length > 0) {
          result.warnings.push(...importResult.errorDetails);
        }

      } catch (error) {
        result.errorsEncountered++;
        result.warnings.push(`Account ${accountId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async executeBalanceSync(
    userId: string,
    accountIds: string[],
    options: ScheduleOptions,
    result: ScheduleExecutionResult,
    signal: AbortSignal
  ): Promise<void> {
    
    for (const accountId of accountIds) {
      if (signal.aborted) break;
      
      try {
        const syncResult = await this.balanceSync.syncAccountBalance(userId, accountId);
        
        result.accountsProcessed++;
        
        if (syncResult.success) {
          result.balancesUpdated++;
        } else {
          result.errorsEncountered++;
          if (syncResult.error) {
            result.warnings.push(`Account ${accountId}: ${syncResult.error}`);
          }
        }

      } catch (error) {
        result.errorsEncountered++;
        result.warnings.push(`Account ${accountId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async executeDataEnrichment(
    userId: string,
    accountIds: string[],
    options: ScheduleOptions,
    result: ScheduleExecutionResult,
    signal: AbortSignal
  ): Promise<void> {
    
    for (const accountId of accountIds) {
      if (signal.aborted) break;
      
      try {
        // Get recent transactions that need enrichment
        const { data: transactions } = await this.supabase
          .from('transactions')
          .select('id, description, merchant, amount, location')
          .eq('account_id', accountId)
          .is('merchant', null)
          .limit(options.batchSize || 50);

        if (transactions) {
          result.accountsProcessed++;
          
          for (const transaction of transactions) {
            if (signal.aborted) break;
            
            try {
              const enrichResult = await this.enricher.enrichTransaction(
                userId,
                transaction.id,
                transaction.description,
                transaction.merchant,
                transaction.amount,
                transaction.location
              );

              if (enrichResult.enriched) {
                result.transactionsEnriched++;
              }

            } catch (error) {
              result.errorsEncountered++;
            }
          }
        }

      } catch (error) {
        result.errorsEncountered++;
        result.warnings.push(`Account ${accountId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async executeDataCleanup(
    userId: string,
    accountIds: string[],
    options: ScheduleOptions,
    result: ScheduleExecutionResult,
    signal: AbortSignal
  ): Promise<void> {
    
    for (const accountId of accountIds) {
      if (signal.aborted) break;
      
      try {
        // Get transactions that might need cleaning
        const { data: transactions } = await this.supabase
          .from('transactions')
          .select('*')
          .eq('account_id', accountId)
          .limit(options.batchSize || 100);

        if (transactions) {
          result.accountsProcessed++;
          
          const { reports } = await this.validator.validateTransactionBatch(
            transactions,
            { autoClean: options.autoClean || true }
          );

          for (const report of reports) {
            if (report.cleaned) {
              result.transactionsEnriched++; // Using this field for cleaned count
            }
            
            result.errorsEncountered += report.errorCount;
            
            if (report.results.length > 0) {
              result.warnings.push(...report.results.map(r => r.message));
            }
          }
        }

      } catch (error) {
        result.errorsEncountered++;
        result.warnings.push(`Account ${accountId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async executeFullSync(
    userId: string,
    accountIds: string[],
    options: ScheduleOptions,
    result: ScheduleExecutionResult,
    signal: AbortSignal
  ): Promise<void> {
    
    // Execute all sync types in sequence
    await this.executeTransactionSync(userId, accountIds, options, result, signal);
    if (signal.aborted) return;
    
    await this.executeBalanceSync(userId, accountIds, options, result, signal);
    if (signal.aborted) return;
    
    await this.executeDataEnrichment(userId, accountIds, options, result, signal);
    if (signal.aborted) return;
    
    await this.executeDataCleanup(userId, accountIds, options, result, signal);
  }

  private async getAllUserAccounts(userId: string): Promise<string[]> {
    const { data: accounts } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true);

    return accounts?.map(a => a.id) || [];
  }

  private calculateNextRun(schedule: SchedulePattern): string {
    const now = new Date();
    
    switch (schedule.type) {
      case 'interval':
        const intervalMs = (schedule.interval || 60) * 60 * 1000;
        return new Date(now.getTime() + intervalMs).toISOString();
      
      case 'cron':
        // Simplified cron - in a real system you'd use a proper cron parser
        return this.calculateNextCronRun(schedule.cronExpression || '0 0 * * *');
      
      case 'once':
        return new Date(now.getTime() + 60000).toISOString(); // 1 minute from now
      
      default:
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour default
    }
  }

  private calculateNextCronRun(cronExpression: string): string {
    // Simplified cron calculation
    // In a real system, use a library like node-cron
    const now = new Date();
    const parts = cronExpression.split(' ');
    
    if (parts.length >= 5) {
      const [minute, hour, day, month, dayOfWeek] = parts;
      
      // Simple daily schedule (0 H * * *)
      if (minute === '0' && day === '*' && month === '*' && dayOfWeek === '*') {
        const nextRun = new Date();
        nextRun.setHours(parseInt(hour) || 0, 0, 0, 0);
        
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        
        return nextRun.toISOString();
      }
    }
    
    // Default to daily at midnight
    const nextRun = new Date();
    nextRun.setHours(0, 0, 0, 0);
    nextRun.setDate(nextRun.getDate() + 1);
    
    return nextRun.toISOString();
  }

  async getSchedulesByUser(userId: string): Promise<ScheduleConfig[]> {
    const { data: schedules } = await this.supabase
      .from('data_schedules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!schedules) return [];

    return schedules.map(schedule => ({
      id: schedule.id,
      userId: schedule.user_id,
      name: schedule.name,
      type: schedule.type,
      schedule: JSON.parse(schedule.schedule_pattern),
      isActive: schedule.is_active,
      lastRun: schedule.last_run,
      nextRun: schedule.next_run,
      options: JSON.parse(schedule.options || '{}'),
      priority: schedule.priority
    }));
  }

  async getScheduleExecutions(
    scheduleId: string,
    limit: number = 10
  ): Promise<ScheduleExecution[]> {
    
    const { data: executions } = await this.supabase
      .from('schedule_executions')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('start_time', { ascending: false })
      .limit(limit);

    if (!executions) return [];

    return executions.map(execution => ({
      id: execution.id,
      scheduleId: execution.schedule_id,
      startTime: execution.start_time,
      endTime: execution.end_time,
      status: execution.status,
      result: execution.result ? JSON.parse(execution.result) : undefined,
      error: execution.error,
      retryCount: execution.retry_count
    }));
  }

  async runDueSchedules(): Promise<{
    executed: number;
    failed: number;
    skipped: number;
  }> {
    
    const now = new Date().toISOString();
    
    // Get all due schedules
    const { data: dueSchedules } = await this.supabase
      .from('data_schedules')
      .select('*')
      .eq('is_active', true)
      .lte('next_run', now)
      .order('priority', { ascending: true }); // high priority first

    const result = {
      executed: 0,
      failed: 0,
      skipped: 0
    };

    if (!dueSchedules) return result;

    for (const schedule of dueSchedules) {
      try {
        // Skip if already running
        if (this.runningExecutions.has(schedule.id)) {
          result.skipped++;
          continue;
        }

        await this.executeSchedule(schedule.id);
        result.executed++;

      } catch (error) {
        console.error(`Schedule execution failed for ${schedule.id}:`, error);
        result.failed++;
      }
    }

    return result;
  }

  async cancelExecution(scheduleId: string): Promise<boolean> {
    const controller = this.runningExecutions.get(scheduleId);
    if (controller) {
      controller.abort();
      this.runningExecutions.delete(scheduleId);
      
      // Update execution status
      await this.supabase
        .from('schedule_executions')
        .update({ 
          status: 'failed', 
          error: 'Cancelled by user',
          end_time: new Date().toISOString()
        })
        .eq('schedule_id', scheduleId)
        .eq('status', 'running');
      
      return true;
    }
    
    return false;
  }

  getRunningExecutions(): string[] {
    return Array.from(this.runningExecutions.keys());
  }

  async createDefaultSchedules(userId: string): Promise<string[]> {
    const scheduleIds: string[] = [];

    // Daily transaction sync
    const transactionSyncId = await this.createSchedule({
      userId,
      name: 'Daily Transaction Sync',
      type: 'transaction_sync',
      schedule: {
        type: 'cron',
        cronExpression: '0 6 * * *', // 6 AM daily
        timezone: 'Europe/London'
      },
      isActive: true,
      options: {
        autoClean: true,
        autoEnrich: true,
        maxRetries: 3,
        retryDelay: 30,
        notifyOnError: true,
        batchSize: 100
      },
      priority: 'high'
    });
    scheduleIds.push(transactionSyncId);

    // Weekly data cleanup
    const cleanupId = await this.createSchedule({
      userId,
      name: 'Weekly Data Cleanup',
      type: 'data_cleanup',
      schedule: {
        type: 'cron',
        cronExpression: '0 2 * * 0', // 2 AM on Sundays
        timezone: 'Europe/London'
      },
      isActive: true,
      options: {
        autoClean: true,
        batchSize: 500,
        notifyOnError: true
      },
      priority: 'low'
    });
    scheduleIds.push(cleanupId);

    return scheduleIds;
  }
}