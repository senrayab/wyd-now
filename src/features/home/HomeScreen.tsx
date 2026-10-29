"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Search, SlidersHorizontal, Vote } from "lucide-react";
import Illustration from "@/components/Illustration";
import { useFeedback } from "@/components/Feedback";
import { ArtistAvatar, Loading, Spinner } from "@/components/ui";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { addDays, datePart, dDay, formatShortDate, formatTime, MONTHS_EN, nowStamp, parseLocal, timePart, todayKey, WEEKDAYS_EN, weekDays } from "@/lib/date";
import { inFocus, useFocusArtist } from "@/lib/focus";
import { useArtists, useStoreQuery } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import { loadRiizeTestData } from "@/lib/services/riize-test-data";
import type { Artist, Schedule } from "@/lib/storage/types";
import { FEED_TOPIC, fetchFeed, isStale, readFeedCache, type Feed } from "@/lib/services/riize-news";
import { FeedList } from "@/features/feed/FeedScreen";
import styles from "./HomeScreen.module.css";

const onDay = (s: Schedule, key: string) => datePart(s.startAt) <= key && datePart(s.endAt) >= key;

const AGENDA_LIMIT = 6;
const LATEST_NEWS = 3;

export default function HomeScreen() {
  const prefs = usePrefs();
  const today = todayKey();
  const { artists, map, loading: artistsLoading } = useArtists();
  const { data, loading } = useStoreQuery((s) => s.schedules.listInRange(addDays(today, -7), addDays(today, 120)), `home:${today}`);
  const { focus } = useFocusArtist();
  const { toast } = useFeedback();
  const [seeding, setSeeding] = useState(false);
  const [range, setRange] = useState<"today" | "week">("today");
  // 홈 카드가 끝없이 길어지지 않게 처음엔 몇 개만, 나머지는 펼쳐서
  const [expanded, setExpanded] = useState(false);
  // 뉴스: 이 기기에 받아 둔 목록을 먼저, 30분이 지났으면 서버 보관본으로 바꿈 (새로고침 버튼과 달리 네이버를 새로 부르지 않음)
  const [feed, setFeed] = useState<Feed | null>(() => readFeedCache(FEED_TOPIC));
  useEffect(() => {
    if (isStale(readFeedCache(FEED_TOPIC))) fetchFeed(FEED_TOPIC).then(setFeed, () => {});
  }, []);

  const d = parseLocal(today);
  // 내 아티스트 전용 모드면 그 아티스트(+ 공용) 항목만
  const all = (data ?? []).filter((s) => inFocus(s.artistIds, focus));
  const now = nowStamp();
  const week = weekDays(today, prefs.weekStart);
  const todays = all.filter((s) => onDay(s, today));
  const weekItems = all.filter((s) => datePart(s.startAt) <= week[6] && datePart(s.endAt) >= today);
  const upcoming = all.filter((s) => s.endAt >= now || (s.allDay && datePart(s.endAt) >= today));
  const next = upcoming[0];
  const isEmpty = !loading && !artistsLoading && all.length === 0 && artists.length === 0;
  const listed = range === "today" ? todays : weekItems;
  const shown = expanded ? listed : listed.slice(0, AGENDA_LIMIT);
  const latest = (feed?.items ?? []).slice(0, LATEST_NEWS);

  async function seed() {
    setSeeding(true);
    try {
      await loadRiizeTestData();
      toast("RIIZE 샘플 데이터를 불러왔어요.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "불러오지 못했어요.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <main>
      <header className="page-header">
        {/* 왼쪽 메뉴가 펼쳐져 있으면 거기 로고가 있어서 숨김 */}
        <span className={`logo ${styles.headLogo}`}>wyd now</span>
        <span className="spacer" />
        {/* 내 아티스트 전용 모드: 검색 앞에 프로필 원 (누르면 아티스트 페이지) */}
        {focus && (
          <Link href={`/artist?id=${focus.id}`} className={styles.focusBtn} aria-label={`${focus.name} 페이지`}>
            <ArtistAvatar artist={focus} size={40} />
          </Link>
        )}
        <Link href="/search" className="icon-btn" aria-label="검색">
          <Search size={18} />
        </Link>
        <Link href="/more/settings" className="icon-btn" aria-label="설정">
          <SlidersHorizontal size={17} />
        </Link>
      </header>

      <section className={styles.title}>
        <span className="num">
          {WEEKDAYS_EN[d.getDay()]}, {MONTHS_EN[d.getMonth()]} {d.getDate()}
        </span>
        <h1>오늘 뭐 해?</h1>
      </section>

      {isEmpty ? (
        <section className={`card ${styles.onboard}`}>
          <Illustration category="concert" className={styles.onboardArt} />
          <h2>아직 등록된 정보가 없어요</h2>
          <p>직접 등록하거나, RIIZE 샘플 데이터로 먼저 둘러보세요.</p>
          <button type="button" className="btn btn-primary btn-block" onClick={seed} disabled={seeding}>
            {seeding ? (
              <>
                <Spinner /> 불러오는 중
              </>
            ) : (
              "RIIZE 샘플로 둘러보기"
            )}
          </button>
          <Link href="/artist/new" className="btn btn-soft btn-block">
            아티스트 직접 등록
          </Link>
        </section>
      ) : loading ? (
        <Loading rows={3} />
      ) : (
        <>
          {/* 카테고리 카드: 첫 카드만 포인트 색 */}
          <CategorySlider>
            {CATEGORIES.map((c, i) => {
              const count = upcoming.filter((s) => s.category === c.id).length;
              return (
                <Link key={c.id} href={`/calendar?view=list&cat=${c.id}`} className={styles.catCard} data-accent={i === 0}>
                  <span className={styles.catCount}>
                    <b className="num">{count}</b>
                    <small>일정</small>
                  </span>
                  <span className={styles.catGo} aria-hidden>
                    <ArrowUpRight size={16} />
                  </span>
                  <Illustration category={c.id} className={styles.catIllo} />
                  <strong>{c.label}</strong>
                  <small className={styles.catDesc}>{c.description}</small>
                </Link>
              );
            })}
          </CategorySlider>

          {/* 오늘 / 이번 주 */}
          <section className={`card ${styles.today}`}>
            <div className={styles.todayHead}>
              <div>
                <h2>{range === "today" ? "오늘의 일정" : "이번 주 일정"}</h2>
                <small className="muted num">{range === "today" ? formatShortDate(today) : `${formatShortDate(today)} – ${formatShortDate(week[6])}`}</small>
              </div>
              <div className="segmented" role="tablist" aria-label="기간">
                <button type="button" role="tab" aria-selected={range === "today"} onClick={() => { setRange("today"); setExpanded(false); }}>
                  오늘
                </button>
                <button type="button" role="tab" aria-selected={range === "week"} onClick={() => { setRange("week"); setExpanded(false); }}>
                  이번 주
                </button>
              </div>
            </div>
            {listed.length > 0 && (
              <ul className={styles.agenda}>
                {shown.map((s) => (
                  <li key={s.id}>
                    <Link href={`/schedule?id=${s.id}`}>
                      <strong>{s.title}</strong>
                      <small className="num">
                        {range === "week" && `${formatShortDate(datePart(s.startAt))} · `}
                        {s.allDay ? "종일" : `${formatTime(timePart(s.startAt), prefs.hour12)} – ${formatTime(timePart(s.endAt), prefs.hour12)}`}
                        {" · "}
                        {getCategory(s.category).label}
                      </small>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {listed.length > AGENDA_LIMIT && (
              <button type="button" className={`btn btn-soft btn-sm btn-block ${styles.more}`} onClick={() => setExpanded((v) => !v)}>
                {expanded ? "접기" : `${listed.length - AGENDA_LIMIT}개 더 보기`}
              </button>
            )}
            {!listed.length && (
              <p className={styles.none}>{range === "today" ? "오늘은 예정된 일정이 없어요." : "이번 주에 남은 일정이 없어요."}</p>
            )}
          </section>

          {/* 다음 일정 */}
          {next && <NextCard schedule={next} artists={map} hour12={prefs.hour12} />}

          {/* 투표: 목록은 투표 메뉴에서, 홈에서는 바로 가는 버튼 하나 */}
          <Link href="/votes" className={`btn btn-soft btn-block ${styles.voteBtn}`}>
            <Vote size={17} /> 투표하러 가기
          </Link>

          {/* 최근 소식: 뉴스 최신 기사 몇 개, 전체는 뉴스 화면에서 */}
          <section className="section">
            <div className="section-head">
              <h2>최근 소식</h2>
              <Link href="/feed">전체</Link>
            </div>
            {latest.length ? (
              <FeedList items={latest} />
            ) : (
              <Link href="/feed" className={`card ${styles.newsEmpty}`}>
                <span>
                  <strong>뉴스 보기</strong>
                  <small>최근 7일 기사를 모아 보여 줘요.</small>
                </span>
                <span className="round-action" aria-hidden>
                  <ArrowUpRight size={15} />
                </span>
              </Link>
            )}
          </section>
        </>
      )}
    </main>
  );
}

/** 가로로 넘기는 카테고리 카드 (넓은 화면에서는 마우스용 양옆 화살표) */
function CategorySlider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdge({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);
  // 카드 몇 장씩 넘김
  const slide = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className={styles.slider}>
      {/* 넘길 카드가 남은 쪽 끝만 흐리게 (잘린 느낌 대신 이어진다는 느낌) */}
      <div ref={ref} className={styles.scroller} data-more-start={!edge.start || undefined} data-more-end={!edge.end || undefined}>
        {children}
      </div>
      <button type="button" className={styles.slideBtn} data-side="prev" onClick={() => slide(-1)} disabled={edge.start} aria-label="이전 카테고리">
        <ChevronLeft size={18} />
      </button>
      <button type="button" className={styles.slideBtn} data-side="next" onClick={() => slide(1)} disabled={edge.end} aria-label="다음 카테고리">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

/** 다음 일정: 회색 무대 위 일러스트 + 검정 원형 버튼 */
function NextCard({ schedule, artists, hour12 }: { schedule: Schedule; artists: Map<string, Artist>; hour12: boolean }) {
  const category = getCategory(schedule.category);
  const names = schedule.artistIds.map((id) => artists.get(id)?.name).filter(Boolean).join(", ");
  const date = datePart(schedule.startAt);
  return (
    <Link href={`/schedule?id=${schedule.id}`} className={`card ${styles.next}`}>
      <div className={styles.stage}>
        <span className="eyebrow">Next up · {dDay(date)}</span>
        <Illustration category={schedule.category} className={styles.stageIllo} />
        <span className={styles.fab} aria-hidden>
          <ArrowUpRight size={20} />
        </span>
      </div>
      <div className={styles.nextBody}>
        <small>{names || category.label}</small>
        <strong>{schedule.title}</strong>
        <p className="num">
          {formatShortDate(date)} · {schedule.allDay ? "종일" : formatTime(timePart(schedule.startAt), hour12)}
          {schedule.place && ` · ${schedule.place}`}
        </p>
      </div>
    </Link>
  );
}
