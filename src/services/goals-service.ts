import { FinancialGoal } from '@/types';
import { addMonths, differenceInMonths, parseISO, format } from 'date-fns';

export interface GoalProgress {
  goal: FinancialGoal;
  progressPercentage: number;
  remainingAmount: number;
  monthsRemaining: number;
  monthlyTarget: number;
  onTrack: boolean;
  projectedCompletionDate: string;
  recommendations: string[];
}

export interface GoalInsight {
  totalGoalsValue: number;
  completedGoals: number;
  activeGoals: number;
  averageProgress: number;
  topCategory: string;
  urgentGoals: FinancialGoal[];
  achievableThisYear: FinancialGoal[];
}

export class GoalsService {
  calculateGoalProgress(goal: FinancialGoal): GoalProgress {
    const progressPercentage = goal.target_amount > 0 
      ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
      : 0;
    
    const remainingAmount = Math.max(goal.target_amount - goal.current_amount, 0);
    const targetDate = parseISO(goal.target_date);
    const monthsRemaining = Math.max(differenceInMonths(targetDate, new Date()), 0);
    
    const monthlyTarget = monthsRemaining > 0 ? remainingAmount / monthsRemaining : remainingAmount;
    
    // Calculate if on track (need to save at least monthlyTarget per month)
    const currentRate = goal.current_amount / Math.max(differenceInMonths(new Date(), parseISO(goal.created_at)), 1);
    const onTrack = monthsRemaining === 0 ? goal.is_achieved : currentRate >= monthlyTarget * 0.9; // 10% tolerance
    
    // Project completion date based on current rate
    const projectedMonthsToComplete = currentRate > 0 ? remainingAmount / currentRate : Infinity;
    const projectedCompletionDate = projectedMonthsToComplete === Infinity 
      ? 'Never at current rate'
      : addMonths(new Date(), Math.ceil(projectedMonthsToComplete)).toISOString();
    
    const recommendations = this.generateGoalRecommendations(goal, {
      progressPercentage,
      remainingAmount,
      monthsRemaining,
      monthlyTarget,
      onTrack,
      currentRate
    });
    
    return {
      goal,
      progressPercentage,
      remainingAmount,
      monthsRemaining,
      monthlyTarget,
      onTrack,
      projectedCompletionDate,
      recommendations
    };
  }

  analyzeGoals(goals: FinancialGoal[]): GoalInsight {
    const totalGoalsValue = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
    const completedGoals = goals.filter(goal => goal.is_achieved).length;
    const activeGoals = goals.filter(goal => !goal.is_achieved).length;
    
    const totalProgress = goals.reduce((sum, goal) => {
      const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
      return sum + Math.min(progress, 100);
    }, 0);
    const averageProgress = goals.length > 0 ? totalProgress / goals.length : 0;
    
    // Find most common category
    const categoryCount: { [key: string]: number } = {};
    goals.forEach(goal => {
      categoryCount[goal.category] = (categoryCount[goal.category] || 0) + 1;
    });
    const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
    
    // Find urgent goals (less than 6 months and less than 50% complete)
    const urgentGoals = goals.filter(goal => {
      if (goal.is_achieved) return false;
      const monthsRemaining = differenceInMonths(parseISO(goal.target_date), new Date());
      const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
      return monthsRemaining <= 6 && progress < 50;
    });
    
    // Find goals achievable this year
    const achievableThisYear = goals.filter(goal => {
      if (goal.is_achieved) return false;
      const monthsRemaining = differenceInMonths(parseISO(goal.target_date), new Date());
      const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
      return monthsRemaining <= 12 && progress >= 70;
    });
    
    return {
      totalGoalsValue,
      completedGoals,
      activeGoals,
      averageProgress,
      topCategory,
      urgentGoals,
      achievableThisYear
    };
  }

  private generateGoalRecommendations(
    goal: FinancialGoal, 
    metrics: {
      progressPercentage: number;
      remainingAmount: number;
      monthsRemaining: number;
      monthlyTarget: number;
      onTrack: boolean;
      currentRate: number;
    }
  ): string[] {
    const recommendations: string[] = [];
    
    if (goal.is_achieved) {
      recommendations.push('🎉 Congratulations! You\'ve achieved this goal!');
      return recommendations;
    }
    
    if (metrics.monthsRemaining <= 0) {
      recommendations.push('⚠️ This goal is overdue. Consider extending the deadline or adjusting the target.');
      return recommendations;
    }
    
    if (!metrics.onTrack) {
      recommendations.push(`📈 You need to save £${metrics.monthlyTarget.toFixed(0)} per month to reach this goal on time.`);
    }
    
    if (metrics.progressPercentage < 25 && metrics.monthsRemaining <= 6) {
      recommendations.push('🚨 This goal is at risk. Consider reducing the target amount or extending the deadline.');
    }
    
    if (metrics.progressPercentage >= 50 && metrics.monthsRemaining >= 6) {
      recommendations.push('✅ You\'re on track! Keep up the great work.');
    }
    
    if (metrics.progressPercentage >= 80) {
      recommendations.push('🎯 You\'re almost there! Consider increasing contributions to finish early.');
    }
    
    // Category-specific recommendations
    switch (goal.category) {
      case 'emergency_fund':
        if (metrics.progressPercentage < 50) {
          recommendations.push('💰 Emergency funds are crucial. Consider prioritizing this goal over others.');
        }
        break;
      case 'investment':
        recommendations.push('📊 Consider investing in index funds or ETFs for long-term growth.');
        break;
      case 'debt_payoff':
        recommendations.push('💳 Focus on high-interest debt first to minimize total interest paid.');
        break;
    }
    
    return recommendations;
  }

  calculateGoalAllocation(goals: FinancialGoal[], monthlyBudget: number): {
    goal: FinancialGoal;
    recommendedAllocation: number;
    priority: 'high' | 'medium' | 'low';
  }[] {
    const activeGoals = goals.filter(goal => !goal.is_achieved);
    
    // Calculate priority scores
    const goalsWithPriority = activeGoals.map(goal => {
      const monthsRemaining = Math.max(differenceInMonths(parseISO(goal.target_date), new Date()), 1);
      const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
      const remainingAmount = goal.target_amount - goal.current_amount;
      const monthlyNeeded = remainingAmount / monthsRemaining;
      
      // Priority scoring (higher = more urgent)
      let priorityScore = 0;
      
      // Urgency (closer deadline = higher priority)
      priorityScore += Math.max(0, 100 - monthsRemaining * 2);
      
      // Category importance
      const categoryPriority = {
        emergency_fund: 40,
        debt_payoff: 35,
        investment: 20,
        savings: 15,
        other: 10
      };
      priorityScore += categoryPriority[goal.category] || 10;
      
      // Progress penalty (less progress = higher priority)
      priorityScore += Math.max(0, 50 - progress);
      
      return {
        goal,
        priorityScore,
        monthlyNeeded,
        progress
      };
    });
    
    // Sort by priority
    goalsWithPriority.sort((a, b) => b.priorityScore - a.priorityScore);
    
    // Allocate budget
    let remainingBudget = monthlyBudget;
    const allocations = goalsWithPriority.map((item, index) => {
      const allocation = Math.min(
        item.monthlyNeeded,
        remainingBudget * (index === 0 ? 0.5 : 0.3) // First goal gets more allocation
      );
      remainingBudget -= allocation;
      
      const priority = item.priorityScore > 80 ? 'high' : item.priorityScore > 50 ? 'medium' : 'low';
      
      return {
        goal: item.goal,
        recommendedAllocation: allocation,
        priority: priority as 'high' | 'medium' | 'low'
      };
    });
    
    return allocations;
  }

  generateGoalMilestones(goal: FinancialGoal): {
    date: string;
    targetAmount: number;
    description: string;
    achieved: boolean;
  }[] {
    const milestones = [];
    const startDate = parseISO(goal.created_at);
    const endDate = parseISO(goal.target_date);
    const totalMonths = differenceInMonths(endDate, startDate);
    
    // Create quarterly milestones
    const quartersCount = Math.ceil(totalMonths / 3);
    for (let i = 1; i <= quartersCount; i++) {
      const milestoneDate = addMonths(startDate, i * 3);
      const targetProgress = (i / quartersCount) * goal.target_amount;
      const achieved = goal.current_amount >= targetProgress;
      
      milestones.push({
        date: milestoneDate.toISOString(),
        targetAmount: targetProgress,
        description: `${(i / quartersCount * 100).toFixed(0)}% milestone`,
        achieved
      });
    }
    
    return milestones;
  }

  // Generate mock goals data for demo
  generateMockGoals(userId: string): FinancialGoal[] {
    const now = new Date();
    return [
      {
        id: 'goal_1',
        user_id: userId,
        name: 'Emergency Fund',
        description: 'Build 6 months of expenses emergency fund',
        target_amount: 15000,
        current_amount: 8500,
        target_date: addMonths(now, 8).toISOString(),
        category: 'emergency_fund',
        is_achieved: false,
        created_at: addMonths(now, -4).toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: 'goal_2',
        user_id: userId,
        name: 'House Deposit',
        description: 'Save for house down payment',
        target_amount: 50000,
        current_amount: 12000,
        target_date: addMonths(now, 24).toISOString(),
        category: 'savings',
        is_achieved: false,
        created_at: addMonths(now, -6).toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: 'goal_3',
        user_id: userId,
        name: 'Retirement Fund',
        description: 'Boost retirement savings',
        target_amount: 100000,
        current_amount: 25000,
        target_date: addMonths(now, 60).toISOString(),
        category: 'investment',
        is_achieved: false,
        created_at: addMonths(now, -12).toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: 'goal_4',
        user_id: userId,
        name: 'Vacation Fund',
        description: 'Save for European vacation',
        target_amount: 5000,
        current_amount: 4200,
        target_date: addMonths(now, 3).toISOString(),
        category: 'savings',
        is_achieved: false,
        created_at: addMonths(now, -6).toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: 'goal_5',
        user_id: userId,
        name: 'Pay Off Credit Card',
        description: 'Clear all credit card debt',
        target_amount: 3500,
        current_amount: 3500,
        target_date: addMonths(now, -1).toISOString(),
        category: 'debt_payoff',
        is_achieved: true,
        created_at: addMonths(now, -8).toISOString(),
        updated_at: addMonths(now, -1).toISOString()
      }
    ];
  }
}

export const goalsService = new GoalsService();