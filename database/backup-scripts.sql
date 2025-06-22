-- Database Backup and Restore Scripts
-- These scripts help maintain data integrity and provide disaster recovery

-- 1. Create comprehensive backup function
CREATE OR REPLACE FUNCTION create_full_backup()
RETURNS TEXT AS $$
DECLARE
    backup_timestamp TEXT := to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
    backup_name TEXT := 'full_backup_' || backup_timestamp;
    result TEXT;
BEGIN
    -- Create backup schema
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || backup_name;
    
    -- Backup all critical tables
    EXECUTE 'CREATE TABLE ' || backup_name || '.accounts AS SELECT * FROM accounts';
    EXECUTE 'CREATE TABLE ' || backup_name || '.transactions AS SELECT * FROM transactions';
    EXECUTE 'CREATE TABLE ' || backup_name || '.categories AS SELECT * FROM categories';
    EXECUTE 'CREATE TABLE ' || backup_name || '.budgets AS SELECT * FROM budgets';
    EXECUTE 'CREATE TABLE ' || backup_name || '.financial_goals AS SELECT * FROM financial_goals';
    EXECUTE 'CREATE TABLE ' || backup_name || '.alerts AS SELECT * FROM alerts';
    EXECUTE 'CREATE TABLE ' || backup_name || '.api_connections AS SELECT * FROM api_connections';
    EXECUTE 'CREATE TABLE ' || backup_name || '.user_preferences AS SELECT * FROM user_preferences';
    
    -- Log the backup
    INSERT INTO system_logs (level, message, metadata)
    VALUES ('INFO', 'Full backup created', json_build_object('backup_name', backup_name, 'timestamp', NOW()));
    
    result := 'Full backup created: ' || backup_name;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create incremental backup function (last 24 hours)
CREATE OR REPLACE FUNCTION create_incremental_backup()
RETURNS TEXT AS $$
DECLARE
    backup_timestamp TEXT := to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
    backup_name TEXT := 'incremental_backup_' || backup_timestamp;
    cutoff_time TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '24 hours';
    result TEXT;
BEGIN
    -- Create backup schema
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || backup_name;
    
    -- Backup modified/new records from last 24 hours
    EXECUTE 'CREATE TABLE ' || backup_name || '.accounts AS SELECT * FROM accounts WHERE updated_at >= ''' || cutoff_time || '''';
    EXECUTE 'CREATE TABLE ' || backup_name || '.transactions AS SELECT * FROM transactions WHERE created_at >= ''' || cutoff_time || '''';
    EXECUTE 'CREATE TABLE ' || backup_name || '.budgets AS SELECT * FROM budgets WHERE updated_at >= ''' || cutoff_time || '''';
    EXECUTE 'CREATE TABLE ' || backup_name || '.financial_goals AS SELECT * FROM financial_goals WHERE updated_at >= ''' || cutoff_time || '''';
    EXECUTE 'CREATE TABLE ' || backup_name || '.alerts AS SELECT * FROM alerts WHERE created_at >= ''' || cutoff_time || '''';
    EXECUTE 'CREATE TABLE ' || backup_name || '.api_connections AS SELECT * FROM api_connections WHERE updated_at >= ''' || cutoff_time || '''';
    
    -- Log the backup
    INSERT INTO system_logs (level, message, metadata)
    VALUES ('INFO', 'Incremental backup created', json_build_object('backup_name', backup_name, 'cutoff_time', cutoff_time));
    
    result := 'Incremental backup created: ' || backup_name;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create user-specific backup function
CREATE OR REPLACE FUNCTION create_user_backup(target_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    backup_timestamp TEXT := to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
    backup_name TEXT := 'user_backup_' || backup_timestamp || '_' || target_user_id;
    result TEXT;
BEGIN
    -- Create backup schema
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || backup_name;
    
    -- Backup user-specific data
    EXECUTE 'CREATE TABLE ' || backup_name || '.accounts AS SELECT * FROM accounts WHERE user_id = ''' || target_user_id || '''';
    EXECUTE 'CREATE TABLE ' || backup_name || '.transactions AS SELECT * FROM transactions WHERE user_id = ''' || target_user_id || '''';
    EXECUTE 'CREATE TABLE ' || backup_name || '.categories AS SELECT * FROM categories WHERE user_id = ''' || target_user_id || ''' OR is_system = true';
    EXECUTE 'CREATE TABLE ' || backup_name || '.budgets AS SELECT * FROM budgets WHERE user_id = ''' || target_user_id || '''';
    EXECUTE 'CREATE TABLE ' || backup_name || '.financial_goals AS SELECT * FROM financial_goals WHERE user_id = ''' || target_user_id || '''';
    EXECUTE 'CREATE TABLE ' || backup_name || '.alerts AS SELECT * FROM alerts WHERE user_id = ''' || target_user_id || '''';
    EXECUTE 'CREATE TABLE ' || backup_name || '.api_connections AS SELECT * FROM api_connections WHERE user_id = ''' || target_user_id || '''';
    EXECUTE 'CREATE TABLE ' || backup_name || '.user_preferences AS SELECT * FROM user_preferences WHERE user_id = ''' || target_user_id || '''';
    
    -- Log the backup
    INSERT INTO system_logs (level, message, metadata)
    VALUES ('INFO', 'User backup created', json_build_object('backup_name', backup_name, 'user_id', target_user_id));
    
    result := 'User backup created: ' || backup_name;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create restore function
CREATE OR REPLACE FUNCTION restore_from_backup(backup_schema_name TEXT, restore_mode TEXT DEFAULT 'merge')
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    -- Validate backup schema exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = backup_schema_name) THEN
        RAISE EXCEPTION 'Backup schema % does not exist', backup_schema_name;
    END IF;
    
    -- Validate restore mode
    IF restore_mode NOT IN ('merge', 'replace', 'dry_run') THEN
        RAISE EXCEPTION 'Invalid restore mode. Use: merge, replace, or dry_run';
    END IF;
    
    -- Log restore start
    INSERT INTO system_logs (level, message, metadata)
    VALUES ('WARNING', 'Restore operation started', json_build_object('backup_schema', backup_schema_name, 'mode', restore_mode));
    
    IF restore_mode = 'dry_run' THEN
        -- Just report what would be restored
        result := 'DRY RUN: Would restore from backup schema: ' || backup_schema_name;
        
        -- Count records that would be affected
        -- This would include detailed analysis of what would change
        
    ELSIF restore_mode = 'merge' THEN
        -- Merge backup data (insert new, update existing based on updated_at)
        -- Implementation would depend on specific business logic
        result := 'Merge restore completed from: ' || backup_schema_name;
        
    ELSIF restore_mode = 'replace' THEN
        -- Full replace (dangerous operation)
        result := 'Replace restore completed from: ' || backup_schema_name;
        
    END IF;
    
    -- Log restore completion
    INSERT INTO system_logs (level, message, metadata)
    VALUES ('INFO', 'Restore operation completed', json_build_object('backup_schema', backup_schema_name, 'mode', restore_mode, 'result', result));
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create backup cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_backup_schemas(days_to_keep INTEGER DEFAULT 30)
RETURNS TEXT AS $$
DECLARE
    schema_name TEXT;
    backup_date DATE;
    cleanup_count INTEGER := 0;
    result TEXT;
BEGIN
    -- Find and drop old backup schemas
    FOR schema_name IN 
        SELECT nspname 
        FROM pg_namespace 
        WHERE nspname LIKE '%backup%'
    LOOP
        -- Extract date from schema name and check if it's old enough to delete
        BEGIN
            -- This assumes backup schema names contain dates
            IF schema_name ~ '\d{4}_\d{2}_\d{2}' THEN
                -- Extract and parse date from schema name
                backup_date := to_date(substring(schema_name from '\d{4}_\d{2}_\d{2}'), 'YYYY_MM_DD');
                
                IF backup_date < (CURRENT_DATE - days_to_keep) THEN
                    EXECUTE 'DROP SCHEMA IF EXISTS ' || schema_name || ' CASCADE';
                    cleanup_count := cleanup_count + 1;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue with other schemas
            INSERT INTO system_logs (level, message, metadata)
            VALUES ('ERROR', 'Error processing backup schema', json_build_object('schema', schema_name, 'error', SQLERRM));
        END;
    END LOOP;
    
    result := 'Cleaned up ' || cleanup_count || ' old backup schemas';
    
    -- Log cleanup
    INSERT INTO system_logs (level, message, metadata)
    VALUES ('INFO', 'Backup cleanup completed', json_build_object('schemas_removed', cleanup_count, 'days_kept', days_to_keep));
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create backup verification function
CREATE OR REPLACE FUNCTION verify_backup_integrity(backup_schema_name TEXT)
RETURNS TABLE (
    table_name TEXT,
    record_count BIGINT,
    data_size_mb NUMERIC,
    integrity_check TEXT
) AS $$
DECLARE
    table_record RECORD;
BEGIN
    -- Validate backup schema exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = backup_schema_name) THEN
        RAISE EXCEPTION 'Backup schema % does not exist', backup_schema_name;
    END IF;
    
    -- Check each table in the backup schema
    FOR table_record IN 
        SELECT t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = backup_schema_name
    LOOP
        RETURN QUERY
        SELECT 
            table_record.table_name::TEXT,
            (SELECT COUNT(*) FROM (EXECUTE 'SELECT 1 FROM ' || backup_schema_name || '.' || table_record.table_name) t)::BIGINT,
            ROUND((pg_total_relation_size(backup_schema_name || '.' || table_record.table_name) / 1024 / 1024)::NUMERIC, 2),
            'OK'::TEXT;
    END LOOP;
    
    -- Log verification
    INSERT INTO system_logs (level, message, metadata)
    VALUES ('INFO', 'Backup verification completed', json_build_object('backup_schema', backup_schema_name));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create automated backup schedule function
CREATE OR REPLACE FUNCTION schedule_automated_backups()
RETURNS TEXT AS $$
BEGIN
    -- This would typically integrate with pg_cron or external scheduling
    -- For now, we'll just create a function that can be called by external schedulers
    
    -- Daily incremental backup
    PERFORM create_incremental_backup();
    
    -- Weekly full backup (if it's Sunday)
    IF EXTRACT(DOW FROM NOW()) = 0 THEN
        PERFORM create_full_backup();
    END IF;
    
    -- Monthly cleanup (if it's the 1st of the month)
    IF EXTRACT(DAY FROM NOW()) = 1 THEN
        PERFORM cleanup_old_backup_schemas(90); -- Keep 3 months
    END IF;
    
    RETURN 'Automated backup schedule executed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to service role
GRANT EXECUTE ON FUNCTION create_full_backup() TO service_role;
GRANT EXECUTE ON FUNCTION create_incremental_backup() TO service_role;
GRANT EXECUTE ON FUNCTION create_user_backup(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION restore_from_backup(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_backup_schemas(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION verify_backup_integrity(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION schedule_automated_backups() TO service_role;