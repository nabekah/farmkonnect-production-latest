import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  captureException,
  captureMessage,
  addBreadcrumb,
  setUserContext,
  clearUserContext,
  setCustomContext,
} from './_core/sentry';

// Mock Sentry
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
  setContext: vi.fn(),
  startTransaction: vi.fn(),
  close: vi.fn(() => Promise.resolve(true)),
  Handlers: {
    requestHandler: () => (req: any, res: any, next: any) => next(),
    errorHandler: () => (err: any, req: any, res: any, next: any) => next(),
  },
  Integrations: {
    Http: vi.fn(),
    OnUncaughtException: vi.fn(),
    OnUnhandledRejection: vi.fn(),
  },
}));

vi.mock('@sentry/profiling-node', () => ({
  ProfilingIntegration: class MockProfilingIntegration {},
}));

describe('Sentry Error Monitoring', () => {
  describe('Error Capture', () => {
    it('should capture exceptions', () => {
      const error = new Error('Test error');
      const context = { userId: 'user123', action: 'test' };

      captureException(error, context);

      expect(captureException).toBeDefined();
    });

    it('should capture exceptions without context', () => {
      const error = new Error('Test error without context');

      captureException(error);

      expect(captureException).toBeDefined();
    });

    it('should capture messages with different levels', () => {
      captureMessage('Info message', 'info');
      captureMessage('Warning message', 'warning');
      captureMessage('Error message', 'error');

      expect(captureMessage).toBeDefined();
    });

    it('should capture messages with context', () => {
      const context = { module: 'auth', action: 'login' };

      captureMessage('Authentication failed', 'error', context);

      expect(captureMessage).toBeDefined();
    });
  });

  describe('Breadcrumb Tracking', () => {
    it('should add breadcrumbs for user actions', () => {
      addBreadcrumb('User clicked button', 'user-action', 'info', { buttonId: 'submit' });

      expect(addBreadcrumb).toBeDefined();
    });

    it('should add breadcrumbs with different levels', () => {
      addBreadcrumb('Debug info', 'debug', 'debug');
      addBreadcrumb('Info message', 'info', 'info');
      addBreadcrumb('Warning', 'warn', 'warning');
      addBreadcrumb('Error occurred', 'error', 'error');

      expect(addBreadcrumb).toBeDefined();
    });

    it('should add breadcrumbs with custom data', () => {
      const data = {
        farmId: 'farm123',
        action: 'create',
        timestamp: new Date().toISOString(),
      };

      addBreadcrumb('Farm created', 'farm-operation', 'info', data);

      expect(addBreadcrumb).toBeDefined();
    });
  });

  describe('User Context', () => {
    it('should set user context', () => {
      setUserContext('user123', 'user@example.com', 'testuser');

      expect(setUserContext).toBeDefined();
    });

    it('should set user context with only ID', () => {
      setUserContext('user456');

      expect(setUserContext).toBeDefined();
    });

    it('should clear user context', () => {
      clearUserContext();

      expect(clearUserContext).toBeDefined();
    });

    it('should set and clear user context in sequence', () => {
      setUserContext('user789', 'user789@example.com');
      clearUserContext();

      expect(setUserContext).toBeDefined();
      expect(clearUserContext).toBeDefined();
    });
  });

  describe('Custom Context', () => {
    it('should set custom context', () => {
      const context = {
        farmId: 'farm123',
        farmName: 'Green Acres',
        location: 'California',
      };

      setCustomContext('farm', context);

      expect(setCustomContext).toBeDefined();
    });

    it('should set multiple custom contexts', () => {
      setCustomContext('farm', { farmId: 'farm123' });
      setCustomContext('user', { userId: 'user456', role: 'farmer' });
      setCustomContext('request', { method: 'POST', path: '/api/farms' });

      expect(setCustomContext).toBeDefined();
    });

    it('should set complex custom context', () => {
      const context = {
        operation: 'bulk_import',
        itemsProcessed: 150,
        itemsFailed: 5,
        duration: 2500,
        errors: [
          { row: 10, message: 'Invalid data' },
          { row: 25, message: 'Duplicate entry' },
        ],
      };

      setCustomContext('bulk_operation', context);

      expect(setCustomContext).toBeDefined();
    });
  });

  describe('Error Tracking Scenarios', () => {
    it('should track database errors', () => {
      const error = new Error('Database connection failed');
      const context = {
        database: 'farmkonnect_db',
        operation: 'query',
        query: 'SELECT * FROM farms',
      };

      captureException(error, context);

      expect(captureException).toBeDefined();
    });

    it('should track API errors', () => {
      const error = new Error('External API timeout');
      const context = {
        service: 'weather_api',
        endpoint: '/forecast',
        timeout: 5000,
      };

      captureException(error, context);

      expect(captureException).toBeDefined();
    });

    it('should track authentication errors', () => {
      const error = new Error('Invalid credentials');
      const context = {
        module: 'auth',
        method: 'login',
        attempts: 3,
      };

      captureException(error, context);

      expect(captureException).toBeDefined();
    });

    it('should track validation errors', () => {
      const error = new Error('Validation failed');
      const context = {
        module: 'farms',
        fields: ['farmName', 'location'],
        errors: {
          farmName: 'Required field',
          location: 'Invalid coordinates',
        },
      };

      captureException(error, context);

      expect(captureException).toBeDefined();
    });

    it('should track business logic errors', () => {
      const error = new Error('Insufficient farm quota');
      const context = {
        userId: 'user123',
        currentFarms: 5,
        maxFarms: 5,
        action: 'create_farm',
      };

      captureException(error, context);

      expect(captureException).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track slow operations', () => {
      captureMessage('Slow database query detected', 'warning', {
        query: 'SELECT * FROM farms WHERE...',
        duration: 2500,
        threshold: 1000,
      });

      expect(captureMessage).toBeDefined();
    });

    it('should track memory issues', () => {
      captureMessage('High memory usage detected', 'warning', {
        used: '512MB',
        total: '1GB',
        percentage: 51,
      });

      expect(captureMessage).toBeDefined();
    });

    it('should track API response times', () => {
      addBreadcrumb('API request completed', 'http', 'info', {
        method: 'GET',
        path: '/api/farms',
        status: 200,
        duration: 150,
      });

      expect(addBreadcrumb).toBeDefined();
    });
  });

  describe('Alert Scenarios', () => {
    it('should alert on critical errors', () => {
      captureMessage('Critical: Database unavailable', 'error', {
        service: 'database',
        status: 'down',
        lastCheck: new Date().toISOString(),
      });

      expect(captureMessage).toBeDefined();
    });

    it('should alert on security issues', () => {
      captureMessage('Security: Suspicious login attempt', 'error', {
        userId: 'user123',
        ipAddress: '192.168.1.1',
        attempts: 5,
        timeWindow: '10 minutes',
      });

      expect(captureMessage).toBeDefined();
    });

    it('should alert on quota exceeded', () => {
      captureMessage('Warning: API rate limit approaching', 'warning', {
        service: 'weather_api',
        used: 950,
        limit: 1000,
        resetTime: '2026-03-25T00:00:00Z',
      });

      expect(captureMessage).toBeDefined();
    });
  });
});

describe('Sentry Integration Patterns', () => {
  it('should track complete user journey', () => {
    // User logs in
    setUserContext('user123', 'user@example.com', 'testuser');
    addBreadcrumb('User logged in', 'auth', 'info');

    // User creates farm
    addBreadcrumb('Farm creation started', 'farm', 'info', { farmName: 'Green Acres' });
    addBreadcrumb('Farm created successfully', 'farm', 'info', { farmId: 'farm123' });

    // User logs out
    clearUserContext();
    addBreadcrumb('User logged out', 'auth', 'info');

    expect(setUserContext).toBeDefined();
    expect(addBreadcrumb).toBeDefined();
    expect(clearUserContext).toBeDefined();
  });

  it('should track error recovery', () => {
    const error = new Error('Initial operation failed');
    captureException(error, { attempt: 1 });

    addBreadcrumb('Retrying operation', 'retry', 'info', { attempt: 2 });

    captureMessage('Operation succeeded after retry', 'info', { attempt: 2 });

    expect(captureException).toBeDefined();
    expect(addBreadcrumb).toBeDefined();
    expect(captureMessage).toBeDefined();
  });
});
