"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Inbox, Search, SearchX, Vote } from "lucide-react";
import { Empty, Loading } from "@/components/ui";
import { inFocus, useFocusArtist } from "@/lib/focus";
import { useArtists, useStoreQuery } from "@/lib/hooks";
import { groupVotes, isVoteType, VOTE_TYPES, type VoteTab } from "@/lib/services/vote-service";
import VoteCard from "./VoteCard";
import styles from "./Vote.module.css";

const TABS: { id: VoteTab; label: string }[] = [
  { id: "live", label: "진행 중" },
  { id: "upcoming", label: "예정" },
  { id: "closed", label: "지난 투표" },
];

const EMPTY: Record<VoteTab, string> = {
  live: "지금 참여할 수 있는 투표가 없어요.",
  upcoming: "예정된 투표가 없어요.",
  closed: "지난 투표가 없어요.",
};

const isTab = (value: string | null): value is VoteTab => TABS.some((t) => t.id === value);

/** /votes — 투표 목록: 진행 중(상시 포함) · 예정 · 지난 투표 */
export default function VotesScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { map } = useArtists();
  const { data, loading } = useStoreQuery((s) => s.votes.list(), "votes");
  const type = isVoteType(params.get("type")) ? params.get("type") : null;

  const { focus } = useFocusArtist();
  const all = (data ?? []).filter((v) => inFocus(v.artistIds, focus));
  const g = groupVotes(all.filter((v) => !type || v.type === type));
  const groups: Record<VoteTab, number> = { live: g.open.length + g.always.length, upcoming: g.upcoming.length, closed: g.closed.length };
  // 이전 주소의 ‘상시’ 탭은 진행 중으로
  const tabParam = params.get("tab");
  const tab: VoteTab = isTab(tabParam) ? tabParam : "live";

  const go = (patch: { type?: string | null; tab?: VoteTab }) => {
    const next = new URLSearchParams(params.toString());
    if ("type" in patch) {
      if (patch.type) next.set("type", patch.type);
      else next.delete("type");
    }
    if (patch.tab) next.set("tab", patch.tab);
    router.replace(`/votes${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const cards = (list: typeof all) => (
    <div className="stack">
      {list.map((v) => (
        <VoteCard key={v.id} vote={v} artists={map} bookmarkable editable />
      ))}
    </div>
  );

  return (
    <main>
      <header className="page-header">
        <h1>투표</h1>
        <div className="header-actions">
          <Link href="/search" className="icon-btn" aria-label="검색">
            <Search size={18} />
          </Link>
        </div>
      </header>
      <p className={styles.lead}>
        북마크한 투표는 내 공간에 모여요. 거기서 오늘 투표했는지 체크할 수 있어요.
        <br />
        새 투표는 아래 + 버튼에서 등록하고, 수정·삭제는 카드의 ⋯ 메뉴에서 할 수 있어요.
      </p>

      <div className={`segmented ${styles.tabs}`} role="tablist" aria-label="투표 상태">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => go({ tab: t.id })}>
            {t.label} {!loading && <span className="num">{groups[t.id]}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : all.length === 0 ? (
        <div className="card-flat">
          <Empty icon={Vote}>아직 등록된 투표가 없어요. 아래 + 버튼의 ‘투표 등록’으로 등록해 보세요.</Empty>
        </div>
      ) : (
        <>
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

          {groups[tab] === 0 ? (
            <div className="card-flat" style={{ marginTop: 8 }}>
              <Empty icon={tab === "closed" ? Inbox : SearchX}>{EMPTY[tab]}</Empty>
            </div>
          ) : tab === "live" ? (
            <div style={{ marginTop: 8 }}>
              {cards(g.open)}
              {/* 상시: 기간 없이 언제든 투표할 수 있는 곳은 따로 묶어서 */}
              {g.always.length > 0 && (
                <>
                  <h2 className={styles.subhead} style={g.open.length ? undefined : { marginTop: 4 }}>
                    상시 투표 <span className="num">{g.always.length}</span>
                  </h2>
                  {cards(g.always)}
                </>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>{cards(g[tab])}</div>
          )}
        </>
      )}
    </main>
  );
}
