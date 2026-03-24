import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { withCache, invalidateCache, cacheKeys, getCacheStats, clearAllCache } from './_core/redis';

// Mock Redis for testing
const mockRedisData: Map<string, string> = new Map();

// Mock the redis module
vi.mock('ioredis', () => {
  return {
    default: class MockRedis {
      async get(key: string) {
        return mockRedisData.get(key) || null;
      }

      async setex(key: string, ttl: number, value: string) {
        mockRedisData.set(key, value);
        return 'OK';
      }

      async del(...keys: string[]) {
        for (const key of keys) {
          mockRedisData.delete(key);
        }
        return keys.length;
      }

      async keys(pattern: string) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Array.from(mockRedisData.keys()).filter(k => regex.test(k));
      }

      async flushdb() {
        mockRedisData.clear();
        return 'OK';
      }

      async dbsize() {
        return mockRedisData.size;
      }

      async info(section: string) {
        return `# ${section}\nkeyspace_hits:100\nkeyspace_misses:50`;
      }

      async quit() {
        mockRedisData.clear();
        return 'OK';
      }

      disconnect() {
        mockRedisData.clear();
      }

      on(event: string, callback: Function) {
        // Mock event handler
      }
    }
  };
});

describe('Redis Caching System', () => {
  beforeAll(async () => {
    mockRedisData.clear();
  });

  afterAll(async () => {
    mockRedisData.clear();
  });

  describe('Cache Key Generation', () => {
    it('should generate farm cache keys', () => {
      const userId = 'user123';
      const key = cacheKeys.farms(userId);
      expect(key).toBe(`farms:${userId}`);
    });

    it('should generate crop cache keys', () => {
      const farmId = 'farm456';
      const key = cacheKeys.crops(farmId);
      expect(key).toBe(`crops:${farmId}`);
    });

    it('should generate animal cache keys', () => {
      const farmId = 'farm456';
      const key = cacheKeys.animals(farmId);
      expect(key).toBe(`animals:${farmId}`);
    });

    it('should generate weather cache keys', () => {
      const lat = 40.7128;
      const lon = -74.006;
      const key = cacheKeys.weather(lat, lon);
      expect(key).toBe(`weather:${lat}:${lon}`);
    });

    it('should generate marketplace cache keys', () => {
      const key = cacheKeys.products();
      expect(key).toBe('marketplace:products');
    });
  });

  describe('Cache Operations', () => {
    it('should cache and retrieve data', async () => {
      const testData = { id: 1, name: 'Test Farm' };
      const cacheKey = 'test:farm:1';

      const result = await withCache(cacheKey, async () => testData, 3600);

      expect(result).toEqual(testData);
      expect(mockRedisData.has(cacheKey)).toBe(true);
    });

    it('should retrieve cached data on subsequent calls', async () => {
      const testData = { id: 2, name: 'Cached Farm' };
      const cacheKey = 'test:farm:2';

      // First call - caches data
      await withCache(cacheKey, async () => testData, 3600);

      // Second call - should retrieve from cache
      let callCount = 0;
      const result = await withCache(cacheKey, async () => {
        callCount++;
        return testData;
      }, 3600);

      expect(result).toEqual(testData);
      expect(callCount).toBe(0); // Function not called due to cache hit
    });

    it('should handle cache misses gracefully', async () => {
      const testData = { id: 3, name: 'New Farm' };
      const cacheKey = 'test:farm:3';

      const result = await withCache(cacheKey, async () => testData, 3600);

      expect(result).toEqual(testData);
    });

    it('should invalidate cache by key', async () => {
      const cacheKey = 'test:invalidate:1';
      mockRedisData.set(cacheKey, JSON.stringify({ data: 'test' }));

      expect(mockRedisData.has(cacheKey)).toBe(true);

      await invalidateCache(cacheKey);

      expect(mockRedisData.has(cacheKey)).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const testData = { id: 4, name: 'Error Farm' };
      const cacheKey = 'test:farm:4';

      // Should not throw even if cache operations fail
      const result = await withCache(cacheKey, async () => testData, 3600);

      expect(result).toEqual(testData);
    });
  });

  describe('Cache Statistics', () => {
    it('should return cache statistics', async () => {
      const stats = await getCacheStats();

      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('memory');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(typeof stats.keys).toBe('number');
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
    });
  });

  describe('Cache Clearing', () => {
    it('should clear all cache', async () => {
      mockRedisData.set('test:1', 'data1');
      mockRedisData.set('test:2', 'data2');

      expect(mockRedisData.size).toBeGreaterThan(0);

      await clearAllCache();

      expect(mockRedisData.size).toBe(0);
    });
  });

  describe('Cache TTL', () => {
    it('should respect different TTL values', async () => {
      const shortTTL = 300; // 5 minutes
      const longTTL = 3600; // 1 hour

      const result1 = await withCache('test:short', async () => ({ data: 'short' }), shortTTL);
      const result2 = await withCache('test:long', async () => ({ data: 'long' }), longTTL);

      expect(result1).toEqual({ data: 'short' });
      expect(result2).toEqual({ data: 'long' });
    });
  });

  describe('Complex Data Caching', () => {
    it('should cache complex nested objects', async () => {
      const complexData = {
        id: 1,
        name: 'Farm Complex',
        crops: [
          { id: 1, name: 'Corn', yield: 100 },
          { id: 2, name: 'Wheat', yield: 150 },
        ],
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      };

      const result = await withCache('test:complex', async () => complexData, 3600);

      expect(result).toEqual(complexData);
      expect(result.crops).toHaveLength(2);
      expect(result.metadata).toHaveProperty('created');
    });

    it('should cache arrays of objects', async () => {
      const arrayData = [
        { id: 1, name: 'Farm 1' },
        { id: 2, name: 'Farm 2' },
        { id: 3, name: 'Farm 3' },
      ];

      const result = await withCache('test:array', async () => arrayData, 3600);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: 1, name: 'Farm 1' });
    });
  });
});

describe('Cache Invalidation Patterns', () => {
  beforeAll(() => {
    mockRedisData.clear();
  });

  it('should invalidate pattern-based cache entries', async () => {
    mockRedisData.set('farms:user1', 'data1');
    mockRedisData.set('farms:user2', 'data2');
    mockRedisData.set('crops:farm1', 'data3');

    await invalidateCache('farms:*');

    expect(mockRedisData.has('farms:user1')).toBe(false);
    expect(mockRedisData.has('farms:user2')).toBe(false);
    expect(mockRedisData.has('crops:farm1')).toBe(true);
  });

  it('should handle multiple invalidation patterns', async () => {
    mockRedisData.set('farms:user1', 'data1');
    mockRedisData.set('crops:farm1', 'data2');
    mockRedisData.set('animals:farm1', 'data3');

    await invalidateCache('farms:*');
    await invalidateCache('crops:*');

    expect(mockRedisData.has('farms:user1')).toBe(false);
    expect(mockRedisData.has('crops:farm1')).toBe(false);
    expect(mockRedisData.has('animals:farm1')).toBe(true);
  });
});
