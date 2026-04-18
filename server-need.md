# Server Needs (for Client Team)

> DEPRECATED: Zalo authentication/mini-app integration has been removed from the active server configuration.
> The Zalo-related sections below are kept for historical reference only and should not be relied on by the current client/server flow.

## 1. Auth (Zalo Mini App) (DEPRECATED)

- Endpoint login (removed): `POST /auth/customer/zalo`
- Body (historical):
  ```json
  { "access_token": "<zalo_access_token>" }
  ```
-- Note: Zalo auth was removed. Use Email/Password (`emailpass`) for authentication.

### First login flow
1. Gọi `POST /auth/customer/zalo`
2. Nếu token chưa có `actor_id`, gọi `POST /store/customers`
3. Gọi `POST /auth/token/refresh` để lấy token mới có `customer_id/actor_id`

> Lưu ý: server đã normalize email placeholder và tự fill tên từ Zalo metadata khi thiếu.

---

## 2. Customer Profile

- Update profile: `POST /store/customers/me`
- Update/create address: `POST /store/customers/me/addresses`

> `phone/address` nằm ở customer profile + customer_address (không chỉ trong bảng customer).

---

## 3. Cart

- Create cart: `POST /store/carts`
- Update cart: `POST /store/carts/:id`
- Header bắt buộc:
  - `x-publishable-api-key: <pk_...>`
  - `Content-Type: application/json`
- Body create tối thiểu:
  ```json
  { "region_id": "<reg_...>" }
  ```

---

## 4. Important Runtime Note (production)

- Nếu gặp `500 unknown_error` ở cart, server side đã xác nhận root cause từng xảy ra do Redis quota (`ERR max requests limit exceeded`).
- Tạm thời có thể bật fallback:
  - `ENABLE_REDIS_MODULES=false`

Sau khi Redis ổn định lại, có thể bật lại:
- `ENABLE_REDIS_MODULES=true`
# Server requirements for Mini App client

## 1) Storefront profile (logo, shop name, main address)

Client now reads storefront branding from Medusa first, with fallback to `app-config.json`.

### Preferred endpoint

- **GET** `/store/storefront-profile`
- Public Store API route (requires `x-publishable-api-key`)

Example response:

```json
{
  "storefront": {
    "shop_name": "Tiệm Tí Hon",
    "shop_address": "Z06 số 13, Tân Thuận Đông, Quận 7, TP.HCM",
    "logo_url": "https://your-cdn/logo.png"
  }
}
```

### Fallback supported by client

Client also tries **GET** `/store/store` and maps fields from:

- `store.name` / `store.shop_name`
- `store.address` / `store.shop_address`
- `store.logo_url`
- or the same values inside `store.metadata`

## 2) Branches / stations (2+ pickup locations)

Client now supports loading branches directly from backend.

### Endpoint

- **GET** `/store/branches`
- Public Store API route (requires `x-publishable-api-key`)

Accepted response keys: `branches` (preferred), `stations`, or `locations`.

Example response:

```json
{
  "branches": [
    {
      "id": "cn_q7",
      "name": "Chi nhánh Quận 7",
      "address": "Z06 số 13, Tân Thuận Đông, Quận 7, TP.HCM",
      "image": "https://your-cdn/branch-q7.jpg",
      "location": { "lat": 10.773756, "lng": 106.689247 }
    },
    {
      "id": "cn_tphu",
      "name": "Chi nhánh Tân Phú",
      "address": "123 ABC, Tân Phú, TP.HCM",
      "image": "https://your-cdn/branch-tanphu.jpg",
      "location": { "lat": 10.789, "lng": 106.623 }
    }
  ]
}
```

## 3) Zalo auth route already required by client

- **POST** `/auth/zalo`
- Body: `{ "accessToken": "<zalo_access_token>" }`
- Server must verify token with Zalo Open API and `appsecret_proof`.
- Return user/customer profile and optionally JWT token (`jwt` or `token` or `accessToken`) for Medusa SDK session.

## 4) Loyalty profile (points + expiry + barcode/member code)

Client profile screen now supports loading loyalty data from backend.

### Endpoint

- **GET** `/store/loyalty-profile`
- Public Store API route (requires `x-publishable-api-key`)

Accepted response fields (one of these shapes):

```json
{
  "loyalty": {
    "points": 120,
    "expiry_date": "2026-12-31",
    "barcode_value": "MEMBER-ABC-001"
  }
}
```

or

```json
{
  "points": 120,
  "expiryDate": "2026-12-31",
  "barcodeValue": "MEMBER-ABC-001"
}
```

If this endpoint is missing, client falls back to demo defaults.

## 5) Cart issue to fix on server

Current backend is returning:

- **POST** `/store/carts` -> `500 unknown_error` even with valid `region_id` and publishable key.

Client has been updated to always send `region_id`, but cart creation still fails due to server-side issue. Please inspect Render logs for cart workflow/database/config errors.

# Server Need (for current client flow)

## Mục tiêu
Đảm bảo client checkout hiện tại chạy end-to-end với Medusa backend thật, không fallback/mock ở các bước quan trọng.

## P0 - Bắt buộc để checkout chạy được

### 1) Zalo auth exchange route
- Tạo/duy trì route: `POST /auth/zalo`
- Input:
```json
{ "accessToken": "<zalo_access_token>" }
```
- Server cần:
1. Verify token với Zalo Open API (kèm `appsecret_proof` nếu cần).
2. Tìm hoặc tạo customer tương ứng trong Medusa.
3. Trả về token để storefront set session (`jwt` hoặc `token` hoặc `accessToken`).
4. Trả thêm profile cơ bản nếu có (`user`/`customer`/`profile`).

### 2) Shipping options hợp lệ cho cart/region
- Đảm bảo cart có thể lấy shipping options khả dụng theo region.
- Đảm bảo `addShippingMethod` không fail vì thiếu shipping profile/fulfillment setup.
- Điều kiện pass:
1. Sau khi client gửi shipping address, cart có thể attach shipping method.
2. Không lỗi 400/500 ở bước add shipping method.

### 3) Payment provider cấu hình thật theo region
- Bật ít nhất 1 payment provider đang hoạt động cho region checkout.
- Đảm bảo endpoint listing providers trả danh sách non-empty cho cart region hiện tại.
- Điều kiện pass:
1. Client lấy được providers.
2. `initiate payment session` thành công với `provider_id` được chọn.

### 4) Complete cart phải thành order thành công
- Sau khi đã có contact + shipping address + shipping method + payment session:
1. `complete cart` phải trả kết quả completed/order.
2. Không trả trạng thái dangling/incomplete do thiếu cấu hình backend.

### 5) Sửa lỗi tạo cart 500
- Hiện có dấu hiệu `POST /store/carts` trả `500 unknown_error` trong một số môi trường.
- Cần kiểm tra:
1. Region tồn tại và active.
2. Publishable key mapping đúng sales channel/region.
3. Migration/schema DB đầy đủ.
4. Logs workflow cart creation.

## P1 - Nên có ngay sau P0

### 6) Store profile endpoint cho storefront
- Route khuyến nghị: `GET /store/storefront-profile`
- Trả dữ liệu branding:
```json
{
  "storefront": {
    "shop_name": "...",
    "shop_address": "...",
    "logo_url": "..."
  }
}
```
- Client có fallback `/store/store`, nhưng endpoint riêng giúp ổn định mapping.

### 7) Branches endpoint cho điểm nhận hàng
- Route: `GET /store/branches`
- Trả `branches` (hoặc `stations`/`locations`) có `name`, `address`, `location.lat`, `location.lng`.

### 8) Loyalty profile endpoint
- Route: `GET /store/loyalty-profile`
- Trả `points`, `expiry_date` (hoặc `expiryDate`), `barcode_value` (hoặc `barcodeValue`).

## API contract tối thiểu để khớp client hiện tại

### Checkout data client gửi lên server
1. Contact: email (update cart contact).
2. Shipping address: first_name, last_name, address_1, city, country_code, phone.
3. Shipping method: option_id đã chọn.
4. Payment: provider_id để initiate payment session.
5. Complete: complete cart để tạo order.

## Definition of Done (DoD)
1. Test manual 1 vòng checkout từ app mini:
   - add to cart -> chọn địa chỉ -> chọn shipping -> chọn payment -> thanh toán.
2. Medusa trả order thành công, app điều hướng sang trang orders.
3. Không còn lỗi 500/400 ở các bước cart/shipping/payment/complete với dữ liệu hợp lệ.
4. Auth `/auth/zalo` trả token hợp lệ và session customer dùng được cho `store.customer.retrieve`.

## Gợi ý kiểm thử nhanh (backend)
1. `POST /auth/zalo` với token test.
2. `POST /store/carts` tạo cart với `region_id`.
3. `GET /store/payment-providers?region_id=...`.
4. Attach shipping method cho cart.
5. Initiate payment session cho cart.
6. Complete cart và xác nhận order được tạo.