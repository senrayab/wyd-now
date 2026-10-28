/*
 * RIIZE 뉴스 (자동 수집) — /api/riize-news 를 불러 이 기기에 최근 목록만 캐시합니다.
 * - 캐시가 있으면 먼저 보여 주고, 오래됐으면(30분) 새로 받아 바꿈
 * - 같은 주제를 동시에 여러 번 부르지 않음
 * - 받기에 실패해도 기존 목록은 그대로
 * 계정 동기화·서버 저장은 하지 않고, 브라우저 저장소는 최근 뉴스 캐시에만 씁니다.
 */
import config from "@/config/riize-news.json";
import { getDataStore } from "../storage";

export const NEWS_CONFIG = config;
export type NewsTopicId = string;

export interface FeedItem {
  id: string;
  title: string;
  source: string;
  /** 언론사 원문(또는 구글 뉴스 경유) 주소 */
  link: string;
  image?: string;
  publishedAt: string;
  /** 제목에 이름이 나온 멤버 id */
  members: string[];
}

/** 목록은 하나 (멤버별 칩 없이, 제목에 이름이 나온 멤버는 이름표) */
export const FEED_TOPIC = "all";

export interface Feed {
  /** 목록을 만든 곳: 네이버 검색 API 또는 (키가 없을 때) 빙 */
  source?: "naver" | "bing";
  topic: NewsTopicId;
  fetchedAt: string;
  items: FeedItem[];
}

export const REFRESH_MS = config.refreshMinutes * 60 * 1000;

const cacheKey = (topic: NewsTopicId) => `wyd:feed:${topic}`;

export function readFeedCache(topic: NewsTopicId): Feed | null {
  try {
    const raw = localStorage.getItem(cacheKey(topic));
    return raw ? (JSON.parse(raw) as Feed) : null;
  } catch {
    return null;
  }
}

export function isStale(feed: Feed | null) {
  return !feed || Date.now() - Date.parse(feed.fetchedAt) > REFRESH_MS;
}

const inflight = new Map<NewsTopicId, Promise<Feed>>();

/**
 * 받기. 같은 주제를 받는 중이면 그 요청을 같이 기다림
 * - 기본: 서버가 30분 동안 보관한 결과
 * - fresh(새로고침 버튼): 서버가 받은 지 2분이 지났으면 네이버에서 새로 받음
 */
export function fetchFeed(topic: NewsTopicId, fresh = false): Promise<Feed> {
  const running = inflight.get(topic);
  if (running) return running;
  const request = (async () => {
    const res = await fetch(`/api/riize-news${fresh ? "?fresh=1" : ""}`, fresh ? { cache: "no-store" } : undefined);
    const type = res.headers.get("content-type") ?? "";
    // 함수가 없는 곳(로컬 정적 서버)은 HTML 404 가 옴
    if (!res.ok || !type.includes("application/json")) throw new Error("뉴스를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    const feed = (await res.json()) as Feed;
    try {
      localStorage.setItem(cacheKey(topic), JSON.stringify(feed));
    } catch {
      // 저장이 막힌 환경: 이번 화면에서만 사용
    }
    return feed;
  })().finally(() => inflight.delete(topic));
  inflight.set(topic, request);
  return request;
}

/** "방금", "12분 전", "3시간 전", "어제", "10.25" */
export function agoLabel(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - Date.parse(iso));
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}시간 전`;
  if (hours < 48) return "어제";
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

/* ---------- 썸네일·매체명 보강 (화면에 나온 기사만) ---------- */

export interface FeedMeta {
  image?: string;
  source?: string;
}

const META_KEY = "wyd:feed-meta";
const META_MAX = 400;
let metaCache: Record<string, FeedMeta> | null = null;

function loadMeta() {
  if (metaCache) return metaCache;
  try {
    metaCache = JSON.parse(localStorage.getItem(META_KEY) ?? "{}");
  } catch {
    metaCache = {};
  }
  return metaCache!;
}

function saveMeta() {
  try {
    const entries = Object.entries(loadMeta());
    // 오래된 것부터 버려 저장 공간을 작게 유지
    const trimmed = Object.fromEntries(entries.slice(-META_MAX));
    metaCache = trimmed;
    localStorage.setItem(META_KEY, JSON.stringify(trimmed));
  } catch {
    // 저장이 막힌 환경: 이번 화면에서만
  }
}

export const cachedMeta = (link: string): FeedMeta | undefined => loadMeta()[link];

// 한꺼번에 많이 부르지 않게 동시에 3개까지
const MAX_PARALLEL = 3;
let running = 0;
const waiting: (() => void)[] = [];
const metaInflight = new Map<string, Promise<FeedMeta>>();

async function withSlot<T>(task: () => Promise<T>) {
  if (running >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r));
  running += 1;
  try {
    return await task();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

/** 원문 페이지의 대표 이미지·매체명 (기존 /api/link-meta 사용). 실패해도 빈 값으로 저장해 다시 부르지 않음 */
export function loadFeedMeta(link: string): Promise<FeedMeta> {
  const hit = cachedMeta(link);
  if (hit) return Promise.resolve(hit);
  const pending = metaInflight.get(link);
  if (pending) return pending;
  const request = withSlot(async () => {
    let meta: FeedMeta = {};
    try {
      const res = await fetch(`/api/link-meta?url=${encodeURIComponent(link)}`);
      if ((res.headers.get("content-type") ?? "").includes("application/json")) {
        if (res.ok) {
          const body = (await res.json()) as FeedMeta;
          meta = { image: body.image, source: body.source };
        }
        // 사이트가 막아서 못 읽은 경우도 기억해 다시 부르지 않음
        loadMeta()[link] = meta;
        saveMeta();
      }
    } catch {
      // 네트워크 오류는 기억하지 않고 다음에 다시 시도
    }
    return meta;
  }).finally(() => metaInflight.delete(link));
  metaInflight.set(link, request);
  return request;
}

/* ---------- 스크랩: 뉴스 기사를 기사 모음에 넣고 내 공간 스크랩으로 ---------- */

/** 이미 같은 주소로 기사 모음에 있으면 그 기사를, 없으면 새로 만들어 스크랩 */
export async function scrapFeedItem(item: FeedItem, source: string, artistId?: string) {
  const { news, scraps } = getDataStore();
  const existing = (await news.list()).find((n) => n.url === item.link);
  const saved =
    existing ??
    (await news.create({
      title: item.title,
      url: item.link,
      source: source || undefined,
      publishedAt: localDateKey(item.publishedAt),
      artistIds: artistId ? [artistId] : [],
    }));
  await scraps.add(saved.id);
}

function localDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
