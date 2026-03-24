# Redis Caching & Sentry Error Monitoring Integration Guide

## Overview

This guide explains how to use the Redis caching layer and Sentry error monitoring system integrated into FarmKonnect. These systems work together to improve performance and provide real-time error tracking and alerting.

## Table of Contents

1. [Redis Caching](#redis-caching)
2. [Sentry Error Monitoring](#sentry-error-monitoring)
3. [Integration Examples](#integration-examples)
4. [Performance Optimization](#performance-optimization)
5. [Deployment Configuration](#deployment-configuration)
6. [Monitoring & Alerting](#monitoring--alerting)

---

## Redis Caching

### Overview

Redis caching reduces response times by storing frequently accessed data in memory. The system automatically handles cache invalidation and provides a simple API for caching queries.

### Setup

#### 1. Environment Variables

Add to your `.env` file:

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
# Or for production with authentication:
REDIS_URL=redis://:password@host:6379/0
```

#### 2. Redis Server

For development:
```bash
# Using Docker
docker run -d -p 6379:6379 redis:latest

# Or install locally
brew install redis
redis-server
```

### Usage

#### Basic Caching

```typescript
import { withCache, cacheKeys } from './server/_core/redis';

// Cache a query result for 1 hour (3600 seconds)
const farms = await withCache(
  cacheKeys.farms(userId),
  async () => {
    const db = await getDb();
    return db.select().from(farms).where(eq(farms.farmerUserId, userId));
  },
  3600 // TTL in seconds
);
```

#### Cache Key Generation

Pre-defined cache keys for common queries:

```typescript
import { cacheKeys } from './server/_core/redis';

// Farm-related
cacheKeys.farms(userId)           // 'farms:user123'
cacheKeys.farm(farmId)            // 'farm:farm456'

// Crop-related
cacheKeys.crops(farmId)           // 'crops:farm456'
cacheKeys.crop(cropId)            // 'crop:crop789'

// Animal-related
cacheKeys.animals(farmId)         // 'animals:farm456'
cacheKeys.animal(animalId)        // 'animal:animal123'

// Marketplace
cacheKeys.products()              // 'marketplace:products'
cacheKeys.product(productId)      // 'product:product123'

// Weather
cacheKeys.weather(lat, lon)       // 'weather:40.7128:-74.006'
cacheKeys.weatherForecast(lat, lon) // 'weather:forecast:40.7128:-74.006'
```

#### Cache Invalidation

```typescript
import { invalidateCache } from './server/_core/redis';

// Invalidate single key
await invalidateCache('farms:user123');

// Invalidate pattern (all farms for all users)
await invalidateCache('farms:*');

// Invalidate multiple patterns
await invalidateCache('farms:*');
await invalidateCache('crops:farm456');
```

#### Cache Statistics

```typescript
import { getCacheStats } from './server/_core/redis';

const stats = await getCacheStats();
console.log(`Cache keys: ${stats.keys}`);
console.log(`Memory used: ${stats.memory}`);
console.log(`Cache hits: ${stats.hits}`);
console.log(`Cache misses: ${stats.misses}`);
```

### Cache TTL Configuration

Different query types have recommended TTL values:

```typescript
import { queryTTL } from './server/_core/cacheMiddleware';

// Short-lived cache (5 minutes) - frequently changing data
queryTTL.productsList        // 300 seconds
queryTTL.weatherData         // 300 seconds
queryTTL.notificationsList   // 300 seconds

// Medium-lived cache (30 minutes) - moderately changing data
queryTTL.farmsList           // 1800 seconds
queryTTL.cropsList           // 1800 seconds
queryTTL.animalsList         // 1800 seconds

// Long-lived cache (1 hour) - stable data
queryTTL.soilTestsList       // 3600 seconds
queryTTL.yieldsList          // 3600 seconds
```

### Adding Caching to tRPC Procedures

Example: Caching farm list query

```typescript
import { protectedProcedure, router } from './_core/trpc';
import { withCache, cacheKeys } from './_core/redis';
import { invalidateCache } from './_core/redis';
import { queryTTL } from './_core/cacheMiddleware';

export const farmRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Use cache for read operations
    return await withCache(
      cacheKeys.farms(ctx.user.id),
      async () => {
        const db = await getDb();
        return db.select().from(farms).where(eq(farms.farmerUserId, ctx.user.id));
      },
      queryTTL.farmsList
    );
  }),

  create: protectedProcedure
    .input(z.object({ farmName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const result = await db.insert(farms).values({
        farmerUserId: ctx.user.id,
        farmName: input.farmName,
      });

      // Invalidate cache after mutation
      await invalidateCache(cacheKeys.farms(ctx.user.id));

      return result;
    }),
});
```

---

## Sentry Error Monitoring

### Overview

Sentry provides real-time error tracking, performance monitoring, and alerting. Errors are automatically captured and sent to Sentry for analysis.

### Setup

#### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Sign up for a free account
3. Create a new project for Node.js
4. Copy the DSN (Data Source Name)

#### 2. Environment Variables

Add to your `.env` file:

```env
# Sentry Configuration
SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id
```

For production, also set:
```env
NODE_ENV=production
APP_VERSION=1.0.0
```

### Usage

#### Automatic Error Capture

Errors are automatically captured by Sentry middleware:

```typescript
// Errors in tRPC procedures are automatically captured
export const farmRouter = router({
  create: protectedProcedure
    .input(farmSchema)
    .mutation(async ({ ctx, input }) => {
      // If this throws, Sentry automatically captures it
      const db = await getDb();
      return db.insert(farms).values(input);
    }),
});
```

#### Manual Error Capture

```typescript
import { captureException, captureMessage, addBreadcrumb } from './server/_core/sentry';

// Capture exceptions
try {
  // Some operation
} catch (error) {
  captureException(error as Error, {
    userId: ctx.user.id,
    operation: 'farm_creation',
  });
}

// Capture messages
captureMessage('Farm created successfully', 'info', {
  farmId: farm.id,
  farmName: farm.name,
});

// Add breadcrumbs for tracking user actions
addBreadcrumb('User navigated to farms page', 'navigation', 'info', {
  userId: ctx.user.id,
});
```

#### User Context

```typescript
import { setUserContext, clearUserContext } from './server/_core/sentry';

// Set user context when user logs in
setUserContext(userId, userEmail, username);

// Clear user context when user logs out
clearUserContext();
```

#### Custom Context

```typescript
import { setCustomContext } from './server/_core/sentry';

// Add custom context for better error grouping
setCustomContext('farm', {
  farmId: farm.id,
  farmName: farm.name,
  location: farm.location,
});

setCustomContext('operation', {
  type: 'bulk_import',
  itemsProcessed: 150,
  itemsFailed: 5,
});
```

### Error Tracking Examples

#### Database Errors

```typescript
try {
  const result = await db.select().from(farms).where(...);
} catch (error) {
  captureException(error as Error, {
    database: 'farmkonnect_db',
    operation: 'query',
    table: 'farms',
  });
}
```

#### API Errors

```typescript
try {
  const weather = await fetchWeatherAPI(lat, lon);
} catch (error) {
  captureException(error as Error, {
    service: 'weather_api',
    endpoint: '/forecast',
    coordinates: { lat, lon },
  });
}
```

#### Validation Errors

```typescript
if (!farmSchema.safeParse(input).success) {
  captureMessage('Farm validation failed', 'warning', {
    input,
    errors: farmSchema.safeParse(input).error?.errors,
  });
}
```

---

## Integration Examples

### Example 1: Cached Farm List with Error Monitoring

```typescript
import { protectedProcedure, router } from './_core/trpc';
import { withCache, cacheKeys, invalidateCache } from './_core/redis';
import { captureException, addBreadcrumb } from './_core/sentry';
import { queryTTL } from './_core/cacheMiddleware';

export const farmRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      addBreadcrumb('Fetching farms list', 'query', 'info', {
        userId: ctx.user.id,
      });

      return await withCache(
        cacheKeys.farms(ctx.user.id),
        async () => {
          const db = await getDb();
          if (!db) throw new Error('Database not available');

          return db.select().from(farms).where(eq(farms.farmerUserId, ctx.user.id));
        },
        queryTTL.farmsList
      );
    } catch (error) {
      captureException(error as Error, {
        userId: ctx.user.id,
        operation: 'list_farms',
      });
      throw error;
    }
  }),

  create: protectedProcedure
    .input(farmSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const result = await db.insert(farms).values({
          farmerUserId: ctx.user.id,
          ...input,
        });

        // Invalidate cache
        await invalidateCache(cacheKeys.farms(ctx.user.id));

        addBreadcrumb('Farm created', 'farm', 'info', {
          farmId: result[0].id,
          farmName: input.farmName,
        });

        return result[0];
      } catch (error) {
        captureException(error as Error, {
          userId: ctx.user.id,
          operation: 'create_farm',
          input,
        });
        throw error;
      }
    }),
});
```

### Example 2: Cached Weather with Monitoring

```typescript
import { publicProcedure, router } from './_core/trpc';
import { withCache, cacheKeys } from './_core/redis';
import { captureException, captureMessage } from './_core/sentry';
import { queryTTL } from './_core/cacheMiddleware';

export const weatherRouter = router({
  forecast: publicProcedure
    .input(z.object({ latitude: z.number(), longitude: z.number() }))
    .query(async ({ input }) => {
      try {
        return await withCache(
          cacheKeys.weatherForecast(input.latitude, input.longitude),
          async () => {
            const response = await fetch(
              `https://api.openweathermap.org/data/2.5/forecast?lat=${input.latitude}&lon=${input.longitude}&appid=${OPENWEATHER_API_KEY}`
            );

            if (!response.ok) {
              throw new Error(`Weather API error: ${response.statusText}`);
            }

            return response.json();
          },
          queryTTL.weatherForecast
        );
      } catch (error) {
        captureException(error as Error, {
          service: 'weather_api',
          coordinates: input,
        });

        // Still return cached data if available, or throw
        throw error;
      }
    }),
});
```

---

## Performance Optimization

### Measuring Impact

#### Before Optimization
- Average response time: 860ms
- Cache hit rate: 0%
- Success rate: 67.4%

#### Expected After Optimization
- Average response time: <200ms (77% improvement)
- Cache hit rate: 70-80%
- Success rate: 99%+

### Optimization Checklist

- [ ] Configure Redis connection string
- [ ] Add caching to farm.list procedure
- [ ] Add caching to crops.list procedure
- [ ] Add caching to animals.list procedure
- [ ] Add caching to marketplace.getProducts
- [ ] Add caching to weather procedures
- [ ] Configure Sentry DSN
- [ ] Test caching with load testing
- [ ] Monitor cache statistics
- [ ] Adjust TTL values based on metrics

### Load Testing

```bash
# Run load test with caching enabled
node authenticated_load_test_v2.mjs

# Expected results:
# - Success rate: 99%+
# - Average response time: <200ms
# - Throughput: 400+ req/s
```

---

## Deployment Configuration

### Railway Deployment

Add environment variables in Railway dashboard:

```
REDIS_URL=redis://default:password@redis-host:6379
SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id
NODE_ENV=production
APP_VERSION=1.0.0
```

### Docker Compose (Local Development)

```yaml
version: '3.8'
services:
  redis:
    image: redis:latest
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - SENTRY_DSN=${SENTRY_DSN}
      - NODE_ENV=development
    depends_on:
      - redis

volumes:
  redis_data:
```

### Fly.io Deployment

Add to `fly.toml`:

```toml
[env]
  REDIS_URL = "redis://default:password@redis-host:6379"
  SENTRY_DSN = "https://your-key@your-org.ingest.sentry.io/your-project-id"
  NODE_ENV = "production"
```

---

## Monitoring & Alerting

### Sentry Dashboard

1. Go to [sentry.io](https://sentry.io)
2. Navigate to your project
3. View:
   - **Issues**: Aggregated errors
   - **Performance**: Slow transactions
   - **Releases**: Version tracking
   - **Alerts**: Real-time notifications

### Setting Up Alerts

#### Email Alerts

1. Go to Project Settings → Alerts
2. Create new alert rule:
   - Condition: Error rate > 5%
   - Action: Send email notification

#### Slack Integration

1. Go to Project Settings → Integrations
2. Add Slack workspace
3. Create alert rule with Slack action

### Cache Monitoring

```typescript
import { getCacheStats } from './server/_core/redis';

// Log cache statistics every 5 minutes
setInterval(async () => {
  const stats = await getCacheStats();
  console.log('Cache Statistics:', stats);
  
  // Alert if hit rate is too low
  const hitRate = stats.hits / (stats.hits + stats.misses);
  if (hitRate < 0.5) {
    captureMessage('Low cache hit rate', 'warning', stats);
  }
}, 5 * 60 * 1000);
```

### Performance Monitoring

Monitor key metrics:

```typescript
// Track slow queries
if (duration > 1000) {
  captureMessage('Slow query detected', 'warning', {
    query: 'SELECT * FROM farms WHERE...',
    duration,
  });
}

// Track memory usage
if (memoryUsage > threshold) {
  captureMessage('High memory usage', 'warning', {
    used: `${memoryUsage}MB`,
    threshold: `${threshold}MB`,
  });
}
```

---

## Troubleshooting

### Redis Connection Issues

```
Error: ECONNREFUSED
```

**Solution**: Ensure Redis server is running:
```bash
redis-cli ping  # Should return PONG
```

### Sentry Not Capturing Errors

**Solution**: Check if SENTRY_DSN is set:
```bash
echo $SENTRY_DSN  # Should show your DSN
```

### High Cache Memory Usage

**Solution**: Reduce TTL values or implement cache eviction:
```typescript
// Reduce TTL for frequently updated data
queryTTL.productsList = 300; // 5 minutes instead of 10
```

### Cache Invalidation Issues

**Solution**: Use pattern-based invalidation:
```typescript
// Invalidate all related caches
await invalidateCache('farms:*');
await invalidateCache('crops:*');
```

---

## Best Practices

1. **Cache Strategy**
   - Cache read-heavy queries
   - Invalidate on mutations
   - Use appropriate TTL values
   - Monitor cache hit rate

2. **Error Tracking**
   - Set user context for all errors
   - Add breadcrumbs for user actions
   - Use custom context for better grouping
   - Monitor error trends

3. **Performance**
   - Monitor response times
   - Track cache statistics
   - Use load testing regularly
   - Adjust TTL based on metrics

4. **Security**
   - Use Redis authentication in production
   - Enable SSL for Redis connections
   - Rotate Sentry DSN periodically
   - Sanitize sensitive data in errors

---

## Support & Resources

- [Redis Documentation](https://redis.io/documentation)
- [Sentry Documentation](https://docs.sentry.io/)
- [tRPC Documentation](https://trpc.io/docs)
- [FarmKonnect GitHub](https://github.com/nabekah/farmkonnect-production)

---

**Last Updated**: March 24, 2026
**Version**: 1.0.0
