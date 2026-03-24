import { describe, it, expect, beforeAll } from 'vitest';
import * as Sentry from '@sentry/node';

describe('Sentry DSN Validation', () => {
  beforeAll(() => {
    // Initialize Sentry with the configured DSN
    const dsn = process.env.SENTRY_DSN;
    if (dsn) {
      Sentry.init({
        dsn,
        environment: 'test',
        tracesSampleRate: 1.0,
      });
    }
  });

  it('should have SENTRY_DSN configured', () => {
    const dsn = process.env.SENTRY_DSN;
    expect(dsn).toBeDefined();
    expect(dsn).toMatch(/^https:\/\//);
    expect(dsn).toContain('@');
    expect(dsn).toContain('ingest');
    expect(dsn).toContain('sentry.io');
  });

  it('should have valid DSN format', () => {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return;

    // Parse DSN format: https://key@org.ingest.sentry.io/project-id
    const match = dsn.match(/^https:\/\/([a-f0-9]+)@([^\/]+)\/(\d+)$/);
    expect(match).toBeTruthy();
    if (match) {
      const [, publicKey, host, projectId] = match;
      // Sentry public keys can be 32 or 64 chars
      expect(publicKey.length).toBeGreaterThanOrEqual(32);
      expect(publicKey.length).toBeLessThanOrEqual(64);
      expect(host).toContain('ingest');
      expect(host).toContain('sentry.io');
      expect(projectId).toMatch(/^\d+$/);
    }
  });

  it('should capture exceptions with Sentry', async () => {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
      console.log('Skipping Sentry capture test - DSN not configured');
      return;
    }

    try {
      throw new Error('Test error for Sentry validation');
    } catch (error) {
      const eventId = Sentry.captureException(error);
      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
    }
  });

  it('should capture messages with Sentry', () => {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
      console.log('Skipping Sentry message test - DSN not configured');
      return;
    }

    const eventId = Sentry.captureMessage('Test message for Sentry validation', 'info');
    expect(eventId).toBeDefined();
    expect(typeof eventId).toBe('string');
  });

  it('should have correct DSN structure', () => {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return;

    const url = new URL(dsn);
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toContain('ingest');
    expect(url.hostname).toContain('sentry.io');
    // Sentry public keys can be 32 or 64 chars
    expect(url.username.length).toBeGreaterThanOrEqual(32);
    expect(url.username.length).toBeLessThanOrEqual(64);
    expect(url.pathname).toMatch(/^\/\d+$/); // Project ID
  });


  it('should flush Sentry events', async () => {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
      console.log('Skipping Sentry flush test - DSN not configured');
      return;
    }

    // Capture a test event
    Sentry.captureMessage('Flush test message', 'info');

    // Flush events (wait for them to be sent)
    const flushed = await Sentry.close(2000);
    expect(flushed).toBe(true);
  });
});
