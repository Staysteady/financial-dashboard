import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Set tracesSampleRate to 1.0 to capture 100%
  // of the transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Configure the scope used for this client
  beforeSend(event, hint) {
    // Filter out non-critical errors in production
    if (process.env.NODE_ENV === 'production') {
      // Don't send network errors that are likely user-related
      if (event.exception?.values?.[0]?.type === 'NetworkError') {
        return null;
      }
      
      // Don't send errors from browser extensions
      if (event.exception?.values?.[0]?.stacktrace?.frames?.some(frame => 
        frame.filename?.includes('extension://') || 
        frame.filename?.includes('chrome-extension://')
      )) {
        return null;
      }
    }
    
    return event;
  },
  
  // Configure additional options
  environment: process.env.NODE_ENV,
  
  // Set user context for financial data tracking
  beforeSendTransaction(event) {
    // Add custom tags for financial operations
    if (event.transaction?.includes('/api/')) {
      event.tags = {
        ...event.tags,
        'transaction.type': 'api',
        'financial.operation': true
      };
    }
    
    return event;
  },
  
  // Configure integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask sensitive financial data in replays
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
});