import { createServerSupabaseClient } from '@/lib/supabase';

export interface CategorizationRule {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'transfer';
  conditions: CategorizationCondition[];
  categoryId: string;
  priority: number;
  confidence: number;
  isActive: boolean;
}

export interface CategorizationCondition {
  field: 'description' | 'merchant' | 'amount' | 'location';
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'regex' | 'greater_than' | 'less_than';
  value: string | number;
  caseSensitive?: boolean;
}

export interface CategorizationResult {
  categoryId: string | null;
  confidence: number;
  rule: string | null;
  suggestions: Array<{
    categoryId: string;
    categoryName: string;
    confidence: number;
    reason: string;
  }>;
}

export class CategorizationEngine {
  private supabase = createServerSupabaseClient();
  
  // Built-in merchant patterns for common UK businesses
  private readonly merchantPatterns = {
    'groceries': [
      'tesco', 'sainsbury', 'asda', 'morrisons', 'aldi', 'lidl', 'waitrose',
      'marks spencer', 'm&s', 'iceland', 'co-op', 'spar'
    ],
    'fuel': [
      'shell', 'bp', 'esso', 'texaco', 'total', 'petrol', 'fuel', 'garage'
    ],
    'dining': [
      'mcdonald', 'kfc', 'burger king', 'subway', 'costa', 'starbucks',
      'pret', 'greggs', 'nandos', 'pizza hut', 'dominos', 'restaurant', 'cafe'
    ],
    'transport': [
      'tfl', 'national rail', 'uber', 'taxi', 'bus', 'train', 'oyster',
      'parking', 'car park', 'dvla', 'mot'
    ],
    'shopping': [
      'amazon', 'ebay', 'argos', 'currys', 'john lewis', 'next', 'zara',
      'h&m', 'primark', 'boots', 'superdrug'
    ],
    'utilities': [
      'british gas', 'eon', 'edf', 'scottish power', 'npower', 'bulb',
      'octopus energy', 'thames water', 'severn trent', 'anglian water'
    ],
    'subscriptions': [
      'netflix', 'spotify', 'apple', 'google', 'microsoft', 'adobe',
      'amazon prime', 'disney', 'bbc iplayer'
    ],
    'banking': [
      'bank charge', 'overdraft', 'interest', 'fee', 'atm', 'transfer'
    ]
  };

  async categorizeTransaction(
    userId: string,
    description: string,
    merchant: string | null,
    amount: number,
    type: 'income' | 'expense' | 'transfer',
    location?: string
  ): Promise<CategorizationResult> {
    
    // First, try custom user rules
    const customResult = await this.applyCustomRules(userId, {
      description,
      merchant,
      amount,
      type,
      location
    });

    if (customResult.categoryId && customResult.confidence > 0.8) {
      return customResult;
    }

    // Then apply built-in pattern matching
    const patternResult = await this.applyPatternMatching(userId, {
      description,
      merchant,
      amount,
      type
    });

    if (patternResult.categoryId && patternResult.confidence > 0.6) {
      return patternResult;
    }

    // Finally, try machine learning approach (historical similarity)
    const mlResult = await this.applyHistoricalSimilarity(userId, {
      description,
      merchant,
      amount,
      type
    });

    // Return the best result or combine suggestions
    const bestResult = [customResult, patternResult, mlResult]
      .sort((a, b) => b.confidence - a.confidence)[0];

    // Combine all suggestions
    const allSuggestions = [
      ...customResult.suggestions,
      ...patternResult.suggestions,
      ...mlResult.suggestions
    ].sort((a, b) => b.confidence - a.confidence);

    return {
      categoryId: bestResult.categoryId,
      confidence: bestResult.confidence,
      rule: bestResult.rule,
      suggestions: allSuggestions.slice(0, 5) // Top 5 suggestions
    };
  }

  private async applyCustomRules(
    userId: string,
    transaction: {
      description: string;
      merchant: string | null;
      amount: number;
      type: 'income' | 'expense' | 'transfer';
      location?: string;
    }
  ): Promise<CategorizationResult> {
    
    // Get user's custom rules (would be stored in database)
    const { data: rules } = await this.supabase
      .from('categorization_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('type', transaction.type)
      .order('priority', { ascending: false });

    if (!rules || rules.length === 0) {
      return {
        categoryId: null,
        confidence: 0,
        rule: null,
        suggestions: []
      };
    }

    for (const rule of rules) {
      const matches = this.evaluateRule(rule, transaction);
      if (matches) {
        return {
          categoryId: rule.category_id,
          confidence: rule.confidence,
          rule: rule.name,
          suggestions: [{
            categoryId: rule.category_id,
            categoryName: rule.category_name || 'Custom Rule',
            confidence: rule.confidence,
            reason: `Matched custom rule: ${rule.name}`
          }]
        };
      }
    }

    return {
      categoryId: null,
      confidence: 0,
      rule: null,
      suggestions: []
    };
  }

  private async applyPatternMatching(
    userId: string,
    transaction: {
      description: string;
      merchant: string | null;
      amount: number;
      type: 'income' | 'expense' | 'transfer';
    }
  ): Promise<CategorizationResult> {
    
    const suggestions: Array<{
      categoryId: string;
      categoryName: string;
      confidence: number;
      reason: string;
    }> = [];

    // Get user's categories
    const { data: categories } = await this.supabase
      .from('categories')
      .select('id, name, type')
      .eq('user_id', userId)
      .eq('type', transaction.type);

    if (!categories) {
      return { categoryId: null, confidence: 0, rule: null, suggestions: [] };
    }

    const searchText = `${transaction.description} ${transaction.merchant || ''}`.toLowerCase();

    // Check against merchant patterns
    for (const [categoryType, patterns] of Object.entries(this.merchantPatterns)) {
      for (const pattern of patterns) {
        if (searchText.includes(pattern.toLowerCase())) {
          const category = categories.find(c => 
            c.name.toLowerCase().includes(categoryType) ||
            c.name.toLowerCase().includes(pattern.toLowerCase())
          );

          if (category) {
            const confidence = this.calculatePatternConfidence(pattern, searchText);
            suggestions.push({
              categoryId: category.id,
              categoryName: category.name,
              confidence,
              reason: `Matched merchant pattern: ${pattern}`
            });
          }
        }
      }
    }

    // Income-specific patterns
    if (transaction.type === 'income') {
      if (searchText.includes('salary') || searchText.includes('wage') || searchText.includes('pay')) {
        const salaryCategory = categories.find(c => c.name.toLowerCase().includes('salary'));
        if (salaryCategory) {
          suggestions.push({
            categoryId: salaryCategory.id,
            categoryName: salaryCategory.name,
            confidence: 0.9,
            reason: 'Salary/wage payment pattern'
          });
        }
      }
    }

    // Amount-based patterns
    if (transaction.type === 'expense') {
      // Small amounts might be coffee/snacks
      if (transaction.amount < 10 && searchText.includes('card')) {
        const diningCategory = categories.find(c => c.name.toLowerCase().includes('dining'));
        if (diningCategory) {
          suggestions.push({
            categoryId: diningCategory.id,
            categoryName: diningCategory.name,
            confidence: 0.6,
            reason: 'Small card payment (likely food/drink)'
          });
        }
      }
    }

    // Return best match
    const bestSuggestion = suggestions.sort((a, b) => b.confidence - a.confidence)[0];
    
    return {
      categoryId: bestSuggestion?.categoryId || null,
      confidence: bestSuggestion?.confidence || 0,
      rule: 'Pattern Matching',
      suggestions: suggestions.slice(0, 3)
    };
  }

  private async applyHistoricalSimilarity(
    userId: string,
    transaction: {
      description: string;
      merchant: string | null;
      amount: number;
      type: 'income' | 'expense' | 'transfer';
    }
  ): Promise<CategorizationResult> {
    
    // Find similar historical transactions
    const { data: historicalTransactions } = await this.supabase
      .from('transactions')
      .select(`
        category_id,
        description,
        merchant,
        amount,
        categories (id, name)
      `)
      .eq('type', transaction.type)
      .not('category_id', 'is', null)
      .limit(100);

    if (!historicalTransactions || historicalTransactions.length === 0) {
      return { categoryId: null, confidence: 0, rule: null, suggestions: [] };
    }

    const similarities: Array<{
      categoryId: string;
      categoryName: string;
      similarity: number;
      matchReason: string;
    }> = [];

    for (const historical of historicalTransactions) {
      const similarity = this.calculateSimilarity(transaction, historical);
      
      if (similarity > 0.3 && historical.categories) {
        similarities.push({
          categoryId: historical.category_id,
          categoryName: historical.categories.name,
          similarity,
          matchReason: this.getMatchReason(transaction, historical)
        });
      }
    }

    // Group by category and calculate average similarity
    const categoryGroups = similarities.reduce((groups, item) => {
      if (!groups[item.categoryId]) {
        groups[item.categoryId] = {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          similarities: [],
          reasons: []
        };
      }
      groups[item.categoryId].similarities.push(item.similarity);
      groups[item.categoryId].reasons.push(item.matchReason);
      return groups;
    }, {} as Record<string, any>);

    const suggestions = Object.values(categoryGroups).map((group: any) => ({
      categoryId: group.categoryId,
      categoryName: group.categoryName,
      confidence: group.similarities.reduce((a: number, b: number) => a + b, 0) / group.similarities.length,
      reason: `Similar to ${group.similarities.length} historical transaction(s)`
    })).sort((a, b) => b.confidence - a.confidence);

    const bestMatch = suggestions[0];

    return {
      categoryId: bestMatch?.categoryId || null,
      confidence: bestMatch?.confidence || 0,
      rule: 'Historical Similarity',
      suggestions: suggestions.slice(0, 3)
    };
  }

  private calculateSimilarity(
    transaction: { description: string; merchant: string | null; amount: number },
    historical: { description: string; merchant: string | null; amount: number }
  ): number {
    let similarity = 0;
    let factors = 0;

    // Description similarity (word overlap)
    const transactionWords = transaction.description.toLowerCase().split(/\s+/);
    const historicalWords = historical.description.toLowerCase().split(/\s+/);
    const commonWords = transactionWords.filter(word => historicalWords.includes(word));
    
    if (transactionWords.length > 0) {
      similarity += (commonWords.length / transactionWords.length) * 0.6;
      factors += 0.6;
    }

    // Merchant similarity
    if (transaction.merchant && historical.merchant) {
      const merchantSimilarity = transaction.merchant.toLowerCase() === historical.merchant.toLowerCase() ? 1 : 0;
      similarity += merchantSimilarity * 0.3;
      factors += 0.3;
    }

    // Amount similarity (within 20% range)
    const amountDiff = Math.abs(transaction.amount - historical.amount);
    const amountSimilarity = Math.max(0, 1 - (amountDiff / Math.max(transaction.amount, historical.amount)));
    if (amountSimilarity > 0.8) {
      similarity += amountSimilarity * 0.1;
      factors += 0.1;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  private getMatchReason(
    transaction: { description: string; merchant: string | null },
    historical: { description: string; merchant: string | null }
  ): string {
    if (transaction.merchant && historical.merchant && 
        transaction.merchant.toLowerCase() === historical.merchant.toLowerCase()) {
      return `Same merchant: ${transaction.merchant}`;
    }

    const transactionWords = transaction.description.toLowerCase().split(/\s+/);
    const historicalWords = historical.description.toLowerCase().split(/\s+/);
    const commonWords = transactionWords.filter(word => historicalWords.includes(word));
    
    if (commonWords.length > 0) {
      return `Similar description: ${commonWords.slice(0, 3).join(', ')}`;
    }

    return 'Similar transaction pattern';
  }

  private calculatePatternConfidence(pattern: string, searchText: string): number {
    // Exact match gets higher confidence
    if (searchText.includes(pattern.toLowerCase())) {
      // Word boundary match gets higher confidence
      const wordBoundaryRegex = new RegExp(`\\b${pattern.toLowerCase()}\\b`);
      if (wordBoundaryRegex.test(searchText)) {
        return 0.9;
      }
      return 0.7;
    }
    return 0;
  }

  private evaluateRule(rule: any, transaction: any): boolean {
    // This would evaluate custom user-defined rules
    // For now, return false as we haven't implemented custom rules table
    return false;
  }

  async learnFromUserCorrection(
    userId: string,
    transactionId: string,
    oldCategoryId: string | null,
    newCategoryId: string,
    description: string,
    merchant: string | null,
    amount: number
  ): Promise<void> {
    // This could be used to improve future categorizations
    // Could store user corrections and use them to refine patterns
    
    try {
      await this.supabase
        .from('categorization_feedback')
        .insert({
          user_id: userId,
          transaction_id: transactionId,
          old_category_id: oldCategoryId,
          new_category_id: newCategoryId,
          description,
          merchant,
          amount,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to store categorization feedback:', error);
    }
  }
}