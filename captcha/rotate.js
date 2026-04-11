const cv = require("@techstark/opencv-js");
const { createCanvas, loadImage } = require("canvas");

class RotateCaptchaService {
  static instance = null;

  constructor() {}

  static getInstance() {
    if (!RotateCaptchaService.instance) {
      RotateCaptchaService.instance = new RotateCaptchaService();
    }
    return RotateCaptchaService.instance;
  }

  async base64ToMat(base64) {
    const img = await loadImage(base64);

    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    const mat = new cv.Mat(img.height, img.width, cv.CV_8UC4);

    mat.data.set(imageData.data);

    return mat;
  }

  toGray(mat) {
    const gray = new cv.Mat();

    if (mat.channels() === 4) {
      cv.cvtColor(mat, gray, cv.COLOR_BGRA2GRAY);
    } else {
      cv.cvtColor(mat, gray, cv.COLOR_BGR2GRAY);
    }

    return gray;
  }

  rotateMat(mat, angle) {
    const center = new cv.Point(mat.cols / 2, mat.rows / 2);
    const M = cv.getRotationMatrix2D(center, angle, 1);

    const dst = new cv.Mat();
    const size = new cv.Size(mat.cols, mat.rows);

    cv.warpAffine(mat, dst, M, size, cv.INTER_LINEAR, cv.BORDER_REPLICATE);

    M.delete();
    return dst;
  }

  matchScore = (bg, tpl) => {
    const result = new cv.Mat();
    cv.matchTemplate(bg, tpl, result, cv.TM_CCOEFF_NORMED);

    const minMax = cv.minMaxLoc(result);
    result.delete();

    return minMax.maxVal;
  };

  async main(bgBase64, thumbBase64) {
    const bg = await this.base64ToMat(bgBase64);
    const thumb = await this.base64ToMat(thumbBase64);

    if (!bg || !thumb) {
      if (bg) bg.delete();
      if (thumb) thumb.delete();

      throw new Error("图像加载失败");
    }

    const grayBg = this.toGray(bg);
    const grayThumb = this.toGray(thumb);

    const h = thumb.rows;
    const w = thumb.cols;

    const y1 = Math.floor((bg.rows - h) / 2);
    const x1 = Math.floor((bg.cols - w) / 2);

    const roi = grayBg.roi(new cv.Rect(x1, y1, w, h));

    let bestAngle = 0;
    let maxScore = -1;

    // 🟡 粗算
    for (let angle = 0; angle < 360; angle += 5) {
      const rotated = this.rotateMat(grayThumb, angle);
      const score = this.matchScore(roi, rotated);

      if (score > maxScore) {
        maxScore = score;
        bestAngle = angle;
      }

      rotated.delete();
    }

    // 🟢 精算
    for (let angle = bestAngle - 5; angle <= bestAngle + 5; angle++) {
      const rotated = this.rotateMat(grayThumb, angle);
      const score = this.matchScore(roi, rotated);

      if (score > maxScore) {
        maxScore = score;
        bestAngle = angle;
      }

      rotated.delete();
    }

    // 清理内存
    bg.delete();
    thumb.delete();
    grayBg.delete();
    grayThumb.delete();
    roi.delete();

    return (bestAngle + 360) % 360;
  }
}

const rotateCaptchaService = RotateCaptchaService.getInstance();

module.exports = {
  rotateCaptchaService,
};
