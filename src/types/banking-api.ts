/**
 * UK Open Banking API Types and Interfaces
 * Based on Open Banking Standards v3.x specification
 */

export interface OpenBankingAccount {
  AccountId: string;
  Currency: string;
  AccountType: 'Business' | 'Personal';
  AccountSubType: 'ChargeCard' | 'CreditCard' | 'CurrentAccount' | 'EMoney' | 'Loan' | 'Mortgage' | 'PrePaidCard' | 'Savings';
  Nickname?: string;
  Account: {
    SchemeName: 'UK.OBIE.BBAN' | 'UK.OBIE.IBAN' | 'UK.OBIE.PAN' | 'UK.OBIE.Paym' | 'UK.OBIE.SortCodeAccountNumber';
    Identification: string;
    Name?: string;
    SecondaryIdentification?: string;
  }[];
  Servicer?: {
    SchemeName: 'UK.OBIE.BICFI';
    Identification: string;
  };
}

export interface OpenBankingBalance {
  AccountId: string;
  Amount: {
    Amount: string;
    Currency: string;
  };
  CreditDebitIndicator: 'Credit' | 'Debit';
  Type: 'ClosingAvailable' | 'ClosingBooked' | 'ClosingCleared' | 'Expected' | 'ForwardAvailable' | 'Information' | 'InterimAvailable' | 'InterimBooked' | 'InterimCleared' | 'OpeningAvailable' | 'OpeningBooked' | 'OpeningCleared' | 'PreviouslyClosedBooked';
  DateTime: string;
  CreditLine?: {
    Included: boolean;
    Amount?: {
      Amount: string;
      Currency: string;
    };
    Type?: 'Available' | 'Credit' | 'Emergency' | 'Pre-Agreed' | 'Temporary';
  }[];
}

export interface OpenBankingTransaction {
  AccountId: string;
  TransactionId: string;
  TransactionReference?: string;
  Amount: {
    Amount: string;
    Currency: string;
  };
  CreditDebitIndicator: 'Credit' | 'Debit';
  Status: 'Booked' | 'Pending';
  BookingDateTime: string;
  ValueDateTime?: string;
  TransactionInformation?: string;
  AddressLine?: string;
  BankTransactionCode?: {
    Code: string;
    SubCode: string;
  };
  ProprietaryBankTransactionCode?: {
    Code: string;
    Issuer: string;
  };
  Balance?: {
    Amount: {
      Amount: string;
      Currency: string;
    };
    CreditDebitIndicator: 'Credit' | 'Debit';
    Type: string;
  };
  MerchantDetails?: {
    MerchantName?: string;
    MerchantCategoryCode?: string;
  };
  CreditorAccount?: {
    SchemeName: string;
    Identification: string;
    Name?: string;
  };
  DebtorAccount?: {
    SchemeName: string;
    Identification: string;
    Name?: string;
  };
}

export interface OpenBankingApiResponse<T> {
  Data: T;
  Links: {
    Self: string;
    First?: string;
    Prev?: string;
    Next?: string;
    Last?: string;
  };
  Meta: {
    TotalPages?: number;
    FirstAvailableDateTime?: string;
    LastAvailableDateTime?: string;
  };
}

export interface BankConnectionConfig {
  baseUrl: string;
  clientId: string;
  clientSecret?: string;
  certificatePath?: string;
  privateKeyPath?: string;
  tokenUrl: string;
  authorizeUrl: string;
  scope: string[];
  redirectUri: string;
}

export interface BankAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
  obtainedAt: number;
}

export interface BankApiError {
  code: string;
  message: string;
  path?: string;
  url?: string;
  moreInfo?: string;
}

export interface BankApiResponse<T> {
  success: boolean;
  data?: T;
  error?: BankApiError;
  rateLimit?: {
    limit: number;
    remaining: number;
    resetTime: number;
  };
}

export interface BankingApiClient {
  // Authentication
  authenticate(config: BankConnectionConfig): Promise<BankApiResponse<string>>;
  refreshToken(refreshToken: string): Promise<BankApiResponse<BankAuthTokens>>;
  
  // Account operations
  getAccounts(accessToken: string): Promise<BankApiResponse<OpenBankingAccount[]>>;
  getAccountBalances(accessToken: string, accountId: string): Promise<BankApiResponse<OpenBankingBalance[]>>;
  
  // Transaction operations
  getTransactions(
    accessToken: string, 
    accountId: string, 
    fromBookingDateTime?: string,
    toBookingDateTime?: string,
    limit?: number,
    offset?: number
  ): Promise<BankApiResponse<OpenBankingTransaction[]>>;
  
  // Connection management
  testConnection(accessToken: string): Promise<BankApiResponse<boolean>>;
  disconnect(accessToken: string): Promise<BankApiResponse<boolean>>;
}

export interface BankAdapter {
  bankCode: string;
  bankName: string;
  apiClient: BankingApiClient;
  config: BankConnectionConfig;
  isProduction: boolean;
}

export interface ImportedTransaction {
  externalId: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  type: 'income' | 'expense' | 'transfer';
  merchant?: string;
  category?: string;
  balance?: number;
}

export interface BankConnectionStatus {
  connected: boolean;
  lastSync?: string;
  errorMessage?: string;
  nextSyncScheduled?: string;
  totalAccounts?: number;
  totalTransactions?: number;
}

export interface CSVImportConfig {
  dateColumn: string;
  amountColumn: string;
  descriptionColumn: string;
  categoryColumn?: string;
  balanceColumn?: string;
  dateFormat: string;
  hasHeaders: boolean;
  delimiter: ',' | ';' | '\t';
}

export interface CSVImportResult {
  success: boolean;
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
  transactions: ImportedTransaction[];
}