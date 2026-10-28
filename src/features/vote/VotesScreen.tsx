"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Clock3, Download, Inbox, LayoutGrid, List, Plus, SearchX, Vote } from "lucide-react";
import { useFeedback } from "@/components/Feedback";
import { Empty, Loading, Spinner } from "@/components/ui";
import { todayKey, weekDays } from "@/lib/date";
import { inFocus, useFocusArtist } from "@/lib/focus";
import { useArtists, useStoreQuery } from "@/lib/hooks";
import { isVoteType, loadDefaultVoteSites, sortVotes, VOTE_TYPES, voteStatus } from "@/lib/services/vote-service";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { useVoteDone } from "@/lib/vote-done";
import VoteCard, { VoteTile } from "./VoteCard";
import styles from "./Vote.module.css";

type Tab = "live" | "always" | "closed";

const TABS: { id: Tab; label: string }[] = [
  { id: "live", label: "진행 중" },
  { id: "always", label: "상시" },
  { id: "closed", label: "마감" },
];

const EMPTY: Record<Tab, string> = {
  live: "진행 중이거나 예정된 투표가 없어요.",
  always: "상시 투표 사이트가 없어요.",
  closed: "마감된 투표가 없어요.",
};

const isTab = (value: string | null): value is Tab => TABS.some((t) => t.id === value);

export default function VotesScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useFeedback();
  const { map } = useArtists();
  const { data, loading } = useStoreQuery((s) => s.votes.list(), "votes");
  const [busy, setBusy] = useState(false);
  const { voteLayout, weekStart } = usePrefs();
  const { count: doneCount } = useVoteDone();
  const type = isVoteType(params.get("type")) ? params.get("type") : null;

  const { focus } = useFocusArtist();
  const all = sortVotes((data ?? []).filter((v) => inFocus(v.artistIds, focus)));
  const ofType = all.filter((v) => !type || v.type === type);
  const groups = {
    live: ofType.filter((v) => ["open", "upcoming"].includes(voteStatus(v).kind)),
    always: ofType.filter((v) => voteStatus(v).kind === "always"),
    closed: ofType.filter((v) => voteStatus(v).kind === "closed"),
  };
  // 탭을 고르지 않았으면 진행 중인 투표가 있을 때 ‘진행 중’, 없으면 ‘상시’
  const tabParam = params.get("tab");
  const tab: Tab = isTab(tabParam) ? tabParam : all.some((v) => ["open", "upcoming"].includes(voteStatus(v).kind)) ? "live" : "always";
  const shown = groups[tab];
  // 이번 주(오늘 ~ 이번 주 마지막 날) 안에 마감하는 투표
  const today = todayKey();
  const weekEnd = weekDays(today, weekStart)[6];
  const dueThisWeek = all.filter((v) => v.endDate && v.endDate >= today && v.endDate <= weekEnd);

  const go = (patch: { type?: string | null; tab?: Tab }) => {
    const next = new URLSearchParams(params.toString());
    if ("type" in patch) {
      if (patch.type) next.set("type", patch.type);
      else next.delete("type");
    }
    if (patch.tab) next.set("tab", patch.tab);
    router.replace(`/votes${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  async function loadDefaults() {
    setBusy(true);
    const added = await loadDefaultVoteSites();
    setBusy(false);
    toast(added ? `투표 사이트 ${added}곳을 추가했어요.` : "이미 모두 등록되어 있어요.");
  }

  return (
    <main>
      <header className="page-header">
        <h1>투표</h1>
        <div className="header-actions">
          <button
            type="button"
            className={`icon-btn ${styles.layoutBtn}`}
            onClick={() => setPrefs({ voteLayout: voteLayout === "grid" ? "list" : "grid" })}
            aria-label={voteLayout === "grid" ? "목록으로 보기" : "격자로 보기"}
          >
            {voteLayout === "grid" ? <List size={18} /> : <LayoutGrid size={18} />}
          </button>
          <Link href="/vote/new" className="icon-btn" aria-label="투표 사이트 등록">
            <Plus size={20} />
          </Link>
        </div>
      </header>
      <p className={styles.lead}>
        투표할 수 있는 곳을 모아 두는 곳이에요. 오늘 투표한 곳은 체크해 두세요{doneCount > 0 && <> · 오늘 <b className="num">{doneCount}</b>곳 완료</>}. 체크는 이 기기에만 저장되고 날이 바뀌면 풀려요.
      </p>

      {loading ? (
        <Loading />
      ) : all.length === 0 ? (
        <div className="card">
          <Empty
            icon={Vote}
            action={
              <div className="stack" style={{ width: "100%" }}>
                <button type="button" className="btn btn-accent" onClick={loadDefaults} disabled={busy}>
                  {busy ? <Spinner /> : <Download size={16} />} {busy ? "불러오는 중" : "자주 쓰는 투표 사이트 불러오기"}
                </button>
                <Link href="/vote/new" className="btn btn-soft">
                  직접 등록하기
                </Link>
              </div>
            }
          >
            아직 등록된 투표 사이트가 없어요.
          </Empty>
        </div>
      ) : (
        <>
          {dueThisWeek.length > 0 && (
            <div className={styles.weekDue}>
              <Clock3 size={16} aria-hidden />
              <span>
                이번 주 마감 <b className="num">{dueThisWeek.length}</b>개
              </span>
              <small>
                {dueThisWeek
                  .slice(0, 2)
                  .map((v) => v.name)
                  .join(", ")}
                {dueThisWeek.length > 2 && ` 외 ${dueThisWeek.length - 2}개`}
              </small>
            </div>
          )}

          <div className={`segmented ${styles.tabs}`} role="tablist" aria-label="투표 상태">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => go({ tab: t.id })}>
                {t.label} <span className="num">{groups[t.id].length}</span>
              </button>
            ))}
          </div>

          <div className="chips" role="group" aria-label="종류">
            <button type="button" className="chip" aria-pressed={!type} onClick={() => go({ type: null })}>
              전체
            </button>
            {VOTE_TYPES.map((t) => (
              <button key={t.id} type="button" className="chip" aria-pressed={type === t.id} onClick={() => go({ type: t.id })}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.color }} />
                {t.label}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="card-flat" style={{ marginTop: 8 }}>
              <Empty icon={tab === "closed" ? Inbox : SearchX}>{EMPTY[tab]}</Empty>
            </div>
          ) : (
            <div className={voteLayout === "grid" ? styles.grid : "stack"} style={{ marginTop: 8 }}>
              {shown.map((v) => (voteLayout === "grid" ? <VoteTile key={v.id} vote={v} /> : <VoteCard key={v.id} vote={v} artists={map} checkable />))}
            </div>
          )}

          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 20 }} onClick={loadDefaults} disabled={busy}>
            {busy ? <Spinner /> : <Download size={16} />} {busy ? "불러오는 중" : "자주 쓰는 투표 사이트 불러오기"}
          </button>
        </>
      )}
    </main>
  );
}
