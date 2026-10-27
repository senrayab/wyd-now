"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Bookmark, Newspaper, Pencil, Plus, SearchX, Share2, Sparkles, Trash2 } from "lucide-react";
import ImagePicker from "@/components/ImagePicker";
import PageHeader, { useBack } from "@/components/PageHeader";
import { useFeedback } from "@/components/Feedback";
import { ArtistAvatar, Empty, Loading, Spinner } from "@/components/ui";
import { formatDate, todayKey } from "@/lib/date";
import { useArtists, useImageUrl, useStoreQuery } from "@/lib/hooks";
import { convertToWebP } from "@/lib/image/image-service";
import type { ImageChange } from "@/lib/services/image-attach";
import { fetchLinkImage, fetchLinkMeta } from "@/lib/services/link-meta";
import { isValidUrl } from "@/lib/services/schedule-service";
import { deleteNews, hostOf, saveNews, validateNews, type NewsFormValues } from "@/lib/services/news-service";
import { shareText } from "@/lib/services/share-service";
import type { NewsItem } from "@/lib/storage/types";
import NewsTimeline from "./NewsTimeline";
import ScrapButton from "./ScrapButton";
import styles from "./News.module.css";

/** /news — 아티스트 소식 타임라인 */
export function NewsListScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const artistId = params.get("artist");
  const { artists, map } = useArtists();
  const { data, loading } = useStoreQuery((s) => s.news.list(), "news");
  const shown = (data ?? []).filter((n) => !artistId || n.artistIds.includes(artistId));

  return (
    <main>
      <PageHeader
        back="/"
        title="아티스트 소식"
        actions={
          <>
            <Link href="/my" className="icon-btn" aria-label="내 스크랩">
              <Bookmark size={17} />
            </Link>
            <Link href={artistId ? `/news/new?artist=${artistId}` : "/news/new"} className="icon-btn" aria-label="기사 등록">
              <Plus size={19} />
            </Link>
          </>
        }
      />
      <p className={styles.lead}>아티스트 관련 기사와 공식 소식을 모아 두는 곳이에요. 모두가 같은 정보를 보도록 출처가 분명한 기사만 등록해 주세요.</p>

      {artists.length > 0 && (
        <div className="chips" role="group" aria-label="아티스트">
          <button type="button" className="chip" aria-pressed={!artistId} onClick={() => router.replace("/news", { scroll: false })}>
            전체
          </button>
          {artists.map((a) => (
            <button key={a.id} type="button" className="chip" style={{ paddingLeft: 5 }} aria-pressed={artistId === a.id} onClick={() => router.replace(`/news?artist=${a.id}`, { scroll: false })}>
              <ArtistAvatar artist={a} size={26} /> {a.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Loading />
      ) : shown.length === 0 ? (
        <div className="card" style={{ marginTop: 8 }}>
          <Empty icon={Newspaper} action={<Link href={artistId ? `/news/new?artist=${artistId}` : "/news/new"} className="btn btn-primary btn-sm">기사 등록</Link>}>
            {artistId ? "이 아티스트의 소식이 아직 없어요." : "아직 모아 둔 소식이 없어요."}
          </Empty>
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <NewsTimeline items={shown} artists={map} />
        </div>
      )}
    </main>
  );
}

/** /news/view?id= — 기사 상세 */
export function NewsDetailScreen() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const { map } = useArtists();
  const { data: item, loading } = useStoreQuery((s) => s.news.get(id), `news:${id}`);
  const { url: imageUrl } = useImageUrl(item?.imageId);

  if (loading) return <div style={{ paddingTop: 96 }}><Loading /></div>;
  if (!item) {
    return (
      <main>
        <PageHeader back="/news" title="소식" />
        <Empty icon={SearchX} action={<Link href="/news" className="btn btn-primary btn-sm">소식 목록</Link>}>
          기사를 찾을 수 없어요.
        </Empty>
      </main>
    );
  }

  const linked = item.artistIds.map((a) => map.get(a)).filter((a) => !!a);
  const source = item.source || hostOf(item.url);

  async function onShare() {
    const result = await shareText(item!.title, [item!.title, source, item!.url].filter(Boolean).join("\n"));
    if (result === "copied") toast("기사 정보를 복사했어요.");
    if (result === "failed") toast("공유하지 못했어요.");
  }

  async function onDelete() {
    if (!(await confirm({ title: "기사를 삭제할까요?", message: "소식 목록에서 삭제돼요.", confirmLabel: "삭제", danger: true }))) return;
    await deleteNews(item!);
    toast("삭제했어요.");
    router.replace("/news");
  }

  return (
    <main>
      <PageHeader
        back="/news"
        title="소식"
        actions={
          <>
            <ScrapButton newsId={item.id} title={item.title} variant="round" />
            <button type="button" className="icon-btn" onClick={onShare} aria-label="기사 공유">
              <Share2 size={17} />
            </button>
          </>
        }
      />
      <article className={`card ${styles.detail}`}>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- IndexedDB blob URL
          <img src={imageUrl} alt="" className={styles.hero} />
        )}
        <span className="eyebrow num">{formatDate(item.publishedAt)}</span>
        <h2>{item.title}</h2>
        {source && <p className={styles.meta}>{source}</p>}
        {item.summary && (
          <p className="prose" style={{ marginTop: 14 }}>
            {item.summary}
          </p>
        )}
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-block" style={{ marginTop: 20 }}>
          원문 보기 <ArrowUpRight size={16} />
        </a>
      </article>

      {linked.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>아티스트</h2>
          </div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {linked.map((a) => (
              <Link key={a.id} href={`/artist?id=${a.id}`} className="chip" style={{ paddingLeft: 5 }}>
                <ArtistAvatar artist={a} size={26} /> {a.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className={styles.actions}>
        <Link href={`/news/edit?id=${item.id}`} className="btn btn-soft" style={{ flex: 1 }}>
          <Pencil size={16} /> 수정
        </Link>
        <button type="button" className="btn btn-danger" onClick={onDelete} aria-label="기사 삭제">
          <Trash2 size={17} />
        </button>
      </div>
    </main>
  );
}

/** /news/new, /news/edit?id= */
export function NewsFormScreen({ mode }: { mode: "new" | "edit" }) {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { data: existing, loading } = useStoreQuery(
    (s) => (mode === "edit" ? s.news.get(id) : Promise.resolve(undefined)),
    `news-form:${mode}:${id}`,
  );

  if (mode === "edit" && loading) return <div style={{ paddingTop: 96 }}><Loading /></div>;
  if (mode === "edit" && !existing) {
    return (
      <main>
        <PageHeader back="/news" title="기사 수정" compact />
        <Empty icon={SearchX} action={<Link href="/news" className="btn btn-primary btn-sm">소식 목록</Link>}>
          수정할 기사를 찾을 수 없어요.
        </Empty>
      </main>
    );
  }

  const artist = params.get("artist");
  const initial: NewsFormValues = existing
    ? { ...existing }
    : { title: "", url: "", publishedAt: todayKey(), artistIds: artist ? [artist] : [] };
  return <NewsForm key={existing?.id ?? "new"} initial={initial} existing={existing} />;
}

function NewsForm({ initial, existing }: { initial: NewsFormValues; existing?: NewsItem }) {
  const router = useRouter();
  const cancel = useBack(existing ? `/news/view?id=${existing.id}` : "/news");
  const { toast } = useFeedback();
  const { artists } = useArtists();
  const [values, setValues] = useState(initial);
  const [image, setImage] = useState<ImageChange>({ kind: "keep" });
  const [errors, setErrors] = useState<ReturnType<typeof validateNews>>({});
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);

  const set = <K extends keyof NewsFormValues>(key: K, value: NewsFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  /** 기사 주소로 제목·매체·날짜·요약·썸네일 채우기. 이미 적어 둔 칸은 건드리지 않음 */
  async function fillFromLink() {
    setFetching(true);
    try {
      const meta = await fetchLinkMeta(values.url.trim());
      const patch: Partial<NewsFormValues> = {};
      const filled: string[] = [];
      if (meta.title && !values.title.trim()) {
        patch.title = meta.title;
        filled.push("제목");
      }
      if (meta.source && !values.source?.trim()) {
        patch.source = meta.source;
        filled.push("매체");
      }
      // 날짜는 처음 값(새 기사면 오늘) 그대로일 때만 기사 날짜로
      if (meta.publishedAt && values.publishedAt === initial.publishedAt) {
        patch.publishedAt = meta.publishedAt;
        filled.push("날짜");
      }
      if (meta.summary && !values.summary?.trim()) {
        patch.summary = meta.summary;
        filled.push("요약");
      }
      setValues((v) => ({ ...v, ...patch }));
      const hasImage = image.kind === "replace" || (image.kind === "keep" && !!existing?.imageId);
      if (meta.image && !hasImage) {
        try {
          setImage({ kind: "replace", webp: await convertToWebP(await fetchLinkImage(meta.image)) });
          filled.push("썸네일");
        } catch {
          // 썸네일만 실패하면 나머지는 그대로 사용
        }
      }
      toast(filled.length ? `${filled.join("·")}을 불러왔어요. 내용을 확인해 주세요.` : "이미 입력한 칸은 그대로 두었어요.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "기사 정보를 불러오지 못했어요.");
    } finally {
      setFetching(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validateNews(values);
    setErrors(found);
    if (Object.keys(found).length) {
      toast("입력한 내용을 확인해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveNews(values, image, existing);
      toast(existing ? "수정했어요." : "기사를 등록했어요.");
      router.replace(`/news/view?id=${saved.id}`);
    } catch {
      toast("저장하지 못했어요. 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  return (
    <main>
      <PageHeader back={existing ? `/news/view?id=${existing.id}` : "/news"} title={existing ? "기사 수정" : "기사 등록"} compact />
      <form className={`stack ${styles.form}`} onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="news-url">기사 주소</label>
          <input id="news-url" className="input" type="url" inputMode="url" placeholder="https://" value={values.url} aria-invalid={!!errors.url} onChange={(e) => set("url", e.target.value)} />
          {errors.url && <span className="error">{errors.url}</span>}
          <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={fillFromLink} disabled={fetching || !isValidUrl(values.url.trim())}>
            {fetching ? <Spinner /> : <Sparkles size={15} />} {fetching ? "불러오는 중" : "기사 정보 불러오기"}
          </button>
        </div>

        <div className="field">
          <label htmlFor="news-title">제목</label>
          <input id="news-title" className="input" placeholder="기사 제목" value={values.title} aria-invalid={!!errors.title} onChange={(e) => set("title", e.target.value)} />
          {errors.title && <span className="error">{errors.title}</span>}
        </div>

        <div className="input-row">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="news-source">언론사 · 매체</label>
            <input id="news-source" className="input" placeholder={hostOf(values.url) || "예: 공식 홈페이지"} value={values.source ?? ""} onChange={(e) => set("source", e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="news-date">날짜</label>
            <input id="news-date" type="date" className="input" value={values.publishedAt} onChange={(e) => e.target.value && set("publishedAt", e.target.value)} />
          </div>
        </div>

        <div className="field">
          <span className="field-label">아티스트</span>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {artists.map((a) => (
              <button
                key={a.id}
                type="button"
                className="chip"
                style={{ paddingLeft: 5 }}
                aria-pressed={values.artistIds.includes(a.id)}
                onClick={() => set("artistIds", values.artistIds.includes(a.id) ? values.artistIds.filter((x) => x !== a.id) : [...values.artistIds, a.id])}
              >
                <ArtistAvatar artist={a} size={22} /> {a.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="news-summary">요약</label>
          <textarea id="news-summary" className="textarea" placeholder="기사의 핵심 내용을 짧게 적어 주세요. 개인적인 감상은 적지 말아 주세요." value={values.summary ?? ""} onChange={(e) => set("summary", e.target.value)} />
        </div>

        <ImagePicker label="썸네일" currentImageId={existing?.imageId} change={image} onChange={setImage} />

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
