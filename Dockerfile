# Dockerfile - 构建 Node.js 项目
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
COPY package-lock.json ./

# 安装依赖
RUN npm ci --production=false

# 复制源码
COPY . .

# 构建项目（如果需要）
RUN npm run build 2>/dev/null || true

# 运行阶段
FROM node:20-alpine

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# 从构建阶段复制文件
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/*.js ./
COPY --from=builder /app/*.json ./

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 7788

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:7788/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "index.js"]
