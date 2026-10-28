"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight, Clock3, Inbox, Plus, Search, X } from "lucide-react";
import HomeLink from "@/components/HomeLink";
import ScheduleRow from "@/components/ScheduleRow";
import { Empty, Loading } from "@/components/ui";
import { CATEGORIES, getCategory, isCategoryId } from "@/lib/categories";
import { addMonths, datePart, formatDate, isDateKey, monthGrid, parseLocal, todayKey, WEEKDAYS } from "@/lib/date";
import { inFocus, useFocusArtist } from "@/lib/focus";
import { useArtists, useStoreQuery } from "@/lib/hooks";
import { setPrefs, usePrefs } from "@/lib/prefs";
import type { Artist, Schedule, VoteSite } from "@/lib/storage/types";
import VoteCard from "@/features/vote/VoteCard";
import styles from "./CalendarScreen.module.css";

export default function CalendarScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const prefs = usePrefs();
  const view = (params.get("view") as "month" | "list" | null) ?? prefs.calendarView;
  const today = todayKey();
  const selected = isDateKey(params.get("date")) ? params.get("date")! : today;

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    router.replace(`/calendar?${next.toString()}`, { scroll: false });
  };

  const switchView = (v: "month" | "list") => {
    setPrefs({ calendarView: v });
    setParams({ view: v });
  };

  // 보기 방식 › 그 보기의 세부 조작(월 이동 / 기간)을 한 줄에
  const switcher = (
    <>
      <div className="segmented" role="group" aria-label="보기 방식">
        <button type="button" aria-pressed={view === "month"} onClick={() => switchView("month")}>
          월간
        </button>
        <button type="button" aria-pressed={view === "list"} onClick={() => switchView("list")}>
          목록
        </button>
      </div>
      <ChevronRight size={15} className={styles.toolbarSep} aria-hidden />
    </>
  );

  return (
    <main>
      <header className="page-header">
        <HomeLink />
        <h1>캘린더</h1>
        <div className="header-actions">
          <Link href="/search" className="icon-btn" aria-label="일정 검색">
            <Search size={20} />
          </Link>
          <Link href={`/calendar/day?date=${selected}`} className="icon-btn" aria-label="하루 타임라인">
            <Clock3 size={20} />
          </Link>
        </div>
      </header>

      {view === "month" ? (
        <MonthView switcher={switcher} selected={selected} today={today} onSelect={(date) => setParams({ date })} />
      ) : (
        <ListView
          switcher={switcher}
          category={isCategoryId(params.get("cat")) ? params.get("cat") : null}
          artistId={params.get("artist")}
          past={params.get("range") === "past"}
          onChange={setParams}
        />
      )}
    </main>
  );
}

function MonthView({ switcher, selected, today, onSelect }: { switcher: ReactNode; selected: string; today: string; onSelect: (date: string) => void }) {
  const prefs = usePrefs();
  const { map } = useArtists();
  const sel = parseLocal(selected);
  const year = sel.getFullYear();
  const month = sel.getMonth();
  const grid = monthGrid(year, month, prefs.weekStart);
  const from = grid[0].key;
  const to = grid[grid.length - 1].key;
  const { data } = useStoreQuery((s) => s.schedules.listInRange(from, to), `month:${from}`);
  const { focus } = useFocusArtist();
  const { data: votes } = useStoreQuery((s) => (prefs.showVoteDeadlines ? s.votes.list() : Promise.resolve([])), `month-votes:${prefs.showVoteDeadlines}`);

  const byDay = new Map<string, Schedule[]>();
  for (const s of (data ?? []).filter((x) => inFocus(x.artistIds, focus))) {
    for (const cell of grid) {
      if (datePart(s.startAt) <= cell.key && datePart(s.endAt) >= cell.key) {
        byDay.set(cell.key, [...(byDay.get(cell.key) ?? []), s]);
      }
    }
  }
  const dayList = byDay.get(selected) ?? [];
  // 설정에서 켠 경우만: 마감일별 투표
  const dueByDay = new Map<string, VoteSite[]>();
  for (const v of votes ?? []) if (v.endDate && inFocus(v.artistIds, focus)) dueByDay.set(v.endDate, [...(dueByDay.get(v.endDate) ?? []), v]);
  const dueList = dueByDay.get(selected) ?? [];
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => (i + prefs.weekStart) % 7);

  const moveMonth = (delta: number) => {
    const m = addMonths(year, month, delta);
    const lastDay = new Date(m.year, m.month + 1, 0).getDate();
    const day = Math.min(sel.getDate(), lastDay);
    onSelect(`${m.year}-${String(m.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  };

  return (
    <>
      <div className={styles.toolbar}>
        {switcher}
        <div className={styles.monthNav}>
          <button type="button" className="icon-btn sm" onClick={() => moveMonth(-1)} aria-label="이전 달">
            <ChevronLeft size={17} />
          </button>
          <h2 className="num">
            {year}. <b>{String(month + 1).padStart(2, "0")}</b>
          </h2>
          <button type="button" className="icon-btn sm" onClick={() => moveMonth(1)} aria-label="다음 달">
            <ChevronRight size={17} />
          </button>
        </div>
        <span className="spacer" />
        {selected !== today && (
          <button type="button" className="chip" onClick={() => onSelect(today)}>
            오늘
          </button>
        )}
      </div>

      <section className={`card ${styles.grid}`} aria-label={`${year}년 ${month + 1}월`}>
        {weekdayLabels.map((w) => (
          <span key={w} className={styles.weekday} data-weekday={w}>
            {WEEKDAYS[w]}
          </span>
        ))}
        {grid.map((cell) => {
          const items = byDay.get(cell.key) ?? [];
          const cats = [...new Set(items.map((i) => i.category))].slice(0, 3);
          return (
            <button
              key={cell.key}
              type="button"
              className={styles.cell}
              data-out={!cell.inMonth}
              data-weekday={cell.weekday}
              aria-pressed={cell.key === selected}
              aria-label={`${formatDate(cell.key)} 일정 ${items.length}개${dueByDay.has(cell.key) ? `, 투표 마감 ${dueByDay.get(cell.key)!.length}개` : ""}`}
              onClick={() => onSelect(cell.key)}
            >
              <span className={`${styles.dayNum} num`} data-today={cell.key === today}>
                {cell.day}
              </span>
              <span className={styles.dots}>
                {cats.map((c) => (
                  <span key={c} style={{ background: getCategory(c).colors[0] }} />
                ))}
                {dueByDay.has(cell.key) && <span className={styles.voteDot} />}
              </span>
            </button>
          );
        })}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>
            {formatDate(selected)} <span className="muted num">{dayList.length}</span>
          </h2>
          <Link href={`/calendar/day?date=${selected}`}>타임라인</Link>
        </div>
        {dayList.length ? (
          <div className="stack">
            {dayList.map((s) => (
              <ScheduleRow key={s.id} schedule={s} artists={map} hour12={prefs.hour12} />
            ))}
          </div>
        ) : (
          <div className="card-flat">
            <Empty
              icon={CalendarDays}
              action={
                <Link href={`/schedule/new?date=${selected}`} className="btn btn-ghost btn-sm">
                  <Plus size={15} /> 이 날 일정 등록
                </Link>
              }
            >
              등록된 일정이 없어요.
            </Empty>
          </div>
        )}
      </section>

      {dueList.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>
              이 날 마감하는 투표 <span className="muted num">{dueList.length}</span>
            </h2>
            <Link href="/votes">투표</Link>
          </div>
          <div className="stack">
            {dueList.map((v) => (
              <VoteCard key={v.id} vote={v} artists={map} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function ListView({
  switcher,
  category,
  artistId,
  past,
  onChange,
}: {
  switcher: ReactNode;
  category: string | null;
  artistId: string | null;
  past: boolean;
  onChange: (patch: Record<string, string | null>) => void;
}) {
  const prefs = usePrefs();
  const { map } = useArtists();
  const { data, loading } = useStoreQuery((s) => s.schedules.list(), "all-schedules");
  const { focus } = useFocusArtist();
  const today = todayKey();
  const artist: Artist | undefined = artistId ? map.get(artistId) : undefined;

  const filtered = (data ?? [])
    .filter((s) => inFocus(s.artistIds, focus))
    .filter((s) => (past ? datePart(s.endAt) < today : datePart(s.endAt) >= today))
    .filter((s) => !category || s.category === category)
    .filter((s) => !artistId || s.artistIds.includes(artistId));
  if (past) filtered.reverse();

  const groups = new Map<string, Schedule[]>();
  for (const s of filtered) {
    const key = s.startAt.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }

  return (
    <>
      <div className={styles.toolbar}>
        {switcher}
        <div className="segmented" role="group" aria-label="기간">
          <button type="button" aria-pressed={!past} onClick={() => onChange({ range: null })}>
            다가오는
          </button>
          <button type="button" aria-pressed={past} onClick={() => onChange({ range: "past" })}>
            지난 일정
          </button>
        </div>
      </div>
      <div className="chips" role="group" aria-label="카테고리">
        {artist && (
          <button type="button" className="chip" aria-pressed onClick={() => onChange({ artist: null })}>
            {artist.name} <X size={14} />
          </button>
        )}
        <button type="button" className="chip" aria-pressed={!category} onClick={() => onChange({ cat: null })}>
          전체
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" className="chip" aria-pressed={category === c.id} onClick={() => onChange({ cat: c.id })}>
            <span className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: c.colors[0] }} />
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : groups.size === 0 ? (
        <div className="card-flat" style={{ marginTop: 12 }}>
          <Empty icon={past ? Inbox : CalendarOff}>{past ? "지난 일정이 없어요." : "조건에 맞는 다가오는 일정이 없어요."}</Empty>
        </div>
      ) : (
        [...groups.entries()].map(([ym, items]) => {
          const [y, m] = ym.split("-");
          return (
            <section key={ym} className="section" style={{ marginTop: 20 }}>
              <div className="section-head">
                <h2 className="num">
                  {y}년 {Number(m)}월
                </h2>
                <span className="muted num" style={{ fontSize: 13 }}>
                  {items.length}
                </span>
              </div>
              <div className="stack">
                {items.map((s) => (
                  <ScheduleRow key={s.id} schedule={s} artists={map} hour12={prefs.hour12} showDate />
                ))}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
