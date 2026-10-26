"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, SearchX } from "lucide-react";
import ImagePicker from "@/components/ImagePicker";
import LinksEditor from "@/components/LinksEditor";
import PageHeader, { useBack } from "@/components/PageHeader";
import { useFeedback } from "@/components/Feedback";
import { ArtistAvatar, Empty, Loading, Switch, Spinner } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";
import { datePart, isDateKey, timePart, todayKey } from "@/lib/date";
import { useArtists, useStoreQuery } from "@/lib/hooks";
import type { ImageChange } from "@/lib/services/image-attach";
import { saveSchedule, validateSchedule, type ScheduleFormValues } from "@/lib/services/schedule-service";
import type { Schedule } from "@/lib/storage/types";
import styles from "./ScheduleForm.module.css";

/** /schedule/new 와 /schedule/edit?id= 공용 */
export default function ScheduleFormScreen({ mode }: { mode: "new" | "edit" }) {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { data: existing, loading } = useStoreQuery(
    (s) => (mode === "edit" ? s.schedules.get(id) : Promise.resolve(undefined)),
    `form:${mode}:${id}`,
  );

  if (mode === "edit" && loading) return <div style={{ paddingTop: 96 }}><Loading /></div>;
  if (mode === "edit" && !existing) {
    return (
      <main>
        <PageHeader back="/calendar" title="일정 수정" compact />
        <Empty icon={SearchX} action={<Link href="/calendar" className="btn btn-primary btn-sm">캘린더로 가기</Link>}>
          수정할 일정을 찾을 수 없어요.
        </Empty>
      </main>
    );
  }

  const date = isDateKey(params.get("date")) ? params.get("date")! : todayKey();
  const artist = params.get("artist");
  const initial: ScheduleFormValues = existing
    ? { ...existing }
    : {
        title: "",
        category: "concert",
        artistIds: artist ? [artist] : [],
        allDay: false,
        startAt: `${date}T18:00`,
        endAt: `${date}T20:00`,
        links: [],
      };

  return <ScheduleForm key={existing?.id ?? "new"} initial={initial} existing={existing} />;
}

function ScheduleForm({ initial, existing }: { initial: ScheduleFormValues; existing?: Schedule }) {
  const router = useRouter();
  const cancel = useBack(existing ? `/schedule?id=${existing.id}` : "/calendar");
  const { toast } = useFeedback();
  const { artists } = useArtists();
  const [values, setValues] = useState<ScheduleFormValues>(initial);
  const [image, setImage] = useState<ImageChange>({ kind: "keep" });
  const [errors, setErrors] = useState<ReturnType<typeof validateSchedule>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ScheduleFormValues>(key: K, value: ScheduleFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const setStamp = (key: "startAt" | "endAt", part: "date" | "time", value: string) => {
    setValues((v) => {
      const current = v[key];
      const next = part === "date" ? `${value}T${timePart(current)}` : `${datePart(current)}T${value}`;
      const patch: Partial<ScheduleFormValues> = { [key]: next };
      // 시작을 종료 뒤로 옮기면 종료도 같이 이동
      if (key === "startAt" && next > v.endAt) patch.endAt = next;
      return { ...v, ...patch };
    });
  };

  const toggleArtist = (artistId: string) =>
    set("artistIds", values.artistIds.includes(artistId) ? values.artistIds.filter((a) => a !== artistId) : [...values.artistIds, artistId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const normalized = values.allDay
      ? { ...values, startAt: `${datePart(values.startAt)}T00:00`, endAt: `${datePart(values.endAt)}T00:00` }
      : values;
    const found = validateSchedule(normalized);
    setErrors(found);
    if (Object.keys(found).length) {
      toast("입력한 내용을 확인해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveSchedule(normalized, image, existing);
      toast(existing ? "일정을 수정했어요." : "일정을 등록했어요.");
      router.replace(`/schedule?id=${saved.id}`);
    } catch {
      toast("저장하지 못했어요. 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  return (
    <main>
      <PageHeader back={existing ? `/schedule?id=${existing.id}` : "/calendar"} title={existing ? "일정 수정" : "일정 등록"} compact />

      <form className={`stack ${styles.form}`} onSubmit={onSubmit} noValidate>
        <div className="field">
          <span className="field-label">카테고리</span>
          <div className={styles.categories} role="radiogroup" aria-label="카테고리">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = values.category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={styles.category}
                  onClick={() => set("category", c.id)}
                >
                  <span className={styles.categoryIcon} style={active ? undefined : { color: c.colors[0] }}>
                    <Icon size={24} />
                  </span>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label htmlFor="title">제목</label>
          <input id="title" className="input" placeholder="예: 2nd 월드투어 서울 공연" value={values.title} aria-invalid={!!errors.title} onChange={(e) => set("title", e.target.value)} />
          {errors.title && <span className="error">{errors.title}</span>}
        </div>

        <div className="field">
          <span className="field-label">아티스트</span>
          {artists.length ? (
            <div className={styles.artistPick}>
              {artists.map((a) => (
                <button key={a.id} type="button" className="chip" aria-pressed={values.artistIds.includes(a.id)} onClick={() => toggleArtist(a.id)}>
                  <ArtistAvatar artist={a} size={22} /> {a.name}
                </button>
              ))}
              <Link href="/artist/new" className="chip">
                <Plus size={14} /> 새 아티스트
              </Link>
            </div>
          ) : (
            <Link href="/artist/new" className="btn btn-ghost btn-sm">
              <Plus size={15} /> 아티스트를 먼저 등록해 주세요
            </Link>
          )}
        </div>

        <div className={`card-flat ${styles.timeBox}`}>
          <div className={styles.timeRow}>
            <span>하루 종일</span>
            <Switch checked={values.allDay} onChange={(v) => set("allDay", v)} label="하루 종일" />
          </div>
          {(["startAt", "endAt"] as const).map((key) => (
            <div key={key} className={styles.stampRow}>
              <label htmlFor={`${key}-date`}>{key === "startAt" ? "시작" : "종료"}</label>
              <div className={styles.stamp} data-all-day={values.allDay}>
                <input id={`${key}-date`} type="date" className="input" value={datePart(values[key])} onChange={(e) => e.target.value && setStamp(key, "date", e.target.value)} />
                {!values.allDay && (
                  <input type="time" className="input" aria-label={`${key === "startAt" ? "시작" : "종료"} 시간`} value={timePart(values[key])} onChange={(e) => e.target.value && setStamp(key, "time", e.target.value)} />
                )}
              </div>
            </div>
          ))}
          {errors.endAt && <span className="error">{errors.endAt}</span>}
        </div>

        <div className="field">
          <label htmlFor="place">장소</label>
          <input id="place" className="input" placeholder="예: 올림픽공원 KSPO DOME" value={values.place ?? ""} onChange={(e) => set("place", e.target.value)} />
          <span className="hint">입력하면 상세 화면에서 지도로 바로 찾아볼 수 있어요.</span>
        </div>

        <div className="field">
          <label htmlFor="url">공식 링크</label>
          <input id="url" className="input" type="url" inputMode="url" placeholder="https://" value={values.url ?? ""} aria-invalid={!!errors.url} onChange={(e) => set("url", e.target.value)} />
          {errors.url && <span className="error">{errors.url}</span>}
        </div>

        <LinksEditor label="관련 링크" links={values.links} onChange={(links) => set("links", links)} error={errors.links} />

        <div className="field">
          <label htmlFor="description">안내 사항</label>
          <textarea id="description" className="textarea" placeholder="입장 시간, 준비물, 참여 방법처럼 모두에게 필요한 공식 안내를 적어 주세요." value={values.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          <span className="hint">모두가 보는 정보예요. 개인적인 메모는 적지 말아 주세요.</span>
        </div>

        <ImagePicker label="대표 이미지" currentImageId={existing?.imageId} change={image} onChange={setImage} />

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
