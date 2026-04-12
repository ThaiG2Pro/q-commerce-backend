# Phân Tích: Xử Lý OPTIONS Request & CORS trong Medusa

## 📋 Tóm Tắt Vấn Đề
```
❌ Browser: Gửi preflight OPTIONS request → Bị từ chối ❌
   Lỗi: "missing publishable key" hoặc CORS error
```

---

## 🔍 Chi Tiết Kiểm Tra

### 1. ✅ CORS Configuration (Đã Cấu Hình Đúng)

**File**: [medusa-config.ts](medusa-config.ts#L30-L32)
```typescript
http: {
  storeCors: process.env.STORE_CORS || "",
  adminCors: process.env.ADMIN_CORS || "",
  authCors: process.env.AUTH_CORS || "",
  // ...
}
```

**Environment Variables** ([.env.example](.env.example#L5-L8)):
```env
STORE_CORS=http://localhost:8000,http://localhost:9000,http://localhost:3000
ADMIN_CORS=http://localhost:5173,http://localhost:9000,http://localhost:3000
AUTH_CORS=http://localhost:5173,http://localhost:9000,http://localhost:8000,http://localhost:3000
```

**🟢 Status**: ✅ CORS headers được set bởi Medusa framework tự động

---

### 2. ⚠️ Middleware Configuration (VỪA TẠO)

**File**: [src/api/middlewares.ts](src/api/middlewares.ts) - **VỪA TẠO**

**Vấn đề Trước đó**:
- Routes [src/api/store/customers/route.ts](src/api/store/customers/route.ts#L5) import `PostStoreCustomersBody`
- Routes [src/api/store/carts/route.ts](src/api/store/carts/route.ts#L4) import `PostStoreCartsBody`
- Routes [src/api/store/carts/[id]/route.ts](src/api/store/carts/[id]/route.ts#L4) import `PostStoreCartByIdBody`
- **File không tồn tại** →可能导致type errors hoặc runtime issues

**Giải pháp**: Tạo [src/api/middlewares.ts](src/api/middlewares.ts) với schema definitions

---

### 3. 🔴 OPTIONS Request Handling

#### Cách Medusa Framework Xử Lý Preflight

Medusa tự động:
1. **Xử lý OPTIONS requests** - Không cần tạo `OPTIONS` method
2. **Set CORS headers** - Dựa trên `storeCors`, `adminCors`, `authCors`
3. **Bỏ qua authentication** - OPTIONS requests > preflight > không cần auth

#### Nguyên Nhân OPTIONS Bị Từ Chối

Có **3 kịch bản** gây lỗi:

##### ✅ Kịch Bản 1: CORS Header Mismatch (Kiểm Tra Đầu Tiên)

```
Browser Request:
  Origin: http://localhost:3000 (từ storefront)
  Method: OPTIONS

Server Response:
  ❌ Access-Control-Allow-Origin: KHÔNG KHỚP với STORE_CORS
  ❌ "missing publishable key" error
```

**Giải pháp**:
1. Mở Chrome DevTools → Network tab
2. Click request OPTIONS → Headers
3. Xem `Origin` (browser gửi)
4. Xem `Access-Control-Allow-Origin` (server response)
5. So sánh với `STORE_CORS` env var
6. Nếu không khớp → Update `.env` file

##### ✅ Kịch Bản 2: Middleware Xác Thực Chặn OPTIONS (Nguy Hiểm)

Nếu có **global authentication middleware** xử lý toàn bộ methods:

```typescript
// ❌ SAI - Chặn cả OPTIONS requests
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/*",
      method: "*",  // ← Cái này nắm cả OPTIONS!
      middlewares: [authenticate("customer")],
    },
  ],
})
```

**Hệ quả**:
- OPTIONS requests yêu cầu authentication
- Nhưng OPTIONS không có Authorization headers
- → "missing publishable key" error

**Kiểm tra**: [src/api/middlewares.ts](src/api/middlewares.ts)
- ✅ Middleware hiện tại **KHÔNG** có global auth cho OPTIONS

##### ✅ Kịch Bản 3: Publishable Key Validation (Hiếm)

Nếu có custom Zod schema validate publishable key in OPTIONS:

```typescript
// ❌ SAI - Validate publishable key ở middleware
const MySchema = z.object({
  publishable_key: z.string(),  // ← OPTIONS không có body!
})

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/products",
      method: "GET",
      middlewares: [validateAndTransformBody(MySchema)],
    },
  ],
})
```

**Kiểm tra**: [src/api/middlewares.ts](src/api/middlewares.ts)
- ✅ Schema KHÔNG bắt buộc publishable_key

---

## 📊 Diagnostic Checklist

### Để Debug OPTIONS Rejection:

- [ ] **1. Kiểm Tra CORS Config**
  ```bash
  # Xem env vars hiện tại
  grep CORS .env
  ```
  - Chắc chắn `STORE_CORS` chứa origin của browser
  - Ví dụ nếu storefront chạy `http://localhost:3000`:
    ```env
    STORE_CORS=http://localhost:3000
    ```

- [ ] **2. Kiểm Tra Browser Console**
  ```
  Open DevTools → Network tab
  Click OPTIONS request → Response headers
  Look for: Access-Control-Allow-Origin
  ```

- [ ] **3. Kiểm Tra Server Logs**
  ```bash
  # Tìm error messages khi OPTIONS request bị reject
  docker logs <container> | grep -i "options\|cors\|publish"
  ```

- [ ] **4. Kiểm Tra Middleware (CRITICAL)**
  ```bash
  # Chắc chắn src/api/middlewares.ts không có:
  # - method: "*" (bắt tất cả methods kể OPTIONS)
  # - authenticate() cho routes không cần auth
  # - validateAndTransformBody với required fields cho GET/OPTIONS
  grep -n "method.*\*\|authenticate.*store" src/api/middlewares.ts
  ```

---

## 🛠️ Các Fix Được Áp Dụng

### ✅ Fix 1: Tạo Missing Middlewares File
- **File**: [src/api/middlewares.ts](src/api/middlewares.ts)
- **Content**: Schema definitions + middleware config
- **Impact**: Routes không bị import error nữa

### ⚠️ Fix 2: Verify CORS Environment (Cần Manual Check)

**Action Item**:
1. Xem `.env` file hiện tại
2. Chắc chắn `STORE_CORS` chứa frontend origin
3. Nếu chạy development:
   ```env
   # Thêm dòng này nếu frontend chạy localhost:3000
   STORE_CORS=http://localhost:3000
   ```
4. Restart server

---

## 📋 Medusa Framework Behaviors

| Behavior | Details |
|----------|---------|
| **OPTIONS Handling** | ✅ Automatic (framework handles) |
| **CORS Headers** | ✅ Set by framework based on config |
| **Auth on OPTIONS** | ❌ Should NOT require auth (preflight) |
| **Validation on OPTIONS** | ❌ Should NOT validate body OPTIONS has no body |
| **Custom Routes** | ✅ Get CORS automatically (framework applies) |

---

## 🚨 Common Mistakes to Avoid

```typescript
// ❌ WRONG 1: Authenticate OPTIONS requests
defineMiddlewares({
  routes: [{
    matcher: "/store/carts",
    method: "*",  // ← This catches OPTIONS too!
    middlewares: [authenticate("customer")],
  }]
})

// ❌ WRONG 2: Validate body on GET/OPTIONS
defineMiddlewares({
  routes: [{
    matcher: "/store/products",
    method: "GET",
    middlewares: [validateAndTransformBody(MySchema)],  // ← GET should use query!
  }]
})

// ❌ WRONG 3: Require publishable key on validation
const schema = z.object({
  publishable_key: z.string(),  // ← OPTIONS calls won't have body!
})

// ✅ CORRECT: Let Medusa handle OPTIONS, only protect actual methods
defineMiddlewares({
  routes: [{
    matcher: "/store/carts",
    method: "POST",  // ← Only POST, not GET/OPTIONS
    middlewares: [authenticate("customer"), validateAndTransformBody(Schema)],
  }]
})
```

---

## 🔗 Related Files

- [medusa-config.ts](medusa-config.ts) - CORS configuration
- [.env.example](.env.example) - CORS env vars template
- [src/api/middlewares.ts](src/api/middlewares.ts) - Middleware definitions (NEWLY CREATED)
- [src/api/store/carts/route.ts](src/api/store/carts/route.ts) - Example route
- [src/api/store/customers/route.ts](src/api/store/customers/route.ts) - Example route

---

## Next Steps

1. **Verify CORS in .env file**
   ```bash
   cat .env | grep CORS
   # Chắc chắn frontend origin được listed
   ```

2. **Restart Server**
   ```bash
   # If using docker
   docker compose restart
   
   # If using npm
   npm run dev
   ```

3. **Test OPTIONS Request Manually**
   ```bash
   curl -X OPTIONS http://localhost:9000/store/carts \
     -H "Origin: http://localhost:3000" \
     -v
   
   # Check response headers: Access-Control-Allow-Origin
   ```

4. **Monitor Logs for Errors**
   ```bash
   docker logs -f <container> | grep -i "cors\|options\|auth"
   ```

---

## 📞 Questions?

Nếu OPTIONS requests vẫn bị reject sau các checks trên:
1. Check browser DevTools Network tab → Xem OPTIONS request headers
2. Compare `Origin` header với `STORE_CORS` env var
3. Xem server logs để tìm authentication errors
4. Verify `src/api/middlewares.ts` KHÔNG có middleware chặn OPTIONS
