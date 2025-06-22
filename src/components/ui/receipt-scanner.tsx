'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CameraIcon,
  DocumentIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ReceiptPercentIcon
} from '@heroicons/react/24/outline';
import { 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { receiptOCRService, ReceiptProcessingResult } from '@/services/receipt-ocr-service';
import { Receipt } from '@/types';

interface ReceiptScannerProps {
  userId: string;
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

export function ReceiptScanner({ userId }: ReceiptScannerProps) {
  const [selectedTab, setSelectedTab] = useState<'scan' | 'history' | 'analytics'>('scan');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ReceiptProcessingResult | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    merchantName: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    category: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const receipts = receiptOCRService.getReceiptHistory(userId);
  const analytics = receiptOCRService.getReceiptAnalytics(userId);

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setProcessingResult(null);

    try {
      const result = await receiptOCRService.processReceiptImage(file, userId);
      setProcessingResult(result);
    } catch (error) {
      setProcessingResult({
        success: false,
        error: `Processing failed: ${error}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const performSearch = async () => {
    // In production, this would call the search API
    const results = await receiptOCRService.searchReceipts(userId, {
      merchantName: searchFilters.merchantName || undefined,
      dateFrom: searchFilters.dateFrom || undefined,
      dateTo: searchFilters.dateTo || undefined,
      amountMin: searchFilters.amountMin ? parseFloat(searchFilters.amountMin) : undefined,
      amountMax: searchFilters.amountMax ? parseFloat(searchFilters.amountMax) : undefined,
      category: searchFilters.category || undefined
    });
    
    console.log('Search results:', results);
  };

  const formatCurrency = (amount: number) => {
    return receiptOCRService.formatCurrency(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Receipt Scanner</h2>
        <div className="text-sm text-gray-500">OCR-powered receipt management</div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{analytics.totalReceipts}</div>
            <div className="text-sm text-gray-500">Processed receipts</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(analytics.totalAmount)}</div>
            <div className="text-sm text-gray-500">From receipts</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">OCR Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{(analytics.averageConfidence * 100).toFixed(1)}%</div>
            <div className="text-sm text-gray-500">Average confidence</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {analytics.monthlyTrend[analytics.monthlyTrend.length - 1]?.count || 0}
            </div>
            <div className="text-sm text-gray-500">New receipts</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'scan', name: 'Scan Receipt', icon: CameraIcon },
            { id: 'history', name: 'Receipt History', icon: DocumentIcon },
            { id: 'analytics', name: 'Analytics', icon: ChartBarIcon }
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

      {/* Scan Tab */}
      {selectedTab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CameraIcon className="h-5 w-5 text-blue-600" />
                Upload Receipt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={isProcessing}
                />
                
                {isProcessing ? (
                  <div className="space-y-3">
                    <CloudArrowUpIcon className="h-12 w-12 text-blue-500 mx-auto animate-pulse" />
                    <div className="text-lg font-medium text-gray-900">Processing Receipt...</div>
                    <div className="text-sm text-gray-500">Extracting data using OCR</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <CameraIcon className="h-12 w-12 text-gray-400 mx-auto" />
                    <div className="text-lg font-medium text-gray-900">
                      Drop receipt image here or click to upload
                    </div>
                    <div className="text-sm text-gray-500">
                      Supports JPEG, PNG, WebP • Max size 10MB
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Choose File
                    </button>
                  </div>
                )}
              </div>

              {/* Processing Result */}
              {processingResult && (
                <div className="mt-6">
                  {processingResult.success ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span className="font-medium">Receipt processed successfully!</span>
                      </div>
                      
                      {processingResult.receipt && (
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Merchant:</span>
                              <div className="font-medium">{processingResult.receipt.merchant_name || 'Not detected'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Amount:</span>
                              <div className="font-medium">
                                {processingResult.receipt.total_amount 
                                  ? formatCurrency(processingResult.receipt.total_amount)
                                  : 'Not detected'
                                }
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">Date:</span>
                              <div className="font-medium">{processingResult.receipt.date || 'Not detected'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Confidence:</span>
                              <div className="font-medium">
                                {(processingResult.receipt.confidence_score * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          
                          {processingResult.receipt.items.length > 0 && (
                            <div className="mt-4">
                              <div className="text-sm text-gray-600 mb-2">Items detected:</div>
                              <div className="space-y-1">
                                {processingResult.receipt.items.map((item, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span>{item.name} x{item.quantity}</span>
                                    <span>{formatCurrency(item.price)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {processingResult.suggestions && processingResult.suggestions.length > 0 && (
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <div className="flex items-start gap-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
                            <div>
                              <div className="font-medium text-yellow-800 mb-2">Suggestions:</div>
                              <ul className="text-sm text-yellow-700 space-y-1">
                                {processingResult.suggestions.map((suggestion, index) => (
                                  <li key={index}>• {suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-red-600">
                        <ExclamationTriangleIcon className="h-5 w-5" />
                        <span className="font-medium">Processing failed</span>
                      </div>
                      <div className="text-sm text-red-700 mt-2">{processingResult.error}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Receipts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {receipts.slice(0, 5).map(receipt => (
                  <div 
                    key={receipt.id} 
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => setSelectedReceipt(receipt)}
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {receipt.merchant_name || 'Unknown Merchant'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {receipt.date} • {(receipt.confidence_score * 100).toFixed(0)}% confidence
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {receipt.total_amount ? formatCurrency(receipt.total_amount) : 'N/A'}
                      </div>
                      <div className={`text-xs ${receipt.manual_review ? 'text-orange-600' : 'text-green-600'}`}>
                        {receipt.manual_review ? 'Needs review' : 'Processed'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Tab */}
      {selectedTab === 'history' && (
        <div className="space-y-6">
          {/* Search Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MagnifyingGlassIcon className="h-5 w-5 text-blue-600" />
                Search Receipts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Merchant name"
                  value={searchFilters.merchantName}
                  onChange={(e) => setSearchFilters({...searchFilters, merchantName: e.target.value})}
                  className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  placeholder="From date"
                  value={searchFilters.dateFrom}
                  onChange={(e) => setSearchFilters({...searchFilters, dateFrom: e.target.value})}
                  className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  placeholder="To date"
                  value={searchFilters.dateTo}
                  onChange={(e) => setSearchFilters({...searchFilters, dateTo: e.target.value})}
                  className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Min amount"
                  value={searchFilters.amountMin}
                  onChange={(e) => setSearchFilters({...searchFilters, amountMin: e.target.value})}
                  className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max amount"
                  value={searchFilters.amountMax}
                  onChange={(e) => setSearchFilters({...searchFilters, amountMax: e.target.value})}
                  className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={performSearch}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Receipt List */}
          <Card>
            <CardHeader>
              <CardTitle>All Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {receipts.map(receipt => (
                  <div 
                    key={receipt.id} 
                    className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedReceipt(receipt)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <ReceiptPercentIcon className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {receipt.merchant_name || 'Unknown Merchant'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {receipt.date} • {receipt.items.length} items
                        </div>
                        <div className="text-xs text-gray-400">
                          Confidence: {(receipt.confidence_score * 100).toFixed(0)}%
                          {receipt.transaction_id && ' • Linked to transaction'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {receipt.total_amount ? formatCurrency(receipt.total_amount) : 'N/A'}
                      </div>
                      <div className={`text-sm ${receipt.manual_review ? 'text-orange-600' : 'text-green-600'}`}>
                        {receipt.manual_review ? 'Needs review' : 'Processed'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tab */}
      {selectedTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Merchants */}
          <Card>
            <CardHeader>
              <CardTitle>Top Merchants</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.topMerchants}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, total }) => `${name}: ${formatCurrency(total)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {analytics.topMerchants.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Receipt Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{analytics.totalReceipts}</div>
                  <div className="text-sm text-gray-500">Total Receipts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(analytics.totalAmount)}</div>
                  <div className="text-sm text-gray-500">Total Amount</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{(analytics.averageConfidence * 100).toFixed(1)}%</div>
                  <div className="text-sm text-gray-500">Avg Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(analytics.totalAmount / analytics.totalReceipts)}
                  </div>
                  <div className="text-sm text-gray-500">Avg Amount</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Receipt Detail Modal (simplified) */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Receipt Details</h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Merchant</label>
                  <div className="font-medium">{selectedReceipt.merchant_name || 'Unknown'}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Amount</label>
                  <div className="font-medium">
                    {selectedReceipt.total_amount ? formatCurrency(selectedReceipt.total_amount) : 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Date</label>
                  <div className="font-medium">{selectedReceipt.date || 'Unknown'}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Confidence</label>
                  <div className="font-medium">{(selectedReceipt.confidence_score * 100).toFixed(1)}%</div>
                </div>
              </div>
              
              {selectedReceipt.items.length > 0 && (
                <div>
                  <label className="text-sm text-gray-600">Items</label>
                  <div className="mt-2 space-y-1">
                    {selectedReceipt.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.name} x{item.quantity}</span>
                        <span>{formatCurrency(item.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}