# DEPLOYMENT GUIDE

Hướng dẫn deploy Q-Commerce Backend lên production.

---

## Pre-requisites

### 1. Chuẩn Bị Môi Trường

**Required Services**:
- PostgreSQL database (recommended: Neon, Supabase, Railway)
- Redis server (recommended: Redis Cloud, Upstash)
- Node.js 20+ hosting (recommended: Render, Railway, Vercel)

**Payment Provider Accounts**:
- Stripe account (production mode)
- ZaloPay merchant account (nếu sử dụng)

**Domain & SSL**:
- Domain name cho backend API
- SSL certificate (tự động với Render/Vercel)

---

## Step 1: Database Setup

### Option A: Neon (Recommended)

1. Tạo account tại https://neon.tech
2. Create new project
3. Copy connection string:
   ```
   postgresql://[user]:[password]@[host]/[database]?sslmode=require
   ```

### Option B: Supabase

1. Tạo project tại https://supabase.com
2. Settings → Database → Connection string → URI
3. Copy connection string

### Option C: Railway

1. Create PostgreSQL service
2. Copy DATABASE_URL from Variables tab

**Test Connection**:
```bash
psql "postgresql://user:password@host/database?sslmode=require"
```

---

## Step 2: Redis Setup

### Option A: Redis Cloud (Recommended)

1. Tạo account tại https://redis.com
2. Create free database
3. Copy connection string:
   ```
   rediss://default:[password]@[host]:6379
   ```

### Option B: Upstash

1. Create database tại https://upstash.com
2. Copy REDIS_URL

**Test Connection**:
```bash
redis-cli -u "rediss://default:password@host:6379"
```

---

## Step 3: Environment Variables

Tạo file `.env` trong production với các variables sau:

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
REDIS_URL=rediss://default:[password]@[host]:6379

# Security (PHẢI thay đổi!)
JWT_SECRET=[random-string-32-chars]
COOKIE_SECRET=[random-string-32-chars]

# CORS - Add your frontend domains
STORE_CORS=https://your-storefront.com,https://www.your-storefront.com
ADMIN_CORS=https://admin.your-domain.com
AUTH_CORS=https://your-storefront.com,https://admin.your-domain.com

# Payment Providers
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Fulfillment
WAREHOUSE_ADDRESS=Your warehouse address
WAREHOUSE_PHONE=+84xxxxxxxxx
WAREHOUSE_EMAIL=warehouse@company.com
```

### Optional Variables

```bash
# ZaloPay (nếu dùng production)
ZALOPAY_APP_ID=your_app_id
ZALOPAY_KEY1=your_key1
ZALOPAY_KEY2=your_key2
ZALOPAY_IS_SANDBOX=false

# Node Environment
NODE_ENV=production
```

### Generate Secure Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate COOKIE_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 4: Stripe Setup

### 1. Switch to Production Mode

1. Login to Stripe Dashboard
2. Toggle "Test mode" → OFF
3. Complete account verification

### 2. Get API Keys

1. Developers → API keys
2. Copy "Secret key" (starts with `sk_live_...`)
3. Set to `STRIPE_API_KEY` in env

### 3. Setup Webhook

1. Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://your-domain.com/webhooks/stripe`
3. Select events to listen:
   - `payment_intent.succeeded`
   - `payment_intent.failed`
   - `checkout.session.completed`
   - `checkout.session.expired`
4. Copy "Signing secret" (starts with `whsec_...`)
5. Set to `STRIPE_WEBHOOK_SECRET` in env

### 4. Enable Payment Methods

1. Settings → Payment methods
2. Enable: Cards, Wallets (Apple Pay, Google Pay)
3. Configure currency: VND

---

## Step 5: Deploy to Render (Recommended)

### 5.1 Create Render Account

1. Sign up tại https://render.com
2. Connect GitHub repository

### 5.2 Create Web Service

1. Dashboard → New → Web Service
2. Connect repository: `your-username/q-commerce`
3. Settings:
   - **Name**: `q-commerce-backend`
   - **Region**: Singapore (gần VN nhất)
   - **Branch**: `main`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Plan**: Starter ($7/month) hoặc Free

### 5.3 Add Environment Variables

1. Trong Render dashboard → Environment
2. Add tất cả variables từ Step 3
3. Click "Save Changes"

### 5.4 Deploy

1. Click "Manual Deploy" → "Deploy latest commit"
2. Wait for build to complete (~5-10 minutes)
3. Service sẽ chạy tại: `https://q-commerce-backend.onrender.com`

### 5.5 Run Migrations

Sau khi deploy thành công:

1. Shell tab → Open shell
2. Run:
   ```bash
   npx medusa migrations run
   ```

---

## Step 6: Alternative Deployment Options

### Option B: Railway

1. Create account tại https://railway.app
2. New Project → Deploy from GitHub
3. Add environment variables
4. Railway tự động detect Dockerfile và deploy

### Option C: Vercel (Serverless)

**Lưu ý**: Medusa v2 không chạy tốt trên serverless. Không khuyến nghị.

---

## Step 7: Post-Deployment Setup

### 7.1 Create Admin User

SSH vào server hoặc dùng Render Shell:

```bash
npx medusa user -e admin@company.com -p secure_password
```

### 7.2 Seed Initial Data (Optional)

```bash
npx medusa exec ./src/scripts/seed.ts
```

### 7.3 Test APIs

```bash
# Health check
curl https://your-domain.com/health

# List products
curl https://your-domain.com/store/products
```

### 7.4 Update Stripe Webhook

1. Stripe Dashboard → Webhooks
2. Update endpoint URL với domain mới
3. Test webhook:
   ```bash
   stripe trigger payment_intent.succeeded \
     --api-key sk_test_...
   ```

---

## Step 8: Frontend Configuration

Update frontend environment variables:

```bash
# .env.local trong Next.js storefront
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://your-domain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Step 9: Monitoring & Logging

### Setup Monitoring

**Render Built-in**:
- Metrics tab: CPU, Memory, Response time
- Logs tab: Real-time logs

**External Monitoring (Optional)**:
- Sentry: Error tracking
- LogDNA/Datadog: Advanced logging
- Uptime Robot: Uptime monitoring

### Key Metrics to Monitor

1. **Response Time**: Average < 500ms
2. **Error Rate**: < 1%
3. **CPU Usage**: < 70%
4. **Memory Usage**: < 80%
5. **Database Connections**: Monitor pool usage

### Log Analysis

```bash
# View recent logs in Render
# Logs tab → Filter by level

# Search for errors
grep "ERROR" logs.txt

# Monitor payment events
grep "payment" logs.txt
```

---

## Step 10: Backup Strategy

### Database Backups

**Neon**:
- Automatic daily backups
- Point-in-time recovery
- Download backup: Dashboard → Backups

**Manual Backup**:
```bash
pg_dump "postgresql://user:pass@host/db" > backup.sql
```

### Redis Backups

Redis data is ephemeral - store critical data in PostgreSQL.

---

## Step 11: Security Checklist

- [ ] Change default JWT_SECRET and COOKIE_SECRET
- [ ] Enable HTTPS (SSL certificate)
- [ ] Configure CORS properly (không dùng `*`)
- [ ] Use environment variables (không hardcode secrets)
- [ ] Enable Stripe webhook signature verification
- [ ] Setup rate limiting (optional)
- [ ] Enable database SSL mode
- [ ] Regular security updates (`pnpm update`)

---

## Step 12: Performance Optimization

### Database Optimization

```sql
-- Create indexes for frequently queried fields
CREATE INDEX idx_order_customer ON order (customer_id);
CREATE INDEX idx_payment_order ON payment (order_id);
CREATE INDEX idx_fulfillment_order ON fulfillment (order_id);
```

### Redis Configuration

```bash
# In production, configure Redis eviction policy
maxmemory-policy allkeys-lru
```

### CDN for Static Assets

Upload static files (images, etc.) to CDN:
- Cloudinary
- AWS S3 + CloudFront
- Vercel Blob Storage

---

## Troubleshooting

### Issue: Database connection timeout

**Solution**:
```typescript
// medusa-config.ts
databaseDriverOptions: {
  pool: {
    min: 0,
    max: 7,
    acquireTimeoutMillis: 300000,
    createTimeoutMillis: 300000,
    idleTimeoutMillis: 30000,
  },
}
```

### Issue: Redis connection fails

**Solution**:
- Check REDIS_URL format includes `rediss://` (with SSL)
- Verify Redis server allows connections from Render IPs
- Check Redis Cloud security settings

### Issue: Stripe webhooks not working

**Solution**:
- Verify webhook URL is publicly accessible (not localhost)
- Check STRIPE_WEBHOOK_SECRET is correct
- Test with Stripe CLI: `stripe listen --forward-to`
- Check Stripe Dashboard → Events for delivery status

### Issue: CORS errors from frontend

**Solution**:
```bash
# Add frontend domain to STORE_CORS
STORE_CORS=https://storefront.com,https://www.storefront.com
```

---

## Rollback Procedure

Nếu deployment có vấn đề:

### Render

1. Dashboard → Events
2. Find previous successful deployment
3. Click "Rollback"

### Manual Rollback

```bash
git revert <commit-hash>
git push origin main
```

---

## Scaling

### Vertical Scaling (Increase resources)

Render: Upgrade plan (Starter → Standard → Pro)

### Horizontal Scaling (Multiple instances)

1. Enable autoscaling in Render
2. Configure load balancer
3. Use Redis for session storage (already configured)

### Database Scaling

- Neon: Automatic connection pooling
- Add read replicas for heavy read workloads

---

## Maintenance

### Regular Tasks

**Weekly**:
- Review error logs
- Check performance metrics
- Monitor database size

**Monthly**:
- Update dependencies: `pnpm update`
- Review and optimize slow queries
- Clean up old logs

**Quarterly**:
- Security audit
- Load testing
- Disaster recovery drill

---

## Cost Estimation

### Minimum Setup (Small Business)

- **Render Starter**: $7/month
- **Neon Free**: $0 (up to 500MB)
- **Redis Cloud Free**: $0 (30MB)
- **Stripe**: 2.9% + $0.30 per transaction
- **Domain**: $10-15/year

**Total**: ~$100-150/year + transaction fees

### Production Setup (Growing Business)

- **Render Standard**: $25/month
- **Neon Pro**: $19/month
- **Redis Cloud Standard**: $5/month
- **Monitoring (Sentry)**: $26/month

**Total**: ~$900/year + transaction fees

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **Medusa Docs**: https://docs.medusajs.com
- **Stripe Docs**: https://stripe.com/docs

**Need Help?**
- GitHub Issues: [repository-url]
- Email: tech@company.com
- Community: Medusa Discord
