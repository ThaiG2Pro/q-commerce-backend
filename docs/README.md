# PAYMENT & FULFILLMENT INTEGRATION - README

Tài liệu tổng quan về hệ thống Payment và Fulfillment đã được tích hợp vào Q-Commerce Backend (Medusa v2).

---

## 📋 Tổng Quan

Hệ thống đã được tích hợp **đầy đủ** các providers cần thiết cho một luồng giao dịch hoàn chỉnh từ sản phẩm → thanh toán → giao hàng → nhận hàng thành công.

### ✅ Các Provider Đã Tích Hợp

#### Payment Providers
1. **Stripe** - Payment gateway quốc tế
   - Hỗ trợ thẻ tín dụng/debit
   - Apple Pay, Google Pay
   - Redirect flow với webhook confirmation

2. **COD (Cash on Delivery)** - Thanh toán khi nhận hàng
   - Không cần external gateway
   - Payment capture sau khi giao hàng
   - Internal API management

3. **ZaloPay** - Payment gateway Việt Nam (đã có sẵn)
   - Ví điện tử ZaloPay
   - QR code payment

#### Fulfillment Provider
1. **In-house Fulfillment** - Đội ngũ giao hàng nội bộ
   - Quản lý tracking number
   - Multi-status tracking
   - Estimated delivery date
   - Real-time status updates

---

## 🗂️ Cấu Trúc Project

```
q-commerce/
├── src/
│   ├── modules/
│   │   ├── cod-payment/              # COD Payment Provider
│   │   │   ├── index.ts
│   │   │   └── service.ts
│   │   ├── inhouse-fulfillment/      # In-house Fulfillment Provider
│   │   │   ├── index.ts
│   │   │   └── service.ts
│   │   └── zalo-payment/             # ZaloPay Provider (existing)
│   │
│   ├── workflows/
│   │   ├── payment/
│   │   │   ├── capture-cod-payment.ts
│   │   │   ├── handle-stripe-webhook.ts
│   │   │   └── index.ts
│   │   └── fulfillment/
│   │       ├── update-fulfillment-status.ts
│   │       └── index.ts
│   │
│   └── api/
│       ├── store/
│       │   └── orders/[id]/
│       │       ├── cod-capture/route.ts
│       │       └── fulfillments/route.ts
│       ├── admin/
│       │   └── fulfillments/[id]/status/route.ts
│       └── webhooks/
│           └── stripe/route.ts
│
├── docs/
│   ├── BACKEND_INTEGRATION.md       # Backend developer guide
│   ├── CLIENT_INTEGRATION.md        # Frontend developer guide
│   ├── API_REFERENCE.md             # Complete API documentation
│   └── DEPLOYMENT.md                # Production deployment guide
│
├── medusa-config.ts                 # Updated with new providers
└── .env.example                     # Updated with new env vars
```

---

## 📚 Tài Liệu Hướng Dẫn

### 1. Backend Integration Guide
**File**: `docs/BACKEND_INTEGRATION.md`

Dành cho: Backend developers, DevOps

Nội dung:
- Kiến trúc tổng quan
- Chi tiết từng payment provider
- Chi tiết fulfillment provider
- Workflows implementation
- Database schema
- Security best practices
- Troubleshooting

👉 [Đọc BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)

---

### 2. Client Integration Guide
**File**: `docs/CLIENT_INTEGRATION.md`

Dành cho: Frontend developers

Nội dung:
- Setup Medusa JS SDK
- Complete cart flow
- Payment integration (Stripe/COD/ZaloPay)
- Fulfillment tracking
- React/Next.js examples
- Error handling
- Performance optimization

👉 [Đọc CLIENT_INTEGRATION.md](./CLIENT_INTEGRATION.md)

---

### 3. API Reference
**File**: `docs/API_REFERENCE.md`

Dành cho: Tất cả developers

Nội dung:
- Complete API endpoints documentation
- Request/response examples
- Error codes
- Authentication
- Postman collection

👉 [Đọc API_REFERENCE.md](./API_REFERENCE.md)

---

### 4. Deployment Guide
**File**: `docs/DEPLOYMENT.md`

Dành cho: DevOps, System admins

Nội dung:
- Environment setup
- Database & Redis configuration
- Stripe production setup
- Deploy to Render/Railway
- Security checklist
- Monitoring & logging
- Scaling strategies

👉 [Đọc DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🚀 Quick Start

### Cài Đặt Dependencies

```bash
pnpm install
```

### Cấu Hình Environment Variables

Copy `.env.example` và update:

```bash
cp .env.example .env
```

Required variables:
```bash
DATABASE_URL=postgresql://...
REDIS_URL=rediss://...
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_SECRET=...
COOKIE_SECRET=...
```

### Chạy Development Server

```bash
pnpm dev
```

Backend sẽ chạy tại: `http://localhost:9000`

### Test Stripe Webhooks Locally

```bash
stripe listen --forward-to localhost:9000/webhooks/stripe
```

---

## 🔄 Luồng Giao Dịch Hoàn Chỉnh

### Luồng với Stripe

```
1. Customer: Browse products
2. Customer: Add to cart
3. Customer: Enter shipping info
4. Customer: Select Stripe payment
5. Customer: Complete checkout → Redirect to Stripe
6. Stripe: Customer enters card info
7. Stripe: Webhook → Backend → Update order status
8. Customer: Redirect back → Order confirmed
9. Admin: Create fulfillment
10. Shipper: Update delivery status
11. Customer: Receive order
```

### Luồng với COD

```
1. Customer: Browse products
2. Customer: Add to cart
3. Customer: Enter shipping info
4. Customer: Select COD payment
5. Customer: Complete checkout → Order created
6. Admin: Create fulfillment
7. Shipper: Deliver to customer
8. Customer: Pay cash
9. Shipper: Confirm received cash
10. Admin: Capture COD payment
11. Order complete
```

---

## 📡 API Endpoints Summary

### Store APIs (Customer Facing)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/store/orders/:id/cod-capture` | Capture COD payment |
| GET | `/store/orders/:id/fulfillments` | Track delivery status |

### Admin APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/fulfillments/:id/status` | Update fulfillment status |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/stripe` | Stripe webhook events |

### Standard Medusa APIs

Tất cả standard Medusa v2 store APIs vẫn hoạt động bình thường:
- Products: `/store/products`
- Cart: `/store/carts`
- Orders: `/store/orders`
- etc.

---

## 🧪 Testing

### Test Stripe Payment

1. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

2. Test webhook:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

### Test COD Payment

```bash
# 1. Create order with COD
curl -X POST http://localhost:9000/store/carts/{cart_id}/complete

# 2. Capture payment
curl -X POST http://localhost:9000/store/orders/{order_id}/cod-capture \
  -H "Content-Type: application/json" \
  -d '{"payment_id": "pay_xxx"}'
```

### Test Fulfillment Tracking

```bash
# 1. Update status
curl -X POST http://localhost:9000/admin/fulfillments/{ful_id}/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "order_xxx", "status": "shipped"}'

# 2. Check tracking
curl http://localhost:9000/store/orders/{order_id}/fulfillments
```

---

## 🔐 Security

### Environment Variables

**Quan trọng**: Không commit file `.env` vào Git!

```bash
# .gitignore
.env
.env.local
.env.production
```

### Stripe Webhook Verification

Webhook signature được verify tự động trong workflow. Không cần thêm code.

### CORS Configuration

Update CORS trong `.env` với domains của bạn:

```bash
STORE_CORS=https://your-storefront.com
ADMIN_CORS=https://admin.your-domain.com
```

---

## 📊 Database

Medusa tự động quản lý database schema. Chạy migrations:

```bash
npx medusa migrations run
```

Custom data được lưu trong JSON fields:
- Payment session data
- Fulfillment data
- Tracking information

---

## 🎯 Fulfillment Statuses

| Status | Description |
|--------|-------------|
| `pending` | Đang chờ xử lý |
| `processing` | Đang chuẩn bị hàng |
| `shipped` | Đã giao cho shipper |
| `out_for_delivery` | Đang trên đường giao |
| `delivered` | Đã giao thành công |
| `failed` | Giao thất bại |
| `canceled` | Đã hủy |

---

## 🛠️ Development Workflow

### 1. Thêm Feature Mới

```bash
# 1. Create branch
git checkout -b feature/new-payment-provider

# 2. Implement provider
# Create src/modules/new-provider/

# 3. Update medusa-config.ts

# 4. Test locally

# 5. Create PR
```

### 2. Debug Issues

```bash
# View logs
docker-compose logs -f medusa

# Check database
psql $DATABASE_URL

# Test Redis
redis-cli -u $REDIS_URL
```

---

## 📦 Dependencies

### Required Packages

```json
{
  "@medusajs/medusa": "2.13.5",
  "@medusajs/medusa-payment-stripe": "latest",
  "axios": "^1.14.0",
  "crypto-js": "^4.2.0"
}
```

### External Services

- PostgreSQL 13+
- Redis 6+
- Node.js 20+

---

## 🚨 Troubleshooting

### Issue: Stripe webhook not receiving events

**Solution**:
1. Check webhook URL is publicly accessible
2. Verify `STRIPE_WEBHOOK_SECRET` is correct
3. Use Stripe CLI for local testing
4. Check Stripe Dashboard → Events

### Issue: COD payment capture fails

**Solution**:
1. Verify order exists and not canceled
2. Check payment is not already captured
3. Ensure payment provider is "cod"

### Issue: Fulfillment status not updating

**Solution**:
1. Verify `order_id` is provided
2. Check status is valid
3. Review workflow logs

---

## 📞 Support

### Documentation

- Backend: `docs/BACKEND_INTEGRATION.md`
- Frontend: `docs/CLIENT_INTEGRATION.md`
- APIs: `docs/API_REFERENCE.md`
- Deployment: `docs/DEPLOYMENT.md`

### External Resources

- **Medusa Docs**: https://docs.medusajs.com
- **Stripe Docs**: https://stripe.com/docs
- **Medusa Discord**: https://discord.gg/medusajs

### Contact

- **GitHub Issues**: [Create Issue](https://github.com/...)
- **Email**: tech@company.com
- **Slack**: #tech-support

---

## 📝 Changelog

### Version 1.0.0 (2024-01-15)

**Added**:
- ✅ Stripe payment provider integration
- ✅ COD payment provider
- ✅ In-house fulfillment provider
- ✅ Payment workflows
- ✅ Fulfillment workflows
- ✅ Store APIs for COD capture and fulfillment tracking
- ✅ Admin APIs for fulfillment management
- ✅ Stripe webhook handler
- ✅ Complete documentation suite

**Configuration**:
- Updated `medusa-config.ts` with new providers
- Added environment variables for Stripe and fulfillment
- CORS configuration

---

## 🎓 Learning Resources

### For Backend Developers

1. Read `BACKEND_INTEGRATION.md` thoroughly
2. Understand Medusa provider patterns
3. Study workflow implementations
4. Review API route structures

### For Frontend Developers

1. Start with `CLIENT_INTEGRATION.md`
2. Install Medusa JS SDK
3. Follow cart → checkout flow examples
4. Test with different payment methods
5. Implement fulfillment tracking UI

### For DevOps

1. Review `DEPLOYMENT.md`
2. Setup staging environment first
3. Test complete flow before production
4. Configure monitoring and logging
5. Setup backup procedures

---

## ✨ Next Steps

### Recommended Improvements

1. **Email Notifications**
   - Order confirmation
   - Shipping updates
   - Delivery confirmation

2. **SMS Notifications**
   - OTP for COD orders
   - Delivery status updates

3. **Admin Dashboard Enhancements**
   - Fulfillment management UI
   - Payment tracking dashboard
   - Analytics and reports

4. **Mobile App Integration**
   - Shipper mobile app
   - Real-time GPS tracking
   - Photo proof of delivery

---

## 🙏 Credits

Built with:
- **Medusa v2** - Modern commerce infrastructure
- **Stripe** - Payment processing
- **PostgreSQL** - Database
- **Redis** - Caching and workflow engine

---

## 📄 License

MIT License - See LICENSE file for details

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
**Maintained by**: Q-Commerce Team
