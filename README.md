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
