import { AlertResult } from './alert-engine';
import { UserPreferences } from '@/types';

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'in_app';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  htmlBody?: string;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
}

export interface NotificationPreferences {
  channels: NotificationChannel[];
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
  };
  frequency: {
    immediate: boolean;
    daily: boolean;
    weekly: boolean;
  };
  severityFilters: {
    low: boolean;
    medium: boolean;
    high: boolean;
    critical: boolean;
  };
}

export interface NotificationHistory {
  id: string;
  userId: string;
  alertId: string;
  channel: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  sentAt: string;
  deliveredAt?: string;
  error?: string;
  retryCount: number;
}

export class NotificationService {
  private emailConfig: EmailConfig;
  private templates: Map<string, NotificationTemplate>;

  constructor(emailConfig: EmailConfig) {
    this.emailConfig = emailConfig;
    this.templates = new Map();
    this.initializeTemplates();
  }

  /**
   * Send notifications for triggered alerts
   */
  async sendNotifications(
    userId: string,
    alertResults: AlertResult[],
    preferences: NotificationPreferences
  ): Promise<NotificationHistory[]> {
    const triggeredAlerts = alertResults.filter(result => result.triggered);
    const notifications: NotificationHistory[] = [];

    // Check quiet hours
    if (this.isQuietHours(preferences.quietHours)) {
      console.log('In quiet hours - scheduling notifications for later');
      return this.scheduleForLater(userId, triggeredAlerts, preferences);
    }

    for (const alert of triggeredAlerts) {
      // Check severity filter
      if (!preferences.severityFilters[alert.severity]) {
        continue;
      }

      // Send to each enabled channel
      for (const channel of preferences.channels) {
        if (!channel.enabled) continue;

        const notification = await this.sendToChannel(
          userId,
          alert,
          channel,
          preferences
        );
        notifications.push(notification);
      }
    }

    return notifications;
  }

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(
    userId: string,
    alert: AlertResult,
    channel: NotificationChannel,
    preferences: NotificationPreferences
  ): Promise<NotificationHistory> {
    const notificationId = `${userId}-${alert.rule.id}-${Date.now()}`;
    
    const notification: NotificationHistory = {
      id: notificationId,
      userId,
      alertId: alert.rule.id,
      channel: channel.type,
      status: 'pending',
      sentAt: new Date().toISOString(),
      retryCount: 0
    };

    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmail(userId, alert, channel.config);
          break;
        case 'sms':
          await this.sendSMS(userId, alert, channel.config);
          break;
        case 'push':
          await this.sendPushNotification(userId, alert, channel.config);
          break;
        case 'in_app':
          await this.sendInAppNotification(userId, alert);
          break;
      }

      notification.status = 'sent';
      notification.deliveredAt = new Date().toISOString();
    } catch (error) {
      notification.status = 'failed';
      notification.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to send ${channel.type} notification:`, error);
    }

    return notification;
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    userId: string,
    alert: AlertResult,
    config?: Record<string, any>
  ): Promise<void> {
    const template = this.getTemplate(alert.rule.type);
    const personalizedTemplate = this.personalizeTemplate(template, alert);

    // In a real implementation, you would use a service like SendGrid, AWS SES, or nodemailer
    console.log('Sending email notification:', {
      to: config?.email || 'user@example.com',
      subject: personalizedTemplate.subject,
      body: personalizedTemplate.body,
      html: personalizedTemplate.htmlBody
    });

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For actual implementation:
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      host: this.emailConfig.smtpHost,
      port: this.emailConfig.smtpPort,
      secure: this.emailConfig.smtpPort === 465,
      auth: {
        user: this.emailConfig.smtpUser,
        pass: this.emailConfig.smtpPass
      }
    });

    await transporter.sendMail({
      from: `${this.emailConfig.fromName} <${this.emailConfig.fromEmail}>`,
      to: config?.email,
      subject: personalizedTemplate.subject,
      text: personalizedTemplate.body,
      html: personalizedTemplate.htmlBody
    });
    */
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(
    userId: string,
    alert: AlertResult,
    config?: Record<string, any>
  ): Promise<void> {
    const template = this.getTemplate(alert.rule.type);
    const message = this.personalizeTemplate(template, alert).body;

    console.log('Sending SMS notification:', {
      to: config?.phoneNumber || '+44XXXXXXXXXX',
      message: message.substring(0, 160) // SMS character limit
    });

    // Simulate SMS sending
    await new Promise(resolve => setTimeout(resolve, 500));

    // For actual implementation, you would use Twilio, AWS SNS, or similar:
    /*
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);
    
    await client.messages.create({
      body: message.substring(0, 160),
      from: '+44XXXXXXXXXX',
      to: config?.phoneNumber
    });
    */
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    userId: string,
    alert: AlertResult,
    config?: Record<string, any>
  ): Promise<void> {
    const template = this.getTemplate(alert.rule.type);
    const personalizedTemplate = this.personalizeTemplate(template, alert);

    console.log('Sending push notification:', {
      userId,
      title: personalizedTemplate.subject,
      body: personalizedTemplate.body,
      data: alert.data
    });

    // Simulate push notification
    await new Promise(resolve => setTimeout(resolve, 300));

    // For actual implementation, you would use Firebase Cloud Messaging, Apple Push Notifications, etc.
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(
    userId: string,
    alert: AlertResult
  ): Promise<void> {
    const template = this.getTemplate(alert.rule.type);
    const personalizedTemplate = this.personalizeTemplate(template, alert);

    console.log('Creating in-app notification:', {
      userId,
      title: personalizedTemplate.subject,
      message: personalizedTemplate.body,
      severity: alert.severity,
      data: alert.data
    });

    // In a real implementation, this would save to database
    // and trigger real-time updates via WebSocket or Server-Sent Events
  }

  /**
   * Initialize notification templates
   */
  private initializeTemplates(): void {
    this.templates.set('low_balance', {
      subject: '🔴 Low Balance Alert',
      body: 'Your account balance has fallen below the threshold. Current balance: £{{currentValue}}. Please review your accounts.',
      htmlBody: `
        <h2>🔴 Low Balance Alert</h2>
        <p>Your account balance has fallen below the threshold.</p>
        <p><strong>Current balance:</strong> £{{currentValue}}</p>
        <p>Please review your accounts and consider transferring funds if needed.</p>
      `
    });

    this.templates.set('high_spending', {
      subject: '💰 High Spending Alert',
      body: 'Unusual spending activity detected. {{message}}',
      htmlBody: `
        <h2>💰 High Spending Alert</h2>
        <p>We've detected unusual spending activity on your account.</p>
        <p>{{message}}</p>
        <p>Please review your recent transactions to ensure everything is correct.</p>
      `
    });

    this.templates.set('projection_warning', {
      subject: '⚠️ Financial Projection Warning',
      body: 'Your financial projections indicate potential concerns. {{message}}',
      htmlBody: `
        <h2>⚠️ Financial Projection Warning</h2>
        <p>Your financial projections indicate potential concerns.</p>
        <p>{{message}}</p>
        <p>Consider reviewing your spending patterns and budget allocation.</p>
      `
    });

    this.templates.set('goal_milestone', {
      subject: '🎯 Goal Milestone Reached!',
      body: 'Congratulations! You\'ve reached a milestone on your financial goals. {{message}}',
      htmlBody: `
        <h2>🎯 Goal Milestone Reached!</h2>
        <p>Congratulations! You've reached a milestone on your financial goals.</p>
        <p>{{message}}</p>
        <p>Keep up the great work!</p>
      `
    });
  }

  /**
   * Get notification template
   */
  private getTemplate(alertType: string): NotificationTemplate {
    return this.templates.get(alertType) || {
      subject: 'Financial Alert',
      body: 'You have a new financial alert: {{message}}',
      htmlBody: '<p>You have a new financial alert: {{message}}</p>'
    };
  }

  /**
   * Personalize template with alert data
   */
  private personalizeTemplate(
    template: NotificationTemplate,
    alert: AlertResult
  ): NotificationTemplate {
    const replacements = {
      '{{message}}': alert.message,
      '{{currentValue}}': alert.currentValue?.toFixed(2) || 'N/A',
      '{{threshold}}': alert.threshold.toString(),
      '{{severity}}': alert.severity
    };

    let subject = template.subject;
    let body = template.body;
    let htmlBody = template.htmlBody || '';

    for (const [placeholder, value] of Object.entries(replacements)) {
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
      htmlBody = htmlBody.replace(new RegExp(placeholder, 'g'), value);
    }

    return { subject, body, htmlBody };
  }

  /**
   * Check if current time is in quiet hours
   */
  private isQuietHours(quietHours: NotificationPreferences['quietHours']): boolean {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      // Same day range (e.g., 22:00 to 06:00)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight range (e.g., 22:00 to 06:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Schedule notifications for later (outside quiet hours)
   */
  private async scheduleForLater(
    userId: string,
    alerts: AlertResult[],
    preferences: NotificationPreferences
  ): Promise<NotificationHistory[]> {
    // In a real implementation, this would use a job queue like Bull or Agenda
    console.log('Scheduling notifications for after quiet hours');
    return [];
  }

  /**
   * Get default notification preferences
   */
  static getDefaultPreferences(): NotificationPreferences {
    return {
      channels: [
        { type: 'email', enabled: true },
        { type: 'in_app', enabled: true },
        { type: 'sms', enabled: false },
        { type: 'push', enabled: false }
      ],
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '07:00',
        timezone: 'Europe/London'
      },
      frequency: {
        immediate: true,
        daily: false,
        weekly: false
      },
      severityFilters: {
        low: false,
        medium: true,
        high: true,
        critical: true
      }
    };
  }
}

export default NotificationService;