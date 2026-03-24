import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from 'redis';

describe('Redis Connection Validation', () => {
  let client: any;

  beforeAll(async () => {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.log('REDIS_URL not configured - skipping connection tests');
      return;
    }

    // Parse Redis URL
    console.log('Redis URL format:', redisUrl);
    
    try {
      client = createClient({
        url: redisUrl.startsWith('redis://') ? redisUrl : `redis://${redisUrl}`,
      });

      client.on('error', (err: any) => {
        console.error('Redis client error:', err);
      });

      await client.connect();
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  });

  afterAll(async () => {
    if (client) {
      await client.quit();
    }
  });

  it('should have REDIS_URL configured', () => {
    const redisUrl = process.env.REDIS_URL;
    expect(redisUrl).toBeDefined();
  });

  it('should have valid Redis URL format', () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;

    // Check if it's a valid Redis URL
    const isValidFormat = 
      redisUrl.includes(':') || // host:port format
      redisUrl.startsWith('redis://') || // Full Redis URL
      redisUrl.startsWith('rediss://'); // Secure Redis URL

    expect(isValidFormat).toBe(true);
  });

  it('should connect to Redis', async () => {
    if (!client) {
      console.log('Skipping connection test - Redis not configured');
      return;
    }

    try {
      const pong = await client.ping();
      expect(pong).toBe('PONG');
    } catch (error) {
      console.error('Redis ping failed:', error);
      throw error;
    }
  });

  it('should set and get values', async () => {
    if (!client) {
      console.log('Skipping set/get test - Redis not configured');
      return;
    }

    try {
      await client.set('test_key', 'test_value');
      const value = await client.get('test_key');
      expect(value).toBe('test_value');
      await client.del('test_key');
    } catch (error) {
      console.error('Redis set/get failed:', error);
      throw error;
    }
  });

  it('should handle expiration', async () => {
    if (!client) {
      console.log('Skipping expiration test - Redis not configured');
      return;
    }

    try {
      await client.setEx('expiring_key', 1, 'value');
      const value = await client.get('expiring_key');
      expect(value).toBe('value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const expiredValue = await client.get('expiring_key');
      expect(expiredValue).toBeNull();
    } catch (error) {
      console.error('Redis expiration test failed:', error);
      throw error;
    }
  });

  it('should get Redis info', async () => {
    if (!client) {
      console.log('Skipping info test - Redis not configured');
      return;
    }

    try {
      const info = await client.info();
      expect(info).toBeDefined();
      expect(typeof info).toBe('string');
      console.log('Redis Server Info:', info.split('\n').slice(0, 5).join('\n'));
    } catch (error) {
      console.error('Redis info test failed:', error);
      throw error;
    }
  });
});
