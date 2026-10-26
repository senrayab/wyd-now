"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Pencil, Share2, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useFeedback } from "@/components/Feedback";
import { ArtistAvatar, Empty, Loading } from "@/components/ui";
import { formatDate } from "@/lib/date";
import { useArtists, useStoreQuery } from "@/lib/hooks";
import { tint } from "@/lib/palette";
import { shareText } from "@/lib/services/share-service";
import { getVoteType } from "@/lib/services/vote-service";
import { getDataStore } from "@/lib/storage";
import { StatusBadge } from "./VoteCard";
import styles from "./Vote.module.css";

export default function VoteDetail() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const { map } = useArtists();
  const { data: vote, loading } = useStoreQuery((s) => s.votes.get(id), `vote:${id}`);

  if (loading) return <div style={{ paddingTop: 96 }}><Loading /></div>;
  if (!vote) {
    return (
      <main>
        <PageHeader back="/votes" title="투표" />
        <Empty emoji="🔍" action={<Link href="/votes" className="btn btn-primary btn-sm">투표 목록</Link>}>
          투표 사이트를 찾을 수 없어요.
        </Empty>
      </main>
    );
  }

  const type = getVoteType(vote.type);
  const Icon = type.icon;
  const artists = vote.artistIds.map((a) => map.get(a)).filter((a) => !!a);
  const period =
    vote.startDate || vote.endDate
      ? `${vote.startDate ? formatDate(vote.startDate) : "지금"} ~ ${vote.endDate ? formatDate(vote.endDate) : "마감일 미정"}`
      : "상시 투표";

  async function onShare() {
    const result = await shareText(vote!.name, [`[투표] ${vote!.name}`, period, vote!.url].join("\n"));
    if (result === "copied") toast("투표 정보를 복사했어요.");
    if (result === "failed") toast("공유하지 못했어요.");
  }

  async function onDelete() {
    if (!(await confirm({ title: "투표 사이트를 삭제할까요?", message: `‘${vote!.name}’이(가) 목록에서 삭제돼요.`, confirmLabel: "삭제", danger: true }))) return;
    await getDataStore().votes.remove(vote!.id);
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
      <article className={`card ${styles.hero}`}>
        <div className={styles.heroTop}>
          <span className={styles.icon} style={{ color: type.color }} aria-hidden>
            <Icon size={20} />
          </span>
          <span className="tag" style={{ background: tint(type.color, 14), color: "var(--ink)" }}>
            {type.label}
          </span>
          <StatusBadge vote={vote} />
        </div>
        <h2>{vote.name}</h2>
        <p className={styles.url}>{vote.url}</p>
        <a href={vote.url} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-block">
          투표하러 가기 <ArrowUpRight size={17} />
        </a>
        <dl className={styles.facts}>
          <div>
            <dt>기간</dt>
            <dd className="num">{period}</dd>
          </div>
          {vote.description && (
            <div>
              <dt>안내</dt>
              <dd className="prose">{vote.description}</dd>
            </div>
          )}
        </dl>
      </article>

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
        <Link href={`/vote/edit?id=${vote.id}`} className="btn btn-primary" style={{ flex: 1 }}>
          <Pencil size={16} /> 수정
        </Link>
        <button type="button" className="btn btn-danger" onClick={onDelete} aria-label="투표 사이트 삭제">
          <Trash2 size={17} />
        </button>
      </div>
    </main>
  );
}
