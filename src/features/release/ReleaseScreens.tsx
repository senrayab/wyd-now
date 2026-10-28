"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Disc3, ExternalLink, Pencil, Play, Plus, SearchX, Trash2 } from "lucide-react";
import { useFeedback } from "@/components/Feedback";
import Illustration from "@/components/Illustration";
import ImagePicker from "@/components/ImagePicker";
import { Zoomable } from "@/components/ImageZoom";
import LinksEditor from "@/components/LinksEditor";
import PageHeader, { useBack } from "@/components/PageHeader";
import { Empty, Loading, Spinner } from "@/components/ui";
import { formatDate, todayKey } from "@/lib/date";
import { useFocusArtist } from "@/lib/focus";
import { useArtists, useImageUrl, useStoreQuery } from "@/lib/hooks";
import type { ImageChange } from "@/lib/services/image-attach";
import { deleteRelease, RELEASE_KINDS, releaseKindLabel, saveRelease, titleTracks, validateRelease, type ReleaseFormValues } from "@/lib/services/release-service";
import type { Artist, Release } from "@/lib/storage/types";
import styles from "./Release.module.css";

/* ---------- 아티스트 페이지의 디스코그래피 ---------- */

/** 최신 발매 한 장은 크게, 나머지는 가로로 넘겨 보는 앨범 커버 */
export function DiscographySection({ artist }: { artist: Artist }) {
  const { data, loading } = useStoreQuery((s) => s.releases.listByArtist(artist.id), `releases:${artist.id}`);
  const list = data ?? [];
  const [latest, ...rest] = list;

  return (
    <section className="section">
      <div className="section-head">
        <h2>
          디스코그래피 {list.length > 0 && <span className="muted num">{list.length}</span>}
        </h2>
        <Link href={`/release/new?artist=${artist.id}`}>등록</Link>
      </div>
      {loading ? (
        <Loading />
      ) : !latest ? (
        <div className="card-flat">
          <Empty icon={Disc3} action={<Link href={`/release/new?artist=${artist.id}`} className="btn btn-ghost btn-sm"><Plus size={15} /> 앨범 등록</Link>}>
            아직 등록된 앨범이 없어요.
          </Empty>
        </div>
      ) : (
        <>
          <LatestRelease release={latest} />
          {rest.length > 0 && (
            <div className={styles.scroller}>
              {rest.map((r) => (
                <Link key={r.id} href={`/release?id=${r.id}`} className={styles.item}>
                  <Cover release={r} className={styles.itemCover} />
                  <strong>{r.title}</strong>
                  <small className="num">
                    {releaseKindLabel(r.kind)} · {r.releaseDate.slice(0, 4)}
                  </small>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function LatestRelease({ release }: { release: Release }) {
  return (
    <div className={`card ${styles.latest}`}>
      <Link href={`/release?id=${release.id}`} className={styles.latestMain}>
        <Cover release={release} className={styles.latestCover} />
        <span className={styles.latestText}>
          <span className="eyebrow">Latest</span>
          <strong>{release.title}</strong>
          <small className="num">
            {releaseKindLabel(release.kind)} · {formatDate(release.releaseDate, false)}
          </small>
          {release.tracks.length > 0 && <small className={styles.titleTrack}>♪ {titleTracks(release).join(", ")}</small>}
        </span>
      </Link>
      {release.mvUrl && (
        <a href={release.mvUrl} target="_blank" rel="noopener noreferrer" className={`btn btn-primary btn-sm ${styles.mv}`}>
          <Play size={14} fill="currentColor" /> 뮤직비디오
        </a>
      )}
    </div>
  );
}

/** 앨범 커버: 이미지가 없으면 회색 칸에 디스크 아이콘 */
function Cover({ release, className }: { release: Release; className?: string }) {
  const { url } = useImageUrl(release.imageId);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- IndexedDB blob URL
    <img src={url} alt="" className={`${styles.cover} ${className ?? ""}`} />
  ) : (
    <span className={`${styles.cover} ${styles.coverEmpty} ${className ?? ""}`} aria-hidden>
      <Disc3 size={26} strokeWidth={1.4} />
    </span>
  );
}

/* ---------- /release?id= 앨범 상세 ---------- */

export function ReleaseDetailScreen() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const { map } = useArtists();
  const { data: release, loading } = useStoreQuery((s) => s.releases.get(id), `release:${id}`);
  const { url: imageUrl } = useImageUrl(release?.imageId);
  const back = useBack(release ? `/artist?id=${release.artistId}` : "/");

  if (loading) return <div style={{ paddingTop: 96 }}><Loading /></div>;
  if (!release) {
    return (
      <main style={{ paddingTop: 80 }}>
        <Empty icon={SearchX} action={<button type="button" className="btn btn-primary btn-sm" onClick={back}>돌아가기</button>}>
          앨범을 찾을 수 없어요.
        </Empty>
      </main>
    );
  }

  const artist = map.get(release.artistId);
  const titles = new Set(titleTracks(release));

  async function onDelete() {
    const ok = await confirm({ title: `‘${release!.title}’을(를) 삭제할까요?`, message: "앨범 정보와 커버 이미지가 삭제돼요.", confirmLabel: "삭제", danger: true });
    if (!ok) return;
    await deleteRelease(release!);
    toast("앨범을 삭제했어요.");
    router.replace(`/artist?id=${release!.artistId}`);
  }

  return (
    <main>
      <PageHeader back={`/artist?id=${release.artistId}`} title={artist?.name ?? "앨범"} />

      <article className={`card ${styles.detail}`}>
        {imageUrl ? (
          <Zoomable src={imageUrl} className={styles.detailCoverBtn}>
            {/* eslint-disable-next-line @next/next/no-img-element -- IndexedDB blob URL */}
            <img src={imageUrl} alt="" className={styles.detailCover} />
          </Zoomable>
        ) : (
          <div className={styles.detailCoverEmpty}>
            <Illustration category="release" className={styles.detailIllo} />
          </div>
        )}
        <span className="eyebrow num">
          {releaseKindLabel(release.kind)} · {formatDate(release.releaseDate)}
        </span>
        <h1 className={styles.detailTitle}>{release.title}</h1>
        {release.description && <p className="prose" style={{ marginTop: 10 }}>{release.description}</p>}
        {release.mvUrl && (
          <a href={release.mvUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-block" style={{ marginTop: 18 }}>
            <Play size={15} fill="currentColor" /> 뮤직비디오 보기
          </a>
        )}
      </article>

      {release.tracks.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>
              수록곡 <span className="muted num">{release.tracks.length}</span>
            </h2>
          </div>
          <ol className={`card ${styles.tracks}`}>
            {release.tracks.map((t, i) => (
              <li key={i}>
                <span className="num">{i + 1}</span>
                <strong>{t.title}</strong>
                {titles.has(t.title) && <span className={styles.titleTag}>타이틀</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {release.links.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>듣기</h2>
          </div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {release.links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-soft btn-sm">
                {l.label} <ExternalLink size={13} />
              </a>
            ))}
          </div>
        </section>
      )}

      <div className={styles.actions}>
        <Link href={`/release/edit?id=${release.id}`} className="btn btn-ghost" style={{ flex: 1 }}>
          <Pencil size={16} /> 수정
        </Link>
        <button type="button" className="btn btn-danger" onClick={onDelete} aria-label="앨범 삭제">
          <Trash2 size={17} />
        </button>
      </div>
    </main>
  );
}

/* ---------- /release/new?artist=, /release/edit?id= ---------- */

export function ReleaseFormScreen({ mode }: { mode: "new" | "edit" }) {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { focus, loading: focusLoading } = useFocusArtist();
  const { data: existing, loading } = useStoreQuery((s) => (mode === "edit" ? s.releases.get(id) : Promise.resolve(undefined)), `release-form:${mode}:${id}`);

  if (loading || focusLoading) return <div style={{ paddingTop: 96 }}><Loading /></div>;
  if (mode === "edit" && !existing) {
    return (
      <main>
        <PageHeader back="/" title="앨범 수정" compact />
        <Empty icon={SearchX}>수정할 앨범을 찾을 수 없어요.</Empty>
      </main>
    );
  }
  const artistId = existing?.artistId ?? params.get("artist") ?? focus?.id ?? "";
  const initial: ReleaseFormValues = existing
    ? { ...existing }
    : { artistId, title: "", kind: "mini", releaseDate: todayKey(), tracks: [], links: [] };
  return <ReleaseForm key={existing?.id ?? "new"} initial={initial} existing={existing} />;
}

function ReleaseForm({ initial, existing }: { initial: ReleaseFormValues; existing?: Release }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const { artists } = useArtists();
  const backTo = initial.artistId ? `/artist?id=${initial.artistId}` : "/";
  const cancel = useBack(existing ? `/release?id=${existing.id}` : backTo);
  const [values, setValues] = useState(initial);
  // 수록곡은 한 줄에 한 곡으로 입력
  const [trackText, setTrackText] = useState(initial.tracks.map((t) => t.title).join("\n"));
  const [image, setImage] = useState<ImageChange>({ kind: "keep" });
  const [errors, setErrors] = useState<ReturnType<typeof validateRelease>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ReleaseFormValues>(key: K, value: ReleaseFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const trackNames = trackText.split("\n").map((t) => t.trim()).filter(Boolean);
  const titleSet = new Set(values.tracks.filter((t) => t.isTitle).map((t) => t.title));
  const toggleTitle = (name: string) => {
    const next = new Set(titleSet);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    set("tracks", trackNames.map((title) => ({ title, isTitle: next.has(title) })));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const final: ReleaseFormValues = { ...values, tracks: trackNames.map((title) => ({ title, isTitle: titleSet.has(title) })) };
    const found = validateRelease(final);
    if (!final.artistId) found.title ??= "어느 아티스트의 앨범인지 알 수 없어요. 아티스트 페이지에서 등록해 주세요.";
    setErrors(found);
    if (Object.keys(found).length) {
      toast("입력한 내용을 확인해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveRelease(final, image, existing);
      toast(existing ? "앨범 정보를 수정했어요." : "앨범을 등록했어요.");
      router.replace(`/release?id=${saved.id}`);
    } catch {
      toast("저장하지 못했어요. 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  const artistName = artists.find((a) => a.id === values.artistId)?.name;

  return (
    <main>
      <PageHeader back={existing ? `/release?id=${existing.id}` : backTo} title={existing ? "앨범 수정" : "앨범 등록"} compact />
      <form className={`stack ${styles.form}`} onSubmit={onSubmit} noValidate>
        {artistName && <p className={styles.formFor}>{artistName}의 앨범</p>}

        <div className="field">
          <label htmlFor="release-title">앨범 이름</label>
          <input id="release-title" className="input" placeholder="예: RIIZING" value={values.title} aria-invalid={!!errors.title} onChange={(e) => set("title", e.target.value)} />
          {errors.title && <span className="error">{errors.title}</span>}
        </div>

        <div className="field">
          <span className="field-label">종류</span>
          <div className="row" style={{ flexWrap: "wrap" }} role="group" aria-label="앨범 종류">
            {RELEASE_KINDS.map((k) => (
              <button key={k.id} type="button" className="chip" aria-pressed={values.kind === k.id} onClick={() => set("kind", k.id)}>
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="release-date">발매일</label>
          <input id="release-date" type="date" className="input" value={values.releaseDate} aria-invalid={!!errors.releaseDate} onChange={(e) => set("releaseDate", e.target.value)} />
          {errors.releaseDate && <span className="error">{errors.releaseDate}</span>}
        </div>

        <div className="field">
          <label htmlFor="release-tracks">수록곡</label>
          <textarea id="release-tracks" className="textarea" placeholder={"한 줄에 한 곡씩 순서대로 적어 주세요.\n예: Boom Boom Bass"} value={trackText} onChange={(e) => setTrackText(e.target.value)} />
          {trackNames.length > 0 && (
            <>
              <span className="hint">타이틀곡을 눌러 표시해 주세요.</span>
              <div className="row" style={{ flexWrap: "wrap" }} role="group" aria-label="타이틀곡">
                {trackNames.map((name, i) => (
                  <button key={`${name}-${i}`} type="button" className="chip" aria-pressed={titleSet.has(name)} onClick={() => toggleTitle(name)}>
                    {name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="field">
          <label htmlFor="release-mv">뮤직비디오 주소</label>
          <input id="release-mv" className="input" type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=…" value={values.mvUrl ?? ""} aria-invalid={!!errors.mvUrl} onChange={(e) => set("mvUrl", e.target.value)} />
          {errors.mvUrl ? <span className="error">{errors.mvUrl}</span> : <span className="hint">공식 채널의 영상 주소를 넣어 주세요.</span>}
        </div>

        <LinksEditor label="듣기 링크" links={values.links} onChange={(links) => set("links", links)} error={errors.links} placeholder="예: 멜론" />

        <div className="field">
          <label htmlFor="release-desc">앨범 소개</label>
          <textarea id="release-desc" className="textarea" placeholder="앨범 콘셉트처럼 모두에게 필요한 공식 소개를 적어 주세요." value={values.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </div>

        <ImagePicker label="앨범 커버" currentImageId={existing?.imageId} change={image} onChange={setImage} />

        <div className={styles.submit}>
          <button type="button" className="btn btn-soft" onClick={cancel}>
            취소
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (
              <>
                <Spinner /> 저장 중
              </>
            ) : existing ? (
              "수정 완료"
            ) : (
              "등록하기"
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
