# QUICK START GUIDE

Hướng dẫn nhanh để bắt đầu sử dụng hệ thống Payment & Fulfillment Integration.

---

## ⚡ 5 Phút Để Chạy

### 1. Clone & Install

```bash
cd /home/thai/my-project/q-commerce
pnpm install
```

### 2. Configure Environment

Đảm bảo file `.env` có các biến sau:

```bash
# Database & Redis (đã có sẵn)
DATABASE_URL=postgresql://...
REDIS_URL=rediss://...

# Security (đã có sẵn)
JWT_SECRET=...
COOKIE_SECRET=...

# CORS (đã có sẵn)
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:5173

# Payment (ZaloPay đã có, COD không cần config)
ZALOPAY_APP_ID=2553
ZALOPAY_KEY1=...
ZALOPAY_KEY2=...
ZALOPAY_IS_SANDBOX=true

# Fulfillment (optional - có defaults)
WAREHOUSE_ADDRESS=123 Main Street, HCM City
WAREHOUSE_PHONE=+84123456789
WAREHOUSE_EMAIL=warehouse@company.com
```

### 3. Start Server

```bash
pnpm dev
```

Server chạy tại: **http://localhost:9000**

---

## 📦 Những Gì Đã Có Sẵn

### ✅ Payment Providers

1. **COD (Cash on Delivery)** - Sẵn sàng sử dụng
   - Không cần cấu hình
   - Thanh toán khi nhận hàng
   - API: `POST /store/orders/:id/cod-capture`

2. **ZaloPay** - Sẵn sàng sử dụng (sandbox)
   - Đã cấu hình với credentials test
   - Redirect flow

3. **Stripe** - Sẵn sàng code, cần configure
   - Code đã sẵn sàng
   - Cần thêm: `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`
   - Hiện tại: commented out trong config

### ✅ Fulfillment Provider

**In-house Fulfillment** - Sẵn sàng sử dụng
- Tracking numbers tự động
- 7 trạng thái tracking
- API: `POST /admin/fulfillments/:id/status`
- API: `GET /store/orders/:id/fulfillments`

---

## 🧪 Test Nhanh

### Test 1: Check Server

```bash
curl http://localhost:9000/health
# Response: {"status":"ok"}
```

### Test 2: List Products

```bash
curl http://localhost:9000/store/products
# Response: {"products":[...]}
```

### Test 3: Create Cart

```bash
curl -X POST http://localhost:9000/store/carts \
  -H "Content-Type: application/json" \
  -d '{"region_id":"reg_01..."}'
```

---

## 🎯 Use Cases

### Use Case 1: COD Order (Đơn giản nhất)

**Flow**:
```
1. Customer tạo cart → add items
2. Customer chọn COD → complete checkout
3. Order created (payment: authorized)
4. Admin creates fulfillment
5. Shipper delivers
6. Shipper nhận tiền → gọi capture API
7. Order complete
```

**APIs cần dùng**:
- Standard Medusa cart APIs
- `POST /store/orders/:id/cod-capture` (sau khi giao hàng)
- `GET /store/orders/:id/fulfillments` (tracking)

### Use Case 2: ZaloPay Order

**Flow**:
```
1. Customer tạo cart → add items
2. Customer chọn ZaloPay → complete checkout
3. Redirect to ZaloPay
4. Customer thanh toán
5. Webhook updates order
6. Order confirmed
7. Fulfillment process
```

**APIs cần dùng**:
- Standard Medusa cart APIs
- `GET /store/orders/:id/fulfillments` (tracking)

### Use Case 3: Stripe Order (cần setup)

**Tương tự ZaloPay nhưng cần**:
1. Tạo Stripe account
2. Get API keys
3. Setup webhook
4. Uncomment Stripe trong medusa-config.ts
5. Restart server

---

## 📱 Client Integration

### Minimal Example (React)

```tsx
import { useEffect, useState } from "react"

function OrderTracker({ orderId }) {
  const [fulfillments, setFulfillments] = useState([])
  
  useEffect(() => {
    fetch(`http://localhost:9000/store/orders/${orderId}/fulfillments`)
      .then(res => res.json())
      .then(data => setFulfillments(data.fulfillments))
  }, [orderId])
  
  return (
    <div>
      {fulfillments.map(f => (
        <div key={f.id}>
          <p>Tracking: {f.tracking_number}</p>
          <p>Status: {f.status}</p>
          <p>Location: {f.location}</p>
        </div>
      ))}
    </div>
  )
}
```

### COD Capture Example (Admin)

```typescript
async function captureCODPayment(orderId: string, paymentId: string) {
  const response = await fetch(
    `http://localhost:9000/store/orders/${orderId}/cod-capture`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_id: paymentId }),
    }
  )
  
  return response.json()
}
```

---

## 🔧 Common Tasks

### Task 1: Update Fulfillment Status

```bash
curl -X POST http://localhost:9000/admin/fulfillments/ful_xxx/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_xxx",
    "status": "shipped",
    "location": "HCM City Hub",
    "notes": "Package picked up"
  }'
```

### Task 2: Track Order

```bash
curl http://localhost:9000/store/orders/order_xxx/fulfillments
```

### Task 3: Capture COD Payment

```bash
curl -X POST http://localhost:9000/store/orders/order_xxx/cod-capture \
  -H "Content-Type: application/json" \
  -d '{
    "payment_id": "pay_xxx",
    "amount": 150000
  }'
```

---

## 🎨 Admin UI Tasks

### Create Fulfillment

1. Login to admin: `http://localhost:9000/app`
2. Go to Orders
3. Select order
4. Click "Create Fulfillment"
5. Select items
6. Confirm

### Update Fulfillment Status

Hiện tại cần gọi API (UI chưa có). Hoặc có thể tạo custom admin widget.

---

## 📚 Tài Liệu Chi Tiết

Để hiểu sâu hơn, đọc:

| Tài liệu | Mục đích | Đối tượng |
|----------|----------|-----------|
| [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md) | Architecture, providers, workflows | Backend devs |
| [CLIENT_INTEGRATION.md](./CLIENT_INTEGRATION.md) | Frontend integration | Frontend devs |
| [API_REFERENCE.md](./API_REFERENCE.md) | Complete API docs | All devs |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment | DevOps |

---

## 🐛 Troubleshooting

### Server won't start

**Check**:
```bash
# 1. Database connection
psql $DATABASE_URL

# 2. Redis connection
redis-cli -u $REDIS_URL

# 3. Port 9000 not in use
lsof -i :9000
```

### COD capture fails

**Common reasons**:
- Order is canceled
- Payment already captured
- Payment provider is not "cod"

**Check**:
```bash
curl http://localhost:9000/store/orders/order_xxx
# Look at payment_status
```

### Fulfillment not found

**Ensure**:
- Fulfillment has been created for the order
- Using correct fulfillment_id

---

## ⚙️ Enable Stripe (Optional)

Nếu muốn test Stripe:

### 1. Get Stripe Test Keys

1. Sign up: https://dashboard.stripe.com/register
2. Dashboard → Developers → API keys
3. Copy:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...`

### 2. Setup Webhook

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:9000/webhooks/stripe

# Copy webhook secret (whsec_...)
```

### 3. Add to .env

```bash
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Enable in Config

Edit `medusa-config.ts`:

```typescript
// Uncomment Stripe provider
{
  resolve: "@medusajs/medusa-payment-stripe",
  id: "stripe",
  options: {
    apiKey: process.env.STRIPE_API_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
},
```

### 5. Restart

```bash
pnpm dev
```

---

## 🚀 Next Steps

1. **Đọc tài liệu chi tiết** phù hợp với role của bạn
2. **Test các flows** với COD và ZaloPay
3. **Build frontend** integration
4. **Setup Stripe** nếu cần
5. **Deploy to staging** và test
6. **Deploy to production**

---

## 💡 Pro Tips

### Development

- Use `pnpm dev` for hot reload
- Check logs trong terminal
- Use Postman collection (trong API_REFERENCE.md)

### Testing

- Use Stripe test cards (trong CLIENT_INTEGRATION.md)
- Test COD flow đầu tiên (đơn giản nhất)
- Always test fulfillment tracking

### Production

- Change JWT_SECRET and COOKIE_SECRET
- Use production Stripe keys
- Setup proper monitoring
- Enable HTTPS

---

## 📞 Need Help?

1. **Documentation**: Check `docs/` folder
2. **Issues**: Create GitHub issue
3. **Contact**: tech@company.com

---

**Happy Coding! 🎉**
