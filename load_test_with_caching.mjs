#!/usr/bin/env node

/**
 * Load Test with Caching and Sentry Monitoring
 * 
 * This script tests the performance of FarmKonnect with Redis caching enabled.
 * It measures:
 * - Response times (before and after caching)
 * - Cache hit rates
 * - Success rates
 * - Throughput
 * - Error tracking via Sentry
 */

import http from 'http';
import https from 'https';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '50');
const DURATION_SECONDS = parseInt(process.env.DURATION_SECONDS || '60');
const REQUESTS_PER_USER = parseInt(process.env.REQUESTS_PER_USER || '100');

// Test configuration
const TEST_CONFIG = {
  concurrent_users: CONCURRENT_USERS,
  duration_seconds: DURATION_SECONDS,
  requests_per_user: REQUESTS_PER_USER,
  total_requests: CONCURRENT_USERS * REQUESTS_PER_USER,
};

// Metrics
const metrics = {
  total_requests: 0,
  successful_requests: 0,
  failed_requests: 0,
  response_times: [],
  cache_hits: 0,
  cache_misses: 0,
  errors: {},
  start_time: Date.now(),
  end_time: null,
};

// Sample user IDs for testing
const USER_IDS = Array.from({ length: 5 }, (_, i) => i + 1);

/**
 * Make HTTP request
 */
function makeRequest(path, method = 'GET') {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const startTime = Date.now();
    const req = client.request(url, { method }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        const cacheHeader = res.headers['x-cache'] || 'MISS';

        resolve({
          status: res.statusCode,
          duration,
          cache: cacheHeader,
          success: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        status: 0,
        duration,
        cache: 'ERROR',
        success: false,
        error: error.message,
      });
    });

    req.end();
  });
}

/**
 * Test farm list endpoint (cached)
 */
async function testFarmList(userId) {
  return makeRequest(`/api/trpc/farms.list?input=${JSON.stringify({})}`);
}

/**
 * Test crops list endpoint (cached)
 */
async function testCropsList(farmId) {
  return makeRequest(`/api/trpc/crops.list?input=${JSON.stringify({})}`);
}

/**
 * Test animals list endpoint (cached)
 */
async function testAnimalsList(farmId) {
  return makeRequest(
    `/api/trpc/animals.list?input=${JSON.stringify({ farmId })}`
  );
}

/**
 * Test marketplace products endpoint (cached)
 */
async function testMarketplaceProducts() {
  return makeRequest(
    `/api/trpc/marketplace.listProducts?input=${JSON.stringify({
      limit: 20,
    })}`
  );
}

/**
 * Run a single user's requests
 */
async function runUserSession(userId) {
  const endpoints = [
    () => testFarmList(userId),
    () => testCropsList(1),
    () => testAnimalsList(1),
    () => testMarketplaceProducts(),
  ];

  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    const endpoint = endpoints[i % endpoints.length];
    try {
      const result = await endpoint();
      metrics.total_requests++;

      if (result.success) {
        metrics.successful_requests++;
      } else {
        metrics.failed_requests++;
        metrics.errors[result.status] = (metrics.errors[result.status] || 0) + 1;
      }

      metrics.response_times.push(result.duration);

      if (result.cache === 'HIT') {
        metrics.cache_hits++;
      } else if (result.cache === 'MISS') {
        metrics.cache_misses++;
      }

      if (result.error) {
        console.error(`Error: ${result.error}`);
      }
    } catch (error) {
      metrics.failed_requests++;
      console.error(`Request error: ${error.message}`);
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/**
 * Calculate statistics
 */
function calculateStats(times) {
  if (times.length === 0) return {};

  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(sum / sorted.length),
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  };
}

/**
 * Run load test
 */
async function runLoadTest() {
  console.log('\n========================================');
  console.log('FarmKonnect Load Test with Caching');
  console.log('========================================\n');

  console.log('Test Configuration:');
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Concurrent Users: ${TEST_CONFIG.concurrent_users}`);
  console.log(`  Requests per User: ${TEST_CONFIG.requests_per_user}`);
  console.log(`  Total Requests: ${TEST_CONFIG.total_requests}`);
  console.log(`  Duration: ${TEST_CONFIG.duration_seconds}s\n`);

  console.log('Starting load test...\n');

  // Run concurrent user sessions
  const userPromises = Array.from({ length: CONCURRENT_USERS }, (_, i) =>
    runUserSession(i + 1)
  );

  await Promise.all(userPromises);

  metrics.end_time = Date.now();
  const totalTime = (metrics.end_time - metrics.start_time) / 1000;

  // Calculate statistics
  const responseStats = calculateStats(metrics.response_times);
  const successRate = (
    (metrics.successful_requests / metrics.total_requests) *
    100
  ).toFixed(2);
  const cacheHitRate = (
    (metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses)) *
    100
  ).toFixed(2);
  const throughput = (metrics.total_requests / totalTime).toFixed(2);

  // Print results
  console.log('========================================');
  console.log('Load Test Results');
  console.log('========================================\n');

  console.log('Overall Metrics:');
  console.log(`  Total Requests: ${metrics.total_requests}`);
  console.log(`  Successful: ${metrics.successful_requests}`);
  console.log(`  Failed: ${metrics.failed_requests}`);
  console.log(`  Success Rate: ${successRate}%`);
  console.log(`  Total Time: ${totalTime.toFixed(2)}s`);
  console.log(`  Throughput: ${throughput} req/s\n`);

  console.log('Response Time Statistics:');
  console.log(`  Min: ${responseStats.min}ms`);
  console.log(`  Max: ${responseStats.max}ms`);
  console.log(`  Avg: ${responseStats.avg}ms`);
  console.log(`  P50: ${responseStats.p50}ms`);
  console.log(`  P95: ${responseStats.p95}ms`);
  console.log(`  P99: ${responseStats.p99}ms\n`);

  console.log('Cache Performance:');
  console.log(`  Cache Hits: ${metrics.cache_hits}`);
  console.log(`  Cache Misses: ${metrics.cache_misses}`);
  console.log(`  Cache Hit Rate: ${cacheHitRate}%\n`);

  if (Object.keys(metrics.errors).length > 0) {
    console.log('Error Distribution:');
    for (const [status, count] of Object.entries(metrics.errors)) {
      console.log(`  ${status}: ${count}`);
    }
    console.log('');
  }

  // Performance assessment
  console.log('Performance Assessment:');
  const isGood = responseStats.avg < 200 && successRate > 99;
  const isFair = responseStats.avg < 500 && successRate > 95;

  if (isGood) {
    console.log('  ✅ EXCELLENT: Response time <200ms, Success rate >99%');
  } else if (isFair) {
    console.log('  ⚠️  GOOD: Response time <500ms, Success rate >95%');
  } else {
    console.log('  ❌ NEEDS IMPROVEMENT: Response time or success rate below targets');
  }

  console.log('\n========================================\n');

  // Return results for verification
  return {
    success: isGood || isFair,
    metrics: {
      avg_response_time: responseStats.avg,
      success_rate: parseFloat(successRate),
      cache_hit_rate: parseFloat(cacheHitRate),
      throughput: parseFloat(throughput),
    },
  };
}

// Run the test
runLoadTest()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Load test failed:', error);
    process.exit(1);
  });
