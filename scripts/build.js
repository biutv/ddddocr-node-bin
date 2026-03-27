const fs = require("fs");
const path = require("path");
const { exec } = require("@yao-pkg/pkg");

const NODE_VERSION = "20";
const DIST_DIR = path.resolve(__dirname, "../dist");

const platforms = [
  { platform: "macos", arch: ["x64", "arm64"] },
  { platform: "win", arch: ["x64", "arm64"] },
  { platform: "linux", arch: ["x64", "arm64"] },
];

/**
 * 构建单个目标
 */
const buildOne = async (platform, arch) => {
  const ext = platform === "win" ? ".exe" : "";
  
  const target = `node${NODE_VERSION}-${platform}-${arch}`;
  const output = `ocr-bin-${platform}-${arch}${ext}`;
  const outputPath = path.join(DIST_DIR, output);

  console.log(`\n🚀 Building: ${target}`);
  console.log(`📦 Output: ${outputPath}`);

  await exec([
    "./index.js",
    "--config", "package.json",
    "--target", target,
    "--output", outputPath,
    "--options", "max-old-space-size=8192",
    "--compress", "Gzip", // Gzip Brotli(so slow)
  ]);
  
  console.log(`✅ Done: ${outputPath}`);
};

/**
 * 构建入口
 */
const main = async () => {
  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

  try {
    for (const p of platforms) {
      for (const arch of p.arch) {
        await buildOne(p.platform, arch);
      }
    }

    console.log("\n🎉 All builds completed!");
  } catch (err) {
    console.error("\n❌ Build failed:", err);
    process.exit(1);
  }
};

main();