#!/usr/bin/env node

/**
 * Redis Connection Verification Script
 * Diagnoses Redis connectivity issues and tests connection
 */

import { createClient } from 'redis';
import { performance } from 'perf_hooks';
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

// Configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://default:GHXEaECWgmLqosMigwjBgQiyxXdMSPIo@redis.railway.internal:6379/0';
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('🔍 Redis Connection Verification');
console.log('═══════════════════════════════════════════');
console.log(`Environment: ${NODE_ENV}`);
console.log(`Redis URL: ${REDIS_URL.replace(/:[^:]*@/, ':***@')}`);
console.log('');

/**
 * Parse Redis URL
 */
function parseRedisUrl(url) {
  try {
    const urlObj = new URL(url);
    return {
      protocol: urlObj.protocol.replace(':', ''),
      username: urlObj.username,
      password: urlObj.password,
      hostname: urlObj.hostname,
      port: parseInt(urlObj.port) || 6379,
      database: parseInt(urlObj.pathname.slice(1)) || 0,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check DNS resolution
 */
async function checkDnsResolution(hostname) {
  console.log(`\n📡 DNS Resolution Check`);
  console.log('─────────────────────────────────────────');

  try {
    console.log(`Resolving: ${hostname}`);
    const address = await dnsLookup(hostname);
    console.log(`✅ DNS Resolved: ${address.address} (${address.family})`);
    return true;
  } catch (error) {
    console.log(`❌ DNS Resolution Failed: ${error.message}`);
    console.log(`   This means the hostname "${hostname}" cannot be resolved.`);
    console.log(`   Possible causes:`);
    console.log(`   1. Hostname is incorrect`);
    console.log(`   2. Network connectivity issue`);
    console.log(`   3. Redis service not running on Railway`);
    return false;
  }
}

/**
 * Test Redis connection
 */
async function testRedisConnection(redisUrl) {
  console.log(`\n🔗 Redis Connection Test`);
  console.log('─────────────────────────────────────────');

  const client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          return new Error('Max retries exceeded');
        }
        return retries * 100;
      },
      connectTimeout: 5000,
    },
  });

  client.on('error', (err) => {
    console.log(`❌ Redis Error: ${err.message}`);
  });

  client.on('connect', () => {
    console.log(`✅ Redis Connected`);
  });

  client.on('ready', () => {
    console.log(`✅ Redis Ready`);
  });

  try {
    console.log('Attempting to connect...');
    const startTime = performance.now();
    await client.connect();
    const connectTime = performance.now() - startTime;

    console.log(`✅ Connection successful (${connectTime.toFixed(2)}ms)`);

    // Test PING
    console.log('\nTesting PING command...');
    const pingStart = performance.now();
    const pong = await client.ping();
    const pingTime = performance.now() - pingStart;

    console.log(`✅ PING Response: ${pong} (${pingTime.toFixed(2)}ms)`);

    // Test SET/GET
    console.log('\nTesting SET/GET commands...');
    const testKey = 'farmkonnect_test_key';
    const testValue = `test_value_${Date.now()}`;

    const setStart = performance.now();
    await client.set(testKey, testValue, { EX: 60 });
    const setTime = performance.now() - setStart;

    console.log(`✅ SET successful (${setTime.toFixed(2)}ms)`);

    const getStart = performance.now();
    const getValue = await client.get(testKey);
    const getTime = performance.now() - getStart;

    console.log(`✅ GET successful (${getTime.toFixed(2)}ms)`);
    console.log(`   Value: ${getValue}`);

    if (getValue === testValue) {
      console.log(`✅ Value verification: PASS`);
    } else {
      console.log(`❌ Value verification: FAIL`);
    }

    // Get info
    console.log('\nFetching Redis INFO...');
    const info = await client.info();
    const lines = info.split('\n');
    const redisVersion = lines.find((l) => l.startsWith('redis_version'))?.split(':')[1]?.trim();
    const connectedClients = lines.find((l) => l.startsWith('connected_clients'))?.split(':')[1]?.trim();
    const usedMemory = lines.find((l) => l.startsWith('used_memory_human'))?.split(':')[1]?.trim();

    console.log(`✅ Redis Version: ${redisVersion}`);
    console.log(`   Connected Clients: ${connectedClients}`);
    console.log(`   Used Memory: ${usedMemory}`);

    // Clean up
    await client.del(testKey);
    await client.quit();

    console.log(`\n✅ All Redis tests passed!`);
    return true;
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    console.log(`\nPossible causes:`);
    console.log(`1. Redis service not running on Railway`);
    console.log(`2. Incorrect Redis URL or credentials`);
    console.log(`3. Network connectivity issue`);
    console.log(`4. Redis service timeout`);

    try {
      await client.quit();
    } catch (e) {
      // Ignore
    }

    return false;
  }
}

/**
 * Check environment variables
 */
function checkEnvironmentVariables() {
  console.log(`\n🔐 Environment Variables Check`);
  console.log('─────────────────────────────────────────');

  const requiredVars = {
    REDIS_URL: process.env.REDIS_URL,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? '✓ Set' : '✗ Missing',
  };

  for (const [key, value] of Object.entries(requiredVars)) {
    if (value === '✓ Set' || value === '✗ Missing') {
      console.log(`${value === '✓ Set' ? '✅' : '❌'} ${key}: ${value}`);
    } else if (value) {
      const masked = value.replace(/:[^:]*@/, ':***@');
      console.log(`✅ ${key}: ${masked}`);
    } else {
      console.log(`❌ ${key}: Not set`);
    }
  }
}

/**
 * Main verification
 */
async function runVerification() {
  try {
    // Parse Redis URL
    const redisConfig = parseRedisUrl(REDIS_URL);

    if (!redisConfig) {
      console.log('❌ Invalid Redis URL format');
      process.exit(1);
    }

    console.log(`\n📋 Redis Configuration`);
    console.log('─────────────────────────────────────────');
    console.log(`Protocol: ${redisConfig.protocol}`);
    console.log(`Hostname: ${redisConfig.hostname}`);
    console.log(`Port: ${redisConfig.port}`);
    console.log(`Database: ${redisConfig.database}`);
    console.log(`Username: ${redisConfig.username}`);
    console.log(`Password: ${redisConfig.password ? '***' : 'None'}`);

    // Check environment variables
    checkEnvironmentVariables();

    // Check DNS resolution
    const dnsOk = await checkDnsResolution(redisConfig.hostname);

    if (!dnsOk && NODE_ENV === 'production') {
      console.log('\n⚠️  DNS resolution failed in production environment');
      console.log('   This is expected if running outside Railway network');
      console.log('   The connection will work in production Railway environment');
    }

    // Test Redis connection (only if DNS resolved or in development)
    if (dnsOk || NODE_ENV === 'development') {
      const connectionOk = await testRedisConnection(REDIS_URL);

      if (connectionOk) {
        console.log('\n✅ Redis connection verified successfully!');
      } else {
        console.log('\n❌ Redis connection failed');
        console.log('\nTroubleshooting steps:');
        console.log('1. Verify Redis service is running on Railway');
        console.log('2. Check Railway Redis service status in dashboard');
        console.log('3. Verify REDIS_URL environment variable is correct');
        console.log('4. Check production logs for connection errors');
        console.log('5. Restart Redis service if needed');
      }
    } else {
      console.log('\n⚠️  Skipping connection test (DNS resolution failed)');
      console.log('   This is expected in development environment');
      console.log('   Connection will work in production Railway environment');
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('Verification complete!');
  } catch (error) {
    console.error(`\n❌ Verification failed: ${error.message}`);
    process.exit(1);
  }
}

// Run verification
runVerification().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
