"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Plus, Search, SearchX, UsersRound } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { ArtistAvatar, Empty, Loading } from "@/components/ui";
import { useFocusArtist } from "@/lib/focus";
import { useArtists, useStoreQuery } from "@/lib/hooks";
import type { Artist } from "@/lib/storage/types";
import styles from "./ArtistsScreen.module.css";

export default function ArtistsScreen() {
  const { artists, loading } = useArtists();
  const { data: spaces } = useStoreQuery((s) => s.mySpaces.list(), "spaces");
  const { data: schedules } = useStoreQuery((s) => s.schedules.list(), "all-schedules");
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { focus } = useFocusArtist();

  // 내 아티스트 전용 모드: 목록 없이 그 아티스트 페이지로 (기록을 남기지 않게 replace)
  useEffect(() => {
    if (focus) router.replace(`/artist?id=${focus.id}`);
  }, [focus, router]);

  const followed = new Set(spaces?.filter((s) => s.followed).map((s) => s.artistId));
  const q = query.trim().toLowerCase();
  const shown = artists.filter((a) => !q || a.name.toLowerCase().includes(q) || a.members.some((m) => m.name.toLowerCase().includes(q)));
  const mine = shown.filter((a) => followed.has(a.id));
  const others = shown.filter((a) => !followed.has(a.id));
  const countFor = (a: Artist) => schedules?.filter((s) => s.artistIds.includes(a.id)).length ?? 0;

  return (
    <main>
      <PageHeader
        back="/more"
        title="아티스트"
        actions={
          <Link href="/artist/new" className="icon-btn" aria-label="아티스트 등록">
            <Plus size={20} />
          </Link>
        }
      />

      <label className={styles.search}>
        <Search size={18} />
        <input className="input" placeholder="아티스트, 멤버 이름 검색" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="아티스트 검색" />
      </label>

      {loading || focus ? (
        <Loading />
      ) : artists.length === 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <Empty icon={UsersRound} action={<Link href="/artist/new" className="btn btn-primary btn-sm">아티스트 등록</Link>}>
            등록된 아티스트가 없어요.
          </Empty>
        </div>
      ) : shown.length === 0 ? (
        <Empty icon={SearchX}>‘{query}’에 맞는 아티스트가 없어요.</Empty>
      ) : (
        <>
          {mine.length > 0 && (
            <section className="section" style={{ marginTop: 20 }}>
              <div className="section-head">
                <h2>
                  <Heart size={14} fill="currentColor" style={{ color: "#ff4f8b", marginRight: 6, verticalAlign: -1 }} />
                  팔로우 중
                </h2>
              </div>
              <div className={styles.grid}>
                {mine.map((a) => (
                  <ArtistCard key={a.id} artist={a} count={countFor(a)} />
                ))}
              </div>
            </section>
          )}
          {others.length > 0 && (
            <section className="section" style={{ marginTop: 20 }}>
              {mine.length > 0 && (
                <div className="section-head">
                  <h2>전체</h2>
                </div>
              )}
              <div className={styles.grid}>
                {others.map((a) => (
                  <ArtistCard key={a.id} artist={a} count={countFor(a)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function ArtistCard({ artist, count }: { artist: Artist; count: number }) {
  return (
    <Link href={`/artist?id=${artist.id}`} className={`card ${styles.card}`}>
      <ArtistAvatar artist={artist} size={56} />
      <div className={styles.cardText}>
        <strong>{artist.name}</strong>
        <small>
          {artist.type === "group" ? `그룹 · ${artist.members.length}명` : "솔로"} · 일정 <span className="num">{count}</span>
        </small>
      </div>
    </Link>
  );
}
