# CRITICAL: Set Environment Variables in Render

## Problem
The deployment fails because DATABASE_URL and REDIS_URL are not set in Render's environment variables.

## Solution
Add these environment variables to your Render service:

### Go to Render Dashboard
https://dashboard.render.com/web/srv-d73m38lactks738175f0

### Steps:
1. Click on "Environment" in the left sidebar
2. Click "Add Environment Variable"
3. Add each variable below:

### Required Environment Variables:

**DATABASE_URL** (Neon PostgreSQL):
```
postgresql://neondb_owner:npg_TSC9tjz4ZcvE@ep-autumn-heart-a12shr52.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**Note**: Removed `channel_binding=require` parameter as it causes connection timeouts in production.

**REDIS_URL** (Upstash Redis):
```
rediss://default_ro:ggAAAAAAAT43AAIgcDIfeVWpueMS24n0TI8V5hqnc_QhXXccCBrv3KkCucLsvQ@settling-firefly-81463.upstash.io:6379
```

**JWT_SECRET**:
```
supersecret
```

**COOKIE_SECRET**:
```
supersecret
```

**STORE_CORS**:
```
http://localhost:8000,http://localhost:9000,http://localhost:3000,https://docs.medusajs.com,https://q-commerce-backend-0qw1.onrender.com
```

**ADMIN_CORS**:
```
http://localhost:5173,http://localhost:9000,http://localhost:3000,https://docs.medusajs.com,https://q-commerce-backend-0qw1.onrender.com
```

**AUTH_CORS**:
```
http://localhost:5173,http://localhost:9000,http://localhost:8000,http://localhost:3000,https://docs.medusajs.com,https://q-commerce-backend-0qw1.onrender.com
```

**NODE_ENV**:
```
production
```

## After Adding Variables
1. Render will automatically trigger a new deployment
2. The deployment should succeed within 3-5 minutes
3. Your app will be accessible at: https://q-commerce-backend-0qw1.onrender.com

## Verification
After deployment completes, check:
- App should show "✓ DATABASE_URL is configured" in logs
- Migrations should complete successfully
- Server should start on port 10000
- Health check should pass

## Alternative: Use Render CLI (if available)
If you have API access configured, you can run:
```bash
# This would work if Render CLI supported it
render services env-vars set srv-d73m38lactks738175f0 \
  DATABASE_URL="postgresql://..." \
  REDIS_URL="rediss://..."
```

However, the current Render CLI doesn't support this, so use the dashboard method above.
