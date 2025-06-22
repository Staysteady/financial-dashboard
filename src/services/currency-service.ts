import { CurrencyRate } from '@/types';

export interface CurrencyConversion {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  timestamp: string;
}

export interface MultiCurrencyBalance {
  currency: string;
  balance: number;
  balanceInBaseCurrency: number;
  exchangeRate: number;
}

export interface MultiCurrencyAccount {
  accountId: string;
  baseCurrency: string;
  balances: MultiCurrencyBalance[];
  totalInBaseCurrency: number;
}

export class CurrencyService {
  private readonly BASE_CURRENCY = 'GBP';
  private readonly API_KEY = process.env.NEXT_PUBLIC_EXCHANGE_API_KEY || '';
  
  // Mock exchange rates for demo (in production, fetch from API)
  private readonly mockRates: Record<string, number> = {
    'USD': 0.79,   // 1 USD = 0.79 GBP
    'EUR': 0.86,   // 1 EUR = 0.86 GBP
    'GBP': 1.00,   // Base currency
    'CAD': 0.58,   // 1 CAD = 0.58 GBP
    'AUD': 0.51,   // 1 AUD = 0.51 GBP
    'JPY': 0.0053, // 1 JPY = 0.0053 GBP
    'CHF': 0.89,   // 1 CHF = 0.89 GBP
    'CNY': 0.11,   // 1 CNY = 0.11 GBP
    'INR': 0.0095, // 1 INR = 0.0095 GBP
  };

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return 1;

    // In production, fetch from real API like exchangerate-api.com
    // For demo, use mock rates
    if (toCurrency === this.BASE_CURRENCY) {
      return this.mockRates[fromCurrency] || 1;
    }
    
    if (fromCurrency === this.BASE_CURRENCY) {
      return 1 / (this.mockRates[toCurrency] || 1);
    }

    // Convert through base currency
    const fromToBase = this.mockRates[fromCurrency] || 1;
    const toToBase = this.mockRates[toCurrency] || 1;
    return fromToBase / toToBase;
  }

  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<CurrencyConversion> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * rate;

    return {
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      toAmount: convertedAmount,
      rate,
      timestamp: new Date().toISOString()
    };
  }

  async getMultipleCurrencyRates(currencies: string[]): Promise<CurrencyRate[]> {
    const rates: CurrencyRate[] = [];
    const timestamp = new Date().toISOString();

    for (const currency of currencies) {
      if (currency !== this.BASE_CURRENCY) {
        const rate = await this.getExchangeRate(currency, this.BASE_CURRENCY);
        rates.push({
          from_currency: currency,
          to_currency: this.BASE_CURRENCY,
          rate,
          timestamp
        });
      }
    }

    return rates;
  }

  async convertMultiCurrencyAccount(
    accountId: string,
    balances: { currency: string; balance: number }[],
    baseCurrency: string = this.BASE_CURRENCY
  ): Promise<MultiCurrencyAccount> {
    const multiCurrencyBalances: MultiCurrencyBalance[] = [];
    let totalInBaseCurrency = 0;

    for (const { currency, balance } of balances) {
      const exchangeRate = await this.getExchangeRate(currency, baseCurrency);
      const balanceInBaseCurrency = balance * exchangeRate;
      
      multiCurrencyBalances.push({
        currency,
        balance,
        balanceInBaseCurrency,
        exchangeRate
      });

      totalInBaseCurrency += balanceInBaseCurrency;
    }

    return {
      accountId,
      baseCurrency,
      balances: multiCurrencyBalances,
      totalInBaseCurrency
    };
  }

  formatCurrency(amount: number, currency: string): string {
    const currencyFormats: Record<string, { locale: string; symbol: string }> = {
      'GBP': { locale: 'en-GB', symbol: 'GBP' },
      'USD': { locale: 'en-US', symbol: 'USD' },
      'EUR': { locale: 'en-DE', symbol: 'EUR' },
      'CAD': { locale: 'en-CA', symbol: 'CAD' },
      'AUD': { locale: 'en-AU', symbol: 'AUD' },
      'JPY': { locale: 'ja-JP', symbol: 'JPY' },
      'CHF': { locale: 'de-CH', symbol: 'CHF' },
      'CNY': { locale: 'zh-CN', symbol: 'CNY' },
      'INR': { locale: 'en-IN', symbol: 'INR' },
    };

    const format = currencyFormats[currency] || { locale: 'en-GB', symbol: currency };
    
    return new Intl.NumberFormat(format.locale, {
      style: 'currency',
      currency: format.symbol,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2
    }).format(amount);
  }

  getSupportedCurrencies(): Array<{ code: string; name: string; symbol: string }> {
    return [
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    ];
  }

  calculateCurrencyExposure(
    accounts: MultiCurrencyAccount[]
  ): Array<{ currency: string; totalAmount: number; percentage: number }> {
    const currencyTotals: Record<string, number> = {};
    let grandTotal = 0;

    // Aggregate all balances by currency across all accounts
    accounts.forEach(account => {
      account.balances.forEach(balance => {
        currencyTotals[balance.currency] = 
          (currencyTotals[balance.currency] || 0) + balance.balance;
        grandTotal += balance.balanceInBaseCurrency;
      });
    });

    // Calculate percentages
    return Object.entries(currencyTotals).map(([currency, amount]) => ({
      currency,
      totalAmount: amount,
      percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0
    }));
  }

  generateCurrencyAlerts(
    accounts: MultiCurrencyAccount[],
    thresholds: Record<string, number> = {}
  ): Array<{ type: string; message: string; currency: string; severity: 'low' | 'medium' | 'high' }> {
    const alerts: Array<{ type: string; message: string; currency: string; severity: 'low' | 'medium' | 'high' }> = [];
    const exposure = this.calculateCurrencyExposure(accounts);

    exposure.forEach(({ currency, percentage }) => {
      const threshold = thresholds[currency] || 30; // Default 30% threshold
      
      if (percentage > threshold) {
        alerts.push({
          type: 'CURRENCY_CONCENTRATION',
          message: `High exposure to ${currency}: ${percentage.toFixed(1)}% of total balance`,
          currency,
          severity: percentage > 50 ? 'high' : 'medium'
        });
      }
    });

    return alerts;
  }

  // Generate mock multi-currency data for demo
  generateMockMultiCurrencyData(userId: string): MultiCurrencyAccount[] {
    return [
      {
        accountId: 'acc_multi_1',
        baseCurrency: 'GBP',
        balances: [
          { currency: 'GBP', balance: 15000, balanceInBaseCurrency: 15000, exchangeRate: 1.0 },
          { currency: 'USD', balance: 8000, balanceInBaseCurrency: 6320, exchangeRate: 0.79 },
          { currency: 'EUR', balance: 3500, balanceInBaseCurrency: 3010, exchangeRate: 0.86 }
        ],
        totalInBaseCurrency: 24330
      },
      {
        accountId: 'acc_multi_2',
        baseCurrency: 'GBP',
        balances: [
          { currency: 'GBP', balance: 45000, balanceInBaseCurrency: 45000, exchangeRate: 1.0 },
          { currency: 'CAD', balance: 12000, balanceInBaseCurrency: 6960, exchangeRate: 0.58 }
        ],
        totalInBaseCurrency: 51960
      },
      {
        accountId: 'acc_multi_3',
        baseCurrency: 'GBP',
        balances: [
          { currency: 'JPY', balance: 500000, balanceInBaseCurrency: 2650, exchangeRate: 0.0053 },
          { currency: 'CHF', balance: 8000, balanceInBaseCurrency: 7120, exchangeRate: 0.89 }
        ],
        totalInBaseCurrency: 9770
      }
    ];
  }

  async getHistoricalRates(
    fromCurrency: string,
    toCurrency: string,
    days: number = 30
  ): Promise<Array<{ date: string; rate: number }>> {
    // Mock historical data for demo
    const rates: Array<{ date: string; rate: number }> = [];
    const baseRate = await this.getExchangeRate(fromCurrency, toCurrency);
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add some random variation (+/- 5%)
      const variation = (Math.random() - 0.5) * 0.1;
      const rate = baseRate * (1 + variation);
      
      rates.push({
        date: date.toISOString().split('T')[0],
        rate: Math.round(rate * 10000) / 10000 // Round to 4 decimal places
      });
    }
    
    return rates;
  }
}

export const currencyService = new CurrencyService();