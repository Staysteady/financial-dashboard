import * as Sentry from "@sentry/nextjs";

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start timing an operation
  startTiming(operationName: string): string {
    const timerId = `${operationName}_${Date.now()}_${Math.random()}`;
    this.metrics.set(timerId, performance.now());
    return timerId;
  }

  // End timing and report to Sentry
  endTiming(timerId: string, operationName: string, metadata?: Record<string, any>): number {
    const startTime = this.metrics.get(timerId);
    if (!startTime) {
      console.warn(`Timer ${timerId} not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.metrics.delete(timerId);

    // Report to Sentry
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${operationName} completed in ${duration.toFixed(2)}ms`,
      level: 'info',
      data: {
        duration,
        operation: operationName,
        ...metadata,
      },
    });

    // Log slow operations
    if (duration > 1000) { // More than 1 second
      Sentry.captureMessage(`Slow operation detected: ${operationName}`, {
        level: 'warning',
        tags: {
          'performance.slow': true,
          'operation': operationName,
        },
        extra: {
          duration,
          ...metadata,
        },
      });
    }

    return duration;
  }

  // Monitor database query performance
  async monitorDatabaseQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const timerId = this.startTiming(`db_query_${queryName}`);
    
    try {
      const result = await queryFn();
      this.endTiming(timerId, `Database Query: ${queryName}`, {
        ...metadata,
        success: true,
      });
      return result;
    } catch (error) {
      this.endTiming(timerId, `Database Query: ${queryName}`, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Report database errors to Sentry
      Sentry.captureException(error, {
        tags: {
          'database.query': queryName,
          'database.error': true,
        },
        extra: metadata,
      });
      
      throw error;
    }
  }

  // Monitor API response times
  async monitorApiCall<T>(
    endpoint: string,
    apiFn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const timerId = this.startTiming(`api_call_${endpoint}`);
    
    try {
      const result = await apiFn();
      this.endTiming(timerId, `API Call: ${endpoint}`, {
        ...metadata,
        success: true,
      });
      return result;
    } catch (error) {
      this.endTiming(timerId, `API Call: ${endpoint}`, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Report API errors to Sentry
      Sentry.captureException(error, {
        tags: {
          'api.endpoint': endpoint,
          'api.error': true,
        },
        extra: metadata,
      });
      
      throw error;
    }
  }

  // Monitor banking API calls (with extra security)
  async monitorBankingApiCall<T>(
    bankName: string,
    operation: string,
    apiFn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const timerId = this.startTiming(`banking_api_${bankName}_${operation}`);
    
    // Filter sensitive data from metadata
    const safeMetadata = this.filterSensitiveData(metadata || {});
    
    try {
      const result = await apiFn();
      this.endTiming(timerId, `Banking API: ${bankName} - ${operation}`, {
        ...safeMetadata,
        success: true,
      });
      return result;
    } catch (error) {
      this.endTiming(timerId, `Banking API: ${bankName} - ${operation}`, {
        ...safeMetadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Report banking API errors with extra care for sensitive data
      Sentry.captureException(error, {
        tags: {
          'banking.api': bankName,
          'banking.operation': operation,
          'banking.error': true,
        },
        extra: safeMetadata,
      });
      
      throw error;
    }
  }

  // Filter sensitive data from monitoring metadata
  private filterSensitiveData(data: Record<string, any>): Record<string, any> {
    const sensitiveKeys = [
      'password', 'token', 'api_key', 'secret', 'credential',
      'account_number', 'sort_code', 'card_number', 'cvv',
      'ssn', 'nin', 'passport', 'license'
    ];

    const filtered: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitiveKey => 
        lowerKey.includes(sensitiveKey)
      );
      
      if (isSensitive) {
        filtered[key] = '[FILTERED]';
      } else if (typeof value === 'object' && value !== null) {
        filtered[key] = this.filterSensitiveData(value);
      } else {
        filtered[key] = value;
      }
    }
    
    return filtered;
  }

  // Get performance metrics summary
  getMetricsSummary(): Record<string, any> {
    return {
      activeTimers: this.metrics.size,
      timestamp: new Date().toISOString(),
    };
  }

  // Clear all metrics (useful for testing)
  clearMetrics(): void {
    this.metrics.clear();
  }
}

// Web Vitals monitoring
export const reportWebVitals = (metric: any) => {
  // Report Web Vitals to Sentry
  Sentry.addBreadcrumb({
    category: 'web-vital',
    message: `${metric.name}: ${metric.value}`,
    level: 'info',
    data: {
      name: metric.name,
      value: metric.value,
      id: metric.id,
      delta: metric.delta,
    },
  });

  // Report poor performance metrics as issues
  const thresholds = {
    FCP: 2500,  // First Contentful Paint
    LCP: 4000,  // Largest Contentful Paint
    FID: 300,   // First Input Delay
    CLS: 0.25,  // Cumulative Layout Shift
    TTFB: 1800, // Time to First Byte
  };

  const threshold = thresholds[metric.name as keyof typeof thresholds];
  if (threshold && metric.value > threshold) {
    Sentry.captureMessage(`Poor ${metric.name} performance`, {
      level: 'warning',
      tags: {
        'performance.web_vital': metric.name,
        'performance.poor': true,
      },
      extra: {
        value: metric.value,
        threshold,
        delta: metric.delta,
        id: metric.id,
      },
    });
  }
};

// Financial operation monitoring
export const monitorFinancialOperation = async <T>(
  operationType: 'transaction_import' | 'balance_sync' | 'categorization' | 'projection_calculation',
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  const monitor = PerformanceMonitor.getInstance();
  
  return Sentry.withScope(async (scope) => {
    scope.setTag('financial.operation', operationType);
    scope.setContext('financial_metadata', monitor.filterSensitiveData(metadata || {}));
    
    const timerId = monitor.startTiming(`financial_${operationType}`);
    
    try {
      const result = await operation();
      
      monitor.endTiming(timerId, `Financial Operation: ${operationType}`, {
        ...metadata,
        success: true,
      });
      
      // Add success breadcrumb
      Sentry.addBreadcrumb({
        category: 'financial',
        message: `${operationType} completed successfully`,
        level: 'info',
        data: {
          operation: operationType,
          success: true,
        },
      });
      
      return result;
    } catch (error) {
      monitor.endTiming(timerId, `Financial Operation: ${operationType}`, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Capture financial operation errors
      Sentry.captureException(error, {
        tags: {
          'financial.operation': operationType,
          'financial.error': true,
        },
        extra: monitor.filterSensitiveData(metadata || {}),
      });
      
      throw error;
    }
  });
};

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();