/*
 * RIIZE 뉴스 (자동 수집) — /api/riize-news 를 불러 이 기기에 최근 목록만 캐시합니다.
 * - 캐시가 있으면 먼저 보여 주고, 오래됐으면(30분) 새로 받아 바꿈
 * - 같은 주제를 동시에 여러 번 부르지 않음
 * - 받기에 실패해도 기존 목록은 그대로
 * 계정 동기화·서버 저장은 하지 않고, 브라우저 저장소는 최근 뉴스 캐시에만 씁니다.
 */
import config from "@/config/riize-news.json";

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

export interface Feed {
  topic: NewsTopicId;
  fetchedAt: string;
  items: FeedItem[];
}

export const NEWS_TOPICS = [config.group, ...config.members].map((t) => ({ id: t.id, label: t.label }));
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

/** 새로 받기. 같은 주제를 받는 중이면 그 요청을 같이 기다림 */
export function fetchFeed(topic: NewsTopicId): Promise<Feed> {
  const running = inflight.get(topic);
  if (running) return running;
  const request = (async () => {
    const res = await fetch(`/api/riize-news?topic=${encodeURIComponent(topic)}`);
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
