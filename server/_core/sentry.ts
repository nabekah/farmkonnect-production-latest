import * as Sentry from '@sentry/node';
import { logger } from './logger';

// ProfilingIntegration is optional and may not be available in all environments
let ProfilingIntegration: any = null;
try {
  const profiling = require('@sentry/profiling-node');
  ProfilingIntegration = profiling.ProfilingIntegration;
} catch (e) {
  logger.warn('Sentry profiling integration not available');
}

/**
 * Initialize Sentry error monitoring and performance tracking
 */
export function initializeSentry(): void {
  const sentryDsn = process.env.SENTRY_DSN;

  // Skip initialization if DSN not provided
  if (!sentryDsn) {
    logger.warn('SENTRY_DSN not configured, error monitoring disabled');
    return;
  }

  try {

    const integrations: any[] = [];
    if (ProfilingIntegration) {
      integrations.push(new ProfilingIntegration());
    }
    if (Sentry.Integrations?.Http) {
      integrations.push(new Sentry.Integrations.Http({ tracing: true }));
    }
    if (Sentry.Integrations?.OnUncaughtException) {
      integrations.push(new Sentry.Integrations.OnUncaughtException());
    }
    if (Sentry.Integrations?.OnUnhandledRejection) {
      integrations.push(new Sentry.Integrations.OnUnhandledRejection());
    }

    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      integrations,
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Release tracking
      release: process.env.APP_VERSION || '1.0.0',
      // Capture breadcrumbs
      maxBreadcrumbs: 50,
      // Attach stack traces
      attachStacktrace: true,
    });

    logger.info('Sentry initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Sentry:', error);
  }
}

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return !!process.env.SENTRY_DSN;
}

/**
 * Capture exception with context
 */
export function captureException(
  error: Error,
  context?: Record<string, any>
): void {
  if (context) {
    Sentry.captureException(error, {
      contexts: {
        custom: context,
      },
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture message (info, warning, error)
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, any>
): void {
  if (context) {
    Sentry.captureMessage(message, {
      level,
      contexts: {
        custom: context,
      },
    });
  } else {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  message: string,
  category: string = 'user-action',
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string, username?: string): void {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Set custom context for errors
 */
export function setCustomContext(key: string, context: Record<string, any>): void {
  Sentry.setContext(key, context);
}

/**
 * Flush pending events before shutdown
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  try {
    return await Sentry.close(timeout);
  } catch (error) {
    logger.error('Error flushing Sentry:', error);
    return false;
  }
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string = 'http.server'
): Sentry.Transaction | null {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Create a span for detailed performance tracking
 */
export function createSpan(
  transaction: Sentry.Transaction | null,
  op: string,
  description: string
): Sentry.Span | null {
  if (!transaction) return null;

  return transaction.startChild({
    op,
    description,
  });
}

/**
 * Finish a span
 */
export function finishSpan(span: Sentry.Span | null, status: string = 'ok'): void {
  if (span) {
    span.setStatus(status as any);
    span.finish();
  }
}

/**
 * Middleware for Express to capture errors
 */
export function sentryErrorHandler() {
  if (Sentry.Handlers?.errorHandler) {
    return Sentry.Handlers.errorHandler();
  }
  // Return no-op middleware if Sentry handlers not available
  return (err: any, req: any, res: any, next: any) => next(err);
}

/**
 * Middleware for Express to capture request/response
 */
export function sentryRequestHandler() {
  if (Sentry.Handlers?.requestHandler) {
    return Sentry.Handlers.requestHandler();
  }
  // Return no-op middleware if Sentry handlers not available
  return (req: any, res: any, next: any) => next();
}
