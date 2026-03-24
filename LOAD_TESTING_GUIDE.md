# Load Testing & Performance Verification Guide

**Date**: March 24, 2026  
**Target**: Verify 77% response time improvement (860ms → <200ms)

---

## Pre-Test Checklist

- [ ] Production deployment complete
- [ ] Redis caching enabled
- [ ] Sentry monitoring active
- [ ] All environment variables configured
- [ ] Load test script available: `load_test_with_caching.mjs`

---

## Load Test Configuration

### Test Parameters
| Parameter | Value | Notes |
|-----------|-------|-------|
| **Concurrent Users** | 50 | Simulates 50 simultaneous users |
| **Requests per User** | 100 | Each user makes 100 requests |
| **Total Requests** | 5,000 | 50 × 100 |
| **Duration** | ~60 seconds | Approximate test duration |
| **Endpoints Tested** | 4 | farms, crops, animals, marketplace |

### Endpoints Tested
1. **farms.list** - Cached (30 min TTL)
2. **crops.list** - Cached (30 min TTL)
3. **animals.list** - Cached (30 min TTL)
4. **marketplace.listProducts** - Cached (5 min TTL)

---

## Running Load Tests

### Test 1: Development Environment (Baseline)
```bash
cd /home/ubuntu/farmkonnect_app

# Run with development server
BASE_URL=http://localhost:3001 \
CONCURRENT_USERS=50 \
DURATION_SECONDS=60 \
REQUESTS_PER_USER=100 \
node load_test_with_caching.mjs
```

**Expected Results**:
- Avg Response Time: <200ms (with cache)
- Success Rate: >99%
- Cache Hit Rate: 70-80%

### Test 2: Production Environment (Full Load)
```bash
# Run against production
BASE_URL=https://www.farmconnekt.com \
CONCURRENT_USERS=50 \
DURATION_SECONDS=60 \
REQUESTS_PER_USER=100 \
node load_test_with_caching.mjs
```

**Expected Results**:
- Avg Response Time: <200ms
- Success Rate: >99%
- Cache Hit Rate: 70-80%
- Throughput: 400+ req/s

### Test 3: High Load Test (Stress Test)
```bash
# Run with higher load
BASE_URL=https://www.farmconnekt.com \
CONCURRENT_USERS=200 \
DURATION_SECONDS=120 \
REQUESTS_PER_USER=200 \
node load_test_with_caching.mjs
```

**Expected Results**:
- Avg Response Time: <300ms
- Success Rate: >95%
- Cache Hit Rate: 70-80%
- Throughput: 800+ req/s

---

## Interpreting Test Results

### Response Time Metrics
| Metric | Target | Acceptable | Needs Improvement |
|--------|--------|-----------|-------------------|
| **Min** | <50ms | <100ms | >100ms |
| **Max** | <500ms | <1000ms | >1000ms |
| **Avg** | <200ms | <300ms | >300ms |
| **P50** | <150ms | <250ms | >250ms |
| **P95** | <400ms | <600ms | >600ms |
| **P99** | <800ms | <1200ms | >1200ms |

### Success Rate
| Rate | Status | Action |
|------|--------|--------|
| >99% | ✅ Excellent | Continue monitoring |
| 95-99% | ⚠️ Good | Monitor for issues |
| 90-95% | ❌ Needs Work | Investigate errors |
| <90% | ❌ Critical | Stop and debug |

### Cache Hit Rate
| Rate | Status | Action |
|------|--------|--------|
| 70-80% | ✅ Excellent | Optimal caching |
| 50-70% | ⚠️ Good | Consider increasing TTL |
| 30-50% | ❌ Needs Work | Increase TTL or fix invalidation |
| <30% | ❌ Critical | Check cache configuration |

### Throughput
| Throughput | Status | Notes |
|-----------|--------|-------|
| >400 req/s | ✅ Excellent | Handles 50 concurrent users |
| 200-400 req/s | ⚠️ Good | Handles moderate load |
| <200 req/s | ❌ Needs Work | Optimize or scale |

---

## Performance Improvement Verification

### Before Optimization
```
Baseline (without caching):
- Avg Response Time: 860ms
- Success Rate: 67.4%
- Throughput: ~200 req/s
- Cache Hit Rate: 0%
```

### After Optimization (Expected)
```
With Redis Caching:
- Avg Response Time: <200ms (77% improvement)
- Success Rate: >99% (47% improvement)
- Throughput: >400 req/s (100% improvement)
- Cache Hit Rate: 70-80%
```

### Verification Steps
1. **Run load test** against production
2. **Compare metrics** to baseline
3. **Verify cache hit rate** is 70-80%
4. **Check error rate** in Sentry
5. **Monitor response times** in Sentry Performance

---

## Troubleshooting Load Test Issues

### Issue: Low Cache Hit Rate (<50%)
**Possible Causes**:
- Cache TTL too short
- Cache invalidation too aggressive
- Cache key generation incorrect
- Redis connection issues

**Solutions**:
1. Check cache TTL in `server/_core/cacheMiddleware.ts`
2. Verify cache invalidation logic
3. Check Redis connection status
4. Review cache key generation

### Issue: High Error Rate (>5%)
**Possible Causes**:
- Database connection issues
- Redis connection issues
- Authentication failures
- Rate limiting

**Solutions**:
1. Check database connection in Railway
2. Verify Redis connection
3. Check authentication configuration
4. Review error logs in Sentry

### Issue: Slow Response Times (>300ms)
**Possible Causes**:
- Cache not working
- Database queries slow
- Redis latency
- Server CPU/memory issues

**Solutions**:
1. Verify cache hit rate
2. Optimize database queries
3. Check Redis latency
4. Monitor server resources

### Issue: Connection Timeouts
**Possible Causes**:
- Network issues
- Server overloaded
- Connection pool exhausted
- Firewall rules

**Solutions**:
1. Check network connectivity
2. Monitor server resources
3. Increase connection pool size
4. Review firewall rules

---

## Performance Optimization Tips

### Based on Load Test Results

1. **If Cache Hit Rate is Low**
   - Increase TTL for frequently accessed data
   - Review cache invalidation logic
   - Verify cache key generation

2. **If Response Times are Slow**
   - Check database query performance
   - Verify Redis is working
   - Optimize slow endpoints
   - Add more caching

3. **If Error Rate is High**
   - Check error logs in Sentry
   - Verify database connection
   - Check Redis connection
   - Review authentication

4. **If Throughput is Low**
   - Scale horizontally (add more servers)
   - Optimize code
   - Increase cache effectiveness
   - Reduce payload size

---

## Continuous Monitoring

### Daily Monitoring
- Check error rate (<1%)
- Monitor response times (<200ms avg)
- Verify cache hit rate (70-80%)
- Review top errors in Sentry

### Weekly Monitoring
- Run load test (compare to baseline)
- Review performance trends
- Analyze cache effectiveness
- Plan optimizations

### Monthly Monitoring
- Comprehensive performance review
- Capacity planning
- Optimization recommendations
- Team sync on metrics

---

## Load Test Results Template

```
Load Test Results - [DATE]
==========================

Configuration:
- Base URL: [URL]
- Concurrent Users: [N]
- Requests per User: [N]
- Total Requests: [N]
- Duration: [S] seconds

Results:
- Total Requests: [N]
- Successful: [N] ([%]%)
- Failed: [N] ([%]%)

Response Times:
- Min: [N]ms
- Max: [N]ms
- Avg: [N]ms
- P50: [N]ms
- P95: [N]ms
- P99: [N]ms

Cache Performance:
- Cache Hits: [N]
- Cache Misses: [N]
- Hit Rate: [N]%

Performance Assessment:
- Status: [EXCELLENT/GOOD/NEEDS WORK]
- Throughput: [N] req/s
- Compared to Baseline: [+/-N]%

Errors:
- [Error Type]: [Count]

Recommendations:
1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]
```

---

## Success Criteria

### Performance Targets (All Must Pass)
- ✅ Avg Response Time: <200ms
- ✅ Success Rate: >99%
- ✅ Cache Hit Rate: 70-80%
- ✅ Error Rate: <1%
- ✅ Throughput: >400 req/s

### If All Targets Met
✅ **DEPLOYMENT SUCCESSFUL**
- Production is ready
- Performance improved 77%
- System is scalable
- Monitoring is active

### If Any Target Not Met
⚠️ **INVESTIGATE & OPTIMIZE**
- Review error logs
- Check cache configuration
- Optimize slow endpoints
- Scale if needed

---

## Next Steps After Load Testing

1. **Document Results** - Save load test results
2. **Compare to Baseline** - Verify 77% improvement
3. **Monitor Sentry** - Watch for errors
4. **Adjust Cache TTL** - Fine-tune based on results
5. **Team Notification** - Share results with team
6. **Continuous Monitoring** - Set up daily checks

---

**Status**: Load testing guide ready! 🚀

**Next**: Run load tests and verify performance improvements
