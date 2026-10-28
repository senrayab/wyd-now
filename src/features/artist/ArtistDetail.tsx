"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Cake, CalendarOff, ChevronLeft, ExternalLink, Heart, Lock, Pencil, Plus, SearchX, Trash2, Vote } from "lucide-react";
import { useBack } from "@/components/PageHeader";
import ScheduleRow from "@/components/ScheduleRow";
import { useFeedback } from "@/components/Feedback";
import { ArtistAvatar, Empty, Loading } from "@/components/ui";
import { datePart, dDay, formatDate, formatShortDate, todayKey } from "@/lib/date";
import { useFocusArtist } from "@/lib/focus";
import { useArtists, useImageUrl, useStoreQuery } from "@/lib/hooks";
import { usePrefs } from "@/lib/prefs";
import { biasIdsOf, deleteArtist, MAX_BIAS, setFollowed, toggleBiasMember } from "@/lib/services/artist-service";
import type { Artist, Member, MySpace, Schedule } from "@/lib/storage/types";
import { DiscographySection } from "@/features/release/ReleaseScreens";
import VoteCard from "@/features/vote/VoteCard";
import { sortVotes } from "@/lib/services/vote-service";
import styles from "./ArtistDetail.module.css";

export default function ArtistDetail() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const prefs = usePrefs();
  const { focus } = useFocusArtist();
  const back = useBack(focus ? "/" : "/artists");
  const { toast, confirm } = useFeedback();
  const { map } = useArtists();
  const { data: artist, loading } = useStoreQuery((s) => s.artists.get(id), `artist:${id}`);
  const { data: schedules } = useStoreQuery((s) => s.schedules.listByArtist(id), `artist-schedules:${id}`);
  const { data: space } = useStoreQuery((s) => s.mySpaces.get(id), `space:${id}`);
  const { data: votes } = useStoreQuery((s) => s.votes.list(), "votes");

  if (loading) return <div style={{ paddingTop: 96 }}><Loading /></div>;
  if (!artist) {
    return (
      <main style={{ paddingTop: 80 }}>
        <Empty icon={SearchX} action={<Link href="/artists" className="btn btn-primary btn-sm">아티스트 목록</Link>}>
          아티스트를 찾을 수 없어요.
        </Empty>
      </main>
    );
  }

  const dedicated = focus?.id === artist.id;
  const today = todayKey();
  const upcoming = (schedules ?? []).filter((s) => datePart(s.endAt) >= today);
  const pastCount = (schedules ?? []).length - upcoming.length;

  async function onDelete() {
    const ok = await confirm({
      title: `${artist!.name}을(를) 삭제할까요?`,
      message: "프로필과 내 공간이 삭제돼요.\n연결된 일정은 남고 아티스트 연결만 해제돼요.",
      confirmLabel: "삭제",
      danger: true,
    });
    if (!ok) return;
    await deleteArtist(artist!);
    toast("아티스트를 삭제했어요.");
    router.replace("/artists");
  }

  return (
    <main className={styles.page}>
      <div className={`card ${styles.hero}`} data-cover={!!artist.coverImageId}>
        {artist.coverImageId && <HeroCover imageId={artist.coverImageId} />}
        <div className={styles.heroBar}>
          <button type="button" className="icon-btn back" onClick={back} aria-label="뒤로">
            <ChevronLeft size={22} />
          </button>
          <Link href={`/artist/edit?id=${artist.id}`} className="icon-btn" aria-label="아티스트 정보 수정">
            <Pencil size={18} />
          </Link>
        </div>
        <div className={styles.heroBody}>
          <span className={styles.avatarWrap}>
            <ArtistAvatar artist={artist} size={104} />
          </span>
          <h1>{artist.name}</h1>
          <p className="muted">{[artist.type === "group" ? "그룹" : "솔로", artist.agency].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      <div className={styles.content}>
        <dl className={styles.facts}>
          <div>
            <dt>데뷔</dt>
            <dd className="num">{artist.debutDate ? formatDate(artist.debutDate, false) : "—"}</dd>
          </div>
          <div>
            <dt>팬덤</dt>
            <dd>{artist.fandom || "—"}</dd>
          </div>
          <div>
            <dt>다가오는 일정</dt>
            <dd className="num">{upcoming.length}</dd>
          </div>
        </dl>

        {artist.members.length > 0 && (
          <section className="section">
            <div className="section-head">
              <h2>
                멤버 <span className="muted num">{artist.members.length}</span>
              </h2>
            </div>
            <div className={styles.members}>
              {artist.members.map((m) => (
                <span key={m.id} className="chip">
                  {m.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {artist.links.length > 0 && (
          <section className="section">
            <div className="section-head">
              <h2>공식 채널</h2>
            </div>
            <div className={styles.members}>
              {artist.links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-sm">
                  {l.label} <ExternalLink size={13} />
                </a>
              ))}
            </div>
          </section>
        )}

        <DiscographySection artist={artist} />

        {/* 내 아티스트 전용 모드에서는 일정·투표는 홈·메뉴에서, MY 공간은 '내 공간'에서 봄 */}
        {!dedicated && (
          <>
            {space && <MySpaceCard artist={artist} space={space} schedules={schedules ?? []} />}

            <section className="section">
              <div className="section-head">
                <h2>다가오는 일정</h2>
                <Link href={`/calendar?view=list&artist=${artist.id}`}>전체 보기</Link>
              </div>
              {upcoming.length ? (
                <div className="stack">
                  {upcoming.slice(0, 5).map((s) => (
                    <ScheduleRow key={s.id} schedule={s} artists={map} hour12={prefs.hour12} showDate />
                  ))}
                </div>
              ) : (
                <div className="card-flat">
                  <Empty icon={CalendarOff}>예정된 일정이 없어요.</Empty>
                </div>
              )}
              {pastCount > 0 && (
                <Link href={`/calendar?view=list&artist=${artist.id}&range=past`} className={`btn btn-ghost btn-block ${styles.past}`}>
                  지난 일정 {pastCount}개 보기
                </Link>
              )}
            </section>

            <section className="section">
              <div className="section-head">
                <h2>투표</h2>
                <Link href={`/vote/new?artist=${artist.id}`}>등록</Link>
              </div>
              {(() => {
                const mine = sortVotes((votes ?? []).filter((v) => v.artistIds.includes(artist.id)));
                return mine.length ? (
                  <div className="stack">
                    {mine.map((v) => (
                      <VoteCard key={v.id} vote={v} artists={map} />
                    ))}
                  </div>
                ) : (
                  <div className="card-flat">
                    <Empty icon={Vote} action={<Link href="/votes" className="btn btn-soft btn-sm">투표 보기</Link>}>
                      {artist.name} 전용으로 등록된 투표가 없어요.
                    </Empty>
                  </div>
                );
              })()}
            </section>


          </>
        )}

        <div className={styles.actions}>
          {dedicated ? (
            <Link href={`/release/new?artist=${artist.id}`} className="btn btn-ghost" style={{ flex: 1 }}>
              <Plus size={17} /> 앨범 등록
            </Link>
          ) : (
            <Link href={`/schedule/new?artist=${artist.id}`} className="btn btn-primary" style={{ flex: 1 }}>
              <Plus size={17} /> 일정 등록
            </Link>
          )}
          <button type="button" className="btn btn-danger" onClick={onDelete} aria-label="아티스트 삭제">
            <Trash2 size={17} />
          </button>
        </div>
      </div>
    </main>
  );
}

/** 상단 배경 이미지: 카드 위쪽을 채우고 아래로 갈수록 카드 색으로 사라짐 */
function HeroCover({ imageId }: { imageId: string }) {
  const { url } = useImageUrl(imageId);
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element -- IndexedDB blob URL
  return <img src={url} alt="" className={styles.heroCover} />;
}

/** 작은 개인 공간: 팔로우 · 최애 멤버 (이 기기에만 저장). 전용 모드에서는 '내 공간'(/my)에서 씀 */
export function MySpaceCard({ artist, space, schedules, showFollow = true }: { artist: Artist; space: MySpace; schedules: Schedule[]; showFollow?: boolean }) {
  const { toast } = useFeedback();

  const biasIds = biasIdsOf(space);
  const biases = biasIds.map((id) => artist.members.find((m) => m.id === id)).filter((m): m is Member => !!m);
  const today = todayKey();
  // 최애 생일 일정 (예: "원빈 생일") — 최애마다 오늘 이후 가장 가까운 것
  const birthdays = biases
    .map((m) => ({ member: m, schedule: schedules.find((s) => s.title === `${m.name} 생일` && datePart(s.endAt) >= today) }))
    .filter((b): b is { member: Member; schedule: Schedule } => !!b.schedule);

  return (
    <section className={`card ${styles.my}`}>
      <div className={styles.myHead}>
        <span className="eyebrow">
          <Lock size={10} /> My · 나만 보는 공간
        </span>
        <span className="spacer" />
        {showFollow && (
          <button
            type="button"
            className={styles.follow}
            aria-pressed={space.followed}
            onClick={async () => {
              await setFollowed(artist.id, !space.followed);
              toast(space.followed ? "팔로우를 해제했어요." : "팔로우했어요. 홈에서 모아 볼 수 있어요.");
            }}
          >
            <Heart size={14} fill={space.followed ? "currentColor" : "none"} />
            {space.followed ? "팔로우 중" : "팔로우"}
          </button>
        )}
      </div>

      <h2 className={styles.myTitle}>
        {biases.length ? (
          <>
            나의 최애 <em>{biases.map((m) => m.name).join(" · ")}</em>
          </>
        ) : artist.members.length ? (
          "최애 멤버를 골라 보세요"
        ) : (
          <>
            나만의 <em>{artist.name}</em>
          </>
        )}
      </h2>

      {artist.members.length > 0 && (
        <div className={styles.faces} role="group" aria-label={`최애 멤버 (최대 ${MAX_BIAS}명)`}>
          {artist.members.map((m) => {
            const on = biasIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                className={styles.face}
                onClick={async () => {
                  if ((await toggleBiasMember(artist.id, m.id)) === "full") toast(`최애는 ${MAX_BIAS}명까지 고를 수 있어요. 한 명을 먼저 해제해 주세요.`);
                }}
              >
                <span className={styles.faceCircle}>{m.name.slice(0, 1)}</span>
                <small>{m.name}</small>
              </button>
            );
          })}
        </div>
      )}

      {birthdays.map(({ member, schedule }) => (
        <Link key={member.id} href={`/schedule?id=${schedule.id}`} className={styles.bday}>
          <Cake size={18} strokeWidth={1.8} className={styles.bdayIcon} aria-hidden />
          <span className={styles.bdayText}>
            {member.name} 생일 <span className="muted num">· {formatShortDate(datePart(schedule.startAt))}</span>
          </span>
          <b className="num">{dDay(datePart(schedule.startAt))}</b>
        </Link>
      ))}


    </section>
  );
}
