# STRIPE SETUP GUIDE

Hướng dẫn chi tiết enable Stripe payment provider.

---

## 🎯 Tại Sao Cần Stripe?

Stripe cho phép:
- Nhận thanh toán thẻ tín dụng/debit quốc tế
- Apple Pay, Google Pay
- 3D Secure authentication
- Automatic fraud detection
- Dashboard quản lý payments

**Lưu ý**: COD và ZaloPay đã hoạt động, Stripe là optional.

---

## 📋 Prerequisites

- [ ] Stripe account (free signup)
- [ ] Verified business info (cho production)
- [ ] Domain name (cho webhook)

---

## 🚀 Setup Steps

### Step 1: Create Stripe Account

1. Truy cập: https://dashboard.stripe.com/register
2. Điền thông tin:
   - Email
   - Password
   - Business name
3. Verify email
4. Complete onboarding

**Test Mode**: Mặc định là test mode, không cần verify ngay.

---

### Step 2: Get API Keys

#### For Development (Test Mode)

1. Dashboard → **Developers** → **API keys**
2. Tìm 2 keys:
   - **Publishable key**: `pk_test_...` (cho frontend)
   - **Secret key**: `sk_test_...` (cho backend)
3. Click "Reveal test key" để xem secret key

#### For Production (Live Mode)

1. Toggle **"Test mode"** → OFF
2. Complete account verification:
   - Business details
   - Bank account
   - Tax information
3. Get production keys:
   - **Publishable key**: `pk_live_...`
   - **Secret key**: `sk_live_...`

---

### Step 3: Setup Webhook

#### Local Development (Using Stripe CLI)

**Install Stripe CLI**:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

**Login**:
```bash
stripe login
```

**Forward Webhooks**:
```bash
stripe listen --forward-to localhost:9000/webhooks/stripe
```

Output:
```
> Ready! You are using Stripe API Version [2024-01-15]
> Your webhook signing secret is whsec_... (^C to quit)
```

**Copy webhook secret** (starts with `whsec_...`)

#### Production (Stripe Dashboard)

1. Dashboard → **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Endpoint URL: `https://your-domain.com/webhooks/stripe`
4. **Select events**:
   - `payment_intent.succeeded`
   - `payment_intent.failed`
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Click **"Add endpoint"**
6. Copy **Signing secret** (starts with `whsec_...`)

---

### Step 4: Configure Environment

Add to `.env`:

```bash
# Stripe API Keys
STRIPE_API_KEY=sk_test_...                    # Secret key from Step 2
STRIPE_WEBHOOK_SECRET=whsec_...               # Signing secret from Step 3

# For frontend
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Publishable key
```

**Security**: NEVER commit `.env` to git!

---

### Step 5: Enable in medusa-config.ts

Edit `medusa-config.ts`:

```typescript
// Payment Module
{
  resolve: "@medusajs/medusa/payment",
  options: {
    providers: [
      // ... existing providers (zalopay, cod)
      
      // Uncomment Stripe:
      {
        resolve: "@medusajs/medusa-payment-stripe",
        id: "stripe",
        options: {
          apiKey: process.env.STRIPE_API_KEY,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        },
      },
    ],
  },
},
```

---

### Step 6: Restart Server

```bash
pnpm dev
```

Check logs:
```
✔ Server is ready on port: 9000
```

---

### Step 7: Test Integration

#### Test 1: Check Provider Available

```bash
curl http://localhost:9000/store/payment-providers | jq
```

Should see:
```json
{
  "payment_providers": [
    { "id": "zalopay", ... },
    { "id": "cod", ... },
    { "id": "stripe", ... }  // ✅ Stripe available
  ]
}
```

#### Test 2: Create Payment Session

```bash
# 1. Create cart
curl -X POST http://localhost:9000/store/carts \
  -H "Content-Type: application/json" \
  -d '{"region_id":"reg_01..."}'

# 2. Add items...
# 3. Set shipping...

# 4. Initialize payment sessions
curl -X POST http://localhost:9000/store/carts/cart_xxx/payment-sessions

# 5. Select Stripe
curl -X POST http://localhost:9000/store/carts/cart_xxx/payment-session \
  -H "Content-Type: application/json" \
  -d '{"provider_id":"stripe"}'
```

#### Test 3: Test Cards

Stripe provides test cards:

| Card Number | Description |
|-------------|-------------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline |
| 4000 0027 6000 3184 | Requires 3D Secure |

**Any future date for expiry**, **any 3 digits for CVC**

---

## 🎨 Frontend Integration

### With Next.js

```tsx
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
)

function CheckoutButton({ cartId }) {
  const handleCheckout = async () => {
    // 1. Complete cart
    const response = await fetch(
      `http://localhost:9000/store/carts/${cartId}/complete`,
      { method: "POST" }
    )
    const { data } = await response.json()
    
    // 2. Redirect to Stripe
    const stripe = await stripePromise
    await stripe.redirectToCheckout({
      sessionId: data.stripe_session_id,
    })
  }
  
  return <button onClick={handleCheckout}>Pay with Stripe</button>
}
```

### Handle Return

```tsx
// pages/checkout/success.tsx
import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function CheckoutSuccess() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get("order_id")
  
  useEffect(() => {
    // Poll order status
    const checkStatus = async () => {
      const res = await fetch(
        `http://localhost:9000/store/orders/${orderId}`
      )
      const { order } = await res.json()
      
      if (order.payment_status === "captured") {
        // Payment successful!
        alert("Payment successful!")
      } else {
        // Still processing
        setTimeout(checkStatus, 2000)
      }
    }
    
    if (orderId) checkStatus()
  }, [orderId])
  
  return <div>Processing payment...</div>
}
```

---

## 🔐 Security Best Practices

### Environment Variables

```bash
# ✅ Good
STRIPE_API_KEY=sk_test_...

# ❌ Bad - Never hardcode
apiKey: "sk_test_..."
```

### Webhook Verification

**Already handled** by workflow! Signature verification is automatic.

### PCI Compliance

- ✅ Use Stripe hosted checkout (no card data on your server)
- ✅ Or use Stripe Elements (card input handled by Stripe)
- ❌ Never store card numbers

---

## 🧪 Testing Scenarios

### Test Successful Payment

1. Create cart with items
2. Select Stripe payment
3. Complete checkout → Redirect to Stripe
4. Use test card: `4242 4242 4242 4242`
5. Complete payment
6. Verify order status: `captured`

### Test Declined Payment

1. Same flow
2. Use test card: `4000 0000 0000 0002`
3. Payment declined
4. Verify order status: `awaiting`

### Test 3D Secure

1. Same flow
2. Use test card: `4000 0027 6000 3184`
3. Complete 3DS challenge
4. Payment succeeded

### Test Webhook

```bash
# Terminal 1: Start server
pnpm dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:9000/webhooks/stripe

# Terminal 3: Trigger test event
stripe trigger payment_intent.succeeded
```

Check server logs for webhook processing.

---

## 🚨 Troubleshooting

### Issue 1: Webhook not receiving events

**Symptoms**: Payment succeeds but order not updated

**Solutions**:
1. Check webhook endpoint is publicly accessible
2. Verify `STRIPE_WEBHOOK_SECRET` is correct
3. Check Stripe Dashboard → Events for delivery status
4. For local: Use Stripe CLI to forward

**Verify**:
```bash
stripe listen --forward-to localhost:9000/webhooks/stripe
# Should show: Ready! Connected to Stripe
```

### Issue 2: Invalid API key

**Symptoms**: `Authentication error: Invalid API Key`

**Solutions**:
1. Check `.env` has correct `STRIPE_API_KEY`
2. Ensure no spaces in the key
3. Restart server after adding env var

### Issue 3: Checkout redirect fails

**Symptoms**: Error on `redirectToCheckout`

**Solutions**:
1. Verify frontend has correct publishable key
2. Check `stripe_session_id` exists in response
3. Ensure cart is complete with all required fields

---

## 📊 Stripe Dashboard

### Monitor Payments

Dashboard → **Payments**
- View all transactions
- Filter by status
- Export to CSV

### Test Webhooks

Dashboard → **Developers** → **Webhooks** → Your endpoint
- View delivery attempts
- Resend failed webhooks
- Check response codes

### Reports

Dashboard → **Reports**
- Transaction history
- Refunds
- Disputes

---

## 💰 Pricing

### Stripe Fees

- **Domestic cards**: 2.9% + $0.30 per transaction
- **International cards**: 3.9% + $0.30 per transaction
- **No monthly fees**

### Vietnam Specific

Stripe supports VND currency!

Minimum charge: 10,000 VND

---

## 🌏 Production Checklist

- [ ] Switch to live mode API keys
- [ ] Update webhook URL to production domain
- [ ] Enable required payment methods in dashboard
- [ ] Complete business verification
- [ ] Add bank account for payouts
- [ ] Setup tax settings
- [ ] Configure email receipts
- [ ] Enable fraud protection
- [ ] Test with real transactions (small amounts)

---

## 📚 Resources

- **Stripe Docs**: https://stripe.com/docs
- **Test Cards**: https://stripe.com/docs/testing
- **Webhook Events**: https://stripe.com/docs/webhooks
- **API Reference**: https://stripe.com/docs/api

---

## 🆘 Support

### Stripe Support
- Dashboard → Help
- Email: support@stripe.com
- Community: https://stripe.com/community

### Q-Commerce Support
- Docs: See `docs/BACKEND_INTEGRATION.md`
- Email: tech@company.com

---

**Ready to accept payments! 💳**
