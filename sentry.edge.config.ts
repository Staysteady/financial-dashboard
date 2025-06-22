import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Set tracesSampleRate to 1.0 to capture 100%
  // of the transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Configure the scope used for this client
  beforeSend(event, hint) {
    // Filter sensitive financial data from error reports
    if (event.extra) {
      // Remove any potential financial data from extra context
      const sensitiveKeys = ['account_number', 'sort_code', 'api_key', 'token', 'password', 'balance'];
      sensitiveKeys.forEach(key => {
        if (event.extra && typeof event.extra === 'object') {
          Object.keys(event.extra).forEach(extraKey => {
            if (extraKey.toLowerCase().includes(key)) {
              event.extra![extraKey] = '[Filtered]';
            }
          });
        }
      });
    }
    
    return event;
  },
  
  // Configure additional options
  environment: process.env.NODE_ENV,
  
  // Set up custom error boundaries for edge runtime
  beforeSendTransaction(event) {
    // Add custom tags for edge operations
    event.tags = {
      ...event.tags,
      'runtime': 'edge',
      'financial.operation': event.transaction?.includes('/api/') || false
    };
    
    return event;
  },
  
  // Configure release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
});