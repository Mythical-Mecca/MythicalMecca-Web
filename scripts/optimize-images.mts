/**
 * One-time/as-needed: convert the heavy hero PNGs in /public to WebP capped
 * at 2560px wide. Run with: npx tsx scripts/optimize-images.mts
 * Keeps the original PNGs; code references point at the .webp versions.
 */
import sharp from "sharp";
import { stat } from "node:fs/promises";
import path from "node:path";

const PUBLIC = path.join(process.cwd(), "public");
const TARGETS = [
  "MythicMechaBackground.png",
  "MythicMechaBackground2.png",
  "MythicMechaBackground3.png",
  "MythicMechaAuthBackground.png",
  "MMLandingPageBackground.png",
  "MM-LFG-Background.png",
  "MM-News&Events-BG.png",
];

for (const name of TARGETS) {
  const src = path.join(PUBLIC, name);
  const out = src.replace(/\.png$/, ".webp");
  const before = (await stat(src)).size;
  await sharp(src)
    .resize({ width: 2560, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(out);
  const after = (await stat(out)).size;
  console.log(
    `${name}: ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(2)}MB`
  );
}

console.log("done");
