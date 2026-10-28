"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Clock3, Copy, ExternalLink, Globe, Pencil, SearchX, Share2, Trash2 } from "lucide-react";
import { Zoomable } from "@/components/ImageZoom";
import PageHeader from "@/components/PageHeader";
import { useFeedback } from "@/components/Feedback";
import { ArtistAvatar, Empty, Loading } from "@/components/ui";
import { artistsToShow, useFocusArtist } from "@/lib/focus";
import { useArtists, useImageUrl, useStoreQuery } from "@/lib/hooks";
import { tint } from "@/lib/palette";
import { shareText } from "@/lib/services/share-service";
import { deleteVote, getVoteType, siteName } from "@/lib/services/vote-service";
import { StatusBadge, ThumbBadge } from "./VoteCard";
import styles from "./Vote.module.css";

export default function VoteDetail() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const { map } = useArtists();
  const { focus } = useFocusArtist();
  const { data: vote, loading } = useStoreQuery((s) => s.votes.get(id), `vote:${id}`);
  const { url: imageUrl } = useImageUrl(vote?.imageId);

  if (loading) return <div style={{ paddingTop: 96 }}><Loading /></div>;
  if (!vote) {
    return (
      <main>
        <PageHeader back="/votes" title="투표" />
        <Empty icon={SearchX} action={<Link href="/votes" className="btn btn-primary btn-sm">투표 목록</Link>}>
          투표를 찾을 수 없어요. 삭제되었거나 주소가 잘못되었어요.
        </Empty>
      </main>
    );
  }

  const type = getVoteType(vote.type);
  const Icon = type.icon;
  const artists = artistsToShow(vote.artistIds.map((a) => map.get(a)).filter((a) => !!a), focus);
  const site = siteName(vote);
  // 시각을 따로 정하지 않았으면 시작 00:00 · 마감 23:59
  const at = (date?: string, time?: string, fallback?: string) => (date ? `${date.replaceAll("-", ".")} ${time || fallback}` : "");
  const start = at(vote.startDate, vote.startTime, "00:00");
  const end = at(vote.endDate, vote.endTime, "23:59");
  const period = start || end ? `${start || "지금"} ~ ${end || "마감 미정"}` : "상시 투표";
  async function onShare() {
    const result = await shareText(vote!.name, [`[투표] ${vote!.name}`, period, vote!.url].filter(Boolean).join("\n"));
    if (result === "copied") toast("투표 정보를 복사했어요.");
    if (result === "failed") toast("공유하지 못했어요.");
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(vote!.url);
      toast("주소를 복사했어요.");
    } catch {
      toast("복사하지 못했어요.");
    }
  }

  async function onDelete() {
    if (!(await confirm({ title: "투표를 삭제할까요?", message: `‘${vote!.name}’이(가) 목록에서 삭제돼요.`, confirmLabel: "삭제", danger: true }))) return;
    try {
      await deleteVote(vote!);
    } catch {
      toast("삭제하지 못했어요. 다시 시도해 주세요.");
      return;
    }
    toast("삭제했어요.");
    router.replace("/votes");
  }

  return (
    <main>
      <PageHeader
        back="/votes"
        title="투표"
        actions={
          <button type="button" className="icon-btn" onClick={onShare} aria-label="투표 정보 공유">
            <Share2 size={18} />
          </button>
        }
      />
      {imageUrl && (
        <div className={styles.coverBox}>
          <Zoomable src={imageUrl} className={styles.cover}>
            {/* eslint-disable-next-line @next/next/no-img-element -- IndexedDB blob URL */}
            <img src={imageUrl} alt="" className={styles.coverImg} />
          </Zoomable>
          <ThumbBadge vote={vote} />
        </div>
      )}
      <article className={`card ${styles.hero}`}>
        <div className={styles.heroTop}>
          {!imageUrl && (
            <span className={styles.icon} style={{ color: type.color }} aria-hidden>
              <Icon size={20} />
            </span>
          )}
          <StatusBadge vote={vote} />
          <span className="tag" style={{ background: tint(type.color, 14), color: "var(--ink)" }}>
            {type.label}
          </span>
        </div>
        <h2>{vote.name}</h2>
        <div className={styles.heroMeta}>
          {site && (
            <p>
              <Globe size={15} aria-hidden /> {site}
              {vote.url && (
                <a href={vote.url} target="_blank" rel="noopener noreferrer" className={styles.siteGo} aria-label={`${site} 열기`}>
                  <ExternalLink size={14} />
                </a>
              )}
            </p>
          )}
          <p className="num">
            <Clock3 size={15} aria-hidden /> {period}
          </p>
        </div>
        {vote.url ? (
          <a href={vote.url} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-block">
            투표하러 가기 <ArrowUpRight size={17} />
          </a>
        ) : (
          <Link href={`/vote/edit?id=${vote.id}`} className="btn btn-primary btn-block">
            <Pencil size={16} /> 투표 주소 추가하기
          </Link>
        )}
      </article>

      {/* 투표 안내: 입력하지 않은 항목은 줄째 숨김 */}
      {(vote.target || vote.url || vote.description) && (
        <section className={`card ${styles.info}`}>
          <h2>투표 안내</h2>
          {(vote.target || vote.url) && (
            <dl className={styles.facts}>
              {vote.target && (
                <div>
                  <dt>투표 대상</dt>
                  <dd>{vote.target}</dd>
                </div>
              )}
              {vote.url && (
                <div>
                  <dt>공식 사이트</dt>
                  <dd className={styles.urlRow}>
                    <a href={vote.url} target="_blank" rel="noopener noreferrer" className={styles.url}>
                      {vote.url}
                    </a>
                    <button type="button" className={styles.copy} onClick={onCopy} aria-label="주소 복사">
                      <Copy size={15} />
                    </button>
                  </dd>
                </div>
              )}
            </dl>
          )}
          {vote.description && <p className={`prose ${styles.infoText}`}>{vote.description}</p>}
        </section>
      )}

      {artists.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>아티스트</h2>
          </div>
          <div className={styles.artistChips}>
            {artists.map((a) => (
              <Link key={a.id} href={`/artist?id=${a.id}`} className="chip" style={{ paddingLeft: 5 }}>
                <ArtistAvatar artist={a} size={26} /> {a.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className={styles.actions}>
        <Link href={`/vote/edit?id=${vote.id}`} className="btn btn-ghost" style={{ flex: 1 }}>
          <Pencil size={16} /> 수정하기
        </Link>
        <button type="button" className="btn btn-danger" onClick={onDelete} aria-label="삭제하기">
          <Trash2 size={17} />
        </button>
      </div>
    </main>
  );
}
