import { TRPCError } from '@trpc/server';
import { withCache, invalidateCache, cacheKeys } from './redis';
import { logger } from './logger';

/**
 * Cache decorator for tRPC queries
 * Automatically caches query results and invalidates on related mutations
 */
export async function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  try {
    return await withCache(cacheKey, queryFn, ttl);
  } catch (error) {
    logger.error(`Cached query failed for key ${cacheKey}:`, error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch data',
    });
  }
}

/**
 * Cache invalidation helper for mutations
 * Invalidates related cache entries when data is modified
 */
export async function invalidateCachePatterns(patterns: string[]): Promise<void> {
  try {
    for (const pattern of patterns) {
      await invalidateCache(pattern);
    }
  } catch (error) {
    logger.error('Cache invalidation failed:', error);
    // Don't throw - cache invalidation failure shouldn't break mutations
  }
}

/**
 * Generate cache keys for common queries
 */
export const generateCacheKeys = {
  farmsList: (userId: string) => cacheKeys.farms(userId),
  farmDetail: (farmId: string) => cacheKeys.farm(farmId),
  cropsList: (farmId: string) => cacheKeys.crops(farmId),
  cropDetail: (cropId: string) => cacheKeys.crop(cropId),
  animalsList: (farmId: string) => cacheKeys.animals(farmId),
  animalDetail: (animalId: string) => cacheKeys.animal(animalId),
  productsList: () => cacheKeys.products(),
  productDetail: (productId: string) => cacheKeys.product(productId),
  weatherData: (lat: number, lon: number) => cacheKeys.weather(lat, lon),
  weatherForecast: (lat: number, lon: number) => cacheKeys.weatherForecast(lat, lon),
  soilTestsList: (farmId: string) => cacheKeys.soilTests(farmId),
  fertilizersList: (farmId: string) => cacheKeys.fertilizers(farmId),
  yieldsList: (cropId: string) => cacheKeys.yields(cropId),
  notificationsList: (userId: string) => cacheKeys.notifications(userId),
  userStats: (userId: string) => cacheKeys.userStats(userId),
};

/**
 * Invalidation patterns for mutations
 */
export const invalidationPatterns = {
  // Farm mutations invalidate farm-related caches
  farmCreated: (userId: string) => [cacheKeys.farms(userId)],
  farmUpdated: (farmId: string, userId: string) => [
    cacheKeys.farm(farmId),
    cacheKeys.farms(userId),
  ],
  farmDeleted: (farmId: string, userId: string) => [
    cacheKeys.farm(farmId),
    cacheKeys.farms(userId),
    `crops:${farmId}`,
    `animals:${farmId}`,
    `soil:tests:${farmId}`,
    `fertilizers:${farmId}`,
  ],

  // Crop mutations
  cropCreated: (farmId: string) => [cacheKeys.crops(farmId)],
  cropUpdated: (cropId: string, farmId: string) => [
    cacheKeys.crop(cropId),
    cacheKeys.crops(farmId),
  ],
  cropDeleted: (cropId: string, farmId: string) => [
    cacheKeys.crop(cropId),
    cacheKeys.crops(farmId),
    `yields:${cropId}`,
  ],

  // Animal mutations
  animalCreated: (farmId: string) => [cacheKeys.animals(farmId)],
  animalUpdated: (animalId: string, farmId: string) => [
    cacheKeys.animal(animalId),
    cacheKeys.animals(farmId),
  ],
  animalDeleted: (animalId: string, farmId: string) => [
    cacheKeys.animal(animalId),
    cacheKeys.animals(farmId),
  ],

  // Marketplace mutations
  productCreated: () => [cacheKeys.products()],
  productUpdated: (productId: string) => [
    cacheKeys.product(productId),
    cacheKeys.products(),
  ],
  productDeleted: (productId: string) => [
    cacheKeys.product(productId),
    cacheKeys.products(),
  ],

  // Weather mutations
  weatherUpdated: (lat: number, lon: number) => [
    cacheKeys.weather(lat, lon),
    cacheKeys.weatherForecast(lat, lon),
  ],

  // Soil test mutations
  soilTestCreated: (farmId: string) => [cacheKeys.soilTests(farmId)],
  soilTestDeleted: (farmId: string) => [cacheKeys.soilTests(farmId)],

  // Fertilizer mutations
  fertilizerCreated: (farmId: string) => [cacheKeys.fertilizers(farmId)],
  fertilizerUpdated: (farmId: string) => [cacheKeys.fertilizers(farmId)],
  fertilizerDeleted: (farmId: string) => [cacheKeys.fertilizers(farmId)],

  // Yield mutations
  yieldCreated: (cropId: string) => [cacheKeys.yields(cropId)],
  yieldUpdated: (cropId: string) => [cacheKeys.yields(cropId)],
  yieldDeleted: (cropId: string) => [cacheKeys.yields(cropId)],

  // Notification mutations
  notificationCreated: (userId: string) => [cacheKeys.notifications(userId)],
  notificationDeleted: (userId: string) => [cacheKeys.notifications(userId)],

  // User stats mutations
  userStatsUpdated: (userId: string) => [cacheKeys.userStats(userId)],
};

/**
 * Cache configuration for different query types
 */
export const cacheConfig = {
  // Short-lived cache for frequently changing data
  SHORT: 300, // 5 minutes

  // Medium-lived cache for moderately changing data
  MEDIUM: 1800, // 30 minutes

  // Long-lived cache for stable data
  LONG: 3600, // 1 hour

  // Very long-lived cache for rarely changing data
  VERY_LONG: 86400, // 24 hours

  // No cache
  NONE: 0,
};

/**
 * Recommended cache TTL for different query types
 */
export const queryTTL = {
  farmsList: cacheConfig.MEDIUM,
  farmDetail: cacheConfig.MEDIUM,
  cropsList: cacheConfig.MEDIUM,
  cropDetail: cacheConfig.MEDIUM,
  animalsList: cacheConfig.MEDIUM,
  animalDetail: cacheConfig.MEDIUM,
  productsList: cacheConfig.SHORT,
  productDetail: cacheConfig.SHORT,
  weatherData: cacheConfig.SHORT, // Weather changes frequently
  weatherForecast: cacheConfig.SHORT,
  soilTestsList: cacheConfig.LONG,
  fertilizersList: cacheConfig.MEDIUM,
  yieldsList: cacheConfig.LONG,
  notificationsList: cacheConfig.SHORT,
  userStats: cacheConfig.MEDIUM,
};
