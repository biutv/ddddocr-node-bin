# Dockerfile - 支持多架构自动检测
FROM alpine:latest

# 安装运行时依赖
RUN apk add --no-cache \
    ca-certificates \
    libc6-compat \
    libgcc \
    libstdc++ \
    wget \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# 复制所有 Linux 架构的二进制文件
# 根据您提供的文件命名规则
COPY ocr-bin-linux-amd64 /app/
COPY ocr-bin-linux-arm64 /app/
COPY ocr-bin-linux-x64 /app/  # 如果有 x64 版本
COPY ocr-bin-linux-armv7 /app/ # 如果有 armv7 版本

# 创建智能启动脚本
RUN cat > /app/start.sh << 'EOF'
#!/bin/sh

# 检测系统架构
ARCH=$(uname -m)

# 设置默认值
PORT=${PORT:-7788}
OCR_MODE=${OCR_MODE:-0}
OCR_RANGE=${OCR_RANGE:-6}
OCR_CHARSET=${OCR_CHARSET:-0123456789+-x/=}

# 导出环境变量
export PORT OCR_MODE OCR_RANGE OCR_CHARSET

# 根据架构选择对应的二进制文件
case "$ARCH" in
    x86_64|amd64)
        if [ -f /app/ocr-bin-linux-amd64 ]; then
            exec /app/ocr-bin-linux-amd64
        elif [ -f /app/ocr-bin-linux-x64 ]; then
            exec /app/ocr-bin-linux-x64
        else
            echo "No binary found for x86_64 architecture"
            exit 1
        fi
        ;;
    aarch64|arm64)
        if [ -f /app/ocr-bin-linux-arm64 ]; then
            exec /app/ocr-bin-linux-arm64
        else
            echo "No binary found for arm64 architecture"
            exit 1
        fi
        ;;
    armv7l)
        if [ -f /app/ocr-bin-linux-armv7 ]; then
            exec /app/ocr-bin-linux-armv7
        else
            echo "No binary found for armv7 architecture"
            exit 1
        fi
        ;;
    *)
        echo "Unsupported architecture: $ARCH"
        exit 1
        ;;
esac
EOF

# 设置执行权限
RUN chmod +x /app/start.sh && \
    chmod +x /app/ocr-bin-linux-* 2>/dev/null || true

# 创建非 root 用户
RUN addgroup -g 1001 -S ocr && \
    adduser -S ocr -u 1001 && \
    chown -R ocr:ocr /app

USER ocr

EXPOSE 7788

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:7788/health || exit 1

ENTRYPOINT ["/app/start.sh"]
