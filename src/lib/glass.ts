/**
 * Liquid glass preference — ported from the Muse Dash (`prefs.glass`).
 * Stored in localStorage, applied as `body.no-glass`. Default is ON.
 * The inline script in the root layout reads the same key before first
 * paint so the page never flashes glass on for a user who turned it off.
 */

export const GLASS_STORAGE_KEY = "oretha-glass";

/** True unless the user explicitly turned glass off. */
export function readGlassPreference(): boolean {
  try {
    return window.localStorage.getItem(GLASS_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

/** Persist the choice and apply it to the document body. */
export function applyGlassPreference(on: boolean): void {
  try {
    window.localStorage.setItem(GLASS_STORAGE_KEY, on ? "true" : "false");
  } catch {
    /* storage unavailable — still apply for this session */
  }
  document.body.classList.toggle("no-glass", !on);
}

/**
 * Inline init script (runs in <head> order, before first paint).
 * Mirrors readGlassPreference + the reduced-transparency media query:
 * if glass is off or the OS asks for reduced transparency, the body
 * starts with `no-glass` so there is no flash of frost.
 */
export const GLASS_INIT_SCRIPT = `(function(){try{var off=localStorage.getItem('${GLASS_STORAGE_KEY}')==='false'||window.matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)').matches;if(off)document.body.classList.add('no-glass');}catch(e){}})();`;
