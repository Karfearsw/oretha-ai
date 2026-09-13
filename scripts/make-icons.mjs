/* Rebuild all Oretha brand icons from the original logo screenshot.
 * Run: node scripts/make-icons.mjs
 *
 * The source (public/oretha-logo.jpg) is a 1170x2080 portrait phone
 * screenshot: a gold oval mark on a black field. Dropping that into
 * square icon slots letterboxes it — which showed up as white bands.
 * This script:
 *   1. finds the oval's bounding box (bright pixels on black),
 *   2. cuts it out onto a transparent square canvas (oretha-mark.png),
 *   3. renders every PWA / favicon / apple-touch size from that mark,
 *      plus black-background variants for opaque slots (oretha-icon*.png).
 * Committed outputs live in public/; re-run after replacing the source.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "public/oretha-logo.jpg";
const BRIGHT = 40; // pixels brighter than this (any channel) are "mark"

mkdirSync("public/icons", { recursive: true });

async function main() {
  const { data, info } = await sharp(SRC).raw().toBuffer({
    resolveWithObject: true,
  });
  const { width: W, height: H, channels: C } = info;

  // 1. Bounding box of bright (mark) pixels.
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C;
      if (data[i] > BRIGHT || data[i + 1] > BRIGHT || data[i + 2] > BRIGHT) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  console.log(`mark bbox: ${bw}x${bh} at (${minX},${minY})`);

  // 2. Extract the mark, keep it as its own image.
  const mark = await sharp(SRC)
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .png()
    .toBuffer();

  // Fit the mark into a square canvas with 8% breathing room.
  const S = Math.max(bw, bh);
  const canvas = Math.round(S * 1.16);
  const markPng = await sharp(mark)
    .resize({ width: S, height: S, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const transparentSquare = await sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: markPng, gravity: "center" }])
    .png()
    .toBuffer();

  // 512px master is plenty — the mark renders at ≤96px in-app.
  await sharp(transparentSquare).resize(512, 512).png().toFile("public/oretha-mark.png");

  // 3. Render every icon size.
  const transparentSizes = [16, 32, 180, 192, 512];
  for (const s of transparentSizes) {
    await sharp(transparentSquare)
      .resize(s, s)
      .png()
      .toFile(s === 180 ? "public/icons/apple-touch-icon.png" : `public/icons/icon-${s}.png`);
  }

  // Opaque black-background variants for slots that hate transparency.
  for (const s of [192, 512]) {
    await sharp({
      create: {
        width: s,
        height: s,
        channels: 4,
        background: { r: 10, g: 10, b: 11, alpha: 1 }, // --color-canvas
      },
    })
      .composite([
        {
          input: await sharp(transparentSquare).resize(Math.round(s * 0.82)).toBuffer(),
          gravity: "center",
        },
      ])
      .png()
      .toFile(`public/icons/oretha-icon-${s}.png`);
  }

  console.log("wrote public/oretha-mark.png + public/icons/*");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
