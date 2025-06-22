import { createClient } from '@/lib/supabase/server';
import { analytics } from './analytics';
import * as Sentry from "@sentry/nextjs";

// Types for audit logging
interface AuditLogEntry {
  user_id?: string;
  table_name: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  row_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

interface FinancialAccessLog {
  user_id: string;
  access_type: 'account_view' | 'transaction_view' | 'balance_check' | 'data_export' | 'api_call';
  resource_type: 'account' | 'transaction' | 'balance' | 'report' | 'api_endpoint';
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  private static instance: AuditLogger;
  
  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  // Log database operations
  async logDatabaseOperation(entry: AuditLogEntry): Promise<void> {
    try {
      const supabase = createClient();
      
      // Sanitize sensitive data before logging
      const sanitizedEntry = {
        ...entry,
        old_values: this.sanitizeValues(entry.old_values),
        new_values: this.sanitizeValues(entry.new_values),
        metadata: this.sanitizeValues(entry.metadata),
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert(sanitizedEntry);

      if (error) {
        console.error('Failed to log audit entry:', error);
        // Report audit logging failures to Sentry
        Sentry.captureException(error, {
          tags: {
            'audit.failure': true,
            'audit.operation': entry.operation,
            'audit.table': entry.table_name,
          },
        });
      }
    } catch (error) {
      console.error('Audit logging error:', error);
      Sentry.captureException(error, {
        tags: {
          'audit.system_error': true,
        },
      });
    }
  }

  // Log financial data access
  async logFinancialAccess(logEntry: FinancialAccessLog): Promise<void> {
    try {
      const supabase = createClient();
      
      // Sanitize and prepare the log entry
      const sanitizedEntry = {
        user_id: logEntry.user_id,
        access_type: logEntry.access_type,
        resource_type: logEntry.resource_type,
        resource_id: logEntry.resource_id,
        ip_address: logEntry.ip_address,
        user_agent: this.sanitizeUserAgent(logEntry.user_agent),
        metadata: this.sanitizeValues(logEntry.metadata),
        created_at: new Date().toISOString(),
      };

      // Log to database
      const { error } = await supabase
        .from('financial_access_logs')
        .insert(sanitizedEntry);

      if (error) {
        console.error('Failed to log financial access:', error);
        Sentry.captureException(error, {
          tags: {
            'financial_audit.failure': true,
            'access_type': logEntry.access_type,
            'resource_type': logEntry.resource_type,
          },
        });
      }

      // Also track in analytics (anonymized)
      analytics.trackUserAction('financial_data_access', {
        access_type: logEntry.access_type,
        resource_type: logEntry.resource_type,
      });

    } catch (error) {
      console.error('Financial access logging error:', error);
      Sentry.captureException(error, {
        tags: {
          'financial_audit.system_error': true,
        },
      });
    }
  }

  // Log sensitive operations with high priority
  async logSensitiveOperation(
    user_id: string,
    operation: 'credential_update' | 'api_key_access' | 'export_sensitive' | 'admin_access',
    details: Record<string, any>,
    request_info?: { ip_address?: string; user_agent?: string }
  ): Promise<void> {
    try {
      const supabase = createClient();
      
      const logEntry = {
        user_id,
        operation_type: operation,
        details: this.sanitizeValues(details),
        ip_address: request_info?.ip_address,
        user_agent: this.sanitizeUserAgent(request_info?.user_agent),
        severity: 'HIGH',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('sensitive_operations_log')
        .insert(logEntry);

      if (error) {
        console.error('Failed to log sensitive operation:', error);
        // This is critical - also send to Sentry immediately
        Sentry.captureException(error, {
          level: 'error',
          tags: {
            'sensitive_audit.failure': true,
            'operation': operation,
            'user_id': user_id,
          },
        });
      }

      // Always send sensitive operations to Sentry for real-time monitoring
      Sentry.addBreadcrumb({
        category: 'sensitive_operation',
        message: `Sensitive operation: ${operation}`,
        level: 'warning',
        data: {
          operation,
          user_id,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Sensitive operation logging error:', error);
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          'sensitive_audit.critical_failure': true,
        },
      });
    }
  }

  // Log API access patterns for security monitoring
  async logApiAccess(
    endpoint: string,
    method: string,
    user_id?: string,
    status_code?: number,
    response_time?: number,
    ip_address?: string,
    user_agent?: string
  ): Promise<void> {
    try {
      const supabase = createClient();
      
      const logEntry = {
        endpoint,
        method,
        user_id,
        status_code,
        response_time_ms: response_time,
        ip_address,
        user_agent: this.sanitizeUserAgent(user_agent),
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('api_access_logs')
        .insert(logEntry);

      if (error) {
        console.error('Failed to log API access:', error);
      }

      // Track suspicious patterns
      this.detectSuspiciousActivity(endpoint, method, user_id, ip_address);

    } catch (error) {
      console.error('API access logging error:', error);
    }
  }

  // Create audit trail for financial transactions
  async createTransactionAuditTrail(
    transaction_id: string,
    user_id: string,
    action: 'created' | 'updated' | 'deleted' | 'categorized' | 'exported',
    old_data?: Record<string, any>,
    new_data?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      user_id,
      table_name: 'transactions',
      operation: this.mapActionToOperation(action),
      row_id: transaction_id,
      old_values: old_data,
      new_values: new_data,
      metadata: {
        action,
        ...metadata,
      },
    };

    await this.logDatabaseOperation(auditEntry);

    // Also log as financial access
    await this.logFinancialAccess({
      user_id,
      access_type: action === 'exported' ? 'data_export' : 'transaction_view',
      resource_type: 'transaction',
      resource_id: transaction_id,
      metadata: { action, ...metadata },
    });
  }

  // Generate audit reports
  async generateAuditReport(
    user_id: string,
    start_date: Date,
    end_date: Date,
    report_type: 'user_activity' | 'data_access' | 'sensitive_operations'
  ): Promise<any[]> {
    try {
      const supabase = createClient();
      
      let query;
      switch (report_type) {
        case 'user_activity':
          query = supabase
            .from('audit_logs')
            .select('*')
            .eq('user_id', user_id)
            .gte('created_at', start_date.toISOString())
            .lte('created_at', end_date.toISOString())
            .order('created_at', { ascending: false });
          break;
        case 'data_access':
          query = supabase
            .from('financial_access_logs')
            .select('*')
            .eq('user_id', user_id)
            .gte('created_at', start_date.toISOString())
            .lte('created_at', end_date.toISOString())
            .order('created_at', { ascending: false });
          break;
        case 'sensitive_operations':
          query = supabase
            .from('sensitive_operations_log')
            .select('*')
            .eq('user_id', user_id)
            .gte('created_at', start_date.toISOString())
            .lte('created_at', end_date.toISOString())
            .order('created_at', { ascending: false });
          break;
        default:
          throw new Error('Invalid report type');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Log the audit report generation
      await this.logSensitiveOperation(
        user_id,
        'admin_access',
        {
          action: 'audit_report_generated',
          report_type,
          start_date: start_date.toISOString(),
          end_date: end_date.toISOString(),
          record_count: data?.length || 0,
        }
      );

      return data || [];
    } catch (error) {
      console.error('Failed to generate audit report:', error);
      Sentry.captureException(error, {
        tags: {
          'audit.report_failure': true,
          'report_type': report_type,
        },
      });
      throw error;
    }
  }

  // Private helper methods
  private sanitizeValues(values?: Record<string, any>): Record<string, any> | undefined {
    if (!values) return undefined;

    const sensitiveKeys = [
      'password', 'token', 'api_key', 'secret', 'credential',
      'account_number', 'sort_code', 'card_number', 'cvv',
      'ssn', 'nin', 'passport', 'license', 'balance', 'amount'
    ];

    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(values)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitiveKey => 
        lowerKey.includes(sensitiveKey)
      );
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeValues(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  private sanitizeUserAgent(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    
    // Keep basic browser info but remove detailed version info for privacy
    return userAgent.replace(/\/[\d.]+/g, '/x.x.x');
  }

  private mapActionToOperation(action: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' {
    switch (action) {
      case 'created': return 'INSERT';
      case 'updated': 
      case 'categorized': return 'UPDATE';
      case 'deleted': return 'DELETE';
      default: return 'SELECT';
    }
  }

  private detectSuspiciousActivity(
    endpoint: string,
    method: string,
    user_id?: string,
    ip_address?: string
  ): void {
    // Basic suspicious activity detection
    // In production, this would be more sophisticated
    
    if (endpoint.includes('admin') || endpoint.includes('sensitive')) {
      Sentry.addBreadcrumb({
        category: 'security',
        message: `Admin/sensitive endpoint accessed: ${endpoint}`,
        level: 'warning',
        data: {
          endpoint,
          method,
          user_id,
          ip_address,
        },
      });
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Convenience functions
export const logFinancialAccess = async (logEntry: FinancialAccessLog) => {
  await auditLogger.logFinancialAccess(logEntry);
};

export const logSensitiveOperation = async (
  user_id: string,
  operation: 'credential_update' | 'api_key_access' | 'export_sensitive' | 'admin_access',
  details: Record<string, any>,
  request_info?: { ip_address?: string; user_agent?: string }
) => {
  await auditLogger.logSensitiveOperation(user_id, operation, details, request_info);
};

export const createTransactionAuditTrail = async (
  transaction_id: string,
  user_id: string,
  action: 'created' | 'updated' | 'deleted' | 'categorized' | 'exported',
  old_data?: Record<string, any>,
  new_data?: Record<string, any>,
  metadata?: Record<string, any>
) => {
  await auditLogger.createTransactionAuditTrail(
    transaction_id,
    user_id,
    action,
    old_data,
    new_data,
    metadata
  );
};