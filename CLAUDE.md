# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server (port 3001)
npm run dev

# Build production version  
npm run build

# Start production server
npm start

# Type checking (ALWAYS run before committing)
npm run type-check

# Lint checking (ALWAYS run before committing)
npm run lint

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npx playwright test  # Run Playwright e2e tests
npm run test:e2e     # Run e2e tests  
npm run test:e2e:ui  # Run e2e tests with UI mode
npm run test:e2e:headed # Run e2e tests in headed mode
npm run test:security # Run security tests
npm run test:security:ui # Run security tests with UI
npm run test:performance # Run performance tests
npm run test:load     # Run load tests

# Development utilities
npm run check-port   # Check if port 3001 is available
npm run dev:safe     # Check port and start dev server safely
npm run clean        # Clean .next and other build artifacts
npm run db:migrate   # Run database migrations (when implemented)
npm run db:seed      # Seed database with sample data (when implemented)
```

## Tech Stack & Architecture

### Core Framework
- **Next.js 15** with App Router and React 19
- **TypeScript 5** with strict configuration
- **Tailwind CSS 4** with Headless UI components
- **Supabase** (PostgreSQL) with Row Level Security

### Key Dependencies
- **UI/Visualization**: Recharts, Headless UI, Heroicons, Lucide React
- **Forms**: React Hook Form with Zod validation
- **Date Handling**: date-fns (critical for financial calculations)
- **Security**: CryptoJS for AES-256 encryption
- **Utilities**: clsx, tailwind-merge via cn() helper

### Database Schema
Comprehensive PostgreSQL schema with:
- Custom ENUM types: `account_type`, `transaction_type`, `goal_type`, `alert_type`
- Core tables: `accounts`, `transactions`, `categories`, `budgets`, `financial_goals`, `alerts`, `api_connections`, `user_settings`
- Security: RLS policies on all tables, encrypted sensitive data
- Relationships: Proper foreign keys and constraints

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── (auth)/         # Authentication routes
│   ├── dashboard/      # Main dashboard pages
│   └── api/            # API routes (currently empty - needs implementation)
├── components/
│   ├── ui/             # Reusable UI components
│   └── forms/          # Form components
├── lib/
│   ├── supabase/       # Database client and utilities
│   ├── banking/        # Banking API integration
│   ├── security/       # Encryption and security utilities
│   └── utils.ts        # Common utilities (cn helper, etc.)
└── types/              # TypeScript type definitions
```

## Banking API Integration

### Supported UK Banking APIs
- **Open Banking v3.x** compliant implementations
- **Major institutions**: HSBC, Atom Bank, Zopa, Tandem, Hargreaves Lansdown
- **OAuth2 PKCE flows** for secure authentication
- **Fallback CSV import** when API connections unavailable

### Security Architecture
- **User-specific encryption**: Each user has unique encryption keys
- **PBKDF2 key derivation** with 10,000 iterations
- **AES-256 encryption** for banking credentials
- **Rate limiting**: Route-specific limits configured in middleware.ts
  - API general: 100 requests/15min
  - Auth: 5 requests/15min  
  - Banking API: 20 requests/5min
  - Export: 10 requests/hour
  - Upload: 5 requests/15min
  - Password reset: 3 requests/hour
  - OTP verification: 10 requests/15min
- **Connection health monitoring** and automatic token refresh
- **Security headers**: CSP, X-Frame-Options, etc. configured in Next.js

### Key Classes
- `BankConnectionManager`: Manages banking API connections
- `EncryptionService`: Handles sensitive data encryption
- Bank-specific adapters in `src/lib/banking/adapters/`

## Component Architecture

### UI Components (src/components/ui/)
All components follow consistent patterns:
- TypeScript interfaces for props
- Responsive design with Tailwind
- Consistent error handling and loading states
- Integration with Recharts for financial visualizations

### Key Components
- **Dashboard Components**: `account-overview.tsx`, `transaction-list.tsx`, `balance-chart.tsx`
- **Analysis Tools**: `spending-analysis.tsx`, `budget-comparison.tsx`, `merchant-location-analysis.tsx`
- **Financial Tools**: `categorization.tsx`, `pattern-detection.tsx`, `spending-trends-insights.tsx`

## Development Patterns

### API Response Handling
```typescript
// Standard API response type
interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}
```

### Database Operations
```typescript
// Server-side Supabase client creation
import { createServerClient } from '@/lib/supabase/server';

const supabase = createServerClient();
```

### Banking Integration
```typescript
// Secure banking API calls
const bankManager = new BankConnectionManager();
const accounts = await bankManager.getAccounts(userId, connectionId);
```

### Encryption for Sensitive Data
```typescript
// Encrypt banking credentials
const encryptionService = new EncryptionService();
const encryptedCredentials = await encryptionService.encrypt(credentials, userKey);
```

## Security Considerations

### Authentication & Authorization
- Supabase Auth with email/password
- Row Level Security (RLS) on all database tables
- Protected routes via middleware (currently disabled for development)

### Data Protection
- Banking credentials encrypted with user-specific keys
- Sensitive transaction data properly secured
- Audit logging for financial data access
- Secure headers configured in Next.js config

### Banking Compliance
- Open Banking security standards compliance
- PSD2 directive compliance for EU users
- Proper OAuth2 PKCE implementation
- Secure credential storage and transmission

## Development Workflow

### Pre-commit Checklist
1. **ALWAYS run type checking**: `npm run type-check`
2. **ALWAYS run linting**: `npm run lint`
3. **Run relevant tests**: `npm test` for changed utilities, `npx playwright test` for UI changes
4. **Check port conflicts**: Use `npm run dev:safe` instead of `npm run dev`

### Port Configuration
- **Development server**: Port 3001 (configured in package.json and Next.js config)
- **Port conflicts**: Run `npm run check-port` to verify port availability
- **Netlify/Vercel**: Automatic port detection on deployment

### Authentication State
- **Middleware**: Auth checks currently disabled for development (see middleware.ts:71-75)  
- **Testing**: Most routes accessible without authentication during development
- **Production**: Uncomment auth middleware for production deployment

## Known Development Notes

### Current State
- **Dashboard implemented** with comprehensive charts and mock data
- **Authentication framework** in place but middleware disabled for development
- **Empty API routes** - requires implementation for production use
- **Testing framework configured** with Jest and comprehensive unit tests for utility functions

### Important Files
- `middleware.ts`: Authentication middleware with rate limiting (auth disabled for dev)
- `database/schema.sql`: Complete database schema with RLS policies
- `src/lib/banking-api/`: Banking API integration framework
- `src/utils/`: Encryption and security utilities
- `jest.config.js`: Jest configuration for testing
- `playwright.config.ts`: E2E testing configuration with mobile support

### Mock Data
- Most components use sample/mock data for development
- Transaction data generated with realistic UK banking patterns
- Category system includes comprehensive UK spending categories

## Financial Calculations

### Date Handling
- Always use `date-fns` for financial date calculations
- Handle timezone considerations for transaction processing
- Proper handling of financial periods (monthly, yearly cycles)

### Currency Formatting
- Standard UK formatting: `new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })`
- Consistent rounding for financial calculations
- Handle negative values properly for expenses vs income

### Chart Configuration
- Recharts for all financial visualizations
- Consistent color schemes across components
- Responsive design for mobile financial data viewing
- Proper tooltip formatting for financial data

## Testing Strategy

### Unit Tests
- **Framework**: Jest with TypeScript support
- **Coverage**: Utility functions, financial calculations, security functions
- **Location**: `src/**/__tests__/**/*.test.ts`
- **Run**: `npm test` or `npm run test:watch`

### Test Structure
```bash
src/
├── lib/__tests__/
│   └── utils.test.ts           # UI utility functions
├── utils/__tests__/
│   ├── financial-calculations.test.ts  # Financial calculations
│   ├── security.test.ts        # Security and validation utilities
│   └── encryption.test.ts      # Encryption and data protection
├── services/__tests__/
│   └── data-validator-simple.test.ts  # Data validation concepts
└── app/api/__tests__/
    ├── setup.ts                # API test setup and mocks
    ├── export-transactions.test.ts     # Transaction export API tests
    ├── export-accounts.test.ts         # Account export API tests
    ├── export-financial-summary.test.ts # Financial summary API tests
    ├── webhooks.test.ts                # Webhook integration tests
    └── external-integrations.test.ts   # External API integration tests
```

### Testing Best Practices
- **Pure functions first**: Focus on deterministic functions with no side effects
- **Edge cases**: Test boundary conditions, empty inputs, invalid data
- **Error handling**: Ensure functions handle invalid inputs gracefully
- **Mock external dependencies**: Database calls, file system, crypto libraries
- **Financial accuracy**: Verify calculations match expected business logic

### Test Coverage
- ✅ **Utility functions**: Formatting, validation, text processing (39 tests passing)
- ✅ **Security functions**: Encryption, hashing, input sanitization
- ✅ **Financial calculations**: Burn rate, projections, trend analysis
- ✅ **API endpoints**: Integration tests for all endpoints (120+ tests)
  - Transaction export API (CSV/JSON formats)
  - Account export API (with transaction counts)
  - Financial summary API (with trends and metrics)
  - Webhook integration (transaction/account/alert events)
  - External API integrations (portfolio, spending insights, health score)
- ✅ **User flows**: End-to-end tests with Playwright (comprehensive test suite created)
  - Authentication flows (sign-in, sign-up, validation)
  - Dashboard navigation and responsiveness  
  - Transaction management and filtering
  - Analytics and chart interactions
  - Account management and connections
  - Financial goals tracking and creation
  - Smoke tests for critical paths
  - Mobile and accessibility testing

## Banking Integration Best Practices

### Connection Management
- Always check connection health before API calls
- Implement proper retry logic with exponential backoff
- Handle token refresh automatically
- Graceful fallback to manual data entry

### Data Synchronization
- Incremental transaction sync to avoid duplicates
- Proper handling of pending vs completed transactions
- Account balance reconciliation
- Transaction categorization after import

### Error Handling
- Banking API specific error codes
- User-friendly error messages for banking failures
- Proper logging without exposing sensitive data
- Fallback mechanisms for critical operations

## Performance & Monitoring

### Sentry Integration
- **Error tracking**: Configured with Next.js plugin in `next.config.ts`
- **Source maps**: Hidden in production, uploaded to Sentry
- **Environment**: Automatic Vercel monitors enabled
- **Configuration**: Set `SENTRY_ORG` and `SENTRY_PROJECT` environment variables

### Next.js Optimizations
- **Turbopack**: Enabled for faster development builds (`npm run dev`)
- **Package imports**: Optimized for `@heroicons/react` and `lucide-react`
- **Security headers**: Configured in `next.config.ts`
- **Port binding**: Defaults to 3001 for development

### Testing Performance
- **Load tests**: `npm run test:load` (Playwright-based)
- **Performance tests**: `npm run test:performance`
- **E2E coverage**: Cross-browser testing (Chrome, Firefox, Safari, Mobile)