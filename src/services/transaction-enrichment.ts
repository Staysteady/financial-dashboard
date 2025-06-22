import { createServerSupabaseClient } from '@/lib/supabase';

export interface EnrichmentData {
  merchant?: MerchantInfo;
  location?: LocationInfo;
  category?: CategorySuggestion;
  metadata?: TransactionMetadata;
}

export interface MerchantInfo {
  name: string;
  cleanName: string;
  category: string;
  subcategory?: string;
  website?: string;
  logo?: string;
  description?: string;
  chainInfo?: {
    parentCompany: string;
    brandType: 'chain' | 'franchise' | 'independent';
  };
}

export interface LocationInfo {
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  venue?: {
    type: 'store' | 'restaurant' | 'atm' | 'online' | 'other';
    name?: string;
  };
}

export interface CategorySuggestion {
  primary: string;
  secondary?: string;
  confidence: number;
  source: 'merchant' | 'location' | 'amount' | 'description';
}

export interface TransactionMetadata {
  paymentMethod?: 'card' | 'cash' | 'transfer' | 'direct_debit' | 'standing_order';
  isRecurring?: boolean;
  recurringPattern?: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  tags?: string[];
  notes?: string;
  receiptUrl?: string;
}

export interface EnrichmentResult {
  success: boolean;
  transactionId: string;
  enriched: boolean;
  data: EnrichmentData;
  confidence: number;
  sources: string[];
  error?: string;
}

export class TransactionEnricher {
  private supabase = createServerSupabaseClient();
  
  // UK merchant database - in a real system this would be more comprehensive
  private merchantDatabase = new Map<string, MerchantInfo>([
    // Supermarkets
    ['tesco', {
      name: 'Tesco',
      cleanName: 'Tesco',
      category: 'groceries',
      subcategory: 'supermarket',
      website: 'tesco.com',
      description: 'UK supermarket chain',
      chainInfo: { parentCompany: 'Tesco PLC', brandType: 'chain' }
    }],
    ['sainsbury', {
      name: 'Sainsbury\'s',
      cleanName: 'Sainsburys',
      category: 'groceries',
      subcategory: 'supermarket',
      website: 'sainsburys.co.uk',
      description: 'UK supermarket chain',
      chainInfo: { parentCompany: 'J Sainsbury plc', brandType: 'chain' }
    }],
    ['asda', {
      name: 'ASDA',
      cleanName: 'ASDA',
      category: 'groceries',
      subcategory: 'supermarket',
      website: 'asda.com',
      description: 'UK supermarket chain',
      chainInfo: { parentCompany: 'Walmart', brandType: 'chain' }
    }],
    
    // Restaurants/Fast Food
    ['mcdonald', {
      name: 'McDonald\'s',
      cleanName: 'McDonalds',
      category: 'dining',
      subcategory: 'fast_food',
      website: 'mcdonalds.co.uk',
      description: 'Fast food restaurant',
      chainInfo: { parentCompany: 'McDonald\'s Corporation', brandType: 'franchise' }
    }],
    ['nandos', {
      name: 'Nando\'s',
      cleanName: 'Nandos',
      category: 'dining',
      subcategory: 'restaurant',
      website: 'nandos.co.uk',
      description: 'Casual dining restaurant',
      chainInfo: { parentCompany: 'Nando\'s', brandType: 'chain' }
    }],
    
    // Transport
    ['tfl', {
      name: 'Transport for London',
      cleanName: 'TfL',
      category: 'transport',
      subcategory: 'public_transport',
      website: 'tfl.gov.uk',
      description: 'London public transport'
    }],
    ['uber', {
      name: 'Uber',
      cleanName: 'Uber',
      category: 'transport',
      subcategory: 'taxi',
      website: 'uber.com',
      description: 'Ride-hailing service'
    }],
    
    // Fuel
    ['shell', {
      name: 'Shell',
      cleanName: 'Shell',
      category: 'fuel',
      subcategory: 'petrol_station',
      website: 'shell.co.uk',
      description: 'Petrol station and convenience store',
      chainInfo: { parentCompany: 'Shell plc', brandType: 'chain' }
    }],
    
    // Online/Tech
    ['amazon', {
      name: 'Amazon',
      cleanName: 'Amazon',
      category: 'shopping',
      subcategory: 'online_retail',
      website: 'amazon.co.uk',
      description: 'Online marketplace and services'
    }],
    ['netflix', {
      name: 'Netflix',
      cleanName: 'Netflix',
      category: 'subscriptions',
      subcategory: 'entertainment',
      website: 'netflix.com',
      description: 'Video streaming service'
    }],
    ['spotify', {
      name: 'Spotify',
      cleanName: 'Spotify',
      category: 'subscriptions',
      subcategory: 'music',
      website: 'spotify.com',
      description: 'Music streaming service'
    }]
  ]);

  async enrichTransaction(
    userId: string,
    transactionId: string,
    description: string,
    merchant?: string,
    amount?: number,
    location?: string
  ): Promise<EnrichmentResult> {
    
    try {
      const enrichmentData: EnrichmentData = {};
      const sources: string[] = [];
      let confidence = 0;
      let totalWeights = 0;

      // 1. Merchant enrichment
      const merchantInfo = await this.enrichMerchant(description, merchant);
      if (merchantInfo) {
        enrichmentData.merchant = merchantInfo;
        sources.push('merchant_database');
        confidence += 0.8;
        totalWeights += 0.8;
      }

      // 2. Location enrichment
      if (location) {
        const locationInfo = await this.enrichLocation(location, merchantInfo?.name);
        if (locationInfo) {
          enrichmentData.location = locationInfo;
          sources.push('location_data');
          confidence += 0.6;
          totalWeights += 0.6;
        }
      }

      // 3. Category suggestion based on enriched data
      const categorySuggestion = await this.suggestCategory(
        userId,
        description,
        merchantInfo,
        amount
      );
      if (categorySuggestion) {
        enrichmentData.category = categorySuggestion;
        sources.push('category_engine');
        confidence += categorySuggestion.confidence;
        totalWeights += 1.0;
      }

      // 4. Transaction metadata
      const metadata = await this.extractMetadata(description, merchant, amount);
      if (metadata) {
        enrichmentData.metadata = metadata;
        sources.push('metadata_extraction');
        confidence += 0.4;
        totalWeights += 0.4;
      }

      // Calculate final confidence
      const finalConfidence = totalWeights > 0 ? confidence / totalWeights : 0;

      // Store enrichment data if significant
      if (finalConfidence > 0.3) {
        await this.storeEnrichmentData(transactionId, enrichmentData);
      }

      return {
        success: true,
        transactionId,
        enriched: finalConfidence > 0.3,
        data: enrichmentData,
        confidence: finalConfidence,
        sources
      };

    } catch (error) {
      console.error('Transaction enrichment error:', error);
      return {
        success: false,
        transactionId,
        enriched: false,
        data: {},
        confidence: 0,
        sources: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async enrichMerchant(
    description: string,
    merchant?: string
  ): Promise<MerchantInfo | null> {
    
    const searchText = `${description} ${merchant || ''}`.toLowerCase();
    
    // Try exact merchant database lookup
    for (const [key, merchantInfo] of this.merchantDatabase) {
      if (searchText.includes(key.toLowerCase())) {
        return merchantInfo;
      }
    }

    // Try fuzzy matching for common variations
    const cleanedText = searchText
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = cleanedText.split(' ');
    
    for (const [key, merchantInfo] of this.merchantDatabase) {
      // Check if any word matches merchant name variations
      if (words.some(word => 
        word.length > 3 && 
        (merchantInfo.name.toLowerCase().includes(word) ||
         merchantInfo.cleanName.toLowerCase().includes(word))
      )) {
        return merchantInfo;
      }
    }

    // Extract potential merchant name from description
    const extractedMerchant = this.extractMerchantFromDescription(description);
    if (extractedMerchant) {
      return {
        name: extractedMerchant,
        cleanName: extractedMerchant,
        category: 'unknown',
        description: 'Extracted from transaction description'
      };
    }

    return null;
  }

  private extractMerchantFromDescription(description: string): string | null {
    // Common patterns in UK bank descriptions
    const patterns = [
      // Card payments: "CARD PAYMENT TO MERCHANT NAME"
      /card\s+payment\s+to\s+(.*?)(?:\s+on|\s+\d{2}\/\d{2}|$)/i,
      // Direct debits: "DD MERCHANT NAME"
      /dd\s+(.*?)(?:\s+ref|\s+\d{2}\/\d{2}|$)/i,
      // General pattern: Extract capitalized words
      /\b([A-Z][A-Z\s]{2,}[A-Z])\b/,
      // After "to" or "from"
      /(?:to|from)\s+([\w\s&]+?)(?:\s+\d{2}\/\d{2}|\s+ref|$)/i
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        if (extracted.length > 2 && extracted.length < 50) {
          return this.cleanMerchantName(extracted);
        }
      }
    }

    return null;
  }

  private cleanMerchantName(name: string): string {
    return name
      .replace(/\b(LTD|LIMITED|PLC|LLP|INC)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private async enrichLocation(
    locationHint: string,
    merchantName?: string
  ): Promise<LocationInfo | null> {
    
    // UK postcode pattern
    const postcodePattern = /([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})/i;
    const postcodeMatch = locationHint.match(postcodePattern);
    
    if (postcodeMatch) {
      return {
        postcode: postcodeMatch[1].toUpperCase(),
        country: 'GB',
        venue: {
          type: this.inferVenueType(merchantName),
          name: merchantName
        }
      };
    }

    // Extract city names (basic UK cities)
    const ukCities = [
      'london', 'manchester', 'birmingham', 'leeds', 'glasgow', 'sheffield',
      'bradford', 'liverpool', 'edinburgh', 'bristol', 'cardiff', 'coventry',
      'leicester', 'sunderland', 'belfast', 'newcastle', 'brighton', 'hull',
      'plymouth', 'stoke', 'wolverhampton', 'derby', 'swansea', 'southampton',
      'salford', 'aberdeen', 'westminster', 'reading', 'luton', 'york'
    ];

    const cityMatch = ukCities.find(city => 
      locationHint.toLowerCase().includes(city)
    );

    if (cityMatch) {
      return {
        city: cityMatch.charAt(0).toUpperCase() + cityMatch.slice(1),
        country: 'GB',
        venue: {
          type: this.inferVenueType(merchantName),
          name: merchantName
        }
      };
    }

    return null;
  }

  private inferVenueType(merchantName?: string): 'store' | 'restaurant' | 'atm' | 'online' | 'other' {
    if (!merchantName) return 'other';
    
    const name = merchantName.toLowerCase();
    
    if (name.includes('atm') || name.includes('cash')) return 'atm';
    if (name.includes('amazon') || name.includes('ebay') || name.includes('online')) return 'online';
    if (name.includes('restaurant') || name.includes('cafe') || name.includes('mcdonald') || 
        name.includes('nandos') || name.includes('pizza')) return 'restaurant';
    if (name.includes('tesco') || name.includes('sainsbury') || name.includes('shop') || 
        name.includes('store')) return 'store';
    
    return 'other';
  }

  private async suggestCategory(
    userId: string,
    description: string,
    merchantInfo: MerchantInfo | null,
    amount?: number
  ): Promise<CategorySuggestion | null> {
    
    // Get user's categories
    const { data: categories } = await this.supabase
      .from('categories')
      .select('id, name, type')
      .eq('user_id', userId);

    if (!categories) return null;

    let bestMatch: CategorySuggestion | null = null;
    let highestConfidence = 0;

    // Match based on merchant category
    if (merchantInfo?.category) {
      const category = categories.find(c => 
        c.name.toLowerCase().includes(merchantInfo.category) ||
        merchantInfo.category.includes(c.name.toLowerCase())
      );

      if (category) {
        const confidence = 0.9;
        if (confidence > highestConfidence) {
          bestMatch = {
            primary: category.id,
            confidence,
            source: 'merchant'
          };
          highestConfidence = confidence;
        }
      }
    }

    // Match based on description keywords
    const descriptionLower = description.toLowerCase();
    const keywordMatches = categories.filter(c => {
      const categoryName = c.name.toLowerCase();
      return descriptionLower.includes(categoryName) || 
             categoryName.split(' ').some(word => descriptionLower.includes(word));
    });

    for (const category of keywordMatches) {
      const confidence = 0.7;
      if (confidence > highestConfidence) {
        bestMatch = {
          primary: category.id,
          confidence,
          source: 'description'
        };
        highestConfidence = confidence;
      }
    }

    // Match based on amount patterns
    if (amount) {
      if (amount < 5 && categories.find(c => c.name.toLowerCase().includes('coffee'))) {
        const coffeeCategory = categories.find(c => c.name.toLowerCase().includes('coffee'));
        if (coffeeCategory) {
          const confidence = 0.5;
          if (confidence > highestConfidence) {
            bestMatch = {
              primary: coffeeCategory.id,
              confidence,
              source: 'amount'
            };
            highestConfidence = confidence;
          }
        }
      }
    }

    return bestMatch;
  }

  private async extractMetadata(
    description: string,
    merchant?: string,
    amount?: number
  ): Promise<TransactionMetadata | null> {
    
    const metadata: TransactionMetadata = {};
    const descLower = description.toLowerCase();

    // Payment method detection
    if (descLower.includes('card payment') || descLower.includes('pos')) {
      metadata.paymentMethod = 'card';
    } else if (descLower.includes('direct debit') || descLower.includes('dd')) {
      metadata.paymentMethod = 'direct_debit';
    } else if (descLower.includes('standing order') || descLower.includes('so')) {
      metadata.paymentMethod = 'standing_order';
    } else if (descLower.includes('transfer') || descLower.includes('bacs')) {
      metadata.paymentMethod = 'transfer';
    } else if (descLower.includes('cash') || descLower.includes('atm')) {
      metadata.paymentMethod = 'cash';
    }

    // Recurring pattern detection
    if (metadata.paymentMethod === 'direct_debit' || 
        metadata.paymentMethod === 'standing_order') {
      metadata.isRecurring = true;
      metadata.recurringPattern = 'monthly'; // Default assumption
    }

    // Tags based on description
    const tags: string[] = [];
    if (descLower.includes('refund')) tags.push('refund');
    if (descLower.includes('subscription')) tags.push('subscription');
    if (descLower.includes('fee') || descLower.includes('charge')) tags.push('fee');
    if (descLower.includes('interest')) tags.push('interest');
    if (descLower.includes('cashback')) tags.push('cashback');

    if (tags.length > 0) {
      metadata.tags = tags;
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  }

  private async storeEnrichmentData(
    transactionId: string,
    enrichmentData: EnrichmentData
  ): Promise<void> {
    
    try {
      // Store in a separate enrichment table
      await this.supabase
        .from('transaction_enrichments')
        .upsert({
          transaction_id: transactionId,
          merchant_info: enrichmentData.merchant ? JSON.stringify(enrichmentData.merchant) : null,
          location_info: enrichmentData.location ? JSON.stringify(enrichmentData.location) : null,
          category_suggestion: enrichmentData.category ? JSON.stringify(enrichmentData.category) : null,
          metadata: enrichmentData.metadata ? JSON.stringify(enrichmentData.metadata) : null,
          updated_at: new Date().toISOString()
        });

      // Update the main transaction with extracted merchant and location
      const updateData: any = {};
      
      if (enrichmentData.merchant?.cleanName) {
        updateData.merchant = enrichmentData.merchant.cleanName;
      }
      
      if (enrichmentData.location?.city || enrichmentData.location?.postcode) {
        const locationStr = [
          enrichmentData.location.city,
          enrichmentData.location.postcode
        ].filter(Boolean).join(', ');
        
        if (locationStr) {
          updateData.location = locationStr;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await this.supabase
          .from('transactions')
          .update(updateData)
          .eq('id', transactionId);
      }

    } catch (error) {
      console.error('Failed to store enrichment data:', error);
    }
  }

  async enrichTransactionBatch(
    userId: string,
    transactionIds: string[]
  ): Promise<EnrichmentResult[]> {
    
    const results: EnrichmentResult[] = [];
    
    // Get transactions to enrich
    const { data: transactions } = await this.supabase
      .from('transactions')
      .select('id, description, merchant, amount, location')
      .in('id', transactionIds);

    if (!transactions) return results;

    // Process each transaction
    for (const transaction of transactions) {
      const result = await this.enrichTransaction(
        userId,
        transaction.id,
        transaction.description,
        transaction.merchant,
        transaction.amount,
        transaction.location
      );
      
      results.push(result);
      
      // Small delay to avoid overwhelming external services
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  async getEnrichmentData(transactionId: string): Promise<EnrichmentData | null> {
    try {
      const { data } = await this.supabase
        .from('transaction_enrichments')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      if (!data) return null;

      return {
        merchant: data.merchant_info ? JSON.parse(data.merchant_info) : undefined,
        location: data.location_info ? JSON.parse(data.location_info) : undefined,
        category: data.category_suggestion ? JSON.parse(data.category_suggestion) : undefined,
        metadata: data.metadata ? JSON.parse(data.metadata) : undefined
      };

    } catch (error) {
      console.error('Failed to get enrichment data:', error);
      return null;
    }
  }

  async updateMerchantDatabase(
    merchantKey: string,
    merchantInfo: MerchantInfo
  ): Promise<void> {
    this.merchantDatabase.set(merchantKey.toLowerCase(), merchantInfo);
  }
}