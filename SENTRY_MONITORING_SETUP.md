# Sentry Monitoring Setup Guide

**Date**: March 24, 2026  
**Project**: FarmKonnect  
**DSN**: https://bc731bb6d6d97c1ff4197ce09cfe91ed@o4511101278486528.ingest.us.sentry.io/4511101312761856

---

## Quick Start

### 1. Access Sentry Dashboard
1. Go to **https://sentry.io**
2. Log in with your account
3. Select **FarmKonnect** project from the dropdown

---

## Setting Up Alerts

### Alert 1: High Error Rate
1. Click **"Alerts"** in left sidebar
2. Click **"Create Alert Rule"**
3. Configure:
   - **Alert Name**: "High Error Rate"
   - **Event Type**: Error
   - **Condition**: Error rate > 5% in 5 minutes
   - **Action**: Send email to your address
   - **Severity**: Critical

### Alert 2: Performance Degradation
1. Click **"Create Alert Rule"**
2. Configure:
   - **Alert Name**: "Slow Transactions"
   - **Event Type**: Transaction
   - **Condition**: P95 response time > 500ms
   - **Action**: Send email notification
   - **Severity**: Warning

### Alert 3: New Error Type
1. Click **"Create Alert Rule"**
2. Configure:
   - **Alert Name**: "New Error"
   - **Event Type**: Error
   - **Condition**: New error type detected
   - **Action**: Send email notification
   - **Severity**: Warning

---

## Monitoring Performance

### View Performance Metrics
1. Click **"Performance"** in left sidebar
2. See transaction breakdown:
   - `farms.list` - Target: <200ms
   - `crops.list` - Target: <200ms
   - `animals.list` - Target: <200ms
   - `marketplace.listProducts` - Target: <200ms

### Set Performance Thresholds
1. Click **"Settings"** → **"Performance"**
2. Set thresholds:
   - **Slow Transaction**: 500ms
   - **Very Slow Transaction**: 1000ms
   - **Slow DB Query**: 100ms

### View Performance Trends
1. Click **"Performance"** tab
2. Select time range (24h, 7d, 30d)
3. Analyze:
   - Response time trends
   - Error rate trends
   - Transaction volume

---

## Creating Custom Dashboards

### Dashboard 1: Performance Overview
1. Click **"Dashboards"** in left sidebar
2. Click **"Create Dashboard"**
3. Name: "Performance Overview"
4. Add widgets:
   - **Avg Response Time** (all transactions)
   - **Error Rate** (last 24h)
   - **Cache Hit Rate** (if available)
   - **P95 Response Time**
   - **P99 Response Time**

### Dashboard 2: Error Analysis
1. Click **"Create Dashboard"**
2. Name: "Error Analysis"
3. Add widgets:
   - **Top Errors** (last 24h)
   - **Error Rate Trend** (7d)
   - **Affected Users** (last 24h)
   - **Error by Endpoint**

### Dashboard 3: Cache Performance
1. Click **"Create Dashboard"**
2. Name: "Cache Performance"
3. Add widgets:
   - **Cache Hit Rate** (if available)
   - **Response Time by Cache Status**
   - **Top Cached Endpoints**
   - **Cache Invalidation Events**

---

## Monitoring Real-Time Errors

### View Live Issues
1. Click **"Issues"** in left sidebar
2. See all errors in real-time
3. Click on any error to see:
   - **Stack Trace**: Exact error location
   - **Breadcrumbs**: User actions before error
   - **User Context**: Which user encountered error
   - **Device Info**: Browser, OS, device
   - **Release Info**: Which version has the error

### Triage Errors
1. Click on an error
2. Options:
   - **Resolve**: Mark as fixed
   - **Ignore**: Ignore this error type
   - **Assign**: Assign to team member
   - **Set Priority**: High, Medium, Low

### Search Errors
Use search to find specific errors:
```
error.type:TypeError
error.value:"Cannot read property"
transaction:farms.list
user.email:admin@farmkonnect.com
```

---

## Setting Up Team Notifications

### Email Notifications
1. Click **"Settings"** → **"Notifications"**
2. Configure:
   - **Email**: Your email address
   - **Frequency**: Immediate or Digest
   - **Alert Types**: Errors, Performance, Releases

### Slack Integration (Optional)
1. Click **"Settings"** → **"Integrations"**
2. Click **"Slack"**
3. Follow authorization flow
4. Select channel for notifications

### PagerDuty Integration (Optional)
1. Click **"Settings"** → **"Integrations"**
2. Click **"PagerDuty"**
3. Follow authorization flow
4. Configure incident routing

---

## Key Metrics to Monitor

### Error Metrics
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Error Rate | <1% | >5% |
| Error Count | <10/hour | >50/hour |
| Unique Errors | <5/day | >20/day |
| Error Resolution Time | <1 hour | >4 hours |

### Performance Metrics
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Avg Response Time | <200ms | >500ms |
| P95 Response Time | <500ms | >1000ms |
| P99 Response Time | <1000ms | >2000ms |
| Throughput | 400+ req/s | <100 req/s |

### Cache Metrics
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Cache Hit Rate | 70-80% | <50% |
| Cache Miss Rate | 20-30% | >50% |
| Cache Invalidation | Normal | >100/hour |

---

## Analyzing Error Patterns

### Common Errors to Watch For
1. **Authentication Errors**
   - NOAUTH errors (Redis)
   - JWT validation failures
   - OAuth callback errors

2. **Database Errors**
   - Connection timeouts
   - Query failures
   - Transaction rollbacks

3. **Cache Errors**
   - Redis connection failures
   - Cache invalidation issues
   - Serialization errors

4. **API Errors**
   - Timeout errors
   - Rate limit errors
   - Invalid request errors

### Error Investigation Steps
1. **Identify Error**: What is the error message?
2. **Find Root Cause**: Where in the code did it occur?
3. **Check Context**: Which user? Which endpoint? When?
4. **Determine Impact**: How many users affected?
5. **Fix and Deploy**: Implement fix and redeploy
6. **Verify Fix**: Monitor error rate after deployment

---

## Performance Optimization Tips

### Based on Sentry Data
1. **Identify Slow Endpoints**
   - Look at P95/P99 response times
   - Check which transactions are slowest
   - Correlate with error rates

2. **Optimize Slow Transactions**
   - Add caching (already done)
   - Optimize database queries
   - Reduce payload size
   - Implement pagination

3. **Monitor Cache Effectiveness**
   - Check cache hit rates
   - Adjust TTL values
   - Monitor memory usage
   - Verify cache invalidation

4. **Track Performance Improvements**
   - Compare before/after metrics
   - Monitor response time trends
   - Track error rate improvements
   - Measure user impact

---

## Weekly Monitoring Checklist

- [ ] Review error rate (should be <1%)
- [ ] Check top 5 errors
- [ ] Verify performance metrics (<200ms avg)
- [ ] Review cache hit rates (target: 70-80%)
- [ ] Check alert configuration
- [ ] Review user impact
- [ ] Plan optimizations if needed
- [ ] Update team on status

---

## Sentry Features to Explore

### Advanced Features
- **Source Maps**: Upload source maps for better stack traces
- **Custom Integrations**: Integrate with your tools
- **Release Tracking**: Track errors by release
- **Environment Filtering**: Filter by production/staging
- **Custom Tags**: Add custom metadata to errors
- **Replay**: Watch user sessions that led to errors

### Documentation
- **Sentry Docs**: https://docs.sentry.io/
- **Performance Monitoring**: https://docs.sentry.io/product/performance/
- **Alerts**: https://docs.sentry.io/product/alerts/
- **Integrations**: https://docs.sentry.io/product/integrations/

---

## Support

For questions or issues:
1. Check Sentry documentation
2. Review error details in dashboard
3. Check server logs in Railway
4. Consult integration guides

---

**Status**: Sentry monitoring is ready to use! 🚀

**Next Steps**:
1. Log in to Sentry dashboard
2. Set up alerts (high error rate, performance degradation)
3. Create custom dashboards
4. Start monitoring real-time errors
5. Optimize based on data
