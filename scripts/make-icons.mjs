/* Rebuild all Oretha brand icons from the original logo screenshot.
 * Run: node scripts/make-icons.mjs
 *
 * The source (public/oretha-logo.jpg) is a 1170x2080 portrait phone
 * screenshot: a gold oval mark on a black field.
 *
 * WHY THIS EXISTS: OS icon slots (iOS apple-touch, Android manifest "any",
 * favicons on some surfaces) composite TRANSPARENT pixels onto WHITE. The
 * previous generation shipped transparent-corner icons, which showed up as
 * white surrounds on the home screen. This script guarantees:
 *   - every icon file is fully OPAQUE (min alpha 255),
 *   - the canvas is filled with the SOURCE'S OWN field color (sampled from
 *     the screenshot corners), so padding is invisible — the portrait
 *     appears to float on the same black, edge to edge, never white.
 * Only public/oretha-mark.png stays transparent (it's used in-app on the
 * dark UI, where transparency is correct).
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

  // 1. Sample the field color from the four corners (5px inset, averaged).
  const sample = (x, y) => {
    const i = (y * W + x) * C;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const corners = [
    sample(5, 5),
    sample(W - 6, 5),
    sample(5, H - 6),
    sample(W - 6, H - 6),
  ];
  const field = [0, 1, 2].map((c) =>
    Math.round(corners.reduce((s, cc) => s + cc[c], 0) / corners.length)
  );
  console.log(`field color: rgb(${field.join(",")})`);

  // 2. Bounding box of bright (mark) pixels.
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

  // 3. Extract the mark on its original field, opaque.
  const mark = await sharp(SRC)
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .png()
    .toBuffer();

  // Transparent master for in-app use only (welcome splash, headers).
  const S = Math.max(bw, bh);
  const transparentSquare = await sharp({
    create: {
      width: Math.round(S * 1.16),
      height: Math.round(S * 1.16),
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(mark)
          .resize(S, S, { fit: "inside" })
          .toBuffer(),
        gravity: "center",
      },
    ])
    .png()
    .toBuffer();
  await sharp(transparentSquare).resize(512, 512).png().toFile("public/oretha-mark.png");

  // 4. Opaque icon factory: field-color canvas, mark scaled in at `ratio`
  //    of the tile (ratio includes the ~8% breathing room).
  const opaqueIcon = async (size, markRatio) => {
    const markSize = Math.round(size * markRatio);
    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: field[0], g: field[1], b: field[2], alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp(mark)
            .resize(markSize, markSize, { fit: "inside" })
            .png()
            .toBuffer(),
          gravity: "center",
        },
      ])
      .png()
      .toBuffer();
  };

  // Standard slots: portrait fills ~86% of the tile (its ~1.16 aspect keeps
  // it visually large); canvas is edge-to-edge field color — zero alpha.
  const standardRatio = 1 / 1.16; // ≈ 0.862
  for (const s of [16, 32, 180, 192, 512]) {
    await sharp(await opaqueIcon(s, standardRatio))
      .toFile(
        s === 180
          ? "public/icons/apple-touch-icon.png"
          : `public/icons/icon-${s}.png`
      );
  }

  // Maskable slots: the mark must sit inside the safe zone (inner 80%
  // circle), so it renders at ~0.72 of the tile. Still fully opaque.
  for (const s of [192, 512]) {
    await sharp(await opaqueIcon(s, 0.72))
      .toFile(`public/icons/oretha-icon-${s}.png`);
  }

  console.log("wrote public/oretha-mark.png (transparent) + public/icons/* (all opaque)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
