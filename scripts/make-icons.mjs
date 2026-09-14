/* Rebuild all Oretha brand icons from the original logo screenshot.
 * Run: node scripts/make-icons.mjs
 *
 * The source (public/oretha-logo.jpg) is a 1170x2080 portrait phone
 * screenshot: a painted portrait inside a gold oval ring on a black field.
 *
 * WHY THIS EXISTS: earlier icon generations PADDED the portrait onto a
 * square canvas, and iOS composites any transparency onto WHITE — the home
 * screen showed a white tile with a small black rectangle floating in it.
 * The fix is FULL-BLEED: every icon is a square cover-crop of the portrait
 * itself (face + gold ring fill the tile edge to edge, photo pixels all the
 * way into the corners), fully opaque. No padding, no transparency, nothing
 * for iOS to composite onto white.
 *
 * public/oretha-mark.png is the one transparent asset: an elliptical alpha
 * cutout of the portrait, used in-app on the dark UI (no rectangle seam).
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { IOS_SPLASH_DEVICES, splashFile, splashFileLandscape } from "../src/lib/iosDevices.ts";

const SRC = "public/oretha-logo.jpg";
const BRIGHT = 40; // pixels brighter than this (any channel) are "portrait"

mkdirSync("public/icons", { recursive: true });

async function main() {
  const { data, info } = await sharp(SRC).raw().toBuffer({
    resolveWithObject: true,
  });
  const { width: W, height: H, channels: C } = info;

  // 1. Bounding box of the portrait (bright pixels on the black field).
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
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  console.log(`portrait bbox: ${bw}x${bh} at (${minX},${minY})`);

  // 2. Square cover-crop centered on the portrait. Side = bbox width, so
  //    the gold ring spans the full tile width and the face fills the tile.
  //    zoom > 1 crops tighter (maskable icons keep the face in the safe zone).
  const coverCrop = (zoom = 1) => {
    const side = Math.round(bw / zoom);
    const left = Math.round(Math.min(Math.max(cx - side / 2, 0), W - side));
    const top = Math.round(Math.min(Math.max(cy - side / 2, 0), H - side));
    return sharp(SRC).extract({ left, top, width: side, height: side });
  };

  // Full-bleed opaque icons for every standard OS slot.
  const makeIcon = async (size, zoom = 1) =>
    await coverCrop(zoom).resize(size, size).png().toBuffer();
  for (const s of [16, 32, 180, 192, 512]) {
    const out =
      s === 180
        ? "public/icons/apple-touch-icon.png"
        : `public/icons/icon-${s}.png`;
    await sharp(await makeIcon(s)).png().toFile(out);
  }
  // Maskable: face must sit inside the inner-80% safe circle → crop tighter.
  for (const s of [192, 512]) {
    await sharp(await makeIcon(s, 1.35)).png().toFile(`public/icons/oretha-icon-${s}.png`);
  }

  // 3. Transparent elliptical mark for in-app use: alpha 0 outside the
  //    ellipse fit to the portrait bbox (slightly oversized, so the gold
  //    ring stroke survives), photo pixels inside.
  const mw = Math.min(W, Math.round(bw * 1.02));
  const mh = Math.min(H, Math.round(bh * 1.02));
  const mLeft = Math.round(Math.min(Math.max(cx - mw / 2, 0), W - mw));
  const mTop = Math.round(Math.min(Math.max(cy - mh / 2, 0), H - mh));
  const mask = Buffer.from(
    `<svg width="${mw}" height="${mh}" xmlns="http://www.w3.org/2000/svg">` +
      `<ellipse cx="${mw / 2}" cy="${mh / 2}" rx="${mw / 2}" ry="${mh / 2}" fill="#fff"/></svg>`,
  );
  const mark = await sharp(SRC)
    .extract({ left: mLeft, top: mTop, width: mw, height: mh })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  await sharp(mark).resize(512, 512, { fit: "inside" }).png().toFile("public/oretha-mark.png");

  // 4. iOS launch screens: full-bleed brand-black canvas (#0a0a0b), elliptical
  //    mark centered at 22% of the short side (native launch-screen scale).
  mkdirSync("public/splash", { recursive: true });
  for (const d of IOS_SPLASH_DEVICES) {
    for (const [w, h, file] of [
      [d.pw, d.ph, splashFile(d)],
      [d.ph, d.pw, splashFileLandscape(d)],
    ]) {
      const markPx = Math.round(Math.min(w, h) * 0.22);
      const scaled = await sharp(mark)
        .resize(markPx, markPx, { fit: "inside" })
        .png()
        .toBuffer();
      await sharp({
        create: {
          width: w,
          height: h,
          channels: 4,
          background: { r: 10, g: 10, b: 11, alpha: 1 }, // brand canvas #0a0a0b
        },
      })
        .composite([{ input: scaled, gravity: "center" }])
        .png()
        .toFile(`public/splash/${file}`);
    }
  }
  console.log(
    `wrote public/splash/* (${IOS_SPLASH_DEVICES.length} devices x 2 orientations)`,
  );
  console.log("wrote public/oretha-mark.png (elliptical) + public/icons/* (full-bleed, opaque)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
