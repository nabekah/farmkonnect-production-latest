#!/usr/bin/env node

/**
 * Redis Connection Monitoring Script
 * Analyzes production logs to verify Redis connection status
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Redis Connection Log Analyzer');
console.log('═══════════════════════════════════════════\n');

// Log patterns to check
const patterns = {
  success: [
    'Redis connected successfully',
    'Redis connection established',
    'Redis ready',
    '[INFO] Redis',
  ],
  errors: [
    'ENOTFOUND redis.railway.internal',
    'NOAUTH Authentication required',
    'ETIMEDOUT',
    'Redis connection error',
    '[ERROR] Redis',
  ],
  cacheOperations: [
    'Cache hit:',
    'Cache miss:',
    'Invalidated cache',
    'Cache operation',
  ],
};

// Check if logs directory exists
const logsDir = path.join(__dirname, '.manus-logs');
const devserverLog = path.join(logsDir, 'devserver.log');

console.log('📋 Checking Production Logs\n');

if (!fs.existsSync(logsDir)) {
  console.log('⚠️  Logs directory not found: .manus-logs/');
  console.log('\nTo check production logs:');
  console.log('1. Go to Railway Dashboard: https://railway.app');
  console.log('2. Select FarmKonnect Project');
  console.log('3. Click on App Service');
  console.log('4. Click on "Logs" tab');
  console.log('5. Look for Redis connection messages\n');
  process.exit(0);
}

if (!fs.existsSync(devserverLog)) {
  console.log('⚠️  Dev server log not found: .manus-logs/devserver.log');
  console.log('\nTo check production logs:');
  console.log('1. Go to Railway Dashboard: https://railway.app');
  console.log('2. Select FarmKonnect Project');
  console.log('3. Click on App Service');
  console.log('4. Click on "Logs" tab\n');
  process.exit(0);
}

// Read logs
const logs = fs.readFileSync(devserverLog, 'utf8');
const lines = logs.split('\n');

console.log(`📄 Analyzing ${lines.length} log lines...\n`);

// Analyze logs
let successCount = 0;
let errorCount = 0;
let cacheCount = 0;
let lastSuccess = null;
let lastError = null;

for (const line of lines) {
  // Check for success messages
  for (const pattern of patterns.success) {
    if (line.includes(pattern)) {
      successCount++;
      lastSuccess = line;
      break;
    }
  }

  // Check for errors
  for (const pattern of patterns.errors) {
    if (line.includes(pattern)) {
      errorCount++;
      lastError = line;
      break;
    }
  }

  // Check for cache operations
  for (const pattern of patterns.cacheOperations) {
    if (line.includes(pattern)) {
      cacheCount++;
      break;
    }
  }
}

// Display results
console.log('📊 Analysis Results\n');
console.log('─────────────────────────────────────────');

if (successCount > 0) {
  console.log(`✅ Redis Success Messages: ${successCount}`);
  console.log(`   Last: ${lastSuccess?.substring(0, 100)}...\n`);
} else {
  console.log(`❌ Redis Success Messages: 0\n`);
}

if (errorCount > 0) {
  console.log(`❌ Redis Error Messages: ${errorCount}`);
  console.log(`   Last: ${lastError?.substring(0, 100)}...\n`);
} else {
  console.log(`✅ Redis Error Messages: 0\n`);
}

if (cacheCount > 0) {
  console.log(`✅ Cache Operations: ${cacheCount}`);
  console.log(`   Cache is actively being used\n`);
} else {
  console.log(`⚠️  Cache Operations: 0`);
  console.log(`   Cache may not be active yet\n`);
}

// Status summary
console.log('─────────────────────────────────────────');
console.log('\n📈 Status Summary\n');

if (successCount > 0 && errorCount === 0) {
  console.log('✅ REDIS CONNECTED SUCCESSFULLY!');
  console.log('   - Redis connection is working');
  console.log('   - No connection errors detected');
  if (cacheCount > 0) {
    console.log('   - Cache operations active');
  }
} else if (successCount > 0 && errorCount > 0) {
  console.log('⚠️  REDIS CONNECTED WITH INTERMITTENT ERRORS');
  console.log('   - Redis connected but experiencing issues');
  console.log('   - Check error details above');
} else if (errorCount > 0) {
  console.log('❌ REDIS CONNECTION FAILED');
  console.log('   - Redis not connecting');
  console.log('   - Check error details above');
} else {
  console.log('❓ NO REDIS MESSAGES FOUND');
  console.log('   - Redis may not have started yet');
  console.log('   - Check production logs on Railway');
}

console.log('\n═══════════════════════════════════════════');
console.log('\n📝 Recommendations\n');

if (successCount === 0) {
  console.log('1. Check production logs on Railway Dashboard');
  console.log('   - Go to https://railway.app');
  console.log('   - Select FarmKonnect Project');
  console.log('   - Click App Service → Logs tab');
  console.log('');
  console.log('2. Verify deployment completed');
  console.log('   - Check if latest code was deployed');
  console.log('   - Restart app service if needed');
  console.log('');
  console.log('3. Check Redis service status');
  console.log('   - Go to Railway Dashboard');
  console.log('   - Click on Redis service');
  console.log('   - Verify status is green (running)');
  console.log('');
  console.log('4. Wait for app to fully start');
  console.log('   - Redis connection takes 5-10 seconds');
  console.log('   - Check logs again after waiting');
} else if (errorCount > 0) {
  console.log('1. Review error messages above');
  console.log('2. Check Redis service status on Railway');
  console.log('3. Verify REDIS_URL environment variable');
  console.log('4. Restart app service if needed');
} else {
  console.log('✅ Redis is connected and working!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run monitoring test: node production_monitoring_test.mjs');
  console.log('2. Verify cache hit rate reaches 70-80%');
  console.log('3. Verify response times drop to <200ms');
  console.log('4. Monitor Sentry dashboard for errors');
}

console.log('\n═══════════════════════════════════════════\n');
