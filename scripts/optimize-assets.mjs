import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const extPattern = /\.(png|jpe?g|webp)$/i;

const dirs = {
  backgroundsSrc: path.join(root, "Root BG"),
  portraitsSrcA: path.join(root, "Base Root"),
  portraitsSrcB: path.join(root, "Travelers & Outsiders"),
  backgroundsHigh: path.join(root, "assets-optimized", "backgrounds"),
  backgroundsLow: path.join(root, "assets-optimized", "backgrounds-low"),
  portraitsWebp: path.join(root, "assets-optimized", "portraits-webp"),
  portraitsLow: path.join(root, "assets-optimized", "portraits-low"),
  portraitsSvg: path.join(root, "assets-optimized", "portraits-svg")
};

const toBaseName = (fileName) => fileName.replace(/\.[^/.]+$/, "");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function listImageFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && extPattern.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

function buildSvgWithEmbeddedWebp(width, height, webpBuffer) {
  const base64 = webpBuffer.toString("base64");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">\n  <image width="${width}" height="${height}" href="data:image/webp;base64,${base64}"/>\n</svg>\n`;
}

async function optimizeBackgrounds() {
  await ensureDir(dirs.backgroundsHigh);
  await ensureDir(dirs.backgroundsLow);

  const files = await listImageFiles(dirs.backgroundsSrc);
  for (const fileName of files) {
    const srcPath = path.join(dirs.backgroundsSrc, fileName);
    const baseName = toBaseName(fileName);
    const outHigh = path.join(dirs.backgroundsHigh, `${baseName}.webp`);
    const outLow = path.join(dirs.backgroundsLow, `${baseName}.webp`);

    const image = sharp(srcPath).rotate();
    const meta = await image.metadata();
    const highWidth = Math.min(meta.width || 1280, 1280);

    await image
      .clone()
      .resize({ width: highWidth, withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(outHigh);

    await image
      .clone()
      .resize({ width: 56, withoutEnlargement: true })
      .blur(0.4)
      .webp({ quality: 58, effort: 4 })
      .toFile(outLow);
  }

  return files.length;
}

async function optimizePortraits() {
  await ensureDir(dirs.portraitsWebp);
  await ensureDir(dirs.portraitsLow);
  await ensureDir(dirs.portraitsSvg);

  const filesA = await listImageFiles(dirs.portraitsSrcA);
  const filesB = await listImageFiles(dirs.portraitsSrcB);
  const all = [
    ...filesA.map((name) => ({ srcDir: dirs.portraitsSrcA, name })),
    ...filesB.map((name) => ({ srcDir: dirs.portraitsSrcB, name }))
  ];

  for (const item of all) {
    const srcPath = path.join(item.srcDir, item.name);
    const baseName = toBaseName(item.name);
    const outWebp = path.join(dirs.portraitsWebp, `${baseName}.webp`);
    const outLow = path.join(dirs.portraitsLow, `${baseName}.webp`);
    const outSvg = path.join(dirs.portraitsSvg, `${baseName}.svg`);

    const image = sharp(srcPath).rotate();
    const meta = await image.metadata();
    const highWidth = Math.min(meta.width || 960, 960);

    await image
      .clone()
      .resize({ width: highWidth, withoutEnlargement: true })
      .webp({ quality: 83, effort: 5 })
      .toFile(outWebp);

    await image
      .clone()
      .resize({ width: 72, withoutEnlargement: true })
      .blur(0.6)
      .webp({ quality: 56, effort: 4 })
      .toFile(outLow);

    const webpBuffer = await fs.readFile(outWebp);
    const outMeta = await sharp(webpBuffer).metadata();
    const width = outMeta.width || highWidth;
    const height = outMeta.height || meta.height || highWidth;

    const svg = buildSvgWithEmbeddedWebp(width, height, webpBuffer);
    await fs.writeFile(outSvg, svg, "utf8");
  }

  return all.length;
}

async function main() {
  const backgrounds = await optimizeBackgrounds();
  const portraits = await optimizePortraits();

  console.log(`Optimized backgrounds: ${backgrounds}`);
  console.log(`Optimized portraits (webp + low + svg): ${portraits}`);
  console.log(`Output folder: ${path.join(root, "assets-optimized")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
