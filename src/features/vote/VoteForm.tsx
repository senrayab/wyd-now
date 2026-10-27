"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, SearchX } from "lucide-react";
import PageHeader, { useBack } from "@/components/PageHeader";
import { useFeedback } from "@/components/Feedback";
import { ArtistAvatar, Empty, Loading, Switch, Spinner } from "@/components/ui";
import { useArtists, useStoreQuery } from "@/lib/hooks";
import { saveVote, validateVote, VOTE_TYPES } from "@/lib/services/vote-service";
import type { VoteInput, VoteSite } from "@/lib/storage/types";
import { todayKey } from "@/lib/date";
import styles from "./Vote.module.css";

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
        <PageHeader back="/votes" title="투표 사이트 수정" compact />
        <Empty icon={SearchX} action={<Link href="/votes" className="btn btn-primary btn-sm">투표 목록</Link>}>
          수정할 투표 사이트를 찾을 수 없어요.
        </Empty>
      </main>
    );
  }

  const artist = params.get("artist");
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
  const [values, setValues] = useState(initial);
  const [hasPeriod, setHasPeriod] = useState(!!(initial.startDate || initial.endDate));
  const [errors, setErrors] = useState<ReturnType<typeof validateVote>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof VoteInput>(key: K, value: VoteInput[K]) => setValues((v) => ({ ...v, [key]: value }));

  function togglePeriod(on: boolean) {
    setHasPeriod(on);
    if (on && !values.startDate) set("startDate", todayKey());
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const final = hasPeriod ? values : { ...values, startDate: undefined, endDate: undefined };
    const found = validateVote(final);
    setErrors(found);
    if (Object.keys(found).length) {
      toast("입력한 내용을 확인해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveVote(final, existing);
      toast(existing ? "수정했어요." : "투표 사이트를 등록했어요.");
      router.replace(`/vote?id=${saved.id}`);
    } catch {
      toast("저장하지 못했어요. 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  return (
    <main>
      <PageHeader back={existing ? `/vote?id=${existing.id}` : "/votes"} title={existing ? "투표 사이트 수정" : "투표 사이트 등록"} compact />
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
          <label htmlFor="vote-name">이름</label>
          <input id="vote-name" className="input" placeholder="예: 엠카운트다운 사전 투표" value={values.name} aria-invalid={!!errors.name} onChange={(e) => set("name", e.target.value)} />
          {errors.name && <span className="error">{errors.name}</span>}
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
              <div className={styles.period}>
                <input type="date" className="input" aria-label="시작일" value={values.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
                <input type="date" className="input" aria-label="마감일" value={values.endDate ?? ""} aria-invalid={!!errors.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </div>
              <span className="muted" style={{ fontSize: 12 }}>
                시작일 · 마감일 순서예요. 마감일을 비우면 ‘진행 중’으로 보여요.
              </span>
              {errors.endDate && <span className="error" style={{ fontSize: 12, color: "var(--danger)" }}>{errors.endDate}</span>}
            </>
          ) : (
            <span className="muted" style={{ fontSize: 12.5 }}>
              기간 없이 언제든 투표할 수 있는 곳은 ‘상시’로 보여요.
            </span>
          )}
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
            <Link href="/artist/new" className="chip">
              <Plus size={14} /> 새 아티스트
            </Link>
          </div>
          <span className="hint">특정 아티스트를 위한 투표라면 선택해 주세요. 아티스트 페이지에도 보여요.</span>
        </div>

        <div className="field">
          <label htmlFor="vote-desc">안내</label>
          <textarea id="vote-desc" className="textarea" placeholder="투표 방법, 하루 투표 가능 횟수처럼 모두에게 필요한 안내를 적어 주세요." value={values.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </div>

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
