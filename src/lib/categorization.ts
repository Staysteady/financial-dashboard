export interface CategoryRule {
  id: string;
  name: string;
  category: string;
  conditions: {
    merchantPatterns?: string[];
    descriptionPatterns?: string[];
    amountRange?: {
      min?: number;
      max?: number;
    };
    keywords?: string[];
    excludeKeywords?: string[];
  };
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySuggestion {
  category: string;
  confidence: number;
  rule?: CategoryRule;
  reason: string;
}

export class AutoCategorizationEngine {
  private rules: CategoryRule[] = [];

  constructor(customRules: CategoryRule[] = []) {
    this.rules = [...this.getDefaultRules(), ...customRules];
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  private getDefaultRules(): CategoryRule[] {
    return [
      {
        id: 'groceries-supermarkets',
        name: 'Supermarkets & Groceries',
        category: 'Groceries',
        conditions: {
          merchantPatterns: [
            'tesco', 'sainsbury', 'asda', 'morrisons', 'waitrose', 'marks & spencer',
            'lidl', 'aldi', 'iceland', 'co-op', 'spar', 'budgens', 'whole foods'
          ],
          keywords: ['grocery', 'supermarket', 'food shopping']
        },
        priority: 90,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'transport-fuel',
        name: 'Fuel & Petrol Stations',
        category: 'Transport',
        conditions: {
          merchantPatterns: [
            'shell', 'bp', 'esso', 'texaco', 'total', 'gulf', 'jet',
            'sainsbury petrol', 'tesco petrol', 'asda petrol'
          ],
          keywords: ['fuel', 'petrol', 'diesel', 'gas station'],
          descriptionPatterns: ['fuel', 'petrol', 'diesel']
        },
        priority: 95,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'transport-public',
        name: 'Public Transport',
        category: 'Transport',
        conditions: {
          merchantPatterns: [
            'tfl', 'transport for london', 'national rail', 'trainline',
            'uber', 'lyft', 'taxi', 'bus', 'metro', 'oyster'
          ],
          keywords: ['transport', 'travel', 'bus', 'train', 'tube', 'taxi', 'uber']
        },
        priority: 85,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'food-restaurants',
        name: 'Restaurants & Takeaways',
        category: 'Food & Drink',
        conditions: {
          merchantPatterns: [
            'mcdonald', 'kfc', 'burger king', 'subway', 'pizza hut', 'dominos',
            'costa coffee', 'starbucks', 'caffe nero', 'pret a manger',
            'nando', 'wagamama', 'pizza express', 'deliveroo', 'just eat', 'uber eats'
          ],
          keywords: ['restaurant', 'takeaway', 'coffee', 'cafe', 'food delivery']
        },
        priority: 80,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'bills-utilities',
        name: 'Utilities & Bills',
        category: 'Bills',
        conditions: {
          merchantPatterns: [
            'british gas', 'edf energy', 'eon', 'scottish power', 'npower',
            'thames water', 'anglian water', 'bt', 'virgin media', 'sky',
            'council tax', 'hmrc'
          ],
          keywords: ['utility', 'electric', 'gas', 'water', 'internet', 'phone', 'council tax'],
          descriptionPatterns: ['dd ', 'direct debit', 'standing order']
        },
        priority: 95,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'entertainment-streaming',
        name: 'Streaming & Entertainment',
        category: 'Entertainment',
        conditions: {
          merchantPatterns: [
            'netflix', 'amazon prime', 'disney+', 'spotify', 'apple music',
            'youtube premium', 'now tv', 'paramount+', 'hulu'
          ],
          keywords: ['streaming', 'music', 'entertainment', 'subscription']
        },
        priority: 85,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'shopping-online',
        name: 'Online Shopping',
        category: 'Shopping',
        conditions: {
          merchantPatterns: [
            'amazon', 'ebay', 'argos', 'next', 'h&m', 'zara', 'asos',
            'john lewis', 'currys', 'very', 'paypal'
          ],
          keywords: ['shopping', 'online', 'retail', 'clothing', 'electronics']
        },
        priority: 70,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'health-pharmacy',
        name: 'Health & Medical',
        category: 'Health',
        conditions: {
          merchantPatterns: [
            'boots', 'superdrug', 'lloyds pharmacy', 'nhs', 'private healthcare',
            'bupa', 'axa health'
          ],
          keywords: ['health', 'medical', 'pharmacy', 'prescription', 'doctor', 'dentist']
        },
        priority: 85,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'income-salary',
        name: 'Salary & Employment',
        category: 'Salary',
        conditions: {
          keywords: ['salary', 'wage', 'pay', 'payroll', 'employment'],
          descriptionPatterns: ['salary', 'wages', 'payroll'],
          amountRange: { min: 1000 }
        },
        priority: 100,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'transfer-savings',
        name: 'Savings & Transfers',
        category: 'Savings',
        conditions: {
          keywords: ['transfer', 'savings', 'deposit'],
          descriptionPatterns: ['transfer to', 'transfer from', 'savings']
        },
        priority: 75,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  public categorizeTransaction(transaction: {
    description: string;
    merchant?: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
  }): CategorySuggestion[] {
    const suggestions: CategorySuggestion[] = [];

    for (const rule of this.rules.filter(r => r.isActive)) {
      const confidence = this.calculateRuleConfidence(transaction, rule);
      
      if (confidence > 0.3) {
        suggestions.push({
          category: rule.category,
          confidence,
          rule,
          reason: this.generateReason(transaction, rule, confidence)
        });
      }
    }

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  private calculateRuleConfidence(
    transaction: { description: string; merchant?: string; amount: number; type: string },
    rule: CategoryRule
  ): number {
    let score = 0;
    let maxScore = 0;

    const description = transaction.description.toLowerCase();
    const merchant = transaction.merchant?.toLowerCase() || '';

    if (rule.conditions.merchantPatterns) {
      maxScore += 40;
      for (const pattern of rule.conditions.merchantPatterns) {
        if (merchant.includes(pattern.toLowerCase()) || description.includes(pattern.toLowerCase())) {
          score += 40;
          break;
        }
      }
    }

    if (rule.conditions.descriptionPatterns) {
      maxScore += 30;
      for (const pattern of rule.conditions.descriptionPatterns) {
        if (description.includes(pattern.toLowerCase())) {
          score += 30;
          break;
        }
      }
    }

    if (rule.conditions.keywords) {
      maxScore += 20;
      for (const keyword of rule.conditions.keywords) {
        if (description.includes(keyword.toLowerCase()) || merchant.includes(keyword.toLowerCase())) {
          score += 20;
          break;
        }
      }
    }

    if (rule.conditions.excludeKeywords) {
      for (const keyword of rule.conditions.excludeKeywords) {
        if (description.includes(keyword.toLowerCase()) || merchant.includes(keyword.toLowerCase())) {
          return 0;
        }
      }
    }

    if (rule.conditions.amountRange) {
      maxScore += 10;
      const { min, max } = rule.conditions.amountRange;
      const amount = Math.abs(transaction.amount);
      
      if ((min === undefined || amount >= min) && (max === undefined || amount <= max)) {
        score += 10;
      }
    }

    if (maxScore === 0) return 0;
    
    const confidence = score / maxScore;
    return Math.min(confidence, 1);
  }

  private generateReason(
    transaction: { description: string; merchant?: string; amount: number },
    rule: CategoryRule,
    confidence: number
  ): string {
    const reasons: string[] = [];

    if (rule.conditions.merchantPatterns && transaction.merchant) {
      for (const pattern of rule.conditions.merchantPatterns) {
        if (transaction.merchant.toLowerCase().includes(pattern.toLowerCase())) {
          reasons.push(`Merchant "${transaction.merchant}" matches pattern "${pattern}"`);
          break;
        }
      }
    }

    if (rule.conditions.descriptionPatterns) {
      for (const pattern of rule.conditions.descriptionPatterns) {
        if (transaction.description.toLowerCase().includes(pattern.toLowerCase())) {
          reasons.push(`Description contains "${pattern}"`);
          break;
        }
      }
    }

    if (rule.conditions.keywords) {
      for (const keyword of rule.conditions.keywords) {
        if (transaction.description.toLowerCase().includes(keyword.toLowerCase()) ||
            transaction.merchant?.toLowerCase().includes(keyword.toLowerCase())) {
          reasons.push(`Contains keyword "${keyword}"`);
          break;
        }
      }
    }

    if (reasons.length === 0) {
      reasons.push(`Matches rule "${rule.name}"`);
    }

    return `${reasons.join(', ')} (${Math.round(confidence * 100)}% confidence)`;
  }

  public addRule(rule: Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>): CategoryRule {
    const newRule: CategoryRule = {
      ...rule,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.rules.push(newRule);
    this.rules.sort((a, b) => b.priority - a.priority);
    
    return newRule;
  }

  public updateRule(id: string, updates: Partial<CategoryRule>): CategoryRule | null {
    const ruleIndex = this.rules.findIndex(r => r.id === id);
    if (ruleIndex === -1) return null;

    this.rules[ruleIndex] = {
      ...this.rules[ruleIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.rules.sort((a, b) => b.priority - a.priority);
    return this.rules[ruleIndex];
  }

  public deleteRule(id: string): boolean {
    const ruleIndex = this.rules.findIndex(r => r.id === id);
    if (ruleIndex === -1) return false;

    this.rules.splice(ruleIndex, 1);
    return true;
  }

  public getRules(): CategoryRule[] {
    return [...this.rules];
  }

  public getActiveRules(): CategoryRule[] {
    return this.rules.filter(r => r.isActive);
  }

  public learnFromTransaction(transaction: {
    description: string;
    merchant?: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    category: string;
  }): void {
    const suggestions = this.categorizeTransaction(transaction);
    const correctSuggestion = suggestions.find(s => s.category === transaction.category);

    if (!correctSuggestion || correctSuggestion.confidence < 0.8) {
      const newRule = this.createRuleFromTransaction(transaction);
      if (newRule) {
        this.addRule(newRule);
      }
    }
  }

  private createRuleFromTransaction(transaction: {
    description: string;
    merchant?: string;
    amount: number;
    category: string;
  }): Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'> | null {
    if (!transaction.merchant && transaction.description.length < 3) {
      return null;
    }

    const conditions: CategoryRule['conditions'] = {};

    if (transaction.merchant && transaction.merchant.length > 2) {
      conditions.merchantPatterns = [transaction.merchant.toLowerCase()];
    }

    const descriptionWords = transaction.description
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(word));

    if (descriptionWords.length > 0) {
      conditions.keywords = descriptionWords.slice(0, 3);
    }

    return {
      name: `Auto-learned: ${transaction.merchant || transaction.description}`,
      category: transaction.category,
      conditions,
      priority: 60,
      isActive: true
    };
  }

  public getCategoryStats(): { [category: string]: { count: number; confidence: number } } {
    const stats: { [category: string]: { count: number; confidence: number } } = {};

    for (const rule of this.rules.filter(r => r.isActive)) {
      if (!stats[rule.category]) {
        stats[rule.category] = { count: 0, confidence: 0 };
      }
      stats[rule.category].count++;
      stats[rule.category].confidence += rule.priority / 100;
    }

    for (const category in stats) {
      stats[category].confidence = stats[category].confidence / stats[category].count;
    }

    return stats;
  }
}

export const defaultCategorizationEngine = new AutoCategorizationEngine();