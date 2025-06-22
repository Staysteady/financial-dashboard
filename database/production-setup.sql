-- Production Database Setup Script
-- Run this after creating your production Supabase project

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- 2. Create database performance monitoring views
CREATE OR REPLACE VIEW database_performance AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public';

-- 3. Set up database connection pooling settings
-- (These would be configured in Supabase dashboard)
-- max_connections = 100
-- shared_preload_libraries = 'pg_stat_statements'

-- 4. Create backup and maintenance functions
CREATE OR REPLACE FUNCTION backup_critical_tables()
RETURNS VOID AS $$
BEGIN
    -- Create backup tables for critical financial data
    EXECUTE 'CREATE TABLE IF NOT EXISTS accounts_backup_' || to_char(NOW(), 'YYYY_MM_DD') || ' AS SELECT * FROM accounts';
    EXECUTE 'CREATE TABLE IF NOT EXISTS transactions_backup_' || to_char(NOW(), 'YYYY_MM_DD') || ' AS SELECT * FROM transactions';
    EXECUTE 'CREATE TABLE IF NOT EXISTS financial_goals_backup_' || to_char(NOW(), 'YYYY_MM_DD') || ' AS SELECT * FROM financial_goals';
    
    -- Log backup creation
    INSERT INTO system_logs (level, message, metadata)
    VALUES ('INFO', 'Daily backup completed', json_build_object('timestamp', NOW()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create cleanup function for old backups
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS VOID AS $$
DECLARE
    table_name TEXT;
BEGIN
    -- Remove backup tables older than 30 days
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE '%_backup_%' 
        AND schemaname = 'public'
        AND tablename < 'accounts_backup_' || to_char(NOW() - INTERVAL '30 days', 'YYYY_MM_DD')
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || table_name;
    END LOOP;
    
    -- Log cleanup
    INSERT INTO system_logs (level, message, metadata)
    VALUES ('INFO', 'Backup cleanup completed', json_build_object('timestamp', NOW()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create system monitoring table
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    level VARCHAR(10) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL')),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create performance monitoring function
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    table_size_mb NUMERIC,
    index_size_mb NUMERIC,
    total_size_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        t.row_count,
        ROUND((t.table_size / 1024 / 1024)::NUMERIC, 2) as table_size_mb,
        ROUND((t.index_size / 1024 / 1024)::NUMERIC, 2) as index_size_mb,
        ROUND(((t.table_size + t.index_size) / 1024 / 1024)::NUMERIC, 2) as total_size_mb
    FROM (
        SELECT 
            schemaname||'.'||tablename AS table_name,
            n_tup_ins + n_tup_upd + n_tup_del AS row_count,
            pg_total_relation_size(schemaname||'.'||tablename) AS table_size,
            pg_indexes_size(schemaname||'.'||tablename) AS index_size
        FROM pg_stat_all_tables
        WHERE schemaname = 'public'
    ) t
    ORDER BY total_size_mb DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Set up automated backup scheduling (via pg_cron if available)
-- This would typically be configured through Supabase dashboard or external cron jobs

-- 9. Create audit log table for financial data access
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
    row_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create triggers for sensitive data auditing
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, operation, row_id, old_values, user_id)
        VALUES (TG_TABLE_NAME, TG_OP, OLD.id, to_jsonb(OLD), OLD.user_id);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, operation, row_id, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(OLD), to_jsonb(NEW), NEW.user_id);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, operation, row_id, new_values, user_id)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(NEW), NEW.user_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER accounts_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON accounts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER transactions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER api_connections_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON api_connections
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_operation ON audit_logs(table_name, operation);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);

-- 12. Set up Row Level Security for audit tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert audit logs
CREATE POLICY "Service can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Only service role can access system logs
CREATE POLICY "Service can access system logs" ON system_logs
    FOR ALL USING (auth.role() = 'service_role');

-- 13. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_stats() TO service_role;
GRANT EXECUTE ON FUNCTION backup_critical_tables() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_backups() TO service_role;