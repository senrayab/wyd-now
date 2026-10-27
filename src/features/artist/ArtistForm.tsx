"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, SearchX, X } from "lucide-react";
import ImagePicker from "@/components/ImagePicker";
import LinksEditor from "@/components/LinksEditor";
import PageHeader, { useBack } from "@/components/PageHeader";
import { useFeedback } from "@/components/Feedback";
import { Empty, Loading, Spinner } from "@/components/ui";
import { useStoreQuery } from "@/lib/hooks";
import { ARTIST_COLORS } from "@/lib/palette";
import { saveArtist, validateArtist, type ArtistFormValues } from "@/lib/services/artist-service";
import type { ImageChange } from "@/lib/services/image-attach";
import type { Artist } from "@/lib/storage/types";
import styles from "./ArtistForm.module.css";

export default function ArtistFormScreen({ mode }: { mode: "new" | "edit" }) {
  const id = useSearchParams().get("id") ?? "";
  const { data: existing, loading } = useStoreQuery(
    (s) => (mode === "edit" ? s.artists.get(id) : Promise.resolve(undefined)),
    `artist-form:${mode}:${id}`,
  );

  if (mode === "edit" && loading) return <div style={{ paddingTop: 96 }}><Loading /></div>;
  if (mode === "edit" && !existing) {
    return (
      <main>
        <PageHeader back="/artists" title="아티스트 수정" compact />
        <Empty icon={SearchX} action={<Link href="/artists" className="btn btn-primary btn-sm">아티스트 목록</Link>}>
          수정할 아티스트를 찾을 수 없어요.
        </Empty>
      </main>
    );
  }

  const initial: ArtistFormValues = existing
    ? { ...existing }
    : { name: "", type: "group", members: [], links: [], color: ARTIST_COLORS[0].id };
  return <ArtistForm key={existing?.id ?? "new"} initial={initial} existing={existing} />;
}

function ArtistForm({ initial, existing }: { initial: ArtistFormValues; existing?: Artist }) {
  const router = useRouter();
  const cancel = useBack(existing ? `/artist?id=${existing.id}` : "/artists");
  const { toast } = useFeedback();
  const [values, setValues] = useState(initial);
  const [image, setImage] = useState<ImageChange>({ kind: "keep" });
  const [cover, setCover] = useState<ImageChange>({ kind: "keep" });
  const [errors, setErrors] = useState<ReturnType<typeof validateArtist>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ArtistFormValues>(key: K, value: ArtistFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validateArtist(values);
    setErrors(found);
    if (Object.keys(found).length) {
      toast("입력한 내용을 확인해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveArtist(values, image, existing, cover);
      toast(existing ? "아티스트 정보를 수정했어요." : "아티스트를 등록했어요.");
      router.replace(`/artist?id=${saved.id}`);
    } catch {
      toast("저장하지 못했어요. 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  return (
    <main>
      <PageHeader back={existing ? `/artist?id=${existing.id}` : "/artists"} title={existing ? "아티스트 수정" : "아티스트 등록"} compact />

      <form className={`stack ${styles.form}`} onSubmit={onSubmit} noValidate>
        <ImagePicker label="프로필 이미지" shape="round" currentImageId={existing?.imageId} change={image} onChange={setImage} />
        <ImagePicker label="배경 이미지" currentImageId={existing?.coverImageId} change={cover} onChange={setCover} />

        <div className="field">
          <label htmlFor="name">이름</label>
          <input id="name" className="input" placeholder="그룹명 또는 아티스트명" value={values.name} aria-invalid={!!errors.name} onChange={(e) => set("name", e.target.value)} />
          {errors.name && <span className="error">{errors.name}</span>}
        </div>

        <div className="field">
          <span className="field-label">유형</span>
          <div className="segmented" role="group" aria-label="유형" style={{ alignSelf: "flex-start" }}>
            <button type="button" aria-pressed={values.type === "group"} onClick={() => set("type", "group")}>
              그룹
            </button>
            <button type="button" aria-pressed={values.type === "solo"} onClick={() => set("type", "solo")}>
              솔로
            </button>
          </div>
        </div>

        {values.type === "group" && (
          <div className="field">
            <span className="field-label">멤버</span>
            <div className={styles.members}>
              {values.members.map((m, i) => (
                <span key={m.id} className={styles.member}>
                  <input
                    className="input"
                    placeholder={`멤버 ${i + 1}`}
                    aria-label={`멤버 ${i + 1} 이름`}
                    value={m.name}
                    onChange={(e) => set("members", values.members.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)))}
                  />
                  <button type="button" className="icon-btn sm" aria-label={`멤버 ${i + 1} 삭제`} onClick={() => set("members", values.members.filter((x) => x.id !== m.id))}>
                    <X size={15} />
                  </button>
                </span>
              ))}
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => set("members", [...values.members, { id: crypto.randomUUID(), name: "" }])}>
              <Plus size={15} /> 멤버 추가
            </button>
            {errors.members && <span className="error">{errors.members}</span>}
          </div>
        )}

        <div className="input-row">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="agency">소속사</label>
            <input id="agency" className="input" value={values.agency ?? ""} onChange={(e) => set("agency", e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="fandom">팬덤명</label>
            <input id="fandom" className="input" value={values.fandom ?? ""} onChange={(e) => set("fandom", e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="debut">데뷔일</label>
          <input id="debut" type="date" className="input" value={values.debutDate ?? ""} onChange={(e) => set("debutDate", e.target.value)} />
        </div>

        <div className="field">
          <span className="field-label">대표 색</span>
          <div className={styles.colors} role="radiogroup" aria-label="대표 색">
            {ARTIST_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={values.color === c.id}
                aria-label={c.label}
                className={styles.color}
                style={{ background: c.colors[0] }}
                onClick={() => set("color", c.id)}
              />
            ))}
          </div>
          <span className="hint">프로필 이미지가 없을 때 이 색으로 표시돼요.</span>
        </div>

        <LinksEditor label="공식 채널" placeholder="예: 공식 유튜브" links={values.links} onChange={(links) => set("links", links)} error={errors.links} />

        <div className={styles.submit}>
          <button type="button" className="btn btn-ghost" onClick={cancel}>
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
