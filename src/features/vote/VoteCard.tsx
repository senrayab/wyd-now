"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { isUrgent, getVoteType, voteStatus } from "@/lib/services/vote-service";
import type { Artist, VoteSite } from "@/lib/storage/types";
import { useVoteDone } from "@/lib/vote-done";
import styles from "./Vote.module.css";

/** 목록형 카드: 본문은 상세로, 오른쪽 화살표는 투표 사이트로 바로 이동 */
export default function VoteCard({ vote, artists, checkable }: { vote: VoteSite; artists: Map<string, Artist>; checkable?: boolean }) {
  const type = getVoteType(vote.type);
  const Icon = type.icon;
  const status = voteStatus(vote);
  const names = vote.artistIds.map((id) => artists.get(id)?.name).filter(Boolean).join(", ");

  return (
    <div className={styles.card} data-status={status.kind}>
      {checkable && <DoneCheck vote={vote} />}
      <Link href={`/vote?id=${vote.id}`} className={styles.cardMain}>
        {!checkable && (
          <span className={styles.icon} style={{ color: type.color }} aria-hidden>
            <Icon size={20} />
          </span>
        )}
        <span className={styles.cardBody}>
          <span className={styles.cardTop}>
            <span className={styles.type} style={{ color: type.color }}>
              {type.label}
            </span>
            <StatusBadge vote={vote} />
          </span>
          <strong>{vote.name}</strong>
          <small>{names || vote.description || vote.url.replace(/^https?:\/\//, "").replace(/\/$/, "") || "투표 주소 미등록"}</small>
        </span>
      </Link>
      {vote.url && (
        <a href={vote.url} target="_blank" rel="noopener noreferrer" className={styles.go} aria-label={`${vote.name} 사이트 열기`}>
          <ArrowUpRight size={18} />
        </a>
      )}
    </div>
  );
}

/** 격자형 카드 (Due Tasks 스타일): 아이콘 · 체크 · 이름 · 마감 */
export function VoteTile({ vote }: { vote: VoteSite }) {
  const type = getVoteType(vote.type);
  const Icon = type.icon;
  const status = voteStatus(vote);
  const urgent = isUrgent(vote);
  const { isDone } = useVoteDone();
  return (
    <div className={styles.tile} data-status={status.kind} data-done={isDone(vote.id)}>
      <Link href={`/vote?id=${vote.id}`} className={styles.tileLink} aria-label={`${vote.name} 자세히`} />
      <Icon className={styles.tileIcon} size={26} strokeWidth={1.7} style={{ color: type.color }} aria-hidden />
      <DoneCheck vote={vote} className={styles.tileCheck} />
      <strong className={styles.tileName}>{vote.name}</strong>
      <small className={`${styles.tileDue} num`} data-urgent={urgent}>
        {status.label}
      </small>
    </div>
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

export function StatusBadge({ vote }: { vote: Pick<VoteSite, "startDate" | "endDate"> }) {
  const status = voteStatus(vote);
  return (
    <span className={`${styles.status} num`} data-kind={status.kind} data-urgent={isUrgent(vote)}>
      {status.label}
    </span>
  );
}
