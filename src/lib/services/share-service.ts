import { downloadBlob } from "../image/image-service";
import { getCategory } from "../categories";
import { addDays, datePart, formatDate, timePart } from "../date";
import type { Artist, Schedule } from "../storage/types";

export function scheduleSummary(schedule: Schedule, artists: Artist[]) {
  const names = artists.map((a) => a.name).join(", ");
  const when = schedule.allDay
    ? formatDate(datePart(schedule.startAt))
    : `${formatDate(datePart(schedule.startAt))} ${timePart(schedule.startAt)}`;
  return [
    `[${getCategory(schedule.category).label}] ${schedule.title}`,
    names && `아티스트: ${names}`,
    `일시: ${when}`,
    schedule.place && `장소: ${schedule.place}`,
    schedule.url && `링크: ${schedule.url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export type TextShareResult = "shared" | "copied" | "cancelled" | "failed";

/** 일정 정보를 텍스트로 공유. Web Share 를 못 쓰면 클립보드에 복사 */
export async function shareText(title: string, text: string): Promise<TextShareResult> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

const escapeIcs = (value: string) => value.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
const icsStamp = (stamp: string) => stamp.replace(/[-:]/g, "") + "00";

/** 내 캘린더 앱에 추가할 수 있는 .ics 파일 생성 */
export function buildIcs(schedule: Schedule, artists: Artist[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//wyd now//KO",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${schedule.id}@wyd-now`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    ...(schedule.allDay
      ? [
          `DTSTART;VALUE=DATE:${datePart(schedule.startAt).replace(/-/g, "")}`,
          `DTEND;VALUE=DATE:${addDays(datePart(schedule.endAt), 1).replace(/-/g, "")}`,
        ]
      : [`DTSTART:${icsStamp(schedule.startAt)}`, `DTEND:${icsStamp(schedule.endAt)}`]),
    `SUMMARY:${escapeIcs(schedule.title)}`,
    schedule.place && `LOCATION:${escapeIcs(schedule.place)}`,
    schedule.url && `URL:${schedule.url}`,
    `DESCRIPTION:${escapeIcs(scheduleSummary(schedule, artists))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export function downloadIcs(schedule: Schedule, artists: Artist[]) {
  const blob = new Blob([buildIcs(schedule, artists)], { type: "text/calendar;charset=utf-8" });
  downloadBlob(blob, `${schedule.title.replace(/[\\/:*?"<>|]+/g, "_")}.ics`);
}

export function mapSearchUrl(place: string) {
  return `https://map.naver.com/p/search/${encodeURIComponent(place)}`;
}
