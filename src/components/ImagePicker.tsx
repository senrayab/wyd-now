"use client";

import { useEffect, useId, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Spinner } from "./ui";
import { ACCEPT_ATTR, convertToWebP, ImageError } from "@/lib/image/image-service";
import { useImageUrl } from "@/lib/hooks";
import type { ImageChange } from "@/lib/services/image-attach";
import styles from "./ImagePicker.module.css";

interface Props {
  label: string;
  currentImageId?: string;
  change: ImageChange;
  onChange: (change: ImageChange) => void;
  /** 미리보기 비율 */
  shape?: "wide" | "round";
}

export default function ImagePicker({ label, currentImageId, change, onChange, shape = "wide" }: Props) {
  const inputId = useId();
  const { url: currentUrl } = useImageUrl(change.kind === "keep" ? currentImageId : undefined);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (change.kind !== "replace") return;
    const url = URL.createObjectURL(change.webp.blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL 생성·해제
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [change]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    try {
      onChange({ kind: "replace", webp: await convertToWebP(file) });
    } catch (e) {
      setError(e instanceof ImageError ? e.message : "이미지를 처리하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  const shown = change.kind === "replace" ? previewUrl : change.kind === "keep" ? currentUrl : undefined;
  const hasImage = change.kind === "replace" || (change.kind === "keep" && !!currentImageId);

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className={styles.wrap} data-shape={shape}>
        <label htmlFor={inputId} className={styles.drop} data-has={!!shown}>
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob URL 미리보기
            <img src={shown} alt="선택한 이미지 미리보기" />
          ) : (
            <span className={styles.placeholder}>
              {busy ? <Spinner size={22} /> : <ImagePlus size={22} />}
              <span>{busy ? "WebP로 변환하는 중…" : "이미지 선택"}</span>
              <small>PNG · JPG · WebP · GIF, 20MB 이하</small>
            </span>
          )}
        </label>
        <input
          id={inputId}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {hasImage && (
          <div className={styles.actions}>
            <label htmlFor={inputId} className="btn btn-soft btn-sm">
              다른 이미지
            </label>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => onChange({ kind: "remove" })}>
              <Trash2 size={15} /> 삭제
            </button>
          </div>
        )}
      </div>
      {error && <span className="error" role="alert">{error}</span>}
      {change.kind === "replace" && (
        <span className="hint">
          WebP로 변환됨 · {change.webp.width}×{change.webp.height} · {(change.webp.blob.size / 1024).toFixed(0)}KB
        </span>
      )}
    </div>
  );
}
