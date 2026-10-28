"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, ShieldCheck, Sparkles, Trash2, Upload } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Spinner } from "@/components/ui";
import { useFeedback } from "@/components/Feedback";
import { useStoreQuery } from "@/lib/hooks";
import { exportBackup, formatBytes, getStorageInfo, readBackupFile, requestPersistence, restoreBackup, type StorageInfo } from "@/lib/services/backup-service";
import { loadRiizeTestData } from "@/lib/services/riize-test-data";
import { getDataStore } from "@/lib/storage";
import styles from "./Guide.module.css";

function useCounts() {
  return useStoreQuery(async (s) => {
    const [artists, schedules, votes] = await Promise.all([s.artists.list(), s.schedules.list(), s.votes.list()]);
    return { artists: artists.length, schedules: schedules.length, votes: votes.length };
  }, "counts");
}

function Counts() {
  const { data } = useCounts();
  return (
    <dl className={styles.statGrid}>
      <div>
        <dt>아티스트</dt>
        <dd className="num">{data?.artists ?? "–"}</dd>
      </div>
      <div>
        <dt>일정</dt>
        <dd className="num">{data?.schedules ?? "–"}</dd>
      </div>
      <div>
        <dt>투표</dt>
        <dd className="num">{data?.votes ?? "–"}</dd>
      </div>
    </dl>
  );
}

export function BackupScreen() {
  const inputId = useId();
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState<false | "export" | "import">(false);

  async function onExport() {
    setBusy("export");
    try {
      await exportBackup();
      toast("백업 파일을 저장했어요.");
    } catch {
      toast("백업하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function onImport(file: File | undefined) {
    if (!file) return;
    try {
      const backup = await readBackupFile(file);
      const ok = await confirm({
        title: "백업으로 복원할까요?",
        message: `지금 기기의 정보는 모두 지워지고\n아티스트 ${backup.artists.length}명, 일정 ${backup.schedules.length}개로 바뀌어요.`,
        confirmLabel: "복원",
      });
      if (!ok) return;
      setBusy("import");
      await restoreBackup(backup);
      toast("복원을 마쳤어요.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "복원하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHeader back="/more/data" title="백업 · 복원" />
      <section className="card">
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>현재 저장된 정보</h2>
        <Counts />
      </section>

      <div className="stack" style={{ marginTop: 18 }}>
        <div className="card-flat">
          <p className="prose" style={{ marginBottom: 14 }}>
            아티스트, 일정, 투표, 내 공간, 이미지를 JSON 파일 하나로 내보내요. 다른 기기나 브라우저에서 복원할 수 있어요.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={onExport} disabled={!!busy}>
            {busy === "export" ? <Spinner size={16} /> : <Download size={17} />} {busy === "export" ? "백업 파일 만드는 중" : "백업 파일 내보내기"}
          </button>
        </div>
        <div className="card-flat">
          <p className="prose" style={{ marginBottom: 14 }}>
            wyd now 에서 내보낸 백업 파일(.json)을 불러와요. 지금 기기의 정보는 백업 내용으로 바뀌어요.
          </p>
          <label htmlFor={inputId} className="btn btn-soft btn-block" aria-disabled={!!busy}>
            {busy === "import" ? <Spinner size={16} /> : <Upload size={17} />} {busy === "import" ? "복원하는 중" : "백업 파일 불러오기"}
          </label>
          <input
            id={inputId}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            disabled={!!busy}
            onChange={(e) => {
              void onImport(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </main>
  );
}

export function StorageScreen() {
  const { toast } = useFeedback();
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const { data: imageBytes } = useStoreQuery(async (s) => {
    const owners = [
      ...(await s.schedules.list()).map((x) => x.imageId),
      ...(await s.artists.list()).map((x) => x.imageId),
      ...(await s.votes.list()).map((x) => x.imageId),
    ].filter((x): x is string => !!x);
    const images = await Promise.all(owners.map((id) => s.images.get(id)));
    return images.reduce((n, i) => n + (i?.size ?? 0), 0);
  }, "image-bytes");

  const refresh = () => getStorageInfo().then(setInfo);
  useEffect(() => {
    void getStorageInfo().then(setInfo);
  }, []);

  async function onPersist() {
    const granted = await requestPersistence();
    toast(granted ? "영구 저장이 켜졌어요." : "브라우저가 요청을 받아주지 않았어요. 앱을 설치하면 허용되는 경우가 많아요.");
    await refresh();
  }

  const ratio = info?.usage && info.quota ? Math.min(1, info.usage / info.quota) : 0;

  return (
    <main>
      <PageHeader back="/more/data" title="저장 공간" />
      <section className="card">
        {info === null ? (
          <p className="muted">확인하는 중…</p>
        ) : !info.supported ? (
          <p className="muted">이 브라우저는 저장 공간 정보를 알려주지 않아요.</p>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 13 }}>
              사용 중
            </p>
            <p className={`${styles.bigNumber} num`}>{formatBytes(info.usage)}</p>
            <div className={styles.meter} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} aria-label="저장 공간 사용률">
              <span style={{ width: `${ratio * 100}%` }} />
            </div>
            <p className="muted num" style={{ fontSize: 12.5 }}>
              사용 가능 {formatBytes(info.quota)} · 이미지 {formatBytes(imageBytes ?? 0)}
            </p>
          </>
        )}
      </section>

      <section className="card-flat" style={{ marginTop: 16 }}>
        <div className="row" style={{ marginBottom: 10 }}>
          <ShieldCheck size={18} />
          <strong style={{ fontSize: 15 }}>영구 저장</strong>
          <span className="spacer" />
          <span className="tag">{info?.persisted ? "켜짐" : "꺼짐"}</span>
        </div>
        <p className="prose" style={{ marginBottom: 14 }}>
          저장 공간이 부족할 때 브라우저가 앱 데이터를 지우지 않도록 요청해요. 정보는 이 기기 안에만 저장되니 가끔 백업도 해 두세요.
        </p>
        {!info?.persisted && (
          <button type="button" className="btn btn-primary btn-block" onClick={onPersist}>
            영구 저장 요청
          </button>
        )}
      </section>
    </main>
  );
}

export function ResetScreen() {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState<false | "riize" | "clear">(false);

  async function onRiize() {
    const ok = await confirm({ title: "RIIZE 샘플 데이터를 추가할까요?", message: "실제 멤버·데뷔일·공식 채널과 함께\n화면 확인용 테스트 일정이 추가돼요.", confirmLabel: "추가" });
    if (!ok) return;
    setBusy("riize");
    try {
      const riize = await loadRiizeTestData();
      toast("RIIZE 샘플 데이터를 추가했어요.");
      router.push(`/artist?id=${riize.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "추가하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    const ok = await confirm({ title: "모든 정보를 삭제할까요?", message: "아티스트, 일정, 투표, 내 공간, 이미지가 모두 지워지고 되돌릴 수 없어요.\n필요하면 먼저 백업해 주세요.", confirmLabel: "모두 삭제", danger: true });
    if (!ok) return;
    setBusy("clear");
    await getDataStore().clearAll();
    setBusy(false);
    toast("모든 정보를 삭제했어요.");
    router.push("/");
  }

  return (
    <main>
      <PageHeader back="/more/data" title="샘플 · 초기화" />
      <div className="stack">
        <section className="card-flat">
          <div className="row" style={{ marginBottom: 8 }}>
            <Sparkles size={18} />
            <strong style={{ fontSize: 15 }}>RIIZE 샘플 데이터</strong>
          </div>
          <p className="prose" style={{ marginBottom: 14 }}>
            실제 RIIZE 프로필(멤버 6명, 데뷔일, 공식 채널, 멤버 생일)과 디스코그래피, 자주 쓰는 투표 사이트, 화면 확인용 테스트 일정을 불러와요.
          </p>
          <button type="button" className="btn btn-soft btn-block" onClick={onRiize} disabled={!!busy}>
            {busy === "riize" ? (
              <>
                <Spinner /> 불러오는 중
              </>
            ) : (
              "RIIZE 샘플 데이터 추가"
            )}
          </button>
        </section>
        <section className="card-flat">
          <div className="row" style={{ marginBottom: 8, color: "var(--danger)" }}>
            <Trash2 size={18} />
            <strong style={{ fontSize: 15 }}>전체 삭제</strong>
          </div>
          <Counts />
          <button type="button" className="btn btn-danger btn-block" style={{ marginTop: 14 }} onClick={onClear} disabled={!!busy}>
            {busy === "clear" ? (
              <>
                <Spinner /> 삭제하는 중
              </>
            ) : (
              "모든 정보 삭제"
            )}
          </button>
        </section>
      </div>
    </main>
  );
}
