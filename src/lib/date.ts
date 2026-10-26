/*
 * 날짜 유틸. 일정 시각은 시간대 없는 로컬 문자열(YYYY-MM-DDTHH:mm)로 다룹니다.
 */

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
export const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toLocalStamp(d: Date) {
  return `${toDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** YYYY-MM-DD 또는 YYYY-MM-DDTHH:mm → Date (로컬) */
export function parseLocal(value: string) {
  const [date, time = "00:00"] = value.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export function isDateKey(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseLocal(value).getTime());
}

export function todayKey() {
  return toDateKey(new Date());
}

export function nowStamp() {
  return toLocalStamp(new Date());
}

export function addDays(key: string, days: number) {
  const d = parseLocal(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function addMonths(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function datePart(stamp: string) {
  return stamp.slice(0, 10);
}

export function timePart(stamp: string) {
  return stamp.slice(11, 16);
}

/** 달력 격자 (앞뒤 달 포함, 6주) */
export function monthGrid(year: number, month: number, weekStart: 0 | 1) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { key: toDateKey(d), day: d.getDate(), inMonth: d.getMonth() === month, weekday: d.getDay() };
  });
}

export function weekDays(key: string, weekStart: 0 | 1) {
  const d = parseLocal(key);
  const offset = (d.getDay() - weekStart + 7) % 7;
  return Array.from({ length: 7 }, (_, i) => addDays(key, i - offset));
}

export function formatDate(key: string, withWeekday = true) {
  const d = parseLocal(key);
  const base = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  return withWeekday ? `${base} (${WEEKDAYS[d.getDay()]})` : base;
}

export function formatShortDate(key: string) {
  const d = parseLocal(key);
  return `${d.getMonth() + 1}.${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}

export function formatTime(time: string, hour12: boolean) {
  if (!hour12) return time;
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "오전" : "오후";
  return `${suffix} ${h % 12 === 0 ? 12 : h % 12}:${pad(m)}`;
}

export function durationLabel(startAt: string, endAt: string) {
  const minutes = Math.round((parseLocal(endAt).getTime() - parseLocal(startAt).getTime()) / 60000);
  if (minutes <= 0) return "";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  return [days && `${days}일`, hours && `${hours}시간`, mins && `${mins}분`].filter(Boolean).join(" ");
}

/** 오늘 기준 D-day 라벨 */
export function dDay(key: string) {
  const diff = Math.round((parseLocal(key).getTime() - parseLocal(todayKey()).getTime()) / 86400000);
  if (diff === 0) return "D-DAY";
  return diff > 0 ? `D-${diff}` : `D+${-diff}`;
}

export function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}

/** 오늘 기준 상대 날짜: 오늘 · 어제 · 3일 전 · 2주 전 · 그 이상은 날짜 */
export function timeAgo(key: string) {
  const diff = Math.round((parseLocal(todayKey()).getTime() - parseLocal(key).getTime()) / 86400000);
  if (diff <= 0) return diff === 0 ? "오늘" : formatShortDate(key);
  if (diff === 1) return "어제";
  if (diff < 7) return `${diff}일 전`;
  if (diff < 35) return `${Math.floor(diff / 7)}주 전`;
  return formatShortDate(key);
}
