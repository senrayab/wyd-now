"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useBack } from "@/components/PageHeader";
import { ArtistAvatar, Empty } from "@/components/ui";
import { getCategory } from "@/lib/categories";
import { addDays, datePart, durationLabel, formatTime, isDateKey, nowStamp, parseLocal, timePart, todayKey, WEEKDAYS, weekDays } from "@/lib/date";
import { useArtists, useStoreQuery } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import type { Artist, Schedule } from "@/lib/storage/types";
import styles from "./DayScreen.module.css";

/** 하루 일정을 시간순 카드로: 왼쪽 시간, 오른쪽 카드. 진행 중인 일정은 강조하고 안내를 펼쳐 보여줌 */
export default function DayScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const prefs = usePrefs();
  const { map } = useArtists();
  const today = todayKey();
  const date = isDateKey(params.get("date")) ? params.get("date")! : today;
  const back = useBack(`/calendar?date=${date}`);
  const week = weekDays(date, prefs.weekStart);
  const { data } = useStoreQuery((s) => s.schedules.listInRange(week[0], week[6]), `week:${week[0]}`);

  const all = data ?? [];
  const onDay = all
    .filter((s) => datePart(s.startAt) <= date && datePart(s.endAt) >= date)
    .sort((a, b) => Number(!a.allDay) - Number(!b.allDay) || a.startAt.localeCompare(b.startAt));
  const now = nowStamp();
  // 지금 진행 중인 일정, 없으면 다음 일정을 꽉 찬 점으로
  const currentId = (onDay.find((s) => !s.allDay && s.startAt <= now && s.endAt >= now) ?? onDay.find((s) => s.endAt >= now))?.id;
  const go = (d: string) => router.replace(`/calendar/day?date=${d}`, { scroll: false });
  const month = parseLocal(week[3]);

  return (
    <main>
      <header className={styles.header}>
        <button type="button" className="icon-btn" onClick={back} aria-label="뒤로">
          <ChevronLeft size={20} />
        </button>
        <div className={styles.titleBlock}>
          <h1>타임라인</h1>
          <p>하루 일정을 시간순으로 확인해요.</p>
        </div>
        <Link href={`/calendar?date=${date}`} className="icon-btn" aria-label="월간 캘린더">
          <CalendarDays size={18} />
        </Link>
      </header>

      <div className={styles.monthRow}>
        <h2 className="num">
          {month.getFullYear()}년 {month.getMonth() + 1}월
        </h2>
        <div className="row">
          <button type="button" className="icon-btn sm" onClick={() => go(addDays(date, -7))} aria-label="이전 주">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="icon-btn sm" onClick={() => go(addDays(date, 7))} aria-label="다음 주">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className={styles.week}>
        {week.map((key) => {
          const wd = parseLocal(key);
          const has = all.some((s) => datePart(s.startAt) <= key && datePart(s.endAt) >= key);
          return (
            <button key={key} type="button" className={styles.day} aria-pressed={key === date} data-today={key === today} onClick={() => go(key)}>
              <small>{WEEKDAYS[wd.getDay()]}</small>
              <span className="num">{wd.getDate()}</span>
              <i data-has={has} />
            </button>
          );
        })}
      </div>

      {onDay.length === 0 ? (
        <div className="card" style={{ marginTop: 18 }}>
          <Empty
            emoji="🫧"
            action={
              <Link href={`/schedule/new?date=${date}`} className="btn btn-primary btn-sm">
                <Plus size={15} /> 일정 등록
              </Link>
            }
          >
            이 날은 일정이 없어요.
          </Empty>
        </div>
      ) : (
        <ol className={styles.list}>
          {onDay.map((s) => (
            <TimelineRow key={s.id} schedule={s} date={date} hour12={prefs.hour12} artists={map} live={!s.allDay && s.startAt <= now && s.endAt >= now} current={s.id === currentId} />
          ))}
        </ol>
      )}
    </main>
  );
}

function TimelineRow({ schedule, date, hour12, artists, live, current }: { schedule: Schedule; date: string; hour12: boolean; artists: Map<string, Artist>; live: boolean; current: boolean }) {
  const c = getCategory(schedule.category);
  const Icon = c.icon;
  const startsHere = datePart(schedule.startAt) === date;
  const time = schedule.allDay || !startsHere ? "종일" : formatTime(timePart(schedule.startAt), hour12);
  const duration = schedule.allDay ? "종일" : durationLabel(schedule.startAt, schedule.endAt) || formatTime(timePart(schedule.startAt), hour12);
  const linked = schedule.artistIds.map((id) => artists.get(id)).filter((a): a is Artist => !!a);

  return (
    <li className={styles.item}>
      <span className={`${styles.time} num`}>{time}</span>
      <span className={styles.rail} data-current={current} aria-hidden />
      <Link href={`/schedule?id=${schedule.id}`} className={styles.card} data-live={live}>
        <div className={styles.cardTop}>
          <span className={styles.icon} style={{ color: c.colors[0] }} aria-hidden>
            {live ? <i className={styles.liveDot} /> : <Icon size={18} />}
          </span>
          <span className={styles.text}>
            <strong>{schedule.title}</strong>
            <small className="num">
              {c.label} · {duration}
            </small>
          </span>
          {linked.length > 0 && (
            <span className={styles.faces}>
              {linked.slice(0, 3).map((a) => (
                <ArtistAvatar key={a.id} artist={a} size={26} />
              ))}
            </span>
          )}
          <ChevronRight size={16} className="muted" />
        </div>
        {live && schedule.description && <p className={styles.note}>{schedule.description}</p>}
      </Link>
    </li>
  );
}
