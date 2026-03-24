# Production Deployment Verification Guide

**Date**: March 24, 2026  
**Status**: Ready for Deployment

---

## Step 1: Deploy to Production

### Option A: Deploy via Manus UI (Recommended)
1. Go to the Manus Management UI
2. Click the **"Publish"** button in the top-right corner
3. Select **"Deploy to Production"**
4. Wait for deployment to complete (2-5 minutes)
5. Verify deployment status shows "✅ Active"

### Option B: Deploy via Railway Dashboard
1. Go to https://railway.app
2. Select your FarmKonnect project
3. Click **"Deploy"** button
4. Select latest commit with caching integration
5. Wait for deployment to complete

---

## Step 2: Verify Deployment Success

### Check Production Environment Variables
```bash
# Verify in Railway Dashboard:
# 1. Go to Variables tab
# 2. Confirm SENTRY_DSN is set
# 3. Confirm REDIS_URL is set
```

### Verify Application is Running
```bash
# Check production URL
curl -I https://www.farmconnekt.com/

# Expected response: 200 OK
```

### Verify Caching is Active
```bash
# Make a request to a cached endpoint
curl -X GET "https://www.farmconnekt.com/api/trpc/farms.list"

# Check response headers for cache status
# Look for X-Cache: HIT or MISS
```

---

## Step 3: Set Up Sentry Monitoring

### 1. Access Sentry Dashboard
1. Go to https://sentry.io
2. Log in with your account
3. Select **FarmKonnect** project

### 2. Configure Alerts
1. Click **"Alerts"** in left sidebar
2. Click **"Create Alert Rule"**
3. Set up alert for:
   - **Event Type**: Error
   - **Condition**: Error rate > 5% in 5 minutes
   - **Action**: Send email notification

### 3. Configure Performance Monitoring
1. Click **"Performance"** in left sidebar
2. Set up transaction monitoring for:
   - `farms.list` (target: <200ms)
   - `crops.list` (target: <200ms)
   - `animals.list` (target: <200ms)
   - `marketplace.listProducts` (target: <200ms)

### 4. Set Up Custom Dashboards
1. Click **"Dashboards"** in left sidebar
2. Create dashboard for:
   - Error trends
   - Performance metrics
   - Cache hit rates
   - User impact

---

## Step 4: Run Load Tests

### Prerequisites
- Production URL: https://www.farmconnekt.com
- Test duration: 60 seconds
- Concurrent users: 50
- Requests per user: 100

### Run Load Test
```bash
cd /home/ubuntu/farmkonnect_app

# Run with default settings (50 users, 60s, 100 requests each)
node load_test_with_caching.mjs

# Or customize:
BASE_URL=https://www.farmconnekt.com \
CONCURRENT_USERS=100 \
DURATION_SECONDS=120 \
REQUESTS_PER_USER=200 \
node load_test_with_caching.mjs
```

### Expected Results
- **Response Time**: <200ms average
- **Success Rate**: >99%
- **Cache Hit Rate**: 70-80%
- **Throughput**: 400+ req/s

---

## Step 5: Monitor Real-Time Errors

### In Sentry Dashboard
1. Go to **"Issues"** tab
2. Watch for real-time errors
3. Click on any error to see:
   - Stack trace
   - User context
   - Breadcrumbs (user actions)
   - Performance impact

### Key Metrics to Monitor
- **Error Rate**: Should be <1%
- **P95 Response Time**: Should be <500ms
- **P99 Response Time**: Should be <1000ms
- **Cache Hit Rate**: Should be 70-80%

---

## Step 6: Verify Cache Performance

### Check Cache Statistics
1. Monitor Redis cache hit rates
2. Verify data is being cached:
   - Farms (30 minute TTL)
   - Crops (30 minute TTL)
   - Animals (30 minute TTL)
   - Marketplace products (5 minute TTL)

### Adjust Cache TTL if Needed
If cache hit rate is too low:
1. Increase TTL in `server/_core/cacheMiddleware.ts`
2. Redeploy to production
3. Monitor new hit rates

If cache hit rate is too high (stale data):
1. Decrease TTL
2. Redeploy to production
3. Monitor data freshness

---

## Troubleshooting

### Issue: Caching Not Working
**Solution**:
1. Verify REDIS_URL is set in Railway
2. Check Redis connection in server logs
3. Verify cache middleware is enabled
4. Check cache key generation

### Issue: Sentry Not Capturing Errors
**Solution**:
1. Verify SENTRY_DSN is set in Railway
2. Check Sentry project settings
3. Verify errors are being thrown
4. Check Sentry rate limits

### Issue: High Response Times
**Solution**:
1. Check cache hit rate (should be 70-80%)
2. Verify Redis connection is healthy
3. Check database query performance
4. Monitor server CPU and memory

### Issue: Low Success Rate
**Solution**:
1. Check error logs in Sentry
2. Verify database connection
3. Check Redis connection
4. Monitor server resources

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Avg Response Time | <200ms | TBD |
| P95 Response Time | <500ms | TBD |
| P99 Response Time | <1000ms | TBD |
| Success Rate | >99% | TBD |
| Cache Hit Rate | 70-80% | TBD |
| Error Rate | <1% | TBD |

---

## Rollback Plan

If issues occur after deployment:

1. **Go to Railway Dashboard**
2. **Click "Deployments"** tab
3. **Select previous stable version**
4. **Click "Redeploy"**
5. **Wait for rollback to complete**

Previous stable version: `645e7a66` (before caching integration)

---

## Post-Deployment Checklist

- [ ] Application deployed to production
- [ ] Environment variables verified (SENTRY_DSN, REDIS_URL)
- [ ] Caching is active (check X-Cache headers)
- [ ] Sentry is capturing errors
- [ ] Load tests completed successfully
- [ ] Performance targets met
- [ ] Alerts configured in Sentry
- [ ] Team notified of deployment
- [ ] Documentation updated

---

## Support & Monitoring

### Continuous Monitoring
- Monitor Sentry dashboard daily
- Check cache hit rates weekly
- Review performance metrics weekly
- Adjust cache TTL based on usage

### Documentation
- `REDIS_SENTRY_INTEGRATION_GUIDE.md` - Integration details
- `PERFORMANCE_OPTIMIZATION_SUMMARY.md` - Performance metrics
- `PRODUCTION_ENV_UPDATES.md` - Environment setup
- `load_test_with_caching.mjs` - Load testing script

### Contact
For issues or questions:
1. Check Sentry dashboard for error details
2. Review server logs in Railway
3. Check Redis connection status
4. Consult integration guides

---

**Status**: Ready for Production Deployment ✅
