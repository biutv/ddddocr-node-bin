# Dockerfile - 多架构自动检测版
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

# 复制所有架构的二进制文件
COPY ocr-bin-linux-amd64 /app/
COPY ocr-bin-linux-arm64 /app/
# 如果你的文件名是 x64/arm64，取消下面两行的注释，并注释掉上面两行
# COPY ocr-bin-linux-x64 /app/
# COPY ocr-bin-linux-arm64 /app/

# 创建智能启动脚本，根据宿主机架构自动选择
RUN cat > /app/start.sh << 'EOF'
#!/bin/sh

ARCH=$(uname -m)
PORT=${PORT:-7788}
OCR_MODE=${OCR_MODE:-0}
OCR_RANGE=${OCR_RANGE:-6}
OCR_CHARSET=${OCR_CHARSET:-0123456789+-x/=}

export PORT OCR_MODE OCR_RANGE OCR_CHARSET

case "$ARCH" in
    x86_64|amd64)
        if [ -f /app/ocr-bin-linux-amd64 ]; then
            exec /app/ocr-bin-linux-amd64
        elif [ -f /app/ocr-bin-linux-x64 ]; then
            exec /app/ocr-bin-linux-x64
        else
            echo "No binary found for x86_64"
            exit 1
        fi
        ;;
    aarch64|arm64)
        if [ -f /app/ocr-bin-linux-arm64 ]; then
            exec /app/ocr-bin-linux-arm64
        else
            echo "No binary found for arm64"
            exit 1
        fi
        ;;
    *)
        echo "Unsupported architecture: $ARCH"
        exit 1
        ;;
esac
EOF

RUN chmod +x /app/start.sh && chmod +x /app/ocr-bin-linux-* 2>/dev/null || true

# 创建非 root 用户运行，提升安全性
RUN addgroup -g 1001 -S ocr && \
    adduser -S ocr -u 1001 && \
    chown -R ocr:ocr /app

USER ocr

EXPOSE 7788

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:7788/health || exit 1

ENTRYPOINT ["/app/start.sh"]
