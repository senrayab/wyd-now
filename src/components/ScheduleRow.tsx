"use client";

import Link from "next/link";
import { getCategory } from "@/lib/categories";
import { datePart, formatShortDate, formatTime, timePart } from "@/lib/date";
import { useImageUrl } from "@/lib/hooks";
import type { Artist, Schedule } from "@/lib/storage/types";
import styles from "./ScheduleRow.module.css";

interface Props {
  schedule: Schedule;
  artists: Map<string, Artist>;
  hour12: boolean;
  showDate?: boolean;
  /** 시간대별로 묶인 목록 안에서는 시간을 생략 */
  hideTime?: boolean;
  /** 지난 일정: 비활성 모습(흐린 배경·글자) */
  past?: boolean;
}

export default function ScheduleRow({ schedule, artists, hour12, showDate, hideTime, past }: Props) {
  const category = getCategory(schedule.category);
  const Icon = category.icon;
  const { url } = useImageUrl(schedule.imageId);
  const names = schedule.artistIds.map((id) => artists.get(id)?.name).filter(Boolean).join(", ");
  const sub = [names, schedule.place].filter(Boolean).join(" · ");

  return (
    <Link href={`/schedule?id=${schedule.id}`} className={styles.row} data-past={past || undefined}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- IndexedDB blob URL
        <img src={url} alt="" className={styles.thumb} />
      ) : (
        <span className={styles.icon} style={{ color: category.colors[0] }} role="img" aria-label={category.label}>
          <Icon size={20} />
        </span>
      )}
      <div className={styles.body}>
        <span className={styles.cat} style={{ color: category.colors[0] }}>
          {category.label}
        </span>
        <strong>{schedule.title}</strong>
        {sub && <small>{sub}</small>}
      </div>
      {!hideTime && (
      <div className={styles.when}>
        <span className={`${styles.time} num`}>
          {schedule.allDay ? "종일" : formatTime(timePart(schedule.startAt), hour12)}
        </span>
        {showDate && <span className={`${styles.date} num`}>{formatShortDate(datePart(schedule.startAt))}</span>}
      </div>
      )}
    </Link>
  );
}
