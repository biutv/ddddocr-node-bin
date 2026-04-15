# Dockerfile - 支持 ARM64/AMD64 双架构
FROM node:20-slim AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
COPY package-lock.json ./

# 安装依赖
RUN npm ci --production=false

# 复制源码
COPY . .

# 运行阶段 - 使用 Debian slim 镜像（兼容 glibc）
FROM node:20-slim

# 安装运行时依赖（ONNX Runtime 需要）
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 从构建阶段复制整个项目
COPY --from=builder /app ./

# 创建非 root 用户
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

# 暴露端口
EXPOSE 7788

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:7788/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动服务
CMD ["node", "index.js"]
