"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Newspaper, RotateCw } from "lucide-react";
import HomeLink from "@/components/HomeLink";
import { Empty, Loading } from "@/components/ui";
import { agoLabel, fetchFeed, isStale, NEWS_CONFIG, NEWS_TOPICS, readFeedCache, REFRESH_MS, type Feed, type FeedItem } from "@/lib/services/riize-news";
import styles from "./Feed.module.css";

const memberLabel = new Map(NEWS_CONFIG.members.map((m) => [m.id, m.label]));

/** /feed — RIIZE 뉴스 (최근 7일 기사 자동 수집) */
export default function FeedScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const topic = NEWS_TOPICS.some((t) => t.id === params.get("m")) ? params.get("m")! : NEWS_CONFIG.group.id;
  // 이 기기에 저장해 둔 목록을 먼저 보여 줌
  const [feed, setFeed] = useState<Feed | null>(() => readFeedCache(topic));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setFeed(await fetchFeed(topic));
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
        <HomeLink />
        <h1>{NEWS_CONFIG.title}</h1>
        <div className="header-actions">
          <button type="button" className="icon-btn" onClick={refresh} disabled={loading} aria-label="새로고침">
            <RotateCw size={18} className={loading ? styles.spin : undefined} />
          </button>
        </div>
      </header>

      <p className={styles.updated} role="status">
        {loading ? "새 기사를 확인하는 중…" : feed ? `마지막 업데이트 ${agoLabel(feed.fetchedAt)} · 최근 ${NEWS_CONFIG.days}일` : `최근 ${NEWS_CONFIG.days}일 기사`}
      </p>

      <div className="chips" role="group" aria-label="멤버">
        {NEWS_TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="chip"
            aria-pressed={topic === t.id}
            onClick={() => router.replace(t.id === NEWS_CONFIG.group.id ? "/feed" : `/feed?m=${t.id}`, { scroll: false })}
          >
            {t.label}
          </button>
        ))}
      </div>

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
        <ul className={`card ${styles.list}`}>
          {items.map((item) => (
            <FeedRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      <p className={styles.note}>구글 뉴스·빙 뉴스 검색 결과를 모아 보여 줘요. 기사를 누르면 언론사 원문으로 이동해요.</p>
    </main>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  const [broken, setBroken] = useState(false);
  return (
    <li>
      <a href={item.link} target="_blank" rel="noopener noreferrer" className={styles.row}>
        <span className={styles.body}>
          <strong>{item.title}</strong>
          <small className="num">
            {item.source} · {agoLabel(item.publishedAt)}
          </small>
          {item.members.length > 0 && (
            <span className={styles.tags}>
              {item.members.map((m) => (
                <span key={m} className={styles.tag}>
                  {memberLabel.get(m)}
                </span>
              ))}
            </span>
          )}
        </span>
        {/* 썸네일: 없거나 못 불러오면 기본 그림 (목록은 그대로) */}
        {item.image && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element -- 외부 뉴스 썸네일 (최적화 서버 없음)
          <img src={item.image} alt="" loading="lazy" className={styles.thumb} onError={() => setBroken(true)} />
        ) : (
          <span className={`${styles.thumb} ${styles.thumbEmpty}`} aria-hidden>
            <Newspaper size={18} />
          </span>
        )}
      </a>
    </li>
  );
}
