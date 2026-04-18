# BACKEND INTEGRATION GUIDE

## Tổng Quan Kiến Trúc

Hệ thống Q-Commerce được xây dựng trên Medusa v2, tích hợp đầy đủ luồng thanh toán và giao hàng từ sản phẩm đến khách hàng nhận hàng.

### Providers Đã Tích Hợp

#### 1. Payment Providers
- **Stripe**: Payment gateway quốc tế, sử dụng redirect flow
- **COD (Cash on Delivery)**: Thanh toán khi nhận hàng
- **ZaloPay**: Payment gateway Việt Nam (đã có sẵn)

#### 2. Fulfillment Providers
- **In-house Fulfillment**: Đội ngũ giao hàng nội bộ

#### 3. Auth Providers
- **Email/Password**: Đăng nhập chuẩn Medusa
- **Zalo**: Đăng nhập bằng `access_token` từ Zalo Mini App

---

## Zalo Authentication Flow (DEPRECATED)

This project has removed active support for the Zalo Mini App authentication flow. The content below is preserved for historical context only — the current authentication provider is Email/Password (`emailpass`).

- Endpoint (removed): `POST /auth/customer/zalo` (alias `POST /auth/zalo`)
- Environment variables `ZALO_APP_SECRET` and any `ZALOPAY_*` keys are deprecated and should be removed from production `.env` files.

If Zalo integration is required again in the future, restore the provider entry in `medusa-config.ts` and the route under `src/api/auth/zalo`.

### Validation Checklist (Zalo customer + cart diagnostics)

> Mục tiêu: xác nhận các fix backend mới cho `/store/customers`, `/store/carts`, `/store/carts/:id` hoạt động end-to-end và dữ liệu được persist đúng.

#### Chuẩn bị
- [ ] Có `access_token` Zalo hợp lệ cho user test mới.
- [ ] Backend chạy local/prod và có quyền đọc DB + logs.
- [ ] Set biến shell:
  ```bash
  BASE_URL=http://localhost:9000
  ```

#### 1) First login Zalo → tạo customer + persist profile chuẩn hóa
- [ ] Đăng nhập:
  ```bash
  curl -s -X POST "$BASE_URL/auth/customer/zalo" \
    -H "Content-Type: application/json" \
    -d '{"access_token":"<zalo_access_token>"}'
  ```
  Kỳ vọng: trả `token`.
  - Nếu client đang dùng path ngắn, `POST /auth/zalo` cũng trả cùng kết quả.
- [ ] Gọi tạo customer (trường hợp token chưa có `actor_id`):
  ```bash
  curl -s -X POST "$BASE_URL/store/customers" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <customer_jwt>" \
    -d '{"email":"guest@example.com","first_name":"","last_name":""}'
  ```
  Kỳ vọng API:
  - `customer.email` được chuẩn hóa thành dạng `zalo_<zalo_id>@miniapp.local` (không giữ `guest@example.com`).
  - `customer.first_name/last_name` được fill từ `user_metadata.name` nếu thiếu.
- [ ] Refresh token:
  ```bash
  curl -s -X POST "$BASE_URL/auth/token/refresh" \
    -H "Authorization: Bearer <customer_jwt>"
  ```
  Kỳ vọng: token mới có `actor_id/customer_id`.
- [ ] Kiểm tra DB:
  ```sql
  SELECT id, email, first_name, last_name FROM customer WHERE id = '<customer_id>';
  ```
  Kỳ vọng: email đã normalize, tên đã persist đúng trên entity `customer`.

#### 2) Customer profile update + address update persistence
- [ ] Update profile:
  ```bash
  curl -s -X POST "$BASE_URL/store/customers/me" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <customer_jwt>" \
    -d '{"first_name":"Anh","last_name":"Nguyen","phone":"+84901234567"}'
  ```
  Kỳ vọng: response `customer` phản ánh giá trị mới.
- [ ] Tạo address:
  ```bash
  curl -s -X POST "$BASE_URL/store/customers/me/addresses" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <customer_jwt>" \
    -d '{"first_name":"Anh","last_name":"Nguyen","address_1":"123 Nguyen Trai","city":"HCM","country_code":"vn","phone":"+84901234567"}'
  ```
  Kỳ vọng: response có `address.id`.
- [ ] Kiểm tra DB:
  ```sql
  SELECT id, first_name, last_name, phone FROM customer WHERE id = '<customer_id>';
  SELECT id, customer_id, address_1, city, country_code FROM customer_address WHERE customer_id = '<customer_id>' ORDER BY created_at DESC LIMIT 1;
  ```
  Kỳ vọng: profile + address mới tồn tại, `customer_id` map đúng.

#### 3) Cart create/update + capture stacktrace khi lỗi 500
- [ ] Tạo cart:
  ```bash
  curl -s -X POST "$BASE_URL/store/carts" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <customer_jwt>" \
    -d '{"region_id":"<region_id>"}'
  ```
  Kỳ vọng: response có `cart.id`, `customer_id` đúng với user.
- [ ] Update cart:
  ```bash
  curl -s -X POST "$BASE_URL/store/carts/<cart_id>" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <customer_jwt>" \
    -d '{"additional_data":{"debug_source":"validation-checklist"}}'
  ```
  Kỳ vọng: `cart.additional_data.debug_source = "validation-checklist"`.
- [ ] Kiểm tra DB:
  ```sql
  SELECT id, customer_id, region_id FROM cart WHERE id = '<cart_id>';
  ```
  Kỳ vọng: cart được persist và gắn đúng customer.
- [ ] Kiểm tra logs khi gặp 500 (cả local/prod):
  - Có stacktrace/error object từ `logger.error(error)`.
  - Có log context:
    - `POST /store/carts failed (region_id=..., customer_id=..., currency_code=...)`
    - `POST /store/carts/<id> failed (keys=...)`
  - Với Render:
    ```bash
    # ví dụ: lọc nhanh theo route
    # render logs --service <service-id> | grep "POST /store/carts"
    ```
  Kỳ vọng: đủ stack + context để trace root cause 500.

---

## Chi Tiết Payment Providers

### 1. Stripe Payment Provider

**Module**: `@medusajs/medusa-payment-stripe`

**Luồng hoạt động**:
```
1. Client: Khởi tạo payment session → GET /store/payment-collections/:id
2. Client: Redirect user đến Stripe Checkout
3. Stripe: User nhập thông tin thanh toán
4. Stripe: Webhook callback → POST /webhooks/stripe
5. Server: Process webhook → Cập nhật order status
6. Client: Poll order status hoặc redirect callback
```

**Configuration** (medusa-config.ts):
```typescript
{
  resolve: "@medusajs/medusa-payment-stripe",
  id: "stripe",
  options: {
    apiKey: process.env.STRIPE_API_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
}
```

**Environment Variables**:
```bash
STRIPE_API_KEY=sk_test_...              # Test key từ Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook secret từ Stripe Dashboard
```

**Setup Stripe Webhook**:
1. Đăng nhập Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/webhooks/stripe`
3. Select events: `payment_intent.succeeded`, `payment_intent.failed`
4. Copy webhook secret → set vào STRIPE_WEBHOOK_SECRET

**Testing**:
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:9000/webhooks/stripe
```

---

### 2. COD Payment Provider

**Module**: `./src/modules/cod-payment`

**Luồng hoạt động**:
```
1. Client: Chọn COD payment method
2. Client: Complete checkout → Order created (payment status: authorized)
3. Server: Tạo fulfillment → Giao hàng
4. Fulfiller: Giao hàng thành công → Nhận tiền mặt
5. Admin/Staff: POST /store/orders/:id/cod-capture
6. Server: Capture payment → Update order payment status: captured
```

**Đặc điểm**:
- Không cần external payment gateway
- Payment được authorize ngay nhưng chưa capture
- Capture payment sau khi giao hàng thành công
- Không có webhook (internal only)

**API Endpoint**:
```
POST /store/orders/:id/cod-capture

Body:
{
  "payment_id": "pay_xxx",
  "amount": 100000,           // Optional, defaults to order total
  "notes": "Đã nhận tiền mặt"  // Optional
}

Response:
{
  "success": true,
  "data": {
    "order_id": "order_xxx",
    "payment_id": "pay_xxx",
    "captured_amount": 100000,
    "status": "captured",
    "captured_at": "2024-01-01T10:00:00Z"
  }
}
```

**Configuration** (medusa-config.ts):
```typescript
{
  resolve: "./src/modules/cod-payment",
  id: "cod",
  options: {},
}
```

---

## Chi Tiết Fulfillment Provider

### In-house Fulfillment Provider

**Module**: `./src/modules/inhouse-fulfillment`

**Luồng hoạt động**:
```
1. Order confirmed → System tạo fulfillment
2. Fulfillment status: pending
3. Staff chuẩn bị hàng → Update status: processing
4. Giao cho shipper → Update status: shipped
5. Shipper đang giao → Update status: out_for_delivery
6. Giao thành công → Update status: delivered
7. (Nếu COD) → Capture payment
```

**Fulfillment Statuses**:
- `pending`: Đang chờ xử lý
- `processing`: Đang chuẩn bị hàng
- `shipped`: Đã giao cho shipper
- `out_for_delivery`: Đang trên đường giao
- `delivered`: Đã giao thành công
- `failed`: Giao thất bại
- `canceled`: Đã hủy

**API Endpoints**:

#### 1. Update Fulfillment Status (Admin)
```
POST /admin/fulfillments/:id/status

Body:
{
  "order_id": "order_xxx",    // Required
  "status": "shipped",        // Required
  "location": "HCM City Hub", // Optional
  "notes": "Package picked up" // Optional
}

Response:
{
  "success": true,
  "data": {
    "fulfillment": {...},
    "notification": {...},
    "updated_at": "2024-01-01T10:00:00Z"
  }
}
```

#### 2. Track Fulfillment (Store/Customer)
```
GET /store/orders/:id/fulfillments

Response:
{
  "fulfillments": [
    {
      "id": "ful_xxx",
      "tracking_number": "IH123ABC",
      "status": "shipped",
      "estimated_delivery_date": "2024-01-05T00:00:00Z",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-02T14:00:00Z",
      "items": [...],
      "location": "HCM City Hub",
      "notes": "Package picked up by shipper"
    }
  ]
}
```

**Configuration** (medusa-config.ts):
```typescript
{
  resolve: "./src/modules/inhouse-fulfillment",
  id: "inhouse-fulfillment",
  options: {
    default_warehouse_address: process.env.WAREHOUSE_ADDRESS,
    contact_phone: process.env.WAREHOUSE_PHONE,
    contact_email: process.env.WAREHOUSE_EMAIL,
  },
}
```

**Environment Variables**:
```bash
WAREHOUSE_ADDRESS=123 Main Street, HCM City
WAREHOUSE_PHONE=+84123456789
WAREHOUSE_EMAIL=warehouse@company.com
```

**Shipping Price Calculation**:
- Base price: 30,000 VND
- +5,000 VND per item
- Free shipping for orders > 500,000 VND

**Tracking Number Format**:
- Standard: `IH{timestamp}{random}` (e.g., IH1A2B3C4D5E)
- Return: `RET{timestamp}{random}`

---

## Workflows

### 1. Capture COD Payment Workflow

**File**: `src/workflows/payment/capture-cod-payment.ts`

**Workflow ID**: `capture-cod-payment`

**Input**:
```typescript
{
  order_id: string
  payment_id: string
  amount?: number
  notes?: string
}
```

**Steps**:
1. Query order và payment details
2. Validate order status (không canceled, chưa captured)
3. Find COD payment
4. Capture payment
5. Update order payment status

**Usage**:
```typescript
import { captureCodPaymentWorkflow } from "./workflows/payment"

const { result } = await captureCodPaymentWorkflow(req.scope).run({
  input: {
    order_id: "order_xxx",
    payment_id: "pay_xxx",
    amount: 100000,
    notes: "Cash received from customer",
  },
})
```

---

### 2. Update Fulfillment Status Workflow

**File**: `src/workflows/fulfillment/update-fulfillment-status.ts`

**Workflow ID**: `update-fulfillment-status`

**Input**:
```typescript
{
  fulfillment_id: string
  order_id: string
  status: string
  location?: string
  notes?: string
  customer_email?: string
}
```

**Steps**:
1. Update fulfillment status
2. Send notification to customer
3. Return updated fulfillment data

**Usage**:
```typescript
import { updateFulfillmentStatusWorkflow } from "./workflows/fulfillment"

const { result } = await updateFulfillmentStatusWorkflow(req.scope).run({
  input: {
    fulfillment_id: "ful_xxx",
    order_id: "order_xxx",
    status: "delivered",
    location: "Customer address",
    notes: "Successfully delivered",
  },
})
```

---

### 3. Handle Stripe Webhook Workflow

**File**: `src/workflows/payment/handle-stripe-webhook.ts`

**Workflow ID**: `handle-stripe-webhook`

**Input**:
```typescript
{
  event: any           // Stripe event object
  signature: string    // Stripe signature header
}
```

**Steps**:
1. Verify webhook signature
2. Process event based on type
3. Update payment/order status

---

## Database Schema

Medusa sẽ tự động quản lý database schema thông qua migrations. Các custom fields được lưu trong:

### Payment Session Data (JSON field)
```json
{
  "transaction_id": "cod_xxx",
  "session_id": "ps_xxx",
  "amount": 100000,
  "currency_code": "VND",
  "status": "captured",
  "payment_method": "cod",
  "initiated_at": "...",
  "authorized_at": "...",
  "captured_at": "..."
}
```

### Fulfillment Data (JSON field)
```json
{
  "tracking_number": "IH123ABC",
  "status": "shipped",
  "created_at": "...",
  "estimated_delivery_date": "...",
  "warehouse_address": "...",
  "contact_phone": "...",
  "items": [...],
  "delivery_address": {...},
  "location": "HCM City Hub",
  "notes": "Package picked up"
}
```

---

## Security & Best Practices

### 1. Webhook Security
- **Stripe**: Luôn verify webhook signature
- **ZaloPay**: Luôn verify MAC signature
- Return 200 ngay cả khi có lỗi để prevent retry storms

### 2. Payment Capture
- Chỉ capture COD payment sau khi giao hàng thành công
- Validate order status trước khi capture
- Log tất cả payment actions

### 3. Fulfillment Updates
- Chỉ admin/staff mới update được fulfillment status
- Validate status transitions (không nhảy từ pending → delivered)
- Send notifications cho customer sau mỗi update

### 4. Error Handling
- Log tất cả errors với context đầy đủ
- Return user-friendly error messages
- Implement retry logic cho external API calls

---

## Deployment Checklist

### 1. Environment Variables
- [ ] Set STRIPE_API_KEY (production key)
- [ ] Set STRIPE_WEBHOOK_SECRET
- [ ] Set WAREHOUSE_ADDRESS, WAREHOUSE_PHONE, WAREHOUSE_EMAIL
- [ ] Update CORS settings

### 2. Stripe Configuration
- [ ] Create production Stripe account
- [ ] Setup webhook endpoint
- [ ] Test payment flow
- [ ] Configure payment methods

### 3. Database
- [ ] Run migrations: `npx medusa migrations run`
- [ ] Backup database
- [ ] Test rollback procedures

### 4. Testing
- [ ] Test Stripe payment flow
- [ ] Test COD payment flow
- [ ] Test fulfillment status updates
- [ ] Test webhook handling
- [ ] Load testing

---

## Monitoring & Logging

### Key Metrics to Monitor
1. Payment success rate (by provider)
2. Average payment processing time
3. Webhook failure rate
4. Fulfillment status distribution
5. Average delivery time

### Logging Best Practices
```typescript
// Log payment initiation
logger.info(`Payment initiated`, {
  order_id,
  provider: "stripe",
  amount,
  currency,
})

// Log fulfillment updates
logger.info(`Fulfillment status updated`, {
  fulfillment_id,
  old_status,
  new_status,
  updated_by,
})

// Log errors with context
logger.error(`Payment capture failed`, {
  order_id,
  payment_id,
  error: error.message,
  stack: error.stack,
})
```

---

## Troubleshooting

### Common Issues

#### 1. Stripe webhook not working
- Check webhook URL is publicly accessible
- Verify webhook secret is correct
- Check Stripe Dashboard → Events for delivery status
- Use Stripe CLI for local testing

#### 2. COD payment capture fails
- Verify order status is not "canceled"
- Check payment is not already captured
- Ensure payment provider is "cod"

#### 3. Fulfillment status not updating
- Check fulfillment_id is correct
- Verify order_id is provided
- Check status is valid
- Review workflow execution logs

---

## Support & Contact

For technical issues or questions:
- GitHub Issues: [repository-url]
- Email: tech@company.com
- Slack: #tech-support
