/* ── Best-effort keyless web search (DuckDuckGo lite) ──────────────────
 * No API key, no dependency. Probed from this network (2026-10-06):
 *   html.duckduckgo.com POST → 403 (bot UA and browser UA alike)
 *   lite.duckduckgo.com GET  → 200 with a browser User-Agent (bot UA 403)
 *   Brave → 429, Mojeek → captcha, searx.be → browser check, Bing → works
 *   but its markup is heavier; DDG lite was chosen for stable, simple HTML.
 *
 * GET `https://lite.duckduckgo.com/lite/?q=…`, parse `result-link` anchors
 * and `result-snippet` cells, unwrap DDG's `/l/?uddg=` redirects. This is a
 * scrape of a third-party page — it can change or rate-limit at any moment,
 * so an empty result set is reported as `[]` and every caller must treat
 * that as "unavailable" and say so plainly rather than inventing an answer.
 * Never throws.
 */

import { validateUrl } from "@/lib/pageFetch";

const TIMEOUT_MS = 8_000;
const MAX_RESULTS = 5;

/* DDG 403s non-browser agents even on lite — this must stay a browser UA. */
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, "") // lite wraps matches in <b>
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* Outbound links are wrapped: //duckduckgo.com/l/?uddg=<encoded url>. */
function resolveDdgHref(href: string): string {
  try {
    const u = new URL(href, "https://duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    return u.toString();
  } catch {
    return href;
  }
}

/**
 * Run a web search. Returns `[]` on any failure (blocked, rate-limited,
 * markup change) — callers must report unavailability honestly.
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  const q = query.trim().slice(0, 200);
  if (!q) return [];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`,
      {
        method: "GET",
        signal: ctrl.signal,
        headers: {
          "user-agent": BROWSER_UA,
          accept: "text/html,application/xhtml+xml",
        },
      },
    );
    if (!res.ok) return [];
    const html = await res.text();

    const results: SearchResult[] = [];
    const linkRe = /<a\b[^>]*class=['"]result-link['"][^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(html)) !== null && results.length < MAX_RESULTS) {
      const tag = m[0];
      const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
      const end = html.indexOf("</a>", tag.length + m.index);
      const titleRaw =
        end === -1 ? "" : html.slice(m.index + tag.length, end);
      const after = html.slice(end === -1 ? linkRe.lastIndex : end + 4);
      const snippetRaw = after.match(
        /<td\b[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/i,
      )?.[1];

      const title = decode(titleRaw || "");
      const url = href ? resolveDdgHref(href) : "";
      if (!title || !url || validateUrl(url)) continue; // skip non-http/private
      results.push({
        title: title.slice(0, 200),
        url,
        snippet: decode(snippetRaw || "").slice(0, 300),
      });
    }
    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
