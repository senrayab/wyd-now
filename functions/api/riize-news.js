/*
 * Cloudflare Pages Function — GET /api/riize-news (새로고침 버튼은 ?fresh=1)
 *
 * 최근 기사 목록을 JSON 으로 돌려줍니다. 기사 본문은 읽거나 저장하지 않고 제목·출처·시각·링크·썸네일 주소만 다룹니다.
 * - 네이버 검색 API: 목록의 중심. 언론사 원문 주소를 줌. 썸네일은 없음
 *   2026년부터 네이버 클라우드 플랫폼의 NAVER API HUB 로 이관됨 (기존 openapi.naver.com 은 2027-06-30 종료)
 *   HUB 앱의 Client ID / Secret 을 Cloudflare Pages 비밀 환경 변수 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 에 (앱·저장소에 노출하지 않음)
 * - 빙 뉴스 RSS: 썸네일을 줌 → 같은 기사면 썸네일 보강. 네이버 키가 없으면 빙만으로 목록을 만듦
 * - 구글 뉴스 RSS 는 Cloudflare 서버에서 요청하면 503(비정상 트래픽)으로 막혀서 쓰지 않음
 * - 검색어·제외 출처·기간·개수는 src/config/riize-news.json 한 곳에서 관리
 * - 같은 주제는 30분 동안 Cloudflare 캐시에 보관해 외부 호출을 최소화
 * - 목록은 하나: 그룹 검색 + 멤버별 검색을 합쳐 중복 제거, 제목에 이름이 나온 멤버는 이름표(members)
 * - 제목에 그룹·멤버 이름이나 추가 키워드(활동곡·팬덤명)가 있는 기사만
 *   (네이버 요약은 검색어 주변 발췌라 본문에 잠깐 언급된 기사도 걸려서 요약으로는 거르지 않음)
 * 응답: { source, fetchedAt, stats: { dropped }, items: [{ id, title, source, link, image?, publishedAt, members }] }
 */
import config from "../../src/config/riize-news.json";
import { json } from "./_shared.js";

const TOPICS = [config.group, ...config.members];
const isGroup = (topic) => topic.id === config.group.id;

/** 검색어: 그룹은 영문명("라이즈" 단독은 같은 이름의 회사 기사가 섞임), 멤버는 "그룹명 + 멤버 이름" */
const searchQuery = (topic) => (isGroup(topic) ? config.group.query : `${config.group.query} ${topic.names[0]}`);

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const topic = config.group;
  const naverKeys = env?.NAVER_CLIENT_ID && env?.NAVER_CLIENT_SECRET ? { id: env.NAVER_CLIENT_ID, secret: env.NAVER_CLIENT_SECRET } : null;

  // 같은 주제는 30분 동안 캐시 (Cache API 를 못 쓰는 환경이면 매번 새로 읽음)
  // 새로고침 버튼(?fresh=1)은 받은 지 manualRefreshMinutes(2분)가 지났을 때만 새로 받음 → 연속으로 눌러도 한도 보호
  const cacheKey = new Request(`${url.origin}/api/riize-news?v=2&src=${naverKeys ? "naver" : "bing"}`);
  const cache = globalThis.caches?.default;
  if (cache) {
    const hit = await cache.match(cacheKey).catch(() => undefined);
    if (hit) {
      if (!url.searchParams.has("fresh")) return hit;
      const fetchedAt = Date.parse((await hit.clone().json().catch(() => ({}))).fetchedAt ?? "");
      if (Number.isNaN(fetchedAt) || Date.now() - fetchedAt < config.manualRefreshMinutes * 60 * 1000) return hit;
    }
  }

  // 그룹 + 멤버별 검색을 합쳐 중복 제거 (멤버 이름으로만 검색되는 기사도 빠지지 않게)
  const topics = TOPICS;
  const [naver, bing] = await Promise.all([
    naverKeys ? Promise.allSettled(topics.map((t) => naverFeed(t, naverKeys))) : Promise.resolve([]),
    bingFeed(topic).catch(() => []),
  ]);
  const naverItems = naver.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  // 받은 기사가 하나도 없고 외부 호출도 실패했으면 실패로 돌려 앱이 기존 목록을 그대로 쓰게 함
  if (naverKeys && naver[0]?.status !== "fulfilled" && bing.length === 0) return json({ error: "feed-failed" }, 502);

  const stats = { dropped: 0 };
  const relevant = (it) => {
    const ok = relevant_(it);
    if (!ok) stats.dropped += 1;
    return ok;
  };
  const items = merge(naverItems.filter(relevant), bing.filter(relevant));
  const response = json({ source: naverKeys ? "naver" : "bing", fetchedAt: new Date().toISOString(), stats, items }, 200, {
    "cache-control": `public, max-age=${config.refreshMinutes * 60}`,
  });
  if (cache) waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
  return response;
}

/* ---------- 네이버 검색 API ---------- */

async function naverFeed(topic, keys) {
  const api = `https://naverapihub.apigw.ntruss.com/search/v1/news?query=${encodeURIComponent(searchQuery(topic))}&display=${config.fetchLimit}&start=1&sort=date`;
  const res = await fetch(api, {
    signal: AbortSignal.timeout(8000),
    headers: { "X-NCP-APIGW-API-KEY-ID": keys.id, "X-NCP-APIGW-API-KEY": keys.secret },
  });
  if (!res.ok) throw new Error(`naver ${res.status}`);
  const body = await res.json();
  return (body.items ?? []).map((it) => {
    const link = it.originallink || it.link;
    return { title: decode(stripTags(it.title ?? "")), summary: decode(stripTags(it.description ?? "")), link, source: hostLabel(link), sourceUrl: link, pubDate: it.pubDate };
  });
}

/* ---------- 빙 뉴스 RSS (썸네일) ---------- */

async function bingFeed(topic) {
  const q = isGroup(topic) ? config.group.names.join(" ") : searchQuery(topic);
  const res = await fetch(`https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setlang=ko&cc=KR`, {
    signal: AbortSignal.timeout(8000),
    headers: { accept: "application/rss+xml,application/xml", "user-agent": "Mozilla/5.0 (compatible; wyd-now news)" },
  });
  const xml = res.ok ? await res.text() : "";
  if (!xml.includes("<rss")) throw new Error("feed-invalid");
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const pick = (tag) => m[1].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1];
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
      summary: decode(stripTags(decode(pick("description") ?? ""))),
      link,
      source: decode(pick("News:Source") ?? ""),
      sourceUrl: link,
      pubDate: pick("pubDate"),
      // 빙 썸네일: https + 16:9(320×180) 로 잘라서
      image: image ? `${image.replace(/^http:/, "https:")}&w=320&h=180&c=14` : undefined,
    };
  });
}

/* ---------- 관련 기사만: 제목 기준 ---------- */

const TITLE_NAMES = [...config.group.names, ...config.members.flatMap((m) => m.names), ...(config.titleKeywords ?? [])].map((n) => n.toLowerCase());

/** 제목에 그룹·멤버 이름이나 추가 키워드가 있는 기사만 (여러 아티스트 나열·시상식 순위 같은 기사 제외) */
function relevant_(it) {
  const title = (it.title ?? "").toLowerCase();
  return TITLE_NAMES.some((n) => title.includes(n));
}

/* ---------- 정리: 기간·출처 거르기, 중복 제거, 썸네일 보강 ---------- */

const keyOf = (title) => title.replace(/[\s"'“”‘’.,…·!?\-–—[\]()<>〈〉《》「」『』]/g, "").toLowerCase();

function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\.|^m\./, "");
  } catch {
    return "";
  }
}

/**
 * 네이버는 언론사 이름을 주지 않아서 설정의 sourceNames(주소 → 매체명)로 바꿈.
 * 표에 없으면 주소로 두고, 앱이 원문을 읽을 수 있으면 매체명으로 바꿈
 */
const SOURCE_NAMES = Object.entries(config.sourceNames ?? {});
const hostLabel = (u) => {
  const host = hostOf(u);
  return SOURCE_NAMES.find(([d]) => host === d || host.endsWith(`.${d}`))?.[1] ?? host;
};

const excluded = (u) => {
  const host = hostOf(u);
  return !!host && config.excludeSources.some((d) => host === d || host.endsWith(`.${d}`));
};

function merge(primary, bingItems) {
  const since = Date.now() - config.days * 24 * 3600 * 1000;
  const byKey = new Map();
  const accept = (it) => {
    const time = Date.parse(it.pubDate ?? "");
    return it.title && /^https?:\/\//.test(it.link) && !Number.isNaN(time) && time >= since && !excluded(it.sourceUrl);
  };
  for (const it of primary) {
    if (!accept(it)) continue;
    const key = keyOf(it.title);
    if (!byKey.has(key)) byKey.set(key, { ...it });
  }
  for (const it of bingItems) {
    if (!accept(it)) continue;
    const key = keyOf(it.title);
    const same = byKey.get(key);
    // 같은 기사면 썸네일·매체명 보강, 처음 보는 기사면 추가
    if (same) Object.assign(same, { image: same.image ?? it.image, source: it.source || same.source });
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
    .slice(0, config.fetchLimit);
}

const stripTags = (s) => s.replace(/<[^>]+>/g, "");

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
