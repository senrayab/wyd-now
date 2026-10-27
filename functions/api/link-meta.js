/*
 * Cloudflare Pages Function — GET /api/link-meta?url=<기사 주소>
 *
 * 브라우저는 다른 사이트(언론사) 페이지를 직접 읽을 수 없어서(CORS) 이 함수가 대신 읽습니다.
 * 기사 페이지의 <head> 에 있는 공개 메타 정보(og:title 등)만 뽑아 돌려줍니다.
 *   { title, source, publishedAt(YYYY-MM-DD), summary, image(절대 주소) }
 * 찾지 못한 값은 빠집니다. 본문은 읽거나 저장하지 않습니다.
 */
import { badRequest, fetchPublic, json, parsePublicUrl } from "./_shared.js";

const MAX_HTML_BYTES = 768 * 1024;

export async function onRequestGet({ request }) {
  const target = parsePublicUrl(new URL(request.url).searchParams.get("url"));
  if (!target) return badRequest("invalid-url");

  let res;
  try {
    res = await fetchPublic(target, "text/html,application/xhtml+xml");
  } catch {
    return json({ error: "fetch-failed" }, 502);
  }
  if (!res.ok) return json({ error: "fetch-failed", status: res.status }, 502);
  if (!/html/i.test(res.headers.get("content-type") ?? "")) return json({ error: "not-html" }, 422);

  const bytes = await readLimited(res, MAX_HTML_BYTES);
  const html = decodeHtml(bytes, res.headers.get("content-type"));
  const head = html.slice(0, Math.max(html.search(/<\/head>/i), 0) || html.length);
  const meta = parseMeta(head);
  const finalUrl = new URL(res.url || target.href);

  const pick = (...keys) => keys.map((k) => meta.get(k)).find((v) => v && v.trim());
  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const image = pick("og:image", "og:image:url", "og:image:secure_url", "twitter:image", "twitter:image:src");
  const published =
    pick("article:published_time", "og:article:published_time", "article:published", "pubdate", "publishdate", "date", "dc.date", "dc.date.issued", "parsely-pub-date", "sailthru.date") ??
    jsonLdDate(html);

  const source = clean(pick("og:site_name", "application-name", "twitter:site")?.replace(/^@/, ""));
  const result = {
    title: stripSiteName(clean(pick("og:title", "twitter:title") ?? titleTag), source),
    source,
    publishedAt: toDateKey(published),
    summary: clean(pick("og:description", "description", "twitter:description")),
    image: absolute(image, finalUrl),
  };
  for (const key of Object.keys(result)) if (!result[key]) delete result[key];

  return json(result, 200, { "cache-control": "public, max-age=3600" });
}

/** 본문이 아주 큰 페이지라도 앞부분만 읽음 (메타 정보는 <head> 에 있음) */
async function readLimited(res, limit) {
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  while (size < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  reader.cancel().catch(() => {});
  const out = new Uint8Array(Math.min(size, limit));
  let offset = 0;
  for (const c of chunks) {
    const part = c.subarray(0, out.length - offset);
    out.set(part, offset);
    offset += part.length;
    if (offset >= out.length) break;
  }
  return out;
}

/** UTF-8 이 아닌 국내 사이트(EUC-KR 등)도 읽을 수 있게 문자 인코딩을 찾아서 디코딩 */
function decodeHtml(bytes, contentType) {
  const fromHeader = contentType?.match(/charset=["']?([\w-]+)/i)?.[1];
  const sniff = new TextDecoder("latin1").decode(bytes.subarray(0, 4096));
  const fromMeta = sniff.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  const charset = (fromHeader || fromMeta || "utf-8").toLowerCase();
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** <meta property|name|itemprop="…" content="…"> 를 키(소문자) → 값 으로 */
function parseMeta(head) {
  const map = new Map();
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = {};
    for (const m of tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
    }
    const key = (attrs.property || attrs.name || attrs.itemprop || "").toLowerCase();
    if (key && attrs.content && !map.has(key)) map.set(key, decodeEntities(attrs.content));
  }
  return map;
}

/** JSON-LD(구조화 데이터)의 datePublished */
function jsonLdDate(html) {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    const found = m[1].match(/"datePublished"\s*:\s*"([^"]+)"/);
    if (found) return found[1];
  }
  return undefined;
}

/** 여러 날짜 표기를 한국 시간 기준 YYYY-MM-DD 로 */
function toDateKey(value) {
  if (!value) return undefined;
  const v = value.trim();
  const plain = v.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?!\d)/);
  // 시간대가 붙은 값은 한국 시간으로 바꿔서 날짜를 정함 (자정 전후 하루 밀림 방지)
  if (/T\d{2}:\d{2}/.test(v) && /(Z|[+-]\d{2}:?\d{2})$/.test(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  }
  if (plain) return `${plain[1]}-${plain[2].padStart(2, "0")}-${plain[3].padStart(2, "0")}`;
  const compact = v.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  return undefined;
}

const NAMED = {
  quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", amp: "&",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…", middot: "·", ndash: "–", mdash: "—", bull: "•", laquo: "«", raquo: "»",
};

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED[name.toLowerCase()] ?? m);
}

/** "기사 제목 | 텐아시아", "기사 제목 - 일간스포츠" 처럼 끝에 붙은 매체명을 뗌 */
function stripSiteName(title, source) {
  if (!title || !source) return title;
  for (const sep of [" | ", " - ", " – ", " — ", " · ", " : "]) {
    const suffix = sep + source;
    if (title.endsWith(suffix) && title.length > suffix.length) return title.slice(0, -suffix.length).trim();
  }
  return title;
}

function clean(s) {
  if (!s) return undefined;
  const v = decodeEntities(s).replace(/\s+/g, " ").trim();
  return v ? v.slice(0, 500) : undefined;
}

function absolute(src, base) {
  if (!src) return undefined;
  try {
    const u = new URL(src.trim(), base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : undefined;
  } catch {
    return undefined;
  }
}
