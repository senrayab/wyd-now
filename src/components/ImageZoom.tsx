"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import styles from "./ImageZoom.module.css";

/**
 * 칸에 맞춰 잘려(cover) 보이는 사진을 누르면 원본 비율로 크게 보여 주는 감싸개.
 * 오른쪽 아래 확대 아이콘으로 누를 수 있다는 걸 알려 줌. 누르는 곳은 사진 전체.
 */
export function Zoomable({ src, className, children }: { src: string; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`${styles.zoomable} ${className ?? ""}`} onClick={() => setOpen(true)} aria-label="사진 크게 보기">
        {children}
        <span className={styles.hint} aria-hidden>
          <Maximize2 size={15} />
        </span>
      </button>
      {open && <ImageZoom src={src} onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * 사진 크게 보기: 화면 가득, 원본 비율 그대로. 바깥·닫기·Esc 로 닫힘
 * body 로 portal — 화면 등장 애니메이션(transform)이 걸린 카드 안에서는 position: fixed 가 카드 기준이 됨
 */
export default function ImageZoom({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className={styles.zoom} role="dialog" aria-modal="true" aria-label="사진 크게 보기" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element -- IndexedDB blob URL */}
      <img src={src} alt="" />
      <button type="button" className={`icon-btn ${styles.close}`} onClick={onClose} aria-label="닫기">
        <X size={18} />
      </button>
    </div>,
    document.body,
  );
}
