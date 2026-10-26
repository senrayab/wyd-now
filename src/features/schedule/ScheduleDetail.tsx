"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CalendarPlus, ChevronLeft, ExternalLink, Globe, Info, MapPin, Pencil, Share2, Trash2 } from "lucide-react";
import ImageActions from "@/components/ImageActions";
import { useBack } from "@/components/PageHeader";
import { useFeedback } from "@/components/Feedback";
import Illustration from "@/components/Illustration";
import { ArtistAvatar, Empty, Loading } from "@/components/ui";
import { getCategory } from "@/lib/categories";
import { datePart, dDay, durationLabel, formatDate, formatTime, timePart } from "@/lib/date";
import { useArtists, useImageUrl, useStoreQuery } from "@/lib/hooks";
import { tint } from "@/lib/palette";
import { usePrefs } from "@/lib/prefs";
import { deleteSchedule } from "@/lib/services/schedule-service";
import { downloadIcs, mapSearchUrl, scheduleSummary, shareText } from "@/lib/services/share-service";
import styles from "./ScheduleDetail.module.css";

export default function ScheduleDetail() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const prefs = usePrefs();
  const back = useBack("/calendar");
  const { toast, confirm } = useFeedback();
  const { map } = useArtists();
  const { data: schedule, loading } = useStoreQuery((s) => s.schedules.get(id), `schedule:${id}`);
  const { url: imageUrl, image } = useImageUrl(schedule?.imageId);

  if (loading) return <div style={{ paddingTop: 96 }}><Loading /></div>;
  if (!schedule) {
    return (
      <main style={{ paddingTop: 80 }}>
        <Empty emoji="🔍" action={<Link href="/calendar" className="btn btn-primary btn-sm">캘린더로 가기</Link>}>
          일정을 찾을 수 없어요. 삭제되었거나 주소가 잘못되었어요.
        </Empty>
      </main>
    );
  }

  const category = getCategory(schedule.category);
  const artists = schedule.artistIds.map((a) => map.get(a)).filter((a) => !!a);
  const startDate = datePart(schedule.startAt);
  const endDate = datePart(schedule.endAt);
  const time = (stamp: string) => formatTime(timePart(stamp), prefs.hour12);
  const duration = schedule.allDay ? "" : durationLabel(schedule.startAt, schedule.endAt);

  async function onShare() {
    const result = await shareText(schedule!.title, scheduleSummary(schedule!, artists));
    if (result === "copied") toast("일정 정보를 복사했어요.");
    if (result === "failed") toast("공유하지 못했어요.");
  }

  async function onDelete() {
    const ok = await confirm({ title: "일정을 삭제할까요?", message: `‘${schedule!.title}’ 일정과 첨부 이미지가 삭제돼요.`, confirmLabel: "삭제", danger: true });
    if (!ok) return;
    await deleteSchedule(schedule!);
    toast("일정을 삭제했어요.");
    router.replace(`/calendar?date=${startDate}`);
  }

  return (
    <main>
      <header className="page-header">
        <button type="button" className="icon-btn" onClick={back} aria-label="뒤로">
          <ChevronLeft size={20} />
        </button>
        <span className="spacer" />
        <button type="button" className="icon-btn" onClick={onShare} aria-label="일정 정보 공유">
          <Share2 size={17} />
        </button>
      </header>

      {/* 대표 이미지가 있으면 사진, 없으면 카테고리 일러스트 */}
      <div className={styles.hero}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- IndexedDB blob URL
          <img src={imageUrl} alt="" className={styles.heroImg} />
        ) : (
          <Illustration category={schedule.category} className={styles.heroIllo} />
        )}
      </div>

      <article className={`card ${styles.sheet}`}>
        <div className="row">
          <span className="tag" style={{ background: tint(category.colors[0]), color: category.colors[0] }}>
            {category.label}
          </span>
          <span className={`${styles.dday} num`}>{dDay(startDate)}</span>
        </div>
        <h1 className={styles.title}>{schedule.title}</h1>

        <ul className={styles.facts}>
          <li>
            <CalendarDays size={18} />
            <div>
              <strong className="num">
                {formatDate(startDate)}
                {endDate !== startDate && ` – ${formatDate(endDate)}`}
              </strong>
              <small className="num">
                {schedule.allDay ? "종일" : `${time(schedule.startAt)} ~ ${time(schedule.endAt)}`}
                {duration && ` · ${duration}`}
              </small>
            </div>
          </li>
          {schedule.place && (
            <li>
              <MapPin size={18} />
              <div>
                <strong>{schedule.place}</strong>
              </div>
              <a href={mapSearchUrl(schedule.place)} target="_blank" rel="noopener noreferrer" className="chip">
                지도 <ExternalLink size={13} />
              </a>
            </li>
          )}
          {schedule.url && (
            <li>
              <Globe size={18} />
              <a href={schedule.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                {schedule.url.replace(/^https?:\/\//, "")}
              </a>
            </li>
          )}
        </ul>

        {artists.length > 0 && (
          <section className={styles.block}>
            <h2>아티스트</h2>
            <div className={styles.artists}>
              {artists.map((a) => (
                <Link key={a.id} href={`/artist?id=${a.id}`} className={styles.artist}>
                  <ArtistAvatar artist={a} size={32} />
                  {a.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {schedule.description && (
          <section className={styles.block}>
            <h2>
              <Info size={15} /> 안내
            </h2>
            <p className="prose">{schedule.description}</p>
          </section>
        )}

        {schedule.links.length > 0 && (
          <section className={styles.block}>
            <h2>관련 링크</h2>
            <div className={styles.links}>
              {schedule.links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-sm">
                  {l.label} <ExternalLink size={13} />
                </a>
              ))}
            </div>
          </section>
        )}

        {image && (
          <section className={styles.block}>
            <h2>이미지</h2>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              앱에는 WebP로 보관되고, 저장·공유할 때는 PNG 파일로 바뀌어요.
            </p>
            <ImageActions image={image} title={schedule.title} />
          </section>
        )}

        <div className={styles.actions}>
          <button type="button" className="btn btn-soft" onClick={() => downloadIcs(schedule, artists)}>
            <CalendarPlus size={17} /> 내 캘린더에 추가
          </button>
          <div className={styles.actionRow}>
            <Link href={`/schedule/edit?id=${schedule.id}`} className="btn btn-primary" style={{ flex: 1 }}>
              <Pencil size={16} /> 수정
            </Link>
            <button type="button" className="btn btn-danger" onClick={onDelete} aria-label="일정 삭제">
              <Trash2 size={17} />
            </button>
          </div>
        </div>
      </article>
    </main>
  );
}
