# Q-Commerce (MedusaJS v2 Starter)

Chào mừng bạn tham gia dự án Q-Commerce! Đây là dự án thương mại điện tử sử dụng MedusaJS v2 với hiệu năng cao và khả năng mở rộng tốt.

## Bắt đầu nhanh (Quick Start)

### 1. Clone Project
```bash
git clone https://github.com/ThaiG2Pro/q-commerce-backend.git
cd q-commerce-backend
```

### 2. Thiết lập môi trường
Dự án sử dụng **mise** và **pnpm**.
- Copy file mẫu `.env.example` thành `.env`:
  ```bash
  cp .env.example .env
  ```
- Điền các thông tin nhạy cảm (DATABASE_URL, REDIS_URL) được gửi riêng qua ib.

### 3. Chạy dự án (Chọn 1 trong 2 cách)

#### Cách 1: Sử dụng Docker (Khuyên dùng cho setup nhanh)
Bạn không cần cài Node.js hay pnpm trên máy, chỉ cần Docker:
```bash
docker compose up --build
```

#### Cách 2: Chạy trực tiếp trên máy (Yêu cầu Node 20+)
```bash
corepack enable pnpm
pnpm install
pnpm exec medusa db:migrate
pnpm run dev
```

## 🛠️ Quy trình phát triển (Development Workflow)

### Tạo nhánh mới (Branching)
Vui lòng tạo nhánh mới khi làm tính năng hoặc sửa lỗi:
- `feat/ten-tinh-nang`
- `fix/ten-loi`

### Kiểm tra dự án (Testing)
Sau khi setup thành công, bạn có thể truy cập:
- **Admin Dashboard**: [http://localhost:9000/app](http://localhost:9000/app)
- **Store API**: [http://localhost:9000/store](http://localhost:9000/store)

**Thông tin Admin (mặc định):**
- Email: `thai@q-com.com`
- Password: `supersecret`

### Contribute
1. Commit các thay đổi với thông điệp rõ ràng.
2. Đẩy nhánh lên GitHub: `git push origin <branch-name>`.
3. Tạo Pull Request để được review.

## ☁️ Deployment
Dự án đã được cấu hình sẵn để deploy lên **Render** thông qua `Dockerfile` (Multi-stage build).

---
*Mọi thắc mắc hãy liên hệ trực tiếp với mình qua chat nhé!*

---

## 💳 Payment & Fulfillment Integration (New!)

Dự án đã được tích hợp đầy đủ các payment và fulfillment providers:

### Payment Providers
- ✅ **COD (Cash on Delivery)** - Thanh toán khi nhận hàng
- ✅ **ZaloPay** - Cổng thanh toán Việt Nam
- 📦 **Stripe** - Thẻ quốc tế (code sẵn sàng, cần setup)

### Fulfillment Provider
- ✅ **In-house Fulfillment** - Quản lý đội giao hàng nội bộ
  - Tracking number tự động
  - 7 trạng thái tracking
  - Real-time updates

### 📚 Tài Liệu Chi Tiết

Xem thư mục `docs/` để biết thêm chi tiết:

| Tài liệu | Mục đích |
|----------|----------|
| [QUICKSTART.md](./docs/QUICKSTART.md) | Hướng dẫn bắt đầu nhanh 5 phút |
| [BACKEND_INTEGRATION.md](./docs/BACKEND_INTEGRATION.md) | Tích hợp Backend (cho dev) |
| [CLIENT_INTEGRATION.md](./docs/CLIENT_INTEGRATION.md) | Tích hợp Frontend (cho dev) |
| [API_REFERENCE.md](./docs/API_REFERENCE.md) | Tài liệu API đầy đủ |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Hướng dẫn deploy production |
| [STRIPE_SETUP.md](./docs/STRIPE_SETUP.md) | Setup Stripe (tùy chọn) |

### 🔄 Luồng Giao Dịch

**COD Flow** (Đơn giản nhất):
```
Xem sản phẩm → Giỏ hàng → Chọn COD → Tạo đơn 
  → Giao hàng → Nhận tiền mặt → Xác nhận thanh toán → Hoàn tất
```

**Online Payment** (ZaloPay/Stripe):
```
Xem sản phẩm → Giỏ hàng → Chọn payment → Redirect
  → Thanh toán → Webhook → Xác nhận đơn → Giao hàng → Hoàn tất
```

### 🧪 Test Nhanh

```bash
# Test server
curl http://localhost:9000/health

# Test fulfillment tracking
curl http://localhost:9000/store/orders/order_xxx/fulfillments
```

**Bắt đầu với** `docs/QUICKSTART.md` để biết cách sử dụng! 🚀
