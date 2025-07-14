const express = require('express');
const { DdddOcr } = require('ddddocr-node');
const bodyParser = require('body-parser');
const fs= require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const app = express();
const port = 7788;
var ocr = null;

console.log(process.cwd(), __dirname, process.execPath)

// https://github.com/yao-pkg/pkg?tab=readme-ov-file#error-cannot-execute-binaray-from-snapshot
const fixOcr = async () => {
    const ocrOnnxBasePath = path.join(__dirname, 'node_modules/ddddocr-node/onnx');

    const ocrOnnxDir = fs.readdirSync(ocrOnnxBasePath);
    console.log('模型文件: ', ocrOnnxDir.join(', '));
    
    for (const bin of ocrOnnxDir) {
        const fileName = path.basename(bin);
        const oldPath = path.join(ocrOnnxBasePath, bin);
        const file = fs.createWriteStream(fileName);
        await pipeline(fs.createReadStream(oldPath), file);
        fs.chmodSync(fileName, 0o755);

        const tmpTxt = fs.readFileSync(fileName, 'utf-8').slice(0, 10);
        if (!tmpTxt) throw new Error(`模型文件 ${fileName} 修复失败`);
    }
    console.log('模型文件修复完成');

    ocr = new DdddOcr();
    ocr.setRanges(0);
}

(async () => {
    await fixOcr();
})();


// 设置中间件 - 使用JSON解析
app.use(bodyParser.json());
// 处理POST请求 - 接收JSON格式 {'data': 'base64字符串'}
app.post('/ocr', async (req, res) => {
    try {
        const base64Data = req.body.data;
        if (!base64Data) {
            return res.status(400).send({status: -1, msg: '缺少data字段'});
        }
        
        // 使用OCR识别
        const result = await ocr.classification('data:image/jpg;base64,' + base64Data);
        console.log('识别结果:', result);
        
        // 返回结果
        res.send({ status: 0, code: result, msg: 'success' });
    } catch (error) {
        console.error('OCR识别错误:', error);
        res.status(500).send({ status: -1, msg: '识别失败: ' + error.message });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`OCR服务器已启动，监听端口: ${port}`);
    console.log(`使用方式: POST请求 http://127.0.0.1:${port}/ocr`);
    console.log(`请求体格式: {"data": "图片base64数据"}`);
}); 