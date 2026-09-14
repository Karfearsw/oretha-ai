/* ── iOS splash-screen device table (single source of truth) ──────────
 * Consumed by:
 *   - scripts/make-icons.mjs  → renders public/splash/*.png at physical size
 *   - src/app/layout.tsx      → emits apple-touch-startup-image <link>s
 *
 * iOS web-app launch screens only appear when a link's media query EXACTLY
 * matches the device: device-width/height are CSS points, the image must be
 * at physical pixels (points × DPR), one file per orientation. New iPhone
 * models need a row added here + `node scripts/make-icons.mjs` + redeploy.
 */

export interface IosSplashDevice {
  /** CSS points, portrait width (device-width in the media query) */
  dpw: number;
  /** CSS points, portrait height (device-height in the media query) */
  dph: number;
  /** device pixel ratio for the media query */
  dpr: 2 | 3;
  /** physical pixels, portrait width — the rendered PNG size */
  pw: number;
  /** physical pixels, portrait height — the rendered PNG size */
  ph: number;
  name: string;
}

export const IOS_SPLASH_DEVICES: IosSplashDevice[] = [
  { name: "iPhone SE 1st gen", dpw: 320, dph: 568, dpr: 2, pw: 640, ph: 1136 },
  { name: "iPhone 8 / SE 2-3", dpw: 375, dph: 667, dpr: 2, pw: 750, ph: 1334 },
  { name: "iPhone 8 Plus", dpw: 414, dph: 736, dpr: 3, pw: 1242, ph: 2208 },
  { name: "iPhone X / XS / 11 Pro / 12-13 mini", dpw: 375, dph: 812, dpr: 3, pw: 1125, ph: 2436 },
  { name: "iPhone XR / 11", dpw: 414, dph: 896, dpr: 2, pw: 828, ph: 1792 },
  { name: "iPhone XS Max / 11 Pro Max", dpw: 414, dph: 896, dpr: 3, pw: 1242, ph: 2688 },
  { name: "iPhone 12-14 / 12-13 Pro", dpw: 390, dph: 844, dpr: 3, pw: 1170, ph: 2532 },
  { name: "iPhone XS Max / 12-14 Pro Max / Plus", dpw: 428, dph: 926, dpr: 3, pw: 1284, ph: 2778 },
  { name: "iPhone 14-16 Pro / 16e / 17", dpw: 393, dph: 852, dpr: 3, pw: 1179, ph: 2556 },
  { name: "iPhone 15-16 Plus / Pro Max", dpw: 430, dph: 932, dpr: 3, pw: 1290, ph: 2796 },
  { name: "iPhone 17 / Air", dpw: 402, dph: 874, dpr: 3, pw: 1206, ph: 2622 },
  { name: "iPad 9 / 10.2\"", dpw: 810, dph: 1080, dpr: 2, pw: 1620, ph: 2160 },
  { name: "iPad mini 6", dpw: 744, dph: 1133, dpr: 2, pw: 1488, ph: 2266 },
  { name: "iPad Air 4-5 / 10.9\"", dpw: 820, dph: 1180, dpr: 2, pw: 1640, ph: 2360 },
  { name: "iPad Pro 11\" (1st-2nd)", dpw: 834, dph: 1194, dpr: 2, pw: 1668, ph: 2388 },
  { name: "iPad Pro 11\" (3rd+) / Air 6", dpw: 834, dph: 1210, dpr: 2, pw: 1668, ph: 2420 },
  { name: "iPad 7-8 / 10.2\"", dpw: 768, dph: 1024, dpr: 2, pw: 1536, ph: 2048 },
  { name: "iPad Pro 12.9\" (3rd+)", dpw: 1024, dph: 1366, dpr: 2, pw: 2048, ph: 2732 },
  { name: "iPad Pro 13\" (M4)", dpw: 1032, dph: 1376, dpr: 2, pw: 2064, ph: 2752 },
];

/** filename stem for a portrait splash image */
export const splashFile = (d: IosSplashDevice) =>
  `apple-splash-${d.pw}x${d.ph}.png`;

/** filename stem for a landscape splash image (dimensions swapped) */
export const splashFileLandscape = (d: IosSplashDevice) =>
  `apple-splash-${d.ph}x${d.pw}.png`;

/** exact iOS media query for one orientation */
export const splashMedia = (d: IosSplashDevice, orientation: "portrait" | "landscape") =>
  `screen and (device-width: ${d.dpw}px) and (device-height: ${d.dph}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: ${orientation})`;
