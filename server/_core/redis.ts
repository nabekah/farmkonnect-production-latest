import Redis from 'ioredis';
import { logger } from './logger';

// Redis client instance
let redisClient: Redis | null = null;

/**
 * Initialize Redis connection
 * Uses REDIS_URL environment variable or localhost:6379
 */
export function initializeRedis(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: true,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    redisClient.on('close', () => {
      logger.info('Redis connection closed');
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

/**
 * Cache key generation helpers
 */
export const cacheKeys = {
  farms: (userId: string) => `farms:${userId}`,
  farm: (farmId: string) => `farm:${farmId}`,
  crops: (farmId: string) => `crops:${farmId}`,
  crop: (cropId: string) => `crop:${cropId}`,
  animals: (farmId: string) => `animals:${farmId}`,
  animal: (animalId: string) => `animal:${animalId}`,
  products: () => 'marketplace:products',
  product: (productId: string) => `product:${productId}`,
  weather: (latitude: number, longitude: number) => `weather:${latitude}:${longitude}`,
  weatherForecast: (latitude: number, longitude: number) => `weather:forecast:${latitude}:${longitude}`,
  soilTests: (farmId: string) => `soil:tests:${farmId}`,
  fertilizers: (farmId: string) => `fertilizers:${farmId}`,
  yields: (cropId: string) => `yields:${cropId}`,
  notifications: (userId: string) => `notifications:${userId}`,
  userStats: (userId: string) => `user:stats:${userId}`,
};

/**
 * Cache wrapper for async operations
 * @param key Cache key
 * @param fetchFn Async function to fetch data if not cached
 * @param ttl Time to live in seconds (default: 3600 = 1 hour)
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const redis = getRedisClient();

  try {
    // Try to get from cache
    const cached = await redis.get(key);
    if (cached) {
      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(cached) as T;
    }

    logger.debug(`Cache miss: ${key}`);

    // Fetch fresh data
    const data = await fetchFn();

    // Store in cache
    await redis.setex(key, ttl, JSON.stringify(data));

    return data;
  } catch (error) {
    logger.error(`Cache operation failed for key ${key}:`, error);
    // Fallback: just fetch the data without caching
    return fetchFn();
  }
}

/**
 * Invalidate cache by key or pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedisClient();

  try {
    if (pattern.includes('*')) {
      // Pattern-based invalidation
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug(`Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
      }
    } else {
      // Single key invalidation
      await redis.del(pattern);
      logger.debug(`Invalidated cache key: ${pattern}`);
    }
  } catch (error) {
    logger.error(`Cache invalidation failed for pattern ${pattern}:`, error);
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  const redis = getRedisClient();

  try {
    await redis.flushdb();
    logger.info('All cache cleared');
  } catch (error) {
    logger.error('Failed to clear all cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  keys: number;
  memory: string;
  hits: number;
  misses: number;
}> {
  const redis = getRedisClient();

  try {
    const info = await redis.info('stats');
    const keys = await redis.dbsize();

    // Parse info response
    const lines = info.split('\r\n');
    let hits = 0;
    let misses = 0;

    for (const line of lines) {
      if (line.startsWith('keyspace_hits:')) {
        hits = parseInt(line.split(':')[1], 10);
      }
      if (line.startsWith('keyspace_misses:')) {
        misses = parseInt(line.split(':')[1], 10);
      }
    }

    const memoryInfo = await redis.info('memory');
    let memory = '0B';
    for (const line of memoryInfo.split('\r\n')) {
      if (line.startsWith('used_memory_human:')) {
        memory = line.split(':')[1];
      }
    }

    return {
      keys,
      memory,
      hits,
      misses,
    };
  } catch (error) {
    logger.error('Failed to get cache stats:', error);
    return { keys: 0, memory: '0B', hits: 0, misses: 0 };
  }
}

/**
 * Graceful shutdown of Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
      redisClient?.disconnect();
      redisClient = null;
    }
  }
}
