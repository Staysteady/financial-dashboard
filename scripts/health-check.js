#!/usr/bin/env node

/**
 * Health Check Script for Financial Dashboard
 * This script performs comprehensive health checks and can be used for monitoring
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs').promises;

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3001';
const HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds

class HealthChecker {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      checks: {}
    };
    
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }
  }

  // Perform all health checks
  async performHealthChecks() {
    console.log('🏥 Starting health checks...');
    
    const checks = [
      { name: 'application', fn: this.checkApplication.bind(this) },
      { name: 'database', fn: this.checkDatabase.bind(this) },
      { name: 'external_services', fn: this.checkExternalServices.bind(this) },
      { name: 'file_system', fn: this.checkFileSystem.bind(this) },
      { name: 'environment', fn: this.checkEnvironment.bind(this) },
    ];

    for (const check of checks) {
      try {
        console.log(`🔍 Checking ${check.name}...`);
        const result = await check.fn();
        this.results.checks[check.name] = {
          status: 'healthy',
          ...result
        };
        console.log(`✅ ${check.name}: healthy`);
      } catch (error) {
        this.results.checks[check.name] = {
          status: 'unhealthy',
          error: error.message,
          details: error.details || {}
        };
        console.log(`❌ ${check.name}: unhealthy - ${error.message}`);
      }
    }

    // Calculate overall health
    const unhealthyChecks = Object.values(this.results.checks)
      .filter(check => check.status === 'unhealthy');
    
    this.results.overall = unhealthyChecks.length === 0 ? 'healthy' : 'unhealthy';
    
    console.log(`\n🎯 Overall health: ${this.results.overall}`);
    return this.results;
  }

  // Check application endpoint
  async checkApplication() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const url = new URL(APP_URL);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: '/',
        method: 'GET',
        timeout: HEALTH_CHECK_TIMEOUT,
        headers: {
          'User-Agent': 'HealthCheck/1.0'
        }
      };

      const client = url.protocol === 'https:' ? https : require('http');
      
      const req = client.request(options, (res) => {
        const responseTime = Date.now() - startTime;
        
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve({
            status_code: res.statusCode,
            response_time: responseTime,
            url: APP_URL
          });
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });

      req.on('error', (err) => {
        reject(new Error(`Connection failed: ${err.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  // Check database connectivity and basic operations
  async checkDatabase() {
    if (!this.supabase) {
      throw new Error('Supabase client not configured');
    }

    const checks = {};
    
    try {
      // Test basic connectivity
      const startTime = Date.now();
      const { data, error } = await this.supabase
        .from('categories')
        .select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      checks.connectivity = {
        status: 'ok',
        response_time: Date.now() - startTime
      };

      // Test read operation
      const { data: testData, error: readError } = await this.supabase
        .from('categories')
        .select('id, name')
        .limit(1);

      if (readError) {
        throw new Error(`Database read failed: ${readError.message}`);
      }

      checks.read_operations = {
        status: 'ok',
        records_found: testData?.length || 0
      };

      // Test authentication
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      checks.auth_service = {
        status: authError ? 'degraded' : 'ok',
        error: authError?.message
      };

      return checks;
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  // Check external services
  async checkExternalServices() {
    const services = {};

    // Check Supabase status
    if (SUPABASE_URL) {
      try {
        const response = await this.makeHttpRequest('https://status.supabase.com/api/v2/status.json');
        services.supabase = {
          status: response.status?.indicator === 'none' ? 'ok' : 'degraded',
          description: response.status?.description
        };
      } catch (error) {
        services.supabase = {
          status: 'unknown',
          error: error.message
        };
      }
    }

    // Check Sentry (if configured)
    if (process.env.SENTRY_DSN) {
      try {
        // Test Sentry connectivity by making a test request
        const testUrl = new URL(process.env.SENTRY_DSN);
        await this.makeHttpRequest(`https://${testUrl.hostname}/api/0/`, { method: 'HEAD' });
        services.sentry = { status: 'ok' };
      } catch (error) {
        services.sentry = {
          status: 'degraded',
          error: error.message
        };
      }
    }

    // Check Vercel (if deployed there)
    if (process.env.VERCEL) {
      try {
        await this.makeHttpRequest('https://api.vercel.com/v1/user', {
          headers: { 'Authorization': `Bearer ${process.env.VERCEL_TOKEN}` }
        });
        services.vercel = { status: 'ok' };
      } catch (error) {
        services.vercel = {
          status: 'degraded',
          error: error.message
        };
      }
    }

    return { services };
  }

  // Check file system and permissions
  async checkFileSystem() {
    const checks = {};

    try {
      // Check if we can write to temp directory
      const tempFile = '/tmp/health-check-test';
      await fs.writeFile(tempFile, 'test', 'utf8');
      await fs.unlink(tempFile);
      
      checks.write_permissions = { status: 'ok' };
    } catch (error) {
      checks.write_permissions = {
        status: 'error',
        error: error.message
      };
    }

    try {
      // Check backup directory
      const backupPath = process.env.BACKUP_STORAGE_PATH || './backups';
      await fs.access(backupPath);
      const stats = await fs.stat(backupPath);
      
      checks.backup_directory = {
        status: 'ok',
        path: backupPath,
        accessible: true,
        is_directory: stats.isDirectory()
      };
    } catch (error) {
      checks.backup_directory = {
        status: 'warning',
        error: error.message
      };
    }

    return checks;
  }

  // Check environment configuration
  async checkEnvironment() {
    const env = {};

    // Required environment variables
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    // Optional but important environment variables
    const optional = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'ENCRYPTION_KEY',
      'SENTRY_DSN',
      'REDIS_URL'
    ];

    env.required_vars = {};
    for (const varName of required) {
      env.required_vars[varName] = {
        present: !!process.env[varName],
        length: process.env[varName]?.length || 0
      };
    }

    env.optional_vars = {};
    for (const varName of optional) {
      env.optional_vars[varName] = {
        present: !!process.env[varName],
        configured: !!process.env[varName]
      };
    }

    // Check Node.js version
    env.runtime = {
      node_version: process.version,
      platform: process.platform,
      memory_usage: process.memoryUsage(),
      uptime: process.uptime()
    };

    // Check if any required vars are missing
    const missingRequired = Object.entries(env.required_vars)
      .filter(([, config]) => !config.present)
      .map(([name]) => name);

    if (missingRequired.length > 0) {
      throw new Error(`Missing required environment variables: ${missingRequired.join(', ')}`);
    }

    return env;
  }

  // Helper method to make HTTP requests
  makeHttpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : require('http');
      
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: HEALTH_CHECK_TIMEOUT
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve(parsed);
          } catch (error) {
            resolve({ statusCode: res.statusCode, data });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  // Save health check results to file
  async saveResults(filename) {
    try {
      await fs.writeFile(filename, JSON.stringify(this.results, null, 2));
      console.log(`📊 Results saved to ${filename}`);
    } catch (error) {
      console.error(`Failed to save results: ${error.message}`);
    }
  }

  // Get summary for monitoring systems
  getSummary() {
    const unhealthyChecks = Object.entries(this.results.checks)
      .filter(([, check]) => check.status === 'unhealthy')
      .map(([name]) => name);

    return {
      status: this.results.overall,
      timestamp: this.results.timestamp,
      unhealthy_services: unhealthyChecks,
      total_checks: Object.keys(this.results.checks).length
    };
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const outputFile = process.argv[3];

  try {
    const healthChecker = new HealthChecker();
    
    switch (command) {
      case 'check':
        const results = await healthChecker.performHealthChecks();
        
        if (outputFile) {
          await healthChecker.saveResults(outputFile);
        }
        
        // Exit with error code if unhealthy
        process.exit(results.overall === 'healthy' ? 0 : 1);
        break;
        
      case 'summary':
        const quickResults = await healthChecker.performHealthChecks();
        const summary = healthChecker.getSummary();
        console.log(JSON.stringify(summary, null, 2));
        process.exit(summary.status === 'healthy' ? 0 : 1);
        break;
        
      default:
        console.log('🏥 Health Check Script');
        console.log('');
        console.log('Usage:');
        console.log('  node health-check.js check [output-file]  - Run full health check');
        console.log('  node health-check.js summary              - Run quick summary check');
        console.log('');
        console.log('Exit codes:');
        console.log('  0 - All checks passed');
        console.log('  1 - One or more checks failed');
        break;
    }
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = HealthChecker;