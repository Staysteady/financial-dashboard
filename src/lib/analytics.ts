import { track } from '@vercel/analytics';

// Privacy-safe analytics for financial dashboard
export class FinancialAnalytics {
  private static instance: FinancialAnalytics;
  
  static getInstance(): FinancialAnalytics {
    if (!FinancialAnalytics.instance) {
      FinancialAnalytics.instance = new FinancialAnalytics();
    }
    return FinancialAnalytics.instance;
  }

  // Track user interactions (no sensitive financial data)
  trackUserAction(action: string, properties?: Record<string, any>) {
    // Filter out any sensitive data before tracking
    const safeProperties = this.sanitizeProperties(properties || {});
    
    track(action, {
      ...safeProperties,
      timestamp: new Date().toISOString(),
    });
  }

  // Track dashboard usage patterns
  trackDashboardView(section: string, metadata?: Record<string, any>) {
    this.trackUserAction('dashboard_view', {
      section,
      ...this.sanitizeProperties(metadata || {}),
    });
  }

  // Track financial operations (aggregated, no personal data)
  trackFinancialOperation(
    operation: 'import' | 'categorization' | 'projection' | 'export' | 'goal_creation',
    metadata?: Record<string, any>
  ) {
    const safeMetadata = this.sanitizeProperties(metadata || {});
    
    this.trackUserAction('financial_operation', {
      operation,
      ...safeMetadata,
    });
  }

  // Track bank connection attempts (no credentials)
  trackBankConnection(
    action: 'attempt' | 'success' | 'failure',
    bankType?: string,
    errorType?: string
  ) {
    this.trackUserAction('bank_connection', {
      action,
      bank_type: bankType || 'unknown',
      error_type: errorType,
    });
  }

  // Track user engagement metrics
  trackEngagement(
    metric: 'session_duration' | 'page_views' | 'feature_usage',
    value: number,
    context?: string
  ) {
    this.trackUserAction('user_engagement', {
      metric,
      value,
      context,
    });
  }

  // Track error occurrences (sanitized)
  trackError(
    errorType: 'api_error' | 'validation_error' | 'connection_error' | 'ui_error',
    errorCode?: string,
    context?: string
  ) {
    this.trackUserAction('error_occurred', {
      error_type: errorType,
      error_code: errorCode,
      context,
    });
  }

  // Track performance metrics
  trackPerformance(
    metric: 'page_load' | 'api_response' | 'data_processing',
    duration: number,
    context?: string
  ) {
    this.trackUserAction('performance_metric', {
      metric,
      duration_ms: Math.round(duration),
      context,
      // Categorize performance
      performance_tier: this.categorizePerformance(duration),
    });
  }

  // Track feature adoption
  trackFeatureUsage(
    feature: 'goals' | 'alerts' | 'export' | 'categorization' | 'projections' | 'portfolio',
    action: 'first_use' | 'regular_use' | 'advanced_use'
  ) {
    this.trackUserAction('feature_usage', {
      feature,
      usage_level: action,
    });
  }

  // Track user preferences (non-sensitive)
  trackPreferenceChange(
    preference: 'theme' | 'currency' | 'notifications' | 'dashboard_layout',
    value: string
  ) {
    this.trackUserAction('preference_change', {
      preference,
      new_value: value,
    });
  }

  // Private method to sanitize properties
  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sensitiveKeys = [
      // Financial data
      'balance', 'amount', 'account_number', 'sort_code', 'card_number',
      'transaction_id', 'account_id', 'user_id',
      // Authentication
      'password', 'token', 'api_key', 'secret', 'credential',
      // Personal information
      'email', 'name', 'address', 'phone', 'ssn', 'nin', 'passport',
      // Banking specifics
      'iban', 'swift', 'routing_number', 'bsb', 'cvv', 'pin'
    ];

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitiveKey => 
        lowerKey.includes(sensitiveKey)
      );

      if (isSensitive) {
        // Don't include sensitive data at all
        continue;
      }

      if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeProperties(value);
      } else if (typeof value === 'string' && this.containsSensitiveData(value)) {
        // Skip strings that might contain sensitive data
        continue;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // Check if a string might contain sensitive financial data
  private containsSensitiveData(str: string): boolean {
    // Patterns that might indicate sensitive data
    const sensitivePatterns = [
      /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/, // Credit card pattern
      /\d{2}[\s-]?\d{2}[\s-]?\d{2}/, // Sort code pattern
      /\d{8,12}/, // Account number pattern
      /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email pattern
      /^\+?[\d\s()-]{10,}$/, // Phone number pattern
    ];

    return sensitivePatterns.some(pattern => pattern.test(str));
  }

  // Categorize performance for better analytics
  private categorizePerformance(duration: number): string {
    if (duration < 100) return 'excellent';
    if (duration < 300) return 'good';
    if (duration < 1000) return 'acceptable';
    if (duration < 3000) return 'slow';
    return 'very_slow';
  }

  // Get analytics configuration status
  getAnalyticsStatus(): {
    enabled: boolean;
    environment: string;
    privacyMode: boolean;
  } {
    return {
      enabled: process.env.NODE_ENV === 'production',
      environment: process.env.NODE_ENV || 'development',
      privacyMode: true, // Always true for financial app
    };
  }
}

// Convenience functions for common tracking scenarios
export const analytics = FinancialAnalytics.getInstance();

// Export convenience methods
export const trackDashboardView = (section: string, metadata?: Record<string, any>) => {
  analytics.trackDashboardView(section, metadata);
};

export const trackFinancialOperation = (
  operation: 'import' | 'categorization' | 'projection' | 'export' | 'goal_creation',
  metadata?: Record<string, any>
) => {
  analytics.trackFinancialOperation(operation, metadata);
};

export const trackBankConnection = (
  action: 'attempt' | 'success' | 'failure',
  bankType?: string,
  errorType?: string
) => {
  analytics.trackBankConnection(action, bankType, errorType);
};

export const trackFeatureUsage = (
  feature: 'goals' | 'alerts' | 'export' | 'categorization' | 'projections' | 'portfolio',
  action: 'first_use' | 'regular_use' | 'advanced_use'
) => {
  analytics.trackFeatureUsage(feature, action);
};

export const trackError = (
  errorType: 'api_error' | 'validation_error' | 'connection_error' | 'ui_error',
  errorCode?: string,
  context?: string
) => {
  analytics.trackError(errorType, errorCode, context);
};

export const trackPerformance = (
  metric: 'page_load' | 'api_response' | 'data_processing',
  duration: number,
  context?: string
) => {
  analytics.trackPerformance(metric, duration, context);
};