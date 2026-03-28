# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Pre-install pnpm to avoid downloading it at runtime on Render
RUN corepack enable pnpm && corepack prepare pnpm@10.30.3 --activate

# Cài đặt công cụ build cần thiết cho các package native (như sharp/vips)
RUN apk add --no-cache python3 make g++ vips-dev

# Copy các file quản lý dependency
COPY package.json pnpm-lock.yaml ./

# Cài đặt dependency
RUN pnpm install --frozen-lockfile
RUN pnpm approve-builds

# Copy toàn bộ code vào
COPY . .

# Build dự án Medusa
RUN pnpm run build

# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Render yêu cầu thư viện hệ thống cho xử lý ảnh
RUN apk add --no-cache vips-dev

# Pre-install pnpm for runner stage as well
RUN corepack enable pnpm && corepack prepare pnpm@10.30.3 --activate

# Chỉ copy những thứ cần thiết từ builder để giữ image nhẹ
COPY --from=builder /app /app

EXPOSE 9000

# Khởi chạy: Chạy migrate DB trước, sau đó start server
# Tăng cường khả năng kết nối DB bằng cách đảm bảo cấu hình chính xác
CMD ["sh", "-c", "pnpm exec medusa db:migrate && pnpm exec medusa start"]
