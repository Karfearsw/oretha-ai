/* ── Safe page fetch + HTML→text (shared by chat tools and watches) ──
 * Used by the `read_page` chat tool and the page watchers. Everything is
 * bounded: scheme, address family, time, size, and content type.
 *
 * SSRF guard: only http/https, no literal private/loopback/link-local
 * addresses, no `.local`/`.internal`/`.localhost` names, and the redirect
 * target is re-validated too (undici reuses the connection, so the host
 * we validated is the one that gets dialed for the first hop).
 */

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 1_500_000;
const MAX_TEXT = 8_000;

/**
 * Machine-readable fault classification (the plan's read_page vocabulary).
 * `blocked` = SSRF guard refused (incl. redirect target); `too_large` = body
 * exceeded the 1.5MB cap; `http_error` = any other failed fetch (non-2xx
 * response, timeout, transport error, unusable content) — the human detail
 * stays in `error` so callers can surface it.
 */
export type PageFault = "blocked" | "http_error" | "too_large";

export interface PageResult {
  ok: boolean;
  url: string;
  status?: number;
  title?: string;
  text?: string;
  error?: string;
  fault?: PageFault;
}

/* Loopback / RFC1918 / link-local / CGNAT / multicast / unspecified. */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    return true; // unparseable → treat as unsafe
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (v === "::" || v === "::1") return true;
  if (v.startsWith("fe80") || v.startsWith("fc") || v.startsWith("fd")) return true; // link-local / ULA
  if (v.startsWith("::ffff:")) {
    const v4 = v.slice("::ffff:".length);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return isPrivateIPv4(v4);
    return true; // IPv4-mapped → be conservative
  }
  return false;
}

function addressBlocked(ip: string): boolean {
  if (ip.includes(":")) return isPrivateIPv6(ip);
  return isPrivateIPv4(ip);
}

function hostBlocked(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal"))
    return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return isPrivateIPv4(h);
  if (h.includes(":")) return isPrivateIPv6(h);
  return false;
}

/** Validate a URL for fetching. Returns an error string, or null if safe. */
export function validateUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return "That's not a valid URL.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    return "Only http and https URLs can be fetched.";
  if (!parsed.hostname) return "That URL has no host.";
  if (hostBlocked(parsed.hostname)) return "Local and private addresses are blocked.";
  return null;
}

/* ── HTML → readable text ──────────────────────────────────────────── */

const STRIP_TAGS = [
  /<script\b[\s\S]*?<\/script>/gi,
  /<style\b[\s\S]*?<\/style>/gi,
  /<noscript\b[\s\S]*?<\/noscript>/gi,
  /<svg\b[\s\S]*?<\/svg>/gi,
  /<template\b[\s\S]*?<\/template>/gi,
  /<!--[\s\S]*?-->/g,
];

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return code >= 32 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return code >= 32 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    });
}

function htmlAttr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  return m ? (m[1] ?? m[2] ?? null) : null;
}

/** The page's own URL as declared in its HTML (og:url, then rel=canonical),
 * or "" when the document declares none. */
function urlFromHtml(html: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const prop = htmlAttr(tag, "property") ?? htmlAttr(tag, "name");
    if (prop?.toLowerCase() === "og:url") {
      const content = htmlAttr(tag, "content");
      if (content) return decodeEntities(content).trim();
    }
  }
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = htmlAttr(tag, "rel");
    if (rel?.toLowerCase().split(/\s+/).includes("canonical")) {
      const href = htmlAttr(tag, "href");
      if (href) return decodeEntities(href).trim();
    }
  }
  return "";
}

/** Extract a title, readable body text, and the page's declared URL from an
 * HTML document (`url` is "" when the document declares none). */
export function extractText(html: string): { title: string; text: string; url: string } {
  let out = html;
  for (const re of STRIP_TAGS) out = out.replace(re, " ");
  const titleMatch = out.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, " ").trim() : "";
  const url = urlFromHtml(out);
  out = out.replace(/<[^>]+>/g, " ");
  out = decodeEntities(out);
  out = out.replace(/\s+/g, " ").trim();
  if (out.length > MAX_TEXT) out = out.slice(0, MAX_TEXT) + " …";
  return { title, text: out, url };
}

/* ── The fetch ─────────────────────────────────────────────────────── */

/**
 * Fetch a public URL and return readable text. Never throws — failures come
 * back as `{ ok:false, fault, error }` so callers (tools, watches) can report
 * them, with `fault` using the plan's vocabulary: blocked | http_error |
 * too_large. The 1.5MB cap aborts the download mid-stream.
 */
export async function fetchPage(rawUrl: string): Promise<PageResult> {
  const url = rawUrl.trim();
  const blocked = validateUrl(url);
  if (blocked) return { ok: false, url, fault: "blocked", error: blocked };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": "OrethaBot/1.0 (+personal assistant)",
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
      },
    });

    // Re-validate the address we actually landed on (redirects!).
    try {
      const finalHost = new URL(res.url || url).hostname;
      if (hostBlocked(finalHost))
        return {
          ok: false,
          url,
          fault: "blocked",
          error: "The redirect landed on a private address — blocked.",
        };
    } catch {
      /* unparseable final URL → keep going with the original verdict */
    }

    if (!res.ok)
      return {
        ok: false,
        url: res.url,
        status: res.status,
        fault: "http_error",
        error: `HTTP ${res.status} from that URL.`,
      };

    const ctype = (res.headers.get("content-type") || "").toLowerCase();
    if (
      ctype &&
      !/^(text\/html|application\/xhtml\+xml|text\/plain|application\/json)/.test(ctype)
    )
      return {
        ok: false,
        url: res.url,
        status: res.status,
        fault: "http_error",
        error: `That URL isn't a page (content-type: ${ctype.split(";")[0]}).`,
      };

    // Stream with a hard 1.5MB cap — abort mid-download rather than
    // buffering an unbounded body.
    const reader = res.body?.getReader();
    if (!reader)
      return {
        ok: false,
        url: res.url,
        status: res.status,
        fault: "http_error",
        error: "That URL returned no body.",
      };
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        await reader.cancel().catch(() => {});
        return {
          ok: false,
          url: res.url,
          status: res.status,
          fault: "too_large",
          error: "That page is too large to read (>1.5 MB).",
        };
      }
      chunks.push(value);
    }
    const buf = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      buf.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const raw = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    if (ctype.includes("json")) {
      return { ok: true, url: res.url, status: res.status, title: "", text: raw.slice(0, MAX_TEXT) };
    }
    const { title, text, url: declaredUrl } = extractText(raw);
    // The extractor's url (canonical/og:url) wins when it resolves to http(s);
    // otherwise the URL we actually fetched is the page's url.
    let pageUrl = res.url || url;
    if (declaredUrl) {
      try {
        const resolved = new URL(declaredUrl, res.url || url);
        if (resolved.protocol === "http:" || resolved.protocol === "https:")
          pageUrl = resolved.href;
      } catch {
        /* unresolvable declared url → keep the fetched one */
      }
    }
    if (!text)
      return {
        ok: false,
        url: pageUrl,
        status: res.status,
        fault: "http_error",
        error: "That page had no readable text.",
      };
    return { ok: true, url: pageUrl, status: res.status, title, text };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      url,
      fault: "http_error",
      error: aborted
        ? "Timed out after 10 seconds."
        : err instanceof Error
          ? err.message.slice(0, 200)
          : "Fetch failed.",
    };
  } finally {
    clearTimeout(timer);
  }
}
