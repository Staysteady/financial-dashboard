-- Row Level Security (RLS) Policies for Financial Dashboard
-- These policies ensure users can only access their own data

-- Enable RLS on all tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- User Preferences Policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Categories Policies
CREATE POLICY "Users can view their own categories and system categories" ON categories
    FOR SELECT USING (auth.uid() = user_id OR is_system = true);

CREATE POLICY "Users can insert their own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own non-system categories" ON categories
    FOR UPDATE USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete their own non-system categories" ON categories
    FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- Accounts Policies
CREATE POLICY "Users can view their own accounts" ON accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts" ON accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" ON accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts" ON accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Users can view transactions from their own accounts" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM accounts 
            WHERE accounts.id = transactions.account_id 
            AND accounts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert transactions to their own accounts" ON transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM accounts 
            WHERE accounts.id = transactions.account_id 
            AND accounts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update transactions from their own accounts" ON transactions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM accounts 
            WHERE accounts.id = transactions.account_id 
            AND accounts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete transactions from their own accounts" ON transactions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM accounts 
            WHERE accounts.id = transactions.account_id 
            AND accounts.user_id = auth.uid()
        )
    );

-- Budgets Policies
CREATE POLICY "Users can view their own budgets" ON budgets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets" ON budgets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" ON budgets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" ON budgets
    FOR DELETE USING (auth.uid() = user_id);

-- Financial Goals Policies
CREATE POLICY "Users can view their own goals" ON financial_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON financial_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON financial_goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON financial_goals
    FOR DELETE USING (auth.uid() = user_id);

-- Cash Flow Projections Policies
CREATE POLICY "Users can view their own projections" ON cash_flow_projections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projections" ON cash_flow_projections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projections" ON cash_flow_projections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projections" ON cash_flow_projections
    FOR DELETE USING (auth.uid() = user_id);

-- Alerts Policies
CREATE POLICY "Users can view their own alerts" ON alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts" ON alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" ON alerts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts" ON alerts
    FOR DELETE USING (auth.uid() = user_id);
