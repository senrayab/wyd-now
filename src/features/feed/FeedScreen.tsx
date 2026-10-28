"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, ChevronLeft, Newspaper, RotateCw } from "lucide-react";
import { useFeedback } from "@/components/Feedback";
import { useBack } from "@/components/PageHeader";
import { Empty, Loading } from "@/components/ui";
import { useFocusArtist } from "@/lib/focus";
import { useStoreQuery } from "@/lib/hooks";
import {
  agoLabel,
  cachedMeta,
  fetchFeed,
  isStale,
  loadFeedMeta,
  FEED_TOPIC,
  NEWS_CONFIG,
  readFeedCache,
  REFRESH_MS,
  scrapFeedItem,
  type Feed,
  type FeedItem,
  type FeedMeta,
} from "@/lib/services/riize-news";
import { getDataStore } from "@/lib/storage";
import styles from "./Feed.module.css";

const memberLabel = new Map(NEWS_CONFIG.members.map((m) => [m.id, m.label]));

/** /feed — 뉴스 (최근 7일 기사 자동 수집, 목록 하나 + 멤버 이름표). 홈의 최근 소식 → 전체로 들어옴 */
export default function FeedScreen() {
  const topic = FEED_TOPIC;
  const back = useBack("/");
  // 이 기기에 저장해 둔 목록을 먼저 보여 줌
  const [feed, setFeed] = useState<Feed | null>(() => readFeedCache(topic));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  // 처음엔 pageSize 개, "더 보기" 마다 pageSize 개씩 (이미 받은 목록 안에서 펼침)
  const [shown, setShown] = useState(NEWS_CONFIG.pageSize);

  const refresh = useCallback(async (fresh = false) => {
    setLoading(true);
    setError(undefined);
    try {
      setFeed(await fetchFeed(topic, fresh));
    } catch (e) {
      // 실패해도 기존 목록은 그대로 두고 안내만
      setError(e instanceof Error ? e.message : "뉴스를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [topic]);

  // 주제가 바뀌면 그 주제 캐시로 바꾸고, 오래됐으면 새로 받음
  useEffect(() => {
    const cached = readFeedCache(topic);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 주제별 캐시로 교체
    setFeed(cached);
    setShown(NEWS_CONFIG.pageSize);
    if (isStale(cached)) void refresh();
  }, [topic, refresh]);

  // 화면을 켜 둔 동안 30분마다 갱신 (앱을 닫아 둔 동안은 받지 않음)
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && isStale(readFeedCache(topic)) && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [topic, refresh]);

  const items = feed?.items ?? [];

  return (
    <main>
      <header className="page-header">
        {/* 홈의 ‘최근 소식 → 전체’로 들어오는 화면이라 뒤로(홈) */}
        <button type="button" className="icon-btn back" onClick={back} aria-label="뒤로">
          <ChevronLeft size={22} />
        </button>
        <h1>{NEWS_CONFIG.title}</h1>
        <div className="header-actions">
          <button type="button" className="icon-btn" onClick={() => refresh(true)} disabled={loading} aria-label="새로고침">
            <RotateCw size={18} className={loading ? styles.spin : undefined} />
          </button>
        </div>
      </header>

      <p className={styles.updated} role="status">
        {loading ? "새 기사를 확인하는 중…" : feed ? `마지막 업데이트 ${agoLabel(feed.fetchedAt)} · 최근 ${NEWS_CONFIG.days}일` : `최근 ${NEWS_CONFIG.days}일 기사`}
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
          {items.length > 0 && " 지난번에 받은 기사를 보여 드려요."}
        </p>
      )}

      {items.length === 0 ? (
        loading ? (
          <Loading />
        ) : (
          <div className="card-flat" style={{ marginTop: 8 }}>
            <Empty icon={Newspaper}>{error ? "기사를 불러오지 못했어요." : `최근 ${NEWS_CONFIG.days}일 동안 올라온 기사가 없어요.`}</Empty>
          </div>
        )
      ) : (
        <>
          <FeedList items={items.slice(0, shown)} />
          {items.length > shown && (
            <button type="button" className={`btn btn-ghost btn-block ${styles.more}`} onClick={() => setShown((n) => n + NEWS_CONFIG.pageSize)}>
              더 보기 <span className="muted num">{items.length - shown}</span>
            </button>
          )}
        </>
      )}

      <p className={styles.note}>
        {feed?.source === "naver" ? "네이버 뉴스 검색" : "빙 뉴스"} 결과를 모아 보여 줘요. 기사를 누르면 언론사 원문으로 이동하고, 날짜 옆 북마크로 내 공간에 스크랩할 수 있어요.
      </p>
    </main>
  );
}

/** 기사 목록 카드 (뉴스 화면, 홈 최근 소식에서 같이 씀) */
export function FeedList({ items }: { items: FeedItem[] }) {
  // 스크랩 여부: 기사 모음(주소) ↔ 내 스크랩
  const { data: savedNews } = useStoreQuery((s) => s.news.list(), "news");
  const { data: scraps } = useStoreQuery((s) => s.scraps.list(), "scraps");
  const scrappedIds = new Set((scraps ?? []).map((s) => s.newsId));
  const scrappedByLink = new Map((savedNews ?? []).filter((n) => scrappedIds.has(n.id)).map((n) => [n.url, n.id]));
  return (
    <ul className={`card ${styles.list}`}>
      {items.map((item) => (
        <FeedRow key={item.id} item={item} scrappedNewsId={scrappedByLink.get(item.link)} />
      ))}
    </ul>
  );
}

/** 기사 한 줄: 제목·썸네일을 누르면 원문, 날짜 옆 북마크로 스크랩 */
function FeedRow({ item, scrappedNewsId }: { item: FeedItem; scrappedNewsId?: string }) {
  const { toast } = useFeedback();
  const { focus } = useFocusArtist();
  const rowRef = useRef<HTMLLIElement>(null);
  const meta = useFeedMeta(item, rowRef);
  const [broken, setBroken] = useState(false);
  const [busy, setBusy] = useState(false);
  const image = item.image ?? meta?.image;
  const source = meta?.source || item.source;

  async function toggleScrap() {
    setBusy(true);
    try {
      if (scrappedNewsId) {
        await getDataStore().scraps.remove(scrappedNewsId);
        toast("스크랩을 해제했어요.");
      } else {
        await scrapFeedItem(item, source, focus?.id);
        toast("내 공간에 스크랩했어요. 기사 모음에도 담겼어요.");
      }
    } catch {
      toast("스크랩하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li ref={rowRef} className={styles.row}>
      <div className={styles.body}>
        <a href={item.link} target="_blank" rel="noopener noreferrer" className={styles.titleLink}>
          <strong>{item.title}</strong>
        </a>
        <div className={styles.metaLine}>
          <small className="num">
            {source} · {agoLabel(item.publishedAt)}
          </small>
          <button type="button" className={styles.scrap} aria-pressed={!!scrappedNewsId} disabled={busy} onClick={toggleScrap} aria-label={scrappedNewsId ? `${item.title} 스크랩 해제` : `${item.title} 스크랩`}>
            <Bookmark size={14} fill={scrappedNewsId ? "currentColor" : "none"} />
          </button>
        </div>
        {item.members.length > 0 && (
          <span className={styles.tags}>
            {item.members.map((m) => (
              <span key={m} className={styles.tag}>
                {memberLabel.get(m)}
              </span>
            ))}
          </span>
        )}
      </div>
      {/* 썸네일: 없거나 못 불러오면 빈 칸 없이 제목이 넓게 (기본 그림은 비어 보여서 안 씀) */}
      {image && !broken && (
        <a href={item.link} target="_blank" rel="noopener noreferrer" className={styles.thumbLink} tabIndex={-1} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- 외부 뉴스 썸네일 (최적화 서버 없음) */}
          <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" className={styles.thumb} onError={() => setBroken(true)} />
        </a>
      )}
    </li>
  );
}

/** 썸네일이 없는 기사는 화면에 보일 때만 원문의 대표 이미지·매체명을 읽음 */
function useFeedMeta(item: FeedItem, ref: React.RefObject<HTMLLIElement | null>) {
  const [data, setData] = useState<FeedMeta | undefined>(() => cachedMeta(item.link));

  useEffect(() => {
    const el = ref.current;
    // 썸네일이 있어도 출처가 아직 주소(예: tenasia.co.kr)면 매체명을 읽으러 감
    const needsSource = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(item.source);
    if ((item.image && !needsSource) || data || !el) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      void loadFeedMeta(item.link).then(setData);
    }, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [item.image, item.source, item.link, data, ref]);

  return data;
}
