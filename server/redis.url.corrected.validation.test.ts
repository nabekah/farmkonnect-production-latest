import { describe, it, expect } from 'vitest';

/**
 * Redis URL Corrected Validation Tests
 * Validates that Redis URL uses correct private domain
 */

describe('Redis URL Corrected Validation', () => {
  it('should have REDIS_URL configured', () => {
    const redisUrl = process.env.REDIS_URL;
    expect(redisUrl).toBeDefined();
    expect(redisUrl).toBeTruthy();
  });

  it('should use correct private domain redis.railway.internal', () => {
    const redisUrl = process.env.REDIS_URL;
    expect(redisUrl).toContain('redis.railway.internal');
  });

  it('should not use incorrect railway.internal domain', () => {
    const redisUrl = process.env.REDIS_URL;
    // Should NOT contain just "railway.internal" without "redis." prefix
    expect(redisUrl).not.toMatch(/^redis:\/\/[^@]*@railway\.internal/);
  });

  it('should have correct Redis URL format', () => {
    const redisUrl = process.env.REDIS_URL;
    const redisUrlRegex = /^redis:\/\/default:[^@]+@redis\.railway\.internal:6379\/0$/;
    expect(redisUrl).toMatch(redisUrlRegex);
  });

  it('should have authentication credentials', () => {
    const redisUrl = process.env.REDIS_URL;
    expect(redisUrl).toContain('default:');
    expect(redisUrl).toContain('@');
  });

  it('should use port 6379', () => {
    const redisUrl = process.env.REDIS_URL;
    expect(redisUrl).toContain(':6379');
  });

  it('should use database 0', () => {
    const redisUrl = process.env.REDIS_URL;
    expect(redisUrl).toContain('/0');
  });

  it('should be production-ready Redis URL', () => {
    const redisUrl = process.env.REDIS_URL;
    const isValid =
      redisUrl?.startsWith('redis://') &&
      redisUrl?.includes('redis.railway.internal') &&
      redisUrl?.includes(':6379/0');
    expect(isValid).toBe(true);
  });
});
