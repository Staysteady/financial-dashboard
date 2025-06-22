# Financial Dashboard

A comprehensive financial monitoring and analysis dashboard that provides real-time insights into your banking and investment activities, with advanced projections to help you plan for the future.

## Features

- **Multi-Bank Integration**: Connect to multiple financial institutions including Atom Bank, Zopa, Tandem, Moneybox, Hargreaves Lansdown, HSBC, Revolut, and more
- **Real-Time Analytics**: Track spending patterns, categorize transactions, and get detailed insights with interactive charts
- **Cash Flow Projections**: Advanced forecasting to determine how long your savings will last and plan for different income scenarios
- **Financial Runway Calculator**: Calculate exactly how long you can sustain yourself while building new business ventures
- **Secure & Private**: Bank-level encryption for all sensitive financial data
- **Smart Alerts**: Get notified when projected funds fall below thresholds or spending patterns change

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Charts**: Recharts
- **Icons**: Heroicons
- **Styling**: Tailwind CSS with Headless UI components

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for database and authentication)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd financial-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your configuration:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Encryption Key for sensitive financial data
ENCRYPTION_KEY=your_32_character_encryption_key

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3001](http://localhost:3001) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard pages
│   ├── api/              # API routes
│   └── globals.css       # Global styles
├── components/           # Reusable UI components
│   └── ui/              # Base UI components
├── lib/                 # Utility libraries
│   ├── supabase.ts      # Supabase client configuration
│   └── utils.ts         # General utilities
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
│   ├── encryption.ts    # Data encryption utilities
│   └── financial-calculations.ts  # Financial calculation functions
└── hooks/               # Custom React hooks
```

## Security

This application handles sensitive financial data and implements several security measures:

- **Data Encryption**: All sensitive financial information is encrypted before storage
- **Secure Authentication**: Uses Supabase Auth with Row Level Security (RLS)
- **API Security**: Protected API routes with authentication middleware
- **Environment Variables**: Sensitive configuration stored in environment variables

## Financial Institution Integration

The dashboard supports integration with various UK financial institutions:

- Atom Bank
- Zopa
- Tandem
- Moneybox
- Hargreaves Lansdown
- RCI Bank
- Secure Trust Bank
- HSBC
- Revolut

*Note: API integrations require appropriate API keys and permissions from each institution.*

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
