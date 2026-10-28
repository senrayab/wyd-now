"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, SearchX } from "lucide-react";
import ImagePicker from "@/components/ImagePicker";
import PageHeader, { useBack } from "@/components/PageHeader";
import { useFeedback } from "@/components/Feedback";
import { ArtistAvatar, Empty, Loading, Switch, Spinner } from "@/components/ui";
import { useFocusArtist } from "@/lib/focus";
import { useArtists, useStoreQuery } from "@/lib/hooks";
import type { ImageChange } from "@/lib/services/image-attach";
import { nowSeoul, saveVote, validateVote, VOTE_TYPES, voteTab, type VoteErrors } from "@/lib/services/vote-service";
import type { VoteInput, VoteSite } from "@/lib/storage/types";
import styles from "./Vote.module.css";

const GUIDE_MAX = 500;

export default function VoteFormScreen({ mode }: { mode: "new" | "edit" }) {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { data: existing, loading } = useStoreQuery(
    (s) => (mode === "edit" ? s.votes.get(id) : Promise.resolve(undefined)),
    `vote-form:${mode}:${id}`,
  );

  if (mode === "edit" && loading) return <div style={{ paddingTop: 96 }}><Loading /></div>;
  if (mode === "edit" && !existing) {
    return (
      <main>
        <PageHeader back="/votes" title="투표 수정" compact />
        <Empty icon={SearchX} action={<Link href="/votes" className="btn btn-primary btn-sm">투표 목록</Link>}>
          수정할 투표를 찾을 수 없어요. 삭제되었을 수 있어요.
        </Empty>
      </main>
    );
  }

  const artist = params.get("artist");
  // 이전 데이터에는 사이트 이름이 없어서 주소로 채워 둠
  const initial: VoteInput = existing
    ? { ...existing }
    : { name: "", url: "", type: "musicshow", artistIds: artist ? [artist] : [] };
  return <VoteForm key={existing?.id ?? "new"} initial={initial} existing={existing} />;
}

function VoteForm({ initial, existing }: { initial: VoteInput; existing?: VoteSite }) {
  const router = useRouter();
  const cancel = useBack(existing ? `/vote?id=${existing.id}` : "/votes");
  const { toast } = useFeedback();
  const { artists } = useArtists();
  const { focus } = useFocusArtist();
  const [values, setValues] = useState(initial);
  const [image, setImage] = useState<ImageChange>({ kind: "keep" });
  const [hasPeriod, setHasPeriod] = useState(!!(initial.startDate || initial.endDate));
  const [errors, setErrors] = useState<VoteErrors>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof VoteInput>(key: K, value: VoteInput[K]) => setValues((v) => ({ ...v, [key]: value }));

  // 기간을 켜면 날짜·시각 칸이 나타남 (기본: 오늘 00:00 시작 ~ 오늘 23:59 마감, 마감일만 바꾸면 되게)
  function togglePeriod(on: boolean) {
    setHasPeriod(on);
    if (!on) return;
    setValues((v) => {
      const startDate = v.startDate || nowSeoul().slice(0, 10);
      return { ...v, startDate, startTime: v.startTime || "00:00", endDate: v.endDate || startDate, endTime: v.endTime || "23:59" };
    });
  }

  // 시작일을 마감일보다 뒤로 옮기면 마감일도 같은 날로 맞춤
  function setStartDate(date: string) {
    setValues((v) => ({ ...v, startDate: date, endDate: v.endDate && date && v.endDate < date ? date : v.endDate }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const final: VoteInput = hasPeriod ? values : { ...values, startDate: undefined, endDate: undefined, startTime: undefined, endTime: undefined };
    const found = validateVote(final, hasPeriod);
    setErrors(found);
    if (Object.keys(found).length) {
      toast("입력한 내용을 확인해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveVote(focus && !final.artistIds.length ? { ...final, artistIds: [focus.id] } : final, image, existing);
      toast(existing ? "수정했어요." : "투표를 등록했어요.");
      // 수정은 상세로, 새로 등록했으면 해당 상태 탭에서 바로 보이게
      router.replace(existing ? `/vote?id=${saved.id}` : `/votes?tab=${voteTab(saved)}`);
    } catch {
      // 저장되지 않았으면 화면도 그대로 (저장된 것처럼 이동하지 않음)
      toast("저장하지 못했어요. 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  return (
    <main>
      <PageHeader back={existing ? `/vote?id=${existing.id}` : "/votes"} title={existing ? "투표 수정" : "투표 등록"} compact />
      <form className={`stack ${styles.form}`} onSubmit={onSubmit} noValidate>
        <div className="field">
          <span className="field-label">종류</span>
          <div className={styles.types} role="radiogroup" aria-label="종류">
            {VOTE_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} type="button" role="radio" aria-checked={values.type === t.id} className={styles.typeOption} onClick={() => set("type", t.id)}>
                  <Icon size={26} color={values.type === t.id ? "currentColor" : t.color} aria-hidden />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label htmlFor="vote-name">투표 제목</label>
          <input id="vote-name" className="input" placeholder="예: 엠카운트다운 사전 투표" value={values.name} aria-invalid={!!errors.name} onChange={(e) => set("name", e.target.value)} />
          {errors.name && <span className="error">{errors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="vote-target">투표 대상</label>
          <input id="vote-target" className="input" placeholder="예: 이번 주 1위 후보, 올해의 신인상" value={values.target ?? ""} onChange={(e) => set("target", e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="vote-url">투표 주소</label>
          <input id="vote-url" className="input" type="url" inputMode="url" placeholder="https://" value={values.url} aria-invalid={!!errors.url} onChange={(e) => set("url", e.target.value)} />
          {errors.url ? <span className="error">{errors.url}</span> : <span className="hint">아직 모르면 비워 두고 나중에 수정해서 넣어도 돼요.</span>}
        </div>

        <div className="card-flat stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>투표 기간 정하기</span>
            <Switch checked={hasPeriod} onChange={togglePeriod} label="투표 기간 정하기" />
          </div>
          {hasPeriod ? (
            <>
              <div className={styles.when}>
                <span>시작</span>
                <input type="date" className="input" aria-label="시작 날짜" value={values.startDate ?? ""} aria-invalid={!!errors.startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input type="time" className="input" aria-label="시작 시각" value={values.startTime ?? ""} aria-invalid={!!errors.startDate} onChange={(e) => set("startTime", e.target.value)} />
              </div>
              <div className={styles.when}>
                <span>마감</span>
                <input type="date" className="input" aria-label="마감 날짜" value={values.endDate ?? ""} aria-invalid={!!errors.endDate} onChange={(e) => set("endDate", e.target.value)} />
                <input type="time" className="input" aria-label="마감 시각" value={values.endTime ?? ""} aria-invalid={!!errors.endDate} onChange={(e) => set("endTime", e.target.value)} />
              </div>
              {(errors.startDate || errors.endDate) && (
                <span className="error" style={{ fontSize: 12, color: "var(--danger)" }}>
                  {errors.startDate ?? errors.endDate}
                </span>
              )}
              <span className="muted" style={{ fontSize: 12 }}>
                한국 시간 기준이에요. 시작 전엔 ‘예정’, 마감이 지나면 ‘지난 투표’로 옮겨져요.
              </span>
            </>
          ) : (
            <span className="muted" style={{ fontSize: 12.5 }}>
              기간 없이 언제든 투표할 수 있는 곳은 ‘상시’로 보여요.
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="vote-desc">투표 안내</label>
          <textarea id="vote-desc" className="textarea" maxLength={GUIDE_MAX} placeholder={"참여 방법과 유의사항을 함께 적어 주세요.\n예: 로그인 후 하루 1회 투표, 매일 0시 초기화"} value={values.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          <span className={`hint num ${styles.count}`}>
            {(values.description ?? "").length}/{GUIDE_MAX}
          </span>
        </div>

        {/* 내 아티스트 전용 모드에서는 고를 필요 없이 저장할 때 자동 연결 */}
        {!focus && (
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
              <Link href="/artist/new" className="chip">
                <Plus size={14} /> 새 아티스트
              </Link>
            </div>
            <span className="hint">특정 아티스트를 위한 투표라면 선택해 주세요. 아티스트 페이지에도 보여요.</span>
          </div>
        )}

        {/* 일정 등록처럼 대표 이미지는 맨 아래 */}
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
            ) : (
              "저장하기"
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
