/*
 * Cloudflare Pages Function — GET /api/riize-news?topic=all|<멤버 id>
 *
 * 공개 뉴스 검색 RSS 를 서버에서 읽어 최근 기사 목록을 JSON 으로 돌려줍니다.
 * - 구글 뉴스 RSS: 기사 수가 많아 목록의 중심. 단 이미지가 없고 링크는 구글 경유 주소
 * - 빙 뉴스 RSS: 기사 수는 적지만 썸네일과 언론사 원문 주소를 줌 → 같은 기사면 이것으로 보강
 * - 브라우저에서 RSS 를 직접 부르면 CORS 로 막혀서 이 함수가 대신 읽음
 * - 검색어·제외 출처·기간은 src/config/riize-news.json 한 곳에서 관리
 * - 같은 주제는 30분 동안 Cloudflare 캐시에 보관해 외부 호출을 최소화
 * - 기사 본문은 읽거나 저장하지 않고 제목·출처·시각·링크·썸네일 주소만 다룸
 * 응답: { topic, fetchedAt, items: [{ id, title, source, link, image?, publishedAt, members }] }
 */
import config from "../../src/config/riize-news.json";
import { json } from "./_shared.js";

const TOPICS = new Map([[config.group.id, config.group], ...config.members.map((m) => [m.id, m])]);
const isGroup = (topic) => topic.id === config.group.id;

/**
 * 구글 검색어
 * - 그룹: group.query 만 ("라이즈" 단독은 같은 이름의 회사 기사까지 섞여서 영문명으로)
 * - 멤버: "(그룹명들) (멤버 이름들)" 조합 (동명이인·일반 단어 기사 줄이기)
 */
function googleQuery(topic) {
  const q = isGroup(topic) ? config.group.query : `(${config.group.names.join(" OR ")}) (${topic.names.join(" OR ")})`;
  return `${q} when:${config.days}d`;
}

/** 빙은 OR 묶음을 못 알아들어서 "그룹명 + 첫 이름" 으로 */
function bingQuery(topic) {
  return isGroup(topic) ? config.group.names.join(" ") : `${config.group.query} ${topic.names[0]}`;
}

async function fetchRss(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { accept: "application/rss+xml,application/xml", "user-agent": "Mozilla/5.0 (compatible; wyd-now news)" } });
  const xml = res.ok ? await res.text() : "";
  // 비정상 응답(RSS 가 아님)은 실패로 처리
  if (!xml.includes("<rss")) throw new Error("feed-invalid");
  return xml;
}

const googleFeed = async (topic) =>
  parseGoogle(await fetchRss(`https://news.google.com/rss/search?q=${encodeURIComponent(googleQuery(topic))}&hl=ko&gl=KR&ceid=KR:ko`));

const bingFeed = async (topic) =>
  parseBing(await fetchRss(`https://www.bing.com/news/search?q=${encodeURIComponent(bingQuery(topic))}&format=rss&setlang=ko&cc=KR`));

export async function onRequestGet({ request, waitUntil }) {
  const url = new URL(request.url);
  const topic = TOPICS.get(url.searchParams.get("topic") ?? config.group.id);
  if (!topic) return json({ error: "unknown-topic" }, 400);

  // 진단용(임시): 외부 피드가 이 서버에서 어떻게 응답하는지 상태 코드와 앞부분만
  if (url.searchParams.get("debug") === "1") {
    const probe = async (u, headers) => {
      try {
        const r = await fetch(u, { headers, redirect: "manual", signal: AbortSignal.timeout(8000) });
        return { status: r.status, location: r.headers.get("location"), head: (await r.text()).slice(0, 160) };
      } catch (e) {
        return { error: String(e) };
      }
    };
    const g = `https://news.google.com/rss/search?q=${encodeURIComponent(googleQuery(topic))}&hl=ko&gl=KR&ceid=KR:ko`;
    return json({
      googleBot: await probe(g, { "user-agent": "Mozilla/5.0 (compatible; wyd-now news)" }),
      googleNoUa: await probe(g, {}),
      googleBrowser: await probe(g, { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", "accept-language": "ko-KR,ko;q=0.9" }),
    });
  }

  // 같은 주제는 30분 동안 캐시 (Cache API 를 못 쓰는 환경이면 매번 새로 읽음)
  const cacheKey = new Request(`${url.origin}/api/riize-news?topic=${topic.id}`);
  const cache = globalThis.caches?.default;
  if (cache) {
    const hit = await cache.match(cacheKey).catch(() => undefined);
    if (hit) return hit;
  }

  // 전체 = 그룹 + 멤버별 구글 피드를 합침 (멤버 기사도 전체에 한 번만). 빙은 해당 주제 하나만
  const topics = isGroup(topic) ? [...TOPICS.values()] : [topic];
  const [google, bing] = await Promise.all([Promise.allSettled(topics.map(googleFeed)), bingFeed(topic).catch(() => [])]);
  // 중심 피드(그룹 또는 고른 멤버)가 실패하면 실패로 돌려 앱이 기존 목록을 그대로 쓰게 함
  if (google[0].status !== "fulfilled" && bing.length === 0) return json({ error: "feed-failed" }, 502);
  const googleItems = google.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  const items = merge(googleItems, bing);
  const response = json({ topic: topic.id, fetchedAt: new Date().toISOString(), items }, 200, {
    "cache-control": `public, max-age=${config.refreshMinutes * 60}`,
  });
  if (cache) waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
  return response;
}

/* ---------- RSS 읽기 (정규식: 의존성 없이 가볍게) ---------- */

/** <item> 마다 태그 값을 꺼내는 함수와 원문 조각 */
function items(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const body = m[1];
    const pick = (tag) => body.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1];
    return { pick, body };
  });
}

function parseGoogle(xml) {
  return items(xml).map(({ pick, body }) => {
    const source = decode(pick("source") ?? "");
    const title = decode(pick("title") ?? "");
    return {
      title: source && title.endsWith(` - ${source}`) ? title.slice(0, -(source.length + 3)) : title,
      link: decode(pick("link") ?? ""),
      source,
      // <source url="…"> : 출처 제외 판단용 언론사 주소
      sourceUrl: body.match(/<source url="([^"]*)"/)?.[1] ?? "",
      pubDate: pick("pubDate"),
    };
  });
}

function parseBing(xml) {
  return items(xml).map(({ pick }) => {
    const apiclick = decode(pick("link") ?? "");
    let link = apiclick;
    try {
      link = new URL(apiclick).searchParams.get("url") ?? apiclick;
    } catch {
      // 주소 형식이 이상하면 그대로
    }
    const image = decode(pick("News:Image") ?? "");
    return {
      title: decode(pick("title") ?? ""),
      link,
      source: decode(pick("News:Source") ?? ""),
      sourceUrl: link,
      pubDate: pick("pubDate"),
      // 빙 썸네일: https + 16:9(320×180) 로 잘라서
      image: image ? `${image.replace(/^http:/, "https:")}&w=320&h=180&c=14` : undefined,
    };
  });
}

/* ---------- 정리: 기간·출처 거르기, 중복 제거, 빙 정보로 보강 ---------- */

const keyOf = (title) => title.replace(/[\s"'“”‘’.,…·!?\-–—[\]()<>〈〉《》「」『』]/g, "").toLowerCase();

function excluded(u) {
  try {
    const host = new URL(u).hostname.replace(/^www\.|^m\./, "");
    return config.excludeSources.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function merge(googleItems, bingItems) {
  const since = Date.now() - config.days * 24 * 3600 * 1000;
  const byKey = new Map();
  const accept = (it) => {
    const time = Date.parse(it.pubDate ?? "");
    return it.title && /^https?:\/\//.test(it.link) && !Number.isNaN(time) && time >= since && !excluded(it.sourceUrl);
  };
  for (const it of googleItems) {
    if (!accept(it)) continue;
    const key = keyOf(it.title);
    if (!byKey.has(key)) byKey.set(key, { ...it });
  }
  for (const it of bingItems) {
    if (!accept(it)) continue;
    const key = keyOf(it.title);
    const same = byKey.get(key);
    // 같은 기사면 언론사 원문 주소·썸네일로 보강, 처음 보는 기사면 추가
    if (same) Object.assign(same, { link: it.link, image: it.image ?? same.image });
    else byKey.set(key, { ...it });
  }
  return [...byKey.values()]
    .map((it) => ({
      id: keyOf(it.title).slice(0, 80),
      title: it.title,
      source: it.source,
      link: it.link,
      image: it.image,
      publishedAt: new Date(Date.parse(it.pubDate)).toISOString(),
      members: config.members.filter((mem) => mem.names.some((n) => it.title.toLowerCase().includes(n.toLowerCase()))).map((mem) => mem.id),
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 80);
}

const NAMED = { quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", amp: "&", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…", middot: "·" };

function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED[name.toLowerCase()] ?? m)
    // 일부 언론사 제목의 \' \" 처럼 따옴표 앞에 남은 역슬래시
    .replace(/\\(['"‘’“”])/g, "$1")
    .trim();
}
