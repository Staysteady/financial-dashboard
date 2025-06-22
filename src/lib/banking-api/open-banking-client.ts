import { BaseBankingApiClient } from './base-client';
import { 
  BankConnectionConfig, 
  BankApiResponse, 
  BankAuthTokens,
  OpenBankingAccount,
  OpenBankingBalance,
  OpenBankingTransaction,
  OpenBankingApiResponse
} from '@/types/banking-api';

export class OpenBankingApiClient extends BaseBankingApiClient {
  private clientId: string;
  private clientSecret?: string;
  private redirectUri: string;

  constructor(
    baseUrl: string,
    clientId: string,
    clientSecret?: string,
    redirectUri: string = 'http://localhost:3001/auth/callback'
  ) {
    super(baseUrl);
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  async authenticate(config: BankConnectionConfig): Promise<BankApiResponse<string>> {
    try {
      // Generate authorization URL for OAuth2 flow
      const authUrl = new URL(config.authorizeUrl);
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scope.join(' '),
        state: this.generateState(),
      });

      authUrl.search = params.toString();

      return {
        success: true,
        data: authUrl.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AUTH_URL_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate authorization URL',
        }
      };
    }
  }

  async exchangeCodeForTokens(
    code: string,
    config: BankConnectionConfig
  ): Promise<BankApiResponse<BankAuthTokens>> {
    const tokenData = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
    };

    // Add client_secret if available (for confidential clients)
    if (config.clientSecret) {
      tokenData['client_secret'] = config.clientSecret;
    }

    const response = await this.makeRequest<any>(
      config.tokenUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenData).toString(),
      },
      'token-exchange'
    );

    if (!response.success || !response.data) {
      return response;
    }

    const tokens: BankAuthTokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in,
      scope: response.data.scope,
      obtainedAt: Date.now(),
    };

    return {
      success: true,
      data: tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<BankApiResponse<BankAuthTokens>> {
    const tokenData = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
    };

    if (this.clientSecret) {
      tokenData['client_secret'] = this.clientSecret;
    }

    const response = await this.makeRequest<any>(
      '/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(tokenData).toString(),
      },
      'token-refresh'
    );

    if (!response.success || !response.data) {
      return response;
    }

    const tokens: BankAuthTokens = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
      tokenType: response.data.token_type,
      expiresIn: response.data.expires_in,
      scope: response.data.scope,
      obtainedAt: Date.now(),
    };

    return {
      success: true,
      data: tokens,
    };
  }

  async getAccounts(accessToken: string): Promise<BankApiResponse<OpenBankingAccount[]>> {
    const response = await this.makeRequest<OpenBankingApiResponse<{ Account: any[] }>>(
      '/open-banking/v3.1/aisp/accounts',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-fapi-auth-date': new Date().toISOString(),
          'x-fapi-customer-ip-address': '127.0.0.1', // This should be the customer's IP
          'x-fapi-interaction-id': this.generateInteractionId(),
        },
      },
      `accounts-${accessToken.substring(0, 8)}`
    );

    if (!response.success || !response.data) {
      return response;
    }

    const accounts = response.data.Data.Account.map(account => 
      this.transformOpenBankingAccount(account)
    );

    return {
      success: true,
      data: accounts,
      rateLimit: response.rateLimit,
    };
  }

  async getAccountBalances(
    accessToken: string, 
    accountId: string
  ): Promise<BankApiResponse<OpenBankingBalance[]>> {
    const response = await this.makeRequest<OpenBankingApiResponse<{ Balance: any[] }>>(
      `/open-banking/v3.1/aisp/accounts/${accountId}/balances`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-fapi-auth-date': new Date().toISOString(),
          'x-fapi-customer-ip-address': '127.0.0.1',
          'x-fapi-interaction-id': this.generateInteractionId(),
        },
      },
      `balances-${accessToken.substring(0, 8)}`
    );

    if (!response.success || !response.data) {
      return response;
    }

    const balances = response.data.Data.Balance.map(balance => 
      this.transformOpenBankingBalance(balance)
    );

    return {
      success: true,
      data: balances,
      rateLimit: response.rateLimit,
    };
  }

  async getTransactions(
    accessToken: string,
    accountId: string,
    fromBookingDateTime?: string,
    toBookingDateTime?: string,
    limit?: number,
    offset?: number
  ): Promise<BankApiResponse<OpenBankingTransaction[]>> {
    const params = new URLSearchParams();
    
    if (fromBookingDateTime) {
      params.append('fromBookingDateTime', fromBookingDateTime);
    }
    if (toBookingDateTime) {
      params.append('toBookingDateTime', toBookingDateTime);
    }
    if (limit) {
      params.append('limit', limit.toString());
    }
    if (offset) {
      params.append('offset', offset.toString());
    }

    const queryString = params.toString();
    const endpoint = `/open-banking/v3.1/aisp/accounts/${accountId}/transactions${queryString ? `?${queryString}` : ''}`;

    const response = await this.makeRequest<OpenBankingApiResponse<{ Transaction: any[] }>>(
      endpoint,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-fapi-auth-date': new Date().toISOString(),
          'x-fapi-customer-ip-address': '127.0.0.1',
          'x-fapi-interaction-id': this.generateInteractionId(),
        },
      },
      `transactions-${accessToken.substring(0, 8)}`
    );

    if (!response.success || !response.data) {
      return response;
    }

    const transactions = response.data.Data.Transaction.map(transaction => 
      this.transformOpenBankingTransaction(transaction)
    );

    return {
      success: true,
      data: transactions,
      rateLimit: response.rateLimit,
    };
  }

  async testConnection(accessToken: string): Promise<BankApiResponse<boolean>> {
    const response = await this.makeRequest<any>(
      '/open-banking/v3.1/aisp/accounts',
      {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-fapi-auth-date': new Date().toISOString(),
          'x-fapi-customer-ip-address': '127.0.0.1',
          'x-fapi-interaction-id': this.generateInteractionId(),
        },
      },
      `test-connection-${accessToken.substring(0, 8)}`
    );

    return {
      success: response.success,
      data: response.success,
      error: response.error,
      rateLimit: response.rateLimit,
    };
  }

  async disconnect(accessToken: string): Promise<BankApiResponse<boolean>> {
    // Open Banking doesn't have a standard disconnect endpoint
    // This would typically involve revoking the token
    const response = await this.makeRequest<any>(
      '/token/revoke',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: accessToken,
          token_type_hint: 'access_token',
        }).toString(),
      },
      'disconnect'
    );

    return {
      success: response.success,
      data: response.success,
      error: response.error,
      rateLimit: response.rateLimit,
    };
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private generateInteractionId(): string {
    return crypto.randomUUID();
  }
}