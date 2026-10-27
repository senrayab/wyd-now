"use client";

import Link from "next/link";
import { formatShortDate, timeAgo } from "@/lib/date";
import { useImageUrl } from "@/lib/hooks";
import { hostOf, tidySummary } from "@/lib/services/news-service";
import type { Artist, NewsItem } from "@/lib/storage/types";
import styles from "./News.module.css";

/** 날짜별로 묶은 기사 목록: 날짜 라벨 + 흰 카드 안의 기사 줄 */
export default function NewsTimeline({ items, artists }: { items: NewsItem[]; artists: Map<string, Artist> }) {
  const groups = new Map<string, NewsItem[]>();
  for (const item of items) groups.set(item.publishedAt, [...(groups.get(item.publishedAt) ?? []), item]);

  return (
    <div className={styles.feed}>
      {[...groups.entries()].map(([date, list]) => (
        <section key={date} className={styles.group}>
          <h3 className={`eyebrow ${styles.groupLabel}`}>
            {timeAgo(date)}
            {/* 오래된 날짜는 timeAgo 가 이미 날짜라 중복 표시하지 않음 */}
            {timeAgo(date) !== formatShortDate(date) && <span className="num"> · {formatShortDate(date)}</span>}
          </h3>
          <ul className={styles.list}>
            {list.map((item) => (
              <NewsRow key={item.id} item={item} artists={artists} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function NewsRow({ item, artists }: { item: NewsItem; artists: Map<string, Artist> }) {
  const { url } = useImageUrl(item.imageId);
  const names = item.artistIds.map((id) => artists.get(id)?.name).filter(Boolean).join(", ");
  const source = item.source || hostOf(item.url);

  return (
    <li>
      {/* 북마크는 상세 화면에서. 목록은 썸네일까지 한 덩어리로 눌러 상세로 */}
      <Link href={`/news/view?id=${item.id}`} className={styles.row}>
        <span className={styles.rowMain}>
          <span className={styles.meta}>{[source, names].filter(Boolean).join(" · ")}</span>
          <strong>{item.title}</strong>
          {item.summary && <small>{tidySummary(item.summary)}</small>}
        </span>
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- IndexedDB blob URL
          <img src={url} alt="" className={styles.thumb} />
        )}
      </Link>
    </li>
  );
}
