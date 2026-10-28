"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, ChevronRight, Lock, Vote } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { ArtistAvatar, Empty, Loading } from "@/components/ui";
import { MySpaceCard } from "@/features/artist/ArtistDetail";
import NewsTimeline from "@/features/news/NewsTimeline";
import { VoteTodoRow } from "@/features/vote/VoteCard";
import { useFocusArtist } from "@/lib/focus";
import { useArtists, useStoreQuery } from "@/lib/hooks";
import { unscrapNews } from "@/lib/services/news-service";
import type { NewsItem } from "@/lib/storage/types";
import { sortVotes, voteStatus } from "@/lib/services/vote-service";
import { useVoteBookmarks } from "@/lib/vote-bookmarks";
import { useVoteDone } from "@/lib/vote-done";
import styles from "./My.module.css";

/** /my — 이 기기에만 저장되는 개인 공간: 북마크한 투표(오늘 완료 체크) · 스크랩한 기사 · 팔로우 */
export default function MyScreen() {
  const { artists, map } = useArtists();
  const { data: scraps, loading } = useStoreQuery((s) => s.scraps.list(), "scraps");
  const { data: news } = useStoreQuery((s) => s.news.list(), "news");
  const { data: spaces } = useStoreQuery((s) => s.mySpaces.list(), "spaces");
  const { count: votedToday } = useVoteDone();
  const { focus } = useFocusArtist();
  const { data: focusSpace } = useStoreQuery((s) => (focus ? s.mySpaces.get(focus.id) : Promise.resolve(undefined)), `space:${focus?.id}`);
  const { data: focusSchedules } = useStoreQuery((s) => (focus ? s.schedules.listByArtist(focus.id) : Promise.resolve([])), `artist-schedules:${focus?.id}`);

  const { data: votes } = useStoreQuery((s) => s.votes.list(), "votes");
  const { ids: bookmarkIds, keepOnly } = useVoteBookmarks();
  const [editingVotes, setEditingVotes] = useState(false);
  // 북마크한 투표: 마감했거나 삭제된 것은 빼고, 진행 중 → 예정 → 상시 순
  const myVotes = sortVotes((votes ?? []).filter((v) => bookmarkIds.includes(v.id) && voteStatus(v).kind !== "closed"));
  // 마감·삭제된 투표의 북마크는 저장소에서도 정리 (투표 목록을 다 읽은 뒤에만)
  useEffect(() => {
    if (!votes) return;
    const live = new Set(votes.filter((v) => voteStatus(v).kind !== "closed").map((v) => v.id));
    keepOnly((id) => live.has(id));
  }, [votes, keepOnly]);
  const isEditing = editingVotes && myVotes.length > 0;
  const [editingScrapsRaw, setEditingScraps] = useState(false);

  const byId = new Map((news ?? []).map((n) => [n.id, n]));
  const scrapped = (scraps ?? []).map((s) => byId.get(s.newsId)).filter((n): n is NewsItem => !!n);
  const editingScraps = editingScrapsRaw && scrapped.length > 0;
  const followed = artists.filter((a) => spaces?.some((sp) => sp.artistId === a.id && sp.followed));

  return (
    <main>
      <PageHeader back="/more" title="내 공간" />
      <p className={styles.lead}>
        <Lock size={13} /> 이 기기에만 저장되는 나만의 기록이에요. 공용 정보와는 따로 보관돼요.
      </p>

      {/* 내 아티스트 전용 모드: 최애 같은 MY 공간을 여기서 */}
      {focus && focusSpace && (
        <div className={styles.mySpace}>
          {/* 한 팀 전용이라 팔로우는 의미가 없어서 숨김 */}
          <MySpaceCard artist={focus} space={focusSpace} schedules={focusSchedules ?? []} showFollow={false} />
        </div>
      )}

      {/* 숫자 요약: 전용 모드에서는 위 MY 카드와 겹쳐서 숨김 */}
      {!focus && (
        <div className={styles.stats}>
          <div className="card">
            <span className="eyebrow">Scraps</span>
            <b className="num">{scrapped.length}</b>
            <small>스크랩한 기사</small>
          </div>
          <Link href="/artists" className="card">
            <span className="eyebrow">Following</span>
            <b className="num">{followed.length}</b>
            <small>팔로우 아티스트</small>
          </Link>
          <Link href="#my-votes" className="card">
            <span className="eyebrow">Today</span>
            <b className="num">{votedToday}</b>
            <small>투표 완료</small>
          </Link>
        </div>
      )}

      <section className="section" id="my-votes">
        <div className="section-head">
          <h2>
            북마크한 투표 {myVotes.length > 0 && <span className="muted num">{myVotes.length}</span>}
          </h2>
          {myVotes.length > 0 ? (
            <button type="button" className={styles.editBtn} onClick={() => setEditingVotes((v) => !v)} aria-pressed={isEditing}>
              {isEditing ? "완료" : "편집"}
            </button>
          ) : (
            <Link href="/votes">
              투표 보기 <ChevronRight size={14} />
            </Link>
          )}
        </div>
        {myVotes.length ? (
          <>
            <div className="stack">
              {myVotes.map((v) => (
                <VoteTodoRow key={v.id} vote={v} editing={isEditing} />
              ))}
            </div>
            <p className={styles.note}>오늘 투표한 곳은 체크해 두세요. 체크는 날이 바뀌면 풀리고, 투표 기간이 끝나면 목록에서 자동으로 빠져요.</p>
          </>
        ) : (
          <div className="card">
            <Empty icon={Vote} action={<Link href="/votes" className="btn btn-primary btn-sm">투표 보러 가기</Link>}>
              투표 목록에서 북마크한 투표가 여기에 모여요.
              <br />
              매일 투표했는지 체크할 수 있어요.
            </Empty>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>
            스크랩한 기사 {scrapped.length > 0 && <span className="muted num">{scrapped.length}</span>}
          </h2>
          {scrapped.length > 0 ? (
            <button type="button" className={styles.editBtn} onClick={() => setEditingScraps((v) => !v)} aria-pressed={editingScraps}>
              {editingScraps ? "완료" : "편집"}
            </button>
          ) : (
            <Link href="/feed">
              뉴스 보기 <ChevronRight size={14} />
            </Link>
          )}
        </div>
        {loading ? (
          <Loading rows={2} />
        ) : scrapped.length ? (
          <NewsTimeline items={scrapped} artists={map} onRemove={editingScraps ? (id) => void unscrapNews(id) : undefined} />
        ) : (
          <div className="card">
            <Empty icon={Bookmark} action={<Link href="/feed" className="btn btn-primary btn-sm">뉴스 보러 가기</Link>}>
              뉴스에서 기사 옆 북마크를 누르면 여기에 모여요.
            </Empty>
          </div>
        )}
      </section>

      {!focus && followed.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>팔로우 중인 아티스트</h2>
          </div>
          <div className="list">
            {followed.map((a) => (
              <Link key={a.id} href={`/artist?id=${a.id}`} className="list-row">
                <ArtistAvatar artist={a} size={40} />
                <span className="label">
                  <strong>{a.name}</strong>
                  <small>{a.agency ?? (a.type === "group" ? "그룹" : "솔로")}</small>
                </span>
                <ChevronRight size={17} className="muted" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
