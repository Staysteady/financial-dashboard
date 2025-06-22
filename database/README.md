# Database Setup Guide

This guide will help you set up the Supabase database for the Financial Dashboard application.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. A new Supabase project created

## Setup Steps

### 1. Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `financial-dashboard`
   - Database Password: Generate a strong password and save it
   - Region: Choose the closest region to your users
5. Click "Create new project"

### 2. Get Your Project Credentials

Once your project is created, you'll need these values for your `.env.local` file:

1. Go to Settings → API
2. Copy the following values:
   - **Project URL** (for `NEXT_PUBLIC_SUPABASE_URL`)
   - **Project API Keys** → `anon` `public` (for `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **Project API Keys** → `service_role` `secret` (for `SUPABASE_SERVICE_ROLE_KEY`)

### 3. Run Database Migrations

Execute the SQL files in the following order using the Supabase SQL Editor:

#### Step 1: Create Schema
1. Go to SQL Editor in your Supabase dashboard
2. Copy and paste the contents of `schema.sql`
3. Click "Run" to execute

#### Step 2: Set Up Row Level Security
1. In the SQL Editor, create a new query
2. Copy and paste the contents of `rls-policies.sql`
3. Click "Run" to execute

#### Step 3: Insert Seed Data
1. In the SQL Editor, create a new query
2. Copy and paste the contents of `seed-data.sql`
3. Click "Run" to execute

### 4. Configure Authentication

1. Go to Authentication → Settings
2. Configure the following settings:
   - **Site URL**: `http://localhost:3001` (for development)
   - **Redirect URLs**: Add your production URL when deploying
   - Enable email confirmations if desired
   - Configure any social auth providers you want to use

### 5. Update Environment Variables

Update your `.env.local` file with the credentials from step 2:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 6. Generate Encryption Key

Generate a secure encryption key for sensitive financial data:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add this to your `.env.local`:

```env
ENCRYPTION_KEY=your-generated-32-character-key
```

## Database Schema Overview

### Core Tables

- **accounts**: User's financial accounts (bank accounts, investments, etc.)
- **transactions**: All financial transactions
- **categories**: Transaction categories (both system and user-defined)
- **budgets**: User-defined budgets for spending categories
- **financial_goals**: Savings and financial goals
- **cash_flow_projections**: Future cash flow projections
- **alerts**: System alerts and notifications
- **user_preferences**: User settings and preferences

### Security Features

- **Row Level Security (RLS)**: Ensures users can only access their own data
- **Encrypted Credentials**: API credentials are encrypted before storage
- **Audit Trail**: All tables include created_at and updated_at timestamps
- **Data Validation**: Database constraints ensure data integrity

### Default Categories

The seed data includes comprehensive default categories for:

**Expense Categories:**
- Food & Dining (with subcategories)
- Transportation (with subcategories)
- Bills & Utilities (with subcategories)
- Shopping, Entertainment, Healthcare, etc.

**Income Categories:**
- Salary, Freelance, Business Income
- Investment Returns (with subcategories)
- Interest, Dividends, Bonuses, etc.

## Testing the Setup

After completing the setup, you can test the database connection by:

1. Starting your Next.js development server: `npm run dev`
2. Navigating to the dashboard page
3. The application should connect to Supabase without errors

## Troubleshooting

### Common Issues

1. **Connection Errors**: Verify your environment variables are correct
2. **RLS Policy Errors**: Ensure you're authenticated when testing
3. **Permission Errors**: Check that RLS policies are properly applied

### Useful SQL Queries for Testing

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View default categories
SELECT name, type, is_system FROM categories 
WHERE is_system = true 
ORDER BY type, name;
```

## Production Considerations

When deploying to production:

1. Update the Site URL in Supabase Authentication settings
2. Add production redirect URLs
3. Consider enabling additional security features
4. Set up database backups
5. Monitor database performance and usage
6. Review and audit RLS policies

## Support

If you encounter issues:

1. Check the Supabase documentation: [docs.supabase.com](https://docs.supabase.com)
2. Review the application logs for specific error messages
3. Verify your environment variables are correctly set
4. Test database connectivity using the Supabase dashboard
