import {
  calculateTotalBalance,
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateAverageMonthlyExpenses,
  calculateBurnRate,
  calculateLinearTrend,
  calculateFinancialRunway,
  projectFutureBalance,
  calculateSpendingByCategory,
  detectSpendingAnomalies,
} from '../financial-calculations';
import { Account, Transaction } from '@/types';

// Mock data generators
const createMockAccount = (balance: number, id: string = '1'): Account => ({
  id,
  user_id: 'user-1',
  bank_name: 'Test Bank',
  account_name: 'Test Account',
  account_type: 'current',
  balance,
  currency: 'GBP',
  last_synced: new Date().toISOString(),
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const createMockTransaction = (
  amount: number,
  date: Date,
  type: 'income' | 'expense' = 'expense',
  category: string = 'general'
): Transaction => ({
  id: `trans-${Math.random()}`,
  user_id: 'user-1',
  account_id: 'acc-1',
  amount: Math.abs(amount),
  description: `Test transaction ${amount}`,
  transaction_type: type,
  category,
  date: date.toISOString().split('T')[0],
  balance_after: 1000,
  merchant_name: 'Test Merchant',
  location: 'London',
  currency: 'GBP',
  external_id: 'ext-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

describe('Financial Calculations', () => {
  describe('calculateTotalBalance', () => {
    it('should calculate total balance from multiple accounts', () => {
      const accounts = [
        createMockAccount(1000),
        createMockAccount(2500),
        createMockAccount(-500),
      ];
      
      expect(calculateTotalBalance(accounts)).toBe(3000);
    });

    it('should return 0 for empty accounts array', () => {
      expect(calculateTotalBalance([])).toBe(0);
    });

    it('should handle negative balances correctly', () => {
      const accounts = [
        createMockAccount(-100),
        createMockAccount(-200),
      ];
      
      expect(calculateTotalBalance(accounts)).toBe(-300);
    });

    it('should handle decimal balances', () => {
      const accounts = [
        createMockAccount(123.45),
        createMockAccount(876.55),
      ];
      
      expect(calculateTotalBalance(accounts)).toBe(1000);
    });
  });

  describe('calculateMonthlyIncome', () => {
    const currentDate = new Date('2024-01-15');
    
    it('should calculate income for current month', () => {
      const transactions = [
        createMockTransaction(1000, new Date('2024-01-10'), 'income'),
        createMockTransaction(2000, new Date('2024-01-20'), 'income'),
        createMockTransaction(500, new Date('2024-01-05'), 'expense'), // Should be ignored
        createMockTransaction(1500, new Date('2023-12-15'), 'income'), // Different month
      ];
      
      expect(calculateMonthlyIncome(transactions, currentDate)).toBe(3000);
    });

    it('should return 0 when no income transactions exist', () => {
      const transactions = [
        createMockTransaction(500, new Date('2024-01-10'), 'expense'),
      ];
      
      expect(calculateMonthlyIncome(transactions, currentDate)).toBe(0);
    });

    it('should use current month when no date provided', () => {
      const now = new Date();
      const transactions = [
        createMockTransaction(1000, now, 'income'),
      ];
      
      expect(calculateMonthlyIncome(transactions)).toBe(1000);
    });

    it('should handle empty transactions array', () => {
      expect(calculateMonthlyIncome([], currentDate)).toBe(0);
    });
  });

  describe('calculateMonthlyExpenses', () => {
    const currentDate = new Date('2024-01-15');
    
    it('should calculate expenses for current month', () => {
      const transactions = [
        createMockTransaction(300, new Date('2024-01-10'), 'expense'),
        createMockTransaction(700, new Date('2024-01-20'), 'expense'),
        createMockTransaction(1000, new Date('2024-01-05'), 'income'), // Should be ignored
        createMockTransaction(400, new Date('2023-12-15'), 'expense'), // Different month
      ];
      
      expect(calculateMonthlyExpenses(transactions, currentDate)).toBe(1000);
    });

    it('should return 0 when no expense transactions exist', () => {
      const transactions = [
        createMockTransaction(1000, new Date('2024-01-10'), 'income'),
      ];
      
      expect(calculateMonthlyExpenses(transactions, currentDate)).toBe(0);
    });
  });

  describe('calculateAverageMonthlyExpenses', () => {
    it('should calculate average over specified months', () => {
      const baseDate = new Date('2024-01-01');
      const transactions = [
        // Month 1: 1000
        createMockTransaction(600, new Date('2024-01-10'), 'expense'),
        createMockTransaction(400, new Date('2024-01-20'), 'expense'),
        // Month 2: 2000  
        createMockTransaction(1200, new Date('2023-12-10'), 'expense'),
        createMockTransaction(800, new Date('2023-12-20'), 'expense'),
        // Month 3: 1500
        createMockTransaction(1500, new Date('2023-11-15'), 'expense'),
      ];
      
      // Average of 3 months: (1000 + 2000 + 1500) / 3 = 1500
      expect(calculateAverageMonthlyExpenses(transactions, 3)).toBe(1500);
    });

    it('should handle insufficient data gracefully', () => {
      const transactions = [
        createMockTransaction(1000, new Date('2024-01-10'), 'expense'),
      ];
      
      // Should still calculate average even with less data than requested months
      expect(calculateAverageMonthlyExpenses(transactions, 6)).toBeGreaterThan(0);
    });

    it('should return 0 for empty transactions', () => {
      expect(calculateAverageMonthlyExpenses([], 3)).toBe(0);
    });
  });

  describe('calculateBurnRate', () => {
    it('should calculate burn rate over specified months', () => {
      const transactions = [
        // Create transactions that result in consistent burn rate
        createMockTransaction(1000, new Date('2024-01-15'), 'expense'),
        createMockTransaction(1000, new Date('2023-12-15'), 'expense'),
        createMockTransaction(1000, new Date('2023-11-15'), 'expense'),
      ];
      
      const burnRate = calculateBurnRate(transactions, 3);
      expect(burnRate).toBeCloseTo(1000, 0); // Approximately 1000 per month
    });

    it('should return 0 for no expenses', () => {
      const transactions = [
        createMockTransaction(2000, new Date('2024-01-15'), 'income'),
      ];
      
      expect(calculateBurnRate(transactions, 3)).toBe(0);
    });
  });

  describe('calculateLinearTrend', () => {
    it('should calculate positive trend for increasing values', () => {
      const values = [100, 200, 300, 400, 500];
      const trend = calculateLinearTrend(values);
      expect(trend).toBeGreaterThan(0);
    });

    it('should calculate negative trend for decreasing values', () => {
      const values = [500, 400, 300, 200, 100];
      const trend = calculateLinearTrend(values);
      expect(trend).toBeLessThan(0);
    });

    it('should return 0 for flat values', () => {
      const values = [100, 100, 100, 100, 100];
      const trend = calculateLinearTrend(values);
      expect(Math.abs(trend)).toBeLessThan(0.001); // Very close to 0
    });

    it('should handle single value', () => {
      const values = [100];
      const trend = calculateLinearTrend(values);
      expect(trend).toBe(0);
    });

    it('should handle empty array', () => {
      const values: number[] = [];
      const trend = calculateLinearTrend(values);
      expect(trend).toBe(0);
    });
  });

  describe('calculateFinancialRunway', () => {
    it('should calculate months of runway with positive burn rate', () => {
      const runway = calculateFinancialRunway(12000, 1000);
      expect(runway).toBe(12); // 12 months
    });

    it('should return Infinity for zero burn rate', () => {
      const runway = calculateFinancialRunway(5000, 0);
      expect(runway).toBe(Infinity);
    });

    it('should return 0 for negative balance', () => {
      const runway = calculateFinancialRunway(-1000, 500);
      expect(runway).toBe(0);
    });

    it('should handle decimal precision', () => {
      const runway = calculateFinancialRunway(2500, 333.33);
      expect(runway).toBeCloseTo(7.5, 1);
    });
  });

  describe('projectFutureBalance', () => {
    it('should project positive growth', () => {
      const projection = projectFutureBalance(10000, 3000, 2000, 6);
      // Net income: 1000/month for 6 months = 6000 growth
      expect(projection).toBe(16000);
    });

    it('should project negative growth', () => {
      const projection = projectFutureBalance(10000, 1000, 2000, 6);
      // Net loss: 1000/month for 6 months = 6000 decline
      expect(projection).toBe(4000);
    });

    it('should handle zero months', () => {
      const projection = projectFutureBalance(10000, 3000, 2000, 0);
      expect(projection).toBe(10000);
    });

    it('should handle negative months gracefully', () => {
      const projection = projectFutureBalance(10000, 3000, 2000, -6);
      expect(projection).toBe(10000); // Should not change for negative months
    });
  });

  describe('calculateSpendingByCategory', () => {
    it('should group spending by category with percentages', () => {
      const transactions = [
        createMockTransaction(300, new Date('2024-01-10'), 'expense', 'food'),
        createMockTransaction(200, new Date('2024-01-15'), 'expense', 'food'),
        createMockTransaction(400, new Date('2024-01-20'), 'expense', 'transport'),
        createMockTransaction(100, new Date('2024-01-25'), 'expense', 'entertainment'),
      ];
      
      const result = calculateSpendingByCategory(transactions);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        category: 'food',
        amount: 500,
        percentage: 50,
        color: expect.any(String),
      });
      expect(result[1]).toEqual({
        category: 'transport', 
        amount: 400,
        percentage: 40,
        color: expect.any(String),
      });
    });

    it('should filter by month when provided', () => {
      const transactions = [
        createMockTransaction(300, new Date('2024-01-10'), 'expense', 'food'),
        createMockTransaction(200, new Date('2023-12-15'), 'expense', 'food'), // Different month
      ];
      
      const result = calculateSpendingByCategory(transactions, new Date('2024-01-15'));
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(300);
    });

    it('should return empty array for no expenses', () => {
      const transactions = [
        createMockTransaction(1000, new Date('2024-01-10'), 'income', 'salary'),
      ];
      
      const result = calculateSpendingByCategory(transactions);
      expect(result).toHaveLength(0);
    });
  });

  describe('detectSpendingAnomalies', () => {
    it('should detect unusually high transactions', () => {
      const transactions = [
        // Normal spending pattern
        createMockTransaction(50, new Date('2024-01-01'), 'expense'),
        createMockTransaction(60, new Date('2024-01-02'), 'expense'),
        createMockTransaction(45, new Date('2024-01-03'), 'expense'),
        createMockTransaction(55, new Date('2024-01-04'), 'expense'),
        // Anomaly
        createMockTransaction(500, new Date('2024-01-05'), 'expense'),
      ];
      
      const anomalies = detectSpendingAnomalies(transactions, 2);
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].amount).toBe(500);
    });

    it('should return empty array when no anomalies exist', () => {
      const transactions = [
        createMockTransaction(50, new Date('2024-01-01'), 'expense'),
        createMockTransaction(60, new Date('2024-01-02'), 'expense'),
        createMockTransaction(45, new Date('2024-01-03'), 'expense'),
      ];
      
      const anomalies = detectSpendingAnomalies(transactions, 2);
      expect(anomalies).toHaveLength(0);
    });

    it('should handle single transaction', () => {
      const transactions = [
        createMockTransaction(100, new Date('2024-01-01'), 'expense'),
      ];
      
      const anomalies = detectSpendingAnomalies(transactions, 2);
      expect(anomalies).toHaveLength(0); // Cannot detect anomaly with single data point
    });

    it('should ignore income transactions', () => {
      const transactions = [
        createMockTransaction(50, new Date('2024-01-01'), 'expense'),
        createMockTransaction(10000, new Date('2024-01-02'), 'income'), // Large income should not be anomaly
      ];
      
      const anomalies = detectSpendingAnomalies(transactions, 2);
      expect(anomalies).toHaveLength(0);
    });
  });
});