import { Receipt, ReceiptItem } from '@/types';

export interface OCRResult {
  merchantName?: string;
  totalAmount?: number;
  currency?: string;
  date?: string;
  items: ReceiptItem[];
  confidence: number;
  rawText: string;
}

export interface ReceiptProcessingResult {
  success: boolean;
  receipt?: Receipt;
  error?: string;
  suggestions?: string[];
}

export class ReceiptOCRService {
  private readonly SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  async processReceiptImage(
    file: File,
    userId: string,
    transactionId?: string
  ): Promise<ReceiptProcessingResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // In a real implementation, this would:
      // 1. Upload image to cloud storage
      // 2. Call OCR API (Google Vision, AWS Textract, etc.)
      // 3. Parse the extracted text
      
      // For demo, simulate OCR processing
      const ocrResult = await this.simulateOCRProcessing(file);
      
      // Create receipt record
      const receipt = this.createReceiptRecord(
        ocrResult,
        userId,
        URL.createObjectURL(file), // In production, this would be the cloud storage URL
        transactionId
      );

      return {
        success: true,
        receipt,
        suggestions: this.generateSuggestions(ocrResult)
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to process receipt: ${error}`
      };
    }
  }

  private validateFile(file: File): { valid: boolean; error?: string } {
    if (!this.SUPPORTED_FORMATS.includes(file.type)) {
      return {
        valid: false,
        error: 'Unsupported file format. Please use JPEG, PNG, or WebP.'
      };
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'File too large. Maximum size is 10MB.'
      };
    }

    return { valid: true };
  }

  private async simulateOCRProcessing(file: File): Promise<OCRResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock OCR results based on filename or random selection
    const mockResults = [
      {
        merchantName: 'Tesco Express',
        totalAmount: 23.45,
        currency: 'GBP',
        date: new Date().toISOString().split('T')[0],
        items: [
          { name: 'Bread Loaf', quantity: 1, price: 1.20, category: 'Food' },
          { name: 'Milk 2L', quantity: 1, price: 1.25, category: 'Food' },
          { name: 'Bananas 1kg', quantity: 1, price: 1.50, category: 'Food' },
          { name: 'Chicken Breast', quantity: 1, price: 4.50, category: 'Food' },
          { name: 'Pasta 500g', quantity: 2, price: 0.89, category: 'Food' },
          { name: 'Tomatoes 500g', quantity: 1, price: 2.10, category: 'Food' }
        ],
        confidence: 0.92,
        rawText: 'TESCO EXPRESS\n123 HIGH STREET\nLONDON SW1A 1AA\n\nBread Loaf              £1.20\nMilk 2L                 £1.25\nBananas 1kg             £1.50\nChicken Breast          £4.50\nPasta 500g x2           £1.78\nTomatoes 500g           £2.10\n\nTOTAL                  £23.45\nCARD PAYMENT           £23.45\n\nThank you for shopping with us!'
      },
      {
        merchantName: 'Costa Coffee',
        totalAmount: 8.75,
        currency: 'GBP',
        date: new Date().toISOString().split('T')[0],
        items: [
          { name: 'Large Latte', quantity: 1, price: 4.35, category: 'Dining' },
          { name: 'Chocolate Muffin', quantity: 1, price: 2.95, category: 'Dining' },
          { name: 'Extra Shot', quantity: 1, price: 0.65, category: 'Dining' }
        ],
        confidence: 0.87,
        rawText: 'COSTA COFFEE\n456 OXFORD STREET\nLONDON W1C 1AP\n\nLarge Latte             £4.35\nChocolate Muffin        £2.95\nExtra Shot              £0.65\n\nSUBTOTAL               £7.95\nVAT                     £0.80\nTOTAL                  £8.75\n\nCARD PAYMENT           £8.75\nThank you!'
      },
      {
        merchantName: 'Sainsbury\'s',
        totalAmount: 45.67,
        currency: 'GBP',
        date: new Date().toISOString().split('T')[0],
        items: [
          { name: 'Weekly Shop', quantity: 1, price: 45.67, category: 'Groceries' }
        ],
        confidence: 0.76,
        rawText: 'SAINSBURY\'S SUPERMARKET\n789 REGENT STREET\nLONDON W1B 4HA\n\n[Multiple items - text unclear]\n\nTOTAL                  £45.67\nCHIP & PIN             £45.67\n\nPoints earned: 23\nThank you for shopping with Sainsbury\'s'
      }
    ];

    // Return a random mock result
    return mockResults[Math.floor(Math.random() * mockResults.length)];
  }

  private createReceiptRecord(
    ocrResult: OCRResult,
    userId: string,
    imageUrl: string,
    transactionId?: string
  ): Receipt {
    return {
      id: `receipt_${Date.now()}`,
      user_id: userId,
      transaction_id: transactionId,
      image_url: imageUrl,
      merchant_name: ocrResult.merchantName,
      total_amount: ocrResult.totalAmount,
      currency: ocrResult.currency,
      date: ocrResult.date,
      items: ocrResult.items,
      confidence_score: ocrResult.confidence,
      manual_review: ocrResult.confidence < 0.8,
      created_at: new Date().toISOString()
    };
  }

  private generateSuggestions(ocrResult: OCRResult): string[] {
    const suggestions: string[] = [];

    if (ocrResult.confidence < 0.8) {
      suggestions.push('Low confidence OCR result - please review extracted data');
    }

    if (!ocrResult.merchantName) {
      suggestions.push('Merchant name not detected - please add manually');
    }

    if (!ocrResult.totalAmount) {
      suggestions.push('Total amount not detected - please verify');
    }

    if (ocrResult.items.length === 0) {
      suggestions.push('No line items detected - consider adding items manually');
    }

    if (ocrResult.items.length === 1 && ocrResult.items[0].name.includes('Shop')) {
      suggestions.push('Individual items not detected - receipt may need manual entry');
    }

    return suggestions;
  }

  async linkReceiptToTransaction(
    receiptId: string,
    transactionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In production, update the receipt record in the database
      console.log(`Linking receipt ${receiptId} to transaction ${transactionId}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to link receipt: ${error}`
      };
    }
  }

  async updateReceiptData(
    receiptId: string,
    updates: Partial<Receipt>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In production, update the receipt record in the database
      console.log(`Updating receipt ${receiptId}`, updates);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update receipt: ${error}`
      };
    }
  }

  getReceiptHistory(userId: string, limit: number = 20): Receipt[] {
    // Generate mock receipt history
    const mockReceipts: Receipt[] = [];
    
    const merchants = [
      'Tesco Express', 'Sainsbury\'s', 'ASDA', 'Morrison\'s', 'Costa Coffee',
      'Starbucks', 'McDonald\'s', 'KFC', 'Subway', 'Pizza Express',
      'John Lewis', 'M&S', 'Boots', 'Argos', 'Currys PC World'
    ];

    for (let i = 0; i < limit; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      const totalAmount = Math.round((Math.random() * 100 + 5) * 100) / 100;
      const confidence = Math.random() * 0.4 + 0.6; // 0.6 to 1.0
      const merchant = merchants[Math.floor(Math.random() * merchants.length)];

      mockReceipts.push({
        id: `receipt_${i}`,
        user_id: userId,
        transaction_id: Math.random() > 0.3 ? `trans_${i}` : undefined,
        image_url: `/mock-receipt-${i}.jpg`,
        merchant_name: merchant,
        total_amount: totalAmount,
        currency: 'GBP',
        date: date.toISOString().split('T')[0],
        items: [
          {
            name: 'Receipt items',
            quantity: 1,
            price: totalAmount,
            category: merchant.includes('Coffee') || merchant.includes('McDonald') ? 'Dining' : 'Shopping'
          }
        ],
        confidence_score: confidence,
        manual_review: confidence < 0.8,
        created_at: date.toISOString()
      });
    }

    return mockReceipts.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async searchReceipts(
    userId: string,
    query: {
      merchantName?: string;
      dateFrom?: string;
      dateTo?: string;
      amountMin?: number;
      amountMax?: number;
      category?: string;
    }
  ): Promise<Receipt[]> {
    // Get all receipts and filter based on query
    const allReceipts = this.getReceiptHistory(userId, 100);
    
    return allReceipts.filter(receipt => {
      if (query.merchantName && !receipt.merchant_name?.toLowerCase().includes(query.merchantName.toLowerCase())) {
        return false;
      }
      
      if (query.dateFrom && receipt.date && receipt.date < query.dateFrom) {
        return false;
      }
      
      if (query.dateTo && receipt.date && receipt.date > query.dateTo) {
        return false;
      }
      
      if (query.amountMin && receipt.total_amount && receipt.total_amount < query.amountMin) {
        return false;
      }
      
      if (query.amountMax && receipt.total_amount && receipt.total_amount > query.amountMax) {
        return false;
      }
      
      if (query.category && !receipt.items.some(item => 
        item.category?.toLowerCase().includes(query.category!.toLowerCase())
      )) {
        return false;
      }
      
      return true;
    });
  }

  getReceiptAnalytics(userId: string): {
    totalReceipts: number;
    totalAmount: number;
    averageConfidence: number;
    topMerchants: Array<{ name: string; count: number; total: number }>;
    monthlyTrend: Array<{ month: string; count: number; amount: number }>;
  } {
    const receipts = this.getReceiptHistory(userId, 100);
    
    const totalReceipts = receipts.length;
    const totalAmount = receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const averageConfidence = receipts.reduce((sum, r) => sum + r.confidence_score, 0) / receipts.length;
    
    // Top merchants
    const merchantStats: Record<string, { count: number; total: number }> = {};
    receipts.forEach(receipt => {
      const merchant = receipt.merchant_name || 'Unknown';
      if (!merchantStats[merchant]) {
        merchantStats[merchant] = { count: 0, total: 0 };
      }
      merchantStats[merchant].count++;
      merchantStats[merchant].total += receipt.total_amount || 0;
    });
    
    const topMerchants = Object.entries(merchantStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    
    // Monthly trend
    const monthlyStats: Record<string, { count: number; amount: number }> = {};
    receipts.forEach(receipt => {
      const month = new Date(receipt.created_at).toLocaleDateString('en-GB', { 
        month: 'short', 
        year: 'numeric' 
      });
      if (!monthlyStats[month]) {
        monthlyStats[month] = { count: 0, amount: 0 };
      }
      monthlyStats[month].count++;
      monthlyStats[month].amount += receipt.total_amount || 0;
    });
    
    const monthlyTrend = Object.entries(monthlyStats)
      .map(([month, stats]) => ({ month, ...stats }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    
    return {
      totalReceipts,
      totalAmount,
      averageConfidence,
      topMerchants,
      monthlyTrend
    };
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  }
}

export const receiptOCRService = new ReceiptOCRService();