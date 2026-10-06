/* ── Best-effort keyless web search (DuckDuckGo HTML endpoint) ────────
 * No API key, no dependency: fetch the HTML results page and parse the
 * classic `result__a` / `result__snippet` markup. This is a scrape of a
 * third-party page — it can change or rate-limit at any moment, so every
 * caller must treat an empty result as "unavailable" and say so plainly
 * rather than inventing an answer. Never throws.
 */

import { validateUrl } from "@/lib/pageFetch";

const TIMEOUT_MS = 8_000;
const MAX_RESULTS = 5;

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* DuckDuckGo wraps outbound links in a redirect: /l/?uddg=<encoded url>. */
function resolveDdgHref(href: string): string {
  try {
    const u = new URL(href, "https://html.duckduckgo.com");
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
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; OrethaBot/1.0)",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: `q=${encodeURIComponent(q)}`,
    });
    if (!res.ok) return [];
    const html = await res.text();

    const results: SearchResult[] = [];
    // Each result block: <a class="result__a" href="…">Title</a> …
    // <a class="result__snippet" …>Snippet</a>
    const blockRe =
      /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|$)/g;
    let m: RegExpExecArray | null;
    while ((m = blockRe.exec(html)) !== null && results.length < MAX_RESULTS) {
      const url = resolveDdgHref(decode(m[1]));
      const title = decode(m[2]);
      const snippet = m[3] ? decode(m[3]) : "";
      if (!title || !url) continue;
      if (validateUrl(url)) continue; // skip non-http / private links
      results.push({ title, url, snippet: snippet.slice(0, 300) });
    }
    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
