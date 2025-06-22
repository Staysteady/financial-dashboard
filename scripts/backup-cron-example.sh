#!/bin/bash

# Example cron job configuration for automated backups
# Add these lines to your crontab (crontab -e) for automated backups

# Set environment variables (adjust paths as needed)
export SUPABASE_URL="your_production_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
export BACKUP_ENCRYPTION_KEY="your_backup_encryption_key"
export BACKUP_STORAGE_PATH="/var/backups/financial-dashboard"
export BACKUP_RETENTION_DAYS="30"

# Ensure backup directory exists and has correct permissions
sudo mkdir -p /var/backups/financial-dashboard
sudo chown $(whoami):$(whoami) /var/backups/financial-dashboard
sudo chmod 700 /var/backups/financial-dashboard

# Cron job examples:
# Add these to your crontab with: crontab -e

# Daily incremental backup at 2:00 AM
# 0 2 * * * /usr/bin/node /path/to/financial-dashboard/scripts/backup-automation.js incremental >> /var/log/backup.log 2>&1

# Weekly full backup on Sundays at 1:00 AM  
# 0 1 * * 0 /usr/bin/node /path/to/financial-dashboard/scripts/backup-automation.js full >> /var/log/backup.log 2>&1

# Monthly cleanup on the 1st at 3:00 AM
# 0 3 1 * * /usr/bin/node /path/to/financial-dashboard/scripts/backup-automation.js cleanup >> /var/log/backup.log 2>&1

# OR use the automated routine that handles all the logic:
# Daily automated backup routine at 2:00 AM
# 0 2 * * * /usr/bin/node /path/to/financial-dashboard/scripts/backup-automation.js auto >> /var/log/backup.log 2>&1

# Verify backups weekly on Mondays at 4:00 AM (you'll need to customize this)
# 0 4 * * 1 /path/to/financial-dashboard/scripts/verify-latest-backup.sh >> /var/log/backup-verify.log 2>&1

echo "Cron job examples have been provided above."
echo "Edit this file with your actual paths and add the desired lines to your crontab."
echo ""
echo "To set up:"
echo "1. Edit the environment variables above with your actual values"
echo "2. Update the paths to match your deployment"
echo "3. Choose your preferred cron schedule"
echo "4. Add the selected lines to your crontab with: crontab -e"
echo ""
echo "Recommended setup for production:"
echo "- Daily automated backup at 2:00 AM"
echo "- Monitor /var/log/backup.log for any issues"
echo "- Set up alerting if backup logs show failures"