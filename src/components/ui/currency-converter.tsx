'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowsRightLeftIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { 
  LineChart, 
  Line, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { currencyService, MultiCurrencyAccount, CurrencyConversion } from '@/services/currency-service';

interface CurrencyConverterProps {
  userId: string;
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

export function CurrencyConverter({ userId }: CurrencyConverterProps) {
  const [selectedTab, setSelectedTab] = useState<'converter' | 'accounts' | 'exposure'>('converter');
  
  // Converter state
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('GBP');
  const [amount, setAmount] = useState<number>(1000);
  const [conversion, setConversion] = useState<CurrencyConversion | null>(null);
  const [historicalRates, setHistoricalRates] = useState<Array<{ date: string; rate: number }>>([]);
  
  // Multi-currency accounts state
  const [multiCurrencyAccounts, setMultiCurrencyAccounts] = useState<MultiCurrencyAccount[]>([]);
  const [currencyExposure, setCurrencyExposure] = useState<Array<{ currency: string; totalAmount: number; percentage: number }>>([]);
  const [currencyAlerts, setCurrencyAlerts] = useState<Array<{ type: string; message: string; currency: string; severity: 'low' | 'medium' | 'high' }>>([]);

  const supportedCurrencies = currencyService.getSupportedCurrencies();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (amount > 0) {
      convertCurrency();
    }
  }, [fromCurrency, toCurrency, amount]);

  useEffect(() => {
    loadHistoricalRates();
  }, [fromCurrency, toCurrency]);

  const loadData = async () => {
    // Load multi-currency accounts
    const accounts = currencyService.generateMockMultiCurrencyData(userId);
    setMultiCurrencyAccounts(accounts);

    // Calculate currency exposure
    const exposure = currencyService.calculateCurrencyExposure(accounts);
    setCurrencyExposure(exposure);

    // Generate currency alerts
    const alerts = currencyService.generateCurrencyAlerts(accounts);
    setCurrencyAlerts(alerts);
  };

  const convertCurrency = async () => {
    try {
      const result = await currencyService.convertCurrency(amount, fromCurrency, toCurrency);
      setConversion(result);
    } catch (error) {
      console.error('Currency conversion failed:', error);
    }
  };

  const loadHistoricalRates = async () => {
    try {
      const rates = await currencyService.getHistoricalRates(fromCurrency, toCurrency, 30);
      setHistoricalRates(rates);
    } catch (error) {
      console.error('Failed to load historical rates:', error);
    }
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return currencyService.formatCurrency(amount, currency);
  };

  const getTotalPortfolioValue = () => {
    return multiCurrencyAccounts.reduce((total, account) => total + account.totalInBaseCurrency, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Currency Converter</h2>
        <div className="text-sm text-gray-500">Multi-currency account management</div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(getTotalPortfolioValue(), 'GBP')}</div>
            <div className="text-sm text-gray-500">Across all currencies</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Currency Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{multiCurrencyAccounts.length}</div>
            <div className="text-sm text-gray-500">Multi-currency accounts</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Currencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {new Set(multiCurrencyAccounts.flatMap(acc => acc.balances.map(b => b.currency))).size}
            </div>
            <div className="text-sm text-gray-500">Different currencies</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Currency Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{currencyAlerts.length}</div>
            <div className="text-sm text-gray-500">Risk notifications</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'converter', name: 'Currency Converter', icon: ArrowsRightLeftIcon },
            { id: 'accounts', name: 'Multi-Currency Accounts', icon: GlobeAltIcon },
            { id: 'exposure', name: 'Currency Exposure', icon: ChartBarIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Converter Tab */}
      {selectedTab === 'converter' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Currency Converter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />
                Currency Converter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-lg"
                  placeholder="1000"
                />
              </div>

              <div className="grid grid-cols-5 gap-2 items-end">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    {supportedCurrencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={swapCurrencies}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <ArrowsRightLeftIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    {supportedCurrencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {conversion && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-900">
                      {formatCurrency(conversion.toAmount, conversion.toCurrency)}
                    </div>
                    <div className="text-sm text-blue-700 mt-2">
                      Exchange rate: 1 {conversion.fromCurrency} = {conversion.rate.toFixed(4)} {conversion.toCurrency}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Last updated: {new Date(conversion.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historical Rates Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Exchange Rate History (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historicalRates}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis tickFormatter={(value) => value.toFixed(4)} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: any) => [value.toFixed(4), `${fromCurrency}/${toCurrency}`]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Currency Reference */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Popular Currency Pairs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['USD', 'EUR', 'CAD', 'AUD', 'JPY', 'CHF'].map(currency => {
                  const rate = currencyService.formatCurrency(1 / (currencyService['mockRates'][currency] || 1), currency);
                  return (
                    <div key={currency} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">1 GBP =</span>
                      <span className="text-blue-600 font-bold">{rate}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Multi-Currency Accounts Tab */}
      {selectedTab === 'accounts' && (
        <div className="space-y-6">
          {multiCurrencyAccounts.map((account, index) => (
            <Card key={account.accountId}>
              <CardHeader>
                <CardTitle>Multi-Currency Account {index + 1}</CardTitle>
                <div className="text-sm text-gray-600">
                  Total: {formatCurrency(account.totalInBaseCurrency, account.baseCurrency)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {account.balances.map(balance => (
                    <div key={balance.currency} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700">{balance.currency}</span>
                        <span className="text-xs text-gray-500">
                          Rate: {balance.exchangeRate.toFixed(4)}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(balance.balance, balance.currency)}
                      </div>
                      <div className="text-sm text-gray-600">
                        ≈ {formatCurrency(balance.balanceInBaseCurrency, account.baseCurrency)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Currency Exposure Tab */}
      {selectedTab === 'exposure' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Currency Exposure Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Currency Exposure Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={currencyExposure}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ currency, percentage }) => `${currency}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="percentage"
                  >
                    {currencyExposure.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Currency Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
                Currency Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currencyAlerts.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No currency risk alerts at this time
                  </div>
                ) : (
                  currencyAlerts.map((alert, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-l-4 ${
                        alert.severity === 'high' 
                          ? 'bg-red-50 border-red-400' 
                          : alert.severity === 'medium'
                          ? 'bg-yellow-50 border-yellow-400'
                          : 'bg-blue-50 border-blue-400'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <ExclamationTriangleIcon 
                          className={`h-4 w-4 mt-0.5 ${
                            alert.severity === 'high' 
                              ? 'text-red-500' 
                              : alert.severity === 'medium'
                              ? 'text-yellow-500'
                              : 'text-blue-500'
                          }`} 
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {alert.type.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-gray-700">{alert.message}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Currency Breakdown Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Detailed Currency Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-medium text-gray-700">Currency</th>
                      <th className="text-right py-2 font-medium text-gray-700">Amount</th>
                      <th className="text-right py-2 font-medium text-gray-700">GBP Equivalent</th>
                      <th className="text-right py-2 font-medium text-gray-700">Percentage</th>
                      <th className="text-right py-2 font-medium text-gray-700">Exchange Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currencyExposure.map((exposure, index) => {
                      const totalAmount = multiCurrencyAccounts
                        .flatMap(acc => acc.balances)
                        .filter(bal => bal.currency === exposure.currency)
                        .reduce((sum, bal) => sum + bal.balanceInBaseCurrency, 0);
                      
                      const rate = multiCurrencyAccounts
                        .flatMap(acc => acc.balances)
                        .find(bal => bal.currency === exposure.currency)?.exchangeRate || 1;

                      return (
                        <tr key={exposure.currency} className="border-b border-gray-100">
                          <td className="py-2 font-medium">{exposure.currency}</td>
                          <td className="py-2 text-right">{formatCurrency(exposure.totalAmount, exposure.currency)}</td>
                          <td className="py-2 text-right">{formatCurrency(totalAmount, 'GBP')}</td>
                          <td className="py-2 text-right">{exposure.percentage.toFixed(1)}%</td>
                          <td className="py-2 text-right">{rate.toFixed(4)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}