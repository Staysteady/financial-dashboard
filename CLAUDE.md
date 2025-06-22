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

This is a Next.js 15 financial dashboard application with the following key architectural components:

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS 4 with Headless UI components
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth
- **Charts**: Recharts for financial data visualization
- **Encryption**: CryptoJS for sensitive financial data

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
│   └── utils.ts           # General utilities
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
│   ├── encryption.ts      # Data encryption/decryption
│   ├── financial-calculations.ts  # Financial computation functions
│   └── security.ts        # Security utilities
└── hooks/                 # Custom React hooks
```

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

### Authentication & Security
- Uses Supabase Auth with server-side rendering support
- Row Level Security (RLS) policies protect user data
- Sensitive financial data is encrypted using CryptoJS before storage
- API credentials are encrypted when stored
- Security headers configured in `next.config.ts`

### Key Financial Features
- Multi-bank account aggregation
- Transaction categorization and analysis
- Cash flow projections and runway calculations
- Spending pattern analysis and anomaly detection
- Budget tracking and goal management
- Real-time dashboard with financial metrics

### Important Patterns
- Server-side Supabase client creation in API routes using `createServerSupabaseClient()`
- Type-safe database operations with comprehensive error handling
- Encryption of sensitive data before database storage
- Financial calculations using `date-fns` for date manipulation
- Responsive design with Tailwind CSS classes

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ENCRYPTION_KEY=your_32_character_encryption_key
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Development Notes

- Port 3001 is used to avoid conflicts with other development servers
- The application includes comprehensive financial calculation utilities
- All sensitive financial data is encrypted before storage
- Database operations include proper error handling and user access validation
- Supabase RLS policies ensure data isolation between users