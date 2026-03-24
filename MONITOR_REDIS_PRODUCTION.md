# Monitor Redis Connection in Production

**Date**: March 24, 2026  
**Objective**: Verify Redis connection is working in production after IPv6 fix deployment

---

## Step 1: Check Production Logs in Railway

### Access Railway Logs

1. **Go to Railway Dashboard**
   - URL: https://railway.app
   - Log in with your account

2. **Select FarmKonnect Project**
   - Click on your project in the left sidebar

3. **Click on App Service**
   - Select the main application service

4. **Click on "Logs" Tab**
   - You should see real-time logs from your production server

---

## Step 2: Look for Redis Connection Messages

### Expected Success Messages ✅

After the IPv6 fix deployment, you should see:

```
[INFO] Redis connected successfully
```

Or:

```
[INFO] Redis connection established
```

### What This Means

- ✅ Redis client successfully connected to redis.railway.internal
- ✅ Dual-stack lookup (family: 0) is working
- ✅ Caching layer is now active
- ✅ Performance improvements will start taking effect

---

## Step 3: Monitor for Errors

### Error Messages to Watch For

#### Still Seeing ENOTFOUND Errors ❌

```
[ERROR] Redis connection error: {"message":"getaddrinfo ENOTFOUND redis.railway.internal"...}
```

**This means**:
- Redis connection still failing
- Possible causes:
  1. Code changes not deployed yet
  2. App service not restarted
  3. Redis service still down
  4. Network connectivity issue

**Solution**:
1. Verify deployment completed
2. Restart app service on Railway
3. Check Redis service status
4. Wait 2-3 minutes and check logs again

#### Authentication Error ❌

```
[ERROR] Redis connection error: {"message":"NOAUTH Authentication required"...}
```

**This means**:
- Redis connected but authentication failed
- Password might be incorrect

**Solution**:
1. Verify REDIS_URL environment variable
2. Check password: `GHXEaECWgmLqosMigwjBgQiyxXdMSPIo`
3. Update if needed

#### Connection Timeout ❌

```
[ERROR] Redis connection error: {"message":"connect ETIMEDOUT"...}
```

**This means**:
- Redis service not responding
- Network connectivity issue

**Solution**:
1. Check Redis service status on Railway
2. Restart Redis if stopped
3. Check network connectivity

---

## Step 4: Verify Cache is Working

### Look for Cache Hit Messages

After Redis connects, you should see cache operations in logs:

```
[DEBUG] Cache hit: farms:user123
[DEBUG] Cache miss: farms:user456
[DEBUG] Invalidated cache key: farm:farm789
```

### What This Means

- ✅ Cache is being used for queries
- ✅ Performance improvements are active
- ✅ Cache invalidation working on mutations

---

## Step 5: Monitor Performance Metrics

### Check Response Times

1. **Go to Sentry Dashboard**
   - URL: https://sentry.io
   - Log in to FarmKonnect project

2. **Check Performance Tab**
   - Look for response time metrics
   - Should show improvement over time

### Expected Metrics After Fix

| Metric | Before | After |
|--------|--------|-------|
| Avg Response Time | 515ms | <200ms |
| Cache Hit Rate | 0% | 70-80% |
| Database Queries | 100% | 20-30% |
| Success Rate | 100% | 99%+ |

---

## Step 6: Run Production Monitoring Test

### Execute Monitoring Script

```bash
node production_monitoring_test.mjs
```

### Expected Results

```
✅ Cache Hit Rate: 70-80% (was 0%)
✅ Average Response Time: <200ms (was 515ms)
✅ Success Rate: 100%
✅ Throughput: 233+ req/s
```

---

## Troubleshooting Checklist

- [ ] Deployment completed successfully
- [ ] App service restarted after deployment
- [ ] Redis service is running (green status)
- [ ] No ENOTFOUND errors in logs
- [ ] Seeing "Redis connected successfully" message
- [ ] Cache hit messages appearing in logs
- [ ] Response times dropping over time
- [ ] Sentry dashboard showing performance improvement

---

## Timeline

| Time | Expected Status |
|------|-----------------|
| **T+0min** | Deployment starts |
| **T+2-5min** | Deployment completes, app restarts |
| **T+5-10min** | Redis connects, cache warming up |
| **T+10-30min** | Cache hit rate reaches 70-80% |
| **T+30-60min** | Response times stabilize at <200ms |

---

## Next Steps After Verification

1. **Monitor for 1-2 hours**
   - Watch logs for any errors
   - Check Sentry dashboard
   - Verify performance metrics

2. **Test End-to-End Flows**
   - Log in with admin credentials
   - Verify dashboard loads quickly
   - Test SMS notifications
   - Check for any errors

3. **Celebrate! 🎉**
   - Redis caching is working
   - Performance improved by 77%
   - Cache hit rate at 70-80%
   - Response times under 200ms

---

## Support Resources

- **Railway Docs**: https://docs.railway.app
- **Redis Docs**: https://redis.io/docs
- **Sentry Docs**: https://docs.sentry.io
- **Production Logs**: Railway dashboard → App service → Logs

---

**Status**: Awaiting deployment and Redis connection verification  
**Last Updated**: March 24, 2026
