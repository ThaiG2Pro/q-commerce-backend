# Fake Orders Script — Hướng dẫn sử dụng & đọc code

## Mục đích

Script tạo fake customers, carts, orders, fulfillments và gửi analytics events lên PostHog.
Dùng để fake data cho dashboard với 2 KPI chính:

- **Checkout Success Rate** = `#order.placed / #cart.created`
- **On-time Delivery Rate** = `#on_time / #fulfillment.delivered`

## Cách chạy

**Yêu cầu:** Server Medusa phải đang chạy (`pnpm dev` ở terminal khác).

```bash
pnpm fake:orders --orders=20 --cart-only-rate=30 --ontime-rate=85
```

### Tham số

| Param | Default | Ý nghĩa |
|-------|---------|---------|
| `--orders` | 10 | Tổng số customers tạo |
| `--cart-only-rate` | 0 | % chỉ tạo cart rồi bỏ (abandoned, không place order) |
| `--ontime-rate` | 85 | % giao đúng giờ (trong số orders hoàn thành) |
| `--expect-minutes` | 20 | Thời gian giao hàng kỳ vọng (phút) |

### Ví dụ

```bash
# 20 customers, 30% bỏ cart, 85% giao đúng giờ
pnpm fake:orders --orders=20 --cart-only-rate=30 --ontime-rate=85

# 5 customers, tất cả đều place order, 100% on-time
pnpm fake:orders --orders=5 --cart-only-rate=0 --ontime-rate=100

# 50 customers, 40% bỏ cart, 70% on-time, expect 15 phút
pnpm fake:orders --orders=50 --cart-only-rate=40 --ontime-rate=70 --expect-minutes=15
```

### Output mẫu

```
Validated 31/33 variants
[OK] #1 email=fake+...@example.com order=order_... delivery=11min ON-TIME
[OK] #2 email=fake+...@example.com order=order_... delivery=31min LATE
[OK] #3 email=fake+...@example.com cart=cart_...  CART-ONLY (abandoned)
[OK] #4 email=fake+...@example.com order=order_... delivery=9min  ON-TIME

=== Summary ===
success: 4
failed: 0
cart-only-rate target: 30%
ontime-rate target: 85%
expect-minutes: 20
```

## Flow mỗi customer

```
Register (fake+{ts}_{i}@example.com)
  → Create customer profile
  → Login (lấy JWT token)
  → Track: customer.created
  → Create cart (authenticated)
  → Add random item + set address
  → Track: cart.created
  │
  ├── [cart-only-rate %] → STOP (abandoned cart)
  │
  └── [còn lại] → Add shipping method
                → Create payment collection + COD session
                → Complete cart (place order)
                → Track: order.placed
                → Admin: create fulfillment → mark shipped → mark delivered
                → Track: fulfillment.delivered (simulated delivery time)
```

## PostHog Events

Mỗi customer tạo ra 2-4 events tùy flow:

| Flow | Events |
|------|--------|
| Cart abandoned | `customer.created`, `cart.created` |
| Full flow | `customer.created`, `cart.created`, `order.placed`, `fulfillment.delivered` |

Mọi event đều có:
- `actor_id` = `customer_id` (PostHog dùng làm `distinct_id`)
- `customer_type: "fake"`
- `is_simulated: true`
- `source: "script"`
- `schema_version: "1.0"`

Xem chi tiết event schema tại [ANALYTICS_CONTRACT.md](./ANALYTICS_CONTRACT.md).

## PostHog Dashboard

Tạo **Funnel** insight:
1. Step 1: `customer.created`
2. Step 2: `cart.created`
3. Step 3: `order.placed`
4. Step 4: `fulfillment.delivered`

- Filter `customer_type = real` → chỉ xem real customers
- Bỏ filter → xem cả fake + real
- Breakdown `on_time` trên step 4 → On-time Delivery Rate

---

## Đọc code

### Cấu trúc files

```
src/scripts/fake-orders/
  run.ts                    ← Script chính (entry point)
  config.template.ts        ← Config: base URL, publishable key, addresses, shipping option
  variants.template.json    ← Danh sách variant IDs để random chọn

src/analytics/              ← Shared analytics foundation
  constants.ts              ← Event names, schema version, expected delivery minutes
  detect-customer-type.ts   ← detectCustomerType(email) → "fake" | "real"
  contracts.ts              ← Types + 4 builder functions (single source of truth)
  index.ts                  ← Re-exports
```

### run.ts — đọc từ trên xuống

1. **Parse args** (dòng 15-28): `parseArg()` và `intArg()` đọc từ `process.argv`
2. **Setup** (dòng 66-115): Load config, resolve `analyticsModuleService` từ Medusa container, login admin, validate variants qua Store API
3. **Main loop** (dòng 120+): Mỗi iteration = 1 customer, gồm:
   - Register + create profile + login (raw `fetch`)
   - Create cart + add item + set address (raw `fetch` với JWT token)
   - Random quyết định cart-only hay full flow
   - Nếu full: shipping → payment → complete → admin fulfillment → delivery
   - Track events qua `analytics.track()` dùng contract builders

### Tại sao dùng raw `fetch` thay vì Medusa JS SDK?

SDK dùng global state cho auth token — khi loop qua nhiều customers, token bị conflict. Raw `fetch` với explicit token per request giải quyết vấn đề này.

### contracts.ts — builder functions

Mỗi builder nhận input → trả `AnalyticsPayload` type-safe:

```typescript
buildCustomerCreated({ customer_id, email, source: "script", is_simulated: true })
buildCartCreated({ customer_id, email, cart_id, currency_code, ... })
buildOrderPlaced({ customer_id, email, order_id, cart_id, total, ... })
buildFulfillmentDelivered({ customer_id, email, order_id, fulfillment_id, actual_delivery_minutes, ... })
```

Mỗi builder tự:
- Set `actor_id = customer_id`
- Gọi `detectCustomerType(email)` → set `customer_type`
- Default `is_simulated = false`, `source = "subscriber"`, `schema_version = "1.0"`
- Validate timestamp nếu có (phải <= now)

### Subscribers vs Script — tại sao tách?

| | Subscriber | Script |
|---|---|---|
| Trigger | Medusa event (real-time) | Manual CLI |
| Tracks | Real customers only | Fake customers only |
| Delivery time | Tính từ `shipped_at`/`delivered_at` thật | Simulated (random 8-35 phút) |
| `is_simulated` | `false` | `true` |
| `source` | `"subscriber"` | `"script"` |

Subscribers detect fake email → skip. Script tự track. Không duplicate.

---

## Fix bug / phát triển thêm

### Thêm tham số mới

1. Thêm `intArg("ten-param", default)` ở đầu `fakeOrders()`
2. Dùng biến đó trong main loop
3. Update bảng tham số trong doc này

### Thêm event mới

1. Thêm event name vào `src/analytics/constants.ts`
2. Tạo builder function trong `src/analytics/contracts.ts`
3. Export từ `src/analytics/index.ts`
4. Tạo subscriber trong `src/subscribers/`
5. Thêm tracking call trong script
6. Update [ANALYTICS_CONTRACT.md](./ANALYTICS_CONTRACT.md)

### Sửa config (URL, address, variants...)

Edit `src/scripts/fake-orders/config.template.ts` và `variants.template.json`.

### Debug

- Script fail ở register? → Check server đang chạy, publishable key đúng
- Variant validation fail? → Check `variants.template.json` có variant IDs hợp lệ, products đã published
- Payment fail? → Check COD payment provider đã setup trong admin
- Fulfillment fail? → Check có stock location trong admin, inventory đủ
- PostHog không nhận event? → Check `POSTHOG_EVENTS_API_KEY` trong `.env`
