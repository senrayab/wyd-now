"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import Illustration from "@/components/Illustration";
import { useFeedback } from "@/components/Feedback";
import { ArtistAvatar, Loading, Spinner } from "@/components/ui";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { addDays, datePart, dDay, formatShortDate, formatTime, MONTHS_EN, nowStamp, parseLocal, timePart, todayKey, WEEKDAYS_EN, weekDays } from "@/lib/date";
import { useArtists, useStoreQuery } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import { loadRiizeTestData } from "@/lib/services/riize-test-data";
import { getVoteType, sortVotes, voteStatus } from "@/lib/services/vote-service";
import type { Artist, Schedule } from "@/lib/storage/types";
import NewsTimeline from "@/features/news/NewsTimeline";
import styles from "./HomeScreen.module.css";

const onDay = (s: Schedule, key: string) => datePart(s.startAt) <= key && datePart(s.endAt) >= key;

const AGENDA_LIMIT = 6;

export default function HomeScreen() {
  const prefs = usePrefs();
  const today = todayKey();
  const { artists, map, loading: artistsLoading } = useArtists();
  const { data, loading } = useStoreQuery((s) => s.schedules.listInRange(addDays(today, -7), addDays(today, 120)), `home:${today}`);
  const { data: spaces } = useStoreQuery((s) => s.mySpaces.list(), "spaces");
  const { data: votes } = useStoreQuery((s) => s.votes.list(), "votes");
  const { data: news } = useStoreQuery((s) => s.news.list(), "news");
  const { toast } = useFeedback();
  const [seeding, setSeeding] = useState(false);
  const [range, setRange] = useState<"today" | "week">("today");
  // 홈 카드가 끝없이 길어지지 않게 처음엔 몇 개만, 나머지는 펼쳐서
  const [expanded, setExpanded] = useState(false);

  const d = parseLocal(today);
  const all = data ?? [];
  const now = nowStamp();
  const week = weekDays(today, prefs.weekStart);
  const todays = all.filter((s) => onDay(s, today));
  const weekItems = all.filter((s) => datePart(s.startAt) <= week[6] && datePart(s.endAt) >= today);
  const upcoming = all.filter((s) => s.endAt >= now || (s.allDay && datePart(s.endAt) >= today));
  const next = upcoming[0];
  const followed = artists.filter((a) => spaces?.some((sp) => sp.artistId === a.id && sp.followed));
  const liveVotes = sortVotes(votes ?? []).filter((v) => voteStatus(v).kind !== "closed");
  const isEmpty = !loading && !artistsLoading && all.length === 0 && artists.length === 0;
  const listed = range === "today" ? todays : weekItems;
  const shown = expanded ? listed : listed.slice(0, AGENDA_LIMIT);

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
        <span className="logo">wyd now</span>
        <span className="spacer" />
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
          <div className={styles.scroller}>
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
          </div>

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

          {/* 작은 위젯 두 개 */}
          <div className={styles.widgets}>
            <Link href={next ? `/schedule?id=${next.id}` : "/calendar"} className={`card ${styles.widget}`}>
              <span className="eyebrow">Next</span>
              <b className={`${styles.big} num`}>{next ? dDay(datePart(next.startAt)) : "—"}</b>
              <small>{next ? next.title : "예정된 일정 없음"}</small>
            </Link>
            <Link href="/artists" className={`card ${styles.widget}`}>
              <span className={styles.faces}>
                {(followed.length ? followed : artists).slice(0, 4).map((a) => (
                  <ArtistAvatar key={a.id} artist={a} size={34} />
                ))}
              </span>
              <strong>팔로우 {followed.length}팀</strong>
              <small>아티스트 {artists.length}팀 등록</small>
            </Link>
          </div>

          {/* 투표 */}
          <section className={`card ${styles.votes}`}>
            <div className={styles.votesHead}>
              <h2>투표</h2>
              <Link href="/votes" className="btn btn-soft btn-sm">
                전체 보기
              </Link>
            </div>
            {liveVotes.length ? (
              liveVotes.slice(0, 4).map((v) => {
                const type = getVoteType(v.type);
                const Icon = type.icon;
                return (
                  <div key={v.id} className={styles.voteRow}>
                    <Link href={`/vote?id=${v.id}`} className={styles.voteMain}>
                      <span className="list-icon">
                        <Icon size={17} />
                      </span>
                      <span>
                        <strong>{v.name}</strong>
                        <small className="num">
                          {voteStatus(v).label} · {type.label}
                        </small>
                      </span>
                    </Link>
                    {v.url && (
                      <a href={v.url} target="_blank" rel="noopener noreferrer" className="round-action" aria-label={`${v.name} 열기`}>
                        <ArrowUpRight size={15} />
                      </a>
                    )}
                  </div>
                );
              })
            ) : (
              <p className={styles.none}>
                모아 둔 투표 사이트가 없어요. <Link href="/votes">투표 사이트 모으기</Link>
              </p>
            )}
          </section>

          {/* 최근 소식 */}
          <section className="section">
            <div className="section-head">
              <h2>최근 소식</h2>
              <Link href="/news">전체</Link>
            </div>
            {news && news.length ? (
              <NewsTimeline items={news.slice(0, 2)} artists={map} />
            ) : (
              <Link href="/news/new" className={`card ${styles.newsEmpty}`}>
                <span>
                  <strong>아티스트 소식 모으기</strong>
                  <small>기사와 공식 소식을 타임라인으로 모아 보세요.</small>
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
