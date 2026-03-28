# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Cài đặt công cụ build cần thiết cho các package native (như sharp/vips)
RUN apk add --no-cache python3 make g++ vips-dev

# Bật pnpm
RUN corepack enable pnpm

# Copy các file quản lý dependency
COPY package.json pnpm-lock.yaml ./

# Cài đặt dependency
RUN pnpm install --frozen-lockfile

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
RUN corepack enable pnpm

# Chỉ copy những thứ cần thiết từ builder để giữ image nhẹ
COPY --from=builder /app /app

EXPOSE 9000

# Khởi chạy: Chạy migrate DB trước, sau đó start server
# Lưu ý: Render cần PORT 9000
CMD ["sh", "-c", "pnpm exec medusa db:migrate && pnpm run start"]
