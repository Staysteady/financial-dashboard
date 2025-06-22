import { createServerSupabaseClient } from '@/lib/supabase';

export interface DuplicateDetectionConfig {
  exactMatchWeight: number;
  amountMatchWeight: number;
  dateRangeWeight: number;
  descriptionMatchWeight: number;
  merchantMatchWeight: number;
  threshold: number;
  dateRangeDays: number;
}

export interface DuplicateMatch {
  transactionId: string;
  matchScore: number;
  matchReasons: string[];
  matchedFields: string[];
  isExactDuplicate: boolean;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matches: DuplicateMatch[];
  bestMatch: DuplicateMatch | null;
  confidence: number;
}

export interface TransactionForDuplicateCheck {
  externalId?: string;
  amount: number;
  date: string;
  description: string;
  merchant?: string;
  accountId: string;
}

export class DuplicateDetector {
  private supabase = createServerSupabaseClient();
  
  private defaultConfig: DuplicateDetectionConfig = {
    exactMatchWeight: 1.0,      // External ID match
    amountMatchWeight: 0.4,     // Exact amount match
    dateRangeWeight: 0.3,       // Date within range
    descriptionMatchWeight: 0.2, // Description similarity
    merchantMatchWeight: 0.1,   // Merchant match
    threshold: 0.8,             // Minimum score to consider duplicate
    dateRangeDays: 3            // Look within 3 days
  };

  async detectDuplicates(
    transaction: TransactionForDuplicateCheck,
    config?: Partial<DuplicateDetectionConfig>
  ): Promise<DuplicateDetectionResult> {
    
    const finalConfig = { ...this.defaultConfig, ...config };
    
    // First check for exact external ID match (most reliable)
    if (transaction.externalId) {
      const exactMatch = await this.checkExactDuplicate(transaction);
      if (exactMatch) {
        return {
          isDuplicate: true,
          matches: [exactMatch],
          bestMatch: exactMatch,
          confidence: 1.0
        };
      }
    }

    // Then check for potential duplicates using fuzzy matching
    const potentialDuplicates = await this.findPotentialDuplicates(transaction, finalConfig);
    
    if (potentialDuplicates.length === 0) {
      return {
        isDuplicate: false,
        matches: [],
        bestMatch: null,
        confidence: 0
      };
    }

    const matches = potentialDuplicates.map(candidate => 
      this.calculateMatchScore(transaction, candidate, finalConfig)
    ).filter(match => match.matchScore >= finalConfig.threshold);

    const bestMatch = matches.sort((a, b) => b.matchScore - a.matchScore)[0];
    
    return {
      isDuplicate: matches.length > 0,
      matches: matches.slice(0, 5), // Top 5 matches
      bestMatch: bestMatch || null,
      confidence: bestMatch?.matchScore || 0
    };
  }

  private async checkExactDuplicate(
    transaction: TransactionForDuplicateCheck
  ): Promise<DuplicateMatch | null> {
    
    const { data } = await this.supabase
      .from('transactions')
      .select('id, external_id, amount, date, description, merchant')
      .eq('account_id', transaction.accountId)
      .eq('external_id', transaction.externalId)
      .limit(1);

    if (data && data.length > 0) {
      const existing = data[0];
      return {
        transactionId: existing.id,
        matchScore: 1.0,
        matchReasons: ['Exact external ID match'],
        matchedFields: ['external_id'],
        isExactDuplicate: true
      };
    }

    return null;
  }

  private async findPotentialDuplicates(
    transaction: TransactionForDuplicateCheck,
    config: DuplicateDetectionConfig
  ): Promise<any[]> {
    
    // Calculate date range for search
    const transactionDate = new Date(transaction.date);
    const startDate = new Date(transactionDate);
    startDate.setDate(startDate.getDate() - config.dateRangeDays);
    const endDate = new Date(transactionDate);
    endDate.setDate(endDate.getDate() + config.dateRangeDays);

    // Query for transactions in the same account within date range
    const { data } = await this.supabase
      .from('transactions')
      .select('id, external_id, amount, date, description, merchant, created_at')
      .eq('account_id', transaction.accountId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(50);

    return data || [];
  }

  private calculateMatchScore(
    transaction: TransactionForDuplicateCheck,
    candidate: any,
    config: DuplicateDetectionConfig
  ): DuplicateMatch {
    
    let score = 0;
    const reasons: string[] = [];
    const matchedFields: string[] = [];

    // Amount match (exact)
    if (Math.abs(transaction.amount - candidate.amount) < 0.01) {
      score += config.amountMatchWeight;
      reasons.push('Exact amount match');
      matchedFields.push('amount');
    }

    // Date proximity
    const transactionDate = new Date(transaction.date);
    const candidateDate = new Date(candidate.date);
    const daysDiff = Math.abs(
      (transactionDate.getTime() - candidateDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysDiff <= config.dateRangeDays) {
      const dateScore = config.dateRangeWeight * (1 - daysDiff / config.dateRangeDays);
      score += dateScore;
      reasons.push(`Date within ${daysDiff.toFixed(1)} days`);
      matchedFields.push('date');
    }

    // Description similarity
    const descriptionSimilarity = this.calculateTextSimilarity(
      transaction.description,
      candidate.description
    );
    
    if (descriptionSimilarity > 0.7) {
      score += config.descriptionMatchWeight * descriptionSimilarity;
      reasons.push(`Description similarity: ${(descriptionSimilarity * 100).toFixed(0)}%`);
      matchedFields.push('description');
    }

    // Merchant match
    if (transaction.merchant && candidate.merchant) {
      const merchantSimilarity = this.calculateTextSimilarity(
        transaction.merchant,
        candidate.merchant
      );
      
      if (merchantSimilarity > 0.8) {
        score += config.merchantMatchWeight * merchantSimilarity;
        reasons.push('Merchant match');
        matchedFields.push('merchant');
      }
    }

    // External ID partial match (different from exact match)
    if (transaction.externalId && candidate.external_id && 
        transaction.externalId !== candidate.external_id) {
      const idSimilarity = this.calculateTextSimilarity(
        transaction.externalId,
        candidate.external_id
      );
      
      if (idSimilarity > 0.6) {
        score += 0.1 * idSimilarity;
        reasons.push('Similar external ID');
        matchedFields.push('external_id');
      }
    }

    return {
      transactionId: candidate.id,
      matchScore: Math.min(score, 1.0), // Cap at 1.0
      matchReasons: reasons,
      matchedFields,
      isExactDuplicate: score >= 0.95
    };
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    const str1 = text1.toLowerCase().trim();
    const str2 = text2.toLowerCase().trim();
    
    if (str1 === str2) return 1.0;
    
    // Use Levenshtein distance for similarity
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  async markAsDuplicate(
    transactionId: string,
    duplicateOfId: string,
    userId: string,
    reason: string
  ): Promise<boolean> {
    try {
      // Add to duplicates tracking table (if it exists)
      await this.supabase
        .from('duplicate_transactions')
        .insert({
          transaction_id: transactionId,
          duplicate_of_id: duplicateOfId,
          user_id: userId,
          reason,
          detected_at: new Date().toISOString()
        });

      // Mark the duplicate transaction as inactive/hidden
      await this.supabase
        .from('transactions')
        .update({ 
          is_duplicate: true,
          duplicate_of_id: duplicateOfId,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)
        .eq('account_id', userId); // Ensure user owns the transaction

      return true;
    } catch (error) {
      console.error('Failed to mark transaction as duplicate:', error);
      return false;
    }
  }

  async findAllDuplicatesInAccount(
    accountId: string,
    userId: string,
    config?: Partial<DuplicateDetectionConfig>
  ): Promise<Map<string, DuplicateMatch[]>> {
    
    const finalConfig = { ...this.defaultConfig, ...config };
    const duplicatesMap = new Map<string, DuplicateMatch[]>();

    // Get all transactions for the account
    const { data: transactions } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false });

    if (!transactions) return duplicatesMap;

    // Check each transaction against others
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      
      const duplicateCheck: TransactionForDuplicateCheck = {
        externalId: transaction.external_id,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description,
        merchant: transaction.merchant,
        accountId: transaction.account_id
      };

      const result = await this.detectDuplicates(duplicateCheck, finalConfig);
      
      if (result.isDuplicate && result.matches.length > 0) {
        // Filter out self-matches
        const validMatches = result.matches.filter(
          match => match.transactionId !== transaction.id
        );
        
        if (validMatches.length > 0) {
          duplicatesMap.set(transaction.id, validMatches);
        }
      }
    }

    return duplicatesMap;
  }

  async cleanupDuplicates(
    accountId: string,
    userId: string,
    autoResolve: boolean = false
  ): Promise<{
    found: number;
    resolved: number;
    errors: number;
    details: Array<{
      transactionId: string;
      duplicateId: string;
      action: 'marked' | 'error' | 'manual_review';
      reason: string;
    }>;
  }> {
    
    const result = {
      found: 0,
      resolved: 0,
      errors: 0,
      details: [] as Array<{
        transactionId: string;
        duplicateId: string;
        action: 'marked' | 'error' | 'manual_review';
        reason: string;
      }>
    };

    const duplicatesMap = await this.findAllDuplicatesInAccount(accountId, userId);
    result.found = duplicatesMap.size;

    for (const [transactionId, matches] of duplicatesMap) {
      const bestMatch = matches.sort((a, b) => b.matchScore - a.matchScore)[0];
      
      if (autoResolve && bestMatch.isExactDuplicate) {
        const success = await this.markAsDuplicate(
          transactionId,
          bestMatch.transactionId,
          userId,
          `Auto-resolved: ${bestMatch.matchReasons.join(', ')}`
        );
        
        if (success) {
          result.resolved++;
          result.details.push({
            transactionId,
            duplicateId: bestMatch.transactionId,
            action: 'marked',
            reason: `Auto-resolved with ${(bestMatch.matchScore * 100).toFixed(0)}% confidence`
          });
        } else {
          result.errors++;
          result.details.push({
            transactionId,
            duplicateId: bestMatch.transactionId,
            action: 'error',
            reason: 'Failed to mark as duplicate'
          });
        }
      } else {
        result.details.push({
          transactionId,
          duplicateId: bestMatch.transactionId,
          action: 'manual_review',
          reason: `Requires manual review (${(bestMatch.matchScore * 100).toFixed(0)}% confidence)`
        });
      }
    }

    return result;
  }
}