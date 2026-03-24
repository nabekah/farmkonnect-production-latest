#!/usr/bin/env node

/**
 * Production Load Test with Authentication
 * 
 * This script tests the performance of FarmKonnect production environment
 * with Redis caching enabled. It measures:
 * - Response times (with caching)
 * - Cache hit rates
 * - Success rates
 * - Throughput
 * - Error tracking
 */

import http from 'http';
import https from 'https';

const BASE_URL = process.env.BASE_URL || 'https://www.farmconnekt.com';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '50');
const DURATION_SECONDS = parseInt(process.env.DURATION_SECONDS || '60');
const REQUESTS_PER_USER = parseInt(process.env.REQUESTS_PER_USER || '100');
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // Optional: for authenticated endpoints

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
  status_codes: {},
  start_time: Date.now(),
  end_time: null,
};

/**
 * Make HTTP request with optional authentication
 */
function makeRequest(path, method = 'GET', headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestHeaders = {
      'User-Agent': 'FarmKonnect-LoadTest/1.0',
      ...headers,
    };

    if (AUTH_TOKEN) {
      requestHeaders['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    }

    const startTime = Date.now();
    const req = client.request(url, { method, headers: requestHeaders }, (res) => {
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
 * Test public endpoints (no authentication required)
 */
async function testPublicEndpoints() {
  const endpoints = [
    '/',
    '/api/health',
  ];

  const results = [];
  for (const endpoint of endpoints) {
    const result = await makeRequest(endpoint);
    results.push(result);
  }
  return results;
}

/**
 * Test protected endpoints (requires authentication)
 */
async function testProtectedEndpoints() {
  const endpoints = [
    '/api/trpc/farms.list?input={}',
    '/api/trpc/crops.list?input={}',
    '/api/trpc/animals.list?input={}',
    '/api/trpc/marketplace.listProducts?input={}',
  ];

  const results = [];
  for (const endpoint of endpoints) {
    const result = await makeRequest(endpoint);
    results.push(result);
  }
  return results;
}

/**
 * Record metrics
 */
function recordMetrics(result) {
  metrics.total_requests++;
  metrics.response_times.push(result.duration);

  if (result.success) {
    metrics.successful_requests++;
  } else {
    metrics.failed_requests++;
  }

  // Track cache hits/misses
  if (result.cache === 'HIT') {
    metrics.cache_hits++;
  } else if (result.cache === 'MISS') {
    metrics.cache_misses++;
  }

  // Track status codes
  if (result.status) {
    metrics.status_codes[result.status] = (metrics.status_codes[result.status] || 0) + 1;
  }

  // Track errors
  if (result.error) {
    metrics.errors[result.error] = (metrics.errors[result.error] || 0) + 1;
  }
}

/**
 * Calculate statistics
 */
function calculateStats(values) {
  if (values.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };

  const sorted = [...values].sort((a, b) => a - b);
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
  console.log('========================================');
  console.log('FarmKonnect Production Load Test');
  console.log('========================================');
  console.log('Test Configuration:');
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`  Requests per User: ${REQUESTS_PER_USER}`);
  console.log(`  Total Requests: ${TEST_CONFIG.total_requests}`);
  console.log(`  Duration: ${DURATION_SECONDS}s`);
  console.log(`  Authentication: ${AUTH_TOKEN ? 'Enabled' : 'Disabled'}`);
  console.log('Starting load test...\n');

  // Create user tasks
  const userTasks = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    userTasks.push(
      (async () => {
        for (let j = 0; j < REQUESTS_PER_USER; j++) {
          try {
            // Alternate between public and protected endpoints
            let results;
            if (j % 2 === 0) {
              results = await testPublicEndpoints();
            } else {
              results = await testProtectedEndpoints();
            }

            // Record metrics for each result
            results.forEach(recordMetrics);

            // Add small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 10));
          } catch (error) {
            console.error(`User ${i} request ${j} error:`, error.message);
          }
        }
      })()
    );
  }

  // Run all user tasks concurrently
  await Promise.all(userTasks);

  metrics.end_time = Date.now();
  const totalTime = (metrics.end_time - metrics.start_time) / 1000;

  // Calculate statistics
  const responseStats = calculateStats(metrics.response_times);
  const successRate = (metrics.successful_requests / metrics.total_requests * 100).toFixed(2);
  const cacheHitRate = metrics.cache_hits + metrics.cache_misses > 0
    ? (metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses) * 100).toFixed(2)
    : 'N/A';
  const throughput = (metrics.total_requests / totalTime).toFixed(2);

  // Print results
  console.log('========================================');
  console.log('Load Test Results');
  console.log('========================================');
  console.log('Overall Metrics:');
  console.log(`  Total Requests: ${metrics.total_requests}`);
  console.log(`  Successful: ${metrics.successful_requests}`);
  console.log(`  Failed: ${metrics.failed_requests}`);
  console.log(`  Success Rate: ${successRate}%`);
  console.log(`  Total Time: ${totalTime.toFixed(2)}s`);
  console.log(`  Throughput: ${throughput} req/s`);

  console.log('\nResponse Time Statistics:');
  console.log(`  Min: ${responseStats.min}ms`);
  console.log(`  Max: ${responseStats.max}ms`);
  console.log(`  Avg: ${responseStats.avg}ms`);
  console.log(`  P50: ${responseStats.p50}ms`);
  console.log(`  P95: ${responseStats.p95}ms`);
  console.log(`  P99: ${responseStats.p99}ms`);

  console.log('\nCache Performance:');
  console.log(`  Cache Hits: ${metrics.cache_hits}`);
  console.log(`  Cache Misses: ${metrics.cache_misses}`);
  console.log(`  Cache Hit Rate: ${cacheHitRate}%`);

  console.log('\nStatus Code Distribution:');
  Object.entries(metrics.status_codes).forEach(([code, count]) => {
    console.log(`  ${code}: ${count}`);
  });

  if (Object.keys(metrics.errors).length > 0) {
    console.log('\nError Distribution:');
    Object.entries(metrics.errors).forEach(([error, count]) => {
      console.log(`  ${error}: ${count}`);
    });
  }

  // Performance assessment
  console.log('\nPerformance Assessment:');
  const targets = {
    responseTime: responseStats.avg < 200,
    successRate: successRate >= 99,
    cacheHitRate: cacheHitRate !== 'N/A' && parseFloat(cacheHitRate) >= 70,
    throughput: throughput >= 400,
  };

  if (targets.responseTime && targets.successRate && targets.throughput) {
    console.log('  ✅ EXCELLENT: All targets met!');
  } else if (targets.responseTime || targets.successRate) {
    console.log('  ⚠️  GOOD: Most targets met, some optimization needed');
  } else {
    console.log('  ❌ NEEDS IMPROVEMENT: Response time or success rate below targets');
  }

  console.log('\nTarget Verification:');
  console.log(`  Response Time < 200ms: ${targets.responseTime ? '✅' : '❌'} (${responseStats.avg}ms)`);
  console.log(`  Success Rate >= 99%: ${targets.successRate ? '✅' : '❌'} (${successRate}%)`);
  console.log(`  Cache Hit Rate >= 70%: ${targets.cacheHitRate ? '✅' : '❌'} (${cacheHitRate}%)`);
  console.log(`  Throughput >= 400 req/s: ${targets.throughput ? '✅' : '❌'} (${throughput} req/s)`);

  console.log('\n========================================');
  console.log('Load Test Complete');
  console.log('========================================\n');

  // Return metrics for programmatic use
  return {
    metrics,
    stats: responseStats,
    successRate: parseFloat(successRate),
    cacheHitRate: cacheHitRate !== 'N/A' ? parseFloat(cacheHitRate) : 0,
    throughput: parseFloat(throughput),
    targets,
  };
}

// Run the test
runLoadTest().catch(error => {
  console.error('Load test failed:', error);
  process.exit(1);
});
