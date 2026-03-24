#!/usr/bin/env node

/**
 * Production Monitoring and Performance Test Script
 * Tests response times, cache hit rates, and end-to-end flows
 */

import https from 'https';
import { performance } from 'perf_hooks';

const PRODUCTION_URL = 'https://www.farmconnekt.com';
const API_ENDPOINT = `${PRODUCTION_URL}/api/trpc`;

// Test configuration
const TEST_CONFIG = {
  concurrentRequests: 10,
  requestsPerClient: 20,
  timeout: 10000,
};

// Results tracking
let results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  cacheHits: 0,
  cacheMisses: 0,
  errors: [],
};

/**
 * Make HTTPS request to production
 */
function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FarmKonnect-Monitoring/1.0',
      },
      timeout: TEST_CONFIG.timeout,
    };

    const startTime = performance.now();

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        const cacheStatus = res.headers['x-cache'] || 'UNKNOWN';

        resolve({
          statusCode: res.statusCode,
          responseTime: responseTime,
          cacheStatus: cacheStatus,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Test homepage response time
 */
async function testHomepagePerformance() {
  console.log('\n📊 Testing Homepage Performance...');

  try {
    const response = await makeRequest('/');
    const responseTime = response.responseTime;

    console.log(`✅ Homepage Response Time: ${responseTime.toFixed(2)}ms`);

    results.responseTimes.push(responseTime);
    results.successfulRequests++;

    if (responseTime < 200) {
      console.log('✅ EXCELLENT: Response time < 200ms');
    } else if (responseTime < 500) {
      console.log('⚠️  GOOD: Response time < 500ms');
    } else if (responseTime < 1000) {
      console.log('⚠️  ACCEPTABLE: Response time < 1000ms');
    } else {
      console.log('❌ SLOW: Response time > 1000ms');
    }

    return responseTime;
  } catch (error) {
    console.error(`❌ Homepage test failed: ${error.message}`);
    results.failedRequests++;
    results.errors.push(`Homepage: ${error.message}`);
    return null;
  }
}

/**
 * Test API endpoint performance
 */
async function testAPIPerformance() {
  console.log('\n📊 Testing API Performance...');

  const testEndpoints = [
    '/api/trpc/farms.list',
    '/api/trpc/crops.list',
    '/api/trpc/animals.list',
  ];

  for (const endpoint of testEndpoints) {
    try {
      const response = await makeRequest(endpoint);
      const responseTime = response.responseTime;

      console.log(`✅ ${endpoint}: ${responseTime.toFixed(2)}ms`);

      results.responseTimes.push(responseTime);
      results.successfulRequests++;

      // Track cache status
      if (response.headers['x-cache'] === 'HIT') {
        results.cacheHits++;
      } else {
        results.cacheMisses++;
      }
    } catch (error) {
      console.error(`❌ ${endpoint} failed: ${error.message}`);
      results.failedRequests++;
      results.errors.push(`${endpoint}: ${error.message}`);
    }
  }
}

/**
 * Test concurrent requests to simulate load
 */
async function testConcurrentRequests() {
  console.log('\n📊 Testing Concurrent Requests...');

  const promises = [];

  for (let i = 0; i < TEST_CONFIG.concurrentRequests; i++) {
    for (let j = 0; j < TEST_CONFIG.requestsPerClient; j++) {
      promises.push(
        makeRequest('/api/trpc/farms.list')
          .then((response) => {
            results.responseTimes.push(response.responseTime);
            results.successfulRequests++;

            if (response.headers['x-cache'] === 'HIT') {
              results.cacheHits++;
            } else {
              results.cacheMisses++;
            }
          })
          .catch((error) => {
            results.failedRequests++;
            results.errors.push(`Concurrent request: ${error.message}`);
          })
      );
    }
  }

  console.log(
    `⏳ Running ${promises.length} concurrent requests...`
  );

  await Promise.all(promises);

  console.log(`✅ Completed ${promises.length} concurrent requests`);
}

/**
 * Calculate and display statistics
 */
function displayStatistics() {
  console.log('\n📈 Performance Statistics');
  console.log('═══════════════════════════════════════════');

  const avgResponseTime =
    results.responseTimes.length > 0
      ? results.responseTimes.reduce((a, b) => a + b, 0) /
        results.responseTimes.length
      : 0;

  const minResponseTime =
    results.responseTimes.length > 0
      ? Math.min(...results.responseTimes)
      : 0;

  const maxResponseTime =
    results.responseTimes.length > 0
      ? Math.max(...results.responseTimes)
      : 0;

  const p95ResponseTime =
    results.responseTimes.length > 0
      ? results.responseTimes.sort((a, b) => a - b)[
          Math.floor(results.responseTimes.length * 0.95)
        ]
      : 0;

  const cacheHitRate =
    results.cacheHits + results.cacheMisses > 0
      ? ((results.cacheHits / (results.cacheHits + results.cacheMisses)) *
          100).toFixed(2)
      : 0;

  const successRate =
    results.successfulRequests + results.failedRequests > 0
      ? (
          (results.successfulRequests /
            (results.successfulRequests + results.failedRequests)) *
          100
        ).toFixed(2)
      : 0;

  console.log(`\n📊 Response Times:`);
  console.log(`   Average: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`   Min:     ${minResponseTime.toFixed(2)}ms`);
  console.log(`   Max:     ${maxResponseTime.toFixed(2)}ms`);
  console.log(`   P95:     ${p95ResponseTime.toFixed(2)}ms`);

  console.log(`\n💾 Caching:`);
  console.log(`   Cache Hits:  ${results.cacheHits}`);
  console.log(`   Cache Misses: ${results.cacheMisses}`);
  console.log(`   Hit Rate:    ${cacheHitRate}%`);

  console.log(`\n✅ Success Rate: ${successRate}%`);
  console.log(`   Successful: ${results.successfulRequests}`);
  console.log(`   Failed:     ${results.failedRequests}`);

  // Performance targets
  console.log(`\n🎯 Performance Targets:`);

  if (avgResponseTime < 200) {
    console.log(`   ✅ Average Response Time: ${avgResponseTime.toFixed(2)}ms < 200ms TARGET`);
  } else {
    console.log(`   ❌ Average Response Time: ${avgResponseTime.toFixed(2)}ms > 200ms TARGET`);
  }

  if (cacheHitRate >= 70) {
    console.log(`   ✅ Cache Hit Rate: ${cacheHitRate}% >= 70% TARGET`);
  } else {
    console.log(`   ⚠️  Cache Hit Rate: ${cacheHitRate}% < 70% TARGET`);
  }

  if (successRate >= 99) {
    console.log(`   ✅ Success Rate: ${successRate}% >= 99% TARGET`);
  } else {
    console.log(`   ⚠️  Success Rate: ${successRate}% < 99% TARGET`);
  }

  // Errors
  if (results.errors.length > 0) {
    console.log(`\n⚠️  Errors Encountered:`);
    results.errors.slice(0, 5).forEach((error) => {
      console.log(`   - ${error}`);
    });
    if (results.errors.length > 5) {
      console.log(`   ... and ${results.errors.length - 5} more errors`);
    }
  }

  console.log('\n═══════════════════════════════════════════');
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('🚀 FarmKonnect Production Monitoring Test');
  console.log('═══════════════════════════════════════════');
  console.log(`Target: ${PRODUCTION_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);

  try {
    // Test homepage
    await testHomepagePerformance();

    // Test API endpoints
    await testAPIPerformance();

    // Test concurrent requests
    await testConcurrentRequests();

    // Display results
    displayStatistics();

    console.log('\n✅ Production monitoring test completed!');
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
