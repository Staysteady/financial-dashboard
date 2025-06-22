import { 
  BankingApiClient, 
  BankConnectionConfig, 
  BankApiResponse, 
  BankApiError,
  BankAuthTokens,
  OpenBankingAccount,
  OpenBankingBalance,
  OpenBankingTransaction,
  OpenBankingApiResponse
} from '@/types/banking-api';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfterMs: number;
}

export interface RequestConfig {
  timeout: number;
  retries: number;
  retryDelay: number;
}

export abstract class BaseBankingApiClient implements BankingApiClient {
  protected baseUrl: string;
  protected rateLimitConfig: RateLimitConfig;
  protected requestConfig: RequestConfig;
  private requestQueue: Map<string, number[]> = new Map();

  constructor(
    baseUrl: string,
    rateLimitConfig: RateLimitConfig = {
      maxRequests: 10,
      windowMs: 60000, // 1 minute
      retryAfterMs: 5000
    },
    requestConfig: RequestConfig = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000
    }
  ) {
    this.baseUrl = baseUrl;
    this.rateLimitConfig = rateLimitConfig;
    this.requestConfig = requestConfig;
  }

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    rateLimitKey: string = 'default'
  ): Promise<BankApiResponse<T>> {
    try {
      // Check rate limit
      if (!(await this.checkRateLimit(rateLimitKey))) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded. Please try again later.',
          }
        };
      }

      const url = `${this.baseUrl}${endpoint}`;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= this.requestConfig.retries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.requestConfig.timeout);

          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'FinancialDashboard/1.0',
              ...options.headers,
            },
          });

          clearTimeout(timeoutId);

          // Track rate limit headers if present
          const rateLimit = this.extractRateLimitInfo(response);

          if (!response.ok) {
            const errorData = await this.parseErrorResponse(response);
            return {
              success: false,
              error: errorData,
              rateLimit,
            };
          }

          const data = await response.json();
          return {
            success: true,
            data,
            rateLimit,
          };

        } catch (error) {
          lastError = error as Error;
          
          if (error instanceof Error && error.name === 'AbortError') {
            return {
              success: false,
              error: {
                code: 'TIMEOUT',
                message: 'Request timed out',
              }
            };
          }

          if (attempt < this.requestConfig.retries) {
            await this.delay(this.requestConfig.retryDelay * Math.pow(2, attempt));
          }
        }
      }

      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: lastError?.message || 'Unknown error occurred',
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'Unexpected error occurred',
        }
      };
    }
  }

  private async checkRateLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const requests = this.requestQueue.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(
      timestamp => now - timestamp < this.rateLimitConfig.windowMs
    );

    if (validRequests.length >= this.rateLimitConfig.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requestQueue.set(key, validRequests);
    
    return true;
  }

  private extractRateLimitInfo(response: Response) {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (limit && remaining && reset) {
      return {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        resetTime: parseInt(reset),
      };
    }

    return undefined;
  }

  private async parseErrorResponse(response: Response): Promise<BankApiError> {
    try {
      const errorData = await response.json();
      
      // Handle Open Banking standard error format
      if (errorData.Errors && Array.isArray(errorData.Errors)) {
        return {
          code: errorData.Errors[0]?.ErrorCode || 'UNKNOWN_ERROR',
          message: errorData.Errors[0]?.Message || 'Unknown error occurred',
          path: errorData.Errors[0]?.Path,
          url: errorData.Errors[0]?.Url,
          moreInfo: errorData.Errors[0]?.MoreInfo,
        };
      }

      // Handle generic error format
      return {
        code: errorData.error || 'HTTP_ERROR',
        message: errorData.error_description || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      };

    } catch {
      return {
        code: 'HTTP_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected transformOpenBankingAccount(obAccount: any): OpenBankingAccount {
    return {
      AccountId: obAccount.AccountId,
      Currency: obAccount.Currency,
      AccountType: obAccount.AccountType,
      AccountSubType: obAccount.AccountSubType,
      Nickname: obAccount.Nickname,
      Account: obAccount.Account || [],
      Servicer: obAccount.Servicer,
    };
  }

  protected transformOpenBankingBalance(obBalance: any): OpenBankingBalance {
    return {
      AccountId: obBalance.AccountId,
      Amount: obBalance.Amount,
      CreditDebitIndicator: obBalance.CreditDebitIndicator,
      Type: obBalance.Type,
      DateTime: obBalance.DateTime,
      CreditLine: obBalance.CreditLine,
    };
  }

  protected transformOpenBankingTransaction(obTransaction: any): OpenBankingTransaction {
    return {
      AccountId: obTransaction.AccountId,
      TransactionId: obTransaction.TransactionId,
      TransactionReference: obTransaction.TransactionReference,
      Amount: obTransaction.Amount,
      CreditDebitIndicator: obTransaction.CreditDebitIndicator,
      Status: obTransaction.Status,
      BookingDateTime: obTransaction.BookingDateTime,
      ValueDateTime: obTransaction.ValueDateTime,
      TransactionInformation: obTransaction.TransactionInformation,
      AddressLine: obTransaction.AddressLine,
      BankTransactionCode: obTransaction.BankTransactionCode,
      ProprietaryBankTransactionCode: obTransaction.ProprietaryBankTransactionCode,
      Balance: obTransaction.Balance,
      MerchantDetails: obTransaction.MerchantDetails,
      CreditorAccount: obTransaction.CreditorAccount,
      DebtorAccount: obTransaction.DebtorAccount,
    };
  }

  // Abstract methods to be implemented by specific bank clients
  abstract authenticate(config: BankConnectionConfig): Promise<BankApiResponse<string>>;
  abstract refreshToken(refreshToken: string): Promise<BankApiResponse<BankAuthTokens>>;
  abstract getAccounts(accessToken: string): Promise<BankApiResponse<OpenBankingAccount[]>>;
  abstract getAccountBalances(accessToken: string, accountId: string): Promise<BankApiResponse<OpenBankingBalance[]>>;
  abstract getTransactions(
    accessToken: string,
    accountId: string,
    fromBookingDateTime?: string,
    toBookingDateTime?: string,
    limit?: number,
    offset?: number
  ): Promise<BankApiResponse<OpenBankingTransaction[]>>;
  abstract testConnection(accessToken: string): Promise<BankApiResponse<boolean>>;
  abstract disconnect(accessToken: string): Promise<BankApiResponse<boolean>>;
}