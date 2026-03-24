# How to Get Your Sentry DSN

## Step-by-Step Guide

### Step 1: Create a Sentry Account
1. Go to **[sentry.io](https://sentry.io)** in your browser
2. Click **"Sign Up"** (or **"Get Started"** if you see that button)
3. Choose your sign-up method:
   - Email + Password
   - GitHub
   - Google
   - Microsoft
4. Complete the sign-up process

### Step 2: Create a New Project
1. After signing up, you'll see the Sentry dashboard
2. Click **"Create Project"** or **"+ Create Project"** button
3. Select **"Node.js"** as the platform
4. Select **"Express"** as the framework (or just "Node.js" if Express isn't listed)
5. Click **"Create Project"**

### Step 3: Find Your DSN
1. After creating the project, you'll see a setup page
2. Look for the **DSN** field - it will look like:
   ```
   https://examplePublicKey@o0.ingest.sentry.io/0
   ```
3. **Copy this entire URL** - this is your SENTRY_DSN

### Step 4: (Optional) Verify Your DSN
1. On the same setup page, you should see a code example
2. The DSN is also shown in:
   - **Settings** → **Client Keys (DSN)** in the left sidebar
3. You can have multiple DSNs if you have multiple projects

---

## What Your DSN Looks Like

Your Sentry DSN will have this format:
```
https://<publicKey>@<sentryHost>/projectId
```

Example:
```
https://abc123def456@o1234567.ingest.sentry.io/5678901
```

---

## Where to Use Your DSN

Once you have your DSN:

1. **In Development** (optional):
   - Add to `.env` file:
     ```
     SENTRY_DSN=https://your-dsn-here
     ```

2. **In Production** (Railway):
   - Go to your Railway project
   - Click **"Variables"** tab
   - Add new variable:
     - **Key**: `SENTRY_DSN`
     - **Value**: Paste your DSN here
   - Click **"Save"**

---

## Troubleshooting

### "I can't find the DSN"
- Make sure you're logged into Sentry
- Go to your project → **Settings** (left sidebar) → **Client Keys (DSN)**
- The DSN should be displayed there

### "I see multiple DSNs"
- Each Sentry project has one DSN
- If you see multiple, you might have multiple projects
- Use the DSN for the project you just created

### "The DSN looks different"
- Different Sentry regions might have different URLs
- Common formats:
  - `https://key@org.ingest.sentry.io/project-id` (US)
  - `https://key@org.ingest.eu.sentry.io/project-id` (EU)
- Both formats work fine

---

## Quick Reference

| Step | Action |
|------|--------|
| 1 | Go to sentry.io and sign up |
| 2 | Create a new Node.js/Express project |
| 3 | Copy the DSN from the setup page |
| 4 | Add to Railway variables as `SENTRY_DSN` |
| 5 | Deploy and monitor errors in real-time |

---

## What Happens After Setup

Once your DSN is configured:

1. **Error Tracking**: All errors in your app are automatically sent to Sentry
2. **Real-Time Alerts**: You'll get notified of errors as they happen
3. **Performance Monitoring**: Slow requests are tracked
4. **Error Grouping**: Similar errors are grouped together
5. **User Context**: You can see which user encountered the error

---

## Support

- **Sentry Docs**: https://docs.sentry.io/
- **Node.js Integration**: https://docs.sentry.io/platforms/node/
- **tRPC Integration**: https://docs.sentry.io/platforms/node/integrations/trpc/

---

**Once you have your DSN, provide it and I'll configure it for production deployment.**
