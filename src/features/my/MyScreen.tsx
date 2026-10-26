"use client";

import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { ArtistAvatar, Empty, Loading } from "@/components/ui";
import NewsTimeline from "@/features/news/NewsTimeline";
import { useArtists, useStoreQuery } from "@/lib/hooks";
import type { NewsItem } from "@/lib/storage/types";
import { useVoteDone } from "@/lib/vote-done";
import styles from "./My.module.css";

/** /my — 이 기기에만 저장되는 개인 공간: 스크랩한 기사 · 팔로우 · 오늘 투표 */
export default function MyScreen() {
  const { artists, map } = useArtists();
  const { data: scraps, loading } = useStoreQuery((s) => s.scraps.list(), "scraps");
  const { data: news } = useStoreQuery((s) => s.news.list(), "news");
  const { data: spaces } = useStoreQuery((s) => s.mySpaces.list(), "spaces");
  const { count: votedToday } = useVoteDone();

  const byId = new Map((news ?? []).map((n) => [n.id, n]));
  const scrapped = (scraps ?? []).map((s) => byId.get(s.newsId)).filter((n): n is NewsItem => !!n);
  const followed = artists.filter((a) => spaces?.some((sp) => sp.artistId === a.id && sp.followed));

  return (
    <main>
      <PageHeader back="/more" title="내 공간" />
      <p className={styles.lead}>
        <Lock size={13} /> 이 기기에만 저장되는 나만의 기록이에요. 공용 정보와는 따로 보관돼요.
      </p>

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
        <Link href="/votes" className="card">
          <span className="eyebrow">Today</span>
          <b className="num">{votedToday}</b>
          <small>투표 완료</small>
        </Link>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>스크랩한 기사</h2>
          <Link href="/news">
            소식 보기 <ChevronRight size={14} />
          </Link>
        </div>
        {loading ? (
          <Loading rows={2} />
        ) : scrapped.length ? (
          <NewsTimeline items={scrapped} artists={map} />
        ) : (
          <div className="card">
            <Empty emoji="🔖" action={<Link href="/news" className="btn btn-primary btn-sm">아티스트 소식 보러 가기</Link>}>
              기사 카드의 북마크 버튼을 누르면 여기에 모여요.
            </Empty>
          </div>
        )}
      </section>

      {followed.length > 0 && (
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
