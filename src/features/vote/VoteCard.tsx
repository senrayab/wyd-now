"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bookmark, BookmarkMinus, Check, Copy, Ellipsis, Globe, Pencil, Trash2 } from "lucide-react";
import { useFeedback } from "@/components/Feedback";
import { artistsToShow, useFocusArtist } from "@/lib/focus";
import { useImageUrl } from "@/lib/hooks";
import { badgeLabel, cardPeriod, copyVote, deleteVote, isUrgent, getVoteType, siteName, voteStatus } from "@/lib/services/vote-service";
import type { Artist, VoteSite } from "@/lib/storage/types";
import { useVoteBookmarks } from "@/lib/vote-bookmarks";
import { useVoteDone } from "@/lib/vote-done";
import styles from "./Vote.module.css";

/**
 * 투표 카드: 썸네일(+ D-day) · 제목 · 사이트 · 날짜 | 북마크 · 바로가기
 * 본문(썸네일·제목)은 상세로, 오른쪽 ‘바로가기’는 투표 사이트로 — 서로 다른 링크라 함께 실행되지 않음
 * bookmarkable: 북마크하면 내 공간에 모이고 거기서 오늘 투표 완료를 체크 (지난 투표는 제외)
 * editable: 북마크 옆 ⋯ 메뉴로 수정 · 복사 · 삭제 (투표 목록에서)
 */
export default function VoteCard({ vote, artists, bookmarkable, editable }: { vote: VoteSite; artists: Map<string, Artist>; bookmarkable?: boolean; editable?: boolean }) {
  const status = voteStatus(vote);
  const site = siteName(vote);
  const period = cardPeriod(vote);
  // 연결된 아티스트 이름: 내 아티스트 전용 모드에서 그 아티스트뿐이면 생략 (다른 팀과 함께면 표시)
  const { focus } = useFocusArtist();
  const names = artistsToShow(vote.artistIds.map((id) => artists.get(id)).filter((a) => !!a), focus).map((a) => a.name).join(", ");
  const canBookmark = bookmarkable && status.kind !== "closed";

  return (
    <div className={styles.card} data-status={status.kind}>
      <Link href={`/vote?id=${vote.id}`} className={styles.thumbBox} tabIndex={-1} aria-hidden>
        <VoteThumb vote={vote} />
        <ThumbBadge vote={vote} />
      </Link>
      <Link href={`/vote?id=${vote.id}`} className={styles.cardMain}>
        <span className="sr-only">{status.label}</span>
        <strong>{vote.name}</strong>
        {/* 제목이 비슷한 투표도 한눈에 구분되게 투표 대상을 제목 아래에 */}
        {vote.target && (
          <small className={styles.target}>
            <b>투표 대상:</b> {vote.target}
          </small>
        )}
        {(site || names) && (
          <small className={styles.site}>
            <Globe size={12} aria-hidden />
            <span>{[site, names].filter(Boolean).join(" · ")}</span>
          </small>
        )}
        {period && <small className="num">{period}</small>}
      </Link>
      {(canBookmark || editable || vote.url) && (
        <div className={styles.side}>
          <span className={styles.sideTop}>
            {canBookmark && <BookmarkButton vote={vote} />}
            {editable && <VoteMenu vote={vote} />}
          </span>
          {vote.url && (
            <a href={vote.url} target="_blank" rel="noopener noreferrer" className={styles.go} aria-label={`${vote.name} 사이트 바로가기`}>
              바로가기 <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** 썸네일 왼쪽 위 D-day (상시 · 마감은 글자로) */
export function ThumbBadge({ vote }: { vote: VoteSite }) {
  const status = voteStatus(vote);
  return (
    <span className={`${styles.thumbBadge} num`} data-kind={status.kind} data-urgent={isUrgent(vote)}>
      {badgeLabel(vote)}
    </span>
  );
}

/** ⋯ 메뉴: 수정하기 · 복사하기 · 삭제하기 (바깥을 누르면 닫힘) */
function VoteMenu({ vote }: { vote: VoteSite }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  async function onCopy() {
    setOpen(false);
    try {
      const copied = await copyVote(vote);
      toast("복사했어요. 바뀐 내용을 고쳐 주세요.");
      router.push(`/vote/edit?id=${copied.id}`);
    } catch {
      toast("복사하지 못했어요. 다시 시도해 주세요.");
    }
  }

  async function onDelete() {
    setOpen(false);
    if (!(await confirm({ title: "투표를 삭제할까요?", message: `‘${vote.name}’이(가) 목록에서 삭제돼요.`, confirmLabel: "삭제", danger: true }))) return;
    try {
      await deleteVote(vote);
      toast("삭제했어요.");
    } catch {
      toast("삭제하지 못했어요. 다시 시도해 주세요.");
    }
  }

  return (
    <div ref={ref} className={styles.menuBox}>
      <button type="button" className={styles.bookmark} aria-label={`${vote.name} 메뉴`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Ellipsis size={18} />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <Link href={`/vote/edit?id=${vote.id}`} role="menuitem">
            <Pencil size={16} /> 수정하기
          </Link>
          <button type="button" role="menuitem" onClick={onCopy}>
            <Copy size={16} /> 복사하기
          </button>
          <button type="button" role="menuitem" data-danger onClick={onDelete}>
            <Trash2 size={16} /> 삭제하기
          </button>
        </div>
      )}
    </div>
  );
}

function BookmarkButton({ vote }: { vote: VoteSite }) {
  const { isBookmarked, toggle } = useVoteBookmarks();
  const on = isBookmarked(vote.id);
  return (
    <button type="button" className={styles.bookmark} aria-pressed={on} onClick={() => toggle(vote.id)} aria-label={on ? `${vote.name} 북마크 해제` : `${vote.name} 북마크`}>
      <Bookmark size={17} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

/** 내 공간: 북마크한 투표 한 줄 — 오늘 완료 체크 · 제목(상세) · 바로가기 (편집 중에는 북마크 해제) */
export function VoteTodoRow({ vote, editing }: { vote: VoteSite; editing?: boolean }) {
  const { isDone } = useVoteDone();
  const { toggle } = useVoteBookmarks();
  const done = isDone(vote.id);
  const status = voteStatus(vote);
  return (
    <div className={styles.todoRow} data-done={done}>
      {status.kind === "upcoming" ? <span className={styles.checkSpace} aria-hidden /> : <DoneCheck vote={vote} />}
      <Link href={`/vote?id=${vote.id}`} className={styles.todoMain}>
        <strong>{vote.name}</strong>
        <small>
          <StatusBadge vote={vote} />
          <span>{[siteName(vote), vote.target].filter(Boolean).join(" · ")}</span>
        </small>
      </Link>
      {editing ? (
        <button type="button" className="round-action" onClick={() => toggle(vote.id)} aria-label={`${vote.name} 북마크 해제`}>
          <BookmarkMinus size={15} />
        </button>
      ) : (
        vote.url && (
          <a href={vote.url} target="_blank" rel="noopener noreferrer" className="round-action" aria-label={`${vote.name} 사이트 바로가기`}>
            <ArrowUpRight size={15} />
          </a>
        )
      )}
    </div>
  );
}

/** 대표 이미지, 없으면 종류 아이콘 */
export function VoteThumb({ vote }: { vote: VoteSite }) {
  const { url } = useImageUrl(vote.imageId);
  const type = getVoteType(vote.type);
  const Icon = type.icon;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- IndexedDB blob URL
    <img src={url} alt="" className={styles.thumb} />
  ) : (
    <span className={styles.thumb} style={{ color: type.color }}>
      <Icon size={28} strokeWidth={1.6} />
    </span>
  );
}

/** 오늘 투표 완료 체크 (이 기기에만 저장, 날짜가 바뀌면 풀림) */
export function DoneCheck({ vote, className }: { vote: VoteSite; className?: string }) {
  const { isDone, toggle } = useVoteDone();
  const done = isDone(vote.id);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`${vote.name} 오늘 투표 완료`}
      className={`${styles.check} ${className ?? ""}`}
      onClick={() => toggle(vote.id)}
    >
      {done && <Check size={14} strokeWidth={2.6} />}
    </button>
  );
}

export function StatusBadge({ vote }: { vote: Parameters<typeof voteStatus>[0] }) {
  const status = voteStatus(vote);
  return (
    <span className={`${styles.status} num`} data-kind={status.kind} data-urgent={isUrgent(vote)}>
      {status.label}
    </span>
  );
}
