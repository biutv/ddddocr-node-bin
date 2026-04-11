/**
 * 检查是否为 HTTP(S) 链接
 */
const isHttp = (str) => typeof str === "string" && /^https?:\/\//i.test(str);

/**
 * 检查是否为图片 MIME 类型
 */
const isImageMime = (str) =>
  typeof str === "string" && str.toLowerCase().startsWith("image/");

/**
 * 检查是否为合法的 Node.js 文件缓冲区对象
 */
const isFile = (obj) => !!(obj && obj.mimetype && Buffer.isBuffer(obj.buffer));

module.exports = {
  isHttp,
  isImageMime,
  isFile,
};
