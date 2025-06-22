# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Development Server
- `npm run dev` - Start development server with Turbopack on port 3001
- `npm run dev:safe` - Check port availability before starting dev server
- `npm run check-port` - Verify port 3001 is available

### Build & Production
- `npm run build` - Build the Next.js application
- `npm run start` - Start production server on port 3001
- `npm run lint` - Run ESLint for code quality checks

### TypeScript
- `npx tsc --noEmit` - Check TypeScript types without building

### Testing
Currently no testing framework is configured. The codebase lacks test files, test scripts, and testing dependencies.

## Architecture Overview

This is a Next.js 15 financial dashboard application with comprehensive banking API integration capabilities:

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS 4 with Headless UI components
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth
- **Charts**: Recharts for financial data visualization
- **Encryption**: CryptoJS for sensitive financial data
- **Banking APIs**: UK Open Banking v3.x compliance with OAuth2 flows

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Main dashboard interface
│   ├── auth/              # Authentication pages (login, signup, callback)
│   └── api/               # API routes
├── components/            # Reusable UI components
│   ├── auth/              # Authentication-related components
│   └── ui/                # Base UI components (buttons, etc.)
├── lib/                   # Core utilities and configurations
│   ├── supabase.ts        # Supabase client configurations
│   ├── database.ts        # Database operations and queries
│   └── banking-api/       # Banking API integration framework
│       ├── index.ts           # Main API exports and utilities
│       ├── base-client.ts     # Abstract base client with rate limiting
│       ├── open-banking-client.ts  # UK Open Banking implementation
│       ├── bank-adapter-manager.ts # Multi-bank adapter management
│       ├── connection-manager.ts   # Bank connection lifecycle
│       ├── credential-storage.ts   # Encrypted credential storage
│       └── csv-import.ts          # Manual data import fallback
├── types/                 # TypeScript type definitions
│   └── banking-api.ts     # Banking API type definitions
├── utils/                 # Utility functions
│   ├── encryption.ts      # Data encryption/decryption
│   ├── financial-calculations.ts  # Financial computation functions
│   └── security.ts        # Security utilities
└── hooks/                 # Custom React hooks
```

### Banking API Integration Framework

The application includes a comprehensive banking API integration system:

#### Key Components
- **Base Client** (`base-client.ts`): Abstract API client with rate limiting (10 req/min), exponential backoff retry logic, and timeout management
- **Open Banking Client** (`open-banking-client.ts`): UK Open Banking v3.x implementation with OAuth2 PKCE flows
- **Bank Adapter Manager** (`bank-adapter-manager.ts`): Manages multiple bank-specific adapters for different institutions
- **Connection Manager** (`connection-manager.ts`): Handles complete bank connection lifecycle, token refresh, and data synchronization
- **Credential Storage** (`credential-storage.ts`): Secure storage with AES-256 encryption and user-specific keys
- **CSV Import Service** (`csv-import.ts`): Manual data import fallback with configurable parsing

#### Security Features
- User-specific encryption keys with PBKDF2 key derivation (10,000 iterations)
- Automatic token refresh and expiration handling
- Encrypted credential storage with integrity checking
- Rate limiting and retry mechanisms for API stability
- Secure credential lifecycle management with rotation capabilities

#### Supported Operations
- OAuth2 authentication flows with multiple UK banks
- Account and balance synchronization
- Transaction import with deduplication
- CSV data import as fallback option
- Connection status monitoring and error handling

### Database Schema
The application uses a comprehensive PostgreSQL schema with the following main tables:
- `accounts` - Financial accounts (savings, current, investment, etc.)
- `transactions` - Financial transactions with categorization
- `categories` - Transaction categories with hierarchical structure
- `budgets` - Budget management with different periods
- `financial_goals` - Goal tracking (emergency fund, savings, etc.)
- `cash_flow_projections` - Future balance projections
- `alerts` - User notifications and warnings
- `user_preferences` - User settings and preferences
- `bank_connections` - Encrypted banking credentials and connection status

### Authentication & Security
- Uses Supabase Auth with server-side rendering support
- Row Level Security (RLS) policies protect user data
- Sensitive financial data is encrypted using CryptoJS before storage
- Banking API credentials are encrypted with user-specific keys
- Security headers configured in middleware
- OAuth2 flows with PKCE for banking authentication

### Key Financial Features
- Multi-bank account aggregation via APIs and CSV import
- Real-time transaction synchronization with deduplication
- Automatic transaction categorization
- Cash flow projections and runway calculations
- Spending pattern analysis and anomaly detection
- Budget tracking and goal management
- Comprehensive financial dashboard with live data

### Important Patterns
- Server-side Supabase client creation using `createServerSupabaseClient()`
- Banking API client instantiation via `BankConnectionManager`
- Encrypted credential storage with automatic key rotation
- Type-safe database operations with comprehensive error handling
- Rate-limited API calls with exponential backoff retry
- OAuth2 state management for secure bank authentication
- Financial calculations using `date-fns` for date manipulation

### Environment Variables Required
```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Encryption Key for sensitive financial data
ENCRYPTION_KEY=your_32_character_encryption_key

# Financial Institution API Keys (when available)
ATOM_BANK_API_KEY=
ZOPA_API_KEY=
TANDEM_API_KEY=
MONEYBOX_API_KEY=
HARGREAVES_LANSDOWN_API_KEY=

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Development Notes

### Authentication Middleware
- Middleware is configured in `src/middleware.ts` with authentication protection for `/dashboard` routes
- Auth protection is currently **disabled** for development (see TODO comments in middleware)
- Re-enable auth protection after creating authentication pages (`/auth/login`, `/auth/signup`)

### Banking API Integration
- Use `BankConnectionManager` for all banking operations - handles connection lifecycle, token management, and data sync
- Banking credentials are automatically encrypted before storage using user-specific keys
- Rate limiting is built into the base client (10 requests/minute default with exponential backoff)
- All banking operations return standardized `ApiResponse<T>` types for consistent error handling

### Database Operations
- Always use `createServerSupabaseClient()` for server-side operations (API routes, server components)
- Use the standard `supabase` client for client-side operations
- RLS policies automatically protect user data - no additional user filtering needed in queries
- Database schema changes require updating both `/database/schema.sql` and `/database/rls-policies.sql`

### Financial Data Security
- All sensitive financial data is encrypted using AES-256 before database storage
- Banking API credentials use user-specific encryption keys derived with PBKDF2
- Environment variable `ENCRYPTION_KEY` must be exactly 32 characters for AES-256
- Never store unencrypted financial data or API credentials

### Key Development Patterns
- Financial calculations use `date-fns` for reliable date manipulation
- Banking API responses are normalized to common interfaces before storage
- CSV import provides fallback when API connections are unavailable
- All banking operations include transaction deduplication by `external_id`

### Port Configuration
- Development server runs on port 3001 to avoid conflicts
- Use `npm run check-port` to verify port availability before starting
- `npm run dev:safe` combines port checking with server startup