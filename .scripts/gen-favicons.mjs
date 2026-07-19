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

// source logo has ~8% empty margin baked in around the rounded-square card,
// making the glyph read smaller than other apps' icons at the same taskbar size —
// crop that margin off before resizing so the art fills the full icon canvas
const meta = await sharp(src).metadata();
const cropPct = 0.08;
const cropPx = Math.round(Math.min(meta.width, meta.height) * cropPct);
const cropped = sharp(src).extract({
  left: cropPx,
  top: cropPx,
  width: meta.width - cropPx * 2,
  height: meta.height - cropPx * 2,
});

for (const [file, size] of targets) {
  await cropped.clone().resize(size, size).png().toFile(path.join(root, file));
  console.log(`wrote ${file} (${size}x${size})`);
}
