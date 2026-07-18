import sharp from "sharp";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "src/assets/logo.png");

const targets = [
  ["public/favicon-16.png", 16],
  ["public/favicon-32.png", 32],
  ["public/apple-touch-icon.png", 180],
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
];

for (const [file, size] of targets) {
  await sharp(src).resize(size, size).png().toFile(path.join(root, file));
  console.log(`wrote ${file} (${size}x${size})`);
}
