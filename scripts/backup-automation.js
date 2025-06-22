#!/usr/bin/env node

/**
 * Automated Backup Script for Financial Dashboard
 * This script handles automated database backups and can be run via cron jobs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKUP_ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
const BACKUP_STORAGE_PATH = process.env.BACKUP_STORAGE_PATH || './backups';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;

class BackupManager {
  constructor() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    }
    
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    this.backupPath = BACKUP_STORAGE_PATH;
  }

  // Initialize backup directory
  async initializeBackupDirectory() {
    try {
      await fs.mkdir(this.backupPath, { recursive: true });
      console.log(`✅ Backup directory initialized: ${this.backupPath}`);
    } catch (error) {
      console.error('❌ Failed to initialize backup directory:', error);
      throw error;
    }
  }

  // Create full database backup
  async createFullBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `full_backup_${timestamp}`;
    
    console.log(`🔄 Starting full backup: ${backupId}`);
    
    try {
      // Tables to backup (critical financial data)
      const tables = [
        'accounts',
        'transactions', 
        'categories',
        'budgets',
        'financial_goals',
        'alerts',
        'api_connections',
        'user_preferences'
      ];

      const backupData = {};
      
      for (const table of tables) {
        console.log(`📊 Backing up table: ${table}`);
        const { data, error } = await this.supabase
          .from(table)
          .select('*');
          
        if (error) {
          console.error(`❌ Error backing up ${table}:`, error);
          throw error;
        }
        
        backupData[table] = data;
        console.log(`✅ Backed up ${data?.length || 0} records from ${table}`);
      }

      // Add metadata
      backupData._metadata = {
        backup_id: backupId,
        created_at: new Date().toISOString(),
        type: 'full_backup',
        version: '1.0',
        tables: tables,
        total_records: Object.values(backupData)
          .filter(data => Array.isArray(data))
          .reduce((total, data) => total + data.length, 0)
      };

      // Save backup
      await this.saveBackup(backupId, backupData);
      
      // Log backup completion to database
      await this.logBackupCompletion(backupId, 'full', true);
      
      console.log(`✅ Full backup completed: ${backupId}`);
      return backupId;
      
    } catch (error) {
      console.error('❌ Full backup failed:', error);
      await this.logBackupCompletion(backupId, 'full', false, error.message);
      throw error;
    }
  }

  // Create incremental backup (last 24 hours)
  async createIncrementalBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `incremental_backup_${timestamp}`;
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    console.log(`🔄 Starting incremental backup: ${backupId}`);
    console.log(`📅 Cutoff time: ${cutoffTime}`);
    
    try {
      const backupData = {};
      
      // Backup recently modified accounts
      const { data: accounts, error: accountsError } = await this.supabase
        .from('accounts')
        .select('*')
        .gte('updated_at', cutoffTime);
      
      if (accountsError) throw accountsError;
      
      // Backup recent transactions
      const { data: transactions, error: transactionsError } = await this.supabase
        .from('transactions')
        .select('*')
        .gte('created_at', cutoffTime);
      
      if (transactionsError) throw transactionsError;
      
      // Backup recently modified budgets
      const { data: budgets, error: budgetsError } = await this.supabase
        .from('budgets')
        .select('*')
        .gte('updated_at', cutoffTime);
      
      if (budgetsError) throw budgetsError;

      // Backup recent alerts
      const { data: alerts, error: alertsError } = await this.supabase
        .from('alerts')
        .select('*')
        .gte('created_at', cutoffTime);
      
      if (alertsError) throw alertsError;

      backupData.accounts = accounts;
      backupData.transactions = transactions;
      backupData.budgets = budgets;
      backupData.alerts = alerts;

      // Add metadata
      backupData._metadata = {
        backup_id: backupId,
        created_at: new Date().toISOString(),
        type: 'incremental_backup',
        cutoff_time: cutoffTime,
        version: '1.0',
        record_counts: {
          accounts: accounts?.length || 0,
          transactions: transactions?.length || 0,
          budgets: budgets?.length || 0,
          alerts: alerts?.length || 0
        }
      };

      const totalRecords = Object.values(backupData.record_counts || {})
        .reduce((total, count) => total + count, 0);

      if (totalRecords === 0) {
        console.log('ℹ️ No new records to backup in the last 24 hours');
        return null;
      }

      // Save backup
      await this.saveBackup(backupId, backupData);
      
      // Log backup completion
      await this.logBackupCompletion(backupId, 'incremental', true);
      
      console.log(`✅ Incremental backup completed: ${backupId} (${totalRecords} records)`);
      return backupId;
      
    } catch (error) {
      console.error('❌ Incremental backup failed:', error);
      await this.logBackupCompletion(backupId, 'incremental', false, error.message);
      throw error;
    }
  }

  // Save backup to file system (encrypted)
  async saveBackup(backupId, data) {
    const filename = `${backupId}.backup`;
    const filepath = path.join(this.backupPath, filename);
    
    try {
      // Convert to JSON
      const jsonData = JSON.stringify(data, null, 2);
      
      // Encrypt if encryption key is available
      let finalData = jsonData;
      if (BACKUP_ENCRYPTION_KEY) {
        finalData = this.encryptData(jsonData, BACKUP_ENCRYPTION_KEY);
        console.log('🔐 Backup encrypted');
      } else {
        console.log('⚠️ Backup saved unencrypted (no encryption key provided)');
      }
      
      // Write to file
      await fs.writeFile(filepath, finalData, 'utf8');
      
      // Verify file was written
      const stats = await fs.stat(filepath);
      console.log(`💾 Backup saved: ${filepath} (${Math.round(stats.size / 1024)} KB)`);
      
    } catch (error) {
      console.error('❌ Failed to save backup file:', error);
      throw error;
    }
  }

  // Encrypt backup data
  encryptData(data, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  // Clean up old backups
  async cleanupOldBackups() {
    console.log('🧹 Starting backup cleanup...');
    
    try {
      const files = await fs.readdir(this.backupPath);
      const backupFiles = files.filter(file => file.endsWith('.backup'));
      
      const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
      let deletedCount = 0;
      
      for (const file of backupFiles) {
        const filepath = path.join(this.backupPath, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filepath);
          deletedCount++;
          console.log(`🗑️ Deleted old backup: ${file}`);
        }
      }
      
      console.log(`✅ Cleanup completed: deleted ${deletedCount} old backups`);
      
    } catch (error) {
      console.error('❌ Backup cleanup failed:', error);
    }
  }

  // Log backup completion to database
  async logBackupCompletion(backupId, type, success, errorMessage = null) {
    try {
      await this.supabase
        .from('system_logs')
        .insert({
          level: success ? 'INFO' : 'ERROR',
          message: `Backup ${success ? 'completed' : 'failed'}: ${backupId}`,
          metadata: {
            backup_id: backupId,
            backup_type: type,
            success,
            error_message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('❌ Failed to log backup completion:', error);
    }
  }

  // Verify backup integrity
  async verifyBackup(backupId) {
    const filename = `${backupId}.backup`;
    const filepath = path.join(this.backupPath, filename);
    
    try {
      console.log(`🔍 Verifying backup: ${backupId}`);
      
      // Check if file exists
      await fs.access(filepath);
      
      // Read and parse backup
      const fileContent = await fs.readFile(filepath, 'utf8');
      
      let data;
      if (BACKUP_ENCRYPTION_KEY && fileContent.includes(':')) {
        // Decrypt if needed
        data = this.decryptData(fileContent, BACKUP_ENCRYPTION_KEY);
      } else {
        data = fileContent;
      }
      
      const backupData = JSON.parse(data);
      
      // Verify metadata
      if (!backupData._metadata) {
        throw new Error('Missing backup metadata');
      }
      
      console.log(`✅ Backup verification passed: ${backupId}`);
      console.log(`📊 Backup contains ${Object.keys(backupData).length - 1} tables`);
      
      if (backupData._metadata.record_counts) {
        console.log('📋 Record counts:', backupData._metadata.record_counts);
      }
      
      return true;
      
    } catch (error) {
      console.error(`❌ Backup verification failed: ${backupId}`, error);
      return false;
    }
  }

  // Decrypt backup data
  decryptData(encryptedData, key) {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Get backup status
  async getBackupStatus() {
    try {
      const files = await fs.readdir(this.backupPath);
      const backupFiles = files.filter(file => file.endsWith('.backup'));
      
      const backups = [];
      for (const file of backupFiles) {
        const filepath = path.join(this.backupPath, file);
        const stats = await fs.stat(filepath);
        
        backups.push({
          filename: file,
          size: stats.size,
          created: stats.mtime,
          age_days: Math.floor((Date.now() - stats.mtime.getTime()) / (24 * 60 * 60 * 1000))
        });
      }
      
      return {
        total_backups: backups.length,
        total_size: backups.reduce((total, backup) => total + backup.size, 0),
        oldest_backup: backups.length > 0 ? Math.max(...backups.map(b => b.age_days)) : 0,
        newest_backup: backups.length > 0 ? Math.min(...backups.map(b => b.age_days)) : 0,
        backups: backups.sort((a, b) => b.created - a.created)
      };
      
    } catch (error) {
      console.error('❌ Failed to get backup status:', error);
      return null;
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  
  try {
    const backupManager = new BackupManager();
    await backupManager.initializeBackupDirectory();
    
    switch (command) {
      case 'full':
        await backupManager.createFullBackup();
        break;
        
      case 'incremental':
        await backupManager.createIncrementalBackup();
        break;
        
      case 'cleanup':
        await backupManager.cleanupOldBackups();
        break;
        
      case 'verify':
        const backupId = process.argv[3];
        if (!backupId) {
          console.error('❌ Please provide backup ID to verify');
          process.exit(1);
        }
        await backupManager.verifyBackup(backupId);
        break;
        
      case 'status':
        const status = await backupManager.getBackupStatus();
        console.log('📊 Backup Status:');
        console.log(`   Total backups: ${status.total_backups}`);
        console.log(`   Total size: ${Math.round(status.total_size / 1024 / 1024)} MB`);
        console.log(`   Oldest backup: ${status.oldest_backup} days`);
        console.log(`   Newest backup: ${status.newest_backup} days`);
        break;
        
      case 'auto':
        // Automated backup routine (suitable for cron jobs)
        console.log('🤖 Running automated backup routine...');
        
        // Create incremental backup daily
        await backupManager.createIncrementalBackup();
        
        // Create full backup weekly (if it's Sunday)
        const today = new Date();
        if (today.getDay() === 0) {
          await backupManager.createFullBackup();
        }
        
        // Cleanup old backups monthly (if it's the 1st)
        if (today.getDate() === 1) {
          await backupManager.cleanupOldBackups();
        }
        
        console.log('✅ Automated backup routine completed');
        break;
        
      default:
        console.log('📋 Available commands:');
        console.log('   full         - Create full backup');
        console.log('   incremental  - Create incremental backup');
        console.log('   cleanup      - Clean up old backups');
        console.log('   verify <id>  - Verify backup integrity');
        console.log('   status       - Show backup status');
        console.log('   auto         - Run automated backup routine');
        break;
    }
    
  } catch (error) {
    console.error('❌ Backup operation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = BackupManager;