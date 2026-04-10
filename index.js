const express = require('express');
const { DdddOcr } = require('ddddocr-node');
const path = require('path');
const os = require('os');

process.on('uncaughtException', (err) => {
    console.error('[SYSTEM] 未捕获异常:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('[SYSTEM] Promise异常:', err);
});

const getEnvNumber = (val, def) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : def;
};

const PORT = getEnvNumber(process.env.PORT, 7788);
const OCR_MODE = getEnvNumber(process.env.OCR_MODE, 0); // 0-1
const OCR_RANGE = getEnvNumber(process.env.OCR_RANGE, 6); // 0-7
const OCR_CHARSET = OCR_RANGE === 7 ? (process.env.OCR_CHARSET || '0123456789+-x/=') : undefined; // 字符集

const app = express();
let ocrInstance = null;

const isPkg = (process?.pkg?.entrypoint ?? '').includes('snapshot');
console.log(`[INFO] 运行环境: ${os.platform()}${isPkg ? '打包环境' : '开发环境'}`);

const initOcr = async () => {
    const ocrOnnxPath = path.join(__dirname, 'node_modules/ddddocr-node/onnx/');
    console.log(`[OCR] 配置 - 模型: ${OCR_MODE}, 范围: ${OCR_RANGE}${OCR_RANGE === 7 ? `(自定义字符集: ${OCR_CHARSET})` : ''}, 模型路径: ${ocrOnnxPath}`);

    const ocr = new DdddOcr();
    ocr.setPath(ocrOnnxPath); // ONNX模型根路径
    ocr.setOcrMode(OCR_MODE); // 模型 beta
    ocr.setRanges(OCR_RANGE === 7 ? OCR_CHARSET : OCR_RANGE); // 范围 0-6 或 自定义字符集

    return ocr;
}


const bootstrap = async () => {
    try {
        ocrInstance = await initOcr();
        if (!ocrInstance) {
            throw new Error('实例初始化失败');
        }

        app.use(express.json({ limit: '10mb' })); // max 10MB

        app.post('/ocr', async (req, res) => {
            try {
                let { data } = req.body || {};

                if (!data) {
                    return res.status(400).json({ status: -1,  msg: '缺少 data 字段' });
                }

                if (!data.includes('base64,')) {
                    data = `data:image/png;base64,${data}`
                }
                
                const result = await ocrInstance.classification(data);
                console.debug('[OCR] 识别结果:', result);
                
                res.send({ status: 0, code: result, msg: 'success' });
            } catch (err) {
                console.error('[OCR] 识别错误:', err);
                res.status(500).send({ status: -1, msg: err.message || '识别失败' });
            }
        });

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`[OCR] 请求地址: http://127.0.0.1:${PORT}/ocr`);
            console.log(`[OCR] 使用方式: POST`);
            console.log(`[OCR] 请求载体: {"data": "图片base64数据"}`);
        });
    } catch (err) {
        console.error('[SYSTEM] 启动失败:', err);
        process.exit(1);
    }
}

bootstrap();
