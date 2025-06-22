export interface SpendingPattern {
  id: string;
  name: string;
  description: string;
  type: 'recurring' | 'seasonal' | 'behavioral' | 'anomaly' | 'trend';
  confidence: number;
  significance: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  merchant?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  amount?: {
    average: number;
    variance: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  timeRange: {
    start: string;
    end: string;
  };
  nextOccurrence?: string;
  impact: {
    financial: number;
    budgetCategory?: string;
    recommendation?: string;
  };
  metadata: {
    detectedAt: string;
    lastUpdated: string;
    accuracy?: number;
    sampleSize: number;
  };
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant?: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  account: string;
  location?: string;
  isRecurring?: boolean;
  tags?: string[];
  status: 'pending' | 'completed' | 'failed';
}

export class SpendingPatternDetector {
  private patterns: SpendingPattern[] = [];
  private transactions: Transaction[] = [];

  constructor(transactions: Transaction[] = []) {
    this.transactions = transactions;
  }

  public detectPatterns(): SpendingPattern[] {
    this.patterns = [];

    this.detectRecurringPatterns();
    this.detectSeasonalPatterns();
    this.detectBehavioralPatterns();
    this.detectAnomalies();
    this.detectTrends();

    return this.patterns.sort((a, b) => {
      const significanceOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return significanceOrder[b.significance] - significanceOrder[a.significance] || b.confidence - a.confidence;
    });
  }

  private detectRecurringPatterns(): void {
    const merchantGroups = this.groupTransactionsByMerchant();
    const categoryGroups = this.groupTransactionsByCategory();

    // Analyze merchant patterns
    for (const [merchant, transactions] of merchantGroups.entries()) {
      if (transactions.length < 3) continue;

      const pattern = this.analyzeRecurringMerchant(merchant, transactions);
      if (pattern) this.patterns.push(pattern);
    }

    // Analyze category patterns
    for (const [category, transactions] of categoryGroups.entries()) {
      if (transactions.length < 5) continue;

      const pattern = this.analyzeRecurringCategory(category, transactions);
      if (pattern) this.patterns.push(pattern);
    }
  }

  private detectSeasonalPatterns(): void {
    const monthlySpending = this.groupTransactionsByMonth();
    const quarterlySpending = this.groupTransactionsByQuarter();

    // Monthly seasonal patterns
    const monthlyPattern = this.analyzeSeasonalPattern(monthlySpending, 'monthly');
    if (monthlyPattern) this.patterns.push(monthlyPattern);

    // Quarterly seasonal patterns
    const quarterlyPattern = this.analyzeSeasonalPattern(quarterlySpending, 'quarterly');
    if (quarterlyPattern) this.patterns.push(quarterlyPattern);

    // Holiday/special event patterns
    this.detectHolidayPatterns();
  }

  private detectBehavioralPatterns(): void {
    this.detectWeekendSpending();
    this.detectPaydaySpending();
    this.detectLocationBasedSpending();
    this.detectTimeOfDayPatterns();
  }

  private detectAnomalies(): void {
    this.detectAmountAnomalies();
    this.detectFrequencyAnomalies();
    this.detectCategoryAnomalies();
  }

  private detectTrends(): void {
    this.detectSpendingTrends();
    this.detectCategoryTrends();
    this.detectMerchantTrends();
  }

  private analyzeRecurringMerchant(merchant: string, transactions: Transaction[]): SpendingPattern | null {
    const amounts = transactions.map(t => Math.abs(t.amount));
    const dates = transactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
    
    if (dates.length < 3) return null;

    // Calculate intervals between transactions
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const daysDiff = Math.round((dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24));
      intervals.push(daysDiff);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const intervalVariance = this.calculateVariance(intervals);
    
    // Check if it's truly recurring (low variance in intervals)
    const isRecurring = intervalVariance < (avgInterval * 0.3) && avgInterval >= 7; // At least weekly
    
    if (!isRecurring) return null;

    const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const amountVariance = this.calculateVariance(amounts);
    
    let frequency: SpendingPattern['frequency'];
    if (avgInterval <= 7) frequency = 'weekly';
    else if (avgInterval <= 35) frequency = 'monthly';
    else if (avgInterval <= 100) frequency = 'quarterly';
    else frequency = 'yearly';

    const confidence = Math.min(0.9, Math.max(0.3, 1 - (intervalVariance / avgInterval)));
    const nextOccurrence = new Date(dates[dates.length - 1].getTime() + avgInterval * 24 * 60 * 60 * 1000);

    return {
      id: `recurring-merchant-${merchant.replace(/\s+/g, '-').toLowerCase()}`,
      name: `Recurring ${merchant} payments`,
      description: `Regular payments to ${merchant} occurring approximately every ${Math.round(avgInterval)} days`,
      type: 'recurring',
      confidence,
      significance: avgAmount > 100 ? 'high' : avgAmount > 50 ? 'medium' : 'low',
      merchant,
      category: transactions[0].category,
      frequency,
      amount: {
        average: avgAmount,
        variance: amountVariance,
        trend: this.calculateTrend(amounts)
      },
      timeRange: {
        start: dates[0].toISOString(),
        end: dates[dates.length - 1].toISOString()
      },
      nextOccurrence: nextOccurrence.toISOString(),
      impact: {
        financial: avgAmount * (365 / avgInterval),
        budgetCategory: transactions[0].category,
        recommendation: frequency === 'monthly' 
          ? `Consider setting up a budget category for this ${avgAmount.toFixed(2)} monthly expense`
          : `Monitor this recurring expense of ${avgAmount.toFixed(2)} every ${Math.round(avgInterval)} days`
      },
      metadata: {
        detectedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        accuracy: confidence,
        sampleSize: transactions.length
      }
    };
  }

  private analyzeRecurringCategory(category: string, transactions: Transaction[]): SpendingPattern | null {
    const monthlyAmounts = this.groupTransactionsByMonth(transactions);
    const amounts = Array.from(monthlyAmounts.values());
    
    if (amounts.length < 3) return null;

    const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance = this.calculateVariance(amounts);
    const coefficient = variance / avgAmount;

    // High regularity indicates recurring pattern
    if (coefficient > 0.5) return null;

    const confidence = Math.min(0.9, Math.max(0.3, 1 - coefficient));

    return {
      id: `recurring-category-${category.replace(/\s+/g, '-').toLowerCase()}`,
      name: `Regular ${category} spending`,
      description: `Consistent monthly spending in ${category} category`,
      type: 'recurring',
      confidence,
      significance: avgAmount > 500 ? 'high' : avgAmount > 200 ? 'medium' : 'low',
      category,
      frequency: 'monthly',
      amount: {
        average: avgAmount,
        variance,
        trend: this.calculateTrend(amounts)
      },
      timeRange: {
        start: transactions[0].date,
        end: transactions[transactions.length - 1].date
      },
      impact: {
        financial: avgAmount * 12,
        budgetCategory: category,
        recommendation: `Budget approximately ${avgAmount.toFixed(2)} monthly for ${category}`
      },
      metadata: {
        detectedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        accuracy: confidence,
        sampleSize: transactions.length
      }
    };
  }

  private analyzeSeasonalPattern(
    periodSpending: Map<string, number>, 
    period: 'monthly' | 'quarterly'
  ): SpendingPattern | null {
    const amounts = Array.from(periodSpending.values());
    if (amounts.length < 4) return null;

    const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    
    // Check for significant seasonal variation
    const seasonalVariation = (maxAmount - minAmount) / avgAmount;
    if (seasonalVariation < 0.3) return null;

    const confidence = Math.min(0.9, seasonalVariation);
    
    return {
      id: `seasonal-${period}`,
      name: `Seasonal spending pattern`,
      description: `Spending varies significantly by ${period} with ${(seasonalVariation * 100).toFixed(1)}% variation`,
      type: 'seasonal',
      confidence,
      significance: seasonalVariation > 0.8 ? 'high' : seasonalVariation > 0.5 ? 'medium' : 'low',
      frequency: period === 'monthly' ? 'monthly' : 'quarterly',
      amount: {
        average: avgAmount,
        variance: this.calculateVariance(amounts),
        trend: this.calculateTrend(amounts)
      },
      timeRange: {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      impact: {
        financial: maxAmount - minAmount,
        recommendation: `Plan for seasonal spending variations. Peak spending: ${maxAmount.toFixed(2)}, Low: ${minAmount.toFixed(2)}`
      },
      metadata: {
        detectedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        accuracy: confidence,
        sampleSize: amounts.length
      }
    };
  }

  private detectHolidayPatterns(): void {
    const holidayMonths = [12, 1, 7, 8]; // December, January, July, August
    const holidayTransactions = this.transactions.filter(t => {
      const month = new Date(t.date).getMonth() + 1;
      return holidayMonths.includes(month) && t.type === 'expense';
    });

    if (holidayTransactions.length < 10) return;

    const holidaySpending = holidayTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const regularSpending = this.transactions
      .filter(t => {
        const month = new Date(t.date).getMonth() + 1;
        return !holidayMonths.includes(month) && t.type === 'expense';
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const avgHolidayMonthly = holidaySpending / 4;
    const avgRegularMonthly = regularSpending / 8;
    
    if (avgHolidayMonthly > avgRegularMonthly * 1.2) {
      const increase = ((avgHolidayMonthly - avgRegularMonthly) / avgRegularMonthly) * 100;
      
      this.patterns.push({
        id: 'holiday-spending',
        name: 'Holiday spending pattern',
        description: `Spending increases by ${increase.toFixed(1)}% during holiday months`,
        type: 'seasonal',
        confidence: 0.8,
        significance: increase > 50 ? 'high' : 'medium',
        frequency: 'yearly',
        amount: {
          average: avgHolidayMonthly,
          variance: 0,
          trend: 'stable'
        },
        timeRange: {
          start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        impact: {
          financial: avgHolidayMonthly - avgRegularMonthly,
          recommendation: `Plan for increased holiday spending. Consider saving an extra ${(avgHolidayMonthly - avgRegularMonthly).toFixed(2)} per month for holiday expenses.`
        },
        metadata: {
          detectedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          sampleSize: holidayTransactions.length
        }
      });
    }
  }

  private detectWeekendSpending(): void {
    const weekendTransactions = this.transactions.filter(t => {
      const day = new Date(t.date).getDay();
      return (day === 0 || day === 6) && t.type === 'expense';
    });

    const weekdayTransactions = this.transactions.filter(t => {
      const day = new Date(t.date).getDay();
      return day >= 1 && day <= 5 && t.type === 'expense';
    });

    if (weekendTransactions.length < 5 || weekdayTransactions.length < 5) return;

    const weekendAvg = weekendTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / weekendTransactions.length;
    const weekdayAvg = weekdayTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / weekdayTransactions.length;

    const difference = Math.abs(weekendAvg - weekdayAvg);
    const percentDiff = (difference / Math.min(weekendAvg, weekdayAvg)) * 100;

    if (percentDiff > 20) {
      const isHigherOnWeekend = weekendAvg > weekdayAvg;
      
      this.patterns.push({
        id: 'weekend-spending',
        name: `${isHigherOnWeekend ? 'Higher' : 'Lower'} weekend spending`,
        description: `Weekend spending is ${percentDiff.toFixed(1)}% ${isHigherOnWeekend ? 'higher' : 'lower'} than weekdays`,
        type: 'behavioral',
        confidence: 0.7,
        significance: percentDiff > 50 ? 'high' : 'medium',
        frequency: 'weekly',
        amount: {
          average: weekendAvg,
          variance: 0,
          trend: 'stable'
        },
        timeRange: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        impact: {
          financial: Math.abs(weekendAvg - weekdayAvg) * 104, // 52 weekends * 2 days
          recommendation: isHigherOnWeekend 
            ? `Consider budgeting extra for weekend activities. Average weekend transaction: ${weekendAvg.toFixed(2)}`
            : `Your weekend spending is lower than weekdays. Weekend average: ${weekendAvg.toFixed(2)}`
        },
        metadata: {
          detectedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          sampleSize: weekendTransactions.length + weekdayTransactions.length
        }
      });
    }
  }

  private detectPaydaySpending(): void {
    // Assume payday is last day of month or 1st of month
    const payPeriodTransactions = this.transactions.filter(t => {
      const date = new Date(t.date);
      const day = date.getDate();
      const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      
      return ((day >= lastDayOfMonth - 2) || (day <= 3)) && t.type === 'expense';
    });

    const otherTransactions = this.transactions.filter(t => {
      const date = new Date(t.date);
      const day = date.getDate();
      const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      
      return !((day >= lastDayOfMonth - 2) || (day <= 3)) && t.type === 'expense';
    });

    if (payPeriodTransactions.length < 5 || otherTransactions.length < 5) return;

    const payPeriodAvg = payPeriodTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / payPeriodTransactions.length;
    const otherAvg = otherTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / otherTransactions.length;

    const percentDiff = ((payPeriodAvg - otherAvg) / otherAvg) * 100;

    if (percentDiff > 15) {
      this.patterns.push({
        id: 'payday-spending',
        name: 'Payday spending pattern',
        description: `Spending increases by ${percentDiff.toFixed(1)}% around payday`,
        type: 'behavioral',
        confidence: 0.6,
        significance: percentDiff > 40 ? 'high' : 'medium',
        frequency: 'monthly',
        amount: {
          average: payPeriodAvg,
          variance: 0,
          trend: 'stable'
        },
        timeRange: {
          start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        impact: {
          financial: (payPeriodAvg - otherAvg) * 6 * 12, // 6 days per month * 12 months
          recommendation: `Monitor payday spending. Consider automatic savings to reduce temptation to overspend after payday.`
        },
        metadata: {
          detectedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          sampleSize: payPeriodTransactions.length
        }
      });
    }
  }

  private detectLocationBasedSpending(): void {
    const locationGroups = new Map<string, Transaction[]>();
    
    this.transactions
      .filter(t => t.location && t.type === 'expense')
      .forEach(t => {
        const location = t.location!;
        if (!locationGroups.has(location)) {
          locationGroups.set(location, []);
        }
        locationGroups.get(location)!.push(t);
      });

    for (const [location, transactions] of locationGroups.entries()) {
      if (transactions.length < 5) continue;

      const avgAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length;
      const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      // Only report significant location patterns
      if (totalAmount > 200 && transactions.length > 5) {
        this.patterns.push({
          id: `location-${location.replace(/\s+/g, '-').toLowerCase()}`,
          name: `${location} spending pattern`,
          description: `Regular spending at ${location} with ${transactions.length} transactions`,
          type: 'behavioral',
          confidence: 0.7,
          significance: totalAmount > 1000 ? 'high' : 'medium',
          amount: {
            average: avgAmount,
            variance: this.calculateVariance(transactions.map(t => Math.abs(t.amount))),
            trend: 'stable'
          },
          timeRange: {
            start: transactions[0].date,
            end: transactions[transactions.length - 1].date
          },
          impact: {
            financial: totalAmount,
            recommendation: `You've spent ${totalAmount.toFixed(2)} at ${location}. Consider if this aligns with your budget.`
          },
          metadata: {
            detectedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            sampleSize: transactions.length
          }
        });
      }
    }
  }

  private detectTimeOfDayPatterns(): void {
    // This would require time data in transactions, which we don't have in the current model
    // Implementation would analyze spending by hour of day to detect patterns like:
    // - Late night impulse purchases
    // - Lunch time spending
    // - Morning coffee runs
  }

  private detectAmountAnomalies(): void {
    const expenseTransactions = this.transactions.filter(t => t.type === 'expense');
    const amounts = expenseTransactions.map(t => Math.abs(t.amount));
    
    if (amounts.length < 10) return;

    const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const stdDev = Math.sqrt(this.calculateVariance(amounts));
    
    // Find transactions that are more than 3 standard deviations from the mean
    const anomalies = expenseTransactions.filter(t => {
      const amount = Math.abs(t.amount);
      const zScore = Math.abs((amount - mean) / stdDev);
      return zScore > 3;
    });

    if (anomalies.length > 0) {
      const totalAnomalousAmount = anomalies.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      this.patterns.push({
        id: 'amount-anomalies',
        name: 'Unusual spending amounts',
        description: `${anomalies.length} transactions with unusually high amounts detected`,
        type: 'anomaly',
        confidence: 0.8,
        significance: totalAnomalousAmount > mean * 5 ? 'critical' : 'high',
        amount: {
          average: totalAnomalousAmount / anomalies.length,
          variance: 0,
          trend: 'stable'
        },
        timeRange: {
          start: anomalies[0].date,
          end: anomalies[anomalies.length - 1].date
        },
        impact: {
          financial: totalAnomalousAmount,
          recommendation: `Review these ${anomalies.length} unusual transactions totaling ${totalAnomalousAmount.toFixed(2)}.`
        },
        metadata: {
          detectedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          sampleSize: anomalies.length
        }
      });
    }
  }

  private detectFrequencyAnomalies(): void {
    const merchantFrequency = new Map<string, number>();
    
    this.transactions
      .filter(t => t.merchant && t.type === 'expense')
      .forEach(t => {
        const merchant = t.merchant!;
        merchantFrequency.set(merchant, (merchantFrequency.get(merchant) || 0) + 1);
      });

    // Find merchants with unusually high frequency
    const frequencies = Array.from(merchantFrequency.values());
    const meanFreq = frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
    const stdDevFreq = Math.sqrt(this.calculateVariance(frequencies));

    for (const [merchant, frequency] of merchantFrequency.entries()) {
      const zScore = (frequency - meanFreq) / stdDevFreq;
      
      if (zScore > 2 && frequency > 10) {
        this.patterns.push({
          id: `frequency-anomaly-${merchant.replace(/\s+/g, '-').toLowerCase()}`,
          name: `High frequency spending at ${merchant}`,
          description: `${frequency} transactions at ${merchant} - unusually high frequency`,
          type: 'anomaly',
          confidence: 0.7,
          significance: frequency > 30 ? 'high' : 'medium',
          merchant,
          timeRange: {
            start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          },
          impact: {
            financial: 0, // Would need to calculate total amount
            recommendation: `Review your ${frequency} transactions at ${merchant}. This is unusually frequent.`
          },
          metadata: {
            detectedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            sampleSize: frequency
          }
        });
      }
    }
  }

  private detectCategoryAnomalies(): void {
    const monthlyByCategory = new Map<string, Map<string, number>>();
    
    this.transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const monthKey = new Date(t.date).toISOString().slice(0, 7); // YYYY-MM
        
        if (!monthlyByCategory.has(t.category)) {
          monthlyByCategory.set(t.category, new Map());
        }
        
        const categoryMap = monthlyByCategory.get(t.category)!;
        categoryMap.set(monthKey, (categoryMap.get(monthKey) || 0) + Math.abs(t.amount));
      });

    for (const [category, monthlyAmounts] of monthlyByCategory.entries()) {
      const amounts = Array.from(monthlyAmounts.values());
      if (amounts.length < 3) continue;

      const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
      const stdDev = Math.sqrt(this.calculateVariance(amounts));
      
      // Find months with anomalous spending in this category
      let anomalousMonths = 0;
      for (const amount of amounts) {
        const zScore = Math.abs((amount - mean) / stdDev);
        if (zScore > 2) anomalousMonths++;
      }

      if (anomalousMonths > 0) {
        this.patterns.push({
          id: `category-anomaly-${category.replace(/\s+/g, '-').toLowerCase()}`,
          name: `Irregular ${category} spending`,
          description: `${anomalousMonths} months with unusual ${category} spending patterns`,
          type: 'anomaly',
          confidence: 0.6,
          significance: anomalousMonths > 2 ? 'high' : 'medium',
          category,
          amount: {
            average: mean,
            variance: this.calculateVariance(amounts),
            trend: 'stable'
          },
          timeRange: {
            start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          },
          impact: {
            financial: 0,
            budgetCategory: category,
            recommendation: `Monitor ${category} spending for irregularities. Consider setting a monthly budget.`
          },
          metadata: {
            detectedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            sampleSize: amounts.length
          }
        });
      }
    }
  }

  private detectSpendingTrends(): void {
    const monthlySpending = this.groupTransactionsByMonth();
    const amounts = Array.from(monthlySpending.values());
    
    if (amounts.length < 6) return;

    const trend = this.calculateDetailedTrend(amounts);
    const correlation = this.calculateCorrelation(amounts.map((_, i) => i), amounts);
    
    if (Math.abs(correlation) > 0.5) {
      const direction = correlation > 0 ? 'increasing' : 'decreasing';
      const magnitude = Math.abs(correlation);
      
      this.patterns.push({
        id: 'spending-trend',
        name: `${direction.charAt(0).toUpperCase() + direction.slice(1)} spending trend`,
        description: `Overall spending is ${direction} with ${(magnitude * 100).toFixed(1)}% correlation`,
        type: 'trend',
        confidence: magnitude,
        significance: magnitude > 0.8 ? 'high' : magnitude > 0.6 ? 'medium' : 'low',
        amount: {
          average: amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length,
          variance: this.calculateVariance(amounts),
          trend: direction as 'increasing' | 'decreasing'
        },
        timeRange: {
          start: new Date(Date.now() - amounts.length * 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        impact: {
          financial: Math.abs(amounts[amounts.length - 1] - amounts[0]),
          recommendation: direction === 'increasing' 
            ? 'Consider reviewing your budget as spending is trending upward'
            : 'Good news! Your spending is trending downward'
        },
        metadata: {
          detectedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          accuracy: magnitude,
          sampleSize: amounts.length
        }
      });
    }
  }

  private detectCategoryTrends(): void {
    const categoryTrends = new Map<string, number[]>();
    const monthlyByCategory = new Map<string, Map<string, number>>();
    
    // Group by category and month
    this.transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const monthKey = new Date(t.date).toISOString().slice(0, 7);
        
        if (!monthlyByCategory.has(t.category)) {
          monthlyByCategory.set(t.category, new Map());
        }
        
        const categoryMap = monthlyByCategory.get(t.category)!;
        categoryMap.set(monthKey, (categoryMap.get(monthKey) || 0) + Math.abs(t.amount));
      });

    // Analyze trends for each category
    for (const [category, monthlyAmounts] of monthlyByCategory.entries()) {
      const amounts = Array.from(monthlyAmounts.values());
      if (amounts.length < 4) continue;

      const correlation = this.calculateCorrelation(amounts.map((_, i) => i), amounts);
      
      if (Math.abs(correlation) > 0.6) {
        const direction = correlation > 0 ? 'increasing' : 'decreasing';
        const magnitude = Math.abs(correlation);
        
        this.patterns.push({
          id: `category-trend-${category.replace(/\s+/g, '-').toLowerCase()}`,
          name: `${direction.charAt(0).toUpperCase() + direction.slice(1)} ${category} spending`,
          description: `${category} spending is ${direction} with ${(magnitude * 100).toFixed(1)}% correlation`,
          type: 'trend',
          confidence: magnitude,
          significance: magnitude > 0.8 ? 'high' : 'medium',
          category,
          amount: {
            average: amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length,
            variance: this.calculateVariance(amounts),
            trend: direction as 'increasing' | 'decreasing'
          },
          timeRange: {
            start: new Date(Date.now() - amounts.length * 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString()
          },
          impact: {
            financial: Math.abs(amounts[amounts.length - 1] - amounts[0]),
            budgetCategory: category,
            recommendation: direction === 'increasing' 
              ? `Consider reviewing your ${category} budget as spending is increasing`
              : `Your ${category} spending is decreasing - good progress!`
          },
          metadata: {
            detectedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            accuracy: magnitude,
            sampleSize: amounts.length
          }
        });
      }
    }
  }

  private detectMerchantTrends(): void {
    // Similar to category trends but for merchants
    // Implementation would track spending changes at specific merchants over time
  }

  // Utility methods
  private groupTransactionsByMerchant(): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();
    
    this.transactions
      .filter(t => t.merchant && t.type === 'expense')
      .forEach(t => {
        const merchant = t.merchant!;
        if (!groups.has(merchant)) {
          groups.set(merchant, []);
        }
        groups.get(merchant)!.push(t);
      });

    return groups;
  }

  private groupTransactionsByCategory(): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();
    
    this.transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!groups.has(t.category)) {
          groups.set(t.category, []);
        }
        groups.get(t.category)!.push(t);
      });

    return groups;
  }

  private groupTransactionsByMonth(transactions: Transaction[] = this.transactions): Map<string, number> {
    const groups = new Map<string, number>();
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const monthKey = new Date(t.date).toISOString().slice(0, 7); // YYYY-MM
        groups.set(monthKey, (groups.get(monthKey) || 0) + Math.abs(t.amount));
      });

    return groups;
  }

  private groupTransactionsByQuarter(): Map<string, number> {
    const groups = new Map<string, number>();
    
    this.transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const date = new Date(t.date);
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const quarterKey = `${date.getFullYear()}-Q${quarter}`;
        groups.set(quarterKey, (groups.get(quarterKey) || 0) + Math.abs(t.amount));
      });

    return groups;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const correlation = this.calculateCorrelation(values.map((_, i) => i), values);
    
    if (correlation > 0.3) return 'increasing';
    if (correlation < -0.3) return 'decreasing';
    return 'stable';
  }

  private calculateDetailedTrend(values: number[]): { slope: number; correlation: number } {
    const n = values.length;
    const indices = values.map((_, i) => i);
    
    const correlation = this.calculateCorrelation(indices, values);
    
    // Calculate slope using least squares
    const meanX = indices.reduce((sum, x) => sum + x, 0) / n;
    const meanY = values.reduce((sum, y) => sum + y, 0) / n;
    
    const numerator = indices.reduce((sum, x, i) => sum + (x - meanX) * (values[i] - meanY), 0);
    const denominator = indices.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0);
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    
    return { slope, correlation };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;

    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    const numerator = x.reduce((sum, val, i) => sum + (val - meanX) * (y[i] - meanY), 0);
    const denominatorX = Math.sqrt(x.reduce((sum, val) => sum + Math.pow(val - meanX, 2), 0));
    const denominatorY = Math.sqrt(y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0));

    if (denominatorX === 0 || denominatorY === 0) return 0;
    return numerator / (denominatorX * denominatorY);
  }

  // Public methods for getting patterns
  public getPatternsByType(type: SpendingPattern['type']): SpendingPattern[] {
    return this.patterns.filter(pattern => pattern.type === type);
  }

  public getPatternsBySignificance(significance: SpendingPattern['significance']): SpendingPattern[] {
    return this.patterns.filter(pattern => pattern.significance === significance);
  }

  public getHighConfidencePatterns(minConfidence: number = 0.7): SpendingPattern[] {
    return this.patterns.filter(pattern => pattern.confidence >= minConfidence);
  }

  public getPatternsForCategory(category: string): SpendingPattern[] {
    return this.patterns.filter(pattern => pattern.category === category);
  }

  public getPatternsForMerchant(merchant: string): SpendingPattern[] {
    return this.patterns.filter(pattern => pattern.merchant === merchant);
  }
}