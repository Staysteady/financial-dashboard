import { 
  Investment, 
  PortfolioSummary, 
  InvestmentPerformance, 
  PriceHistoryPoint,
  PortfolioDiversification 
} from '@/types';

export class PortfolioService {
  // Mock price data service - replace with real API in production
  private async getMarketPrice(symbol: string): Promise<number> {
    // Simulate API call with mock data
    const mockPrices: { [key: string]: number } = {
      'AAPL': 175.50,
      'GOOGL': 142.80,
      'MSFT': 415.25,
      'AMZN': 185.90,
      'TSLA': 248.50,
      'NVDA': 875.30,
      'META': 485.75,
      'NFLX': 456.20,
      'BTC': 65000,
      'ETH': 3200,
      'SPY': 485.60,
      'QQQ': 395.80,
      'VTI': 255.40,
      'VXUS': 64.20,
      'BND': 72.85,
      'GLD': 195.40
    };

    return mockPrices[symbol] || Math.random() * 200 + 50;
  }

  private async getPriceHistory(symbol: string, days: number = 30): Promise<PriceHistoryPoint[]> {
    const history: PriceHistoryPoint[] = [];
    const currentPrice = await this.getMarketPrice(symbol);
    const now = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Simulate price movement
      const volatility = 0.02; // 2% daily volatility
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      const basePrice = currentPrice * (1 - (i * 0.001)); // Slight upward trend
      const price = basePrice * (1 + randomChange);
      
      history.push({
        date: date.toISOString().split('T')[0],
        price: Math.round(price * 100) / 100,
        volume: Math.floor(Math.random() * 1000000) + 100000
      });
    }

    return history;
  }

  async updateInvestmentPrices(investments: Investment[]): Promise<Investment[]> {
    const updatedInvestments = await Promise.all(
      investments.map(async (investment) => {
        const currentPrice = await this.getMarketPrice(investment.symbol);
        return {
          ...investment,
          current_price: currentPrice
        };
      })
    );

    return updatedInvestments;
  }

  calculateInvestmentPerformance(investment: Investment): InvestmentPerformance {
    const currentValue = investment.quantity * investment.current_price;
    const costBasis = investment.quantity * investment.purchase_price;
    const gainLoss = currentValue - costBasis;
    const gainLossPercentage = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

    // Mock day change (replace with real data)
    const dayChange = currentValue * (Math.random() * 0.04 - 0.02); // ±2% random
    const dayChangePercentage = currentValue > 0 ? (dayChange / currentValue) * 100 : 0;

    return {
      investment,
      currentValue,
      gainLoss,
      gainLossPercentage,
      dayChange,
      dayChangePercentage,
      priceHistory: [] // Will be populated separately
    };
  }

  async calculatePortfolioSummary(investments: Investment[]): Promise<PortfolioSummary> {
    const updatedInvestments = await this.updateInvestmentPrices(investments);
    const performances = updatedInvestments.map(inv => this.calculateInvestmentPerformance(inv));

    const totalValue = performances.reduce((sum, perf) => sum + perf.currentValue, 0);
    const totalCost = updatedInvestments.reduce((sum, inv) => sum + (inv.quantity * inv.purchase_price), 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    const dayChange = performances.reduce((sum, perf) => sum + perf.dayChange, 0);
    const dayChangePercentage = totalValue > 0 ? (dayChange / totalValue) * 100 : 0;

    // Calculate diversification
    const diversification = this.calculateDiversification(updatedInvestments, performances);

    // Get top and worst performers
    const sortedPerformances = performances.sort((a, b) => b.gainLossPercentage - a.gainLossPercentage);
    const topPerformers = sortedPerformances.slice(0, 3).map(p => p.investment);
    const worstPerformers = sortedPerformances.slice(-3).reverse().map(p => p.investment);

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercentage,
      dayChange,
      dayChangePercentage,
      diversification,
      topPerformers,
      worstPerformers
    };
  }

  private calculateDiversification(
    investments: Investment[], 
    performances: InvestmentPerformance[]
  ): PortfolioDiversification {
    const totalValue = performances.reduce((sum, perf) => sum + perf.currentValue, 0);

    // Diversification by investment type
    const byType: { [key: string]: { value: number; percentage: number } } = {};
    performances.forEach(perf => {
      const type = perf.investment.type;
      if (!byType[type]) {
        byType[type] = { value: 0, percentage: 0 };
      }
      byType[type].value += perf.currentValue;
    });

    Object.keys(byType).forEach(type => {
      byType[type].percentage = totalValue > 0 ? (byType[type].value / totalValue) * 100 : 0;
    });

    // Mock sector and region diversification
    const sectors = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial'];
    const regions = ['North America', 'Europe', 'Asia Pacific', 'Emerging Markets'];

    const bySector: { [key: string]: { value: number; percentage: number } } = {};
    const byRegion: { [key: string]: { value: number; percentage: number } } = {};

    // Distribute investments across sectors and regions randomly for demo
    performances.forEach(perf => {
      const randomSector = sectors[Math.floor(Math.random() * sectors.length)];
      const randomRegion = regions[Math.floor(Math.random() * regions.length)];

      if (!bySector[randomSector]) {
        bySector[randomSector] = { value: 0, percentage: 0 };
      }
      if (!byRegion[randomRegion]) {
        byRegion[randomRegion] = { value: 0, percentage: 0 };
      }

      bySector[randomSector].value += perf.currentValue * 0.7; // Primary allocation
      byRegion[randomRegion].value += perf.currentValue * 0.8; // Primary allocation
    });

    // Calculate percentages
    Object.keys(bySector).forEach(sector => {
      bySector[sector].percentage = totalValue > 0 ? (bySector[sector].value / totalValue) * 100 : 0;
    });
    Object.keys(byRegion).forEach(region => {
      byRegion[region].percentage = totalValue > 0 ? (byRegion[region].value / totalValue) * 100 : 0;
    });

    return {
      byType,
      bySector,
      byRegion
    };
  }

  async getDetailedPerformance(investment: Investment): Promise<InvestmentPerformance> {
    const performance = this.calculateInvestmentPerformance(investment);
    const priceHistory = await this.getPriceHistory(investment.symbol);
    
    return {
      ...performance,
      priceHistory
    };
  }

  // Generate mock investment data for demo
  generateMockInvestments(userId: string, accountId: string): Investment[] {
    const mockInvestments = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock' as const,
        quantity: 25,
        purchase_price: 150.00,
        purchase_date: '2023-06-15'
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        type: 'stock' as const,
        quantity: 15,
        purchase_price: 135.50,
        purchase_date: '2023-07-20'
      },
      {
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF',
        type: 'etf' as const,
        quantity: 50,
        purchase_price: 425.80,
        purchase_date: '2023-05-10'
      },
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        type: 'crypto' as const,
        quantity: 0.5,
        purchase_price: 45000,
        purchase_date: '2023-08-01'
      },
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        type: 'etf' as const,
        quantity: 30,
        purchase_price: 240.20,
        purchase_date: '2023-04-12'
      },
      {
        symbol: 'BND',
        name: 'Vanguard Total Bond Market ETF',
        type: 'bond' as const,
        quantity: 40,
        purchase_price: 75.60,
        purchase_date: '2023-09-05'
      }
    ];

    return mockInvestments.map((mock, index) => ({
      id: `inv_${index + 1}`,
      user_id: userId,
      account_id: accountId,
      ...mock,
      current_price: 0, // Will be updated by service
      currency: 'USD',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }

  // Rebalancing suggestions
  calculateRebalancingSuggestions(
    investments: Investment[], 
    targetAllocations: { [type: string]: number }
  ): { type: string; current: number; target: number; action: string; amount: number }[] {
    const performances = investments.map(inv => this.calculateInvestmentPerformance(inv));
    const totalValue = performances.reduce((sum, perf) => sum + perf.currentValue, 0);

    const currentAllocations: { [type: string]: number } = {};
    performances.forEach(perf => {
      const type = perf.investment.type;
      currentAllocations[type] = (currentAllocations[type] || 0) + perf.currentValue;
    });

    const suggestions = Object.keys(targetAllocations).map(type => {
      const currentValue = currentAllocations[type] || 0;
      const currentPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
      const targetPercentage = targetAllocations[type];
      const targetValue = (targetPercentage / 100) * totalValue;
      const difference = targetValue - currentValue;

      return {
        type,
        current: currentPercentage,
        target: targetPercentage,
        action: difference > 0 ? 'Buy' : 'Sell',
        amount: Math.abs(difference)
      };
    });

    return suggestions.filter(s => Math.abs(s.current - s.target) > 2); // Only suggest if >2% off target
  }
}

export const portfolioService = new PortfolioService();