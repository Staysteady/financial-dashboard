import { Transaction, Account, Alert, Budget, FinancialGoal } from '@/types';
import { 
  calculateTotalBalance, 
  calculateMonthlyExpenses, 
  calculateEnhancedBurnRate, 
  detectSpendingAnomalies 
} from '@/utils/financial-calculations';
import { differenceInDays, startOfMonth, endOfMonth } from 'date-fns';

export interface AlertRule {
  id: string;
  type: Alert['type'];
  enabled: boolean;
  threshold: number;
  comparison: 'less_than' | 'greater_than' | 'equal_to' | 'percentage_change';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldownHours: number;
  lastTriggered?: string;
}

export interface AlertContext {
  accounts: Account[];
  transactions: Transaction[];
  budgets?: Budget[];
  goals?: FinancialGoal[];
}

export interface AlertResult {
  rule: AlertRule;
  triggered: boolean;
  currentValue?: number;
  threshold: number;
  message: string;
  severity: AlertRule['severity'];
  data?: any;
}

export class AlertEngine {
  private defaultRules: AlertRule[] = [
    {
      id: 'low-balance',
      type: 'low_balance',
      enabled: true,
      threshold: 500,
      comparison: 'less_than',
      message: 'Account balance is critically low',
      severity: 'high',
      cooldownHours: 24
    },
    {
      id: 'very-low-balance',
      type: 'low_balance',
      enabled: true,
      threshold: 100,
      comparison: 'less_than',
      message: 'Account balance is extremely low - immediate attention required',
      severity: 'critical',
      cooldownHours: 6
    },
    {
      id: 'high-monthly-spending',
      type: 'high_spending',
      enabled: true,
      threshold: 50,
      comparison: 'percentage_change',
      message: 'Monthly spending has increased significantly',
      severity: 'medium',
      cooldownHours: 48
    },
    {
      id: 'burn-rate-increase',
      type: 'projection_warning',
      enabled: true,
      threshold: 25,
      comparison: 'percentage_change',
      message: 'Burn rate is trending upward - financial runway decreasing',
      severity: 'high',
      cooldownHours: 72
    },
    {
      id: 'unusual-spending',
      type: 'high_spending',
      enabled: true,
      threshold: 200,
      comparison: 'percentage_change',
      message: 'Unusual spending pattern detected',
      severity: 'medium',
      cooldownHours: 24
    }
  ];

  constructor(private customRules: AlertRule[] = []) {}

  /**
   * Evaluate all alert rules against current financial context
   */
  async evaluateAlerts(context: AlertContext): Promise<AlertResult[]> {
    const allRules = [...this.defaultRules, ...this.customRules];
    const results: AlertResult[] = [];

    for (const rule of allRules) {
      if (!rule.enabled || this.isInCooldown(rule)) {
        continue;
      }

      const result = await this.evaluateRule(rule, context);
      results.push(result);

      if (result.triggered) {
        // Update last triggered time
        rule.lastTriggered = new Date().toISOString();
      }
    }

    return results;
  }

  /**
   * Evaluate a single alert rule
   */
  private async evaluateRule(rule: AlertRule, context: AlertContext): Promise<AlertResult> {
    let triggered = false;
    let currentValue: number | undefined;
    let message = rule.message;
    let data: any = {};

    switch (rule.type) {
      case 'low_balance':
        const result = this.evaluateLowBalanceAlert(rule, context);
        triggered = result.triggered;
        currentValue = result.currentValue;
        message = result.message;
        data = result.data;
        break;

      case 'high_spending':
        const spendingResult = await this.evaluateHighSpendingAlert(rule, context);
        triggered = spendingResult.triggered;
        currentValue = spendingResult.currentValue;
        message = spendingResult.message;
        data = spendingResult.data;
        break;

      case 'projection_warning':
        const projectionResult = await this.evaluateProjectionWarningAlert(rule, context);
        triggered = projectionResult.triggered;
        currentValue = projectionResult.currentValue;
        message = projectionResult.message;
        data = projectionResult.data;
        break;

      case 'goal_milestone':
        const goalResult = await this.evaluateGoalMilestoneAlert(rule, context);
        triggered = goalResult.triggered;
        currentValue = goalResult.currentValue;
        message = goalResult.message;
        data = goalResult.data;
        break;
    }

    return {
      rule,
      triggered,
      currentValue,
      threshold: rule.threshold,
      message,
      severity: rule.severity,
      data
    };
  }

  /**
   * Evaluate low balance alerts
   */
  private evaluateLowBalanceAlert(rule: AlertRule, context: AlertContext) {
    const totalBalance = calculateTotalBalance(context.accounts);
    const activeAccounts = context.accounts.filter(acc => acc.is_active);
    
    let triggered = false;
    let message = rule.message;
    const data = { accounts: [] as any[] };

    // Check each account individually
    for (const account of activeAccounts) {
      if (account.account_type !== 'credit' && account.balance < rule.threshold) {
        triggered = true;
        data.accounts.push({
          id: account.id,
          name: account.account_name,
          balance: account.balance,
          institution: account.institution_name
        });
      }
    }

    if (triggered) {
      const affectedAccounts = data.accounts.length;
      message = `${affectedAccounts} account${affectedAccounts > 1 ? 's' : ''} below £${rule.threshold} threshold`;
    }

    return {
      triggered,
      currentValue: totalBalance,
      message,
      data
    };
  }

  /**
   * Evaluate high spending alerts
   */
  private async evaluateHighSpendingAlert(rule: AlertRule, context: AlertContext) {
    const currentMonth = new Date();
    const currentExpenses = calculateMonthlyExpenses(context.transactions, currentMonth);
    
    // Get previous month for comparison
    const previousMonth = new Date(currentMonth);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const previousExpenses = calculateMonthlyExpenses(context.transactions, previousMonth);
    
    // Calculate percentage change
    const percentageChange = previousExpenses > 0 
      ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 
      : 0;

    let triggered = false;
    let message = rule.message;
    const data = {
      currentExpenses,
      previousExpenses,
      percentageChange,
      anomalies: [] as Transaction[]
    };

    if (rule.comparison === 'percentage_change' && percentageChange > rule.threshold) {
      triggered = true;
      message = `Monthly spending increased by ${Math.round(percentageChange)}% (£${Math.round(currentExpenses - previousExpenses)} more than last month)`;
    }

    // Check for unusual transactions
    if (rule.id === 'unusual-spending') {
      const anomalies = detectSpendingAnomalies(context.transactions);
      if (anomalies.length > 0) {
        triggered = true;
        data.anomalies = anomalies.slice(0, 5); // Top 5 unusual transactions
        message = `${anomalies.length} unusual transaction${anomalies.length > 1 ? 's' : ''} detected this month`;
      }
    }

    return {
      triggered,
      currentValue: percentageChange,
      message,
      data
    };
  }

  /**
   * Evaluate projection warning alerts
   */
  private async evaluateProjectionWarningAlert(rule: AlertRule, context: AlertContext) {
    const burnRateData = calculateEnhancedBurnRate(context.transactions);
    const totalBalance = calculateTotalBalance(context.accounts);
    const currentRunway = totalBalance / burnRateData.currentRate;

    let triggered = false;
    let message = rule.message;
    const data = {
      burnRate: burnRateData.currentRate,
      trendingRate: burnRateData.trendingRate,
      trend: burnRateData.trend,
      confidence: burnRateData.confidence,
      runway: currentRunway
    };

    // Trigger if burn rate is worsening
    if (burnRateData.trend === 'worsening') {
      triggered = true;
      message = `Burn rate increasing - current: £${Math.round(burnRateData.currentRate)}/month, trending: £${Math.round(burnRateData.trendingRate)}/month`;
    }

    // Trigger if runway is critically low
    if (currentRunway < 6) {
      triggered = true;
      message = `Financial runway critically low: ${Math.round(currentRunway * 10) / 10} months remaining`;
    }

    return {
      triggered,
      currentValue: currentRunway,
      message,
      data
    };
  }

  /**
   * Evaluate goal milestone alerts
   */
  private async evaluateGoalMilestoneAlert(rule: AlertRule, context: AlertContext) {
    if (!context.goals || context.goals.length === 0) {
      return {
        triggered: false,
        currentValue: 0,
        message: rule.message,
        data: {}
      };
    }

    let triggered = false;
    let message = rule.message;
    const data = { milestones: [] as any[] };

    for (const goal of context.goals) {
      const progress = (goal.current_amount / goal.target_amount) * 100;
      
      // Check for milestone achievements (25%, 50%, 75%, 90%, 100%)
      const milestones = [25, 50, 75, 90, 100];
      for (const milestone of milestones) {
        if (progress >= milestone && !this.wasGoalMilestoneReached(goal.id, milestone)) {
          triggered = true;
          data.milestones.push({
            goalId: goal.id,
            goalName: goal.name,
            milestone,
            progress,
            currentAmount: goal.current_amount,
            targetAmount: goal.target_amount
          });
        }
      }
    }

    if (triggered) {
      const count = data.milestones.length;
      message = `${count} goal milestone${count > 1 ? 's' : ''} reached!`;
    }

    return {
      triggered,
      currentValue: data.milestones.length,
      message,
      data
    };
  }

  /**
   * Check if rule is in cooldown period
   */
  private isInCooldown(rule: AlertRule): boolean {
    if (!rule.lastTriggered) return false;
    
    const lastTriggered = new Date(rule.lastTriggered);
    const now = new Date();
    const hoursSinceTriggered = differenceInDays(now, lastTriggered) * 24 + 
                               (now.getHours() - lastTriggered.getHours());
    
    return hoursSinceTriggered < rule.cooldownHours;
  }

  /**
   * Check if a goal milestone was already reached (would need database implementation)
   */
  private wasGoalMilestoneReached(goalId: string, milestone: number): boolean {
    // This would require database lookup to check alert history
    // For now, return false to allow milestone alerts
    return false;
  }

  /**
   * Get all alert rules (default + custom)
   */
  getAllRules(): AlertRule[] {
    return [...this.defaultRules, ...this.customRules];
  }

  /**
   * Add custom alert rule
   */
  addCustomRule(rule: AlertRule): void {
    this.customRules.push(rule);
  }

  /**
   * Update alert rule
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.getAllRules().find(r => r.id === ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    return true;
  }

  /**
   * Delete custom alert rule
   */
  deleteCustomRule(ruleId: string): boolean {
    const index = this.customRules.findIndex(r => r.id === ruleId);
    if (index === -1) return false;

    this.customRules.splice(index, 1);
    return true;
  }
}

export default AlertEngine;