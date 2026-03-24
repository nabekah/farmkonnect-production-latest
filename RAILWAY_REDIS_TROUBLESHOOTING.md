# Railway Redis Connection Troubleshooting Guide

**Date**: March 24, 2026  
**Issue**: Redis connection failing in production  
**Status**: Investigating

---

## Current Status

### Environment Variables ✅
```
REDIS_URL="redis://default:GHXEaECWgmLqosMigwjBgQiyxXdMSPIo@redis.railway.internal:6379/0"
NODE_ENV="production"
```

**Status**: ✅ Correctly configured

### Production Logs ❌
```
[ERROR] Redis connection error: {"message":"getaddrinfo ENOTFOUND redis.railway.internal"...}
```

**Status**: ❌ Connection failing - DNS cannot resolve `redis.railway.internal`

---

## Diagnosis

### Root Cause
The error `getaddrinfo ENOTFOUND redis.railway.internal` indicates:
1. **DNS Resolution Failure**: The hostname `redis.railway.internal` cannot be resolved
2. **Possible Causes**:
   - Redis service is not running on Railway
   - Redis service crashed or was stopped
   - Network connectivity issue between app and Redis
   - Redis service not properly linked to the app

---

## Step-by-Step Verification

### Step 1: Check Railway Redis Service Status

1. **Go to Railway Dashboard**
   - URL: https://railway.app
   - Log in with your account

2. **Select FarmKonnect Project**
   - Click on your project in the left sidebar
   - You should see all services: App, Database, Redis

3. **Check Redis Service**
   - Click on "Redis" service
   - Look for the service status indicator:
     - 🟢 **Green** = Running (✅ Good)
     - 🔴 **Red** = Stopped (❌ Problem)
     - 🟡 **Yellow** = Deploying (⏳ Wait)

4. **If Redis is Stopped**
   - Click the "Resume" button to restart the service
   - Wait 1-2 minutes for it to start
   - Check the status again

5. **If Redis is Running**
   - Click on "Logs" tab
   - Look for any error messages
   - Check if there are connection errors

---

### Step 2: Verify Redis Connection String

1. **Go to Redis Service**
   - Click on Redis service in Railway dashboard

2. **Check Connection Information**
   - Click on "Connect" tab
   - You should see:
     ```
     Private Networking:
     redis.railway.internal
     ```
   - And:
     ```
     Public Networking:
     switchyard.proxy.rlwy.net:36279
     ```

3. **Verify Environment Variables**
   - Click on "Variables" tab in your App service
   - Look for `REDIS_URL`
   - It should be: `redis://default:***@redis.railway.internal:6379/0`

---

### Step 3: Check Network Connectivity

1. **Verify Services are Linked**
   - Go to your App service
   - Click on "Settings" tab
   - Look for "Linked Services" or "Service Links"
   - Redis should be listed as a linked service

2. **If Not Linked**
   - Click "Add Service Link"
   - Select Redis
   - This enables internal network communication

---

### Step 4: Check Production Logs

1. **Go to App Service Logs**
   - Click on your App service
   - Click on "Logs" tab
   - Look for Redis connection messages

2. **Expected Log Messages**
   - ✅ Good: `[INFO] Redis connected successfully`
   - ❌ Bad: `[ERROR] Redis connection error: getaddrinfo ENOTFOUND`

3. **If Seeing Connection Errors**
   - Note the exact error message
   - Check Redis service status
   - Verify environment variables

---

## Common Issues & Solutions

### Issue 1: Redis Service Stopped
**Symptom**: `getaddrinfo ENOTFOUND redis.railway.internal`

**Solution**:
1. Go to Railway dashboard
2. Click on Redis service
3. Click "Resume" button
4. Wait 1-2 minutes
5. Restart your app service

### Issue 2: Wrong Redis URL
**Symptom**: Connection timeout or authentication error

**Solution**:
1. Verify REDIS_URL in environment variables
2. Should be: `redis://default:PASSWORD@redis.railway.internal:6379/0`
3. Check password is correct: `GHXEaECWgmLqosMigwjBgQiyxXdMSPIo`

### Issue 3: Services Not Linked
**Symptom**: Connection timeout (no response)

**Solution**:
1. Go to App service settings
2. Add Redis as a linked service
3. Restart app service

### Issue 4: Redis Service Crashed
**Symptom**: Intermittent connection failures

**Solution**:
1. Check Redis logs for errors
2. Restart Redis service
3. Check disk space on Railway
4. Monitor memory usage

---

## Verification Checklist

- [ ] Redis service is running (green status in Railway)
- [ ] Redis service is linked to App service
- [ ] REDIS_URL environment variable is set correctly
- [ ] Production logs show successful Redis connection
- [ ] Cache hit rate > 0% (run monitoring test)
- [ ] Response times < 200ms (run monitoring test)

---

## Testing After Fix

### 1. Run Production Monitoring Test
```bash
node production_monitoring_test.mjs
```

**Expected Results**:
- ✅ Cache Hit Rate: 70-80% (was 0%)
- ✅ Average Response Time: <200ms (was 515ms)
- ✅ Success Rate: 100%

### 2. Check Sentry Dashboard
- Go to https://sentry.io
- Log in to FarmKonnect project
- Look for Redis-related errors
- Should see fewer errors after fix

### 3. Test End-to-End Flows
- Log in with admin credentials
- Verify dashboard loads quickly
- Test SMS notifications
- Check for any errors

---

## Performance Expectations

### Before Redis Fix
- Average Response Time: 515.77ms
- Cache Hit Rate: 0%
- Database Queries: 100%
- Success Rate: 100%

### After Redis Fix (Expected)
- Average Response Time: <200ms (77% improvement)
- Cache Hit Rate: 70-80%
- Database Queries: 20-30%
- Success Rate: 99%+

---

## Next Steps

1. **Verify Redis Service Status** on Railway dashboard
2. **Check Environment Variables** are correctly set
3. **Restart Services** if needed
4. **Run Monitoring Test** to verify fix
5. **Monitor Sentry Dashboard** for errors

---

## Support Resources

- **Railway Docs**: https://docs.railway.app
- **Redis Docs**: https://redis.io/docs
- **Sentry Docs**: https://docs.sentry.io
- **FarmKonnect Logs**: Check Railway dashboard logs

---

**Last Updated**: March 24, 2026  
**Status**: Awaiting Redis service verification on Railway
