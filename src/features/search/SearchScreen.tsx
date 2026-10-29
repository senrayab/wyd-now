"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, SearchX, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ScheduleRow from "@/components/ScheduleRow";
import { ArtistAvatar, Empty } from "@/components/ui";
import { getCategory } from "@/lib/categories";
import { inFocus, useFocusArtist } from "@/lib/focus";
import { useArtists, useStoreQuery } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import VoteCard from "@/features/vote/VoteCard";
import styles from "./SearchScreen.module.css";

export default function SearchScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const prefs = usePrefs();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const { artists, map } = useArtists();
  const { data: schedules } = useStoreQuery((s) => s.schedules.list(), "all-schedules");
  const { data: votes } = useStoreQuery((s) => s.votes.list(), "votes");
  const { focus } = useFocusArtist();

  const q = query.trim().toLowerCase();
  const artistHits = q ? artists.filter((a) => !focus || a.id === focus.id).filter((a) => a.name.toLowerCase().includes(q) || a.members.some((m) => m.name.toLowerCase().includes(q))) : [];
  const hitIds = new Set(artistHits.map((a) => a.id));
  const scheduleHits = q
    ? (schedules ?? []).filter((s) => inFocus(s.artistIds, focus)).filter((s) =>
        [s.title, s.place, s.description, getCategory(s.category).label].some((t) => t?.toLowerCase().includes(q)) ||
        s.artistIds.some((id) => hitIds.has(id)),
      )
    : [];

  const voteHits = q
    ? (votes ?? []).filter((v) => inFocus(v.artistIds, focus)).filter((v) => [v.name, v.site, v.target, v.description, v.url].some((t) => t?.toLowerCase().includes(q)) || v.artistIds.some((id) => hitIds.has(id)))
    : [];

  const update = (value: string) => {
    setQuery(value);
    router.replace(value ? `/search?q=${encodeURIComponent(value)}` : "/search", { scroll: false });
  };

  return (
    <main className="wide">
      <PageHeader back="/" title="검색" compact />
      <label className={styles.box}>
        <Search size={18} />
        <input
          className="input"
          type="search"
          placeholder="일정, 아티스트, 투표"
          aria-label="검색어"
          autoFocus
          value={query}
          onChange={(e) => update(e.target.value)}
        />
        {query && (
          <button type="button" className={styles.clear} onClick={() => update("")} aria-label="검색어 지우기">
            <X size={16} />
          </button>
        )}
      </label>

      {!q ? (
        <Empty icon={Search}>찾고 싶은 일정이나 아티스트를 입력해 주세요.</Empty>
      ) : artistHits.length + scheduleHits.length + voteHits.length === 0 ? (
        <Empty icon={SearchX}>‘{query}’ 검색 결과가 없어요.</Empty>
      ) : (
        <>
          {artistHits.length > 0 && (
            <section className="section" style={{ marginTop: 20 }}>
              <div className="section-head">
                <h2>아티스트</h2>
              </div>
              <div className="list">
                {artistHits.map((a) => (
                  <Link key={a.id} href={`/artist?id=${a.id}`} className="list-row">
                    <ArtistAvatar artist={a} size={40} />
                    <span className="label">
                      <strong>{a.name}</strong>
                      <small>{a.members.map((m) => m.name).join(", ") || "솔로"}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {voteHits.length > 0 && (
            <section className="section" style={{ marginTop: 20 }}>
              <div className="section-head">
                <h2>
                  투표 <span className="muted num">{voteHits.length}</span>
                </h2>
              </div>
              <div className="stack wide-cols">
                {voteHits.map((v) => (
                  <VoteCard key={v.id} vote={v} artists={map} />
                ))}
              </div>
            </section>
          )}
          {scheduleHits.length > 0 && (
            <section className="section" style={{ marginTop: 20 }}>
              <div className="section-head">
                <h2>
                  일정 <span className="muted num">{scheduleHits.length}</span>
                </h2>
              </div>
              <div className="stack wide-cols">
                {scheduleHits.map((s) => (
                  <ScheduleRow key={s.id} schedule={s} artists={map} hour12={prefs.hour12} showDate />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
